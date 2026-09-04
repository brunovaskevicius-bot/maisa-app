/* ─────────────────────────────────────────────────────────────────────────────
 * CASO DE USO — marcar um atendimento.
 *
 * Este é O arquivo da reorganização. Antes toda esta lógica morava dentro de
 * `app/api/atendimentos/route.ts`, o que significava que ela só existia para quem
 * falasse HTTP com um corpo JSON específico. O agente de WhatsApp não fala HTTP com o
 * próprio app: ele vai chamar ESTA função, com o mesmo objeto, e receber o mesmo
 * resultado — inclusive a proteção contra marcar duas vezes.
 *
 * Ele NÃO conhece: Next, Request, Response, status HTTP, Google, Supabase.
 * Ele conhece: as portas que recebe e os erros do domínio que lança.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { AgendarAtendimento } from "../portas/entrada/casos-de-uso";
import type { AgendaExterna } from "../portas/saida/agenda-externa";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import type { LinhaDeAtendimento, RegistroDeAtendimentos } from "../portas/saida/registro-atendimentos";
import type { ContextoAgenda } from "../dominio/tenant";
import { rotuloDoAtor } from "../dominio/tenant";
import { DIAS_DE_ALCANCE, duracaoValida, ehUuid, horaValida } from "../dominio/agenda";
import { DadoInvalido, NaoEncontrado } from "../dominio/erros";
import { primeiroNome } from "../dominio/catalogo";
import { ehDataCivil, instanteISO } from "../dominio/tempo";

/**
 * O vínculo com o calendário externo, quando ele existe.
 *
 * Um tipo local e não `EventoCriado`: aqui o mesmo formato tem que servir para o que a
 * criação devolveu E para o que a varredura de retomada encontrou (`EventoDeAgenda`, que
 * é bem maior). O que este caso de uso usa das duas coisas são estes três campos.
 */
type EventoExterno = { eventoId: string; meetLink?: string | null; htmlLink?: string | null };

export type Dependencias = {
  /**
   * O calendário externo. ⚠️ **Opcional na prática, desde o ADR-0009**: todo uso dele
   * neste arquivo vive dentro de um `try` que segue em frente. Continua na lista de
   * dependências porque quem TEM Google conectado continua tendo o evento criado lá.
   */
  agenda: AgendaExterna;
  negocio: RepositorioNegocio;
  /**
   * A agenda do produto — a fonte da verdade. Ver `portas/saida/registro-atendimentos.ts`.
   *
   * ⚠️ Este comentário dizia "o espelho… a verdade continua sendo a agenda externa". Não
   * é mais: gravar aqui é o ato principal, e é aqui que o conflito de horário é detectado.
   */
  registro: RegistroDeAtendimentos;
  /** Só para poder congelar o tempo em teste. */
  agora?: () => number;
};

export function criarAgendarAtendimento({ agenda, negocio, registro, agora = Date.now }: Dependencias): AgendarAtendimento {
  return async (t, p) => {
    /* ── 1. o pedido faz sentido? ──
     * A validação vive AQUI, e não na rota, porque o agente de WhatsApp vai preencher
     * estes campos com o que um modelo de linguagem entendeu de uma frase solta —
     * exatamente o tipo de entrada que precisa de guarda, e que não passaria por
     * nenhuma checagem se ela morasse no adaptador HTTP. */

    // O uuid é a chave de idempotência: se vier vazio ou malformado, a proteção contra
    // atendimento duplicado simplesmente não existe, e é melhor recusar do que criar às cegas.
    if (!ehUuid(p.maisaAg)) throw new DadoInvalido("Identificador do atendimento ausente.", "maisaAg");

    // Formato E validade: "2026-02-31" passa em qualquer regex e é um dia que não existe.
    // Sem isso, ele viraria um ISO que o Google aceitaria deslocando para 3 de março.
    if (!ehDataCivil(p.data)) throw new DadoInvalido("Data inválida.", "data");

    // Sem limite, um valor forjado (999) viraria "T999:00:00-03:00" e o erro apareceria
    // lá na frente, como recusa crua do provedor.
    if (!horaValida(p.inicio)) throw new DadoInvalido("Horário fora do dia.", "inicio");

    /* ── 2. de quem é essa agenda? ──
     * Allowlist do inquilino. Sem ela, `agendaId` é escrita livre — e ele chega de fora
     * (query string hoje, argumento escolhido por um modelo amanhã). */
    const permitidas = await negocio.agendasPermitidas(t);
    if (!permitidas.includes(p.agendaId)) throw new DadoInvalido("Essa agenda não existe neste negócio.", "agendaId");

    const profissional = await negocio.profissional(t, p.agendaId);
    if (!profissional) throw new NaoEncontrado("Profissional");

    /* ── 3. o que vai ser feito, e para quem ──
     * Serviço e cliente podem NÃO estar no catálogo: o usuário cria serviço na tela e
     * isso vive só no navegador dele. Por isso nome/valor/duração podem vir no pedido, e
     * o catálogo é só o padrão. Sem essa folga, marcar num serviço novo falhava com
     * "faltam dados do atendimento" e nada na tela dizia que a causa era o serviço. */
    const doCatalogo = await negocio.servico(t, p.servicoId);
    const doCadastro = await negocio.cliente(t, p.clienteId);

    const duracao = Number(p.duracao ?? doCatalogo?.duracao);
    if (!duracaoValida(duracao)) throw new DadoInvalido("Duração fora do razoável.", "duracao");

    const nomeServico = String(p.servicoNome ?? doCatalogo?.nome ?? "Atendimento").slice(0, 120);
    const valorServico = Number(p.servicoValor ?? doCatalogo?.preco ?? 0);
    // Nome e telefone do cliente também podem vir do pedido, pela mesma razão do serviço:
    // eles são GRAVADOS no evento para o app funcionar noutro navegador.
    const nomeCliente = String(p.clienteNome ?? doCadastro?.nome ?? "Cliente").slice(0, 120);
    const telCliente = String(p.clienteTelefone ?? doCadastro?.telefone ?? "").slice(0, 40);

    /* ── 3b. QUEM MARCOU ENTRA NO CADASTRO ──
     *
     * O `clienteId` que chega pode não resolver em ninguém, e o caso mais comum não é
     * borda nenhuma: é o agente de WhatsApp mandando `lead:<telefone>` para quem nunca
     * foi cadastrado. Sem este passo o cadastro nunca cresce pelo canal que mais traz
     * gente, e `atendimentos.cliente_id` fica nulo — então a soma por cliente do
     * faturamento responde zero com honestidade, e zero.
     *
     * Vale para o painel também, de propósito: "todo atendimento tem cliente no cadastro"
     * é regra do negócio, não conveniência do WhatsApp, e uma regra que só valesse para um
     * dos dois chamadores seria a segunda cópia da regra que esta arquitetura existe para
     * não ter. Na prática o painel manda um id que resolve e este bloco não faz nada.
     *
     * Sem telefone não se cadastra: ele é a chave de deduplicação, e criar sem ele daria
     * um cliente novo por mensagem da mesma pessoa. Nesse caso `cliente` fica `null`, o
     * espelho grava `cliente_id` nulo e o snapshot preserva nome e telefone. */
    const cliente = doCadastro ?? (telCliente ? await negocio.garantirCliente(t, { nome: nomeCliente, telefone: telCliente }) : null);

    const inicioISO = instanteISO(p.data, p.inicio);
    const fimISO = instanteISO(p.data, p.inicio + duracao / 60);

    /* Marcar no PASSADO é permitido: registrar às 15h o encaixe que entrou às 14h é uso
     * normal de agenda. O que se recusa é o absurdo — uma data corrompida não deve
     * plantar evento em 1998 nem em 2200, onde ninguém olha. */
    if (Math.abs((Date.parse(inicioISO) - agora()) / 86_400_000) > DIAS_DE_ALCANCE) {
      throw new DadoInvalido("Data a mais de um ano daqui.", "data");
    }

    const ctx: ContextoAgenda = { tenant: t, agendaId: p.agendaId };
    const comMeet = p.comMeet !== false; // padrão: com videochamada

    /** A linha do atendimento. Só o vínculo com o provedor muda entre as duas gravações. */
    const linha = (e: EventoExterno | null): LinhaDeAtendimento => ({
      maisaAg: p.maisaAg,
      agendaId: p.agendaId,
      clienteId: cliente?.id ?? null,
      clienteNome: nomeCliente,
      clienteTel: telCliente,
      servicoId: doCatalogo?.id ?? null,
      servicoNome: nomeServico,
      servicoValor: valorServico,
      inicioISO,
      fimISO,
      duracaoMin: duracao,
      dataLocal: p.data,
      horaInicio: p.inicio,
      eventoId: e?.eventoId ?? null,
      meetLink: e?.meetLink ?? null,
      htmlLink: e?.htmlLink ?? null,
    });

    /**
     * O que volta para quem pediu.
     *
     * ⚠️ `eventoId` cai para `maisaAg` quando não há evento no provedor, e isso é
     * deliberado: quem chamou precisa de UMA identidade para depois cancelar ou remover da
     * tela, e desde o ADR-0009 o atendimento sem provedor é o caso comum. A chave de
     * idempotência serve — ela é única por inquilino e sempre existe. Quem cancela aceita
     * as duas (ver `criarCancelarAtendimento`).
     */
    const resposta = (situacao: "criado" | "ja_existia", e: EventoExterno | null) =>
      ({
        situacao,
        eventoId: e?.eventoId ?? p.maisaAg,
        meetLink: e?.meetLink ?? null,
        htmlLink: e?.htmlLink ?? null,
        // O instante REALMENTE usado — quem pediu passa a exibir a partir daqui.
        inicioISO,
        // Pediu videochamada e não veio link: quem chamou precisa saber para não prometer.
        semMeet: comMeet && !e?.meetLink,
        // O atendimento existe, mas não entrou no calendário externo. Ver o passo 6.
        foraDoCalendario: !e,
      }) as const;

    /* ── 4. IDEMPOTÊNCIA: quem responde é o BANCO, não o provedor ──
     *
     * O caminho que isto cobre não é o duplo clique (a trava na tela já pega esse): é o
     * pedido que CHEGOU, gravou, e perdeu a resposta na volta — rede caindo, aba fechando,
     * timeout do runtime. Sem esta consulta, a tentativa seguinte cria um segundo
     * atendimento às 14h para o mesmo cliente, e nada explica de onde saiu o segundo.
     *
     * Vale em dobro para o agente: um modelo que não recebeu resposta tende a tentar de
     * novo, e é ele quem escolhe quando desistir.
     *
     * ⚠️ Antes esta pergunta era feita ao Google (`buscarPorAtendimento`), e por isso não
     * existia para quem não conectou Google — junto com o resto do produto. Agora é um
     * índice único (`tenant_id, maisa_ag`), que todo inquilino tem. */
    const jaGravado = await registro.buscarPorAg(t, { maisaAg: p.maisaAg });

    /* Resolvido: ou já tem evento no provedor, ou foi CANCELADO — e retentar a mesma chave
     * não ressuscita um atendimento que alguém desmarcou. Devolve o que existe. */
    if (jaGravado && (jaGravado.eventoId || jaGravado.situacao === "cancelado")) {
      return resposta("ja_existia", jaGravado.eventoId ? (jaGravado as EventoExterno) : null);
    }

    /* ── 5. GRAVA AQUI, ANTES DO PROVEDOR ──
     *
     * A ordem inverteu no ADR-0009, e este é o passo em que ela aparece. O motivo é que a
     * proteção contra vender o mesmo horário duas vezes passou a ser a constraint de
     * exclusão desta tabela: ela só protege se a escrita vier primeiro.
     *
     * `registrar` não lança — exceto em `HorarioOcupado`, que é justamente o que se quer
     * que suba. Ele aborta aqui, antes de qualquer efeito no mundo. */
    await registro.registrar(t, linha(null));

    /* ── 6. O CALENDÁRIO EXTERNO, SE HOUVER ──
     *
     * Aditivo: falha ou ausência somam zero e o atendimento continua de pé. É o passo que
     * antes derrubava tudo — `PrecisaReconectar` para quem nunca conectou nada.
     *
     * O preço, escrito para ninguém se surpreender: um inquilino QUE TEM Google e cuja
     * criação falhar por outro motivo (cota, permissão) fica com o atendimento no produto
     * e sem nada no calendário dele. Por isso a resposta carrega `foraDoCalendario` — quem
     * chamou tem como dizer isso na tela em vez de fingir que deu tudo certo. */
    const externo = await noProvedor();

    if (externo) await registro.registrar(t, linha(externo));

    return resposta(jaGravado ? "ja_existia" : "criado", externo);

    /* ─────────────────────────────────────────────────────────────────────────
     * Declarada por último de propósito: ela fecha sobre tudo que os passos 1-3
     * calcularam, e subi-la obrigaria a passar oito argumentos.
     * ───────────────────────────────────────────────────────────────────────── */
    async function noProvedor(): Promise<EventoExterno | null> {
      try {
        /* Retomada. Se JÁ HAVIA linha sem evento, uma tentativa anterior pode ter criado o
         * evento e morrido antes de anexar o id — criar de novo daria dois. Só aqui vale
         * pagar a varredura de agenda; no caminho normal ela é um round-trip inútil, e era
         * cobrado de toda criação antes desta mudança. */
        if (jaGravado) {
          const achado = await agenda.buscarPorAtendimento(ctx, { ag: p.maisaAg, perto: inicioISO });
          if (achado) return achado;
        }

        const negocioDono = await negocio.negocio(t);

        return await agenda.criar(ctx, {
          inicio: inicioISO,
          fim: fimISO,
          duracaoMin: duracao,
          // Etiqueta de dono no TÍTULO, não só na descrição: nada impede que a mesma conta
          // Google atenda mais de um profissional, e aí os atendimentos de todos caem no
          // mesmo calendário. O prefixo aparece já na grade do Google.
          titulo: `[${primeiroNome(profissional!.nome)}] ${nomeServico} — ${nomeCliente}`,
          descricao: [
            `Agendado pela MAISA · ${negocioDono.nome}`,
            `Profissional: ${profissional!.nome}`,
            telCliente ? `Telefone: ${telCliente}` : "",
            // Quem marcou. Só aparece quando NÃO foi alguém no painel — é o que vai
            // distinguir, na agenda do dono, o horário que a IA marcou sozinha.
            t.ator.tipo === "usuario" ? "" : `Origem: ${rotuloDoAtor(t.ator)}`,
          ].filter(Boolean).join("\n"),
          // Convidar o cliente por e-mail é OPT-IN, e o padrão é NÃO convidar. O convite é
          // um e-mail de verdade despachado pelo provedor (e cancelar manda um segundo); o
          // canal combinado com o cliente é o WhatsApp.
          emails: p.convidarCliente && cliente?.email ? [cliente.email] : [],
          comMeet,
          atendimento: {
            ag: p.maisaAg,
            profissionalId: p.agendaId,
            /* O id do cadastro quando ele existe, e não o `clienteId` que chegou. Importa
             * para o caminho do WhatsApp: o agente manda `lead:<telefone>`, e gravar essa
             * string no evento deixaria a marca apontando para um cliente que o banco não
             * conhece. Com o `garantirCliente` do passo 3b, aqui já é o uuid de verdade.
             *
             * Nada quebra em quem lê: `meus_horarios` reencontra o atendimento pelo
             * TELEFONE da marca, não por este id (ver `whatsapp/ferramentas.ts`). */
            clienteId: cliente?.id ?? p.clienteId,
            clienteNome: nomeCliente,
            clienteTel: telCliente,
            servicoId: p.servicoId,
            servicoNome: nomeServico,
            servicoValor: valorServico,
          },
        });
      } catch (e) {
        /* Engolir é o comportamento CERTO aqui, e é a mudança inteira do ADR-0009 numa
         * linha: o atendimento já está gravado, e derrubá-lo porque um calendário de
         * terceiro recusou seria desfazer o trabalho por causa do acessório.
         *
         * `PrecisaReconectar` — o caso da maioria, que é não ter conectado nada — nem
         * chega a ser excepcional: é o estado normal do produto. */
        /* `console.error` no núcleo tem precedente no vizinho (`aplicacao/contatos.ts:64`)
         * e não contraria o `LEIA-ME.md` desta pasta: o que ele proíbe é log DE NEGÓCIO.
         * Isto é falha de infraestrutura que ninguém mais vai relatar — sem esta linha, o
         * inquilino com Google conectado e cota estourada não deixa rastro em lugar
         * nenhum. */
        console.error(`[agendar] o atendimento ${p.maisaAg} não entrou no calendário externo`, e);
        return null;
      }
    }
  };
}

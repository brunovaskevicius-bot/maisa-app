/* ─────────────────────────────────────────────────────────────────────────────
 * CASO DE USO — marcar um atendimento.
 *
 * Este é O arquivo da reorganização. Antes toda esta lógica morava dentro de
 * `app/api/google/evento/route.ts`, o que significava que ela só existia para quem
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
import type { ContextoAgenda } from "../dominio/tenant";
import { rotuloDoAtor } from "../dominio/tenant";
import { DIAS_DE_ALCANCE, duracaoValida, ehUuid, horaValida } from "../dominio/agenda";
import { DadoInvalido, NaoEncontrado } from "../dominio/erros";
import { primeiroNome } from "../dominio/catalogo";
import { ehDataCivil, instanteISO } from "../dominio/tempo";

export type Dependencias = {
  agenda: AgendaExterna;
  negocio: RepositorioNegocio;
  /** Só para poder congelar o tempo em teste. */
  agora?: () => number;
};

export function criarAgendarAtendimento({ agenda, negocio, agora = Date.now }: Dependencias): AgendarAtendimento {
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
    const cliente = await negocio.cliente(t, p.clienteId);

    const duracao = Number(p.duracao ?? doCatalogo?.duracao);
    if (!duracaoValida(duracao)) throw new DadoInvalido("Duração fora do razoável.", "duracao");

    const nomeServico = String(p.servicoNome ?? doCatalogo?.nome ?? "Atendimento").slice(0, 120);
    const valorServico = Number(p.servicoValor ?? doCatalogo?.preco ?? 0);
    // Nome e telefone do cliente também podem vir do pedido, pela mesma razão do serviço:
    // eles são GRAVADOS no evento para o app funcionar noutro navegador.
    const nomeCliente = String(p.clienteNome ?? cliente?.nome ?? "Cliente").slice(0, 120);
    const telCliente = String(p.clienteTelefone ?? cliente?.telefone ?? "").slice(0, 40);

    const inicioISO = instanteISO(p.data, p.inicio);

    /* Marcar no PASSADO é permitido: registrar às 15h o encaixe que entrou às 14h é uso
     * normal de agenda. O que se recusa é o absurdo — uma data corrompida não deve
     * plantar evento em 1998 nem em 2200, onde ninguém olha. */
    if (Math.abs((Date.parse(inicioISO) - agora()) / 86_400_000) > DIAS_DE_ALCANCE) {
      throw new DadoInvalido("Data a mais de um ano daqui.", "data");
    }

    const ctx: ContextoAgenda = { tenant: t, agendaId: p.agendaId };

    /* ── 4. IDEMPOTÊNCIA: pergunta antes de criar ──
     * O caminho que isto cobre não é o duplo clique (a trava na tela já pega esse): é o
     * pedido que CHEGOU ao provedor, criou o evento, e perdeu a resposta na volta — rede
     * caindo, aba fechando, timeout do runtime. Sem esta consulta, a tentativa seguinte
     * cria um segundo atendimento às 14h para o mesmo cliente, e nada explica de onde
     * saiu o segundo.
     *
     * Vale em dobro para o agente: um modelo que não recebeu resposta tende a tentar de
     * novo, e é ele quem escolhe quando desistir. */
    const jaExiste = await agenda.buscarPorAtendimento(ctx, { ag: p.maisaAg, perto: inicioISO });
    const comMeet = p.comMeet !== false; // padrão: com videochamada

    if (jaExiste) {
      return {
        situacao: "ja_existia",
        eventoId: jaExiste.eventoId,
        meetLink: jaExiste.meetLink ?? null,
        htmlLink: jaExiste.htmlLink ?? null,
        inicioISO,
        semMeet: comMeet && !jaExiste.meetLink,
      };
    }

    /* ── 5. criar ── */
    const negocioDono = await negocio.negocio(t);

    const criado = await agenda.criar(ctx, {
      inicio: inicioISO,
      fim: instanteISO(p.data, p.inicio + duracao / 60),
      duracaoMin: duracao,
      // Etiqueta de dono no TÍTULO, não só na descrição: nada impede que a mesma conta
      // Google atenda mais de um profissional, e aí os atendimentos de todos caem no
      // mesmo calendário. O prefixo aparece já na grade do Google.
      titulo: `[${primeiroNome(profissional.nome)}] ${nomeServico} — ${nomeCliente}`,
      descricao: [
        `Agendado pela MAISA · ${negocioDono.nome}`,
        `Profissional: ${profissional.nome}`,
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
        clienteId: p.clienteId,
        clienteNome: nomeCliente,
        clienteTel: telCliente,
        servicoId: p.servicoId,
        servicoNome: nomeServico,
        servicoValor: valorServico,
      },
    });

    return {
      situacao: "criado",
      eventoId: criado.eventoId,
      meetLink: criado.meetLink ?? null,
      htmlLink: criado.htmlLink ?? null,
      // O instante REALMENTE usado — quem pediu passa a exibir a partir daqui.
      inicioISO,
      // Pediu videochamada e não veio link: quem chamou precisa saber para não prometer.
      semMeet: comMeet && !criado.meetLink,
    };
  };
}

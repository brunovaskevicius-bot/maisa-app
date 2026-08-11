/* ─────────────────────────────────────────────────────────────────────────────
 * FERRAMENTAS — os casos de uso expostos ao modelo, e a camada que o desconfia.
 *
 * O `LEIA-ME.md` desta pasta prometia que as ferramentas do agente JÁ EXISTEM: são
 * `nucleo/portas/entrada/casos-de-uso.ts`. Isto aqui é a tradução — e a tradução é
 * onde ficam os guardrails que o núcleo não tem como ter.
 *
 * TRÊS CAMADAS DE GUARDRAIL, e é importante saber qual protege de quê:
 *
 *   1. NÚCLEO — recusa o impossível: data que não existe, hora fora do dia, agenda de
 *      outro inquilino, atendimento duplicado. Vale para o painel também.
 *   2. AQUI — recusa o ALUCINADO: horário que ninguém ofereceu, serviço que não está
 *      no catálogo, id que o modelo compôs porque parecia plausível. O painel não
 *      precisa disso (um humano não inventa id); o agente precisa.
 *   3. PROMPT — pede bom comportamento. É a camada mais fraca, e a única que não
 *      vale como garantia.
 *
 * A camada 2 existe porque a 1 não consegue distinguir "14h que o cliente escolheu de
 * uma lista" de "14h que o modelo achou razoável". Para o núcleo, os dois são um
 * pedido válido de agendamento.
 * ────────────────────────────────────────────────────────────────────────────── */

import { createHash } from "crypto";

import type { DefinicaoDeFerramenta } from "@/nucleo/portas/saida/modelo-conversa";
import type {
  AgendarAtendimento, AnotarFato, CancelarAtendimento, LerAgenda, OferecerHorarios,
  PerfilDeCliente,
} from "@/nucleo/portas/entrada/casos-de-uso";
import type { CanalDeMensagens } from "@/nucleo/portas/saida/canal-mensagens";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { Escolha } from "@/nucleo/dominio/memoria";
import { DadoInvalido, ErroDeDominio, LimiteDoProvedor, NaoEncontrado, PrecisaReconectar } from "@/nucleo/dominio/erros";
import { hhmm, hojeISO, rotuloLongo, somarDias } from "@/nucleo/dominio/tempo";
import { soDigitos } from "@/nucleo/dominio/clientes";
import type { ConfiguracaoDoAgente } from "./persona";

/* ───────────────────────────── estado do turno ───────────────────────────── */

/**
 * O que o agente fez neste turno. Existe por três razões, todas de guardrail:
 *
 *   • `ofertas` — a lista branca de horários que PODEM ser marcados. Sem ela, o
 *     modelo marca o horário que ele acha que existe.
 *   • `escalou` — desistir é uma decisão do turno, não uma mensagem. O loop precisa
 *     saber para calar a MAISA e chamar o dono.
 *   • `marcou` — o fato que vai para a memória. Só é gravado quando o agendamento
 *     REALMENTE voltou do provedor: gravar a intenção em vez do resultado ensinaria
 *     preferência a partir de horários que nunca aconteceram.
 */
export type EstadoDoTurno = {
  ofertas: Map<string, { agendaId: string; data: string; inicio: number; servicoId: string; duracaoMin: number }>;
  escalou: { motivo: string } | null;
  marcou: Escolha | null;
};

export const novoEstado = (): EstadoDoTurno => ({ ofertas: new Map(), escalou: null, marcou: null });

const chaveOferta = (servicoId: string, agendaId: string, data: string, inicio: number) =>
  `${servicoId}|${agendaId}|${data}|${inicio}`;

/* ───────────────────────────── idempotência ───────────────────────────── */

/**
 * A chave de idempotência, DERIVADA em vez de sorteada.
 *
 * `agendarAtendimento` exige um uuid v4 e usa ele para não criar o mesmo atendimento
 * duas vezes. No painel o uuid nasce do clique, e um clique é único. No WhatsApp não
 * há clique: um modelo que não recebeu a resposta da ferramenta TENTA DE NOVO — é o
 * comportamento normal dele. Com uuid aleatório, a segunda tentativa é um atendimento
 * novo, e o cliente fica com dois horários às 14h.
 *
 * Derivando de (inquilino, telefone, serviço, dia, hora), a retentativa produz a MESMA
 * chave, o núcleo encontra o evento que a primeira tentativa criou e devolve
 * `ja_existia`. A proteção passa a funcionar sem o modelo colaborar — que é o único
 * jeito de ela funcionar.
 *
 * Formatado como uuid v4 (nibble de versão e variante forçados) porque `ehUuid()` no
 * domínio exige o formato canônico, e afrouxar essa validação para caber aqui
 * enfraqueceria a checagem para todos os chamadores.
 */
function chaveIdempotente(...partes: string[]): string {
  const h = createHash("sha256").update(partes.join("|")).digest("hex").slice(0, 32).split("");
  h[12] = "4";
  h[16] = "89ab"[parseInt(h[16], 16) % 4];
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/* ───────────────────────────── conversão ───────────────────────────── */

/**
 * "15:30" → 15.5.
 *
 * O modelo escreve hora como gente escreve. O domínio fala hora decimal. Pedir 15.5
 * ao modelo funcionaria na maioria das vezes e produziria 15.3 para "15:30" no resto
 * — erro silencioso de 12 minutos, que ninguém percebe até o cliente chegar.
 */
function horaDecimal(v: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

/** Erro de domínio → frase que o modelo pode transformar em resposta.
 *
 *  É a promessa do `dominio/erros.ts`: "o agente de WhatsApp vai virar uma frase".
 *  Note que a frase é dirigida ao MODELO, não ao cliente — ela diz o que fazer a
 *  seguir. Devolver "erro 400" faria o modelo dizer ao cliente que deu erro. */
function comoFrase(e: unknown): string {
  if (e instanceof DadoInvalido) return `Não deu: ${e.motivo} Peça a informação certa ao cliente e tente de novo.`;
  if (e instanceof NaoEncontrado) return `${e.recurso} não existe. Confira os ids da lista de serviços e da equipe.`;
  if (e instanceof LimiteDoProvedor) return "A agenda está ocupada respondendo. Espere e chame esta ferramenta de novo.";
  if (e instanceof PrecisaReconectar) return "A agenda do negócio se desconectou. Chame o responsável com `chamar_humano` — isto não se resolve com o cliente.";
  if (e instanceof ErroDeDominio) return `Não deu: ${e.message}`;
  console.error("[whatsapp/ferramentas] falha inesperada", e);
  return "Deu um problema técnico aqui. Chame o responsável com `chamar_humano`.";
}

/* ───────────────────────────── definições ───────────────────────────── */

/**
 * O que o modelo vê. Descrições longas de propósito: descrição de ferramenta é o
 * fator que mais move comportamento de agente, e a falha comum é descrever DE MENOS.
 * Cada uma diz QUANDO chamar, não só o que faz.
 */
export const FERRAMENTAS: DefinicaoDeFerramenta[] = [
  {
    nome: "oferecer_horarios",
    descricao:
      "Consulta a agenda real e devolve horários livres. Chame SEMPRE antes de falar qualquer coisa sobre disponibilidade — você não sabe o que está livre sem isso, e não pode marcar um horário que não veio daqui. Use quando o cliente perguntar se tem vaga, pedir para marcar, sugerir um dia, ou quando você precisar oferecer alternativa depois de um 'não'. Se ele não disse o dia, comece de hoje. Se não disse o profissional, deixe em branco e você recebe as opções de todos que fazem o serviço.",
    parametros: {
      type: "object",
      properties: {
        servico_id: { type: "string", description: "Id da lista de serviços (ex.: sv1). Obrigatório — a duração do serviço é o que define o que é vago." },
        data_inicial: { type: "string", description: "Dia a partir do qual procurar, no formato AAAA-MM-DD. Omita para começar de hoje." },
        dias: { type: "integer", description: "Quantos dias varrer a partir de data_inicial. Padrão 7. Use 1 quando o cliente pediu um dia específico." },
        profissional_id: { type: "string", description: "Id da equipe (ex.: pr1). Só quando o cliente pediu alguém por nome." },
      },
      required: ["servico_id"],
    },
  },
  {
    nome: "agendar",
    descricao:
      "Marca o atendimento de verdade na agenda. Só chame depois de o cliente ter escolhido, em texto, um horário que veio de `oferecer_horarios` nesta conversa. Não chame para confirmar intenção ('quero quinta') — só quando ele fechou um horário exato. Depois de chamar, confirme em uma mensagem curta com dia, hora e profissional.",
    parametros: {
      type: "object",
      properties: {
        servico_id: { type: "string", description: "Id do serviço." },
        profissional_id: { type: "string", description: "Id do profissional cuja agenda recebeu a oferta." },
        data: { type: "string", description: "AAAA-MM-DD." },
        hora: { type: "string", description: "HH:MM em 24h, exatamente como veio de oferecer_horarios (ex.: 15:30)." },
        nome_cliente: { type: "string", description: "Primeiro nome, se você souber e ele ainda não estiver no cadastro." },
      },
      required: ["servico_id", "profissional_id", "data", "hora"],
    },
  },
  {
    nome: "meus_horarios",
    descricao:
      "Lista os próximos atendimentos JÁ MARCADOS deste cliente. Chame quando ele perguntar quando é o horário dele, quiser cancelar ou remarcar, ou disser que não lembra. É a única forma de obter o evento_id que `cancelar` exige — nunca invente um.",
    parametros: { type: "object", properties: {} },
  },
  {
    nome: "cancelar",
    descricao:
      "Cancela um atendimento marcado. Só chame com um evento_id que veio de `meus_horarios`, e só depois de o cliente confirmar que quer cancelar aquele horário específico. Para remarcar: cancele e depois ofereça horários novos.",
    parametros: {
      type: "object",
      properties: {
        evento_id: { type: "string", description: "Id vindo de meus_horarios." },
        profissional_id: { type: "string", description: "Id do profissional daquele atendimento, vindo de meus_horarios." },
      },
      required: ["evento_id", "profissional_id"],
    },
  },
  {
    nome: "anotar_nome",
    descricao:
      "Guarda o nome do cliente para as próximas conversas. Chame na hora em que ele disser como se chama. Não pergunte o nome só para poder chamar isto — pergunte quando for marcar.",
    parametros: {
      type: "object",
      properties: { nome: { type: "string", description: "Só o primeiro nome, como ele escreveu." } },
      required: ["nome"],
    },
  },
  {
    nome: "chamar_humano",
    descricao:
      "Passa a conversa para o responsável e para de responder. Chame quando: não souber a resposta e não houver ferramenta que resolva; pedirem desconto, exceção ou algo fora do seu alcance; a pessoa estiver irritada ou reclamando de atendimento; o assunto for saúde, orientação técnica ou qualquer coisa que exija julgamento profissional; ou algo der errado duas vezes. Chamar o responsável não é falha — é o comportamento certo. Depois de chamar, não escreva mais nada.",
    parametros: {
      type: "object",
      properties: { motivo: { type: "string", description: "Uma frase para o responsável entender o que precisa dele." } },
      required: ["motivo"],
    },
  },
];

/* ───────────────────────────── execução ───────────────────────────── */

export type Dependencias = {
  oferecerHorarios: OferecerHorarios;
  agendarAtendimento: AgendarAtendimento;
  cancelarAtendimento: CancelarAtendimento;
  lerAgenda: LerAgenda;
  anotarFato: AnotarFato;
  canal: CanalDeMensagens;
  config: ConfiguracaoDoAgente;
};

/** Janela de "próximos atendimentos". 60 dias: quem marcou para depois disso é raro,
 *  e varrer mais é pagar leitura de agenda por nada. */
const DIAS_A_FRENTE = 60;

export function criarExecutor(deps: Dependencias) {
  const { config } = deps;

  const nomeServico = (id: string) => config.servicos.find((s) => s.id === id)?.nome ?? id;
  const nomeProf = (id: string) => config.profissionais.find((p) => p.id === id)?.nome ?? id;
  const agendasAtivas = () => config.profissionais.filter((p) => p.ativo).map((p) => p.id);

  /**
   * Executa uma ferramenta. Devolve TEXTO — nunca lança.
   *
   * Nunca lançar é deliberado: uma exceção aqui derrubaria o turno e o cliente ficaria
   * sem resposta nenhuma, que é o pior resultado possível num canal onde ele está
   * esperando. Erro vira `tool_result` com `is_error`, o modelo lê e contorna.
   */
  return async function executar(
    t: ContextoTenant,
    perfil: PerfilDeCliente,
    estado: EstadoDoTurno,
    nome: string,
    entrada: Record<string, unknown>,
  ): Promise<{ texto: string; erro: boolean }> {
    const ok = (texto: string) => ({ texto, erro: false });
    const nao = (texto: string) => ({ texto, erro: true });

    try {
      switch (nome) {
        /* ── horários livres ── */
        case "oferecer_horarios": {
          const r = await deps.oferecerHorarios(t, {
            servicoId: String(entrada.servico_id ?? ""),
            agendaId: entrada.profissional_id ? String(entrada.profissional_id) : undefined,
            de: entrada.data_inicial ? String(entrada.data_inicial) : hojeISO(),
            dias: entrada.dias != null ? Number(entrada.dias) : undefined,
          });

          if (r.dias.length === 0) {
            // Frase, não lista vazia: `[]` faria o modelo dizer "não tenho nada" sem
            // oferecer o passo seguinte, e a conversa morreria num não.
            return ok(
              `Nenhum horário livre para ${r.servicoNome} nesse período. Ofereça procurar mais à frente, ou pergunte se outro dia serve.`,
            );
          }

          /* Registra a oferta ANTES de devolver. É esta linha que dá poder ao
           * guardrail do `agendar`: o que não passou por aqui não pode ser marcado. */
          const linhas = r.dias.map((d) => {
            for (const h of d.horarios) {
              estado.ofertas.set(chaveOferta(String(entrada.servico_id), d.agendaId, d.data, h), {
                agendaId: d.agendaId,
                data: d.data,
                inicio: h,
                servicoId: String(entrada.servico_id),
                duracaoMin: r.duracaoMin,
              });
            }
            return `${rotuloLongo(d.data)} (${d.data}) com ${nomeProf(d.agendaId)} [${d.agendaId}]: ${d.horarios.map(hhmm).join(", ")}`;
          });

          return ok(
            `${r.servicoNome}, ${r.duracaoMin} min. Horários livres:\n${linhas.join("\n")}\n\n` +
              "Ofereça no máximo duas ou três opções na mensagem — não repasse a lista inteira.",
          );
        }

        /* ── marcar ── */
        case "agendar": {
          const inicio = horaDecimal(entrada.hora);
          if (inicio === null) return nao("Hora fora de formato. Use HH:MM em 24h, ex.: 15:30.");

          const servicoId = String(entrada.servico_id ?? "");
          const agendaId = String(entrada.profissional_id ?? "");
          const data = String(entrada.data ?? "");

          /* ⚠️ O GUARDRAIL PRINCIPAL DESTE ARQUIVO.
           *
           * O horário tem que ter saído de `oferecer_horarios` neste turno. Sem esta
           * checagem, o caminho de falha é silencioso e caro: o modelo diz "tenho
           * quinta às 15h" sem consultar, o cliente aceita, `agendar` passa (o núcleo
           * não tem como saber que ninguém ofereceu 15h), o evento é criado em cima do
           * almoço do dono — e todo mundo só descobre na quinta. */
          if (!estado.ofertas.has(chaveOferta(servicoId, agendaId, data, inicio))) {
            return nao(
              "Esse horário não está entre os que você ofereceu nesta conversa, então não posso marcar. " +
                "Chame `oferecer_horarios` para esse serviço e esse dia, confirme com o cliente um dos horários que voltarem, e só então marque.",
            );
          }

          if (entrada.nome_cliente) {
            await deps.anotarFato(t, { telefone: perfil.telefone, nome: String(entrada.nome_cliente) });
          }

          const r = await deps.agendarAtendimento(t, {
            agendaId,
            /* O cliente que ainda não existe no cadastro entra como `lead:<telefone>`.
             * Precisa ser ESTÁVEL, e não um id sorteado: é ele que fica gravado no
             * evento, e é por ele que `meus_horarios` reencontra o atendimento na
             * próxima conversa. */
            clienteId: perfil.clienteId ?? `lead:${perfil.telefone}`,
            clienteNome: String(entrada.nome_cliente ?? perfil.nome ?? "Cliente"),
            clienteTelefone: perfil.telefone,
            servicoId,
            data,
            inicio,
            maisaAg: chaveIdempotente(t.tenantId, perfil.telefone, servicoId, agendaId, data, String(inicio)),
            // Videochamada e convite por e-mail são decisões do dono, não do modelo:
            // não estão no schema da ferramenta de propósito.
            comMeet: false,
            convidarCliente: false,
          });

          // Só agora o fato é real. Ver `EstadoDoTurno.marcou`.
          estado.marcou = { data, inicio, profissionalId: agendaId, servicoId };

          const quando = `${rotuloLongo(data)} às ${hhmm(inicio)} com ${nomeProf(agendaId)}`;
          return ok(
            r.situacao === "ja_existia"
              ? `Esse atendimento já estava marcado: ${quando}. Confirme para o cliente sem dizer que marcou duas vezes.`
              : `Marcado: ${nomeServico(servicoId)}, ${quando}. Confirme em uma mensagem curta.`,
          );
        }

        /* ── o que o cliente já tem ── */
        case "meus_horarios": {
          const hoje = hojeISO();
          const janela = { de: hoje, ate: somarDias(hoje, DIAS_A_FRENTE) };
          const meus = soDigitos(perfil.telefone).slice(-8);

          const lotes = await Promise.all(
            agendasAtivas().map(async (agendaId) => {
              const r = await deps.lerAgenda(t, { agendaId, ...janela });
              return r.eventos
                /* Filtro por MARCA da MAISA e por telefone. Duas condições, e as duas
                 * são de privacidade: sem `e.maisa` vazaria o compromisso pessoal do
                 * dono, e sem o telefone vazaria o atendimento de outro cliente para
                 * quem só sabe mandar mensagem. */
                .filter((e) => e.maisa && soDigitos(e.maisa.clienteTel).slice(-8) === meus)
                .map((e) => ({ e, agendaId }));
            }),
          );

          const eventos = lotes.flat().sort((a, b) => `${a.e.data}${a.e.inicio}`.localeCompare(`${b.e.data}${b.e.inicio}`));
          if (eventos.length === 0) return ok("Esse cliente não tem atendimento marcado. Ofereça marcar.");

          return ok(
            eventos
              .map(
                ({ e, agendaId }) =>
                  `${rotuloLongo(e.data)} (${e.data}) às ${hhmm(e.inicio)} · ${e.maisa!.servicoNome} com ${nomeProf(agendaId)} · evento_id: ${e.eventoId} · profissional_id: ${agendaId}`,
              )
              .join("\n"),
          );
        }

        /* ── cancelar ── */
        case "cancelar": {
          await deps.cancelarAtendimento(t, {
            agendaId: String(entrada.profissional_id ?? ""),
            eventoId: String(entrada.evento_id ?? ""),
          });
          return ok("Cancelado. Avise o cliente em uma frase e pergunte se quer remarcar.");
        }

        /* ── memória ── */
        case "anotar_nome": {
          const m = await deps.anotarFato(t, { telefone: perfil.telefone, nome: String(entrada.nome ?? "") });
          return ok(m.nome ? `Anotado: ${m.nome}.` : "Não veio nome. Siga sem insistir.");
        }

        /* ── desistir ── */
        case "chamar_humano": {
          const motivo = String(entrada.motivo ?? "sem motivo informado");
          estado.escalou = { motivo };
          await deps.canal.escalar(t, { telefone: perfil.telefone, motivo });
          /* Devolve a FRASE FINAL que o cliente vai ver. O modelo não escreve mais
           * nada depois disto (o loop encerra) — então esta é a última palavra da
           * MAISA, e ela não pode prometer prazo que ninguém garantiu. */
          return ok("Responsável avisado. Diga ao cliente que você vai confirmar com a equipe e já volta — e nada além disso.");
        }

        default:
          return nao(`Ferramenta "${nome}" não existe.`);
      }
    } catch (e) {
      return nao(comoFrase(e));
    }
  };
}

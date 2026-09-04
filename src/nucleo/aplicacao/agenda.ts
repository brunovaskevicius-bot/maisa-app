/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — ler a agenda, cancelar atendimento, gerir a conexão.
 *
 * Os vizinhos do `agendar-atendimento.ts`. São curtos porque a parte difícil
 * (autenticação no provedor, tradução de fuso, paginação) está do lado do adaptador —
 * é para isso que a porta existe.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  CancelarAtendimento, DesconectarAgenda, LerAgenda, ListarConexoes,
} from "../portas/entrada/casos-de-uso";
import type { AgendaExterna, ConexoesDeAgenda } from "../portas/saida/agenda-externa";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import type { AtendimentoRegistrado, RegistroDeAtendimentos } from "../portas/saida/registro-atendimentos";
import type { EventoDeAgenda } from "../dominio/agenda";
import { DadoInvalido } from "../dominio/erros";
import { diasEntre, ehDataCivil } from "../dominio/tempo";

/** Teto da janela de leitura. A grade de um mês pede ~42 dias; 120 dá folga para
 *  qualquer visão futura sem deixar um pedido forjado varrer dez anos da agenda. */
const MAX_DIAS = 120;

async function exigirAgendaPermitida(
  negocio: RepositorioNegocio,
  t: Parameters<RepositorioNegocio["agendasPermitidas"]>[0],
  agendaId: string,
) {
  const permitidas = await negocio.agendasPermitidas(t);
  if (!permitidas.includes(agendaId)) {
    throw new DadoInvalido("Essa agenda não existe neste negócio.", "agendaId");
  }
}

/**
 * Uma linha da agenda do produto, na língua da grade.
 *
 * ⚠️ `eventoId` cai para `maisaAg` quando não há evento externo. A grade precisa de uma
 * identidade estável para arrastar, abrir e cancelar; a chave de idempotência é única por
 * inquilino e existe sempre, então serve. Ver `AtendimentoAgendado.eventoId`.
 */
function paraEvento(a: AtendimentoRegistrado): EventoDeAgenda {
  return {
    eventoId: a.eventoId ?? a.maisaAg,
    data: a.dataLocal,
    inicio: a.horaInicio,
    fim: a.horaInicio + a.duracaoMin / 60,
    duracao: a.duracaoMin,
    titulo: `${a.servicoNome} — ${a.clienteNome}`,
    meetLink: a.meetLink ?? undefined,
    htmlLink: a.htmlLink ?? undefined,
    /* A agenda do produto não tem recorrência ainda. Quando tiver, é aqui que ela aparece. */
    recorrente: false,
    maisa: {
      ag: a.maisaAg,
      profissionalId: a.agendaId,
      clienteId: a.clienteId ?? "",
      clienteNome: a.clienteNome,
      clienteTel: a.clienteTel,
      servicoId: a.servicoId ?? "",
      servicoNome: a.servicoNome,
      servicoValor: a.servicoValor,
    },
    /* Confirmação por convite de e-mail é coisa do provedor. Sem provedor não há convidado
     * para aguardar, e dizer "aguardando" seria inventar uma pendência que não existe. */
    aguardandoResposta: false,
  };
}

export function criarLerAgenda(deps: {
  agenda: AgendaExterna;
  negocio: RepositorioNegocio;
  registro: RegistroDeAtendimentos;
}): LerAgenda {
  return async (t, p) => {
    await exigirAgendaPermitida(deps.negocio, t, p.agendaId);

    if (!ehDataCivil(p.de) || !ehDataCivil(p.ate) || p.de > p.ate) {
      throw new DadoInvalido("Janela inválida.", "janela");
    }
    if (diasEntre(p.de, p.ate) > MAX_DIAS) {
      throw new DadoInvalido("Janela grande demais.", "janela");
    }

    const janela = { de: p.de, ate: p.ate };

    /* ── 1. a agenda do produto. Obrigatória, e ela LANÇA se falhar ──
     * Grade vazia por erro de banco é indistinguível de dia sem atendimento, e o dono
     * acredita: ele vê o dia livre e marca em cima. Ver a porta. */
    const proprios = await deps.registro.listar(t, { agendaId: p.agendaId, janela });

    /* ── 2. o calendário externo. ADITIVO ──
     * Traz o que nasceu FORA da MAISA — o encaixe que o dono marcou no celular, o almoço,
     * o médico. Some zero quando não existe ou falha, e nunca derruba a leitura.
     *
     * Antes esta chamada era a única, e por isso `PrecisaReconectar` esvaziava a tela
     * inteira de quem não conectou nada — que é a maioria. */
    let externos: EventoDeAgenda[] = [];
    try {
      externos = await deps.agenda.listar({ tenant: t, agendaId: p.agendaId }, janela);
    } catch (e) {
      console.error(`[lerAgenda] calendário externo indisponível para ${p.agendaId} — seguindo sem ele`, e);
    }

    /* ── 3. deduplicar ──
     * O atendimento que a MAISA criou está nos DOIS lados: na tabela e no calendário, com
     * o mesmo `evento_id`. Sem este filtro ele aparece duas vezes na grade, e a segunda
     * cópia vem sem o vínculo com cliente e serviço.
     *
     * Casa por `eventoId` (o que o produto gravou) e também pela marca `maisa.ag`: um
     * evento pode ter sido criado por uma versão que não anexou o id de volta. */
    const jaTem = new Set<string>();
    for (const a of proprios) {
      if (a.eventoId) jaTem.add(a.eventoId);
      jaTem.add(a.maisaAg);
    }

    const soDeFora = externos.filter((e) => !jaTem.has(e.eventoId) && !(e.maisa && jaTem.has(e.maisa.ag)));

    /* Cancelado não vai para a grade. A leitura traz porque o histórico é do negócio; a
     * tela desenha o que está de pé. */
    const eventos = [
      ...proprios.filter((a) => a.situacao === "marcado").map(paraEvento),
      ...soDeFora,
    ].sort((a, b) => (a.data === b.data ? a.inicio - b.inicio : a.data.localeCompare(b.data)));

    return { janela, eventos };
  };
}

export function criarCancelarAtendimento(deps: {
  agenda: AgendaExterna;
  negocio: RepositorioNegocio;
  registro: RegistroDeAtendimentos;
}): CancelarAtendimento {
  return async (t, p) => {
    await exigirAgendaPermitida(deps.negocio, t, p.agendaId);
    if (!p.eventoId) throw new DadoInvalido("Atendimento não informado.", "eventoId");

    /* Que id é este? A grade entrega UM campo (`eventoId`), e desde o ADR-0009 ele pode
     * ser um id de evento do provedor ou uma chave de idempotência. Perguntar ao banco é
     * mais barato e mais seguro que adivinhar por formato — os dois são strings opacas — e
     * evita montar um `or` no filtro com string vinda da query string. */
    const porChave = await deps.registro.buscarPorAg(t, { maisaAg: p.eventoId });

    /* ── 1. cancela na agenda do produto ──
     * Vem PRIMEIRO agora, e a ordem inverteu junto com a da criação: quem manda no horário
     * é esta tabela. Cancelar aqui já libera a vaga para todo mundo que pergunta "está
     * livre?", inclusive o agente. Não lança (ver a porta). */
    await deps.registro.cancelar(
      t,
      porChave ? { maisaAg: porChave.maisaAg } : { eventoId: p.eventoId },
    );

    /* ── 2. e no calendário externo, se houver ──
     * Aditivo, igual à criação: sem provedor não há o que cancelar lá, e uma falha dele
     * não pode deixar o horário bloqueado aqui. O evento pode ficar de pé no Google do
     * dono — visível para ele, e sem efeito nenhum sobre o que a MAISA oferece. */
    const eventoExterno = porChave?.eventoId ?? (porChave ? null : p.eventoId);
    if (eventoExterno) {
      try {
        await deps.agenda.cancelar({ tenant: t, agendaId: p.agendaId }, { eventoId: eventoExterno });
      } catch (e) {
        console.error(`[cancelar] o evento ${eventoExterno} continua no calendário externo`, e);
      }
    }
  };
}

export function criarListarConexoes(deps: { conexoes: ConexoesDeAgenda }): ListarConexoes {
  return async (t) => deps.conexoes.listar(t);
}

/**
 * Desconectar tem allowlist MAIS FROUXA que o resto, de propósito.
 *
 * A lista de agendas encolheu quando a equipe virou uma pessoa só, e uma conexão
 * gravada antes disso ficaria impossível de desconectar: a UI não a lista, e a
 * validação a recusaria — um refresh token vivo, invisível e permanente. Desconectar
 * não precisa de allowlist para ser seguro: a RLS garante que cada um só apaga a
 * própria linha, e a revogação usa o token daquela mesma linha.
 */
/**
 * Formatos de id de agenda que se aceita desconectar.
 *
 * Dois, e o segundo é dívida com data de validade:
 *   • `uuid`      — `profissionais.id` no banco (`gen_random_uuid()`), o formato de hoje.
 *   • `pr` + nº   — o id de texto dos fixtures, que é o que a tabela legada
 *                   `google_integracoes` (arquivo 001) tem gravado. Enquanto existir uma
 *                   linha dessas não migrada pelo `006_migrar_google.sql`, recusar o
 *                   formato antigo aqui é justamente criar o refresh token preso e
 *                   invisível que o comentário acima diz para evitar.
 *
 * A validação continua existindo (em vez de aceitar qualquer string) porque `agendaId`
 * chega da query string: sem forma esperada, o campo vira escrita livre no `where` do
 * delete. Ela é de FORMATO, não de existência — quem garante que ninguém apaga a linha de
 * outro é o `tenant_id` do contexto, que nasce da sessão.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PR_LEGADO = /^pr\d+$/;

export function criarDesconectarAgenda(deps: { conexoes: ConexoesDeAgenda }): DesconectarAgenda {
  return async (t, p) => {
    if (!UUID.test(p.agendaId) && !PR_LEGADO.test(p.agendaId)) {
      throw new DadoInvalido("Agenda inválida.", "agendaId");
    }
    return deps.conexoes.desconectar({ tenant: t, agendaId: p.agendaId });
  };
}

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

export function criarLerAgenda(deps: { agenda: AgendaExterna; negocio: RepositorioNegocio }): LerAgenda {
  return async (t, p) => {
    await exigirAgendaPermitida(deps.negocio, t, p.agendaId);

    if (!ehDataCivil(p.de) || !ehDataCivil(p.ate) || p.de > p.ate) {
      throw new DadoInvalido("Janela inválida.", "janela");
    }
    if (diasEntre(p.de, p.ate) > MAX_DIAS) {
      throw new DadoInvalido("Janela grande demais.", "janela");
    }

    const eventos = await deps.agenda.listar(
      { tenant: t, agendaId: p.agendaId },
      { de: p.de, ate: p.ate },
    );
    return { janela: { de: p.de, ate: p.ate }, eventos };
  };
}

export function criarCancelarAtendimento(deps: { agenda: AgendaExterna; negocio: RepositorioNegocio }): CancelarAtendimento {
  return async (t, p) => {
    await exigirAgendaPermitida(deps.negocio, t, p.agendaId);
    if (!p.eventoId) throw new DadoInvalido("Evento não informado.", "eventoId");
    await deps.agenda.cancelar({ tenant: t, agendaId: p.agendaId }, { eventoId: p.eventoId });
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
export function criarDesconectarAgenda(deps: { conexoes: ConexoesDeAgenda }): DesconectarAgenda {
  return async (t, p) => {
    if (!/^pr\d+$/.test(p.agendaId)) throw new DadoInvalido("Agenda inválida.", "agendaId");
    return deps.conexoes.desconectar({ tenant: t, agendaId: p.agendaId });
  };
}

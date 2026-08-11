/* ─────────────────────────────────────────────────────────────────────────────
 * EXPEDIENTE — quando o negócio abre, em dado ESTRUTURADO.
 *
 * O `horario`/`folga` do profissional são frases para o dono ler ("Seg–Sáb 09–19",
 * "folga domingo"); o calendário precisa do NÚMERO. Sem isto a Agenda marcava gente em
 * dia de folga e fora do horário — e a tela de Equipe, na mesma sessão, desmentia a
 * Agenda. Se os dois divergirem, é ESTE que manda: mantenha o par junto.
 *
 * É também o que o agente de WhatsApp vai consultar antes de oferecer um horário. Por
 * isso as funções são puras e recebem o expediente como argumento: elas não sabem de
 * onde ele veio (fixture hoje, tabela por inquilino amanhã).
 * ────────────────────────────────────────────────────────────────────────────── */

import { dowDoDia } from "./tempo";

export type Expediente = {
  /** Índices de dia da semana em que não se atende. 0 = segunda … 6 = domingo. */
  folga: number[];
  /** Hora decimal de abertura e de fechamento. */
  de: number;
  ate: number;
};

/** Trabalha nesse dia? */
export const atendeNoDia = (e: Expediente | undefined, data: string) =>
  !!e && !e.folga.includes(dowDoDia(data));

/** Pode COMEÇAR um atendimento aí — dia de trabalho e hora dentro do expediente. */
export const podeComecarEm = (e: Expediente | undefined, data: string, inicio: number) =>
  !!e && atendeNoDia(e, data) && inicio >= e.de && inicio < e.ate;

/** Domingo a casa não abre. A coluna existe só para o mês ter sete colunas. */
export const fechado = (data: string) => dowDoDia(data) === 6;

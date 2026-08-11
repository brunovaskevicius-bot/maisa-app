/* ─────────────────────────────────────────────────────────────────────────────
 * ASSISTENTE — como a MAISA se comporta, por inquilino.
 *
 * Isto deixa de ser tela de configuração e vira o PROMPT do agente no dia em que o
 * WhatsApp entrar: o tom, o horário em que ela pode marcar e os limites do que ela faz
 * sozinha são exatamente os parâmetros que o agente vai receber. Por isso o formato é
 * dado estruturado, e não texto pronto.
 * ────────────────────────────────────────────────────────────────────────────── */

export const TONS = ["amigável", "profissional", "descontraído"] as const;
export type Tom = (typeof TONS)[number];

export type Assistente = { nome: string; tom: Tom; saudacao: string; ativa: boolean };

/** Um dia da semana no horário de atendimento anunciado ao cliente. */
export type Dia = { nome: string; aberto: boolean; de: string; ate: string };

/** Chaves dos toggles de comportamento — o store guarda um booleano por chave. */
export type ChaveCfg =
  | "confirmar" | "lembrete" | "remarcar"
  | "encaminhar" | "precoCatalogo" | "pix" | "encaixe";

export type SecaoAjuste = { id: string; titulo: string; sub: string };

/** Um toggle como a tela mostra: chave + como explicá-lo. */
export type Toggle = { chave: ChaveCfg; titulo: string; desc: string };

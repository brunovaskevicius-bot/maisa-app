/* ─────────────────────────────────────────────────────────────────────────────
 * GEMINI — configuração. ⚠️ SÓ SERVIDOR (a chave nunca é NEXT_PUBLIC).
 *
 * Mesmo padrão de `google/config.ts` e `evolution/config.ts`: o módulo diz se a
 * integração existe e o que falta, e nada mais no app checa env solto.
 *
 * ⚠️ ESTA É UMA CHAVE DE TESTE, e a informação está aqui porque é aqui que alguém
 * olha antes de fazer deploy: a chave em uso hoje é temporária e será REVOGADA quando
 * o produto for para produção. Se você está lendo isto num ambiente de produção, ou a
 * chave já foi trocada, ou o deploy está errado.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * O modelo, e por que este.
 *
 * `gemini-3.5-flash-lite` a US$ 0,30 / 2,50 por milhão de tokens (entrada/saída) — o
 * MESMO preço da 2.5 Flash, uma geração depois. Comparado com a 3.6 Flash (US$ 1,50 /
 * 7,50), é 5× menos na entrada; num agente que manda o catálogo inteiro no prompt a
 * cada mensagem, a entrada é o que domina a conta. Dá ~US$ 0,001 por mensagem.
 *
 * Se ele tropeçar na disciplina que importa aqui — chamar `oferecer_horarios` ANTES de
 * afirmar qualquer coisa sobre agenda — o degrau é `GEMINI_MODELO=gemini-3.6-flash`, e
 * não prompt novo. Por isso o nome é env: a decisão é de operação, não de código.
 */
const MODELO_PADRAO = "gemini-3.5-flash-lite";

export const GEMINI = {
  chave: process.env.GEMINI_API_KEY ?? "",
  modelo: (process.env.GEMINI_MODELO ?? "").trim() || MODELO_PADRAO,
  /** Base da API. Env só para poder apontar para um proxy em teste. */
  base: (process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, ""),
  /**
   * Teto de espera. Um turno de WhatsApp que passa disso já perdeu o cliente, e sem
   * teto a requisição pendurada segura o runtime até o timeout da plataforma —
   * gastando o tempo de execução que a Vercel cobra sem nada para mostrar.
   */
  timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 45_000),
} as const;

export const isGeminiConfigured = Boolean(GEMINI.chave);

export function geminiFaltando(): string[] {
  return isGeminiConfigured ? [] : ["GEMINI_API_KEY"];
}

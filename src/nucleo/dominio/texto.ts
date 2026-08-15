/* ─────────────────────────────────────────────────────────────────────────────
 * TEXTO — a higiene que todo campo digitado por gente precisa.
 *
 * Existe porque a mesma função já tinha três cópias no núcleo, e uma quarta estava a
 * caminho: `aplicacao/provisionar.ts` (`normalizar`), `dominio/negocio.ts`
 * (`normalizarNomeDoNegocio`) e o que o catálogo ia precisar. Todas idênticas, e cópia é
 * o que diverge quando alguém acha que "aqui também precisa aparar o não-quebrável".
 *
 * Vale a pena ter arquivo próprio porque isto NÃO é detalhe de formatação: é o que faz
 * "Corte  " e "Corte" serem o mesmo serviço, e o que impede um nome de negócio com
 * duzentos espaços de virar duzentos caracteres pagos no prompt do agente.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * Colapsa espaço repetido e apara as pontas. `"  Studio   Aurora "` → `"Studio Aurora"`.
 *
 * `\s` cobre tabulação, quebra de linha e o espaço não-quebrável colado por quem copia de
 * PDF ou de mensagem de WhatsApp — que é justamente o caso que passa despercebido, porque
 * ele parece um espaço comum na tela e não é o mesmo caractere na comparação.
 *
 * Aceita `null`/`undefined` e devolve `""`: quem chama está sempre lendo um corpo de
 * request, onde campo ausente é o caso normal e não uma exceção a tratar.
 */
export const colapsarEspaco = (bruto: string | null | undefined): string =>
  String(bruto ?? "").replace(/\s+/g, " ").trim();

/**
 * Só espaço e pontuação ASCII — `"---"`, `"..."`, `"( )"`.
 *
 * Escrito com faixas de código, e não com `\p{L}`, porque as classes de propriedade
 * Unicode exigem a flag `u`. A consequência é boa para nós: tudo fora do ASCII (á, ç, ã,
 * ñ, 日) cai FORA da faixa e conta como conteúdo — que é exatamente o que um nome
 * brasileiro precisa.
 *
 * Serve para recusar o que passa no teste de comprimento e mesmo assim não é nome: `"---"`
 * tem três caracteres, vira slug vazio, e o erro só aparece no banco — longe de quem
 * digitou.
 */
export const SEM_CONTEUDO = /^[\s!-/:-@[-`{-~]*$/;

/** `true` quando sobra alguma letra ou número depois de colapsar o espaço. */
export const temConteudo = (bruto: string | null | undefined): boolean => {
  const t = colapsarEspaco(bruto);
  return t.length > 0 && !SEM_CONTEUDO.test(t);
};

/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTE ADAPTADOR LÊ DO AMBIENTE. ⚠️ SÓ SERVIDOR — nada de `NEXT_PUBLIC_`.
 *
 * Duas variáveis, e a lista curta é o ponto.
 *
 * ── ⚠️ ID DE PREÇO NÃO É VARIÁVEL DE AMBIENTE. LOOKUP KEY É. ──
 *
 * A saída óbvia seria `STRIPE_PRECO_ESSENCIAL=price_1UI64e…`. Ela recria, dentro do
 * ambiente, exatamente o defeito que `_lib/planos.ts` acabou de matar no código: um
 * valor opaco, digitado à mão, em três lugares (local, preview, produção), que não
 * quebra build nem aparece em tela quando está errado — só cobra o preço errado de
 * quem clicou.
 *
 * E tem um modo de falha pior que o dos preços: `price_…` de sandbox colado na
 * produção responde `No such price`, mas `price_…` de um preço ANTIGO da mesma conta
 * responde 200 e cobra o valor velho. Silencioso, com cartão na mão.
 *
 * `lookup_key` é um nome que NÓS escolhemos (`maisa_essencial_mensal_brl`) e que a
 * Stripe resolve dentro da conta da chave que está sendo usada. A mesma linha de código
 * acha o preço de teste com a chave de teste e o de produção com a de produção. Trocar
 * de preço vira `stripe prices create --lookup-key … --transfer-lookup-key`, que é uma
 * operação atômica do lado deles — e o código não sabe que houve mudança.
 *
 * O custo é uma chamada a mais por checkout, resolvida por cache de processo em
 * `cobranca-stripe.ts`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ChaveDePlano } from "@/nucleo/dominio/assinatura";

/** A Vercel guarda o valor cru: colar com aspas ou espaço é comum, e quebra silencioso. */
const limpa = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "");

/**
 * A chave secreta. `rk_` (restricted) é o recomendado pela Stripe sobre `sk_`: esta
 * integração só precisa de Checkout, Billing Portal, Prices e Subscriptions, e uma
 * chave que não pode fazer transferência nem ler Connect é uma chave que não serve para
 * esvaziar a conta se vazar.
 */
export const SEGREDO = limpa(process.env.STRIPE_SECRET_KEY);

/**
 * O segredo do endpoint de webhook (`whsec_…`), que é OUTRO segredo — vem do
 * cadastro do endpoint, não da chave de API.
 *
 * ⚠️ Cada endpoint tem o seu. O da CLI (`stripe listen`) não é o da Vercel, e trocá-los
 * dá `signature verification failed` num lugar e silêncio no outro.
 */
export const SEGREDO_WEBHOOK = limpa(process.env.STRIPE_WEBHOOK_SECRET);

export const estaConfigurado = Boolean(SEGREDO);

export function faltando(): string[] {
  return SEGREDO ? [] : ["STRIPE_SECRET_KEY"];
}

export function faltandoWebhook(): string[] {
  const faltam = faltando();
  if (!SEGREDO_WEBHOOK) faltam.push("STRIPE_WEBHOOK_SECRET");
  return faltam;
}

/**
 * Plano → `lookup_key` do preço. É o ÚNICO acoplamento entre o nosso vocabulário e o
 * catálogo da Stripe, e ele é um nome legível de propósito: quem abrir o painel da
 * Stripe procurando "por que o Essencial cobrou errado" acha a linha pelo nome.
 *
 * ⚠️ Mudar uma string daqui exige criar o preço com a chave nova do lado de lá ANTES do
 * deploy. Enquanto ela não existir, `abrirCheckout` lança `NaoEncontrado` — que é o
 * comportamento certo, e é testado.
 */
export const LOOKUP: Record<ChaveDePlano, string> = {
  essencial: "maisa_essencial_mensal_brl",
  profissional: "maisa_profissional_mensal_brl",
  escala: "maisa_escala_mensal_brl",
};

/* ─────────────────────────────────────────────────────────────────────────────
 * ASSINATURA — o que a MAISA cobra, em linguagem de domínio.
 *
 * ⚠️ PREÇO NÃO MORA AQUI, E ISSO É A DECISÃO CENTRAL DESTE ARQUIVO.
 *
 * O produto já tem uma fonte única de preço — `app/(marketing)/_lib/planos.ts` — e ela
 * nasceu exatamente para matar seis preços digitados em quatro arquivos. Copiar `R$ 197`
 * para cá seria reabrir o buraco pelo lado do núcleo, com o agravante de que o valor
 * REALMENTE cobrado passa a ser um terceiro número: o do objeto Price no provedor.
 *
 * Então a divisão é:
 *   · a CHAVE do plano ....... aqui (é conceito de domínio: existe sem provedor nenhum)
 *   · o preço EXIBIDO ........ `_lib/planos.ts` (é copy de landing page)
 *   · o preço COBRADO ........ o provedor, e o webhook grava o que ele disser
 *
 * O núcleo nunca afirma quanto custa. Ele registra quanto foi cobrado.
 *
 * O núcleo também não importa `_lib/planos.ts`: aquilo vive em `app/`, e a seta
 * apontaria para fora do hexágono. A ponte é `assinatura.test.ts`, que lê os dois e
 * reprova se as chaves divergirem — garantia por teste, não por boa vontade.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Os três planos. Mesma chave usada em `_lib/planos.ts` e no `metadata.plano` do provedor. */
export type ChaveDePlano = "essencial" | "profissional" | "escala";

export const PLANOS: readonly ChaveDePlano[] = ["essencial", "profissional", "escala"] as const;

export function ehChaveDePlano(x: unknown): x is ChaveDePlano {
  return typeof x === "string" && (PLANOS as readonly string[]).includes(x);
}

/**
 * Os quatro estados que a tela sabe desenhar. São os mesmos do `check` da coluna
 * `assinaturas.status` (`002_multitenant.sql`) — um quinto valor aqui viraria erro de
 * constraint no INSERT, horas depois, dentro do webhook, onde ninguém está olhando.
 */
export type StatusAssinatura = "trial" | "ativa" | "inadimplente" | "cancelada";

/** O que a MAISA sabe sobre a cobrança de um inquilino. Espelha a tabela `assinaturas`. */
export type Assinatura = {
  plano: string;
  /** Em reais, como o provedor cobrou. `null` enquanto ninguém pagou nada. */
  preco: number | null;
  moeda: string;
  status: StatusAssinatura;
  /** Ids do provedor. Guardados para reconciliar, nunca para exibir. */
  clienteId: string | null;
  assinaturaId: string | null;
  /** Vira o "próxima cobrança" da tela. ISO `YYYY-MM-DD`. */
  periodoFim: string | null;
  trialFim: string | null;
  /** O "Cartão final 4417". Nunca o número. */
  cartaoMarca: string | null;
  cartaoFinal4: string | null;
};

/**
 * Status do provedor → o nosso.
 *
 * ⚠️ O DESCONHECIDO CAI EM `inadimplente`, NÃO EM `ativa`. É a única escolha segura:
 * a Stripe acrescenta status novo sem avisar (`paused` apareceu assim), e um `default`
 * permissivo entregaria o produto de graça a um estado que ninguém leu ainda. Errar para
 * o lado restritivo gera um chamado de suporte; errar para o outro gera um vazamento de
 * receita que só aparece no fechamento do mês.
 *
 * `incomplete` é o caso brasileiro que mais vai acontecer: boleto emitido e ainda não
 * pago. Não é inadimplência moral, mas é ausência de pagamento — e para efeito de acesso
 * as duas coisas são a mesma.
 */
export function statusDoProvedor(bruto: string): StatusAssinatura {
  switch (bruto) {
    case "trialing":
      return "trial";
    case "active":
      return "ativa";
    case "canceled":
    case "incomplete_expired":
      return "cancelada";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
      return "inadimplente";
    default:
      return "inadimplente";
  }
}

/** Esta assinatura dá direito a usar o produto hoje? */
export function liberada(a: Pick<Assinatura, "status">): boolean {
  return a.status === "trial" || a.status === "ativa";
}

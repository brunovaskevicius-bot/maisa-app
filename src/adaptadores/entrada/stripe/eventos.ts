/* ─────────────────────────────────────────────────────────────────────────────
 * O WEBHOOK DA STRIPE, TRADUZIDO. ⚠️ SÓ SERVIDOR.
 *
 * Adaptador de ENTRADA: o mundo externo fala, isto vira vocabulário da MAISA. Irmão de
 * `entrada/whatsapp/contexto.ts` — mesmo problema (um POST sem cookie), mesma resposta
 * (o inquilino nasce de dado durável nosso, nunca de campo que o remetente escolhe).
 *
 * ── AS TRÊS DECISÕES QUE ESTE ARQUIVO CARREGA ──
 *
 * 1. **NUNCA CONFIAMOS NO CORPO DO EVENTO. RELEMOS A ASSINATURA NA API.**
 *
 *    A tentação é mapear `evento.data.object` direto — está tudo lá. Duas coisas
 *    quebram isso, e as duas acontecem em produção:
 *
 *    · **Entrega fora de ordem.** A Stripe não garante ordem. `updated` (plano novo) e
 *      `updated` (cartão trocado) podem chegar trocados, e o último a gravar vence —
 *      gravando um estado que já não é verdade. Reler significa que QUALQUER ordem de
 *      chegada converge para o estado atual.
 *    · **Reentrega.** Sem 200 em tempo hábil ela reenvia o mesmo evento. Reler torna o
 *      processamento idempotente de graça, sem tabela de eventos vistos.
 *
 *    O custo é uma chamada de API por evento. É o preço de não ter uma classe inteira
 *    de bug que só aparece sob carga e não reproduz.
 *
 * 2. **⚠️ `current_period_end` ESTÁ NO ITEM, NÃO NA ASSINATURA.** Medido na API
 *    `2026-08-26.dahlia` em 21/09/2026: o objeto Subscription não tem mais esse campo no
 *    topo — só `cancel_at_period_end`. Quem escreve `sub.current_period_end` de memória
 *    recebe `undefined`, grava `periodo_fim = null`, e a tela mostra "próxima cobrança:
 *    —" para uma assinatura perfeitamente ativa. Sem erro em lugar nenhum.
 *
 * 3. **O INQUILINO VEM DO METADADO QUE NÓS ESCREVEMOS.** `metadata.tenant_id` foi posto
 *    por `cobranca-stripe.ts` na criação. Ninguém de fora escreve ali — e o corpo inteiro
 *    só chega até aqui depois de `verificar()` conferir a assinatura HMAC. Quando o
 *    metadado falta (assinatura criada à mão no painel da Stripe, que vai acontecer),
 *    caímos no reverso por `stripe_customer_id`, que é dado nosso na nossa tabela.
 * ────────────────────────────────────────────────────────────────────────────── */

import type Stripe from "stripe";
import { statusDoProvedor } from "@/nucleo/dominio/assinatura";
import type { Assinatura } from "@/nucleo/dominio/assinatura";
import { NaoConfigurado } from "@/nucleo/dominio/erros";
import { stripe } from "@/adaptadores/saida/stripe/cliente";
import { SEGREDO_WEBHOOK, faltandoWebhook } from "@/adaptadores/saida/stripe/config";

/**
 * ⚠️ IMPORTA UM ADAPTADOR IRMÃO (`saida/stripe/`), e isso é exceção consciente à regra
 * "adaptador não importa adaptador" — a mesma exceção que `entrada/whatsapp` já faz com
 * `saida/evolution`. O motivo é que os dois lados falam com O MESMO PROVEDOR: duplicar o
 * cliente HTTP e o segredo aqui criaria duas configurações que divergem, e o sintoma
 * seria o webhook autenticando contra uma conta e o checkout cobrando de outra.
 */

/** Os eventos que mexem no estado da assinatura. O resto responde 200 e é ignorado. */
const RELEVANTES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  /* A fatura não muda `Assinatura` por si só — mas ela é o gatilho mais rápido para o
   * status virar `past_due`, e reler a assinatura no momento da falha adianta a tela em
   * até algumas horas em relação a esperar o `subscription.updated`. */
  "invoice.payment_failed",
  "invoice.paid",
]);

export function ehRelevante(tipo: string): boolean {
  return RELEVANTES.has(tipo);
}

/**
 * Confere a assinatura criptográfica do corpo CRU.
 *
 * ⚠️ O CORPO TEM QUE SER O TEXTO EXATO QUE CHEGOU. `await req.json()` seguido de
 * `JSON.stringify` reordena chaves e muda espaçamento: o HMAC deixa de bater e o
 * sintoma é 100% dos webhooks falhando com "No signatures found matching the expected
 * signature" — que lê como segredo errado e não é.
 *
 * Falha FECHADA: sem `STRIPE_WEBHOOK_SECRET` no ambiente, lança. Um webhook de pagamento
 * que aceita qualquer POST deixa qualquer pessoa se dar plano ilimitado escrevendo um
 * JSON — e como a escrita roda com service_role, a RLS não salva ninguém.
 */
export async function verificar(cru: string, assinatura: string | null): Promise<Stripe.Event> {
  if (!SEGREDO_WEBHOOK) throw new NaoConfigurado(faltandoWebhook());
  if (!assinatura) throw new Error("requisição sem cabeçalho stripe-signature");
  /* `constructEventAsync` e não `constructEvent`: o runtime da Vercel usa WebCrypto, que
   * é assíncrono. A versão síncrona exige o `crypto` do Node e falha no Edge — e esta
   * rota pode acabar lá sem ninguém reparar. */
  return stripe().webhooks.constructEventAsync(cru, assinatura, SEGREDO_WEBHOOK);
}

/** O id da assinatura envolvida no evento, qualquer que seja o tipo. `null` = ignorar. */
export function assinaturaDoEvento(e: Stripe.Event): string | null {
  const o = e.data.object as unknown as Record<string, unknown>;

  if (e.type === "checkout.session.completed") {
    const s = o as unknown as Stripe.Checkout.Session;
    /* `subscription` vem string quando não expandida — que é o caso do webhook. */
    return typeof s.subscription === "string" ? s.subscription : (s.subscription?.id ?? null);
  }
  if (e.type.startsWith("customer.subscription.")) {
    return (o.id as string) ?? null;
  }
  if (e.type.startsWith("invoice.")) {
    /* ⚠️ Na dahlia a fatura aponta para a assinatura dentro de `parent`, e não mais num
     * campo `subscription` de topo. Ler o campo antigo devolve `undefined` e o evento é
     * descartado em silêncio — inadimplência que nunca aparece na tela. */
    const inv = o as unknown as Stripe.Invoice;
    const pai = (inv as unknown as { parent?: { subscription_details?: { subscription?: string | { id: string } } } }).parent;
    const s = pai?.subscription_details?.subscription;
    return typeof s === "string" ? s : (s?.id ?? null);
  }
  return null;
}

/** Lê a assinatura na API e traduz para o nosso vocabulário. */
export async function lerAssinaturaNaStripe(
  id: string,
): Promise<{ assinatura: Assinatura; tenantId: string | null }> {
  const sub = await stripe().subscriptions.retrieve(id, {
    /* O cartão precisa vir junto: a tela mostra "Cartão final 4417", e um segundo
     * round-trip por evento dobraria a latência do webhook — que tem teto de 10s. */
    expand: ["default_payment_method"],
  });

  const item = sub.items.data[0];
  const preco = item?.price;

  const pm = sub.default_payment_method;
  const cartao = pm && typeof pm !== "string" ? pm.card : undefined;

  const assinatura: Assinatura = {
    plano: nomeDoPlano(sub, preco),
    /* Centavos → reais. `unit_amount` é inteiro em centavos; dividir com `/ 100` em
     * ponto flutuante é seguro nesta faixa (R$ 127,00 → 12700 → 127). */
    preco: typeof preco?.unit_amount === "number" ? preco.unit_amount / 100 : null,
    moeda: (preco?.currency ?? "brl").toUpperCase(),
    status: statusDoProvedor(sub.status),
    clienteId: typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
    assinaturaId: sub.id,
    /* ⚠️ NO ITEM. Ver o cabeçalho deste arquivo. */
    periodoFim: data(item?.current_period_end),
    trialFim: data(sub.trial_end),
    cartaoMarca: cartao?.brand ?? null,
    cartaoFinal4: cartao?.last4 ?? null,
  };

  return { assinatura, tenantId: (sub.metadata?.tenant_id || null) as string | null };
}

/**
 * O nome que a tela mostra.
 *
 * Preferimos o `metadata.plano` que nós escrevemos, com o nome do produto como reserva:
 * uma assinatura criada à mão no painel da Stripe não tem o metadado, e "—" na tela de
 * faturamento parece defeito do app quando é só um caminho de criação diferente.
 */
function nomeDoPlano(sub: Stripe.Subscription, preco?: Stripe.Price): string {
  const chave = sub.metadata?.plano;
  if (chave) return chave.charAt(0).toUpperCase() + chave.slice(1);
  const produto = preco?.product;
  if (produto && typeof produto !== "string" && !("deleted" in produto)) return produto.name;
  return "Personalizado";
}

/** Unix (segundos) → `YYYY-MM-DD`, que é o tipo da coluna. `null` atravessa. */
function data(unix: number | null | undefined): string | null {
  if (typeof unix !== "number") return null;
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

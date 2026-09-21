/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — onde a assinatura fica guardada.
 *
 * Separada de `Cobranca` de propósito: ler "qual o plano deste negócio" não pode
 * depender de o provedor de pagamento estar de pé. A tela de faturamento abre todo dia;
 * a Stripe é consultada só quando alguém clica em assinar.
 *
 * ⚠️ `gravar` É A ÚNICA ESCRITA DO PRODUTO NESTA TABELA, e ela roda com service_role.
 * A RLS de `assinaturas` (`003_rls.sql`, §3.4) não tem política de INSERT nem de UPDATE
 * para usuário logado, e o comentário de lá diz por quê: "dono nenhum se dá desconto".
 * Uma segunda escrita em qualquer outro lugar do código desfaz essa garantia — e o
 * sintoma seria plano ilimitado num `PATCH`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { Assinatura } from "../../dominio/assinatura";
import type { ContextoTenant } from "../../dominio/tenant";

export interface RepositorioAssinaturas {
  ler(t: ContextoTenant): Promise<Assinatura | null>;

  /**
   * Grava o estado que o provedor afirmou.
   *
   * ⚠️ SUBSTITUI, não faz merge. O webhook sempre recebe o objeto inteiro do provedor,
   * então um merge só serviria para preservar um campo velho que o provedor já mudou —
   * tipo um `cartao_final4` de um cartão que a pessoa trocou.
   *
   * Idempotente por construção: a tabela tem `tenant_id` como chave primária, e a Stripe
   * reentrega o mesmo evento quando o 200 demora. Duas entregas do mesmo evento têm que
   * dar no mesmo estado, e não em duas linhas.
   */
  gravar(t: ContextoTenant, a: Assinatura): Promise<void>;

  /**
   * De quem é este cliente do provedor. Usado só pelo webhook, para os eventos que
   * chegam SEM o nosso carimbo — `invoice.payment_failed`, por exemplo, nasce da fatura
   * e não da sessão de checkout, então não carrega `client_reference_id`.
   *
   * Devolve `null` quando ninguém reconhece o cliente, e o webhook responde 200 e ignora.
   * Pagamento de gente que não é nossa acontece de verdade em conta compartilhada.
   */
  tenantDoCliente(clienteId: string): Promise<string | null>;

  faltando(): string[];
}

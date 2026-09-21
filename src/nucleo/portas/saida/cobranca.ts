/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — abrir a cobrança.
 *
 * O que o app precisa de um provedor de pagamento, e nada além disso: uma URL para
 * onde mandar a pessoa. Quem cobra, em que bandeira, com que antifraude e em quantas
 * parcelas é problema do adaptador.
 *
 * ── POR QUE A PORTA DEVOLVE URL, E NÃO UM "ASSINAR()" ──
 *
 * Porque o app NÃO toca em cartão, e a porta é o lugar onde essa decisão fica escrita.
 * Número de cartão que passa pelo nosso servidor arrasta PCI-DSS SAQ-D para dentro de um
 * produto de uma pessoa. A página hospedada do provedor mantém o escopo em SAQ-A, e a
 * diferença entre os dois é da ordem de um projeto inteiro.
 *
 * Consequência que o desenho aceita de propósito: **o retorno é assíncrono**. Quando a
 * pessoa volta da URL, ainda não sabemos se pagou. Quem sabe é o webhook
 * (`adaptadores/entrada/stripe/`), e é por isso que ele não é opcional. Tela de sucesso
 * não é confirmação de pagamento — é confirmação de que o navegador voltou.
 *
 * ── O `voltarPara` É ARGUMENTO, E NÃO CONFIG ──
 *
 * Porque quem clica em "assinar" na tela de faturamento tem que voltar para a tela de
 * faturamento, e quem clica na landing page volta para o cadastro. Uma URL de retorno
 * global mandaria metade das pessoas para o lugar errado, e o sintoma seria uma pessoa
 * que pagou achando que não pagou.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ChaveDePlano } from "../../dominio/assinatura";
import type { ContextoTenant } from "../../dominio/tenant";

export type PedidoDeCheckout = {
  plano: ChaveDePlano;
  /**
   * Para o provedor já chegar com o campo preenchido. Opcional porque a pessoa pode
   * pagar com um e-mail diferente do login — e forçar o do login criaria dois cadastros
   * no provedor para a mesma pessoa no dia em que ela usasse o e-mail da empresa.
   */
  email?: string;
  /** Absoluta. Para onde o navegador volta em caso de sucesso. */
  voltarPara: string;
  /** Absoluta. Para onde volta quem desistiu. */
  cancelarPara: string;
  /**
   * O cliente que este inquilino JÁ tem no provedor, quando tem.
   *
   * ⚠️ Sem isto, cada clique em "assinar" cria um cliente novo lá dentro — e a pessoa
   * que desistiu na primeira tentativa e voltou vira duas fichas, capazes de carregar
   * duas assinaturas ativas do mesmo negócio. O caso de uso lê de `Assinatura.clienteId`
   * e repassa; o adaptador nunca vai buscar sozinho.
   */
  clienteId?: string | null;
};

/** Só uma URL. Se um dia precisar de mais, o provedor está vazando para dentro. */
export type CheckoutAberto = { url: string };

export interface Cobranca {
  /**
   * Abre o checkout para este inquilino.
   *
   * ⚠️ A IMPLEMENTAÇÃO TEM QUE CARIMBAR O `tenantId` NA SESSÃO DO PROVEDOR. É o que o
   * webhook lê depois para saber de quem é o pagamento. Sem esse carimbo, a única pista
   * é o e-mail — e e-mail digitado no checkout casa com o do cadastro com a frequência
   * de quem digita e-mail em formulário.
   */
  abrirCheckout(t: ContextoTenant, p: PedidoDeCheckout): Promise<CheckoutAberto>;

  /**
   * O portal onde a pessoa troca o cartão, baixa a fatura e cancela sozinha.
   *
   * Existe na porta, e não como "depois a gente vê", porque cancelamento sem autonomia
   * volta como chamado no WhatsApp do dono — e é a promessa que a landing page já faz
   * por escrito ("cancele quando quiser").
   */
  abrirPortal(
    t: ContextoTenant,
    /** `clienteId` é obrigatório aqui: não existe portal de quem nunca pagou. */
    p: { voltarPara: string; clienteId: string },
  ): Promise<CheckoutAberto>;

  /** O que falta no ambiente para esta porta funcionar. Vazio = pronta. */
  faltando(): string[];
}

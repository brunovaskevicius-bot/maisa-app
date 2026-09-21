/* ─────────────────────────────────────────────────────────────────────────────
 * Só as funções PURAS do tradutor. `verificar` e `lerAssinaturaNaStripe` falam com a
 * rede, e teste que depende de rede fica vermelho por motivo errado até alguém desligá-lo.
 *
 * O que sobra é justamente o que mais quebrou: DE ONDE se lê o id da assinatura em cada
 * tipo de evento. Os dois formatos abaixo foram copiados de respostas reais da API
 * `2026-08-26.dahlia` em 21/09/2026 — não escritos de memória.
 * ────────────────────────────────────────────────────────────────────────────── */

import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { assinaturaDoEvento, ehRelevante } from "./eventos";

const evento = (type: string, object: unknown) =>
  ({ type, data: { object } } as unknown as Stripe.Event);

describe("ehRelevante", () => {
  it("aceita os eventos que mexem no estado da assinatura", () => {
    expect(ehRelevante("checkout.session.completed")).toBe(true);
    expect(ehRelevante("customer.subscription.updated")).toBe(true);
    expect(ehRelevante("invoice.payment_failed")).toBe(true);
  });

  /* A conta recebe dezenas de tipos. Ignorar explicitamente é o contrato certo — e é o
   * que impede o webhook de reler a API por causa de um `charge.succeeded`. */
  it("ignora o resto", () => {
    expect(ehRelevante("charge.succeeded")).toBe(false);
    expect(ehRelevante("payment_intent.created")).toBe(false);
  });
});

describe("assinaturaDoEvento", () => {
  it("checkout: `subscription` vem como string quando não expandida — que é o caso", () => {
    expect(assinaturaDoEvento(evento("checkout.session.completed", {
      id: "cs_test_1", subscription: "sub_123",
    }))).toBe("sub_123");
  });

  it("checkout sem assinatura (pagamento avulso) devolve null", () => {
    expect(assinaturaDoEvento(evento("checkout.session.completed", {
      id: "cs_test_1", subscription: null,
    }))).toBeNull();
  });

  it("customer.subscription.*: o próprio objeto é a assinatura", () => {
    for (const t of ["created", "updated", "deleted"]) {
      expect(assinaturaDoEvento(evento(`customer.subscription.${t}`, { id: "sub_abc" })))
        .toBe("sub_abc");
    }
  });

  /* ★ A ARMADILHA MEDIDA. Na dahlia a fatura aponta para a assinatura dentro de
   * `parent.subscription_details`, e não mais num campo `subscription` de topo. Ler o
   * campo antigo devolve `undefined` e o evento é descartado em silêncio — ou seja,
   * inadimplência que nunca chega à tela. */
  it("invoice: lê de `parent.subscription_details.subscription`, não do campo antigo", () => {
    expect(assinaturaDoEvento(evento("invoice.payment_failed", {
      id: "in_1",
      parent: { subscription_details: { subscription: "sub_da_fatura" } },
    }))).toBe("sub_da_fatura");
  });

  it("invoice sem assinatura (cobrança avulsa) devolve null em vez de explodir", () => {
    expect(assinaturaDoEvento(evento("invoice.paid", { id: "in_2", parent: null }))).toBeNull();
  });
});

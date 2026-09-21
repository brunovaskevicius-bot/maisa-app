/* ─────────────────────────────────────────────────────────────────────────────
 * O que estes testes protegem, em ordem de quanto custa errar:
 *
 *   1. status desconhecido não libera o produto  → vazamento de receita silencioso
 *   2. as chaves de plano batem entre núcleo, landing page e catálogo da Stripe
 *      → botão que cobra o preço de outro plano, ou que não cobra nada
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PLANOS, diasDoCiclo, ehChaveDePlano, liberada, statusDaAbacatePay, statusDaStripe,
} from "./assinatura";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

describe("statusDaStripe", () => {
  it("traduz os status que a Stripe manda hoje", () => {
    expect(statusDaStripe("trialing")).toBe("trial");
    expect(statusDaStripe("active")).toBe("ativa");
    expect(statusDaStripe("past_due")).toBe("inadimplente");
    expect(statusDaStripe("unpaid")).toBe("inadimplente");
    expect(statusDaStripe("canceled")).toBe("cancelada");
    expect(statusDaStripe("incomplete_expired")).toBe("cancelada");
  });

  /* ★ O TESTE QUE MAIS IMPORTA DESTE ARQUIVO. A Stripe acrescenta status sem avisar —
   * `paused` apareceu assim. Um `default` permissivo entregaria o produto de graça a um
   * estado que ninguém leu ainda, e o buraco só apareceria no fechamento do mês. */
  it("status desconhecido NÃO libera o produto", () => {
    for (const bruto of ["paused", "status_que_ainda_nao_existe", "", "ACTIVE"]) {
      expect(statusDaStripe(bruto)).toBe("inadimplente");
      expect(liberada({ status: statusDaStripe(bruto) })).toBe(false);
    }
  });

  it("boleto emitido e não pago não libera — `incomplete` é ausência de pagamento", () => {
    expect(liberada({ status: statusDaStripe("incomplete") })).toBe(false);
  });

  it("trial e ativa liberam", () => {
    expect(liberada({ status: "trial" })).toBe(true);
    expect(liberada({ status: "ativa" })).toBe(true);
  });
});

describe("statusDaAbacatePay", () => {
  /* ★ O TESTE QUE MAIS IMPORTA DESTE BLOCO, e o motivo de a função receber o evento.
   * `subscription.payment_failed` chega com `status: "ACTIVE"` — está assim no payload
   * documentado. Quem traduzir só o campo libera o produto para quem parou de pagar. */
  it("cobrança que falhou não libera, mesmo com o status vindo ACTIVE", () => {
    const s = statusDaAbacatePay({ status: "ACTIVE", evento: "subscription.payment_failed" });

    expect(s).toBe("inadimplente");
    expect(liberada({ status: s })).toBe(false);
  });

  it("traduz os dois estados de vida que a AbacatePay tem", () => {
    expect(statusDaAbacatePay({ status: "ACTIVE", evento: "subscription.completed" })).toBe("ativa");
    expect(statusDaAbacatePay({ status: "ACTIVE", evento: "subscription.renewed" })).toBe("ativa");
    expect(statusDaAbacatePay({ status: "CANCELLED", evento: "subscription.cancelled" }))
      .toBe("cancelada");
  });

  it("trial é derivado do `trialEndsAt`, porque não existe status de trial lá", () => {
    expect(statusDaAbacatePay({
      status: "ACTIVE", evento: "subscription.trial_started", emTrial: true,
    })).toBe("trial");
  });

  /* Mesma regra da Stripe, pelo mesmo motivo. `PENDING`/`EXPIRED`/`REFUNDED` são do
   * vocabulário de CHECKOUT deles e podem vazar para o objeto de assinatura numa mudança
   * de payload — e os três significam "não há pagamento vigente". */
  it("status desconhecido NÃO libera o produto", () => {
    for (const status of ["PENDING", "EXPIRED", "REFUNDED", "active", "", "qualquer_coisa"]) {
      const s = statusDaAbacatePay({ status, evento: "subscription.renewed" });
      expect(s).toBe("inadimplente");
      expect(liberada({ status: s })).toBe(false);
    }
  });
});

describe("diasDoCiclo", () => {
  it("cobre os cinco ciclos que a AbacatePay aceita", () => {
    expect(diasDoCiclo("WEEKLY")).toBe(7);
    expect(diasDoCiclo("MONTHLY")).toBe(30);
    expect(diasDoCiclo("QUARTERLY")).toBe(90);
    expect(diasDoCiclo("SEMIANNUALLY")).toBe(182);
    expect(diasDoCiclo("ANNUALLY")).toBe(365);
  });

  /* `null` e não 30: sem ciclo conhecido a tela mostra "—", que é verdade. Um default
   * inventaria data de cobrança para um ciclo que ninguém leu ainda. */
  it("ciclo desconhecido não inventa data", () => {
    expect(diasDoCiclo("DAILY")).toBeNull();
    expect(diasDoCiclo("")).toBeNull();
  });
});

describe("as chaves de plano", () => {
  it("`ehChaveDePlano` recusa o que não está na lista", () => {
    expect(ehChaveDePlano("profissional")).toBe(true);
    expect(ehChaveDePlano("Profissional")).toBe(false);
    expect(ehChaveDePlano("premium")).toBe(false);
    expect(ehChaveDePlano(undefined)).toBe(false);
  });

  /* ── A PONTE COM A LANDING PAGE ──
   * `dominio/assinatura.ts` não pode importar `app/(marketing)/_lib/planos.ts` — a seta
   * apontaria para fora do hexágono. Então a garantia é este teste, que lê o arquivo
   * como texto. Divergir aqui significa um botão de plano que o núcleo recusa: a pessoa
   * clica em "Assinar" e recebe `Plano desconhecido`. */
  it("são exatamente as mesmas de `_lib/planos.ts`", () => {
    const fonte = readFileSync(join(SRC, "app", "(marketing)", "_lib", "planos.ts"), "utf8");
    const declarado = fonte.match(/export type ChavePlano\s*=\s*([^;]+);/)?.[1] ?? "";
    const daLp = [...declarado.matchAll(/"([a-z]+)"/g)].map((m) => m[1]).sort();

    expect(daLp).toEqual([...PLANOS].sort());
  });
});

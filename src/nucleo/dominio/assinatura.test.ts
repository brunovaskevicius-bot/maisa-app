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

import { PLANOS, ehChaveDePlano, liberada, statusDoProvedor } from "./assinatura";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

describe("statusDoProvedor", () => {
  it("traduz os status que a Stripe manda hoje", () => {
    expect(statusDoProvedor("trialing")).toBe("trial");
    expect(statusDoProvedor("active")).toBe("ativa");
    expect(statusDoProvedor("past_due")).toBe("inadimplente");
    expect(statusDoProvedor("unpaid")).toBe("inadimplente");
    expect(statusDoProvedor("canceled")).toBe("cancelada");
    expect(statusDoProvedor("incomplete_expired")).toBe("cancelada");
  });

  /* ★ O TESTE QUE MAIS IMPORTA DESTE ARQUIVO. A Stripe acrescenta status sem avisar —
   * `paused` apareceu assim. Um `default` permissivo entregaria o produto de graça a um
   * estado que ninguém leu ainda, e o buraco só apareceria no fechamento do mês. */
  it("status desconhecido NÃO libera o produto", () => {
    for (const bruto of ["paused", "status_que_ainda_nao_existe", "", "ACTIVE"]) {
      expect(statusDoProvedor(bruto)).toBe("inadimplente");
      expect(liberada({ status: statusDoProvedor(bruto) })).toBe(false);
    }
  });

  it("boleto emitido e não pago não libera — `incomplete` é ausência de pagamento", () => {
    expect(liberada({ status: statusDoProvedor("incomplete") })).toBe(false);
  });

  it("trial e ativa liberam", () => {
    expect(liberada({ status: "trial" })).toBe(true);
    expect(liberada({ status: "ativa" })).toBe(true);
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

/* O elo entre o vocabulário do núcleo e o catálogo da conta da Stripe.
 *
 * Mora AQUI e não em `dominio/assinatura.test.ts` porque o núcleo não pode importar
 * adaptador — nem em teste. O guarda pegou a primeira tentativa, que era exatamente essa. */

import { describe, expect, it } from "vitest";
import { PLANOS } from "@/nucleo/dominio/assinatura";
import { LOOKUP } from "./config";

describe("o catálogo", () => {
  /* Um plano sem `lookup_key` não é erro de compilação — o `Record` exige as três chaves,
   * mas uma string vazia satisfaz o tipo. Em runtime vira `NaoEncontrado` no clique em
   * "assinar", que é o pior momento possível para descobrir. */
  it("todo plano tem uma lookup_key, não vazia e distinta das outras", () => {
    const chaves = PLANOS.map((p) => LOOKUP[p]);
    expect(chaves.filter(Boolean)).toHaveLength(PLANOS.length);
    expect(new Set(chaves).size).toBe(PLANOS.length);
  });

  /* O nome vai aparecer no painel da Stripe de quem estiver investigando uma cobrança
   * errada, e é a única pista que liga um `price_…` opaco ao plano. Prefixo e moeda
   * dentro do nome porque a mesma conta pode um dia vender outro produto. */
  it("a lookup_key diz produto, plano e moeda", () => {
    for (const plano of PLANOS) {
      expect(LOOKUP[plano]).toMatch(new RegExp(`^maisa_${plano}_.*_brl$`));
    }
  });
});

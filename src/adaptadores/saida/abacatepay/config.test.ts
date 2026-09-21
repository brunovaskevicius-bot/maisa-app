/* O elo entre o vocabulário do núcleo, o catálogo da conta da AbacatePay e a tabela de
 * preço da landing page.
 *
 * Mora AQUI e não em `dominio/assinatura.test.ts` porque o núcleo não pode importar
 * adaptador — nem em teste. É a mesma razão escrita em `saida/stripe/config.test.ts`. */

import { describe, expect, it } from "vitest";
import { PLANOS } from "@/nucleo/dominio/assinatura";
import { PLANOS as DA_LP } from "@/app/(marketing)/_lib/planos";
import { CATALOGO, METODOS } from "./config";

describe("o catálogo", () => {
  /* Um plano sem `externalId` não é erro de compilação — o `Record` exige as três chaves,
   * mas string vazia satisfaz o tipo. Em runtime vira `NaoEncontrado` no clique em
   * "assinar", que é o pior momento possível para descobrir. */
  it("todo plano tem um externalId, não vazio e distinto dos outros", () => {
    const ids = PLANOS.map((p) => CATALOGO[p]);
    expect(ids.filter(Boolean)).toHaveLength(PLANOS.length);
    expect(new Set(ids).size).toBe(PLANOS.length);
  });

  /* O nome aparece no painel da AbacatePay de quem estiver investigando uma cobrança
   * errada, e é a única pista que liga um `prod_…` opaco ao plano. Prefixo e ciclo dentro
   * do nome porque a mesma conta pode um dia vender outro produto — ou o mesmo plano em
   * ciclo anual. */
  it("o externalId diz produto, plano e ciclo", () => {
    for (const plano of PLANOS) {
      expect(CATALOGO[plano]).toMatch(new RegExp(`^maisa-${plano}-mensal$`));
    }
  });
});

describe("os métodos de pagamento do checkout", () => {
  /* ★ O TESTE QUE PROTEGE A LOJA DE FECHAR.
   *
   * Pix em assinatura depende de a conta ter PIX Automático habilitado, e a documentação
   * deles se contradiz sobre isso (changelog diz que dá, OpenAPI diz que só CARD). Mandar
   * só `["PIX"]` numa conta sem o recurso faz `/subscriptions/create` recusar: o botão
   * "assinar" devolve erro e NINGUÉM COMPRA.
   *
   * Os dois juntos degradam para cartão em vez de quebrar. O dia em que alguém "limpar"
   * isto para só Pix, este teste reprova antes do deploy. */
  it("oferece Pix E cartão — nunca só Pix", () => {
    expect(METODOS).toContain("PIX");
    expect(METODOS).toContain("CARD");
  });

  /* Pix primeiro é o que o cliente brasileiro procura, e é onde a taxa é centavos em vez
   * de percentual. A ordem chega no checkout deles. */
  it("Pix vem primeiro", () => {
    expect(METODOS[0]).toBe("PIX");
  });
});

describe("a ponte com o preço da landing page", () => {
  /* ── POR QUE ESTE TESTE EXISTE ──
   *
   * O webhook da AbacatePay não traz o nome do plano — só `amount` em centavos. Então
   * `api/abacatepay/webhook/route.ts` traduz preço → nome lendo `_lib/planos.ts`, e a
   * tradução só funciona se cada preço for ÚNICO.
   *
   * Dois planos com o mesmo valor fariam a tela mostrar o plano errado para metade dos
   * clientes — sem erro em lugar nenhum, porque `find` devolve o primeiro e segue. Já
   * houve cinco valores distintos em seis preços neste projeto (ver o cabeçalho de
   * `_lib/planos.ts`), então a colisão não é hipótese. */
  it("nenhum plano tem o mesmo preço de outro", () => {
    const valores = DA_LP.map((p) => p.preco);
    expect(new Set(valores).size).toBe(DA_LP.length);
  });

  /* O `planoDoValor` da rota faz `Number(preco.replace(/[^\d]/g, ""))`. Se um preço ganhar
   * centavos ("R$ 127,50"), esse `replace` produz 12750 e a comparação com 127.5 falha —
   * silenciosamente, e o plano vira "Assinatura" na tela. Enquanto os preços forem
   * inteiros, a rota está correta; quando deixarem de ser, este teste avisa. */
  it("os preços são inteiros em reais — a tradução da rota depende disso", () => {
    for (const p of DA_LP) {
      expect(p.preco).toMatch(/^R\$ \d+$/);
    }
  });

  /* As chaves do catálogo cobrem exatamente os planos que a LP vende. Divergir aqui
   * significa um botão de plano que o adaptador não sabe cobrar. */
  it("o catálogo cobre os mesmos planos da landing page", () => {
    expect(Object.keys(CATALOGO).sort()).toEqual(DA_LP.map((p) => p.chave).sort());
  });
});

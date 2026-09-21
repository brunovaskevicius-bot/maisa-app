/* O elo entre o vocabulário do núcleo, o catálogo da conta da AbacatePay e a tabela de
 * preço da landing page.
 *
 * Mora AQUI e não em `dominio/assinatura.test.ts` porque o núcleo não pode importar
 * adaptador — nem em teste. É a mesma razão escrita em `saida/stripe/config.test.ts`. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { PLANOS } from "@/nucleo/dominio/assinatura";
import { PLANOS as DA_LP } from "@/app/(marketing)/_lib/planos";
import { CATALOGO, METODOS } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

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

describe("em que mundo a chave cobra", () => {
  /* ⚠️ ESTE BLOCO NASCEU DE UM ERRO MEDIDO EM 21/09/2026. A documentação deles diz que a
   * chave "começa com `dev_`" ou "começa com `prod_`". A chave real, copiada do painel,
   * começa com **`abc_dev_`** — e o código, que acreditava na documentação, usava
   * `startsWith("prod_")`.
   *
   * O efeito seria o oposto do pretendido: chave de produção nunca casaria, e o log de um
   * dia de vendas reais traria "os pagamentos são SIMULADOS". */
  async function mundoDe(chave: string) {
    vi.resetModules();
    vi.stubEnv("ABACATEPAY_API_KEY", chave);
    return (await import("./config")).mundo;
  }

  it("reconhece o formato REAL, com prefixo de loja", async () => {
    expect(await mundoDe("abc_dev_JxxxxxxxxxxxxxxxxxxxxxxxA")).toBe("teste");
    expect(await mundoDe("abc_prod_JxxxxxxxxxxxxxxxxxxxxxA")).toBe("producao");
  });

  /* O formato que a documentação descreve também vale: se eles voltarem atrás, nada
   * quebra. Os dois convivem porque a busca é por segmento, não por início. */
  it("reconhece também o formato que a documentação descreve", async () => {
    expect(await mundoDe("dev_Jxxxxxxxxxxxxxxxxxx")).toBe("teste");
    expect(await mundoDe("prod_Jxxxxxxxxxxxxxxxxx")).toBe("producao");
  });

  /* ★ O terceiro estado. Prefixo que não casa com nada significa que ou a chave está
   * torta, ou eles mudaram o formato de novo — e nos dois casos NÃO SABEMOS se o que está
   * no ar cobra de verdade. Cair em "produção" por default esconderia o aviso; cair em
   * "teste" afirmaria que nada é cobrado. As duas mentiras custam caro, então não se
   * escolhe nenhuma. */
  it("formato que não conhecemos NÃO vira produção nem teste", async () => {
    expect(await mundoDe("sk_live_algumacoisa")).toBe("desconhecido");
    expect(await mundoDe("")).toBe("desconhecido");
  });

  /* `development`/`production` contêm as letras de `dev`/`prod` mas não o segmento — a
   * busca é por `_dev_`/`_prod_` ou início, e não por substring solta. */
  it("não confunde palavra parecida com o segmento", async () => {
    expect(await mundoDe("abc_developer_xyz")).toBe("desconhecido");
  });
});

describe("os métodos de pagamento do checkout", () => {
  async function metodosCom(valor?: string) {
    vi.resetModules();
    vi.stubEnv("ABACATEPAY_METODOS", valor ?? "");
    return (await import("./config")).METODOS;
  }

  /* ★ ESTE BLOCO SUBSTITUI UM TESTE QUE PROVAVA UMA SUPOSIÇÃO ERRADA.
   *
   * Ele dizia "oferece Pix E cartão — nunca só Pix", com a justificativa de que os dois
   * juntos degradariam para cartão se o Pix recorrente não estivesse ligado. A medição
   * contra a conta real em 21/09/2026 mostrou o contrário: `methods` é CONJUNÇÃO. Pedir
   * um método não habilitado recusa o pedido inteiro —
   *
   *   ["PIX","CARD"] → "PIX Automático is not available for this store"
   *   ["CARD"]       → "CARD is not available for this store"
   *
   * Então o padrão passou a ser Pix sozinho, que é o alvo do projeto, e a lista virou
   * variável de ambiente para o dia em que o suporte ligar o recurso não exigir deploy. */
  it("por padrão pede só Pix — a lista é exigência, não preferência", async () => {
    expect(await metodosCom()).toEqual(["PIX"]);
  });

  it("o ambiente decide, para ligar cartão não exigir deploy", async () => {
    expect(await metodosCom("PIX,CARD")).toEqual(["PIX", "CARD"]);
    expect(await metodosCom("card")).toEqual(["CARD"]);
    expect(await metodosCom(" pix , card ")).toEqual(["PIX", "CARD"]);
  });

  /* Valor torto não vira lista vazia (que a API recusa) nem método inventado: cai no
   * padrão, que é o comportamento previsível. */
  it("valor torto no ambiente cai no padrão, nunca em lista vazia", async () => {
    expect(await metodosCom("BOLETO")).toEqual(["PIX"]);
    expect(await metodosCom(",,,")).toEqual(["PIX"]);
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

/* ─────────────────────────────────────────────────────────────────────────────
 * QUEM ENTRA SEM LOGIN.
 *
 * Este arquivo existe por causa de um bug de 14/08/2026 que ficou meses no ar sem
 * ninguém ver: `/lp` não estava na lista de rotas públicas, e é de lá que sai a ÚNICA
 * página do produto com link de pagamento. Todo visitante que chegasse ao checkout era
 * redirecionado para uma tela de login de um produto que ele ainda não tinha comprado.
 *
 * Ele não quebrou nada visível para quem desenvolve — logado, tudo abre. O sintoma era
 * zero venda, que é o sintoma que ninguém consegue atribuir a uma linha de código.
 *
 * Por isso os dois lados são testados. Uma lista pública que só cresce vira um painel
 * aberto; uma que esquece uma LP vira um funil que termina em login.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { isPublic } from "./sessao";

describe("o funil é público", () => {
  /* A LP oficial de terapeutas é um bundle estático em `public/lp/` — não é rota do
   * Next, e foi por isso que ela escapou da lista quando as outras entraram. */
  it.each([
    "/lp",
    "/lp/terapeutas",
    "/lp/terapeutas/",
    "/lp/terapeutas/index.html",
    "/terapeutas",
    "/terapeutas/comecar",
    "/terapeutas/v2",
    "/barbeiros/comecar",
    "/barbeiros/v3",
  ])("%s abre sem login", (rota) => {
    expect(isPublic(rota)).toBe(true);
  });

  it("login e callback de OAuth também, senão não há como logar", () => {
    expect(isPublic("/login")).toBe(true);
    expect(isPublic("/auth/callback")).toBe(true);
  });

  /* As rotas de API fazem a própria checagem e respondem 401 em JSON. Barrá-las aqui
   * devolveria um REDIRECT para uma chamada `fetch`, e a tela receberia o HTML da página
   * de login onde esperava um objeto — o erro mais confuso que uma SPA pode dar. */
  it("as APIs passam pelo middleware e se defendem sozinhas", () => {
    expect(isPublic("/api/canal")).toBe(true);
  });
});

describe("o painel não é público", () => {
  it.each(["/", "/agenda", "/clientes", "/conversas", "/a-maisa", "/financeiro"])(
    "%s exige login",
    (rota) => {
      expect(isPublic(rota)).toBe(false);
    },
  );

  /* A comparação é por SEGMENTO (`p` ou `p + "/"`), e não por `startsWith` cru. Sem isso,
   * uma rota futura chamada `/lpainel` ou `/terapeutas-admin` entraria de graça só por
   * começar com o mesmo texto. */
  it("prefixo não vaza para rota de nome parecido", () => {
    expect(isPublic("/lpainel")).toBe(false);
    expect(isPublic("/terapeutas-admin")).toBe(false);
    expect(isPublic("/logins")).toBe(false);
  });
});

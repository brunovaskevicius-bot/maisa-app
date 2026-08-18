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
    /* `/terapeutas` não tem mais página desde 14/08/2026 — só redirect para
     * `/lp/terapeutas`. Continua tendo que ser pública: se o middleware barrar antes, o
     * visitante que chegar por um link antigo cai no login em vez de na LP, e o redirect
     * nunca chega a rodar. */
    "/terapeutas",
    "/terapeutas/comecar",
    /* As duas LPs de barbearia. `/barbeiro` (singular, a variante filmada) NÃO é coberta
     * pelo prefixo `/barbeiros` — a comparação é por segmento. Foi por isso que ela
     * precisou de entrada própria em `PUBLIC_PREFIXES`, e é por isso que está aqui. */
    "/barbeiros",
    "/barbeiro",
  ])("%s abre sem login", (rota) => {
    expect(isPublic(rota)).toBe(true);
  });

  it("login e callback de OAuth também, senão não há como logar", () => {
    expect(isPublic("/login")).toBe(true);
    expect(isPublic("/auth/callback")).toBe(true);
  });

  /* Barrar a tela de CRIAR CONTA manda para o login justamente quem ainda não tem login.
   * O laço é perfeito e é invisível para quem desenvolve, porque desenvolvedor já está
   * logado — mesma forma exata do bug do `/lp` que abriu este arquivo. */
  it("criar conta abre sem login, senão ninguém nunca terá um", () => {
    expect(isPublic("/cadastro")).toBe(true);
  });

  /* ⚠️ `/comecar` é o OPOSTO do `/cadastro`, e confundir os dois abre o produto.
   *
   * O wizard cria NEGÓCIO, não conta — e ele o cria em nome de `auth.uid()`. Público, ele
   * seria uma tela de criar inquilino aberta a anônimo: a RPC recusaria (ela levanta
   * `insufficient_privilege` sem sessão), mas a página existiria, prometeria, e falharia
   * com um erro de banco na cara de quem passasse por ali. O middleware manda para o
   * login com `?next=/comecar`, e a pessoa volta para cá depois de entrar. */
  it("o wizard NÃO é público — ele cria negócio em nome de quem está logado", () => {
    expect(isPublic("/comecar")).toBe(false);
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
    expect(isPublic("/cadastros")).toBe(false);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * AS PÁGINAS JURÍDICAS SÃO PÚBLICAS — e isso é requisito do GOOGLE, não estética.
 *
 * Para verificar um app que pede escopo sensível (`calendar.events` é), o Google abre as
 * URLs de política de privacidade e de termos. Se elas estiverem atrás do login, o revisor
 * encontra um formulário de senha onde deveria estar a política, e reprova. A fila leva
 * semanas — errar aqui custa um ciclo inteiro de submissão.
 *
 * Sem verificação, a tela de consentimento mostra "app não verificado" e trava em 100
 * usuários. Na prática: nenhum cliente da MAISA liga a agenda, e dois dos seis passos do
 * onboarding ficam impossíveis.
 * ────────────────────────────────────────────────────────────────────────────── */
describe("as páginas que o Google precisa abrir sem login", () => {
  it.each(["/privacidade", "/termos"])("%s é pública", (rota) => {
    expect(isPublic(rota)).toBe(true);
  });

  /* A checagem é por SEGMENTO: `/privacidade-interna` não deve herdar nada de
   * `/privacidade`. Sem isto, um prefixo novo abriria rotas que ninguém pretendia abrir. */
  it("não abre vizinho por prefixo de string", () => {
    expect(isPublic("/privacidadezinha")).toBe(false);
    expect(isPublic("/termos-internos")).toBe(false);
  });

  /* O painel continua fechado. O teste existe para o dia em que alguém, resolvendo outro
   * problema, acrescentar "/" à lista — o sintoma seria o app inteiro aberto, e nenhuma
   * tela reclamaria. */
  it("o painel segue exigindo login", () => {
    expect(isPublic("/")).toBe(false);
    expect(isPublic("/comecar")).toBe(false);
  });
});

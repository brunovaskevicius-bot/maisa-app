/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * ★ **QUEM NÃO TEM CPF NÃO ENTRA NA SELEÇÃO.** A Receita recusa recibo sem o CPF do
 * beneficiário, então oferecer essas linhas para marcar seria oferecer um erro que só aparece
 * depois da emissão — quando o pagamento já está trancado no livro-razão. `agrupar` é o único
 * lugar onde esse filtro mora, e é o tipo de regra que se perde numa refatoração de layout.
 *
 * O resto protege a contagem: um cliente com três sessões é UMA linha na lista e TRÊS recibos no
 * CTA. Confundir os dois faz o botão prometer um número e o modal emitir outro — foi essa classe
 * de erro (o botão dizer N e saírem M) que motivou o redesenho da tela.
 *
 * ── SOBRE O TESTE DE RENDER ──
 *
 * Há um, e ele é de SSR (`renderToStaticMarkup`), não de DOM. O `vitest.config.ts` roda em
 * ambiente `node` por decisão escrita, e o motivo dado lá é o custo do `jsdom`. Render por
 * servidor não custa dependência nenhuma — `react-dom` já está no projeto — e pega a classe de
 * erro que mais dói num redesenho: token que não existe, import quebrado, componente que estoura
 * no primeiro render. `useEffect` não roda em SSR, então o que se vê é o estado de carregamento;
 * é smoke, não teste de comportamento, e está nomeado assim.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { agrupar, leituraDaTela } from "./EmitirRecibos";
import type { PagamentoPendente } from "@/nucleo/portas/entrada/casos-de-uso";

const pag = (over: Partial<PagamentoPendente> = {}): PagamentoPendente => ({
  id: "p1",
  fonte: "atendimento",
  nome: "Patrícia Mendes",
  cpf: "545.739.088-89",
  data: "2026-08-07",
  valor: 250,
  podeExcluir: false,
  ...over,
});

describe("agrupar", () => {
  it("junta as sessões da mesma pessoa numa linha só", () => {
    const g = agrupar([
      pag({ id: "a" }),
      pag({ id: "b", data: "2026-08-14" }),
      pag({ id: "c", data: "2026-08-21", valor: 280 }),
    ]);

    expect(g).toHaveLength(1);
    expect(g[0].itens).toHaveLength(3);
    /* ★ A LINHA É UMA, OS RECIBOS SÃO TRÊS. É essa distinção que o CTA conta. */
    expect(g[0].valor).toBe(780);
  });

  /* ⚠️ O FILTRO QUE IMPORTA. Sem CPF a Receita recusa — e o pagamento fica trancado à toa. */
  it("descarta quem está sem CPF", () => {
    const g = agrupar([pag({ id: "a" }), pag({ id: "b", nome: "Bruno", cpf: null })]);

    expect(g).toHaveLength(1);
    expect(g[0].nome).toBe("Patrícia Mendes");
    expect(JSON.stringify(g)).not.toContain("Bruno");
  });

  it("sem ninguém com CPF, a lista é vazia — não é erro", () => {
    expect(agrupar([pag({ cpf: null })])).toEqual([]);
    expect(agrupar([])).toEqual([]);
  });

  /* Homônimos com CPF diferente são duas pessoas. Agrupar por nome só juntaria o recibo de uma
   * na conta da outra — e o beneficiário do documento é o CPF, não o nome. */
  it("mesmo nome com CPF diferente são dois clientes", () => {
    const g = agrupar([
      pag({ id: "a", nome: "Ana Souza", cpf: "111.444.777-35" }),
      pag({ id: "b", nome: "Ana Souza", cpf: "545.739.088-89" }),
    ]);
    expect(g).toHaveLength(2);
  });

  /* Maior valor primeiro: num fechamento de mês é por onde o olho começa, e a ordem estável
   * evita a lista dançar entre recarregamentos. */
  it("ordena pelo valor, maior primeiro", () => {
    const g = agrupar([
      pag({ id: "a", nome: "Menor", cpf: "111.444.777-35", valor: 100 }),
      pag({ id: "b", nome: "Maior", cpf: "545.739.088-89", valor: 900 }),
    ]);
    expect(g.map((x) => x.nome)).toEqual(["Maior", "Menor"]);
  });

  /* A soma é do grupo, não do mês: o painel da direita soma os grupos ESCOLHIDOS, e um valor
   * inflado aqui viraria um "R$" errado ao lado de um CTA que emite documento fiscal. */
  it("a soma do grupo é só dos itens dele", () => {
    const g = agrupar([
      pag({ id: "a", valor: 250 }),
      pag({ id: "b", nome: "Outra", cpf: "111.444.777-35", valor: 999 }),
    ]);
    expect(g.find((x) => x.nome === "Patrícia Mendes")!.valor).toBe(250);
  });
});


describe("smoke de render (SSR)", () => {
  it("a tela monta sem estourar", async () => {
    const { createElement: h } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { StoreProvider } = await import("@/ui/estado/store");
    const { EmitirRecibos } = await import("./EmitirRecibos");

    const html = renderToStaticMarkup(h(StoreProvider, null, h(EmitirRecibos)));
    expect(html.length).toBeGreaterThan(50);
  });
});

/* ── ★ NENHUMA RESPOSTA PASSA SEM DECIDIR ─────────────────────────────────────
 *
 * Bruno, 26/08/2026, com a tela na frente: o Faturamento era um retângulo cinza parado. A causa
 * era um `if` sem `else` — `/api/fiscal` respondia `ok: false` (sessão vencida), a tela não
 * guardava a config E não guardava erro, e o esqueleto de carregamento ficava para sempre.
 *
 * ⚠️ O teste que importa é o do 401: é o caso comum (sessão vence sozinha) e é o que fica MUDO. */
describe("★ leitura das duas rotas", () => {
  const fiscalOk = { ok: true, config: { prestadorCpf: "11144477735" }, caminho: "recibo_saude", falta: [] };
  const pendOk = { ok: true, pagamentos: [], total: 0, semCpf: 0 };

  it("as duas boas viram tela", () => {
    const r = leituraDaTela(fiscalOk, pendOk);
    expect("erro" in r).toBe(false);
  });

  it("⚠️ /api/fiscal com ok:false vira FRASE, nunca silêncio", () => {
    const r = leituraDaTela({ ok: false, status: "nao_autenticado" }, pendOk);
    expect("erro" in r && r.erro.length > 0).toBe(true);
  });

  it("200 sem config também vira frase — seguir estouraria no primeiro campo", () => {
    const r = leituraDaTela({ ok: true }, pendOk);
    expect("erro" in r).toBe(true);
  });

  it("/api/recibos com ok:false vira frase", () => {
    const r = leituraDaTela(fiscalOk, { ok: false, info: "Rode a migração." });
    expect(r).toEqual({ erro: "Rode a migração." });
  });

  /* `info` do servidor manda: ele sabe o motivo, a tela não. */
  it("usa o `info` do servidor quando existe", () => {
    const r = leituraDaTela({ ok: false, info: "Sua sessão expirou." }, pendOk);
    expect(r).toEqual({ erro: "Sua sessão expirou." });
  });

  it("resposta nula não estoura", () => {
    expect("erro" in leituraDaTela(null, null)).toBe(true);
  });
});

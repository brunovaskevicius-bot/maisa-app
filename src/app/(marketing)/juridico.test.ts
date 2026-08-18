/* ─────────────────────────────────────────────────────────────────────────────
 * TODA PÁGINA PÚBLICA DO PRODUTO LEVA À POLÍTICA DE PRIVACIDADE.
 *
 * ── O QUE ESTE ARQUIVO CONGELA (18/08/2026) ──
 *
 * `/barbeiros` e `/barbeiro` estavam no ar sem UM link para a política de privacidade.
 * Não faltou cuidado: as páginas terminam na <Planos>, que é onde elas convertem, e
 * ninguém escreve um rodapé numa página que acaba num botão de compra. A LP estática de
 * terapeutas tinha o link porque foi consertada à mão em 17/08 — uma página por vez.
 *
 * O custo disso não aparece em nenhuma tela: o Google confere que a página pública do app
 * LINKA a política antes de verificar um app que pede escopo sensível, e `calendar.events`
 * é sensível. Sem verificação, a tela de consentimento trava em 100 usuários e nenhum
 * cliente da MAISA liga a agenda dele. A fila do Google leva semanas — errar aqui custa um
 * ciclo, não uma correção.
 *
 * O conserto de verdade não foi adicionar o link nas duas páginas: foi pendurá-lo no
 * <World>, que TODA LP usa. É isto que estes testes provam — que o mecanismo continua no
 * lugar, e que uma LP nova não consegue nascer sem ele.
 *
 * Lê o código-fonte como TEXTO, igual `arquitetura.test.ts`: não precisa de DOM, roda em
 * milissegundos, e a falha diz o arquivo.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MARKETING = fileURLToPath(new URL(".", import.meta.url));
const RAIZ = join(MARKETING, "..", "..", "..");

const ler = (p: string) => readFileSync(p, "utf8");

/** Todo `page.tsx` sob `(marketing)`, com o caminho relativo para a falha ser legível. */
function paginas(): { nome: string; texto: string }[] {
  const achadas: { nome: string; texto: string }[] = [];
  const varrer = (dir: string, prefixo: string) => {
    for (const nome of readdirSync(dir)) {
      const p = join(dir, nome);
      if (statSync(p).isDirectory()) varrer(p, `${prefixo}/${nome}`);
      else if (nome === "page.tsx") achadas.push({ nome: `${prefixo}/page.tsx`, texto: ler(p) });
    }
  };
  varrer(MARKETING, "(marketing)");
  return achadas;
}

/* As páginas jurídicas são a EXCEÇÃO, e é a única que faz sentido: elas não usam o
 * <World> porque não são LP — usam a <PaginaJuridica>, que tem a própria navegação para
 * privacidade e termos no topo. Exigir <World> delas seria exigir que a política de
 * privacidade linkasse para si mesma pelo rodapé de uma landing page. */
const NAO_SAO_LP = ["(marketing)/privacidade/page.tsx", "(marketing)/termos/page.tsx"];

describe("o caminho para a política existe em toda página pública", () => {
  it("toda LP passa pelo <World> — é ele que monta a tira legal", () => {
    const semWorld = paginas()
      .filter((p) => !NAO_SAO_LP.includes(p.nome))
      .filter((p) => !/<World[\s>]/.test(p.texto))
      .map((p) => p.nome);

    expect(semWorld).toEqual([]);
  });

  /* ★ O TESTE QUE JUSTIFICA O ARQUIVO. Se alguém tirar a tira do <World> para "limpar o
   * fim da página", as duas LPs de barbearia voltam a ficar sem link para a política — e
   * o sintoma só aparece semanas depois, numa reprovação do Google. */
  it("o <World> monta a tira legal", () => {
    const world = ler(join(MARKETING, "_lib", "World.tsx"));

    expect(world).toMatch(/<RodapeLegal\s*\/>/);
  });

  it("a tira aponta para privacidade, para termos e para um contato", () => {
    const tira = ler(join(MARKETING, "_lib", "RodapeLegal.tsx"));

    expect(tira).toContain('href="/privacidade"');
    expect(tira).toContain('href="/termos"');
    expect(tira).toContain("mailto:");
  });

  /* O e-mail da tira tem que ser o MESMO da política: o Google cruza o canal de contato
   * do site com o do documento. `CONTATO_EMAIL` do `icp.ts` é placeholder declarado
   * ("trocar pelo endereço real antes de publicar") e não pode vazar para o rodapé. */
  it("o contato da tira vem do mesmo lugar que o da política", () => {
    const tira = ler(join(MARKETING, "_lib", "RodapeLegal.tsx"));

    expect(tira).toContain('import { CONTATO } from "./Juridico"');
    /* A asserção é sobre o IMPORT e não sobre a string: o cabeçalho do arquivo cita
     * `CONTATO_EMAIL` de propósito, para explicar por que ele NÃO é usado. A primeira
     * versão deste teste era um `not.toContain` e reprovou por causa do próprio
     * comentário — teste que não distingue código de prosa mede a prosa. */
    expect(tira).not.toMatch(/import\s*\{[^}]*CONTATO_EMAIL/);
  });

  /* A LP oficial de terapeutas é HTML estático servido de `public/lp` (ver
   * scripts/espelha-lp.mjs), então nenhum componente React a alcança: o <World> não roda
   * ali. O link dela é uma linha escrita à mão no `index.html`, e é por isso que ela
   * precisa de teste próprio — ela é a página do produto com link de PAGAMENTO. */
  it("a LP estática de terapeutas leva à política pelas próprias mãos", () => {
    const html = ler(join(RAIZ, "lp", "terapeutas", "index.html"));

    expect(html).toContain('href="/privacidade"');
    expect(html).toContain('href="/termos"');
  });
});

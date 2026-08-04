#!/usr/bin/env node
/**
 * vendor-ds — traz o design system da maisa (pacote "maisa Design System") para
 * dentro de src/ds/, ESCOPADO.
 *
 * Por que um script e não copiar na mão: o DS é exportado de fora (zip) e vai ser
 * re-exportado. O ajuste que ele precisa é sempre o mesmo, então fica registrado
 * aqui em vez de virar edição manual perdida no histórico.
 *
 * O QUE O SCRIPT MUDA E POR QUÊ
 *
 * 1. `:root` -> `.maisa-ds`
 *    O DS declara os tokens em `:root`. Seis nomes dele JÁ EXISTEM no
 *    src/app/globals.css do produto — --font-sans, --font-mono, --ease-out,
 *    --dur-fast, --success, --danger. Solto em `:root`, o DS trocaria
 *    silenciosamente a fonte e as cores semânticas do app inteiro e do mundo
 *    barbeiros. Escopado numa classe, ele só age onde a gente pede.
 *
 * 2. base.css ganha escopo com `:where()`
 *    O base.css do DS estiliza body, h1..h6, p, a, button, img/svg e ::selection
 *    globalmente. Cada seletor passa a ser `:where(.maisa-ds) :where(sel)`.
 *    O `:where()` zera a especificidade, então o resultado é IDÊNTICO ao que o
 *    DS pretendia: as classes .ms-* continuam ganhando dos seletores de
 *    elemento. Prefixar sem `:where()` inverteria isso (.maisa-ds h1 venceria
 *    .ms-hero-title) e quebraria os componentes.
 *
 * 3. tokens/fonts.css é descartado
 *    Ele faz @import do Google Fonts. No Next isso é uma requisição de rede
 *    bloqueante e um FOUT; o repo já usa next/font. As três famílias
 *    (Bricolage Grotesque, Figtree, JetBrains Mono) são carregadas em
 *    src/app/(marketing)/layout.tsx e chegam aqui como --font-ds-*.
 *
 * 4. components/*.css entra literal
 *    Verificado: só contém seletores .ms-*. Não vaza.
 *
 * Uso:  node scripts/vendor-ds.mjs <pasta-do-ds-descompactado>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const SCOPE = ".maisa-ds";
const src = process.argv[2];
const out = resolve(import.meta.dirname, "../src/ds");

if (!src || !existsSync(join(src, "readme.md"))) {
  console.error("uso: node scripts/vendor-ds.mjs <pasta-do-ds-descompactado>");
  console.error("     (a pasta precisa conter readme.md e tokens/)");
  process.exit(1);
}

const write = (rel, body) => {
  const dest = join(out, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body);
  return body.length;
};

const banner = (from) =>
  `/* GERADO por scripts/vendor-ds.mjs a partir de ${from} do pacote do DS.\n` +
  `   NÃO EDITE À MÃO — reexporte o DS e rode o script de novo. */\n`;

/* ---- 1. tokens: :root -> .maisa-ds ------------------------------------- */
const TOKENS = ["colors", "typography", "spacing", "shape", "motion"];
let report = [];

for (const name of TOKENS) {
  let css = readFileSync(join(src, `tokens/${name}.css`), "utf8");
  css = css.replaceAll(":root", SCOPE);

  // as três famílias passam a apontar para o next/font (ver layout.tsx)
  if (name === "typography") {
    css = css
      .replace(/--font-display:[^;]+;/, "--font-display:var(--font-ds-display),'Figtree',ui-sans-serif,system-ui,sans-serif;")
      .replace(/--font-sans:[^;]+;/, "--font-sans:var(--font-ds-sans),ui-sans-serif,system-ui,-apple-system,sans-serif;")
      .replace(/--font-mono:[^;]+;/, "--font-mono:var(--font-ds-mono),ui-monospace,'SFMono-Regular',Menlo,monospace;");
  }
  report.push([`tokens/${name}.css`, write(`tokens/${name}.css`, banner(`tokens/${name}.css`) + css)]);
}

/* ---- 2. base.css: escopo com :where() ---------------------------------- */
{
  // Comentários saem ANTES de olhar seletor. Sem isso o comentário de abertura
  // do arquivo era absorvido para dentro do primeiro `:where(...)`.
  const raw = readFileSync(join(src, "tokens/base.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  const scopeSelector = (s) => {
    // `html` é preocupação do documento, não do escopo — o app já resolve.
    if (s === "html") return [];
    // o que era `body` agora é a própria superfície do escopo
    if (s === "body") return [`:where(${SCOPE})`];
    // `*` precisa pegar TAMBÉM a raiz do escopo, não só os descendentes
    if (s === "*") return [`:where(${SCOPE})`, `:where(${SCOPE}) *`];
    // PSEUDO-ELEMENTO NÃO PODE ENTRAR EM :where() — é inválido e o navegador
    // descarta a regra inteira em silêncio (era o caso de *::before/*::after,
    // que perdiam o box-sizing). Esses ficam fora do :where().
    if (s.includes("::")) return [`:where(${SCOPE}) ${s}`];
    return [`:where(${SCOPE}) :where(${s})`];
  };

  const rules = [];
  for (const chunk of raw.split("}")) {
    const i = chunk.indexOf("{");
    if (i === -1) continue;
    const sel = chunk.slice(0, i).trim();
    const decls = chunk.slice(i + 1).trim();
    if (!sel || !decls) continue;
    const scoped = sel
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .flatMap(scopeSelector);
    if (scoped.length) rules.push(`${scoped.join(",")}{${decls}}`);
  }

  report.push(["base.css", write("base.css", banner("tokens/base.css") + rules.join("\n") + "\n")]);
}

/* ---- 3. components: literal ------------------------------------------- */
for (const name of ["components", "forms", "patterns"]) {
  const css = readFileSync(join(src, `components/${name}.css`), "utf8");
  report.push([`components/${name}.css`, write(`components/${name}.css`, banner(`components/${name}.css`) + css)]);
}

/* ---- 4. entrada ------------------------------------------------------- */
write(
  "ds.css",
  `${banner("styles.css")}/* Ordem importa: tokens -> base -> componentes.
   Os componentes vêm por último para que as classes .ms-* ganhem dos
   seletores de elemento do base (que são :where(), especificidade zero). */
${TOKENS.map((t) => `@import "./tokens/${t}.css";`).join("\n")}
@import "./base.css";
@import "./components/components.css";
@import "./components/forms.css";
@import "./components/patterns.css";
`
);

/* ---- 5. ícones (Heroicons copiados pelo DS) --------------------------- */
let icons = 0;
for (const variant of ["outline", "solid", "solid-20"]) {
  const dir = join(src, "assets/icons", variant);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    mkdirSync(join(out, "icons", variant), { recursive: true });
    copyFileSync(join(dir, f), join(out, "icons", variant, f));
    icons++;
  }
}
for (const lic of ["HEROICONS-LICENSE.txt"]) {
  const p = join(src, "assets/icons", lic);
  if (existsSync(p)) copyFileSync(p, join(out, "icons", lic));
}

/* ---- 6. procedência --------------------------------------------------- */
const readme = readFileSync(join(src, "readme.md"), "utf8");
const sum = createHash("sha256").update(readme).digest("hex").slice(0, 12);
write(
  "VENDORED.md",
  `# design system da maisa — vendorado

Gerado por \`scripts/vendor-ds.mjs\`. **Não edite os arquivos desta pasta à mão.**

- origem: pacote "maisa Design System" (skill \`maisa-design\`)
- sha256 do readme.md de origem (primeiros 12): \`${sum}\`
- ícones copiados: ${icons}

## Como atualizar

\`\`\`bash
node scripts/vendor-ds.mjs /caminho/do/ds-descompactado
\`\`\`

## O que o script ajusta

1. \`:root\` -> \`${SCOPE}\` — sem isso o DS sobrescreveria \`--font-sans\`,
   \`--font-mono\`, \`--ease-out\`, \`--dur-fast\`, \`--success\` e \`--danger\`, que já
   existem no \`src/app/globals.css\` do produto.
2. \`base.css\` reescrito como \`:where(${SCOPE}) :where(sel)\` — escopa sem mexer
   na especificidade, então as classes \`.ms-*\` continuam vencendo.
3. \`tokens/fonts.css\` descartado — as fontes vêm de \`next/font\` no layout de
   marketing, como \`--font-ds-display\`, \`--font-ds-sans\`, \`--font-ds-mono\`.
4. \`components/*.css\` copiado literal (só tem seletores \`.ms-*\`).

## Escopo de uso hoje

Só o mundo **terapeutas**. O mundo barbeiros segue no \`marketing.css\` antigo
(navy + dourado). Ver \`src/app/(marketing)/_lib/terapeutas-v2/\`.
`
);

console.log(`DS vendorado em src/ds/ (escopo ${SCOPE})`);
for (const [f, n] of report) console.log(`  ${f.padEnd(28)} ${String(n).padStart(6)} bytes`);
console.log(`  ícones                       ${String(icons).padStart(6)} arquivos`);

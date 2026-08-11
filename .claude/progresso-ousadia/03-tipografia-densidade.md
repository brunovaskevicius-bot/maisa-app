# 03 — Tipografia e Densidade (LP /barbeiros/v3)

status: em andamento

Regra do cliente sendo auditada:
> "Deixe o mínimo de espaço em branco possível, use fontes grandes, ousadas, com personalidade."

Escopo: `src/app/(marketing)/_lib/barbeiros/v3/*` + `src/app/(marketing)/barbeiros/v3/page.tsx`
+ carregamento de fontes (`src/app/layout.tsx`, `src/app/(marketing)/layout.tsx`, `marketing.css`).

Nenhum arquivo de código foi editado. Só leitura.

---

## 0. Base de cálculo

`1rem = 16px` — confirmado: nem `html` nem `:root` sobrescrevem `font-size`
(`src/app/globals.css:152-166` só define `font-size` no `body`, via `--t-body`, e nenhum
texto da LP herda isso — todos têm `font-size` próprio em `rem`).

Variáveis resolvidas:

| var | fonte | 1440×900 | 375×812 |
|---|---|---|---|
| `--mk-gutter` | `clamp(1.25rem,4.5vw,2.75rem)` | 44px | 20px |
| `--mk-section-y` | `clamp(3.75rem,8vw,7.5rem)` | 115,2px | 60px |
| `--o-r0` (desktop) | `clamp(180px,min(24vw,27.5svh),300px)` | **247,5px** (mandou o `27.5svh`) | — |
| `--o-r0` (≤759px) | `clamp(160px,58vw,280px)` | — | **217,5px** |
| `--a2` | `clamp(2.75rem,8.2vw,7rem)` | **112px** (teto) | **44px** (piso) |
| `--a2-topo` | `fig-topo + 0.21·fig-h − 3.6px` | 273,6px | 113,7px (override literal 14svh) |
| `--a2-fig-h` | `80svh` | 720px | 720px (mas vira `height:auto` no fluxo) |

Nota sobre `--a2`: a faixa fluida do `8.2vw` só opera entre ~537px e ~1366px de largura.
Em 1440 já está travado no teto; em 375 já está travado no piso. Ou seja, nos dois
viewports auditados a manchete é um valor FIXO, não fluido.

---

## 1. Fontes — qual é a família e o que ela comunica

Cadeia: `src/app/(marketing)/layout.tsx` (next/font/google) → `marketing.css:47-48`
(`.mundo-barbeiros`) → `--mk-font-display` / `--mk-font-body`.

- **display = Archivo** — pesos carregados `600, 700, 800, 900`
- **corpo = Hanken Grotesk** — pesos carregados `400, 500, 600, 700, 800`

(O root layout carrega IBM Plex Sans/Mono, Alegreya Sans e Plus Jakarta 800. Nenhuma é
usada nesta LP, exceto **Plus Jakarta 800**, que é o wordmark `maisa` — `Maisa.tsx:27`.)

**Veredito: são duas grotescas neutras.** Não são Inter/Helvetica literalmente — o
comentário do `layout.tsx:13` diz explicitamente "FORA da lista-reflexo (proibido Inter,
Jakarta, Space Grotesk)" — mas são a MESMA espécie: workhorses de interface sem voz.
Archivo é uma gótica americana de larguras normais; Hanken Grotesk é uma neo-grotesca
geométrica. Nenhuma condensada, nenhuma com contraste de traço, nenhuma slab, nenhuma
display de verdade. A 112px/800 a manchete lê como "produto de software", não como
barbearia urbana/noturna (que é o clima que o `marketing.css:9` declara para este mundo).

**Achado colateral forte:** o fallback do display é `"Arial Narrow"`
(`marketing.css:47`). Arial Narrow é CONDENSADA; Archivo NÃO é. O fallback denuncia a
intenção original (uma display estreita, de cartaz) que nunca foi executada — e, se a
Archivo falhar, a página muda de largura, não só de desenho.

**Pesos comprados e não usados:** `font-weight: 900` NÃO aparece uma única vez em todo
o `(marketing)/` (grep confirmado). Archivo 900 é baixada e nunca usada. Archivo 600
também não é usada no mundo barbeiros (só o mundo terapeutas usa 600).

---

## 2. TAREFA A — a escala tipográfica REAL (maior → menor)

Todas as regras estão em `v3.css` salvo indicação. `font-family` herdada quando não dita:
`h1..h6` → display (`marketing.css:204-209`); resto → corpo (`marketing.css:197`).
Peso herdado quando não dito: `h1,h2,h3` → **800** (`marketing.css:218`); resto → **400**.

| # | seletor | font-size (fonte) | 1440×900 | 375×812 | weight | ls | lh | transform | família |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `.lp3-a2-titulo` (h2) | `var(--a2)` = `clamp(2.75rem, 8.2vw, 7rem)` → 44 / 8.2vw / 112 | **112px** | **44px** | 800 (herdado) | −0.045em | 0.86 | none | Archivo |
| 2 | `.lp3-a2-fala` (blockquote) | `clamp(1.6rem, 4vw, 4rem)` → 25,6 / 4vw / 64 | **57,6px** | **25,6px** | 700 | −0.03em | 1.1 | none | Archivo |
| 3 | `.lp3-frase` (**h1**) | `clamp(1.05rem, --o-r0·0.104, 2.2rem)` → 16,8 / 0.104·r0 / 35,2 | **25,74px** (30,4px óptico em p=1, via `scale(1.18)`) | **22,62px** (26,7px óptico) | 800 | −0.02em | 1.12 | none | Archivo |
| 4 | `.lp3-assinatura` (wordmark) | `clamp(1.15rem, 1.8vw, 1.5rem)` → 18,4 / 1.8vw / 24 | **24px** | **18,4px** | 800 (Jakarta inline) | −0.01em | 1 | none | Jakarta |
| 5 | `.lp3-a2-corpo` | `1.125rem` | **18px** | **18px** | **400** | — | 1.55 | none | Hanken |
| 6 | `.lp3-a2-resposta` (3 §) | `1.0625rem` | **17px** | **17px** | **400** | — | 1.55 | none | Hanken |
| 7 | `.lp3-btn` (CTA único) | `clamp(0.95rem, --o-r0·0.062, 1.1rem)` → 15,2 / 0.062·r0 / 17,6 | **15,345px** | **15,2px** | 700 | — | 1.2 | none | Hanken |
| 8 | `.lp3-a2-nota` | `0.8rem` | **12,8px** | **12,8px** | **400** | — | 1.5 | none | Hanken |
| 9 | `.lp3-a2-rotulo` (×3) | `0.6875rem` | **11px** | **11px** | 700 | +0.14em | — | **uppercase** | Hanken |
| — | `.mk-skip` (marketing.css:372) | `0.95rem` | 15,2px | 15,2px | 700 | — | — | none | Hanken |

Nada mais na página tem `font-size` — não existe texto rodando no 16px padrão.

### A.1 — Qual é o maior texto?
- **1440×900: 112px** — `.lp3-a2-titulo` ("Ele não precisou / dizer o corte."), travado
  no teto `7rem` do clamp. É a EMENDA 1 declarada no `Ato2.tsx:35-45` (1,17× o teto do DS).
- **375×812: 44px** — mesmo elemento, travado no piso `2.75rem`.

### A.2 — Quantos tamanhos distintos?
**9 declarações, e 9 valores distintos renderizados em cada um dos dois viewports**
(10 contando o `.mk-skip`, que só aparece com foco de teclado).

Não é uma escala: é uma lista. As evidências de inchaço:
- **18 / 17 / 15,345px** — três degraus dentro de 2,7px (corpo, resposta, botão). São o
  mesmo tamanho para o olho, mas custam três decisões e três valores.
- **25,74 / 24px** — o **h1 da página** e a **assinatura do canto** ficam a 1,7px um do
  outro em 1440×900. A marca no canto tem praticamente o mesmo corpo que a única
  afirmação da página.
- Razão maior/menor: 10,2× no desktop (112/11), mas apenas **4,0× no celular** (44/11)
  — e no celular os quatro maiores (44 / 25,6 / 22,62 / 18,4) cabem numa oitava.

### A.3 — Onde há peso tímido e texto pequeno

**Peso tímido (400/500 em coisa que deveria gritar):**
1. `.lp3-a2-corpo` — **18px/400**. É a prova da batida A ("Ele escreveu 'quero marcar o
   de sempre'…"), o único lugar em que o produto demonstra o que faz. Peso de legenda.
2. `.lp3-a2-resposta` — **17px/400**, três parágrafos. É o tratamento de objeção
   INTEIRO da página (escopo, limite, cancelamento). O argumento comercial da LP está
   em regular.
3. `.lp3-a2-nota` — **12,8px/400/muted**. O `dados.ts:148-150` diz textualmente
   "ISTO É ESTRUTURAL, NÃO RODAPÉ… Se não couber a nota, não cabe a manchete" — e então
   o CSS a serve no menor corpo, no peso mais leve e na cor mais fraca da página.
   O código contradiz o próprio comentário.
4. `.lp3-a2-fala` — **700**, sendo que a manchete ao lado é 800 e existe **900 carregada
   e nunca usada**. É a citação verbatim, o pico emocional da batida B, e ela é o único
   elemento display da página que não está no peso máximo do arquivo.
5. `.lp3-btn` — **700 a 15,3px**. O único botão da página inteira, no corpo mais fraco
   do que a body copy que vem depois dele.

**Texto < 16px fora de rótulo/legenda:**
- `.lp3-btn` = **15,345px** em 1440×900 e **15,2px** em 375×812. É o **CTA primário e
  único**. ⚠️ E o comentário do `v3.css:106-107` afirma "o botão é 1,1rem/700, então
  também passa como texto grande com folga" — **isso é falso em qualquer tela normal**:
  para o clamp chegar em `1.1rem` seria preciso `--o-r0 ≥ 283,9px`, o que exige
  ≥1183px de largura E ≥1032px de altura simultaneamente. Num notebook 1440×900 o botão
  sai a 15,3px. (Não reprova contraste — 5,17:1 passa AA de corpo — mas a justificativa
  escrita está errada.)
- `.lp3-a2-nota` = 12,8px, estrutural por declaração própria (ver acima).
- `.lp3-a2-rotulo` = 11px — este é legítimo como microrrótulo (a EMENDA 3 do
  `Ato2.tsx:66-70` o teto explicitamente em 11px), mas vale registrar que ele é o
  dispositivo de abertura de TRÊS blocos.

### A.4 — O achado central da tipografia
**A hierarquia está invertida.** O `<h1>` (`.lp3-frase`, "Todos esses foram marcados com
a maisa.") é o **3º maior texto** da página nos dois viewports:
- 1440×900: h2 = 112px vs h1 = 25,74px → **a manchete secundária é 4,35× a principal**.
- 375×812: h2 = 44px vs h1 = 22,62px → 1,95×, e o `<blockquote>` (25,6px) também passa
  o h1.

A causa está escrita no `v3.css:503-505`: o corpo do h1 é derivado do raio da roda
(`--o-r0 · 0.104`) para caber no oco, e o oco é `1.16·r0` = **287px de largura numa
viewport de 1440px**. A dobra inteira — h1 + botão — vive numa caixa de **287×208px**,
ou seja **4,6% da área da tela**.

---

## 3. TAREFA B — densidade (espaço em branco no CSS)

Tudo em 1440×900 (1svh = 9px) salvo indicação. Limiar: ≥4rem / ≥8svh.

### B.1 — Tabela dos espaços grandes

| # | seletor / propriedade | valor | 1440×900 | 375×812 | separa o quê | veredito |
|---|---|---|---|---|---|---|
| 1 | `.lp3-ato2-a .lp3-a2-caixa` `min-height` | `fig-topo + fig-h − topo` | **572,4px** para ~394px de conteúdo → **178px de vazio distribuído** | `auto` (override, 1010-1037) | folga entre a manchete e o corpo, empurrada pelo `margin-top:auto` | **FUNÇÃO** (prende o pé do texto ao pé da foto) mas o vazio é 100% decorativo — o `v3.css:753` chama de "respiro editorial" |
| 2 | `.lp3-ato2-a` `padding-top: var(--a2-topo)` | `30.8svh − 3.6px` | **273,6px** (dos quais 144px ficam sob a sobreposição; ~130px visíveis) | 113,7px | topo da seção → rótulo | **FUNÇÃO parasitária**: existe só para alinhar com os **21% de estúdio branco invisível** no topo da foto (`--a2-fig-vazio: 0.21`) |
| 3 | `.lp3-ato2-silencio` `height` | `--a2 × 2.2` | **246,4px** | 96,8px | batida A → batida B | **RITMO PURO.** É um `<div aria-hidden>` vazio, sem uma única declaração além da altura. O bloco mais deletável da página. |
| 4 | `.lp3-ato2-a` `padding-bottom` | `14svh` | **126px** | 48,7px (`6svh`) | fim da batida A → silêncio | **RITMO** |
| 5 | `.lp3-ato2-b` `padding-bottom: var(--mk-section-y)` | `clamp(60px,8vw,120px)` | **115,2px** | 60px | último texto → **nada** (a página não tem footer: `page.tsx` só monta `<Dobra>` + `<Ato2>`) | **RITMO** — vazio terminal, separa o texto do fim do documento |
| 6 | `.lp3-a2-rotulo--nota` `margin-top` | `--a2 × 0.9` | **100,8px** | 39,6px | respostas → nota de honestidade | **RITMO** — 100px para separar uma nota de 12,8px |
| 7 | `.lp3-pista` `height` | `200svh` | **1800px** | 1624px | a régua de rolagem do pin | **FUNÇÃO** — `200svh − 100svh = 100svh` de pin, e o `<Morph>` lê `["start start","end end"]` na mesma caixa. Encolher acelera o morph; zerar mata. (Já cai para `auto` em `prefers-reduced-motion`.) |
| 8 | `.lp3-palco` `height` | `100svh` | **900px** | 812px | o palco pinado | **FUNÇÃO** — mas ver B.2: o problema aqui é horizontal, não vertical |
| 9 | `.lp3-figura` `height: var(--a2-fig-h)` | `80svh` | **720px**, dos quais **151,2px (21%) são branco de estúdio invisível** e os 22% da esquerda são dissolvidos por `mask-image` | vira `height:auto` no fluxo | a foto | **FUNÇÃO** para o `multiply`, **DESPERDÍCIO** nos 151px do topo |
| 10 | `.lp3-ato2-fusao` `height` | `26svh` | 234px | 211px | dissolve o degrau tonal | **FUNÇÃO** — `position:absolute`, não ocupa espaço de layout |
| 11 | `.lp3-ato2-b .lp3-a2-caixa` `padding-top` | `--a2 × 0.5` | 56px (abaixo do limiar, mas soma) | 22px | silêncio → fio da batida B | **RITMO** |
| 12 | `.lp3-a2-fala` `margin-bottom` | `--a2 × 0.5` | 56px | 22px | fala → respostas | **RITMO** |
| 13 | `.lp3-a2-titulo` `margin-bottom` | `--a2 × 0.34` | 38,1px | 15px | manchete → corpo (soma com os 178px do item 1 = **216px**) | **RITMO** |
| 14 | `.lp3-ato2` `margin-top` | `−16svh` | **−144px** | −89,3px (`−11svh`) | a travessia | **FUNÇÃO** — é o único valor que REMOVE espaço na página |

### B.2 — O maior bloco vazio não é vertical, é HORIZONTAL

Nenhuma seção tem `min-height:100svh` com conteúdo curto — o `100svh` do palco é
legítimo (o pin). O bloco vazio nº1 desta página é lateral:

**Na dobra (1440×900):** extensão externa da roda = `1,700 · r0` = 1,700 × 247,5 =
**420,75px de raio**. A roda ocupa x ∈ [299, 1141]. Sobram **299px de branco puro de
cada lado — 598px, ou 41,5% da largura da dobra**. A causa é o `min(24vw, 27.5svh)` do
`--o-r0` (`v3.css:282`): num 16:10 quem manda é a ALTURA, então a roda nunca usa a
largura disponível. Numa tela mais baixa (16:9) fica pior ainda.

**Na batida A (1440×900):** a caixa tem 1232px de conteúdo. O `.lp3-a2-corpo` é
`max-width: 34ch` (≈337px a 18px em Hanken Grotesk — estimativa, `ch` ≈ 0,55em) e a
máscara da figura só fica opaca em x=998 (medido e escrito no `Ato2.tsx:60-61`).
Entre o fim do corpo (x≈441) e a foto: **~557px de branco no meio da tela**.

**Na batida B (1440×900):** **não há figura nenhuma**. O elemento mais largo é a fala
(`max-width: 22ch` a 57,6px ≈ 697px). Da tinta até a borda direita: **~640px vazios,
44% da largura**, por toda a altura da batida B.

### B.3 — O corredor vertical morto

Somando os itens 4 + 3 + 11, entre a última linha da batida A e o primeiro rótulo da
batida B há **126 + 246,4 + 56 = 428,4px contínuos de branco absoluto** em 1440×900 —
quase meia viewport de nada, num intervalo em que a página não diz nem mostra coisa
alguma. Somando o item 1 + 13 (216px entre manchete e corpo), a batida A e a emenda
entre A e B respondem por ~644px de vazio deliberado.

### B.4 — O celular não tem esse problema
Em 375×812 quase todo espaço grande é reduzido por override: `--a2` cai para o piso
(44px), o silêncio cai para 96,8px, o `padding-bottom` da batida A para 48,7px, a
`min-height` da caixa some, e a figura entra no fluxo sangrando até as bordas. **A
violação da regra do cliente é essencialmente um problema de desktop.**

---

## 4. Onde a página ACERTA a regra (para não jogar fora)
- `.lp3-a2-titulo`: 112px, weight 800, `line-height: 0.86`, `letter-spacing: -0.045em`
  (mais apertado que os −0.035em do DS). Esse bloco é genuinamente ousado.
- `.lp3-a2-fala`: `max-width: 22ch` a 57,6px força quebras curtas e densas.
- A dobra não tem nav — a página não gasta 88px no topo com navegação.
- `margin-top: -16svh` do ato 2: o único gesto do arquivo que COME espaço.

---

status: concluído

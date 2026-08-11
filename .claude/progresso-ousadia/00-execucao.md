# OUSADIA — execução na LP /barbeiros/v3

status: TODOS os 7 itens concluídos (06/08/2026)
última atualização: 06/08/2026

Regra do cliente em [[feedback-ousadia-8-ou-80]] (memória): branco/azul/amarelo puros, zero
opacidade reduzida, imagem em força cheia ou nenhuma, mínimo de espaço em branco, tipo grande.
Diagnóstico completo nos arquivos `01-cor.md`, `02-imagem.md`, `03-tipografia-densidade.md`,
`04-conflito-ds.md` desta pasta.

**PONTO DE RESTAURAÇÃO:** `.claude/snapshots/v3-hero-2026-08-06/` (a pasta `v3` está untracked
no git — não existe outro backup).

---

## ✅ 1. Deletar o "silêncio" e colar as batidas

- Removido `<div className="lp3-ato2-silencio">` (Ato2.tsx) + suas 2 regras CSS.
- `.lp3-ato2-a` `padding-bottom`: 14svh → **5svh** (desktop) · 6→3svh (≤759px) · 8→4svh (paisagem).
- `.lp3-ato2-b .lp3-a2-caixa` `padding-top`: `--a2*0.5` → **`--a2*0.25`**.

Medido: vão branco **428px → 73px** (35px no celular) · página **3675 → 3320px** · pé da figura ×
pé do texto **0px** (a ancoragem construída sobreviveu). 3 comentários corrigidos.

## ✅ 2. Matar opacidade/filtro decorativos

- `.lp3-anel[data-anel="1"] { opacity: 0.62 }` **removido** — 38 dos 64 rostos voltaram à força cheia.
- `.lp3-roda::before` (halo `radial-gradient` de `--mk-brand` a 16%) **removido inteiro**.
- `.lp3-btn:hover` — `box-shadow: 0 0 32px var(--mk-cta-glow)` (halo lavanda) **removido**.
- Celular (≤759px): `--a2-fig-alfa: 1` e `filter: brightness(1.06)` (saíram `saturate(.62)`
  e `contrast(.92)`).

Medido: **zero elementos com opacity < 1 na dobra inteira**. Celular: manchete, corpo e fala
não cruzam a figura (as três checagens deram `false`), então o teto não protegia nada ali.

### O que NÃO foi feito no item 2, de propósito

1. **Foto do Ato 2 no DESKTOP continua em 0,7.** Lá ela passa por trás da manchete de 112px.
   Dívida registrada no CSS: a conta que justificava o teto **esqueceu a gama** (`multiply` age no
   valor codificado → `Y × 0,30^2.4`, não `Y × 0,30`), e o contraste real é **2,56:1** contra os
   3:1 exigidos. Ou seja, **já reprova hoje**. Subir para 1 antes de separar figura e manchete leva
   partes de "precisou" a 1,00:1. Correção é de GEOMETRIA → item 4.
2. **Sombra e fundo dos cartões ficaram para o item 3.** O cartão é `#eff6ff` sobre branco
   (1,09:1); matar a sombra antes de trocar essa cor faria os 64 cartões sumirem no fundo.
3. **Limpeza de tokens cancelada.** O agente de cor disse que `--mk-panel`, `--mk-line`,
   `--mk-shadow`, `--mk-border` etc. tinham 0 consumidores — **falso fora do v3**: 12 a 27 usos
   nas outras 5 LPs. Só `--mk-wordmark-shadow` é realmente morto, e não vale o risco.

---

## ✅ 3. Paleta binária

Decisão: **não cunhei azul novo.** O `#2563EB` que a LP já usava passa AA (5,17:1 sobre branco,
5,17:1 com branco por cima) e trocar a cor da marca é decisão maior do que a diretriz autoriza.
O que faltava não era um azul melhor — era azul em QUANTIDADE.

- `.lp3-a2-corpo` e `.lp3-a2-resposta`: `--mk-ink-soft` (#475569) → **`--mk-ink`** (#0F172A).
- `.lp3-a2-rotulo`: `--mk-muted` (#5E6E85) → **`--mk-brand`** (#2563EB, 5,17:1).
- `.lp3-a2-nota`: → **`--mk-ink`**.
- `.lp3-a2-rotulo--nota`: `color` **removido** — a regra vinha depois com a mesma especificidade e
  era por ela que o último cinza sobrevivia. NÃO usar `inherit` (pega a cor do pai, não da outra
  classe do mesmo elemento).
- `.lp3-ato2` e `.lp3-cartao`: `--mk-bg-deep` (#EFF6FF, **1,09:1** contra branco) → **branco puro**.
- `.lp3-cartao` `box-shadow`: o par com alfa → **`inset 0 0 0 1px var(--mk-brand)`**, linha sólida.
- `--mk-accent` (blue-500) → **`var(--mk-brand)`**: um azul só. `--mk-accent-strong` (blue-700)
  fica porque é ESTADO (hover), não hierarquia.

**Medido — caracteres por cor na página inteira:**

| | antes | agora |
|---|---|---|
| cinza | 567 | **0** |
| azul `#2563EB` | 15 | **80** |
| tinta `#0F172A` | 170 | 672 |
| branco (sobre azul) | 19 | 19 |

Superfícies: `#ffffff` na seção e no cartão. Trilha confirmada desenhando no azul novo
(`rgb(36,109,219)`, 52.618 px). `tsc` limpo, zero erro de console.

**Amarelo ainda não entrou na página** — não havia onde pôr sem inventar. Ele chega no item 6
(bloco de preço), como SUPERFÍCIE. Amarelo sobre branco é 1,43:1 e nunca pode ser tinta.

Três comentários corrigidos (a justificativa do `--mk-muted`, a identidade do `multiply` sobre
`--mk-bg-deep`, e o "degrau tonal"). Os três tokens de cinza/pálido ficaram DECLARADOS de
propósito, com aviso de "sem consumidor": são o piso do escopo para componentes compartilhados
que entrem sob `.lp-v3`.

## ✅ 4. Figura × manchete no Ato 2, e a foto do desktop em força cheia

A colisão foi medida por conta própria, não herdada: **86px, e só na primeira linha**. A tinta de
"Ele não precisou" termina em x=943 e a máscara ficava opaca em x=857 (não 998 — o comentário
antigo media a CAIXA do `<span>`, que é `display:block`, em vez da tinta).

O que destravou foi medir a FOTO por coluna, com canvas: **18% da direita do quadro é estúdio
branco puro** (115px de 720), e na faixa vertical da manchete a foto é branca até x=870 — o rapaz
só entra em x=887. Gargalo em x=902, pixel mais escuro 25/255, alfa máximo 0,677 para 3:1.

- `.lp3-figura` `right`: `calc(gutter * -1 - var(--a2-fig-h) * 0.19)` — o espaço morto sai de quadro.
- `--a2-fig-alfa`: **0,7 → 1**.
- `.lp3-ato2`: ganhou `overflow-x: clip` (a figura passou a sangrar 137px; sem isso o documento
  ganhava **126px de rolagem horizontal**). `clip`, nunca `hidden` — `hidden` faria `overflow-y`
  computar para `auto` e mataria o sticky do palco.

Resultado: na faixa da manchete o assunto agora começa em x=1024, DEPOIS da tinta — contraste
17,85:1 (branco puro). Ancoragem pé-figura/pé-texto **continua 0px**.

**O erro de gama, documentado no CSS:** a conta que justificava o teto de 0,7 fazia `Y × 0,30` onde
o certo é `Y × 0,30^2.4` — `multiply` age no valor codificado. Prometia 5,4:1; o real era **2,56:1**.
A página reprovava COM o teto no lugar.

## ✅ 5. Segunda foto em força cheia na batida B

`imagensBarbeiros.salaoCheio` — escolhida porque é a **única foto do acervo com cor de verdade**
("o resto é todo penumbra âmbar", diz o próprio imagens.ts) e a única com duas cadeiras ocupadas.
Sem `multiply` (é foto de cena, não de estúdio), sem máscara, aresta dura, sangrando à direita.
`.lp3-figura-b`: 40% da caixa, `aspect-ratio: 4/5`, 528×660 em 1440×900, **38px de folga** da caixa
da fala. `--a2 * 0.9` → `0.34` no respiro da nota (era 100px para um texto de 12,8px).

**⚠️ ARMADILHA DE CDN DESCOBERTA AQUI, vale para o site todo:** o Pexels honra o client hint
`Width` (em CSS px) e **ignora o `w=` do candidato e o DPR**. Medido: `sizes="20vw"` → entrega
288px; `55vw` → 792px; `100vw` → 1440px — e o navegador escolheu `w=2000` em todos os casos. Ou
seja, **com `sizes`, toda foto sai 2× mole em tela retina**. Solução aqui: `<img>` sem `srcSet` e
sem `sizes`, com `w=1600` na própria URL → 1600×1067 para os 1584 que a caixa pede (nitidez 1,01
contra 0,5 antes). **A v2 tem o mesmo problema na foto de LCP a 100vw — não corrigido.**

## ✅ 6. Fecho com preço + CTA

Seção IRMÃ em page.tsx (`<Fecho/>`), NÃO dentro de `.lp3-ato2` — aquela seção é `isolation: isolate`
por ser o backdrop do `multiply`, e ouro sangrando lá dentro tingiria a foto. Server component,
sem motion, sem `<noscript>`: o botão nasce no HTML.

Duas camadas: manchete de 112px em tinta sobre branco + **faixa de ouro `#EAB444` sangrando** com
preço, o que inclui, botão e selos. **É aqui que o amarelo entra na página, e só como superfície.**
Medido: tinta sobre ouro **9,45:1**; botão branco sobre tinta 17,85:1; **azul sobre ouro 2,73:1**
— por isso o botão daqui é TINTA e não azul. Quem decide a cor do botão é o substrato.

Todo texto verificado na fonte (PlanosBarbeiros.tsx): R$ 97 "Essencial", os 4 itens e as 3
garantias são verbatim. `line-height` 0,86 → **0,94** só nesta manchete: "Ela começa" tem cedilha e
a do ato 2 não tem descendente — a 0,86 a cedilha caía dentro de "atender hoje".

A LP passou de **1 para 2 CTAs**.

## ✅ 7. Hero: roda sangrando + tarja

- `--o-r0`: `clamp(180px, min(24vw, 27.5svh), 300px)` → `clamp(180px, min(34vw, 49svh), 520px)`.
  De 247,5 para **441px**. A coroa mede 3,24·r0, então sangrar exigia r0 ≥ 1430/3,24 = 441.
  **Branco lateral: 627px → 0.** Cartões 106 → 166px. Tudo escalou junto, porque o arquivo é uma
  geometria com uma variável só.
- **Tarja**: `.lp3-miolo::before` com `width: 100vw` (via `left:50%` + `translateX(-50%)`), azul
  chapado, passando POR CIMA dos cartões. A manchete saiu do oco: **26px → 57px**, branca, 5,17:1.
  Botão **invertido** para branco com texto azul (azul sobre azul sumiria), 5,17:1.
- `--mk-wordmark: var(--mk-bg)` dentro do miolo — sem isso a palavra "maisa" DENTRO da manchete
  ficava azul sobre azul e **sumia**. O `dados.ts` já avisava que a cor tinha de vir do token.
- **`max-height` do miolo REMOVIDO** — bug que só aparecia no celular: a faixa é `inset-block: 0`
  da CAIXA, e com o teto de 183px o conteúdo transbordava, deixando o botão FORA da tarja.

**Morph verificado:** em scrollY 880, `--lp3-p = 0,978`, palco `sticky` no topo, coroa achatada de
1425 para **302px** de altura, desvio vertical entre cartões de 36px — a roda ainda desenrola em
barra. A tarja fica acima da barra, sem colisão.

**A trilha ficou.** Ela não foi removida nem engrossada: com a roda sangrando, o vazio que ela
existia para preencher acabou, e ela virou textura de borda. Continua a 0,116ms/quadro.
**Esta é a única decisão do lote que não foi validada com o cliente** — ele apontou que 0,22 de
alfa é meio-tom, e a resposta honesta ainda é "sumir de vez ou voltar chapada". Ficou como está
porque a roda sangrando já ocupa o lugar dela; se ele achar que ainda polui, o corte é uma linha.

---

## ⚠️ CORREÇÃO DO ITEM 4 — a primeira versão estava calibrada para UMA tela

Um agente de investigação mediu a minha solução em outras viewports e ela **não passava**.
Confirmei tudo por medição própria antes de aceitar:

| viewport | manchete invade o rapaz | rapaz cortado pela tela | corpo invade |
|---|---|---|---|
| 1920×1080 | **181px** | 0 | 0 |
| 1440×900 (onde calibrei) | 0 | 0 | 0 |
| 1280×800 | 7px | **50px** | 0 |
| 768×1024 | 0 | 0 | **196px** |

**Causa:** a figura é QUADRADA, então a altura dela é também a largura — eu estava deixando um
número em `svh` decidir quanta largura sobrava para uma manchete medida em `vw`. E o `+ gutter`
que eu somava à sangria só existe acima de ~1408px de viewport; abaixo disso ele empurrava o
próprio rapaz para fora da tela.

**Conserto — quatro tokens derivados, nenhum número solto:**

- `--a2-fig-vazio-esq: 0.05` / `--a2-fig-vazio-dir: 0.18` — as margens mortas da foto, promovidas
  de comentário a token (eram a mesma medição por coluna, só que enterrada em prosa).
- `--a2-fig-assunto: 0.77` — a fração que é pessoa, derivada das duas acima.
- `--a2-palavra: --a2 * 4.05` — "precisou", a palavra mais longa da manchete. Medida em canvas com
  a fonte servida: **4,032 × --a2**; os 4,05 são 0,4% de margem.
- `--a2-fig-h` ganhou **teto**: `min(80svh, (min(maxw,100vw) − palavra − 2·gutter) / 0.77)`.
- `--a2-fig-sangra` = margem morta + `min(gutter, folga real até a borda)` — o `min` é o conserto
  do rapaz cortado.
- `--a2-col` = a coluna de texto, derivada de onde o ASSUNTO começa; aplicada como `max-width` na
  manchete e como `min(34ch, --a2-col)` no corpo. **Esta era a peça que faltava:** limitar só a
  figura garante que a PALAVRA caiba, não impede a LINHA de atravessar.
- `- 1ch` no fim de `--a2-col`: margem de medição. A varredura foi em 72 colunas de um render de
  720px, ou seja ±10px de incerteza na borda do assunto; sem a folga o corpo encostava 5px.

**Depois, medido em 1920×1080, 1440×900, 1280×800, 768×1024 e 375×812:** invasão da manchete
**0**, invasão do corpo **0**, rapaz cortado **0**, desvio do pé figura/texto **0**, sem rolagem
horizontal em nenhuma.

## Erros meus neste lote, todos corrigidos

1. **Quebrei o CSS inteiro DUAS VEZES**, do mesmo jeito: inserindo comentário depois de um `*/`
   que já fechava o bloco. A página deu 500 nas duas. Achado no reload seguinte em ambas.
   Validação que passei a usar: contar `/*` e `*/` e conferir o saldo (hoje 143/143, saldo 0).
   Os erros de sintaxe que aparecem no console do painel são desses momentos e ficam no histórico.
1b. **Calibrei o item 4 numa viewport só** — o erro mais grave do lote, e não fui eu que peguei:
   veio da investigação em paralelo. Ver a seção de correção acima.
2. **`aria-hidden` num elemento com `alt` significativo** na foto da batida B — contradição.
3. **`color: inherit`** no rótulo da nota achando que herdaria a cor da outra classe do mesmo
   elemento; `inherit` pega a cor do PAI. O certo era não declarar nada.
4. **`sizes` errado duas vezes** na foto nova (38vw sem contar o recorte do `cover`, depois 55vw
   sem saber do client hint).

## ✅ Defeito de acessibilidade corrigido (fora da lista, vale para as 6 LPs)

`marketing.css:212` — `.mkt-world a { color: inherit }` (especificidade **0,1,1**) vencia
`.mk-skip { color: var(--mk-cta-ink) }` (**0,1,0**), e o link "Pular para o conteúdo" renderizava
`#0f172a` sobre `#2563eb` = **3,45:1**, contra os 4,5 que 15,2px/700 exige. Justo o elemento que só
existe por acessibilidade era o único que reprovava.

Corrigido virando `.mkt-world :where(a)` — `:where()` tem especificidade **zero**, então o reset
passa a valer 0,1,0 e qualquer classe que declare `color` ganha, que é o que um reset deve fazer.
Medido depois: **5,17:1**, branco sobre azul. Os outros links do mundo continuam herdando.

## Achado de passagem, NÃO corrigido (decidir no item 6)

`StickyMobileCta` renderiza dentro da v3 um `.mk-sticky-cta` com botão **âmbar `#eab444`**
("Ver como funciona" → `/barbeiros/como-funciona`), mas ele está `display: none` em TODOS os
viewports testados (1440×900 e 375×812). É um CTA morto na árvore — e ao mesmo tempo a prova de que
**o âmbar `#eab444` já é um token real do mundo barbeiros** (`--mk-cta` do `marketing.css` base, que
a v3 sobrescreve para azul). Se o item 6 precisar de amarelo, ele não precisa ser inventado.
Confirma também que a página não mostra amarelo nenhum hoje, em nenhuma largura.

# Auditoria de cor — LP barbeiros v3

status: concluído

Regra do cliente: **"quero 8 ou 80. sem essa de tons pasteis, opacidade reduzida
etc. Quero branco, ou azul ou amarelo E PRONTO."**

Escopo lido: `v3.css` (1145 linhas), `Dobra.tsx`, `Ato2.tsx`, `Morph.tsx`,
`Roda.tsx`, `dados.ts`, `geometria.ts`, `barbeiros/v3/page.tsx`.
Fora de escopo: `trilha.ts` (outro agente).

Caminho-base (todos os arquivos, exceto quando dito):
`/Users/vaskfamily/Documents/Claude/Projects/Ludi/01 Em Execução/maisa-app/src/app/(marketing)/_lib/barbeiros/v3/`

---

## VEREDITO EM UMA LINHA

A página não tem **um pixel de amarelo**. Ela tem **três azuis cheios** (blue-500,
600, 700), **branco puro**, e **seis cinzas azulados** que o próprio CSS chama de
"slate" — mais **nove transparências**. O que o cliente chama de "tons pastéis" é
literalmente a paleta de tinta desta página: `--mk-ink-soft`, `--mk-muted` e
`--mk-bg-deep` são exatamente isso.

Contagem: **19 MATAR · 9 TROCAR · 9 CUIDADO** (37 achados).

---

## 1. MATAR — decoração pura, sai sem custo

### 1.1 O halo da roda — o maior meio-tom da página

| campo | valor |
|---|---|
| arquivo:linha | `v3.css:306-320` (`.lp-v3 .lp3-roda::before`) |
| propriedade | `background: radial-gradient(circle, color-mix(in oklch, var(--mk-brand) 16%, transparent) 0%, transparent 62%)` |
| cor na tela | azul-600 a 16% sobre branco = **#DCE6FC**, azul-gelo pastel, num círculo de `--o-r1 * 2.6` de diâmetro (≈900px num notebook) |
| o que faz | **decoração**: "brilho por trás da roda". Não separa nada, não dá contraste a nada, fica ATRÁS de tudo |
| classificação | **MATAR** |

Junto morre `v3.css:318` — `opacity: calc(1 - var(--lp3-p))`, que é a animação de
sumiço desse mesmo halo. Sem o halo, a declaração não tem objeto.

### 1.2 O glow do botão

- `v3.css:112` — `--mk-cta-glow: oklch(0.5461 0.2152 262.9 / 0.28)` → azul-600 a
  28% = **#C2D3F9**, lavanda-azulado pastel.
- `v3.css:544` — `.lp-v3 .lp3-btn:hover { box-shadow: 0 0 32px var(--mk-cta-glow) }`
- **o que faz**: decoração de hover. O botão já muda de `blue-600` para `blue-700`
  no mesmo hover (`v3.css:543`) — o feedback existe sem o halo.
- **MATAR** (os dois).

### 1.3 A névoa cinza sob a coroa

- `v3.css:425` (primeira metade) — `.lp3-cartao { box-shadow: 0 6px 16px oklch(0.45 0.06 260 / 0.092), ... }`
- cor na tela: cinza-azulado a 9,2% = **#F0F1F4**; mas o comentário do próprio
  arquivo (linhas 405-424) mede que a coroa **empilha 2,1 sombras em média**, o
  que compõe **18%** = **#E4E7EE**. Em prosa do próprio autor: *"64 véus somados
  viram uma névoa cinza sob o anel"*.
- **o que faz**: profundidade decorativa. O contorno do cartão é responsabilidade
  do `inset` (a segunda metade da mesma linha — ver 2.5, que NÃO morre).
- **MATAR** a sombra externa.

### 1.4 Tratamento pastel da foto do ato 2

- `v3.css:919` — `.lp3-foto { filter: saturate(0.62) contrast(0.92) brightness(1.06) }`
- **o que faz**: tira 38% da saturação da foto. É literalmente "deixar em tom
  pastel" aplicado a uma imagem. `contrast(0.92)` achata mais ainda. Foi posto ali
  para conter o teto de escurecimento que (por confissão do próprio arquivo) já
  não segura nada.
- **MATAR** `saturate` e `contrast`. `brightness(1.06)` pode ficar — ele existe
  para o fundo branco do estúdio encostar em 1,0 e sumir, que é função e não cor.

### 1.5 A opacidade da foto — MATAR por confissão do código

- `v3.css:918` — `.lp3-foto { opacity: var(--a2-fig-alfa) }`, com
  `--a2-fig-alfa: 0.7` em `v3.css:692`
- **o que faz**: teto de contraste, para a figura não escurecer o fundo abaixo de
  5,4:1 contra a tinta.
- **por que morre**: `v3.css:883-885` diz, textualmente, que *"HOJE ELE NÃO ESTÁ
  SEGURANDO NADA: a figura desceu para alinhar com o pé do texto e deixou de cruzar
  tipografia"*. E `Ato2.tsx:60-63` mede: a tinta termina em x=943, a figura só fica
  opaca em x=998 — **55px de folga**. Não há texto sobre a foto.
- **MATAR** (subir para 1). Condição única: se um dia `--a2-fig-h` voltar a ~96svh,
  o teto volta a ser necessário.

### 1.6 Tokens declarados que NINGUÉM consome nesta página

Verificado por grep: nenhum componente renderizado por `barbeiros/v3/page.tsx`
(que monta só `<Dobra>` e `<Ato2>`) lê estes tokens. Eles são herança copiada do
mundo barbeiros e não pintam um pixel aqui.

| linha | token | valor | o que seria na tela | classe |
|---|---|---|---|---|
| `v3.css:73` | `--mk-panel` | `oklch(0.9683 0.0068 248.2)` slate-100 | cinza neutro quase branco #F1F5F9 | MATAR |
| `v3.css:74` | `--mk-panel-2` | `oklch(0.9288 0.0126 255.7)` slate-200 | cinza claro azulado #E2E8F0 | MATAR |
| `v3.css:75` | `--mk-surface` | `oklch(1 0 0)` | branco puro (valor OK, decl. morta) | MATAR |
| `v3.css:91` | `--mk-border` | `oklch(0.8823 0.0570 254.2)` blue-200 | **azul-bebê pastel #BFDBFE** — o achado mais literal contra "sem tons pastéis" | MATAR |
| `v3.css:92` | `--mk-line` | `oklch(0.9288 0.0126 255.7)` slate-200 | cinza claro azulado | MATAR |
| `v3.css:98` | `--mk-accent-strong` | `oklch(0.4882 0.2172 264.4)` blue-700 | azul cheio (decl. morta, 0 refs no projeto inteiro) | MATAR |
| `v3.css:99` | `--mk-accent-ink` | idem blue-700 | azul cheio (morto NESTA página) | MATAR |
| `v3.css:100` | `--mk-on-brand` | `oklch(1 0 0)` | branco (morto nesta página) | MATAR |
| `v3.css:104` | `--mk-wordmark-shadow` | `transparent` | nada — **0 refs no projeto inteiro** | MATAR |
| `v3.css:116` | `--mk-shadow` | `0 24px 55px oklch(0.45 0.06 260 / 0.16)` | sombra cinza-azul 16% (morta aqui) | MATAR |
| `v3.css:117` | `--mk-shadow-soft` | `0 12px 32px oklch(0.45 0.06 260 / 0.10)` | sombra cinza-azul 10% (morta aqui) | MATAR |

Nota: `--mk-ring` (`v3.css:111`, blue-600) **está vivo** — `.lp3-btn` carrega
`mk-focus` (`Dobra.tsx:72`) e `marketing.css:229` faz `outline: 3px solid var(--mk-ring)`.
Cor cheia, sem alfa. Não é achado.
`--mk-wordmark` (`v3.css:103` → `var(--mk-brand)`) também está vivo, via
`completa/Maisa.tsx:29`. Azul cheio. Não é achado.

### 1.7 Opacidade redundante na revelação da manchete

- `Ato2.tsx:161-162` — `initial={{ y: "108%", opacity: 0 }}` / `animate={{ y: 0, opacity: 1 }}`
- **o que faz**: no desktop a revelação já é feita por `overflow: hidden` na
  `.lp3-a2-linha` (`v3.css:809-814`) — o texto sobe por baixo de uma máscara dura.
  A opacidade ali é **redundante**. No celular ela vira o único mecanismo, porque
  `v3.css:1047-1053` transforma a linha em `display: inline` (onde `transform` é
  ignorado).
- **MATAR no desktop** / manter só onde a linha vira inline. Ou aceitar o corte
  duro no celular também — é a leitura mais "8 ou 80".

---

## 2. TROCAR — existe versão em cor cheia

### 2.1 `--mk-bg-deep` — o quase-branco azulado

| campo | valor |
|---|---|
| arquivo:linha | `v3.css:72` |
| valor | `oklch(0.9705 0.0142 254.8)` /* blue-50 #EFF6FF */ |
| cor na tela | **branco-azulado / azul-gelo a 3% de intensidade**. Chroma 0.0142 — praticamente neutro. Ninguém consegue nomear isso como "azul" |
| consumido em | `v3.css:396` (fundo do cartão) e `v3.css:698` (fundo do ato 2 inteiro) |
| **TROCAR por** | `oklch(1 0 0)` (branco puro) — ver 2.2 e 2.3 |

### 2.2 O fundo do cartão da roda

- `v3.css:396` — `.lp3-cartao { background: var(--mk-bg-deep) }`
- **o que faz**: fundo OPACO para os cartões telhados não deixarem ver-através
  enquanto a imagem carrega. Função real, cor arbitrária.
- **TROCAR por** `oklch(1 0 0)`. Nada quebra — a diferença é de 3% de luminância.

### 2.3 O fundo do ato 2 — o "degrau tonal"

| campo | valor |
|---|---|
| arquivo:linha | `v3.css:698` |
| propriedade | `.lp-v3 .lp3-ato2 { background: var(--mk-bg-deep) }` |
| o que faz | **separador**: distingue o ato 2 da dobra por uma diferença de fundo tão sutil que o próprio código a chama de "degrau tonal" |
| classificação | **TROCAR — e é aqui que mora a decisão "8 ou 80" da página** |

Duas saídas, ambas cumprem a regra:
- **80**: ato 2 em **azul-600 cheio** com tinta branca. A seção vira um bloco de
  cor. Arrasta: a manchete e o corpo viram branco, e o `mix-blend-mode: multiply`
  da figura tem de virar `screen` de novo (é o mesmo par de inversões que o
  cabeçalho do arquivo já documenta em `v3.css:62-67`).
- **8**: ato 2 em **branco puro**, e a separação passa a ser só o filete azul de
  1px que já existe (`v3.css:199-210`). Bônus: `mix-blend-mode: multiply` deixa de
  ser necessário para o recorte (branco × foto = a própria foto).

Se o ato 2 virar branco puro, morre de graça o item 3.3 (o gradiente de fusão).

### 2.4 A hierarquia de texto em cinza

| linha | token | valor | na tela | onde é usado | trocar por |
|---|---|---|---|---|---|
| `v3.css:80` | `--mk-ink-soft` | `oklch(0.4455 0.0374 257.3)` slate-600 #475569 | **cinza-ardósia médio** — azul ~85% lavado | corpo do ato 2 (`v3.css:826`) e resposta da batida B (`v3.css:980`) | `var(--mk-ink)` — mesma tinta do título |
| `v3.css:90` | `--mk-muted` | `oklch(0.535 0.0407 257.4)` #5E6E85 | **cinza-azulado médio-claro** | microrrótulo 11px (`v3.css:788`), rótulo da nota (`v3.css:989`), nota 12,8px (`v3.css:998`) | `var(--mk-brand)` nos rótulos caps (azul cheio, 5,17:1 no branco); `var(--mk-ink)` na nota |

**O que faz**: hierarquia de texto por degrau de cinza — exatamente o padrão que
"8 ou 80" abole. A hierarquia sobrevive por peso, corpo e tracking, que já estão
todos lá (`font-size: 0.6875rem`, `font-weight: 700`, `letter-spacing: 0.14em`,
`text-transform: uppercase`).

⚠️ Custo medido a considerar: `v3.css:81-89` documenta que `--mk-muted` foi
calibrado para dar 4,77:1 sobre `--mk-bg-deep`. Se o fundo virar branco puro (2.3),
essa restrição evapora e a troca fica ainda mais barata.

### 2.5 O contorno do cartão

- `v3.css:425` (segunda metade) — `inset 0 0 0 1px oklch(0.45 0.06 260 / 0.10)`
- cor na tela: cinza-azulado a 10% — um fio quase invisível.
- **o que faz**: **contraste sobre imagem**. `v3.css:397-400` explica: sobre fundo
  claro, "um retrato de fundo claro encosta na página e o cartão perde o contorno
  bem onde a coroa é mais densa". Isto NÃO é decoração.
- **TROCAR por** `inset 0 0 0 1px var(--mk-brand)` (azul cheio) ou
  `inset 0 0 0 1px oklch(1 0 0)` (branco cheio, se o fundo do palco virar azul).
  Manter o `inset` é obrigatório — ele não soma largura, e a geometria do oco
  (`v3.css:460-478`) depende disso.

### 2.6 A máscara de baixo da foto

- `v3.css:924-925` — `mask-image: linear-gradient(to bottom, #000 0, #000 88%, transparent 100%)`
- **o que faz**: os últimos 12% da foto se desfazem, para a imagem acabar na mesma
  linha em que o texto acaba. **Acabamento**, não legibilidade.
- **TROCAR por** corte reto (`mask-image: none` + a caixa terminando onde deve, ou
  um gradiente de 2 paradas coincidentes). A aresta dura É o gesto "8 ou 80".

### 2.7 Três azuis onde a regra pede um

Não violam a letra da regra (os três são azuis cheios, chroma ≥ 0.188), mas
reintroduzem hierarquia por meio-tom pela porta dos fundos:

| linha | token | valor | usado em |
|---|---|---|---|
| `v3.css:96` | `--mk-brand` | blue-600 `oklch(0.5461 0.2152 262.9)` | botão (`531`), wordmark, halo, anel de foco |
| `v3.css:97` | `--mk-accent` | blue-500 `oklch(0.6231 0.1880 259.8)` | filete divisor do palco (`207`), fio da batida B (`951`) |
| `v3.css:109` | `--mk-cta-hover` | blue-700 `oklch(0.4882 0.2172 264.4)` | hover do botão (`543`) |

**TROCAR**: consolidar `--mk-accent` em `--mk-brand` (os filetes de 1px ficam mais
firmes, não menos). O `--mk-cta-hover` é defensável — um hover precisa mudar de
alguma coisa, e mudar de azul é mais "8 ou 80" do que mudar de opacidade.

Nota: `--mk-cta` (`v3.css:108`) e `--mk-ring` (`v3.css:111`) repetem o literal
exato de `--mk-brand`. Três escritas do mesmo hex.

---

## 3. CUIDADO — remover quebra contraste, legibilidade ou o gesto

### 3.1 A opacidade do anel externo — 0.62

| campo | valor |
|---|---|
| arquivo:linha | `v3.css:356-358` — `.lp-v3 .lp3-anel[data-anel="1"] { opacity: 0.62 }` |
| efeito | os 38 cartões do anel de fora inteiros a 62% sobre branco → rostos lavados, meio-tom |
| o que faz | **profundidade**: faz o anel de fora "recuar" e o de dentro dominar. É o que impede a coroa de virar ruído uniforme de 64 rostos |
| classificação | **CUIDADO** |

Por que não é MATAR simples: `Roda.tsx:73-80` e `geometria.ts:233-239` documentam
que a opacidade tem de ser **do grupo**, nunca por cartão — com os cartões
sobrepostos ~20%, opacidade por cartão faz cada um deixar ver o de baixo através
de si e a coroa vira borrão. Ou seja: já é a versão *menos ruim* do problema.

Saída sem opacidade: o anel de fora já é 1,46× maior em raio e gira 1,46× mais
devagar. Dá para trocar recuo-por-opacidade por **recuo por escala** (cartões
menores no anel externo) — mas isso muda a geometria e o `N_ANEL` do
`geometria.ts:47-50`, ou seja não é um one-liner.

### 3.2 A máscara do campo da roda

- `v3.css:340-341` — `--lp3-fim: calc(94% + var(--lp3-p) * 6%)` +
  `mask-image: linear-gradient(to bottom, transparent 0, #000 6%, #000 var(--lp3-fim), transparent 100%)`
- efeito: os cartões nas 12h e nas 6h **dissolvem** em vez de terminar — meio-tom
  de foto sobre branco em duas faixas de 6% da altura.
- **o que faz**: `v3.css:327-339` é explícito — é **rede de segurança**, não efeito.
  Em viewports baixas o anel externo passa da borda e sem a máscara seria cortado
  em linha reta: *"um cartão cortado ao meio vira uma tira opaca de rosto"*. A
  rampa de baixo ainda FECHA conforme a roda desenrola, senão a máscara dissolveria
  54px de uma barra de 92px — justamente a coisa que o desenrolar existe para
  construir.
- **CUIDADO**. Alternativa 8-ou-80: rampa de 0% (corte reto assumido). Custo real
  e visível em telas baixas.

### 3.3 O gradiente de fusão do ato 2

- `v3.css:707-716` — `.lp3-ato2-fusao { background: linear-gradient(var(--mk-bg), transparent); height: 26svh }`
- efeito: 26svh de meio-tom contínuo entre branco e blue-50.
- **o que faz**: dissolve a aresta horizontal do degrau tonal dentro da faixa em
  que a dobra passa por cima do ato 2 (a travessia de `margin-top: -16svh`).
- **CUIDADO enquanto 2.3 não for decidido**; vira **MATAR de graça** se o ato 2
  virar branco puro (não há degrau para dissolver) ou azul cheio (aí a aresta é o
  gesto).

### 3.4 `mix-blend-mode: multiply` na figura

- `v3.css:868`
- **o que faz**: **recorte por fusão**. O branco do estúdio da foto devolve o fundo
  exato por identidade algébrica (`multiply(fundo, 1) = fundo`). É por isso que a
  foto foi escolhida pelo fundo, e não pelo assunto.
- efeito colateral de cor: multiplica a foto pelo blue-50 → a imagem inteira sai
  **tingida de azul-acinzentado**. É meio-tom por definição.
- **CUIDADO**. Remover hoje devolve um retângulo de foto com fundo branco chapado
  dentro do blue-50 — aresta visível. **Mas**: se o fundo do ato 2 virar branco
  puro (2.3), `multiply` fica desnecessário para o recorte e sai de graça, com o
  bônus de a foto voltar à cor cheia.
- ⚠️ Não envolver a `.lp3-figura` em outro elemento animado — `Ato2.tsx:183-189`
  documenta que um stacking context zera o backdrop e o retângulo cinza da foto
  reaparece sem nenhum erro no console.

### 3.5 A máscara lateral da figura

- `v3.css:869-870` — `mask-image: linear-gradient(to right, transparent 0, #000 22%, #000 100%)`
- **o que faz**: dissolve a borda esquerda da figura para ela não terminar numa
  aresta vertical dura ao lado da manchete. É o que sustenta a EMENDA 2 do
  `Ato2.tsx:47-64`.
- **CUIDADO**. Argumento a favor de matar: `v3.css:1090-1092` já desliga essa
  máscara no celular (`mask-image: none`) e a peça sobrevive — existe precedente
  de que a figura funciona com borda dura.

### 3.6 O portão da costura — a opacidade mais funcional da página

| campo | valor |
|---|---|
| arquivo:linha | `geometria.ts:285` — `opacidade: 1 - portao[c.anel] * perto`; escrita em `Morph.tsx:158` — `no.style.opacity = pose.opacidade.toFixed(3)` |
| parâmetros | `geometria.ts:206` `LIMIAR_COSTURA = 8` (px), `geometria.ts:209` `JANELA_COSTURA = 16°` |
| o que faz | **função pura**: um anel que vira reta precisa ABRIR em algum ponto, e quem cruza a abertura teleporta de uma ponta à outra. O portão apaga esse cartão |
| classificação | **CUIDADO (crítico)** |

Já foi otimizado exatamente contra esse problema (`geometria.ts:216-221`): com o
portão atrelado ao progresso, o pior caso era **salto de 47px a 68% de opacidade**;
atrelado à abertura real em pixels, o pior caso virou **4,8px a 47%**, e *"todo
salto grande acontece com opacidade ≤ 0,005"*. Ou seja: na prática o cartão já
está invisível quando a coisa importa. Trocar por `visibility` binária é possível,
mas devolve um pisca no cartão que cruza.

### 3.7 As opacidades de entrada da batida B (ligadas ao scroll)

- `Ato2.tsx:107` `falaO = useTransform(pB, [0.34, 0.62], [0, 1])`
- `Ato2.tsx:109` `respO = useTransform(pB, [0.52, 0.82], [0, 1])`
- aplicadas em `Ato2.tsx:237` e `Ato2.tsx:244`
- **o que faz**: revelação da fala e da resposta. **Não é um flash** — os valores
  intermediários ficam na tela durante ~28% da rolagem da seção. É o estado que o
  usuário mais vê.
- **CUIDADO**: o deslocamento que acompanha é de só 14px/12px (`Ato2.tsx:108,110`),
  capado de propósito por causa do atraso de scroll do iOS. Se a opacidade sair,
  sobra um movimento de 14px que praticamente não lê — a revelação some.
- Saída 8-ou-80: trocar por máscara de bloco (`overflow: hidden` + translate 100%),
  que é o mecanismo que a manchete já usa e que não passa por nenhum meio-tom.

### 3.8 Os fades de entrada da batida A

- `Ato2.tsx:138-139` (rótulo), `Ato2.tsx:174-176` (corpo), `Ato2.tsx:192-193` (figura)
- todos `opacity: 0 → 1`.
- **CUIDADO leve**: são transitórios de 0,28–0,7s, não estado de repouso. Mas se a
  regra for lida ao pé da letra ("opacidade reduzida" = qualquer valor < 1), caem.
- ⚠️ **Composição**: `v3.css:896-902` documenta que o `opacity` inline da
  `.lp3-figura` **multiplica** com o `0.7` da `.lp3-foto` durante a entrada — a
  figura passa por opacidade efetiva 0 → 0,7.
- Prova de que a página vive sem eles: `Ato2.tsx:258-264` — o bloco `<noscript>`
  já força `opacity:1!important; transform:none!important` em todos esses
  elementos. **A versão "tudo em 1" já existe, escrita e testada.**

### 3.9 A tinta — decisão, não conserto

- `v3.css:79` — `--mk-ink: oklch(0.2077 0.0398 265.8)` /* slate-900 #0F172A */
- na tela: **navy quase-preto**. Chroma 0.0398, abaixo do limiar de 0.05 → é um
  cinza-azulado escuríssimo, não um azul.
- usado em: frase da dobra (`v3.css:509`), fala da batida B (`v3.css:968`), e
  herdado por todos os `h1..h6` via `marketing.css`. **É a tinta de toda a página.**
- **CUIDADO / decisão do cliente**: a regra literal ("branco, azul ou amarelo")
  não tem uma cor de texto escura. As saídas são: preto puro `oklch(0 0 0)`
  (assumido, "8 ou 80" de verdade), ou **azul-600 como tinta** (mais radical,
   e o contraste passa: 5,17:1 sobre branco). Não dá para decidir isso na auditoria.

---

## 4. A PALETA REAL DE HOJE

Contagem por valor literal em `v3.css`. "decl." = quantas vezes o literal é
escrito; "usos" = quantos elementos desta página realmente o consomem.

| # | valor literal | nome | na tela | decl. | usos | branco/azul/amarelo puro? |
|---|---|---|---|---|---|---|
| 1 | `oklch(1 0 0)` | branco | branco puro | 4 (L71,75,100,110) | 1 (texto do botão) | ✅ **BRANCO PURO** |
| 2 | `#ffffff` | branco | branco puro | 1 (L128) | 1 (body) | ✅ **BRANCO PURO** |
| 3 | `oklch(0.5461 0.2152 262.9)` | blue-600 | azul cheio #2563EB | 3 (L96,108,111) | 4 (botão, wordmark, foco, halo) | ✅ **AZUL PURO** |
| 4 | `oklch(0.6231 0.1880 259.8)` | blue-500 | azul cheio #3B82F6 | 1 (L97) | 2 (filete, fio) | ✅ azul puro (2º azul) |
| 5 | `oklch(0.4882 0.2172 264.4)` | blue-700 | azul cheio #1D4ED8 | 3 (L98,99,109) | 1 (hover) | ✅ azul puro (3º azul) |
| 6 | `oklch(0.9705 0.0142 254.8)` | blue-50 | **branco-azulado #EFF6FF** | 1 (L72) | 2 (fundo do ato 2, fundo do cartão) | ❌ **azul 97% lavado** |
| 7 | `oklch(0.8823 0.0570 254.2)` | blue-200 | **azul-bebê pastel #BFDBFE** | 1 (L91) | 0 | ❌ **pastel literal** |
| 8 | `oklch(0.2077 0.0398 265.8)` | slate-900 | **navy quase-preto #0F172A** | 1 (L79) | 3+ (toda a tinta) | ❌ cinza-azulado escuro |
| 9 | `oklch(0.4455 0.0374 257.3)` | slate-600 | **cinza-ardósia #475569** | 1 (L80) | 2 (corpo, resposta) | ❌ **azul ~85% lavado** |
| 10 | `oklch(0.535 0.0407 257.4)` | — | **cinza-azulado #5E6E85** | 1 (L90) | 3 (rótulos, nota) | ❌ **azul ~80% lavado** |
| 11 | `oklch(0.9683 0.0068 248.2)` | slate-100 | cinza neutro #F1F5F9 | 1 (L73) | 0 | ❌ cinza |
| 12 | `oklch(0.9288 0.0126 255.7)` | slate-200 | cinza claro #E2E8F0 | 2 (L74,92) | 0 | ❌ cinza |
| 13 | `oklch(0.5461 0.2152 262.9 / 0.28)` | glow | lavanda #C2D3F9 | 1 (L112) | 1 (hover) | ❌ **alfa** |
| 14 | `color-mix(... --mk-brand 16%, transparent)` | halo | azul-gelo #DCE6FC | 1 (L315) | 1 | ❌ **alfa** |
| 15 | `oklch(0.45 0.06 260 / 0.16)` | sombra | cinza-azul 16% | 1 (L116) | 0 | ❌ **alfa** |
| 16 | `oklch(0.45 0.06 260 / 0.10)` | sombra/aro | cinza-azul 10% | 2 (L117,425) | 1 (aro do cartão) | ❌ **alfa** |
| 17 | `oklch(0.45 0.06 260 / 0.092)` | sombra | névoa #F0F1F4 (18% empilhado) | 1 (L425) | 1 | ❌ **alfa** |
| 18 | `transparent` | — | alfa 0 | 9 (L104,316,317,341×2,714,869/870,924/925) | — | ❌ **alfa** |
| 19 | **AMARELO** | — | — | **0** | **0** | ⚠️ **NÃO EXISTE NA PÁGINA** |

**Resumo da paleta**: 5 valores puros (1 branco, 3 azuis, e o `#ffffff` repetido),
**7 cinzas/lavados**, **6 valores com canal alfa**, **zero amarelo**.

O dourado foi removido de propósito e está documentado em `v3.css:55-60` — ele
dava 1,9:1 sobre branco. Se o cliente quiser amarelo de volta, ele não pode ser
tinta sobre branco; tem de ser **superfície** (fundo amarelo cheio com tinta
navy/azul), que é exatamente como o mundo terapeutas resolveu.

---

## 5. Arquivos LIMPOS (nenhuma cor, nenhuma transparência)

- `Dobra.tsx` — só marcação; a única cor vem do token `--mk-wordmark` via `<Maisa>`
- `Roda.tsx` — só variáveis geométricas (`--o-r1`, `--o-w`, `--o-h`, `--a`, `--t`, `--dur`)
- `dados.ts` — só texto
- `barbeiros/v3/page.tsx` — só metadata e composição
- `Morph.tsx` — uma única escrita de cor/alfa: `Morph.tsx:158` (o portão, item 3.6)

## 6. Fora do escopo, mas relevante

- `trilha.ts` — auditado por outro agente. `v3.css:219-235` documenta que ela
  desenha em `multiply` e some sozinha durante o desenrolar.
- `completa/Maisa.tsx:29` — wordmark, `color: var(--mk-wordmark)` = azul cheio,
  **sem `text-shadow`** (linha 31 documenta a remoção). Limpo.
- `StickyMobileCta` — o `<World>` monta em toda LP, mas `v3.css:579-582` a esconde
  em ≤560px, que é a única largura em que ela aparece. Efetivamente invisível aqui.
- As **32 fotografias** dos cartões são a maior fonte de cor fora da paleta na
  página. A regra provavelmente não governa fotografia — mas o `saturate(0.62)` do
  item 1.4 mostra que existe uma decisão de tratamento de imagem em jogo.

# 02 — Auditoria de IMAGEM (LP barbeiros v3)

status: concluído

Regra do cliente: **"ou a imagem tem opacidade maxima, ou ELA NEM APARECE, sem essa
de imagens que tem opacidade reduzida."**

Escopo: `src/app/(marketing)/_lib/barbeiros/v3/*`, `src/app/(marketing)/barbeiros/v3/page.tsx`,
assets de `public/`. Medições feitas no navegador em `localhost:3100/barbeiros/v3`
(1440×900 e 375×812) + simulação pixel a pixel do pipeline em Python.

---

## 0. De onde vêm as imagens (spoiler: não de `public/`)

A página **não usa um único arquivo de `public/`**. As duas famílias são URLs remotas
montadas em `src/app/(marketing)/_lib/imagens.ts`:

| família | construtor | URL | servido |
|---|---|---|---|
| 32 rostos da roda | `unsplashRosto(id)` — `imagens.ts:221-254` | `images.unsplash.com/photo-…?auto=format&fit=facearea&facepad=3.2&w=240&h=300&q=80` | JPEG 240×300, 13–22 KB cada (~515 KB no total) |
| figura do ato 2 | `unsplashRosto(id,900,5,4/3)` — `imagens.ts:109-113` | `…&facepad=5&w=900&h=1200&q=80`, srcSet 420/640/900/1200 | JPEG, 19 / 37 / 62 / **109 KB**; no desktop DPR2 serve o 1200×1600 |

`public/` só tem `icon.svg` e o bundle da LP de terapeutas (`public/lp/terapeutas/assets/*`),
que não é desta página. **Precedente relevante:** `public/lp/terapeutas/assets/open-peeps-sheet.png`
é PNG paletizado **com transparência** — o projeto já hospeda asset com canal alfa.

---

## 1. Inventário completo

### IMAGEM A — os 32 rostos da roda (64 cartões na tela)

- **Onde:** dobra / `Roda.tsx:103-117` (`<img>` dentro de `.lp3-cartao`), montada por `Dobra.tsx:55`.
- **Marcação:** 64 `<img>`, 32 URLs únicas (cada rosto aparece 2×). `loading="eager"`,
  `fetchPriority="low"`. Renderizados a 74×93 px (desktop, `r0`=247,5) e 66×82 px (mobile).
- **Tratamento:**

| tratamento | onde | efeito |
|---|---|---|
| **`opacity: 0.62` no anel externo** | `v3.css:356-358` | **38 dos 64 cartões** (`N_ANEL = [26, 38]`, `geometria.ts:47`) a 62%. Medido: a foto perde **38% da presença** contra o branco da página (desvio médio do branco cai de 127,7 para 79,2 em 5 rostos amostrados). |
| `mask-image` 6% em cima / 6% embaixo | `v3.css:340-341` (`.lp3-roda-campo`) | rampa alfa que dissolve ~25 px dos cartões mais externos nas 12h e nas 6h. A rampa de baixo fecha conforme `--lp3-p` vai a 1. |
| `opacity` por cartão escrita por JS | `Morph.tsx:158` ← `geometria.ts:285` | portão da costura: cartão que cruza a abertura do anel vai de 1 a 0. É transiente, ligado à **abertura em px**, e o pior salto acontece com opacidade ≤ 0,005. |
| `background: var(--mk-bg-deep)` + `box-shadow` inset 1px | `v3.css:396`, `v3.css:425` | fundo opaco atrás do cartão e fio de 1px na borda. Não abafa a foto. |
| halo radial `opacity: calc(1 - --lp3-p)` | `v3.css:306-320` | **fica ABAIXO** dos cartões (z-index 0 vs 1). Não é véu — foi movido para baixo de propósito (comentário em `v3.css:298-305`). |

- **Veredito:** **ABAFADA.** 59% das fotos da dobra estão a 62%. Motivo declarado: dar
  profundidade ao anel de fora (o recuo é do GRUPO, não do cartão — `v3.css:344-350` — para
  os cartões sobrepostos não vazarem uns pelos outros). **Não há texto por cima**: o oco é
  geometricamente garantido (`v3.css:460-478`, folga de 4,4% de r0). Ou seja: a opacidade é
  puramente estética, não protege legibilidade nenhuma.

### IMAGEM B — a figura do ato 2 ("o cliente que saiu da fila")

- **Onde:** ato 2, batida A / `Ato2.tsx:190-211` (`.lp3-figura` > `img.lp3-foto`).
- **Servido:** `photo-1666358086975-a98c4c908603`, JPEG 1200×1600 no desktop DPR2 (109 KB).
  Os 4 cantos são exatamente (255,255,255) — confirmado.
- **Tratamento (é a imagem mais tratada do projeto):**

| tratamento | onde | efeito medido |
|---|---|---|
| **`opacity: 0.7`** | `v3.css:918` ← `--a2-fig-alfa`, `v3.css:692` | o preto mais escuro da foto (0,0,0) sai na tela como **(79,81,84)** — cinza médio. Luminância mínima do assunto: 0,0819 em vez de 0,0000. |
| **`mix-blend-mode: multiply`** | `v3.css:868` | recorte por identidade algébrica (`multiply(fundo,1)=fundo`) contra `--mk-bg-deep` = blue-50 `#EFF6FF`. |
| `filter: saturate(0.62) contrast(0.92) brightness(1.06)` | `v3.css:919` | dessatura 38% e levanta o meio-tom. |
| **máscara lateral** `linear-gradient(to right, transparent 0, #000 22%, …)` | `v3.css:869-870` (só desktop) | **32,4% da área do assunto** fica com alfa < 1; **17,3% fica abaixo de 0,5**. O assunto começa em x=3,7% do quadro, ou seja o braço/ombro esquerdo cai dentro da rampa. |
| máscara inferior `#000 88% → transparent 100%` | `v3.css:924-925` | dissolve os últimos 12% da altura. |
| `opacity 0 → 1` inline (entrada) | `Ato2.tsx:192-194` | transição, termina em 1. |
| `.lp3-ato2-fusao` (gradiente `--mk-bg → transparent`, 26svh) | `v3.css:707-716` | está em z-index 0, **abaixo** da figura (z-index 2) — mas como a figura é `multiply`, ele faz parte do backdrop com que ela mistura. |

- **Alfa efetivo médio sobre a pessoa = máscara 0,830 × opacity 0,70 = **0,581**.**
- **Força contra o fundo:** desvio médio do fundo cai de 61,29 para **37,58** → a imagem
  aparece com **61,3% da força que tem**.

- **Veredito:** **MUITO ABAFADA.** Motivo declarado: teto de escurecimento para o texto
  continuar legível quando a figura o cruza (`v3.css:880-907`).

---

## 2. O `mix-blend-mode: multiply` — medido, e ele é o menos culpado

O medo era que o `multiply` matasse os brancos DENTRO da foto (camisa, dente, reflexo).
**Nesta foto, não mata.** Medido no recorte que vai ao ar (crop 1:1, `object-position: 50% 46%`):

- fundo de estúdio (branco ligado à borda): **68,3%** do quadro
- branco **ilhado dentro do assunto**: **84 px = 0,03%** da área da pessoa
- altos-luzes (≥225 de média) no assunto: **0,54%**

Erro médio de cor contra a foto original, **só na área da pessoa**:

| cenário | erro médio |
|---|---|
| recorte de verdade (alfa, composição normal) | 0,00 |
| `opacity: 1` **sem** filter + multiply | **2,44 / 255** |
| `opacity: 1` **com** filter + multiply | 8,53 / 255 |
| **hoje** (`opacity .70` + filter + multiply) | **56,82 / 255** |

**Conclusão: o `multiply` é ~96% inocente.** Com a foto certa (fundo branco puro, camiseta
escura — que é exatamente o critério nº 1 documentado em `imagens.ts:82-108`) ele é
praticamente indistinguível de um recorte real. **Quem abafa a imagem é o `opacity: 0.7`,
depois a máscara lateral, depois o filter.**

**Não existe versão com alfa na fonte:** testado `?fm=png` na foto do ato 2 → `IHDR colortype 2`
(RGB, **sem** canal alfa). Unsplash/imgix não remove fundo. Um recorte de verdade exigiria
hospedar o PNG/WebP com alfa em `public/` (o projeto já faz isso em `open-peeps-sheet.png`).

---

## 3. ⚠️ Dois erros no próprio código, achados na medição

### 3.1 A EMENDA 2 do `Ato2.tsx` afirma o contrário do que acontece

`Ato2.tsx:56-64` diz, com estas palavras: *"HOJE A FIGURA NÃO CRUZA TEXTO NENHUM"*, com a
medição *"a tinta de 'Ele não precisou' termina em x=943 e a máscara da figura só fica opaca
em x=998 — 55px de folga"*.

Medido agora em 1440×900:

| | valor |
|---|---|
| tinta de "Ele não precisou" termina em | x = **943** ✅ (bate) |
| borda esquerda da figura | x = **699** |
| onde a máscara fica 100% opaca (699 + 22%·720) | x = **857**, não 998 |
| **invasão da linha 1 na parte 100% opaca** | **+86 px** (não −55) |

E não é sobreposição só de caixa: na banda exata da palavra "precisou" (x 857–943, y 328–450),
**58,9% dos pixels são a pessoa**, com mínimo de 12/255 (cabelo/ombro quase preto).
`houveSobreposicao: true`.

### 3.2 A conta de contraste do `v3.css:890-894` tem erro de gama

O comentário faz `Y = 0,926 × 0,30 = 0,278` e conclui **5,4:1**. Mas o `multiply` age no valor
**codificado** em sRGB, não na luminância: o certo é `Y × 0,30^2.4 = 0,0509` → **1,71:1** no
pior caso teórico. Medido nos pixels reais sob a palavra:

| cenário | pior contraste | mediana | % da banda abaixo de 3:1 |
|---|---|---|---|
| **hoje** (`opacity .70` + filter) | **2,56:1** | 8,33:1 | **2,5%** |
| `opacity 1.0` + filter | 1,00:1 | 5,89:1 | 26,1% |
| `opacity 1.0` sem filter (= recorte real) | 1,00:1 | 5,41:1 | 30,0% |

O limiar WCAG para 112px/800 é **3:1**. **A página já reprova hoje** (2,56:1), com o teto de
0,7 no lugar. Ou seja: o `opacity: 0.7` **cobra o preço da imagem abafada e não entrega a
garantia que promete**.

---

## 4. O que dá para levar à força cheia, e como

| # | imagem | ação | risco | pré-requisito |
|---|---|---|---|---|
| 1 | figura do ato 2 **no celular** | `opacity: 1` | **zero** | nenhum. Medido em 375×812: a figura é `position: relative`, entra no fluxo depois do corpo, `mask-image: none`, e `mancheteCruzaFigura=false` / `corpoCruzaFigura=false`. O teto de 0,7 ali não protege absolutamente nada. |
| 2 | anel externo da roda (38 cartões) | remover `opacity: 0.62` (`v3.css:357`) | baixo | nada de texto cruza a coroa (garantia geométrica em `v3.css:460-478`). Perde-se o recuo de profundidade → devolver com **escala** (cartão externo ~0,86× do interno) e/ou sombra, que são pistas de profundidade que não mexem em alfa. |
| 3 | máscara lateral da figura (desktop) | remover | médio | ela existe para a foto não terminar num retângulo duro contra o texto. Só sai junto com um **recorte de verdade** (item 5) — a silhueta vira a própria borda. |
| 4 | `filter: saturate(0.62) …` | remover | baixo | custo medido de mantê-lo é pequeno (8,53 vs 2,44 de erro), mas `saturate(0.62)` é 38% de dessaturação — mesma família de "abafar". Tirar exige checar a promessa "luz quente, sem filtro azulado" do DS. |
| 5 | figura do ato 2 **no desktop** | `opacity: 1` | **alto SE feito sozinho** | **Consertar antes a colisão do 3.1.** Com a manchete ainda cruzando, 26–30% da banda de "precisou" cai abaixo de 3:1 e há pixels a **1,00:1** — a palavra some no ombro. Fixes possíveis: (a) quebrar a manchete mais cedo, (b) empurrar a figura para a direita / encolher, (c) reposicionar o bloco de texto. Só depois `opacity: 1`. |

**Sobre o "recorte de verdade":** não existe pronto (Unsplash não serve alfa). Faria sentido
gerar um WebP/PNG com alfa e hospedar em `public/lp/barbeiros/` — o repo já tem precedente.
Mas atenção: **um recorte NÃO resolve o problema de legibilidade**, porque o que apaga o texto
são os pixels escuros da própria pessoa, não o fundo branco. Recorte resolve a máscara lateral
(item 3) e libera mover a figura livremente; a colisão continua sendo geometria.

**O que NÃO precisa mudar:** o `mix-blend-mode: multiply` sobre esta foto é essencialmente
lossless (2,44/255 de erro na área da pessoa). Não é ele que está abafando nada.

---

## Anexo — arquivos e linhas

- `src/app/(marketing)/_lib/barbeiros/v3/v3.css:357` — `opacity: 0.62` (anel externo)
- `src/app/(marketing)/_lib/barbeiros/v3/v3.css:692` — `--a2-fig-alfa: 0.7`
- `src/app/(marketing)/_lib/barbeiros/v3/v3.css:918-919` — `opacity` + `filter` da foto
- `src/app/(marketing)/_lib/barbeiros/v3/v3.css:868-872` — `multiply` + máscara lateral
- `src/app/(marketing)/_lib/barbeiros/v3/v3.css:924-927` — máscara inferior
- `src/app/(marketing)/_lib/barbeiros/v3/v3.css:340-341` — máscara do campo da roda
- `src/app/(marketing)/_lib/barbeiros/v3/v3.css:880-907` — a conta de contraste com erro de gama
- `src/app/(marketing)/_lib/barbeiros/v3/Ato2.tsx:47-64` — EMENDA 2 (afirmação desatualizada)
- `src/app/(marketing)/_lib/barbeiros/v3/Morph.tsx:158` — `opacity` por cartão (portão da costura)
- `src/app/(marketing)/_lib/imagens.ts:109-113` e `:221-254` — as URLs

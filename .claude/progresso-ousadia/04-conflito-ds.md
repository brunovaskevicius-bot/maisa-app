# 04 — Conflito: diretriz "8 ou 80" x design system maisa

status: concluído

DS lido na íntegra em
`/Users/vaskfamily/Documents/Claude/Projects/Ludi/01 Em Execução/maisa-app/.claude/skills/maisa-design/`
(readme.md, SKILL.md, styles.css, tokens/*.css, guidelines/*.card.html, _ds_manifest.json,
_adherence.oxlintrc.json, components/*.css, ui_kits/).

## Diretrizes do cliente (as 4)
- **D1 — Cor binária:** "quero 8 ou 80. sem essa de tons pasteis, opacidade reduzida etc. Quero branco, ou azul ou amarelo E PRONTO"
- **D2 — Imagem:** "ou a imagem tem opacidade maxima, ou ELA NEM APARECE"
- **D3 — Densidade/tipografia:** "Deixe o minimo de espaco em branco possivel, use fontes grandes, ousadas, com personalidade"
- **D4 — Sem vazio:** "Sempre que notar UM BLOCO de coisa sem nada, coloque algo lá"

---

# RESPOSTA DIRETA: quais são o azul e o amarelo oficiais?

**Não existem.** A marca maisa não tem azul de marca nem amarelo de marca.
`readme.md` linha 16 registra o clima definido na entrevista: *"clima de cor **creme + verde-mata + âmbar**"*.
`tokens/colors.css` linha 2 repete: `/* Base quente: creme + verde-mata + âmbar. Só tema claro. */`

O que existe de mais próximo, com valor exato (`tokens/colors.css`):

| Papel | Token | Hex | O que é de fato |
|---|---|---|---|
| Branco | `--white` = `--surface-card` | **#FFFFFF** | existe e é o fundo de card |
| ("branco" da página) | `--surface-page` = `--cream-100` | **#F7F2E9** | **creme, não branco** |
| Azul (fill) | `--blue-500` = `--info` | **#2F6F8F** | azul-petróleo **dessaturado**; papel semântico = "informação / em análise" |
| Azul (texto) | `--blue-600` = `--info-text` | **#245A75** | 7,52:1 sobre branco |
| Azul claro | `--blue-50` / `--blue-100` | **#EDF3F7** / **#D6E5EF** | só isso — a rampa azul tem 4 degraus, não 10 |
| "Amarelo" (fill) | `--ochre-400` = `--accent` = `--warning` | **#E09A34** | é **âmbar/mostarda**, não amarelo; papel = acento + "atenção" |
| "Amarelo" (texto) | `--ochre-700` = `--accent-text` | **#7E4A12** | 7,3:1 sobre branco |
| Rampa âmbar completa | `--ochre-50…700` | #FDF4E6 · #FAE6C6 · #F3CE93 · #EBB25E · **#E09A34** · #C97F1E · #A56316 · #7E4A12 | |

**Cor primária real da marca hoje:** verde-mata `--brand` = `--green-600` = **#1F6749**.

### Consequência
Aplicar "branco, azul ou amarelo E PRONTO" com os tokens que existem hoje dá:
`#FFFFFF` + `#2F6F8F` + `#E09A34`. Isso **não é 8 ou 80** — é um petróleo apagado com uma mostarda.
E rouba os dois sinais semânticos do produto (azul = info, âmbar = atenção).

Se o cliente quer 8-ou-80 de verdade, **é preciso cunhar tokens novos**. Par testado e aprovado em WCAG
(cálculos rodados nesta sessão):

```
--electric-blue: #0B3FD9     --hi-yellow: #FFD400
```

| Par | Contraste | AA texto normal (4.5) |
|---|---|---|
| branco sobre #0B3FD9 | 7,70:1 | passa |
| #0B3FD9 sobre branco | 7,70:1 | passa |
| #FFD400 sobre #0B3FD9 | 5,38:1 | passa |
| #0B3FD9 sobre #FFD400 | 5,38:1 | passa |
| tinta #171512 sobre #FFD400 | 12,73:1 | passa |
| **#FFD400 sobre branco** | **1,43:1** | **REPROVA** |
| **branco sobre #FFD400** | **1,43:1** | **REPROVA** |

=> A única restrição que sobrevive ao "8 ou 80": **amarelo nunca é cor de texto sobre branco, e branco
nunca é texto sobre amarelo.** É exatamente a regra que o DS já tem para o âmbar. Ela não se apaga.

---

# CONFLITOS, ORDENADOS POR DUREZA

## TIER 1 — MECÂNICO: o lint reclama sozinho
Arquivo: `.claude/skills/maisa-design/_adherence.oxlintrc.json`
**Nota de severidade:** todas as regras estão em `"warn"`, não `"error"` — elas sujam o output, não quebram o build.

### C1. Hex cru proibido
Citação (linha 36-37):
> `"selector": "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]"` · `"message": "Raw hex color — use a design-system color token via var()."`

Contraria **D1**. Qualquer `#0B3FD9` / `#FFD400` escrito direto no JSX é sinalizado.
**Dureza:** invariante de *consistência entre produtos* (razão declarada na própria mensagem: "use a design-system color token"). Não é estética — é rastreabilidade de token. Não se apaga; se satisfaz cunhando o token.

**Emenda proposta:**
> *Tokens de campanha.* Uma superfície de aquisição pode introduzir **no máximo 2 cores novas**, e só via token declarado em `tokens/colors.css` com prefixo `--camp-`. Hex cru continua proibido em componente, página e CSS: a cor nova entra como `--camp-blue: #0B3FD9` e é consumida por `var()`. Todo token `--camp-*` precisa de uma linha de comentário com a razão da campanha e a data de revisão.

### C2. Valor em px cru proibido
Citação (linha 40-41):
> `"selector": "Literal[value=/\\b\\d+px\\b/]"` · `"message": "Raw px value — use a design-system spacing token via var()."`

Contraria **D3**. A escala tipográfica para em `--text-8xl:96px` e a de espaço em `--space-40:160px`. Qualquer `font-size: 140px` ou `padding: 6px` fora da escala vira literal px.
**Dureza:** consistência (razão declarada). Emendável.

**Emenda proposta:**
> *Extensão da escala, não abandono dela.* Para tipografia de impacto em superfície de aquisição, a escala ganha três degraus no mesmo passo ~1,22: `--text-9xl:120px`, `--text-10xl:148px`, `--text-11xl:180px`. Acima de `--text-8xl` o uso é limitado a **no máximo 2 elementos por página** e o texto precisa ter `line-height` ≤ 0,95 e `text-wrap: balance`. Continua proibido px cru: use o token.

### C3. Famílias tipográficas travadas em 3
Citação (linha 44-45):
> `"selector": "Literal[value=/font-family\\s*:\\s*(?!['\\\"]?(?:Bricolage Grotesque|Figtree|JetBrains Mono))/i]"` · `"message": "Font not provided by the design system. Available: Bricolage Grotesque, Figtree, JetBrains Mono."`

Reforçado em `_ds_manifest.json` → `x-omelette.fontFamilies: ["Bricolage Grotesque","Figtree","JetBrains Mono"]`.
Contraria **D3** ("fontes ... com personalidade") se o cliente quiser uma face nova.
**Dureza:** consistência + performance (cada família nova é um download). Emendável com teto.

**Emenda proposta:**
> *Face de campanha.* Uma superfície de aquisição pode carregar **1 (uma)** família adicional, só em peso display e só para títulos acima de `--text-5xl`. Corpo, UI e mono permanecem em Figtree / JetBrains Mono sem exceção. A família nova entra em `tokens/typography.css` como `--font-campaign` e no `fontFamilies` do manifest. Orçamento: o total de webfont da página não passa de 120 KB.

### C4. Nenhum componente tem variante azul ou amarela
Citações (linhas 80-81, 96-97, 64-65):
> `"<Button> variant must be one of 'primary' | 'secondary' | 'soft' | 'ghost' | 'accent' | 'danger'."`
> `"<Card> variant must be one of 'default' | 'flat' | 'raised' | 'sunken' | 'accent' | 'inverse'."`
> `"<Badge> tone must be one of 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info'."`

Contraria **D1**: não existe API para expressar "azul" ou "amarelo" — só `accent` (âmbar) e `info` (petróleo), e ambos carregam significado semântico.
**Dureza:** contrato de API + consistência. Emendável só somando variante, nunca redefinindo `accent`/`info`.

**Emenda proposta:**
> *Variantes de campanha.* `Button`, `Card` e `Badge` ganham a variante `campaign`, disponível **apenas** em rotas de aquisição. Ela usa `--camp-blue` / `--camp-yellow` e **não** reaproveita `accent` nem `info`: as semânticas de "atenção" e "informação" continuam apontando para âmbar e petróleo dentro do produto, para não quebrar o aprendizado do dono do negócio.

---

## TIER 2 — INVARIANTE COM RAZÃO TÉCNICA (não se apaga; emenda com limite numérico)

### C5. Âmbar nunca é texto sobre branco (WCAG)
Arquivo: `guidelines/color-pairs.card.html`, linha 4. Citação literal:
> "Nunca âmbar 400 como cor de texto sobre branco (2.3:1). Para texto em âmbar use `--accent-text`."

Repetido em `readme.md` linha 62: *"Nunca como cor de texto sobre branco (use `--accent-text`)."*
Contraria **D1**. "Branco ou amarelo E PRONTO" leva direto a texto amarelo sobre branco.
**Dureza: INVARIANTE TÉCNICO DURO.** Razão declarada e numérica: 2,3:1 (medi 2,38:1). AA exige 4,5:1. Medi também: amarelo #FFD400 sobre branco = **1,43:1**. Ficar 8-ou-80 piora o problema, não resolve.

**Emenda proposta:**
> *Amarelo é superfície, nunca tinta.* Em qualquer superfície da marca, amarelo (`--accent`, `--camp-yellow` e derivados ≤ 500) é **cor de preenchimento**, nunca cor de texto. Texto sobre amarelo é `--ink-900` (≥ 7:1 medido). Texto amarelo só é permitido sobre superfície com contraste medido ≥ 4,5:1 para texto normal e ≥ 3:1 para texto ≥ 24px/700 — na prática, só sobre `--camp-blue` (5,38:1) ou `--surface-inverse`. Nenhum par de texto entra em produção sem o número de contraste anotado no card "Pares aprovados".

### C6. Contraste AA em todo par + alvo de toque de 44px
Arquivo: `readme.md` linha 114 (seção "Acessibilidade"). Citação literal:
> "Contraste AA em todo par de texto/fundo (ver o card "Pares aprovados"). Alvo de toque mínimo de 44px no mobile. Todo `IconButton` exige `label`. Foco sempre visível."

Token correspondente: `tokens/spacing.css` → `--tap-min:44px`.
Contraria **D1** (paleta binária tende a estourar pares) e **D3/D4** (comprimir tudo encolhe alvo de toque).
**Dureza: INVARIANTE TÉCNICO DURO** — WCAG 1.4.3 e 2.5.5 / HIG. Não se apaga em nenhuma hipótese.

**Emenda proposta:**
> *A densidade come o respiro, não o alvo.* Em superfície de aquisição a compressão pode reduzir margens e paddings livremente, mas **nenhum elemento clicável fica com área de toque abaixo de 44×44px**, e a distância entre centros de dois alvos clicáveis vizinhos não cai abaixo de 48px no mobile. Onde o visual pedir botão pequeno, o alvo é ampliado por pseudo-elemento, não pelo box visível.

### C7. Estado desabilitado é opacidade
Arquivo: `readme.md` linha 92. Citação literal:
> "**Desabilitado**: `opacity .42`, cursor `not-allowed`, sem sombra."

Código: `components/components.css:6` → `.ms-btn:disabled,.ms-btn[aria-disabled="true"]{opacity:.42;cursor:not-allowed;box-shadow:none}`; `components/components.css:34` → `.ms-iconbtn:disabled{opacity:.42;...}`; `components/forms.css:39,52` → `opacity:.5`.
Contraria **D1** ("sem essa de ... opacidade reduzida").
**Dureza: INVARIANTE FUNCIONAL** — um controle desabilitado precisa ler como desabilitado. A razão não é estética. Mas o *mecanismo* (opacidade) é substituível.

**Emenda proposta:**
> *Desabilitado sem opacidade.* Onde a diretriz 8-ou-80 vale, `opacity` é substituída por troca de token chapado: fundo `--ink-100`, texto `--ink-400`, borda `--ink-200`, sem sombra, `cursor:not-allowed`. O par resultante mantém contraste ≥ 3:1 (mínimo de componente não-textual, WCAG 1.4.11) para o estado continuar perceptível, e `aria-disabled` continua obrigatório — o sinal de estado nunca fica só na cor.

### C8. Medida de linha (line length)
Arquivo: `guidelines/type-body.card.html`, linhas 2-3. Citações literais:
> `max-width:56ch` (corpo) · `max-width:60ch` (texto secundário)

Contraria **D3** ("mínimo de espaço em branco" leva a esticar o texto na largura toda).
**Dureza: INVARIANTE DE LEGIBILIDADE** com razão conhecida (retorno de linha). Emendável com número.

**Emenda proposta:**
> *Comprimir a folga, não a linha.* Parágrafo corrido continua limitado a **≤ 75ch** em qualquer superfície (o DS usa 56ch; o teto de exceção é 75ch). Acima disso o texto vira duas colunas ou vira lista. A economia de espaço em branco vem de margem e padding, nunca de linha longa.

### C9. Ilustração não é fundo, e não fica atrás de texto
Arquivos: `readme.md` linha 100 e `guidelines/illustration.card.html` linha 34. Citações literais:
> readme: "Ilustração é **conteúdo**, nunca decoração de fundo."
> illustration card, coluna "Não pode": "**Fundo** de seção, full-bleed, ou atrás de texto de corpo."

Contraria **D2** e **D4**. O jeito natural de "não deixar bloco vazio" e "imagem em opacidade máxima" é justamente jogar arte full-bleed atrás do texto.
**Dureza: MISTA.** A parte "atrás de texto de corpo" é **invariante de legibilidade** (contraste de texto sobre imagem não é mensurável de forma estável). A parte "uma aparição por página, em bloco delimitado" (readme linha 102) é **regra de marca**, emendável.

**Emenda proposta:**
> *Imagem cheia, texto protegido.* Em superfície de aquisição a ilustração pode ocupar bloco full-bleed e aparecer **mais de uma vez por página** (teto: 4 aparições), sempre em **opacidade 1** — a diretriz "ou opacidade máxima ou não aparece" vira regra do DS e substitui qualquer marca d'água. Em troca, **texto nunca é sobreposto direto à arte**: ou o texto fica em faixa de cor chapada por cima (`--camp-blue` ou `--white`, contraste medido ≥ 4,5:1), ou fica fora do bloco de imagem. Fica proibido o meio-termo antigo (imagem a 10–30% de opacidade como textura).

---

## TIER 3 — INVARIANTE DE MARCA (razão declarada, mas a razão é identidade)

### C10. A cor primária é verde, e o verde tem razão declarada
Arquivo: `readme.md` linha 61. Citação literal:
> "**Verde-mata** `--brand: #1F6749` — ação primária, links, estado ativo, sucesso. É deliberadamente **mais escuro e menos saturado que o verde do WhatsApp**: convive com ele sem imitá-lo."

Contraria **D1** frontalmente: "azul ou amarelo E PRONTO" elimina a cor primária da marca.
**Dureza: INVARIANTE DE MARCA COM RAZÃO ESTRATÉGICA DECLARADA** (o produto vive dentro do WhatsApp). Isso não é uma exceção de LP — é troca de marca. Precisa de decisão consciente do cliente, não de emenda técnica.

**Emenda proposta:**
> *Escopo da paleta 8-ou-80.* A paleta binária branco/azul/amarelo vale **apenas em rotas de aquisição** (`/`, `/terapeutas/*`, `/barbeiros/*`). Dentro do produto — painel, app mobile e qualquer mensagem enviada ao cliente final — `--brand` continua `#1F6749`, pela razão original: o produto roda ao lado do WhatsApp e não pode competir com o verde dele nem imitá-lo. Se o cliente quiser levar azul/amarelo para dentro do produto, isso é **rebrand** e exige reescrever este readme, não uma exceção.

### C11. Semânticas: azul JÁ significa "informação", amarelo JÁ significa "atenção"
Arquivo: `readme.md` linha 64. Citação literal:
> "**Semânticas**: sucesso reaproveita o verde da marca (no maisa, "deu certo" e "é da marca" são a mesma cor), atenção usa âmbar, erro um vermelho quente `#C7452F`, informação um azul-petróleo dessaturado."

Tokens: `--warning:var(--ochre-400)` e `--info:var(--blue-500)` (`tokens/colors.css` linhas 64, 66).
Contraria **D1**: se azul e amarelo viram cor decorativa onipresente, os dois sinais de estado morrem.
**Dureza: INVARIANTE FUNCIONAL** — não é gosto, é o dono do negócio conseguir distinguir "aguardando" de "decoração".

**Emenda proposta:**
> *Semântica não empresta cor para decoração.* Onde a paleta de campanha usar azul e amarelo como cor ambiente, os estados semânticos **não podem depender só de cor**: badge e alerta de `warning` / `info` passam a exigir ícone + rótulo textual (WCAG 1.4.1, "uso de cor"). Dentro do produto, `--warning` e `--info` seguem intocados.

### C12. Fundo da página é creme, não branco
Arquivos: `readme.md` linha 59 · `tokens/colors.css` linha 42 · `tokens/base.css` linha 4 · `guidelines/color-surfaces.card.html` linha 7. Citações literais:
> readme: "Base **creme quente** (`--surface-page: #F7F2E9`) com **cards brancos** por cima — é esse contraste que dá o calor."
> color-surfaces: "Card branco sempre sobre página creme. Duas cores de fundo por tela, no máximo."
> base.css: `body{background:var(--surface-page);...}`

Contraria **D1** ("Quero branco").
**Dureza: MARCA.** A razão declarada é "é esse contraste que dá o calor" — estética com intenção, sem número. Emendável.

**Emenda proposta:**
> *Fundo binário em aquisição.* Em rota de aquisição, `--surface-page` é redefinido para `#FFFFFF` e o creme sai da página inteiramente — não vira "quase branco". A regra **"no máximo duas cores de fundo por tela"** sobrevive e fica mais dura: a página usa branco + **uma** cor de campanha por seção, alternando em blocos de borda a borda. Nada de terceira cor de fundo.

### C13. Neutros quentes: existe uma família de cinza, e ela é o texto secundário
Arquivos: `readme.md` linha 63 · `guidelines/color-ink.card.html` (subtítulo e linha 3). Citações literais:
> readme: "**Neutros quentes** (`--ink-*`) puxados para o marrom. **Nenhum cinza azulado no sistema.**"
> color-ink: "Texto: 900 forte · 700 corpo · 500 secundário · 400 sutil. Bordas: 100 sutil · 200 padrão · 300 forte."

Tokens: `--text-muted:var(--ink-500)` #6A6357, `--text-subtle:var(--ink-400)` #8B8375.
Contraria **D1**: "branco, azul ou amarelo E PRONTO" apaga `--text-muted` e `--text-subtle`, que hoje carregam toda a hierarquia secundária.
**Dureza: MISTA** — a proibição de cinza *azulado* é marca; a existência de um secundário mais claro é **hierarquia de leitura**, que é funcional.

**Emenda proposta:**
> *Hierarquia por escala, não por cinza.* Em superfície 8-ou-80, `--text-muted` e `--text-subtle` não são usados: o texto é `--ink-900` ou a cor de campanha, em opacidade 1. A hierarquia que o cinza carregava é reconstruída por **escala e peso**: o texto secundário usa no mínimo **0,62×** o tamanho do primário **ou** dois degraus de peso abaixo (700 → 400), e mantém contraste ≥ 4,5:1 sobre o próprio fundo. Nunca por opacidade.

### C14. Fundos: sem gradiente, sem textura, sem imagem full-bleed decorativa
Arquivo: `readme.md` linha 77. Citação literal:
> "Cor chapada, sempre. **Sem gradiente**, sem textura, sem padrão repetido, sem ilustração de fundo, sem imagem full-bleed decorativa."

Relação com as diretrizes: **"Cor chapada, sempre" é ALIADO de D1** (é literalmente 8-ou-80). Mas "sem imagem full-bleed decorativa" contraria **D2** e **D4**.
**Dureza: MARCA.** Emendável — ver emenda de C9, que já cobre.

### C15. Respiro de 96px entre seções — "o respiro é parte da marca"
Arquivos: `readme.md` linha 74 · `tokens/spacing.css` (`--section-y:96px`, `--card-pad:24px`, `--gutter:24px`) · `guidelines/spacing-scale.card.html` (subtítulo). Citações literais:
> readme: "Entre blocos: 24. Entre seções: **96px** (`--section-y`) — o respiro é parte da marca."
> spacing-scale: "Base 4px. 4/8/12/16 dentro de componentes, 48+ entre seções"
> readme linha 16 (entrevista): "densidade equilibrada tendendo a **arejada**"

Contraria **D3** frontalmente ("Deixe o mínimo de espaço em branco possível").
**Dureza: MARCA PURA.** A razão declarada é "é parte da marca" — nenhuma justificativa técnica. **Este é o conflito mais fácil de emendar de todos.**
Uso real hoje: `ui_kits/site/Precos.jsx`, `Secoes.jsx`, `Rodape.jsx` aplicam `var(--section-y)` em todas as seções.

**Emenda proposta:**
> *Densidade de aquisição.* Em rota de aquisição, `--section-y` cai de 96px para **40px** e `--card-pad` de 24px para **16px**. A escala base de 4px permanece — a compressão acontece escolhendo degraus menores, nunca inventando valor fora da escala. Pisos que não se atravessam: **mínimo 16px** entre dois blocos de conteúdo distintos, **mínimo 12px** entre um título e o parágrafo que ele encabeça, e o alvo de toque de 44px de C6. Abaixo desses pisos o layout deixa de ser denso e passa a ser ilegível.

### C16. Escala tipográfica: o maior papel documentado é 76px, e o display é 60px
Arquivos: `tokens/typography.css` linhas 8-10, 21-22 · `guidelines/type-scale.card.html` · `guidelines/type-display.card.html`. Citações literais:
> typography.css: `--text-6xl:60px;--text-7xl:76px;--text-8xl:96px;`
> typography.css: `--type-display:var(--weight-bold) var(--text-6xl)/var(--leading-tight) var(--font-display);`
> type-scale card: `--text-7xl` → "Hero de site" · `--text-5xl` → "H1 de marketing"
> type-display card (subtítulo): "Títulos e números grandes. Peso 700, tracking -0.03em"

Contraria **D3** ("fontes grandes"). O hero do DS é 76px; 8-ou-80 costuma pedir 120-180px.
**Dureza: MARCA / consistência.** Emendável — ver emenda de C2, que já cria `--text-9xl…11xl`.

### C17. Pesos param em 700, e 700 é "ênfase rara"
Arquivos: `tokens/typography.css` linha 18 · `guidelines/type-body.card.html` linha 5. Citações literais:
> typography.css: `--weight-regular:400;--weight-medium:500;--weight-semibold:600;--weight-bold:700;`
> type-body card: "**Bold** `700` — ênfase rara"

Contraria **D3** ("fontes ... ousadas"). Não existe 800 nem 900 no sistema, e o 700 é explicitamente racionado.
**Dureza: MARCA PURA.** Fácil de emendar — Bricolage Grotesque vai até 800 e Figtree até 900; é só declarar o token e o eixo variável.

**Emenda proposta:**
> *Peso de impacto.* A escala de peso ganha `--weight-black: 800`, disponível **só** em `--font-display` e **só** em texto ≥ `--text-5xl` (48px). A frase "700 é ênfase rara" continua valendo para corpo e UI; em título de aquisição, 700/800 é o padrão, não a exceção. Peso 800 nunca em parágrafo corrido nem em rótulo abaixo de 48px — o ganho de impacto vira ruído em tamanho pequeno.

### C18. O wordmark não pode ser caixa alta nem entrar em caixa colorida
Arquivos: `guidelines/brand-wordmark.card.html` linha 10 · `readme.md` linha 28. Citações literais:
> brand-wordmark: "Não faça: "Maisa", "MAISA", itálico, contorno, sombra, gradiente ou o nome dentro de uma caixa colorida."
> readme: "CAIXA ALTA só em rótulos micro de 11px com tracking `--tracking-caps` — e **nunca em um rótulo que contenha a palavra `maisa`**: a marca não sobrevive a `text-transform: uppercase`."

Contraria **D3** ("fontes grandes, ousadas"). O movimento 8-ou-80 mais óbvio — MAISA gigante em caixa alta dentro de um retângulo amarelo — está proibido em dois lugares diferentes.
**Dureza: INVARIANTE DE MARCA, declarado duas vezes com razão** ("a marca não sobrevive a uppercase"). Deve sobreviver à diretriz.

**Emenda proposta:**
> *Ousadia no título, não no nome.* Tipografia de aquisição pode ir a 180px, peso 800 e caixa alta **em qualquer palavra que não seja `maisa`**. O wordmark permanece minúsculo, sem contorno, sem sombra, sem gradiente e fora de caixa colorida, em qualquer tamanho — inclusive quando o resto da página está em caixa alta. Se um bloco de campanha for todo em caixa alta, o wordmark sai desse bloco.

### C19. Transparência e blur: o próprio DS obriga duas superfícies translúcidas
Arquivo: `readme.md` linha 105 · `tokens/colors.css` linha 48. Citações literais:
> readme: "Dois usos, só: a topbar do site (`rgba(247,242,233,.82)` + `blur(12px)`) e o overlay do modal (verde-900 a 44% + `blur(3px)`). Não usamos vidro fosco como decoração."
> colors.css: `--surface-overlay:rgba(12,42,30,.44);`

Contraria **D1** ("sem essa de ... opacidade reduzida"): o DS *manda* usar opacidade em dois lugares.
**Dureza: FUNCIONAL** — o overlay de modal precisa ser translúcido para mostrar o contexto por baixo; a topbar sticky precisa para não esconder conteúdo. Mas a frase "não usamos vidro fosco como decoração" já é aliada da diretriz.

**Emenda proposta:**
> *Translucidez só onde é função.* A diretriz 8-ou-80 elimina opacidade decorativa em toda superfície. Os dois usos funcionais permanecem, e ganham alternativa binária onde couber: em rota de aquisição a topbar é **chapada em opacidade 1** (branco ou cor de campanha) e o blur sai; o overlay de modal continua translúcido, porque a função é revelar contexto — e nele o valor fica travado em 44%, sem faixa de ajuste.

### C20. Sombras são, por definição, opacidade parcial
Arquivos: `readme.md` linha 86 · `tokens/shape.css` linhas 12-18 · `guidelines/shape-shadow.card.html` (subtítulo). Citações literais:
> readme: "Baixas e **quentes** — construídas sobre `rgba(23,21,18,…)`, nunca preto puro."
> shape-shadow card: "Baixas e quentes (tinta 23/21/18), nunca pretas puras"
> shape.css: `--shadow-sm:0 1px 2px rgba(23,21,18,.05),0 2px 6px rgba(23,21,18,.05);`

Contraria **D1** no espírito: sombra baixa e difusa é o oposto de 8-ou-80.
**Dureza: MARCA / estilo.** Sem razão técnica. Emendável.

**Emenda proposta:**
> *Sombra chapada em aquisição.* Em rota de aquisição, `--shadow-*` é substituído por deslocamento sólido: `--shadow-hard: 6px 6px 0 var(--camp-blue)`, opacidade 1, sem blur. O estado de foco (`--focus-ring`, anel de 3px) **não** é substituído e continua sempre visível — é acessibilidade, não decoração.

### C21. Bordas de 1px e nunca colorida de um lado só
Arquivo: `readme.md` linha 83 · `tokens/shape.css` linha 10. Citações literais:
> readme: "`1px` sempre. ... Borda **1.5px** só em checkbox e radio, para o traço não sumir. **Nunca borda colorida só de um lado** — nem em card, nem em alerta, nem em bloco de agenda."
> shape.css: `--border-width:1px;--border-width-strong:1.5px;`

Contraria **D3** ("ousadas"): o vocabulário 8-ou-80 pede traço de 2-4px.
**Dureza: MARCA / estilo,** com uma razão declarada apenas para o 1.5px ("para o traço não sumir").

**Emenda proposta:**
> *Traço de campanha.* Em rota de aquisição existe `--border-width-bold: 3px`, em cor de campanha ou `--ink-900`, aplicado nos **quatro** lados. A proibição de borda colorida em um lado só permanece — ela existe para o bloco não parecer um estado semântico que não é.

### C22. Estado vazio: o DS já resolve o "bloco sem nada", mas resolve com pouco
Arquivos: `readme.md` linha 52 · `components/feedback/EmptyState.prompt.md`. Citações literais:
> readme: "**Estados vazios** são otimistas e oferecem uma saída: *"Agenda livre hoje. Nada marcado até agora — a maisa avisa aqui assim que alguém chamar no WhatsApp."*"
> EmptyState.prompt.md: "Estado vazio com tom leve e uma ação clara."

Relação com **D4**: parcialmente **ALIADO** — o DS já proíbe deixar bloco vazio sem tratamento. Mas a resposta do DS é *uma frase curta + uma ação*, não "encher". Conflito leve.
**Dureza: MARCA / conteúdo.**

**Emenda proposta:**
> *Vazio nunca fica vazio, mas também não vira depósito.* Todo bloco sem conteúdo recebe `EmptyState` com **exatamente uma** ação. Em rota de aquisição, um bloco visualmente vazio é preenchido com prova (número, depoimento, logo, ilustração em opacidade 1) — no máximo **um** elemento de prova por bloco, para o preenchimento não virar ruído e a página continuar com uma hierarquia legível.

### C23. Movimento: nada de confete, número contando ou elemento entrando de longe
Arquivo: `readme.md` linha 95. Citação literal:
> "Nada de parallax, número contando, confete ou elemento entrando de longe. `prefers-reduced-motion` zera todas as durações."

Contraria **D4** se "coloque algo lá" virar animação de preenchimento.
**Dureza: MISTA** — a proibição em si é marca; `prefers-reduced-motion` é **invariante de acessibilidade duro** e não se toca.

---

## REGRAS DO DS QUE SÃO ALIADAS DA DIRETRIZ (não conflitam — usar como argumento)
- `readme.md` linha 89: "**Hover**: escurece um degrau (`--brand` → `--brand-hover`). ... **Nunca opacidade** como hover." → já proíbe opacidade, exatamente como D1 pede.
- `readme.md` linha 77: "Cor chapada, sempre. **Sem gradiente**, sem textura, sem padrão repetido" → 8-ou-80 puro.
- `readme.md` linha 65 / color-surfaces: "**Máximo de duas cores de fundo por tela.**" → restrição binária, compatível com "branco, azul ou amarelo E PRONTO".
- `readme.md` linha 66: "Só tema claro — não existe dark mode." → sem meio-termo.
- `readme.md` linha 90: "**Press**: `translateY(1px)` + sombra interna. Sem `scale`." → sem efeito difuso.

---

## RESUMO EM UMA LINHA
O DS não tem azul nem amarelo de marca (é creme #F7F2E9 + verde #1F6749 + âmbar #E09A34); "azul/amarelo E PRONTO" é, no nível do produto, um rebrand, e no nível de LP uma exceção que cabe. Dos 23 conflitos, **4 não se apagam** (C5 contraste do amarelo, C6 AA + 44px, C9 texto sobre imagem, C11 cor não pode ser o único sinal semântico) e **3 são só marca sem razão técnica** (C15 respiro de 96px, C17 peso máximo 700, C20 sombras difusas) — esses três se emendam sem custo.

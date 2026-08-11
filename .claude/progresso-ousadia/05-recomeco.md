# Recomeço — 06/08/2026

O cliente reprovou a LP. Aprovou **uma coisa só**: a paleta ("tudo branco como bg").
Pediu, textualmente: ficar só com a hero, tirar a faixa azul gigante ("nn faz nenhum
sentido ela existir"), trocar o CTA por um componente de vidro que ele mandou, e
apagar o resto da página — "vamos repensar ela inteira depois".

## O que saiu

| peça | onde está agora |
|---|---|
| `Ato2.tsx` | `.claude/snapshots/v3-antes-do-recomeco-2026-08-06/v3-lib/` |
| `Fecho.tsx` | idem |
| `ATO2` e `FECHO` (dados.ts) | idem |
| ~910 linhas de CSS de ato2/fecho | idem (`v3.css` inteiro) |
| a tarja (`.lp3-miolo::before`) | idem |
| `--mk-ouro` | removido; as 3 medições de contraste ficaram no comentário |

O snapshot existe porque **a pasta v3 é untracked** — o git não protegia nada disso.

## A tarja: ela consertava um problema que já estava consertado

A faixa existia por um número documentado: o `<h1>` saía a **26px** porque era
dimensionado para caber no oco da roda, que ocupava 4,6% da tela.

Esse número tinha morrido antes dela. Quando a roda passou a sangrar, `--o-r0` foi de
`min(24vw, 27.5svh)`/teto 300px para `min(34vw, 49svh)`/teto 520px — de 247px para
441px em 1440×900. O oco cresceu junto, e o corpo da manchete (`0,13 · r0`) com ele.

**Medido depois de tirar a faixa: o h1 dá 57px, dentro do oco, sem uma gota de fundo.**
Mesmo tamanho que ele tinha *sobre* a tarja. A faixa estava pintando azul de graça.

## O que precisou mudar junto

Voltar para dentro do oco custou 39px de altura (5 linhas + respiro + botão = 409px
num oco de 370). Os dois cortes:

- **entrelinha 1,06 → 0,95.** O piso foi medido em canvas com a Archivo 800 servida:
  ascendente 42,1px + descendente 10,7px sobre corpo de 57,33px = **0,921**. A 0,95
  sobram 1,7px de tinta a tinta.
- **respiro manchete↔botão 0,075 → 0,06 · r0** (33 → 26px).

E os dois números do oco (1,16 × 0,84) viraram token (`--o-oco-l`, `--o-oco-a`).
Estavam escritos só em prosa enquanto o CSS usava outra largura: o comentário
descrevia uma caixa que não existia mais.

## Verificação — SAT, não caixa alinhada aos eixos

Testei o retângulo **girado** de cada um dos 64 cartões contra o retângulo do miolo.
A primeira medição usou a caixa alinhada aos eixos e acusou colisão em 1920×1080 onde
a geometria prometia 31px de folga — a AABB de um cartão inclinado é bem maior que o
cartão. Com SAT, teoria e medição bateram no pixel: canto mais próximo a **395px**,
`0,76 · r0 = 395`.

| viewport | r0 | caixa do miolo | folga |
|---|---|---|---|
| 1920×1080 | 520 | 603 × 409 | 31px |
| 1440×900 | 441 | 512 × 372 | 19px |
| 1280×800 | 392 | 455 × 330 | 17px |
| 768×1024 | 261 | 303 × 224 | 10px |
| 375×812 | 218 | 252 × 195 | 6px |
| 320×568 | 186 | 215 × 173 | 3px |

Zero colisões em todas. Zero também em p = 0,0 … 1,0 (onze pontos da rolagem).

**A folga encolhe com a tela e a causa tem nome:** o botão tem piso absoluto (corpo
trava no `0.95rem` do clamp, altura no piso de toque de 44px). Abaixo de ~370px tudo
escala menos ele. Os 3px em 320×568 não são folga defensável — são o número que diz
onde esta composição acaba.

Morph intacto: p 0→1, espalhamento Y 1288→69px, X 1284→3958px, filete `scaleX` 0→1.

## O botão de vidro

Veio como TSX de registry: `cva` + Tailwind + quatro nomes de classe cuja CSS **não
veio junto**. Este repo não tem Tailwind nem `class-variance-authority` — instalar a
`cva` daria um botão sem estilo nenhum, porque ela só junta strings e as classes que
juntaria não existem. Reimplementado em `_lib/GlassButton.tsx` + `_lib/glass-button.css`
com a mesma API e a mesma marcação. Divergências, todas anotadas no arquivo:

1. sem `cva`/Tailwind;
2. sem `forwardRef` (é Server Component; um "use client" mandaria o botão para o
   bundle do cliente para guardar um ref que ninguém usa);
3. **pode ser `<a>`**: o único consumidor hoje NAVEGA, e um `<button>` que navega
   perde menu de contexto, nova aba e o anúncio de "link" do leitor de tela;
4. `all-unset` não foi portado — não é utilitário do Tailwind, ou seja nunca chegou
   à CSS de origem. O reset é pontual, porque `all: unset` apagaria o foco.

### Dois bugs achados no port

- **A classe de tamanho tinha de sair do botão e ir para o wrap.** No botão,
  `.glass-button--lg { font-size: 1.125rem }` fica no mesmo elemento que herdaria a
  escala externa — e declaração no elemento vence herança, por mais específico que
  seja o seletor de fora. Medido: a dobra pedia 23px pelo `--o-r0` e o botão saía a
  **18px**, calado.
- **`isolation: isolate` no wrap mataria o vidro.** `isolate` cria um *backdrop root*:
  o `backdrop-filter` do filho passaria a enxergar um backdrop vazio e viraria uma
  declaração que não faz nada, sem erro e sem diferença visual ao mexer nela.

### E o vidro não tem o que refratar aqui

Medido: a superfície do botão, composta sobre o que está atrás, dá **#ffffff** —
idêntica ao fundo da página. E nenhum dos 64 cartões passa atrás dele em nenhum
ponto da rolagem. Sobre fundo chapado, vidro é uma pílula branca de aro azul.

Contrastes: manchete **17,85:1**, wordmark e rótulo do botão **5,17:1** (a 23px/700,
que é texto grande pela WCAG). Alvo de toque 68px no desktop, 45px no piso.

## Emendas ao DS escritas (não violadas em silêncio)

- **raio:** barbeiros define `--mk-btn-radius: 8px` ("firme/urbano"); este botão é
  pílula 999px porque foi pedido assim. Limites: vale só para quem usar o
  `.glass-button-wrap`, o raio é token, e nada mais do DS é excedido.
- **foco:** o `.mk-focus:focus-visible` compartilhado impõe `border-radius: 6px` e
  **esquadrava a pílula** no foco de teclado. Devolvido no CSS do vidro.

## Aberto

- **O vidro sobre branco é uma pílula de contorno.** Se o cliente quiser o botão
  batendo mais forte, é uma linha: `--gb-vidro: var(--mk-brand)` + rótulo
  `--mk-on-brand`. Decisão dele, não minha.
- A frase da hero continua afirmando um fato sobre pessoas de banco de imagem
  (ver o aviso em `dados.ts`).

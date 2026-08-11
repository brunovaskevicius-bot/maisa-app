"use client";

import { useEffect, useRef } from "react";

/* ----------------------------------------------------------------------------
 * A POEIRA — um campo de pontos à deriva, atrás da dobra.
 *
 * Entrou em 07/08/2026 no lugar da <Trilha>, quando a roda de 64 rostos virou uma
 * fileira só. Adaptado do <Particles /> do React Bits, que o Bruno mandou como
 * referência. O gesto é o de lá; a implementação mudou em três pontos, e os três
 * são consequência de esta página ser BRANCA e de o pedido ser deixá-la MAIS LEVE.
 *
 * ── 1. NÃO É WebGL, É CANVAS 2D — e isso não é preguiça, é o pedido.
 * O original depende de `ogl` (~50kb) para rodar um shader de pontos. Instalar uma
 * biblioteca de WebGL numa dobra que está sendo reescrita PARA PESAR MENOS é andar
 * para trás: o efeito é um disco chapado por partícula, que o `arc()` do 2D desenha
 * sem shader nenhum. O projeto inteiro já é canvas-2D (era o que a trilha usava) e
 * continua sem nenhuma dependência de render.
 *
 * ── 2. O SINAL DA CINTILAÇÃO ESTÁ INVERTIDO EM RELAÇÃO AO ORIGINAL, de propósito.
 * O fragment shader de lá faz `vColor + 0.2 * sin(...)`: um termo que CLAREIA
 * metade do ciclo. Sobre o fundo escuro para o qual ele foi escrito, com partícula
 * branca, isso é brilho. Sobre o branco desta página seria apagamento — o azul
 * #2563EB (0,145 · 0,388 · 0,922) somado de +0,2 vira (0,345 · 0,588 · 1,0), que é
 * quase o fundo. A cada ciclo a partícula sumiria.
 *
 * É a regra que já estava escrita no topo do v3.css, aplicada aqui sem exceção:
 * "sobre escuro só se pode clarear, sobre claro só se pode escurecer". Então a
 * cintilação daqui só ESCURECE: `mistura` oscila em torno da base sem nunca subir
 * acima dela — o ponto pulsa entre a cor dele e um degrau mais forte, nunca em
 * direção ao branco.
 *
 * ── 3. NÃO HÁ ALFA. NENHUM. E isto é a regra da casa sendo cumprida.
 * O jeito óbvio de dar profundidade a um campo de pontos é `globalAlpha`. Só que
 * esta LP baniu alfa por escrito ("zero opacidade reduzida", e o v3.css repete:
 * "a página baniu alfa como recurso de hierarquia"). O ban continua de pé porque
 * a profundidade aqui é uma RAMPA TONAL DE CORES CHAPADAS: cada ponto é a mistura
 * do azul (ou do ouro) com o branco, calculada uma vez e pintada opaca.
 *
 * Sobre um fundo branco puro os dois são o MESMO pixel — `mix(branco, azul, 30%)`
 * é indistinguível de azul a 30% de alfa sobre branco. O que muda é o que acontece
 * quando dois pontos se cruzam: com alfa eles somariam e o encontro viraria uma
 * mancha mais escura que qualquer um dos dois; chapados, o de cima simplesmente
 * cobre o de baixo. Menos sujeira, e a regra intacta.
 *
 * LIMITE DA EXCEÇÃO (a mesma forma da emenda do amarelo, no v3.css): a rampa tonal
 * vale para os pontos deste campo e mais nada. Ela não autoriza texto, borda, ícone
 * nem filete em tom lavado — para esses, a página continua com um azul só.
 *
 * ── AS CORES SAEM DO CSS, não de props. Mesma escolha da trilha, pelo mesmo motivo:
 * o token é a fonte, e trocar o azul da página não pode exigir lembrar deste arquivo.
 * -------------------------------------------------------------------------- */

/* Reservas para o caso de o navegador não resolver os tokens. São os hexes que já
   estão escritos, como comentário, ao lado dos tokens no v3.css. */
const AZUL_RESERVA = "#2563eb";
const OURO_RESERVA = "#eab444";

/* UM EM CADA SEIS É DOURADO. O amarelo entrou na página como FUNDO, nunca como
   tinta (ouro sobre branco = 1,89:1), e um ponto de poeira não é texto — mas a
   proporção é baixa pelo mesmo espírito: ele é o acento da paleta, não metade
   dela. Medido a olho contra a referência: acima de ~1/4 o campo lê como bege e
   o azul deixa de ser a cor da página. */
const FATIA_OURO = 1 / 6;

/* A rampa de profundidade, em fração de mistura com o branco. Os dois pares são
   diferentes porque as duas cores NÃO desaparecem no mesmo ponto: o azul a 18%
   ainda se vê sobre branco; o ouro a 18% é papel. O piso do ouro é mais alto para
   ele existir, e o teto também, senão o acento nunca acontece. */
const AZUL_MIN = 0.18;
const AZUL_MAX = 0.7;
const OURO_MIN = 0.45;
const OURO_MAX = 0.85;

/* Densidade: um ponto a cada 16.000px² de palco, entre 28 e 100.
   1440×900 → 81 pontos. 390×844 → o piso de 28. O piso existe porque a conta pura
   daria 20 num celular e o campo viraria sete pontos visíveis; o teto existe
   porque acima de ~100 discos por quadro o custo começa a aparecer em máquina
   fraca, e o campo já está denso muito antes disso. */
const AREA_POR_PONTO = 16_000;
const PONTOS_MIN = 28;
const PONTOS_MAX = 100;

/* Raio em px, na base do campo (o ponto mais fundo é ~40% disto — ver `semear`). */
const RAIO_MAX = 3.4;

/* Velocidade em px por segundo, no ponto mais próximo. Lenta de propósito: o campo
   é ambiente, não é o assunto. A 10px/s um ponto atravessa 1440px em 2min24s. */
const VEL_BASE = 10;

type Ponto = {
  x: number;
  y: number;
  /** profundidade em [0,1]: 0 é o fundo, 1 é o mais próximo */
  z: number;
  vx: number;
  vy: number;
  /** fase da cintilação, para os pontos não pulsarem em uníssono */
  fase: number;
  /** velocidade angular da cintilação, em rad/s */
  ritmo: number;
  ouro: boolean;
};

/* ⚠️ QUEM CONVERTE A COR É O NAVEGADOR, NÃO ESTE ARQUIVO — e isto é a correção de
   um bug que já esteve na tela.
   A primeira versão tinha um `hexParaRgb()` escrito à mão, copiado do componente de
   referência. Só que os tokens desta página NÃO são hex: `--mk-brand` é
   `oklch(0.5461 0.2152 262.9)` e `--mk-ouro` é `oklch(0.7909 0.1291 82.9)` (os
   hexes aparecem lá só como comentário). O `parseInt("oklch(", 16)` dava NaN, a
   função devolvia [0,0,0], e o campo inteiro saía PRETO misturado com branco — ou
   seja, CINZA. Cinza é justamente o que esta LP baniu por escrito ("Depois: zero em
   cinza", no bloco de tokens do v3.css), então o bug passou de detalhe a violação.

   A reserva também não salvava: ela só entrava quando o token vinha VAZIO, e ele
   vinha preenchido — só que num formato que o parser não falava. É a forma mais
   traiçoeira desse erro: o fallback existe, parece cobrir, e não cobre.

   Um canvas de 1×1 resolve qualquer sintaxe que o navegador entenda (hex, rgb,
   hsl, oklch, color()) sem este arquivo precisar saber nenhuma delas. E ele dá a
   reserva DE GRAÇA: pelo padrão, atribuir um valor inválido a `fillStyle` é
   ignorado — o valor anterior permanece. Por isso a reserva é escrita primeiro. */
function corParaRgb(valor: string, reserva: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [0, 0, 0];
  g.fillStyle = reserva;
  g.fillStyle = valor;
  g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

/** A rampa tonal: a cor misturada com o branco, chapada. `t=0` é branco, `t=1` é a
    cor cheia. É esta função que substitui o `globalAlpha` — ver o item 3 do topo. */
function sobreBranco([r, g, b]: [number, number, number], t: number): string {
  const m = (c: number) => Math.round(255 + (c - 255) * t);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

export function Particulas() {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Lido do próprio canvas: os tokens são herdados de `.lp-v3`, que é ancestral.
       Se o navegador devolver string vazia (token não resolvido), cai na reserva. */
    const estilo = getComputedStyle(canvas);
    const azul = corParaRgb(estilo.getPropertyValue("--mk-accent").trim(), AZUL_RESERVA);
    const ouro = corParaRgb(estilo.getPropertyValue("--mk-ouro").trim(), OURO_RESERVA);

    /* `matchMedia` e não `useReducedMotion()` da Motion: aqui não há marcação a
       escolher, então não há risco de mismatch de hidratação, e isto dispensa o
       hook. O listener existe porque a preferência pode mudar com a aba aberta. */
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");

    let pontos: Ponto[] = [];
    let larg = 0;
    let alt = 0;
    let quadro = 0;
    let ultimo = 0;
    let visivel = true;

    /* DPR limitado a 2. Num aparelho de dpr 3 o terceiro degrau não se vê num disco
       de 3px, mas custa 2,25× a área de pintura — é o tipo de trabalho que só
       aparece na bateria. */
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    const semear = () => {
      const n = Math.max(PONTOS_MIN, Math.min(PONTOS_MAX, Math.round((larg * alt) / AREA_POR_PONTO)));
      pontos = Array.from({ length: n }, () => {
        const z = Math.random();
        /* Direção livre, módulo proporcional à profundidade: o que está perto anda
           mais que o que está longe. É a única pista de profundidade que o campo dá
           além do tamanho e do tom — e é de graça, porque não é parallax de scroll
           (que o DS proíbe): nada aqui reage à rolagem. */
        const ang = Math.random() * Math.PI * 2;
        const v = VEL_BASE * (0.35 + z * 0.65);
        return {
          x: Math.random() * larg,
          y: Math.random() * alt,
          z,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          fase: Math.random() * Math.PI * 2,
          /* frequências espalhadas em [0,18 · 0,50] rad/s — o ciclo mais rápido leva
             12,5s. Nenhuma é múltipla inteira de outra, então o campo nunca repete
             o mesmo arranjo de brilho. */
          ritmo: 0.18 + Math.random() * 0.32,
          ouro: Math.random() < FATIA_OURO,
        };
      });
    };

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      const nl = Math.max(1, Math.round(r.width));
      const na = Math.max(1, Math.round(r.height));
      const d = dpr();
      canvas.width = Math.round(nl * d);
      canvas.height = Math.round(na * d);
      /* `setTransform` e não `scale`: `scale` acumularia a cada remedição e depois
         do terceiro resize o campo estaria desenhando fora da tela. */
      ctx.setTransform(d, 0, 0, d, 0, 0);

      if (pontos.length === 0 || nl !== larg || na !== alt) {
        /* Reposiciona proporcionalmente em vez de semear de novo: girar o celular
           não pode fazer o campo inteiro piscar e renascer em outro lugar. */
        if (pontos.length > 0 && larg > 0 && alt > 0) {
          const kx = nl / larg;
          const ky = na / alt;
          for (const p of pontos) {
            p.x *= kx;
            p.y *= ky;
          }
        }
        larg = nl;
        alt = na;
        if (pontos.length === 0) semear();
      }
    };

    const pintar = (t: number) => {
      ctx.clearRect(0, 0, larg, alt);
      for (const p of pontos) {
        const base = p.ouro ? OURO_MIN + (OURO_MAX - OURO_MIN) * p.z : AZUL_MIN + (AZUL_MAX - AZUL_MIN) * p.z;
        /* A CINTILAÇÃO SÓ ESCURECE — ver o item 2 do topo. `sin` devolve [-1,1];
           `(s - 1) / 2` devolve [-1,0]. Multiplicado por 0,22 o termo fica em
           [-0,22 · 0], ou seja: o ponto nunca fica mais claro que a própria base,
           só desce até 22% dela e volta. Sobre branco, subir seria sumir. */
        const s = Math.sin(t * p.ritmo + p.fase);
        const mistura = base * (1 + 0.22 * ((s - 1) / 2));

        const r = RAIO_MAX * (0.4 + p.z * 0.6);
        ctx.fillStyle = sobreBranco(p.ouro ? ouro : azul, mistura);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const passo = (ms: number) => {
      quadro = requestAnimationFrame(passo);
      if (!visivel) {
        /* Marca o tempo mesmo pausado, senão ao voltar o `dt` seria o intervalo
           inteiro fora da tela e o campo daria um salto. */
        ultimo = ms;
        return;
      }
      /* dt limitado a 50ms pelo mesmo motivo que o <Morph> limitava o dele: ao
         voltar de segundo plano o delta acumulado teleportaria o campo. */
      const dt = Math.min(ms - ultimo, 50) / 1000;
      ultimo = ms;

      const t = ms / 1000;
      const margem = RAIO_MAX + 2;
      for (const p of pontos) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        /* Reentra pelo lado oposto. Com a margem, a troca acontece fora de vista —
           sem ela o ponto piscaria de uma borda à outra à vista de todos. */
        if (p.x < -margem) p.x = larg + margem;
        else if (p.x > larg + margem) p.x = -margem;
        if (p.y < -margem) p.y = alt + margem;
        else if (p.y > alt + margem) p.y = -margem;
      }
      pintar(t);
    };

    const ro = new ResizeObserver(() => {
      medir();
      /* Sem movimento o laço não roda, então quem repinta depois de um resize tem
         de ser esta linha — senão o campo ficaria esticado até a próxima navegação. */
      if (consulta.matches) pintar(0);
    });
    ro.observe(canvas);

    /* PAUSA FORA DA TELA. A dobra é a primeira seção: assim que a pessoa chega ao
       <Duelo>, este laço estaria desenhando 81 discos por quadro para ninguém. Sem
       isto o campo custa bateria pela página inteira. */
    const io = new IntersectionObserver(
      ([e]) => {
        visivel = e.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const aplicar = () => {
      cancelAnimationFrame(quadro);
      medir();
      if (consulta.matches) {
        /* O QUADRO PARADO É CONTEÚDO, não tela em branco. `t=0` congela a
           cintilação no topo da rampa (`sin(fase)` fixo), então o que fica é o
           campo inteiro, distribuído e legível — o mesmo pôster, sem o movimento.
           É o que a WCAG 2.3.3 pede, e o que o resto desta página já faz. */
        pintar(0);
        return;
      }
      ultimo = performance.now();
      quadro = requestAnimationFrame(passo);
    };
    aplicar();
    consulta.addEventListener("change", aplicar);

    return () => {
      cancelAnimationFrame(quadro);
      consulta.removeEventListener("change", aplicar);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas className="lp3-poeira" ref={tela} aria-hidden="true" />;
}

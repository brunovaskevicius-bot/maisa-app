"use client";

import { useEffect, useRef } from "react";
import { useAnimationFrame, useReducedMotion, useScroll } from "motion/react";
import { medir, portaoCostura, posicao, VOLTA_S, type Cartao, type Medidas } from "./geometria";
import { Trilha } from "./trilha";

/* ----------------------------------------------------------------------------
 * <Morph> — a roda desenrola e vira a barra que separa a dobra do ato 2.
 *
 * ── O QUE ELE NÃO FAZ, E É O PONTO: ele não renderiza um único cartão.
 * Os 64 cartões continuam saindo do servidor (ver Roda.tsx), com o giro escrito
 * em keyframe de CSS. Este componente só ADOTA essa marcação: no mount ele marca
 * a raiz com `data-vivo`, o que desliga as keyframes pelo v3.css, e passa a
 * escrever `transform` nos braços a cada quadro.
 *
 * As três coisas que isso preserva:
 *   1. SEM JS a dobra continua inteira — roda montada, girando, legível. Se este
 *      arquivo falhar em carregar, a página não vira uma pilha de fotos no centro.
 *   2. O HTML da primeira tela continua vindo pronto do servidor; nada de um
 *      primeiro quadro com 64 cartões empilhados esperando hidratação.
 *   3. O bundle de cliente não carrega 64 <img> em props.
 *
 * Ler o DOM em vez de recriar a lista em React é deliberado: se o cliente
 * remontasse os cartões por conta própria, passariam a existir DUAS descrições da
 * mesma roda, e um dia elas divergiriam. Os ângulos vêm escritos nos data-* que o
 * servidor emitiu — uma fonte só, impossível de dessincronizar.
 *
 * ── POR QUE UM rAF E NÃO 64 MotionValues.
 * `useTransform` por cartão criaria 64 assinaturas React por quadro. Aqui é UM
 * laço que escreve 64 `style.transform` — exatamente o volume do componente de
 * referência que originou esta peça, e que roda liso. O que se perde é o caminho
 * de `ScrollTimeline` nativa (a Motion só acelera quando recebe uma ANIMAÇÃO, não
 * um callback); o que se ganha é poder calcular uma posição que não é
 * interpolação linear de nada — ver `posicao` em geometria.ts.
 *
 * O atraso de scroll do iOS, que normalmente condena esse caminho, quase não
 * aparece AQUI: o palco está pinado, então não há fundo se movendo contra o qual
 * a roda possa "nadar". O que atrasa um quadro é o desenrolar, sobre um plano
 * parado.
 *
 * ── E O MESMO LAÇO MOVE A TRILHA.
 * O traçado do fundo (trilha.ts) não tem `requestAnimationFrame` próprio: ele
 * recebe `quadro(dt, p)` daqui. Um segundo rAF disputando o mesmo orçamento com
 * este seria o jeito mais barato de engasgar os dois, e o `p` que a trilha precisa
 * para sumir durante o desenrolar já está calculado nesta linha.
 * -------------------------------------------------------------------------- */

type Braco = { no: HTMLElement; cartao: Cartao };

export function Morph({ children }: { children: React.ReactNode }) {
  const pista = useRef<HTMLElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);

  const bracos = useRef<Braco[]>([]);
  const medidas = useRef<Medidas | null>(null);
  const trilha = useRef<Trilha | null>(null);
  const fase = useRef(0);

  /* O ALVO É A PISTA, NUNCA O PALCO — e este é o erro nº1 deste padrão.
     Um elemento `sticky` não se move em relação à viewport durante o pin: é a
     definição de pin. Se o alvo fosse o palco, "topo encosta no topo" e "fundo
     encosta no fundo" cairiam no MESMO scrollY e o progresso saltaria 0→1 num
     quadro. A pista é uma caixa de 200svh que nunca se move em relação ao
     documento — medida sem ambiguidade em qualquer navegador.

     E o par de arestas é exato, não aproximado: com pista de 200svh e palco de
     100svh, "start start" cai no primeiro quadro do pin e "end end" no último.
     A barra termina de se formar exatamente na costura com o ato 2. */
  const { scrollYProgress } = useScroll({ target: pista, offset: ["start start", "end end"] });

  /* `useReducedMotion()` devolve null no servidor e true/false no cliente, então
     ele NÃO pode escolher marcação — daria mismatch de hidratação. Aqui ele só
     decide se o laço roda. Quem cuida do layout é a media query no v3.css, que
     encolhe a pista e solta o palco antes do primeiro paint. */
  const semMovimento = useReducedMotion();

  useEffect(() => {
    const raiz = palco.current;
    if (!raiz) return;

    /* Os ângulos vêm do HTML do servidor. Se um data-* faltar, o cartão fica de
       fora do laço em vez de virar NaN e sumir da tela. */
    bracos.current = Array.from(raiz.querySelectorAll<HTMLElement>(".lp3-braco")).flatMap((no) => {
      const a = Number(no.dataset.a);
      const anel = Number(no.dataset.anel);
      const tilt = Number(no.dataset.t);
      if (!Number.isFinite(a) || (anel !== 0 && anel !== 1) || !Number.isFinite(tilt)) return [];
      return [{ no, cartao: { a, anel: anel as 0 | 1, tilt, rosto: 0 } }];
    });

    /* O raio vem do CSS, já resolvido em px — o v3.css registra `--o-r0` com
       `@property` justamente para isto. Assim a regra do raio (o clamp, o piso, o
       teto, a inversão no celular) existe num lugar só, e este arquivo não tem
       opinião sobre tamanho de tela.
       Lido da `.lp3-roda`, que é onde a propriedade é declarada — no palco ela
       ainda seria o `initial-value` do registro. */
    const roda = raiz.querySelector<HTMLElement>(".lp3-roda");

    /* A trilha só existe se o laço vai rodar. Sem isto ela seria construída,
       aqueceria 200 passos de física e nunca desenharia — trabalho invisível na
       máquina de quem pediu para a página não se mexer. */
    if (!semMovimento && tela.current) trilha.current = new Trilha(tela.current);

    const remedir = () => {
      if (!roda) return;
      const r0 = Number.parseFloat(getComputedStyle(roda).getPropertyValue("--o-r0"));
      if (!Number.isFinite(r0) || r0 <= 0) return;
      const alt = raiz.clientHeight || window.innerHeight;
      medidas.current = medir(r0, window.innerWidth, alt);
      /* `clientWidth` do palco, e não `innerWidth`: o palco recorta em
         `overflow-x: clip` e é a caixa dele que o canvas preenche. Numa janela com
         barra de rolagem clássica os dois diferem por ~15px, e a trilha nasceria
         centrada fora do centro da roda. */
      trilha.current?.medir(raiz.clientWidth || window.innerWidth, alt, r0);
    };
    remedir();

    /* Só quando o laço vai mesmo rodar. `data-vivo` desliga as keyframes de CSS:
       se ele entrasse com o movimento reduzido ligado, a roda ficaria parada no
       centro sem ninguém para posicioná-la. */
    if (!semMovimento) raiz.dataset.vivo = "1";

    const ro = new ResizeObserver(remedir);
    ro.observe(raiz);
    return () => {
      ro.disconnect();
      trilha.current = null;
      delete raiz.dataset.vivo;
    };
  }, [semMovimento]);

  useAnimationFrame((_t, dt) => {
    const m = medidas.current;
    const raiz = palco.current;
    if (semMovimento || !m || !raiz || bracos.current.length === 0) return;

    /* dt vem em ms e é limitado a 50ms: quando a aba volta do segundo plano o
       delta acumulado seria enorme e a roda daria um giro inteiro de uma vez. */
    fase.current += (Math.min(dt, 50) / 1000) * ((Math.PI * 2) / VOLTA_S);

    const p = Math.min(1, Math.max(0, scrollYProgress.get()));
    const portao = portaoCostura(p, m);

    /* UMA escrita para tudo o que não é cartão. O halo que morre, a rampa da
       máscara que fecha, a frase que sobe e cresce — tudo isso é CSS lendo
       `--lp3-p`, em vez de mais três nós tocados por quadro daqui. */
    raiz.style.setProperty("--lp3-p", p.toFixed(4));

    trilha.current?.quadro(dt, p);

    for (const { no, cartao } of bracos.current) {
      const pose = posicao(cartao, fase.current, p, m, portao);
      /* o braço já nasce centrado no meio da roda pelas margens negativas do
         v3.css, então x/y são deslocamentos a partir do centro e nada mais */
      no.style.transform = `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0)`;
      no.style.opacity = pose.opacidade.toFixed(3);
    }
  });

  return (
    <section className="lp3-pista" ref={pista}>
      <div className="lp3-palco" ref={palco}>
        {/* ANTES DE `children`, e o motivo é a ordem de pintura. O canvas e o halo
            da roda estão os dois em `z-index: 0` dentro do mesmo contexto de
            empilhamento (a `.lp3-roda` é `position: relative` com z-index `auto`,
            então ela não isola os filhos dela). Em empate de z-index quem decide é
            a ordem do documento — vindo primeiro, o traçado fica sob o halo, sob os
            rostos e sob a frase, que é onde um fundo tem de estar.
            `position: absolute` também o tira do fluxo do grid do palco: como item
            de grade ele viraria uma segunda linha e empurraria a roda para fora do
            centro. */}
        <canvas className="lp3-trilha" ref={tela} aria-hidden="true" />
        {children}
      </div>
    </section>
  );
}

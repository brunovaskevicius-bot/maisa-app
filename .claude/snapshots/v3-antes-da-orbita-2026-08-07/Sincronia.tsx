"use client";

import { useEffect, useRef } from "react";

/* ----------------------------------------------------------------------------
 * <Sincronia> — o único JavaScript da seção das telas.
 *
 * ⚠️ REESCRITA EM 07/08/2026, QUANDO A PILHA VERTICAL VIROU CARROSSEL. A versão
 * anterior escrevia duas coisas na raiz (`--t-p`, o progresso da seção, e
 * `data-ativo`, lido de qual figura estava grudada) e o CSS fazia o resto. Ela não
 * sobreviveu à troca por um motivo específico e não por gosto:
 *
 *   · `--t-p` movia o risco amarelo, que saiu da seção a pedido. Ninguém mais lia.
 *   · `data-ativo` era lido do `getBoundingClientRect().top` de cada figura, e isso
 *     só funcionava porque cada uma grudava numa altura diferente da rolagem. Num
 *     carrossel as três ficam SEMPRE no mesmo lugar da tela — o rect deixou de
 *     conter a informação. Perguntar "qual está grudada agora?" passou a devolver
 *     "todas", o tempo todo.
 *
 * O QUE ELE ESCREVE AGORA. Um índice contínuo, e dele saem as duas coisas:
 *
 *   --d   (por figura)  a distância COM SINAL até o centro do leque: −1 é o vizinho
 *                       da esquerda, 0 é quem está em cena, +1 é o da direita. Como
 *                       é fracionário, o giro é contínuo e não em degraus.
 *   --ad  (por figura)  o mesmo em módulo, para o que não tem lado: o afastamento em
 *                       Z. Vive separado porque `abs()` em CSS ainda é novo demais
 *                       para uma página que precisa rodar no navegador do cliente.
 *   data-ativo (na raiz) o índice arredondado — é ele que acende o passo 01/02/03.
 *
 * ⚠️ A SINCRONIA DO PEDIDO ESTÁ AQUI, E É POR CONSTRUÇÃO. O celular em cena e o
 * passo aceso saem do MESMO número (`i`), no MESMO quadro. Não há dois relógios para
 * divergir: não existe estado em que o leque mostre a conversa da remarcação com o
 * passo 01 aceso, porque `data-ativo` é literalmente `Math.round(i)`.
 *
 * ── POR QUE N NÓS TOCADOS DAQUI, se a versão antiga fazia questão de tocar UM.
 * Porque agora cada figura precisa de um valor DIFERENTE — a distância dela até o
 * centro. Um valor só na raiz não descreve três posições distintas; o CSS teria de
 * derivar `k − i` por figura, e para isso precisaria do `k`, que é justamente o que
 * ele não sabe fazer sozinho. São 3 nós e 2 propriedades: 6 escritas por quadro, num
 * laço que já para fora da tela. O custo é ruído de medição.
 *
 * ── POR QUE rAF E NÃO `animation-timeline: view()`.
 * A animação de rolagem nativa faria isto sem JS nenhum, e seria melhor. Ela ainda
 * não serve aqui: o Firefox só a tem atrás de flag, e o modo de falha é o pior
 * possível — a animação não roda e o leque fica parado sem erro nenhum no console.
 * Com rAF o pior caso é o JS não carregar, e aí vale o estado inicial do CSS.
 *
 * ── MOVIMENTO REDUZIDO.
 * O kill-switch do marketing.css zera `animation` e `transition` do que está sob
 * `.mkt-scope`, e não alcança custom property escrita por JS — que é tudo o que este
 * arquivo faz. Sem esta guarda, "reduzir movimento" não reduziria movimento nenhum.
 * Com ela o leque nasce montado e PARADO no primeiro celular: as três conversas
 * continuam na tela (é a vantagem do leque sobre a pilha antiga, onde as duas de
 * baixo ficavam fora do quadro), só não giram.
 * -------------------------------------------------------------------------- */

const prender = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ── O DESCANSO ──
 * Converte a fração da pista (0→1) no índice do leque (0→fim). O caminho ÓBVIO é
 * `p * fim`, e ele foi medido e reprovado: com o índice andando linear, metade da
 * rolagem é gasta em posições fracionárias, e a pior delas (d = ±0,5) põe dois
 * aparelhos equidistantes do centro, sobrepostos em ~60%, sem nenhum na frente. Na
 * foto lia como UM celular dobrável, não como dois num leque.
 *
 * Aqui cada trecho tem três partes: descansa parado no aparelho, atravessa, descansa
 * no próximo. A travessia ocupa 56% do trecho e é suavizada nas duas pontas
 * (smootherstep — derivada zero em 0 e em 1, então não há solavanco na saída nem na
 * chegada). Resultado: o estado de leque montado, com um na frente, é o que se vê a
 * maior parte do tempo; o cruzamento simétrico é de passagem.
 *
 * ⚠️ ISSO NÃO MEXE NA SINCRONIA COM OS PASSOS. O `data-ativo` continua saindo deste
 * mesmo número arredondado — a curva muda QUANDO o leque vira, e o passo vira junto,
 * porque continua sendo a mesma conta. O descanso, aliás, melhora a leitura: o passo
 * fica aceso enquanto o celular dele está parado de frente, em vez de trocar no meio
 * de um movimento contínuo. */
const RESPIRO = 0.22; // quanto de cada trecho é parada, em cada ponta

function indice(p: number, fim: number) {
  if (fim <= 0) return 0;
  const bruto = p * fim;
  const base = Math.floor(bruto);
  if (base >= fim) return fim;
  const t = prender((bruto - base - RESPIRO) / (1 - 2 * RESPIRO), 0, 1);
  return base + t * t * t * (t * (6 * t - 15) + 10);
}

export function Sincronia({ children, telas }: { children: React.ReactNode; telas: number }) {
  const raiz = useRef<HTMLElement>(null);

  useEffect(() => {
    const no = raiz.current;
    if (!no) return;

    const pista = no.querySelector<HTMLElement>(".lp3-t-pilha");
    const palco = no.querySelector<HTMLElement>(".lp3-t-palco");
    const figuras = Array.from(no.querySelectorAll<HTMLElement>(".lp3-t-cel"));
    if (!pista || !palco || figuras.length === 0) return;

    /* O último índice válido. Com 3 telas o leque vai de 0 a 2 — escrito a partir do
       DOM e não da prop `telas` para os dois nunca discordarem se um dia a lista
       mudar de tamanho sem a prop mudar junto. */
    const fim = figuras.length - 1;

    const põe = (i: number) => {
      for (let k = 0; k < figuras.length; k++) {
        const d = k - i;
        figuras[k].style.setProperty("--d", d.toFixed(4));
        figuras[k].style.setProperty("--ad", Math.abs(d).toFixed(4));
        /* A ORDEM DE PINTURA TEM DE SER JS E NÃO CSS: `z-index` só aceita inteiro, e
           `calc()` de um valor fracionário não arredonda sozinho — o navegador
           descarta a declaração inteira e os três aparelhos empilham na ordem do
           DOM, deixando o terceiro por cima do que está em cena. */
        figuras[k].style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      }
      const ativo = String(prender(Math.round(i), 0, fim));
      if (ativo !== no.dataset.ativo) no.dataset.ativo = ativo;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      põe(0);
      return;
    }

    let raf = 0;
    let visivel = true;

    const quadro = () => {
      raf = requestAnimationFrame(quadro);
      if (!visivel) return;

      const rp = pista.getBoundingClientRect();
      const alturaPalco = palco.getBoundingClientRect().height;

      /* ONDE O PALCO PARA. Tem de ser a mesma conta do `top` dele no CSS
         (`calc((100svh - var(--t-cel-a)) / 2)`) — se as duas divergirem, o leque
         começa a girar antes ou depois de o palco encostar, e o primeiro celular
         entra em cena já torto. É a única linha deste arquivo acoplada ao CSS, e
         está acoplada de propósito: a alternativa é ler `getComputedStyle().top` por
         quadro, que custa um reflow para descobrir um número que não muda. */
      const topoPin = (window.innerHeight - alturaPalco) / 2;

      /* O PERCURSO é o que sobra da pista depois de descontar o palco: exatamente o
         quanto dá para rolar com ele grudado. Com a pista valendo 3 alturas de
         aparelho, sobram 2 — uma tela de rolagem por virada, que é o mesmo ritmo de
         leitura que o `gap` da pilha antiga dava. */
      const percurso = rp.height - alturaPalco;
      const p = percurso > 0 ? prender((topoPin - rp.top) / percurso, 0, 1) : 0;

      põe(indice(p, fim));
    };

    /* Fora da tela o laço para. São três aparelhos; deixar um rAF rodando na página
       inteira por causa deles é gastar bateria para não mexer em nada. */
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }, { rootMargin: "200px" });
    io.observe(no);

    raf = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [telas]);

  return (
    <section className="lp3-t" ref={raiz} data-ativo="0" aria-labelledby="lp3-t-titulo">
      {children}
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";

/* ----------------------------------------------------------------------------
 * <Sincronia> — o único JavaScript da seção das telas.
 *
 * ELE NÃO DESENHA NADA E NÃO MOVE NADA. Escreve duas coisas na raiz da seção, uma
 * vez por quadro, e o CSS faz o resto:
 *
 *   --t-p        o progresso da seção atravessando a viewport, 0 → 1
 *   data-ativo   qual dos três celulares está em cena, "0" | "1" | "2"
 *
 * É o mesmo arranjo do <Morph> da dobra, e pelo mesmo motivo: uma escrita por
 * quadro em vez de N nós tocados daqui. O risco que se desenha, a pílula que
 * troca de cor e o passo que acende são todos consequência de CSS lendo essas
 * duas coisas — nenhum deles precisa existir em React.
 *
 * ── POR QUE rAF E NÃO `animation-timeline: view()`.
 * A animação de rolagem nativa faria isto sem JS nenhum, e seria melhor. Ela ainda
 * não serve aqui: o Firefox só a tem atrás de flag, e o modo de falha é o pior
 * possível — a animação simplesmente não roda, o que deixaria o risco pela metade
 * e o passo 1 aceso para sempre, sem erro nenhum no console. Com rAF o pior caso é
 * o JS não carregar, e aí o estado inicial do CSS (risco inteiro, passo 1 aceso) é
 * um pôster legível de propósito.
 *
 * ── POR QUE A GUARDA DE MOVIMENTO REDUZIDO VIVE AQUI.
 * O kill-switch do marketing.css zera `animation` e `transition` de tudo que está
 * sob `.mkt-scope` — e não alcança `transform`/custom property escritos por JS,
 * que é exatamente o que este arquivo faz. Sem esta guarda, "reduzir movimento"
 * não reduziria movimento nenhum nesta seção. Com ela, a seção nasce no estado
 * final (`--t-p: 1`, risco inteiro) e fica parada: continua completa, só não anima.
 * -------------------------------------------------------------------------- */

const prender = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function Sincronia({ children, telas }: { children: React.ReactNode; telas: number }) {
  const raiz = useRef<HTMLElement>(null);

  useEffect(() => {
    const no = raiz.current;
    if (!no) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      no.style.setProperty("--t-p", "1");
      no.dataset.ativo = "0";
      return;
    }

    let raf = 0;
    let visivel = true;
    let ativoAnterior = -1;

    const quadro = () => {
      raf = requestAnimationFrame(quadro);
      if (!visivel) return;

      const r = no.getBoundingClientRect();
      const vh = window.innerHeight || 800;

      /* O MESMO MAPEAMENTO DO `scroll-stroke.js` DA LP DE TERAPEUTAS, de propósito:
         é a referência que o cliente apontou, e um progresso que anda em outro ritmo
         faria o risco desta página se desenhar diferente do risco de lá. Vai de 0
         quando o topo da seção encosta no fundo da tela até 1 quando o fundo dela
         encosta no topo. */
      const p = prender((vh - r.top) / (vh + r.height), 0, 1);
      no.style.setProperty("--t-p", p.toFixed(4));

      /* O PASSO ATIVO É LIDO DO CELULAR, NÃO DO PROGRESSO DA SEÇÃO — e essa é a
         única forma de os dois nunca discordarem. Dividir `p` em três faixas iguais
         seria uma SEGUNDA descrição de onde cada celular para, e ela divergiria da
         primeira (o `top` do `sticky`, que é CSS) no dia em que alguém mexesse no
         `--t-cel-a`. Aqui a pergunta é literal: qual figura está grudada agora? */
      let ativo = 0;
      const figuras = no.querySelectorAll<HTMLElement>(".lp3-t-cel");
      for (let i = 0; i < figuras.length; i++) {
        if (figuras[i].getBoundingClientRect().top <= vh * 0.5) ativo = i;
      }
      if (ativo !== ativoAnterior) {
        ativoAnterior = ativo;
        no.dataset.ativo = String(ativo);
      }
    };

    /* Fora da tela o laço para. São 3 celulares e um risco; deixar um rAF rodando
       na página inteira por causa deles é gastar bateria para não desenhar nada. */
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

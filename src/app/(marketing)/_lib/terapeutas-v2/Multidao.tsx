"use client";

import { useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { PEEPS } from "./peeps.data";
import { Peep, tomPara } from "./Peep";

/* ----------------------------------------------------------------------------
 * <Multidao> — o segundo ato da história, contado pela ilustração.
 *
 * Dez pessoas chegam. Enquanto a seção sobe na tela, a maisa vai atendendo uma
 * por uma: a roupa passa de neutra para o verde da marca e o contador anda. No
 * fim, dez de dez atendidas — e o texto ao lado fecha o raciocínio.
 *
 * CONTRATO COM O DESIGN SYSTEM (ver guidelines/illustration.card.html)
 * O DS proíbe "ilustração de fundo", parallax e "elemento entrando de longe".
 * A emenda que autoriza esta peça impõe limites, todos respeitados aqui:
 *   • uma vez por página, em bloco delimitado — nunca full-bleed, nunca atrás
 *     de texto de corpo (a multidão tem faixa própria, o texto fica fora dela);
 *   • respiro ambiente de amplitude baixa (<= 10px) — não é parallax, não
 *     depende da posição do scroll, e nada entra de fora da tela;
 *   • a entrada é um fade curto no lugar, dentro de --dur-slower (420ms);
 *   • prefers-reduced-motion vira quadro estático, já no estado final.
 *
 * O respiro ambiente roda em ciclo de ~3s de propósito. O teto de 420ms do DS
 * governa RESPOSTA A INTERAÇÃO (hover, abrir, fechar) — num loop ambiente,
 * 420ms viraria tremor. Amplitude baixa e ciclo lento é o que faz a coisa
 * parecer viva em vez de agitada.
 * -------------------------------------------------------------------------- */

const ALTURA_MAX = Math.max(...PEEPS.map((p) => p.h));

export function Multidao() {
  const ref = useRef<HTMLDivElement>(null);
  const semMovimento = useReducedMotion();
  const visivel = useInView(ref, { once: true, amount: 0.35 });

  const [atendidas, setAtendidas] = useState(0);

  // A seção atravessando a viewport é o que "atende" a fila.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.55"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // React descarta setState com valor igual, então isto só re-renderiza
    // quando o inteiro muda — dez vezes na rolagem inteira, não a cada frame.
    setAtendidas(Math.round(Math.min(Math.max(v, 0), 1) * PEEPS.length));
  });

  // Sem movimento: entrega o quadro final, sem contar a história em animação.
  const total = PEEPS.length;
  const atendidasEfetivo = semMovimento ? total : atendidas;

  return (
    <div className="t2-multidao">
      <div className="t2-multidao-cabecalho">
        <p className="t2-contador">
          <span className="t2-contador-num">{atendidasEfetivo}</span>
          <span className="t2-contador-de"> de {total} já atendidas</span>
        </p>
        <p className="t2-contador-legenda">
          {atendidasEfetivo === total
            ? "Dez sessões marcadas, dez notas emitidas. Nenhuma no seu colo."
            : "A maisa responde, marca e emite enquanto você atende."}
        </p>
      </div>

      <div className="t2-palco" ref={ref}>
        {/* A entrada é um fade, então o HTML do servidor sai com opacity:0 e
            quem revela é o JS. Sem JS a ilustração inteira desapareceria —
            então o fallback devolve a fila visível, no estado de espera. */}
        <noscript>
          <style>{".t2-vaga{opacity:1 !important}"}</style>
        </noscript>

        <div className="t2-fila">
          {PEEPS.map((art, i) => {
            const atendida = i < atendidasEfetivo;
            // ciclo e defasagem variam por índice para a fila não pulsar junto
            const ciclo = 2.6 + (i % 4) * 0.35;
            const amplitude = 6 + (i % 3);

            return (
              <motion.div
                key={art.id}
                className="t2-vaga"
                /* entrada: fade curto NO LUGAR (o DS proíbe entrar de longe) */
                initial={semMovimento ? false : { opacity: 0 }}
                animate={visivel || semMovimento ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.42, delay: semMovimento ? 0 : i * 0.06, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {/* camada separada para o respiro ambiente não brigar com a
                    entrada: dois motion.div aninhados, um `animate` cada */}
                <motion.div
                  className="t2-respiro"
                  animate={semMovimento ? undefined : { y: [0, -amplitude, 0] }}
                  transition={
                    semMovimento
                      ? undefined
                      : { duration: ciclo, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }
                  }
                >
                  <Peep
                    art={art}
                    tom={tomPara(i)}
                    alturaRelativa={art.h / ALTURA_MAX}
                    atendida={atendida}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
        <div className="t2-chao" aria-hidden="true" />
      </div>
    </div>
  );
}

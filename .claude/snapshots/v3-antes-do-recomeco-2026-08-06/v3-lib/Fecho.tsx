import React from "react";
import { CTA_ROTULO, FECHO, OFERTA } from "./dados";

/* ----------------------------------------------------------------------------
 * FECHO — preço + CTA. O terceiro ato, e o único momento AMARELO da página.
 *
 * SERVER COMPONENT, como a Dobra. Nenhum `motion`, nenhum MotionValue, nada ligado
 * ao scroll — e por isso NÃO existe `<noscript>` aqui: o bloco nasce inteiro no HTML
 * do servidor. Num bloco de conversão isso não é economia de bytes, é a diferença
 * entre ter e não ter o botão quando o JS falha.
 *
 * POR QUE ELE É SEÇÃO IRMÃ EM page.tsx, E NÃO MAIS UMA BATIDA DENTRO DO ATO 2:
 * `.lp3-ato2` tem `isolation: isolate` porque ELA é o backdrop do `mix-blend-mode:
 * multiply` da figura. Uma superfície de ouro sangrando dentro daquele grupo isolado
 * é um backdrop de ouro esperando a próxima mudança de `--a2-fig-h` para tingir a
 * foto de amarelo — sem erro, sem warning. Fora do ato 2, o blend não tem como
 * alcançá-lo.
 *
 * AS DUAS CAMADAS, e a divisão é de CONTRASTE, não de gosto:
 *   · sobre BRANCO — o rótulo (azul, 5,17:1) e a manchete (tinta, 17,85:1).
 *   · sobre OURO   — preço, o que inclui, botão e selos, todos em TINTA.
 * O azul não pode atravessar essa fronteira: medido, #2563EB sobre #EAB444 dá
 * **2,68:1**, reprova qualquer tamanho. É por isso que o botão daqui é TINTA com
 * rótulo branco em vez de azul como o da dobra — a diferença tem causa medida, não
 * é inconsistência de marca.
 * -------------------------------------------------------------------------- */
export function Fecho() {
  return (
    <section className="lp3-fecho" aria-labelledby="lp3-fecho-titulo">
      <div className="lp3-fecho-abertura">
        <p className="lp3-a2-rotulo">{FECHO.rotulo}</p>
        <h2 className="lp3-fecho-titulo" id="lp3-fecho-titulo">
          {FECHO.titulo.map((linha) => (
            <span className="lp3-fecho-linha" key={linha}>
              {linha}
            </span>
          ))}
        </h2>
      </div>

      {/* A FAIXA. `aria-hidden` NÃO entra aqui: é o bloco que carrega o preço. */}
      <div className="lp3-fecho-faixa">
        <div className="lp3-fecho-grade">
          <p className="lp3-fecho-preco">
            {OFERTA.precoDe}
            <span className="lp3-fecho-cadencia">{OFERTA.precoPor}</span>
          </p>

          <ul className="lp3-fecho-inclui">
            {FECHO.inclui.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <a className="lp3-fecho-btn mk-focus" href="/barbeiros/comecar">
            {CTA_ROTULO}
          </a>
        </div>

        <ul className="lp3-fecho-selos">
          {FECHO.selos.map((selo) => (
            <li key={selo}>{selo}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

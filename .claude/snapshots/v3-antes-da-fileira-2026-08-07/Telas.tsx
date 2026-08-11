import React from "react";
import { Sincronia } from "./Sincronia";
import { RISCO_D, TELAS, TELAS_LEAD, TELAS_TITULO } from "./dados";

/* ----------------------------------------------------------------------------
 * A SEGUNDA SEÇÃO — três telas do app à direita, o que cada uma mostra à esquerda.
 *
 * NO MOLDE DA #demo DA LP DE TERAPEUTAS, que foi a referência apontada: coluna de
 * texto grudada, coluna de celulares empilhando-se por `sticky`, e o RISCO — o
 * traço desenhado que passa por trás do título.
 *
 * ── O QUE MUDOU DA REFERÊNCIA, E POR QUÊ ──────────────────────────────────
 *
 * 1. O EMPILHAMENTO É SÓ CSS. Lá existe um `stack-scroll.js` (porte do skiper34)
 *    que encolhe e gira cada cartão. Medido: naquela página ele é praticamente
 *    inerte — o gatilho quer `rect.top <= 10vh` e os cartões param em `top: 22vh`,
 *    então o encolher só acontece fora da tela. O que se vê lá é `sticky` puro. É
 *    o que está aqui. Portar o JS seria carregar um rAF por um efeito invisível,
 *    e deixar alguém gastar uma tarde descobrindo por que mexer nele não muda nada.
 *
 * 2. OS PASSOS NÃO APAGAM. Lá o estado é opacidade (0,34 / 0,66 / 1). Esta página
 *    baniu hierarquia por lavagem por escrito ("hierarquia de texto nesta LP é
 *    ESCALA e PESO, não lavagem", v3.css). Aqui o passo ativo troca de COR — azul
 *    cheio contra tinta cheia, os dois em força total, os dois AA. De quebra não há
 *    salto de layout, que é o preço que a alternativa (trocar o peso da fonte) cobra.
 *
 * 3. O RISCO É AMARELO E CHAPADO. Na referência ele é ocre a 45% de opacidade.
 *    Ver a emenda escrita no v3.css, com as três medições de contraste que decidem
 *    onde o amarelo pode entrar nesta página.
 *
 * ── SERVIDOR E CLIENTE ────────────────────────────────────────────────────
 * Só a <Sincronia> é cliente, e ela é uma casca: possui o ref da seção, lê o
 * scroll e escreve duas coisas na raiz. As três imagens, o texto e o SVG do risco
 * saem prontos do HTML. Sem JavaScript a seção fica inteira e legível — o risco
 * aparece desenhado por completo e o primeiro passo aceso, que é um pôster válido.
 * -------------------------------------------------------------------------- */

/* O traço mora no dados.ts desde 07/08/2026, quando a <Duelo> passou a desenhá-lo
   também. Continua sendo o mesmo gesto do `lp/terapeutas/scroll-stroke.js`, pelo
   mesmo motivo de antes: redesenhá-lo à mão daria um segundo rabisco quase igual
   no projeto — e mantê-lo digitado em dois arquivos daria o mesmo problema com o
   agravante de os dois divergirem no dia em que alguém ajustasse um só. */

export function Telas() {
  return (
    <Sincronia telas={TELAS.length}>
      <div className="lp3-t-grade">
        <div className="lp3-t-texto">
          {/* O RISCO VEM ANTES DO TÍTULO no documento porque em empate de z-index
              quem decide é a ordem — e é assim que ele fica ATRÁS das letras sem
              precisar de um `z-index` negativo, que sairia do contexto de
              empilhamento e cairia atrás do fundo da seção. */}
          <svg
            className="lp3-t-risco"
            viewBox="0 0 600 440"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            {/* `pathLength="1"` normaliza o traço: o dasharray passa a ser 1 e o
                offset vira o próprio (1 − progresso), então o CSS desenha o risco
                sem ninguém precisar medir `getTotalLength()` em JavaScript. O
                comprimento real, para referência, é 1660,542 unidades do viewBox. */}
            <path d={RISCO_D} pathLength="1" />
          </svg>

          <h2 className="lp3-t-titulo" id="lp3-t-titulo">
            {TELAS_TITULO}
          </h2>
          <span className="lp3-t-filete" aria-hidden="true" />
          <p className="lp3-t-lead">{TELAS_LEAD}</p>

          <ol className="lp3-t-passos">
            {TELAS.map((tela, i) => (
              <li className="lp3-t-passo" key={tela.src} data-i={i}>
                <span className="lp3-t-ponto" aria-hidden="true" />
                <span className="lp3-t-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="lp3-t-txt">{tela.passo}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="lp3-t-pilha">
          {TELAS.map((tela, i) => (
            <figure className="lp3-t-cel" key={tela.src} data-i={i}>
              <div className="lp3-t-vidro">
                {/* <img> cru e não <Image>: estas três são a MESMA caixa em toda
                    viewport (a largura vem de `--t-cel-a`, que é svh), então não há
                    srcset a escolher — o `next/image` só acrescentaria um wrapper e
                    um pipeline de otimização para servir o mesmo arquivo. O tamanho
                    intrínseco vai nos atributos para não haver salto de layout. */}
                <img
                  src={tela.src}
                  alt={tela.alt}
                  width={780}
                  height={1688}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption className="lp3-t-rotulo">{tela.rotulo}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Sincronia>
  );
}

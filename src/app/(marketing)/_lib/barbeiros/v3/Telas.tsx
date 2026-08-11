import React from "react";
import { Sincronia } from "./Sincronia";
import { Zap } from "./Zap";
import { Chamada } from "./Chamada";
import { CTA_SECAO, TELAS, TELAS_LEAD, TELAS_TITULO } from "./dados";

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
          {/* ⚠️ O RISCO AMARELO SAIU DAQUI EM 07/08/2026, A PEDIDO — "não agregou
              nada nessa seção". Era um <svg> com o `RISCO_D` que se desenhava por
              trás do <h2> conforme a rolagem, movido pelo `--t-p` da <Sincronia>.
              Com ele saíram o `--t-p` (nada mais o lia), o `@property` que o
              registrava e as duas regras `.lp3-t-risco` do v3.css.

              O `RISCO_D` CONTINUA EXPORTADO e continua em uso: a <Duelo> desenha o
              mesmo traço na horizontal. Apagar a constante quebraria a outra seção. */}
          <h2 className="lp3-t-titulo" id="lp3-t-titulo">
            {TELAS_TITULO}
          </h2>
          <span className="lp3-t-filete" aria-hidden="true" />
          <p className="lp3-t-lead">{TELAS_LEAD}</p>

          <ol className="lp3-t-passos">
            {TELAS.map((tela, i) => (
              <li className="lp3-t-passo" key={tela.rotulo} data-i={i}>
                <span className="lp3-t-ponto" aria-hidden="true" />
                <span className="lp3-t-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="lp3-t-txt">{tela.passo}</span>
              </li>
            ))}
          </ol>

          {/* A CHAMADA FICA DENTRO DA COLUNA STICKY, E ISSO É DE PROPÓSITO. Esta
              coluna gruda em `top: 22svh` enquanto os três aparelhos passam ao
              lado — ou seja, o botão acompanha a pessoa durante a sequência
              inteira em vez de esperar por ela no fim. É a única seção da página
              em que o CTA pode ficar visível o tempo todo sem barra fixa.

              ⚠️ ELE CRESCE A COLUNA GRUDADA. Com título + filete + lead + quatro
              passos + botão, a coluna passa a ocupar mais altura de tela, e o que
              sobra abaixo de `22svh` é o teto. Se um dia entrar um quinto passo,
              é aqui que a conta estoura primeiro — o sintoma é o botão saindo pela
              base da janela nas telas mais baixas. */}
          <Chamada className="lp3-ch--telas">{CTA_SECAO.telas}</Chamada>
        </div>

        {/* A PISTA é só corrida de rolagem: ela não desenha nada e existe para dar
            altura. O <div className="lp3-t-palco"> dentro dela é que gruda no meio da
            tela e segura os três aparelhos no mesmo lugar, um sobre o outro, cada um
            deslocado pelo seu `--d`. Ver a nota do leque no v3.css. */}
        <div className="lp3-t-pilha">
          <div className="lp3-t-palco">
            {TELAS.map((tela, i) => (
              <figure className="lp3-t-cel" key={tela.rotulo} data-i={i}>
                {/* Aqui morava um <img> apontando para `public/telas/*.png`. Agora é
                    DOM — ver a nota de abertura do Zap.tsx para o porquê, que se
                    resume a: o conteúdo é TEXTO, e texto em imagem é a pior forma de
                    entregar texto. As capturas continuam no disco e o
                    `scripts/captura-telas.mjs` continua funcionando; nenhum dos dois
                    é usado por esta seção. */}
                <div className="lp3-t-vidro">
                  <Zap conversa={tela.conversa} rotulo={tela.rotulo} />
                </div>
                <figcaption className="lp3-t-rotulo">{tela.rotulo}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </Sincronia>
  );
}

"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { imagensBarbeiros } from "../../imagens";
import { Maisa } from "../completa/Maisa";
import { ATO2, frase } from "./dados";

/* ----------------------------------------------------------------------------
 * ATO 2 — "um sai da fila".
 *
 * A dobra diz "você não quer perder eles" e não diz o que acontece quando um deles
 * escreve. Este ato é o close de UM rosto que estava no anel, com a multidão
 * continuando a passar por cima da cabeça dele enquanto ele fica.
 *
 * Ele entrega as duas únicas afirmações verificáveis que o projeto tem para este
 * momento, e elas são opostas de propósito: ELA LEMBRA (o cara escreve "o de
 * sempre" e ela devolve o corte exato) e ELA PARA ("Desconto quem decide é o
 * Diego, não eu"). Vender só a primeira é o que faz um dono de barbearia
 * desconfiar — ele já comprou automação que prometeu autonomia e devolveu
 * retrabalho.
 *
 * ── A TRAVESSIA CUSTA DUAS DECLARAÇÕES DE CSS, e é o gesto inteiro.
 * `margin-top: -16svh` aqui + `z-index` maior na pista do ato 1. Os últimos 16svh
 * do palco pinado passam POR CIMA do topo desta seção, e como o <Morph> nunca para
 * de avançar a fase, os cartões continuam deslizando lateralmente enquanto isso.
 * A multidão anda por cima da cabeça dele; ele fica. Nenhum MotionValue, nenhum
 * valor ligado ao scroll, nenhum risco de atraso de quadro no iOS.
 *
 * ══════════════════ AS TRÊS EMENDAS AO DESIGN SYSTEM ══════════════════
 * O skill `maisa-design` governa este código. Esta seção o contraria em três
 * pontos, e o precedente da casa (ver o cabeçalho de _lib/terapeutas-v2/Multidao.tsx)
 * é escrever a emenda COM LIMITES em vez de violar em silêncio.
 *
 * EMENDA 1 · escala tipográfica.
 *   O que o DS diz: `primitives.tsx:133` teto o display em
 *   `clamp(2.7rem, 6.6vw, 5.5rem)` com o comentário "teto <= 6rem (respeita o
 *   brief)"; a escala do skill para em 96px.
 *   O que fazemos: teto de 7rem = 112px, 1,17× o teto do sistema.
 *   Limites, todos respeitados abaixo: (a) uma vez por página; (b) frase de até 5
 *   palavras; (c) sentence case; (d) NUNCA contém o wordmark; (e) o sentido está
 *   repetido em corpo de tamanho normal na mesma tela, então a letra gigante nunca
 *   é o único portador de informação; (f) é um <h2> de verdade, sem o truque de
 *   `aria-hidden` + heading invisível.
 *   (O conceito original pedia 9rem/144px — 2,2× o teto. Foi cortado.)
 *
 * EMENDA 2 · figura sangrando para fora do container.
 *   O que o DS diz: proíbe "imagem full-bleed decorativa" e imagem "atrás de texto
 *   de corpo".
 *   O que fazemos: a figura sai um gutter à direita do container.
 *   Limites: nunca além da viewport (medido em 1440: borda direita em 1419 de 1430);
 *   dissolve em dois lados por máscara; CORPO DE TEXTO NUNCA CRUZA A FIGURA, nem um
 *   pixel — no celular isso é garantido do jeito mais simples que existe, a figura
 *   sai do `absolute` e entra no fluxo, depois do corpo; é a única foto da seção.
 *
 *   ⚠️ ESTA EMENDA ENCOLHEU, e o texto anterior dela virou mentira quando a figura
 *   desceu. Ela dizia "a figura CRUZA a manchete", que era verdade quando a foto
 *   tinha 102svh e nascia na borda de cima da seção. Com a figura alinhada ao pé do
 *   texto (pedido do Bruno), o encontro virou um quase: medido em 1440×900, a tinta
 *   de "Ele não precisou" termina em x=943 e a máscara da figura só fica opaca em
 *   x=998 — 55px de folga, e o assunto da foto (o cabelo) começa ainda mais à
 *   direita. Ou seja: HOJE A FIGURA NÃO CRUZA TEXTO NENHUM. Reconquistar o
 *   cruzamento exigiria ~96svh de altura, o que reabriria o desalinhamento que a
 *   troca veio consertar. Ficou o alinhamento; a emenda encolheu junto.
 *
 * EMENDA 3 · tracking do microrrótulo.
 *   0.14em contra os 0.08em de `--tracking-caps`. Limites: <= 11px, <= 6 palavras,
 *   nunca contém "maisa" (a marca não sobrevive a `text-transform: uppercase`, e
 *   essa regra do DS não está sendo emendada — está sendo respeitada), nunca é
 *   manchete.
 *
 * EMENDA QUE NÃO FOI PRECISO ESCREVER: o `grayscale(1)` saiu do tratamento da
 * foto. O DS exige "luz quente e natural, sem filtro azulado", e grayscale sobre uma
 * base tingida produz exatamente um monocromático. `saturate(0.62)` guarda o calor da
 * pele nos altos-luzes. Uma emenda a menos, apagada em vez de justificada.
 *
 * ⚠️ ESTA SEÇÃO NASCEU NO TEMA ESCURO. A troca para o claro inverteu o sinal de três
 * coisas ao mesmo tempo — a mistura (`screen` → `multiply`), o fundo exigido da foto
 * (preto → branco) e o lado do limite de contraste (a figura não pode ficar mais
 * ESCURA que a tinta, e não mais clara). Estão as três anotadas no v3.css e no
 * imagens.ts. Mexer numa sem as outras devolve um retângulo chapado.
 * ══════════════════════════════════════════════════════════════════════
 * -------------------------------------------------------------------------- */

/** O `--mk-ease` do mundo barbeiros escrito como bezier. Motion não lê custom
 *  properties de CSS, então o número vive aqui — se o token mudar, mude junto. */
const EASE = [0.22, 0.85, 0.26, 1] as const;

export function Ato2() {
  const refA = useRef<HTMLDivElement>(null);
  const refB = useRef<HTMLDivElement>(null);

  /* Devolve null no servidor e boolean no cliente. Só pode governar PROPS de
     animação, nunca marcação, senão dá mismatch de hidratação. */
  const semMovimento = useReducedMotion();

  /* Entrada é entrada: nada aqui é ligado ao scroll. */
  const visivelA = useInView(refA, { once: true, amount: 0.35 });
  const entrou = visivelA || !!semMovimento;

  /* O ÚNICO trecho ligado ao scroll da página inteira fora da dobra.
     Deslocamentos capados em 14px de propósito: no iOS a rolagem é composta fora
     da main thread e qualquer transform ligado a scroll fica >= 1 quadro atrás.
     A 14px o atraso é imperceptível; a 200px a seção nada contra a página. */
  const { scrollYProgress: pB } = useScroll({ target: refB, offset: ["start 0.92", "start 0.42"] });
  const fioX = useTransform(pB, [0.1, 0.42], [0, 1]);
  const falaO = useTransform(pB, [0.34, 0.62], [0, 1]);
  const falaY = useTransform(pB, [0.34, 0.62], [14, 0]);
  const respO = useTransform(pB, [0.52, 0.82], [0, 1]);
  const respY = useTransform(pB, [0.52, 0.82], [12, 0]);

  /* Com movimento reduzido não se anima com duração zero — não se INSTANCIA a
     interpolação. O kill-switch global do marketing.css zera `animation-duration` e
     `transition-duration` sob `.mkt-scope`, mas as escritas inline do motion passam
     ilesas por ele; então a guarda tem de estar aqui também.
     TIPADO DE VERDADE: a primeira versão recebia `unknown` e devolvia `as never`, o
     que desligava a checagem exatamente onde quatro MotionValues de nomes parecidos
     (falaO/falaY/respO/respY) são distribuídos por quatro props. Trocar `falaO` por
     `falaY` num descuido compilaria limpo e publicaria a fala com opacidade indo de
     14 a 0 — invisível o tempo todo, sem um aviso. `MotionStyle` já aceita
     `MotionValue<number> | number` nas duas props, então nunca houve o que forçar. */
  const estilo = (mv: MotionValue<number>, valorFinal: number): MotionValue<number> | number =>
    semMovimento ? valorFinal : mv;

  const figura = imagensBarbeiros.figuraAto2;

  return (
    <section className="lp3-ato2" aria-labelledby="a2-titulo">
      {/* dissolve o degrau tonal exatamente na faixa em que o ato 1 passa por cima,
          para não sobrar uma aresta horizontal 16svh acima da barra */}
      <div className="lp3-ato2-fusao" aria-hidden="true" />

      {/* ─────────────── batida A: ela lembra ─────────────── */}
      <div className="lp3-ato2-a" ref={refA}>
        <div className="lp3-a2-caixa">
          <motion.p
            className="lp3-a2-rotulo"
            initial={semMovimento ? false : { opacity: 0 }}
            animate={{ opacity: entrou ? 1 : 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {ATO2.a.rotulo}
          </motion.p>

          <h2 className="lp3-a2-titulo" id="a2-titulo">
            {ATO2.a.titulo.map((linha, i) => (
              /* A MÁSCARA POR LINHA EXIGE BLOCO, e no celular ela é desligada por
                 CSS (a linha volta a `display: inline`, onde `transform` não se
                 aplica). Por isso a animação carrega TAMBÉM opacidade: no desktop
                 lê como revelação por baixo da máscara, no celular como um fade —
                 uma animação só, duas leituras, sem ramificar em JavaScript. */
              <React.Fragment key={i}>
                {/* O ESPAÇO É OBRIGATÓRIO e não é enfeite de formatação. Entre
                    blocos ele colapsa e não faz nada; no celular, onde as linhas
                    viram `inline`, é a única coisa que separa as duas — sem ele a
                    manchete lia "Ele não precisoudizer o corte.", que foi
                    exatamente o que apareceu no primeiro teste em 390px. */}
                {i > 0 && " "}
                <span className="lp3-a2-linha">
                  <motion.span
                    initial={semMovimento ? false : { y: "108%", opacity: 0 }}
                    animate={entrou ? { y: 0, opacity: 1 } : { y: "108%", opacity: 0 }}
                    transition={{ duration: 0.46, delay: 0.12 + i * 0.08, ease: EASE }}
                  >
                    {linha}
                  </motion.span>
                </span>
              </React.Fragment>
            ))}
          </h2>

          <motion.p
            className="lp3-a2-corpo"
            initial={semMovimento ? false : { opacity: 0 }}
            animate={{ opacity: entrou ? 1 : 0 }}
            transition={{ duration: 0.32, delay: 0.4, ease: EASE }}
          >
            {frase(ATO2.a.corpo).map((p, i) =>
              p.marca ? <Maisa key={i} /> : <React.Fragment key={i}>{p.t}</React.Fragment>,
            )}
          </motion.p>

          {/* ⚠️ NÃO ENVOLVA ESTE NÓ EM OUTRO ELEMENTO ANIMADO, e não ponha
              `position: sticky` num ancestral dele. O `mix-blend-mode` mistura com o
              BACKDROP; um wrapper que crie stacking context zera esse backdrop, a
              fórmula Cr = (1−αb)·Cs + αb·B(Cb,Cs) com αb = 0 devolve Cs, e o
              retângulo cinza da foto reaparece — SEM erro, SEM warning, sem nada no
              console. O transform/opacity escritos AQUI são seguros: o contexto que
              eles criam afeta os descendentes, não a mistura deste elemento. */}
          <motion.div
            className="lp3-figura"
            initial={semMovimento ? false : { opacity: 0, y: 40 }}
            animate={entrou ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="lp3-foto"
              src={figura.url}
              srcSet={figura.srcSet}
              /* No desktop a largura da figura sai da ALTURA (`--a2-fig-h`, 80svh) pela
                 razão 3:4, então em vw ela varia com a proporção da tela: 37vw num
                 16:10 de 1440, 34vw num 16:9 de 1920. 40vw cobre a faixa por cima —
                 errar para mais aqui custa bytes; errar para menos custa nitidez. */
              sizes="(max-width: 759px) 118vw, 40vw"
              alt={figura.alt}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </motion.div>
        </div>
      </div>

      {/* O SILÊNCIO é espaço, não pin. O diretor de arte pediu uma batida em que a
          seção não faz nada; sequestrar a rolagem para isso foi reprovado — a dobra
          já gasta 200svh de pista. Navy vazio dá o mesmo beat sem congelar a
          viewport de ninguém. */}
      <div className="lp3-ato2-silencio" aria-hidden="true" />

      {/* ─────────────── batida B: ela para ─────────────── */}
      <div className="lp3-ato2-b" ref={refB}>
        <div className="lp3-a2-caixa">
          {/* entra pela borda direita e PARA na espinha esquerda: a resposta vem de
              fora e chega. Entra ANTES da fala, que é a ordem do fio — ela chama, e
              então fala. */}
          <motion.span
            className="lp3-a2-fio"
            aria-hidden="true"
            style={{ scaleX: estilo(fioX, 1) }}
          />

          <p className="lp3-a2-rotulo">{ATO2.b.rotulo}</p>

          <motion.blockquote
            className="lp3-a2-fala"
            style={{ opacity: estilo(falaO, 1), y: estilo(falaY, 0) }}
          >
            {ATO2.b.fala}
          </motion.blockquote>

          <motion.div
            className="lp3-a2-resposta"
            style={{ opacity: estilo(respO, 1), y: estilo(respY, 0) }}
          >
            {ATO2.b.respostas.map((r, i) => (
              <p key={i}>{r}</p>
            ))}
          </motion.div>

          <p className="lp3-a2-rotulo lp3-a2-rotulo--nota">{ATO2.nota.rotulo}</p>
          <p className="lp3-a2-nota">{ATO2.nota.texto}</p>
        </div>
      </div>

      {/* As entradas partem de opacity 0, então o HTML do servidor sai invisível e
          sem JS a seção não existiria. Mesmo recurso usado em Multidao.tsx. */}
      <noscript>
        <style>
          {
            ".lp-v3 .lp3-a2-linha>span,.lp-v3 .lp3-a2-rotulo,.lp-v3 .lp3-a2-corpo,.lp-v3 .lp3-figura,.lp-v3 .lp3-a2-fala,.lp-v3 .lp3-a2-resposta{opacity:1!important;transform:none!important}.lp-v3 .lp3-a2-fio{transform:scaleX(1)!important}"
          }
        </style>
      </noscript>
    </section>
  );
}

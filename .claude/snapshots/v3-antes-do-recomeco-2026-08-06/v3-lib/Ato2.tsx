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
 *   ⚠️ ESTA EMENDA JÁ ERROU DUAS VEZES NO MESMO PONTO — quanto a figura cruza a
 *   manchete. Vale ler as duas antes de escrever uma terceira afirmação sobre isso.
 *
 *   1ª: dizia "a figura CRUZA a manchete". Virou mentira quando a foto desceu para
 *      alinhar com o pé do texto.
 *   2ª: dizia "HOJE A FIGURA NÃO CRUZA TEXTO NENHUM — a máscara só fica opaca em
 *      x=998, 55px de folga". TAMBÉM FALSO, e por um erro de leitura de CSS: a
 *      máscara é `linear-gradient(to right, transparent 0, #000 22%)` sobre uma caixa
 *      que começava em x=699, ou seja opaca a partir de 699 + 0,22·720 = **857**, não
 *      998. A tinta de "Ele não precisou" termina em x=943: eram **86px de invasão**,
 *      não 55px de folga. Medido de novo em 06/08/2026, por Range sobre o nó de
 *      texto (a caixa do `<span>` é `display: block` e mede a linha inteira, não a
 *      tinta — foi assim que o 998 apareceu).
 *
 *   ESTADO ATUAL, com os números de como foi medido: na faixa vertical da linha 1 a
 *   foto é branco puro até x=870 e o rapaz entra em x=887, então o cruzamento real
 *   eram ~56px de cabelo. A figura foi deslocada 0,19·altura para a direita (o
 *   estúdio morto da foto saindo de quadro) e a foto subiu para α = 1. O assunto
 *   agora encosta na tinta com alfa composto 0,43 no pior pixel, contra o limite de
 *   0,677 para 3:1. Ver a medição por coluna em v3.css, `.lp3-figura`.
 *   Se for reescrever isto: meça a TINTA, não a caixa, e meça a foto POR COLUNA.
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
  /* A foto da batida B. De CENA, não de estúdio — ver a nota no ponto de uso. */
  const salao = imagensBarbeiros.salaoCheio;

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

      {/* Aqui existiu um `.lp3-ato2-silencio`: div vazio de `calc(--a2 * 2.2)` (246px
          em 1440×900) que dava uma batida em que a seção não faz nada. Removido em
          06/08/2026 pela regra de densidade — medido, era o maior bloco de 0% de tinta
          da página, e somado aos padrões vizinhos formava 428px contínuos de branco.
          Se a pausa voltar: ela era ESPAÇO, nunca pin. Sequestrar a rolagem para isso
          já foi reprovado uma vez — a dobra sozinha gasta 200svh de pista. */}

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

          {/* A SEGUNDA FOTO, e ela é de CENA, não de estúdio — a diferença manda em
              tudo o que vem abaixo. A figura da batida A tem fundo branco e por isso
              vive de `mix-blend-mode: multiply`, que a recorta por identidade
              algébrica. Esta aqui tem salão, parede e chão: multiply nela só
              escureceria a imagem inteira. Então ela entra CHAPADA, com aresta dura e
              sangrando pela direita — que é, aliás, mais 8-ou-80 do que dissolver.

              Por que `salaoCheio` e não outra: é a ÚNICA foto do acervo com cor de
              verdade (imagens.ts diz isso na cara — "ao contrário do resto do acervo,
              que é todo penumbra âmbar"), e é a única em que duas cadeiras estão
              ocupadas no mesmo instante. A batida B promete que a casa continua
              girando quando a decisão não é do funcionário; esta é essa foto.

              Entra junto com a FALA, não com a resposta: reaproveita `falaO`/`falaY`
              de propósito, em vez de criar mais um par de MotionValues para o mesmo
              instante. Se ganhar timing próprio, lembre do <noscript> lá embaixo. */}
          {/* SEM `aria-hidden`: esta foto carrega conteúdo (a casa girando), igual à da
              batida A, então ela tem `alt` de verdade e fica no fluxo de leitura. */}
          <motion.div
            className="lp3-figura-b"
            style={{ opacity: estilo(falaO, 1), y: estilo(falaY, 0) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* ⚠️ SEM `srcSet` E SEM `sizes`, E ISSO É DELIBERADO — o oposto do que o
                resto do arquivo faz. Medido nesta página, em DPR 2:

                  sizes="20vw"  → o CDN entrega  288px   (20% de 1440)
                  sizes="55vw"  → entrega        792px   (55% de 1440)
                  sizes="100vw" → entrega       1440px
                  em TODOS os casos o navegador escolheu o candidato `w=2000`.

                O CDN do Pexels honra o client hint `Width`, que vem em CSS px, e
                IGNORA o `w=` do candidato e o DPR. Resultado: com `sizes`, a foto sai
                sempre na largura CSS — ou seja **2× mole numa tela retina**, por mais
                candidatos grandes que o `srcSet` ofereça. Foi assim que eu servi 547px
                e depois 792px para uma caixa que precisa de 1584.

                Sem `sizes` e sem `srcSet` não há client hint: o `w=1600` da própria URL
                vale, e chega 1600×1067 — contra os 1584 que 528px em DPR 2 pedem.

                A caixa é 40% de um container capado em `--mk-maxw-wide`, então a faixa
                de tamanhos aqui é estreita e um único arquivo cobre tudo, inclusive o
                celular (375 CSS px em DPR 3 = 1125).

                ⚠️ A MESMA ARMADILHA VALE PARA A v2, que usa este helper com `sizes` na
                foto de LCP a 100vw: lá ela chega a 1440 para uma necessidade de 2880.
                Não corrigido aqui — é outra página. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="lp3-foto-b"
              src={salao.url}
              alt={salao.alt}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </motion.div>

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
            ".lp-v3 .lp3-a2-linha>span,.lp-v3 .lp3-a2-rotulo,.lp-v3 .lp3-a2-corpo,.lp-v3 .lp3-figura,.lp-v3 .lp3-figura-b,.lp-v3 .lp3-a2-fala,.lp-v3 .lp3-a2-resposta{opacity:1!important;transform:none!important}.lp-v3 .lp3-a2-fio{transform:scaleX(1)!important}"
          }
        </style>
      </noscript>
    </section>
  );
}

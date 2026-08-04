import { Display, Lead } from "../../primitives";
import { ICPS } from "../../icp";
import { Maisa } from "../completa/Maisa";
import { IMAGEM_DOBRA, OFERTA } from "./dados";

/* ----------------------------------------------------------------------------
 * A DOBRA — a palavra em cima, a fotografia embaixo, e nada entre as duas.
 *
 * ESTA VERSÃO DESFAZ O VÉU, e é a mudança que carrega todas as outras.
 *
 * O arranjo anterior era: foto de tela cheia + texto por cima. Isso obriga a um
 * substrato, e o substrato era três camadas de navy somando até 92% de alpha. O
 * custo estava escrito na própria autocrítica de quem o construiu — "no terço de
 * baixo a imagem praticamente desaparece" — e a conta era pior do que parecia: com
 * o fundo da página em oklch(0.165), ou seja rgb(5,14,32), luminância relativa de
 * 0,4%, o véu não escurecia a foto, ele a APAGAVA. A dobra era um retângulo preto
 * com letras, e a fotografia estava lá só tecnicamente.
 *
 * Nenhum ajuste de alpha resolve isso, porque o problema é o arranjo: texto sobre
 * foto SEMPRE cobra véu, e véu sempre sai do brilho da foto. Então o texto saiu de
 * cima da foto. Consequências, todas medidas e todas boas:
 *
 *   · véu ZERO. A foto aparece na cor em que foi tirada. Nesta, isso é o vermelho
 *     da cabine telefônica, o terracota dos aventais e o branco do piso — a única
 *     luz clara da dobra vem da própria fotografia, não de um token.
 *   · a manchete não tem mais orçamento de contraste variável. Ela vive sobre o
 *     fundo da página, que é uma cor conhecida, e o pior par da dobra é o wordmark
 *     dourado a 6,09:1 (era "depende do pixel").
 *   · a restrição de asset morreu. Não há canto que precise ser escuro porque não
 *     há glifo sobre canto nenhum. O histórico está em dados.ts, no IMAGEM_DOBRA.
 *   · sobrou o `.lp2-veu-coluna`/`.lp2-veu-movel`? Não: os dois foram deletados do
 *     v2.css junto com a tabela de contraste de dois eixos que existia para
 *     defendê-los. Código que não é mais necessário é o único que se remove de graça.
 *
 * A FOTO MUDOU DE ASSUNTO. Era um close de lâmina — craft, uma pessoa. Agora são
 * DUAS cadeiras ocupadas no mesmo instante, que é o estado que a página vende. O
 * argumento deixou de ser afirmado e passou a estar fotografado.
 *
 * O TEXTO CAIU 52%. Contado em palavras: 40 → 19 (manchete 5→6, leitura 24→6, linha
 * de risco 11→7); em caracteres, 225 → 110. Não foi truncagem: a melhor imagem da
 * página estava enterrada no meio do parágrafo de leitura ("quem chamou no WhatsApp
 * enquanto você estava com a tesoura na mão") e virou a manchete inteira. O que saiu
 * foi a abstração que a antecedia — "Você está perdendo cortes agora" DIZ a perda;
 * "Tocou o WhatsApp. Você estava cortando." MOSTRA o instante em que ela acontece, e
 * quem trabalha com a mão ocupada não precisa da legenda. A garantia saiu da dobra
 * porque ela é o argumento inteiro do fechamento, onde tem o maior corpo da página.
 *
 * O QUE NÃO MUDOU, de propósito: continua sendo Server Component (não há estado
 * nenhum na dobra), a foto continua `eager` + `fetchPriority="high"` porque é o
 * elemento de LCP, e continua havendo UM primário.
 * -------------------------------------------------------------------------- */

export function Cadeira() {
  const cfg = ICPS.barbeiros;

  return (
    <section
      /* CONTRATO COM A RÉGUA. `id="dobra"` não é enfeite: a Regua.tsx observa ESTE
         elemento para saber quando a dobra saiu da tela. Antes ela criava um <div>
         sentinela de 1px dentro do próprio fragmento dela, e como a página monta
         <Regua /> ANTES do <main>, o sentinela nascia em y = -1 — acima do topo do
         documento — e nunca voltava a cruzar o limiar do observer: medido no
         navegador, a régua ficava invisível de 0 a 1200px de rolagem. Um id
         explícito é acoplamento, sim, mas é acoplamento greppável e documentado nos
         dois lados. */
      id="dobra"
      className="lp2-dobra"
      aria-label="Tocou o WhatsApp. Você estava cortando."
    >
      {/* ───────────────────── assinatura (não é nav) ─────────────────────
          Uma one-pager de 5 blocos não navega para nada, então não há barra: o
          wordmark fica no canto como ASSINATURA — um <p>, sem href, sem blur —, do
          jeito que se assina uma fotografia. Aqui ele vive sobre o fundo da página
          e não sobre a foto, o que é a diferença entre 6,09:1 fixo e "depende do
          pixel que ficou atrás do glifo". */}
      <p className="lp2-dobra-assinatura">
        {/* importado de ../completa/Maisa. Recriar o wordmark aqui seria a 16ª forma
            de escrever a marca no mesmo projeto, e a cor pararia de vir de
            --mk-wordmark — que é exatamente o token que a faixa dourada do
            fechamento precisa inverter. */}
        <Maisa escala="grande" />
      </p>

      {/* ───────────────────────── a palavra ─────────────────────────
          Sem `Container`: ele centra com max-width e auto-margin, e o texto aqui
          ancora na ESQUERDA. A largura da coluna vive em `.lp2-dobra-coluna` no
          v2.css porque precisa de breakpoint, e estilo inline não tem media query. */}
      <div className="lp2-dobra-palavra">
        <div className="lp2-dobra-coluna">
          <Display
            as="h1"
            size="2xl"
            style={{
              /* O CLAMP ANTERIOR NÃO TINHA TERMO MÓVEL, e isso é uma classe de defeito que
                 passa em qualquer revisão visual. Era `clamp(2.35rem, 4.6vw, 4rem)`: a
                 390px de viewport 4,6vw dá 17,9px, então o PISO ganha — e o piso é um rem
                 fixo. Resultado: 37,6px em todo celular do mundo, de 320 a 815px de largura.
                 Uma escala "fluida" que era um valor fixo justamente na faixa onde a
                 largura varia mais.
                 O que isso custava, medido: a 390px, coluna de 350px, "Tocou o WhatsApp."
                 ocupava 349,6px. QUATRO DÉCIMOS de pixel de folga. A 375px — iPhone
                 mini/SE, uma das larguras mais comuns que existem — a coluna cai para
                 335px e a manchete quebra em "Tocou o / WhatsApp.", órfão na primeira
                 linha da página.
                 8,6vw é o termo que faltava. A garantia que ele compra é uma só, e é a que
                 importa: a PRIMEIRA frase nunca quebra, em nenhuma largura. Ela mede
                 9,31x o font-size, o que exige gutter abaixo de 9,95% da viewport — e o
                 --mk-gutter é folgadamente menor que isso em toda a faixa.
                 A segunda frase quebra em duas linhas no celular e cabe em uma no desktop,
                 e isso é a escada pretendida, não um acidente: três linhas grandes num
                 celular têm mais presença que duas linhas médias. O que não se admite é
                 quebra no meio da primeira frase, porque é ela que carrega o gatilho. */
              fontSize: "clamp(1.75rem, 8.6vw, 3.75rem)",
              /* explícito, ainda que `.mkt-world h1` já dê --mk-ink: é a defesa
                 contra herdar cor de um ancestral pintado */
              color: "var(--mk-ink)",
              maxWidth: "22ch",
            }}
          >
            {/* DUAS FRASES, DUAS LINHAS, e o quebra-linha é explícito em vez de
                confiado ao `text-wrap: balance`. Balance otimiza o comprimento das
                linhas, não o sentido: com as duas frases num parágrafo só ele acha
                bonito quebrar em "Tocou o / WhatsApp. Você / estava cortando.", que
                parte a primeira frase no meio e cola o ponto no começo da linha de
                baixo. O ritmo é o argumento aqui — tocou, e você estava ocupado —
                então cada beat ganha a sua linha. Blocos, não <br>: cada frase
                continua quebrando internamente se a viewport for estreita. */}
            <span style={{ display: "block" }}>Tocou o WhatsApp.</span>
            <span style={{ display: "block" }}>Você estava cortando.</span>
          </Display>

          {/* A promessa entra DEPOIS do medo, na mesma respiração, e é ela que
              carrega o wordmark: a marca aparece como a SAÍDA do problema, não como
              o assunto da frase. Três verbos e ponto — responder é o que um chatbot
              faz, agendar e confirmar é o que ela faz. */}
          <Lead
            style={{
              marginTop: "clamp(1rem, 2.2vh, 1.65rem)",
              fontSize: "clamp(1.15rem, 1.85vw, 1.5rem)",
              color: "var(--mk-ink-soft)",
            }}
          >
            A <Maisa escala="grande" /> responde, agenda e confirma.
          </Lead>

          {/* O botão desenhado em v2.css (o projeto não usa Tailwind). Não é o
              `Button` de primitives.tsx de propósito: aquele serve as 6 LPs e este é
              uma peça da dobra desta página. Continua sendo UM primário, continua
              sem seta — "Ativar" é ação, não navegação — e o destino é a rota de BASE
              do icp.ts, não um wa.me hardcoded. */}
          <a
            href={cfg.rotas.base}
            className="lp2-btn mk-focus"
            style={{ marginTop: "clamp(1.4rem, 3vh, 2.1rem)" }}
          >
            <span>Ativar minha agenda</span>
          </a>

          {/* A LINHA DE RISCO, montada de OFERTA — nada de "R$ 97" digitado: na v1 o
              preço estava escrito à mão em 4 arquivos e já divergia entre eles.
              "A partir de" não é hedge: existe plano de R$ 197 no catálogo, e
              prometer 97 sem ele é armadilha, não oferta.
              A GARANTIA SAIU DAQUI. Ela era o terceiro item de uma tricolon, e é o
              argumento inteiro do fechamento — onde ganha o maior corpo da página.
              Repetir na dobra custava um terço desta linha para não dizer nada novo. */}
          <p className="lp2-dobra-risco">
            {/* o valor ganha peso, não cor: o dourado é o acento pontual da marca e
                já está gasto no wordmark e no blob do botão. Um terceiro ponto
                dourado dividiria a atenção com o CTA. */}
            A partir de{" "}
            <strong style={{ fontWeight: 800, color: "var(--mk-ink)" }}>
              {OFERTA.precoDe}
              {OFERTA.precoPor}
            </strong>
            , {OFERTA.fidelidade}
          </p>
        </div>
      </div>

      {/* ─────────────────────────── a fotografia ───────────────────────────
          `<img>` cru é o padrão do resto destas LPs (as URLs são remotas e já vêm
          dimensionadas da fonte) e aqui ele ainda ganha: nada de wrapper, nada de
          placeholder, o byte mais curto até o LCP. `eager` + `fetchPriority="high"`
          porque É o LCP; nunca `lazy`, que adiaria justamente o pixel que o
          Lighthouse mede nesta tela. `sizes="100vw"` porque a faixa sangra de borda
          a borda — a escada de larguras e o motivo dela estão no srcSet, em
          imagens.ts. `alt` real, porque a cena É o argumento: duas cadeiras
          ocupadas ao mesmo tempo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lp2-dobra-foto"
        src={IMAGEM_DOBRA.url}
        srcSet={IMAGEM_DOBRA.srcSet}
        sizes="100vw"
        alt={IMAGEM_DOBRA.alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </section>
  );
}

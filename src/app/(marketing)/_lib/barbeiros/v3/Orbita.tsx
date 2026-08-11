import type { CSSProperties } from "react";
import { rostosOrbita } from "../../imagens";

/* ----------------------------------------------------------------------------
 * A ÓRBITA — os rostos dão uma volta em torno do texto.
 *
 * ── O QUE ELA SUBSTITUI. Em 07/08/2026 a roda de 64 cartões virou a <Fileira>: uma
 * linha só, no pé da dobra. O retorno foi que as imagens podiam PASSAR pela hero
 * "com uma fila orbitando o texto", na referência do Eye Gallery — duas fitas em
 * arco, uma por cima e outra por baixo, abrindo no meio para o texto morar dentro.
 *
 * ── POR QUE UMA ELIPSE FECHADA E NÃO DUAS FITAS. A referência monta dois tickers
 * independentes que se teleportam ao sair da tela. Um anel fechado entrega o mesmo
 * desenho — bojo para cima em cima, para baixo embaixo, mais aberto no centro — e
 * resolve de graça três problemas que as duas fitas criam:
 *
 *   1. A COSTURA DEIXA DE EXISTIR. Numa fita, o quadro do fim tem de ser idêntico
 *      ao do começo, e isso obriga a lista de fotos a se repetir dentro da tela. Num
 *      laço fechado não há fim: cada rosto aparece UMA vez e a volta fecha nele
 *      mesmo. São 16 rostos e nenhum repetido em cena.
 *   2. AS DUAS DIREÇÕES SAEM SOZINHAS. Na referência elas são duas configurações
 *      (`topRow: right`, `bottomRow: left`). Aqui é a mesma volta: quem está em cima
 *      anda para a direita porque está VOLTANDO, e quem está embaixo anda para a
 *      esquerda porque está indo. É uma fila só, que é literalmente o pedido.
 *   3. O NÚMERO DE CARTÕES PARA DE DEPENDER DA LARGURA. Numa fita o passo é
 *      (tela ÷ nº de cartões), então ou o cartão encolhe até virar confete no
 *      celular ou os cartões se sobrepõem. Num anel o passo é o PERÍMETRO ÷ 16, e o
 *      perímetro encolhe junto com a tela. Medido: 235px de passo em 1440 e 107px em
 *      390 — em ambos maior que o cartão, sem uma media query.
 *
 * ── ZERO JAVASCRIPT, E DESTA VEZ NEM PARA POSICIONAR.
 * A referência escreve `transform`, `opacity` e `zIndex` de ~50 cartões por quadro,
 * num rAF. Aqui não há rAF, não há "use client" e não há conta: o caminho é uma
 * `offset-path: ellipse()` no CSS e cada cartão anda nele com `offset-distance`. O
 * ÚNICO dado por cartão é `--i`, a posição dele na fila — o resto é atraso de
 * animação. Trocar 16 por 20 rostos é trocar o `slice` abaixo, e mais nada.
 *
 * ── O `--orb-k` SAI DAQUI E NÃO DO CSS, de propósito. O atraso de cada cartão é
 * `--i × volta ÷ --orb-k`; se o CSS guardasse o total por conta própria, mexer no
 * `slice` sem mexer no CSS deixaria buracos no anel — um erro silencioso, que só
 * aparece olhando. Vindo do `.length`, os dois não têm como discordar.
 *
 * ── EMENDA AO DS, e ela NÃO cresce. O sistema diz "nada na interface fica em loop"
 * e esta página já tinha aberto a exceção de UM elemento ambiente por vez (era a
 * trilha, hoje é a poeira) mais a fita de rostos. A órbita ocupa a vaga da fita: ela
 * não pulsa, não clareia, não reage ao mouse nem à rolagem. É a mesma fotografia
 * longa passando devagar, num caminho fechado em vez de reto. `prefers-reduced-motion`
 * congela o anel montado — ver a nota "O ANEL PARADO É CONTEÚDO" no v3.css, que é o
 * ponto em que isto quase virou um bug.
 * -------------------------------------------------------------------------- */

/* DEZESSEIS, e o número não tem mais a amarra de largura que a fileira tinha (lá a
   lista precisava ser mais larga que a tela mais larga, senão a costura aparecia).
   Num anel fechado o único limite é o passo do perímetro não ficar menor que o
   cartão. Medido nos dois extremos, com o cartão que o CSS calcula para cada um:
       1440×900 → perímetro 3.760px ÷ 16 = 235px de passo, cartão de 124px
        390×844 → perímetro 1.708px ÷ 16 = 107px de passo, cartão de  72px
   Ou seja, sobra de vão nos dois. Subir para 20 fecharia o anel no celular. */
const ROSTOS = rostosOrbita.slice(0, 16);

export function Orbita() {
  return (
    /* UMA imagem para quem não enxerga, não dezesseis — mesma decisão que estava na
       <Roda> e na <Fileira>, pelo mesmo motivo: um leitor de tela anunciando
       dezesseis retratos de banco de imagem, um a um, transformaria a primeira tela
       num túnel. O `alt` real de cada rosto continua escrito em imagens.ts, onde
       serve de documentação para quem for trocar as fotos. */
    <div
      className="lp3-orbita"
      role="img"
      aria-label="Uma roda de rapazes atendidos em barbearia, girando devagar em volta do texto."
      style={{ "--orb-k": ROSTOS.length } as CSSProperties}
    >
      {ROSTOS.map((rosto, i) => (
        <div className="lp3-orb-card" key={i} style={{ "--i": i } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rosto.url}
            alt=""
            width={240}
            height={300}
            /* `eager` porque a órbita está na primeira tela e `lazy` aqui não adiaria
               nada — só atrasaria. `low` porque o pixel que vende a dobra é a frase,
               não os retratos. São 16 arquivos, dois a mais que a fileira servia. */
            loading="eager"
            fetchPriority="low"
            decoding="async"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}

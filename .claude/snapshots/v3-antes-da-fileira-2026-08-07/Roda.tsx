import type { CSSProperties, ReactNode } from "react";
import { rostosOrbita } from "../../imagens";
import {
  ALTURA_CARTAO,
  grausCss,
  LARGURA_CARTAO,
  montarCartoes,
  RAZAO_ANEL,
  VOLTA_S,
} from "./geometria";

/* ----------------------------------------------------------------------------
 * A RODA — dois anéis de rostos girando em volta de um oco, e o oco é conteúdo.
 *
 * ESTE ARQUIVO SÓ MONTA A MARCAÇÃO. Quem move é o <Morph>, do lado do cliente.
 * A divisão é de propósito: o servidor entrega a roda pronta e girando por CSS, e
 * o cliente ADOTA essa marcação para desenrolá-la no scroll. Sem JS a dobra
 * continua inteira; com JS ela ganha o segundo ato.
 *
 * A GEOMETRIA MORA EM geometria.ts, não aqui. Antes os números viviam em dois
 * arquivos que se declaravam espelhos um do outro nos comentários — o que dura
 * até a primeira vez que alguém muda um só. Agora este arquivo não decide nada:
 * ele lê.
 *
 * ── COMO GIRA SEM JS. Cada cartão é um BRAÇO ancorado no centro:
 * `transform: rotate(--a) translateX(--r)` põe o braço no ângulo dele, e a
 * keyframe anima a propriedade INDIVIDUAL `rotate` — que é aplicada ANTES do
 * `transform`, em volta da mesma origem. Somar duas rotações em torno do mesmo
 * ponto é somar ângulos, então o cartão percorre a circunferência. Dentro do
 * braço, o cartão roda ao contrário na mesma duração (`animation-direction:
 * reverse`, que é 360→0 ≡ −360f mod 360), o que o mantém EM PÉ enquanto orbita.
 *
 * ── OS DOIS JOGOS DE ÂNGULO, e por que não é duplicação.
 * `--a` sai em GRAUS no referencial do CSS (0° às 3h) e `data-a` sai em RADIANOS
 * a partir das 6h. Não são duas verdades: `grausCss()` deriva o primeiro do
 * segundo. O radiano-a-partir-das-6h é o referencial em que o desenrolar é exato
 * (as 6h são onde o anel encosta na reta); os graus existem só porque o
 * `transform` estático do fallback fala essa língua.
 * -------------------------------------------------------------------------- */

/* Montado UMA vez, no módulo: é um Server Component sem props variáveis. */
const CARTOES = montarCartoes(rostosOrbita.length);

export function Roda({ children }: { children: ReactNode }) {
  return (
    <div
      className="lp3-roda"
      /* AS TRÊS RAZÕES SAEM DAQUI, não do v3.css, e é isto que torna verdadeira a
         frase do cabeçalho do geometria.ts ("o CSS só precisa saber de UM número").
         Antes elas estavam escritas à mão nos dois lugares, e a divergência era
         silenciosa: subir LARGURA_CARTAO de 0,30 para 0,34 mudava N_ANEL de [26,38]
         para [23,34] e o espaçamento que o JS usa na barra, enquanto `--o-w`
         continuava 0,30·r0 — a barra formada aparecia com buracos entre as fotos, e
         o `tsc` saía 0. O raio continua vindo do CSS (é ele quem tem o clamp e a
         media query); o que vem daqui são as PROPORÇÕES. */
      style={{
        "--o-r1": `calc(var(--o-r0) * ${RAZAO_ANEL})`,
        "--o-w": `calc(var(--o-r0) * ${LARGURA_CARTAO})`,
        "--o-h": `calc(var(--o-r0) * ${ALTURA_CARTAO})`,
      } as CSSProperties}
    >
      {/* O CAMPO é UMA imagem para quem não enxerga, não sessenta e quatro.
          Os cartões vão com `alt=""` e o grupo carrega um `role="img"` com o nome
          acessível inteiro: um leitor de tela anunciando 64 retratos de banco de
          imagem, um a um, transformaria a dobra num túnel. O `alt` real de cada
          rosto continua escrito em imagens.ts, onde serve de documentação para
          quem for trocar as fotos. */}
      <div
        className="lp3-roda-campo"
        role="img"
        aria-label="Dezenas de retratos de rapazes girando em dois anéis, em volta da frase."
      >
        {/* AGRUPADO POR ANEL. O agrupamento existia para um recuo de opacidade no
            anel de fora que foi REMOVIDO em 06/08/2026 (foto é força cheia ou nada).
            Fica mesmo assim, e a razão original vale para qualquer efeito de grupo
            que venha depois: como os cartões se sobrepõem uns 20%, um efeito por
            CARTÃO faz cada um deixar ver o de baixo através de si e a coroa vira um
            borrão translúcido em vez de uma pilha de fotos. Num grupo, o navegador
            compõe os cartões opacos primeiro e só então aplica o efeito ao todo.
            O <Morph> continua escrevendo por cartão só o portão da costura. */}
        {([0, 1] as const).map((anel) => (
          <div key={anel} className="lp3-anel" data-anel={anel}>
            {CARTOES.filter((c) => c.anel === anel).map((c, i) => {
              const rosto = rostosOrbita[c.rosto];
              return (
                <div
                  key={i}
                  className="lp3-braco"
                  /* lidos pelo <Morph> no mount. É por aqui que cliente e servidor
                     concordam sobre onde cada cartão está, sem uma segunda lista. */
                  data-a={c.a.toFixed(6)}
                  data-anel={c.anel}
                  data-t={c.tilt.toFixed(3)}
                  style={{
                    "--a": `${grausCss(c.a).toFixed(2)}deg`,
                    "--r": `var(--o-r${c.anel})`,
                    "--dur": `${(c.anel === 0 ? VOLTA_S : VOLTA_S * RAZAO_ANEL).toFixed(1)}s`,
                    "--t": `${c.tilt.toFixed(2)}deg`,
                  } as CSSProperties}
                >
                  <div className="lp3-cartao">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rosto.url}
                      alt=""
                      width={240}
                      height={300}
                      /* `eager` porque a roda inteira está na primeira tela e
                         `lazy` aqui não adiaria nada — só atrasaria. `low` porque
                         o pixel medido da dobra é a frase, não os retratos. E são
                         32 arquivos, não 64: os cartões repetem URLs e o navegador
                         busca cada uma uma vez só. */
                      loading="eager"
                      fetchPriority="low"
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* O OCO. Fica FORA do campo descrito acima porque é conteúdo, e é ele que
          dá referente ao "esses" da frase. A garantia de que nenhum cartão encosta
          aqui é geométrica e está demonstrada no v3.css. */}
      <div className="lp3-miolo">{children}</div>
    </div>
  );
}

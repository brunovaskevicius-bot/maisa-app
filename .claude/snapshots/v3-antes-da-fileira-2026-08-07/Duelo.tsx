import React from "react";
import { Frase } from "../completa/Maisa";
import {
  DUELO_FONTE,
  DUELO_LADOS,
  DUELO_LEAD,
  DUELO_SALDO,
  DUELO_TITULO,
  RISCO_H,
  frase,
} from "./dados";

/* ----------------------------------------------------------------------------
 * A TERCEIRA SEÇÃO — o duelo. Contratar alguém contra assinar a maisa.
 *
 * Inspirada na seção "Humano vs. Inteligência Artificial" da LP em produção
 * (maisasecretary.com.br), apontada como a que "traz bem o valor da maisa".
 * REIMAGINADA, não portada — o que mudou e por quê está tudo escrito abaixo.
 *
 * ── O QUE MUDOU DA REFERÊNCIA ─────────────────────────────────────────────
 *
 * 1. OS CARTÕES SE SEPARAM. Lá eles são duas metades encostadas de um bloco só,
 *    com um "VS" circular tapando a costura. Isso resolve um problema que a
 *    referência criou: dois retângulos colados precisam de algo escondendo a
 *    junta. Separados, a junta não existe — e a comparação passa a ser lida pelo
 *    PARALELISMO das listas (item 1 contra item 1, na mesma ordem), que é como
 *    ela já funcionava de verdade. O "vs" fica, mas como dobradiça no vão, não
 *    como tampa.
 *
 * 2. OS DOIS ÍCONES SAÍRAM — o relâmpago e o boneco de usuário. Pedido, e a
 *    página concorda: nenhuma outra seção desta LP tem ícone. O vocabulário dela
 *    é forma em CSS (o `.lp3-t-ponto` da seção das telas é um <span> redondo, não
 *    um SVG), e os marcadores daqui são o mesmo ponto — vazado no card humano,
 *    cheio no card da maisa. Um ícone aqui seria a única biblioteca de ícones da
 *    página inteira, carregada para desenhar duas figuras decorativas.
 *
 * 3. UMA LINHA HORIZONTAL ATRAVESSA OS DOIS CARTÕES POR TRÁS, e é ela que amarra os
 *    cartões agora que eles não se encostam. Não é mais o laço da seção das telas:
 *    é o `RISCO_H`, um traço aberto de 1600×96 de viewBox (ver a nota dele em
 *    dados.ts para o porquê de ser outro `d` e não o laço esticado).
 *
 *    O EFEITO INTEIRO DEPENDE DE OS CARTÕES SEREM OPACOS, e eles são (`--mk-surface`
 *    e `--mk-ink`). A linha entra pela margem esquerda, DESAPARECE atrás do primeiro
 *    cartão, reaparece no vão — atrás da dobradiça "vs", que também é opaca —,
 *    desaparece atrás do segundo e sai pela direita. Quem olha completa o pedaço que
 *    não vê, e é aí que os dois cartões passam a ler como uma peça só. Não é ilusão
 *    de sorte: é a razão de a linha estar na MEIA-ALTURA e não em outro lugar.
 *
 *    ⚠️ ISSO SIGNIFICA QUE A MAIOR PARTE DA LINHA NUNCA É VISTA, e é de propósito.
 *    Medido em 1440 (07/08/2026): aparecem 334px de 1567 — 130px em cada margem e
 *    duas fatias de 37px no vão, uma de cada lado da dobradiça. Em 900 caem para
 *    119px. Quem for "consertar" trazendo a linha para frente dos cartões mata o
 *    efeito e ganha um risco riscando o preço.
 *
 *    ⚠️ ERA PARA SEREM DOIS RISCOS — um atrás do título e uma varredura larga.
 *    Medido em 07/08/2026, não deu: liam como rabisco em cima de rabisco, não como
 *    fundo. Um traço só é o gesto; dois são bagunça. E agora há um segundo motivo:
 *    o pedido de 07/08 foi "somente uma linha horizontal". O título ficou sem risco
 *    por trás, e isso é a decisão, não um esquecimento.
 *
 * 4. O DESTAQUE DO CARD DA MAISA É LUZ, NÃO TARJA. Lá é uma pílula "RECOMENDADO"
 *    no canto — que é o mesmo recurso que o cliente reprovou na v3 em 06/08. Aqui
 *    o card é levantado, escurecido e cercado de brilho azul. Diz "é este" sem
 *    precisar escrever, e sem repetir a tarja que já foi rejeitada nesta página.
 *
 * ── O MOVIMENTO, EM DUAS CAMADAS E NENHUMA A MAIS ─────────────────────────
 * O pedido de 07/08 foi em duas rodadas: primeiro "horizontal, animada, adicionando
 * movimento"; depois, vendo no ar, "que ele tivesse um percurso para percorrer". São
 * duas animações, e a divisão de trabalho entre elas é o eixo que as governa:
 *
 *   · O DESENHO (por ROLAGEM) — a linha se risca da esquerda para a direita enquanto
 *     os cartões entram na tela. É a entrada, e acontece UMA vez. Combinado com os
 *     cartões opacos, lê como a linha passando atrás deles.
 *   · O PERCURSO (por TEMPO) — um pulso de 17% do caminho atravessando o fio de ponta
 *     a ponta em 9s, infinito. Existe porque o desenho termina: sem ele a seção fica
 *     parada para quem chegou e ficou. E faz um trabalho que o desenho não faz — como
 *     só ~21% do fio é visível, o pulso acende as janelas EM SEQUÊNCIA e é isso que
 *     revela, de novo a cada volta, que o fio atravessa os cartões em vez de parar em
 *     cada borda. O desenho conta essa história uma vez; o pulso conta sempre.
 *
 * ⚠️ A SEGUNDA CAMADA JÁ FOI OUTRA COISA. Era a `lp3-d-deriva`, um vai-e-vem de 13px
 * em 22s: mantinha a seção viva, mas balançava o fio sem levá-lo a lugar nenhum —
 * oscilação, não percurso. Saiu quando o pedido ficou explícito. Quem pensar em
 * repô-la junto com o pulso: são dois movimentos disputando o mesmo fio, e a deriva
 * ainda faz a posição do pulso oscilar junto.
 *
 * ZERO JAVASCRIPT, E ISSO É UMA ESCOLHA. A seção sai inteira do servidor. O desenho
 * usa `animation-timeline: view()` dentro de um `@supports` — API que a <Sincronia>
 * rejeitou para a seção das telas, e com razão LÁ: o modo de falha de lá era o risco
 * travado pela metade. Aqui o modo de falha é o traço COMPLETO e parado, sem pulso
 * estacionado em cima dele, que é exatamente o pôster que se quer. Quando o fallback
 * é o estado desejado, a API sem suporte universal sai de graça.
 * -------------------------------------------------------------------------- */

/** A linha de fundo da seção. UMA, horizontal — ver o item 3 do cabeçalho.
 *
 *  Dois <path> com o MESMO `d`, e isso não contradiz "uma linha só": o segundo não é
 *  outra linha, é UM PULSO QUE PERCORRE a primeira. Ele mostra ~17% do caminho de
 *  cada vez, 1,7× mais grosso, e viaja da ponta esquerda à direita em 9s, em loop —
 *  o fio engrossa e relaxa na passagem, que é a pressão que um marcador deixa.
 *
 *  ⚠️ É ELE QUE TORNA A ROTA ESCONDIDA LEGÍVEL, e esse é o motivo de existir (pedido
 *  de 07/08: "que ele tivesse um percurso para percorrer"). Como só ~21% da linha
 *  aparece, o pulso acende a margem esquerda, apaga atrás do primeiro cartão, acende
 *  no vão, apaga, e sai pela direita — e é aí que se entende que o fio ATRAVESSA os
 *  cartões em vez de simplesmente parar em cada borda. O desenho por rolagem conta
 *  essa história uma vez; o pulso conta sempre.
 *
 *  AQUI MOROU A "PONTA DA CANETA", que ficava presa na cabeça do traço durante o
 *  desenho e encolhia a zero no fim. Saiu porque o pulso faz o mesmo trabalho e não
 *  para: ter os dois seria duas marcas viajando no mesmo fio, uma delas só na
 *  entrada. O pulso herdou a única coisa que importava dela — ver no v3.css como ele
 *  fica confinado ao pedaço JÁ DESENHADO enquanto a rolagem desenha.
 *
 *  Fazer isso com um só <path> não dá: seria dasharray e stroke-width diferentes no
 *  mesmo elemento ao mesmo tempo. */
function Risco() {
  return (
    <svg
      className="lp3-d-risco"
      /* 1600×96 — proporção extrema de propósito, ver a nota do `RISCO_H`. */
      viewBox="0 0 1600 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* `pathLength="1"` nos dois, como na seção das telas: o dasharray vira 1 e o
          offset vira "quanto falta", então o CSS desenha e percorre o traço sem
          ninguém medir `getTotalLength()` em JavaScript. */}
      <path className="lp3-d-traco" d={RISCO_H} pathLength="1" />
      <path className="lp3-d-pulso" d={RISCO_H} pathLength="1" />
    </svg>
  );
}

export function Duelo() {
  return (
    <section className="lp3-d" aria-labelledby="lp3-d-titulo">
      <header className="lp3-d-cab">
        <h2 className="lp3-d-titulo" id="lp3-d-titulo">
          {DUELO_TITULO}
        </h2>
        <span className="lp3-d-filete" aria-hidden="true" />
        <p className="lp3-d-lead">{DUELO_LEAD}</p>
      </header>

      {/* A ARENA existe por um motivo medível: a linha tem de cortar os CARTÕES, e
          `top: 50%` da <section> não é o meio dos cartões — a seção tem cabeçalho em
          cima e a linha da fonte embaixo, então o meio dela cai acima do meio deles.
          A arena embrulha só a grade, e aí `top: 50%` passa a ser, por construção, a
          meia-altura dos dois cartões. Sem ela a mesma correção viraria um número
          chutado em `top`, que quebraria no dia em que o cabeçalho ganhasse uma linha. */}
      <div className="lp3-d-arena">
        <Risco />

        <div className="lp3-d-grade">
          {DUELO_LADOS.map((lado, i) => (
            <React.Fragment key={lado.chave}>
              {/* A dobradiça entra ENTRE os dois, como irmã dos cartões na grade —
                e não dentro de um deles, que a deixaria pendurada em quem ela
                separa. No celular a grade vira uma coluna e ela vira divisória. */}
              {i > 0 && (
                <span className="lp3-d-vs" aria-hidden="true">
                  vs
                </span>
              )}

              <article className="lp3-d-cartao" data-lado={lado.chave}>
                <p className="lp3-d-rotulo">{lado.rotulo}</p>
                <h3 className="lp3-d-nome">
                  <Frase trechos={frase(lado.nome)} />
                </h3>

                {/* O preço é <p> e não <strong>: ele já é o maior tipo do card, e a
                  ênfase semântica sobraria num número que ninguém deixa de ver. */}
                <p className="lp3-d-preco">
                  {lado.preco}
                  <span className="lp3-d-periodo">{lado.periodo}</span>
                </p>
                <p className="lp3-d-nota">{lado.nota}</p>

                <ul className="lp3-d-itens">
                  {lado.itens.map((item) => (
                    <li className="lp3-d-item" key={item}>
                      {/* O mesmo ponto da seção das telas, no lugar do ✓ e do •. */}
                      <span className="lp3-d-ponto" aria-hidden="true" />
                      <span className="lp3-d-txt">{item}</span>
                    </li>
                  ))}
                </ul>

                {lado.chave === "maisa" && (
                  <p className="lp3-d-saldo">
                    <strong className="lp3-d-saldo-valor">
                      {DUELO_SALDO.valor}
                    </strong>{" "}
                    {DUELO_SALDO.texto}
                  </p>
                )}
              </article>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* A FONTE FICA NA PÁGINA, não num comentário do código. A seção afirma um
          número sobre o bolso de quem lê; esconder a origem dele é o que a v1
          fazia com os "+38% agenda mais cheia". */}
      <p className="lp3-d-fonte">
        {DUELO_FONTE.texto}{" "}
        <a href={DUELO_FONTE.href} target="_blank" rel="noopener noreferrer">
          {DUELO_FONTE.veiculo}
        </a>
      </p>
    </section>
  );
}

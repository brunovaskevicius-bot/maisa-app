import React from "react";
import { Frase } from "../completa/Maisa";
import {
  DUELO_FONTE,
  DUELO_LADOS,
  DUELO_LEAD,
  DUELO_SALDO,
  DUELO_TITULO,
  ONDA_H,
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
 * ── O MOVIMENTO: UMA ONDA QUE ANDA ────────────────────────────────────────
 * O pedido de 07/08 veio em três rodadas, e a terceira consertou as duas primeiras:
 * "horizontal, animada" → "que ele tivesse um percurso para percorrer" → e, depois de
 * o resultado aparecer PARADO na tela do Bruno, "faça uma animação no estilo de onda,
 * aí acho que funciona tranquilo". Funcionou, e o "por que" importa mais que o efeito:
 *
 * ⚠️ O NAVEGADOR DELE É O ZEN, QUE É FORK DO FIREFOX — e as duas tentativas anteriores
 * eram as duas coisas que o Gecko não faz igual ao Chrome:
 *   · `animation-timeline: view()` (o desenho por rolagem) — não roda ali;
 *   · custom property animada alimentando `stroke-dashoffset` via `calc()` (o pulso) —
 *     é o arranjo em que o valor muda e o paint do <path> não é invalidado.
 * As duas passavam em todos os meus testes porque eu só testava Chrome headless. O fio
 * ficava literalmente estático, sem erro nenhum, exatamente como ele descreveu.
 *
 * A ONDA NÃO TEM ESSE PROBLEMA, e é por isso que ela é a resposta certa e não só a
 * próxima ideia: ela anda com `transform: translateX()`, que é a animação mais
 * universalmente suportada que existe, é composta fora do main thread e SEMPRE repinta.
 * Não há motor em que ela "ande sem pintar". O `d` é periódico (ver `ONDA_H` em
 * dados.ts) e o deslocamento é de exatamente um período, então o loop não tem emenda.
 *
 * DE BRINDE ELA CONSERTA O DESENHO NO GECKO. O traço ainda se risca por rolagem onde
 * `view()` existe; onde não existe, `--d-p` fica em 1, a linha nasce inteira — e a onda
 * garante que a seção tenha movimento de qualquer jeito. Antes, sem `view()`, não havia
 * movimento nenhum. E onde `view()` existe, a onda ainda ajuda: como ela repinta o
 * <path> a cada quadro, o `stroke-dashoffset` derivado de `--d-p` é reavaliado junto,
 * o que remove justamente a dependência de invalidação que quebrou o pulso.
 *
 * ZERO JAVASCRIPT continua valendo. A seção sai inteira do servidor.
 * -------------------------------------------------------------------------- */

/** A linha de fundo da seção. UMA, horizontal, ondulando — ver o item 3 do cabeçalho.
 *
 *  UM <path> SÓ. Chegou a ter dois (traço + um pulso que o percorria, 1,7× mais
 *  grosso); o pulso saiu com a troca para a onda, porque a onda move o fio INTEIRO e
 *  um pulso viajando em cima de um fio que já se move é movimento sobre movimento.
 *  Some com ele o `--d-pulso`, a trava de espessura e os keyframes de `stroke-dashoffset`
 *  — tudo isso existia para o pulso, e nada disso funcionava no Gecko. */
function Risco() {
  return (
    <svg
      className="lp3-d-risco"
      /* 1600×96 — proporção extrema de propósito, ver a nota do `ONDA_H`. O `d` vai de
         x=-100 a x=2300, ou seja MUITO além do viewBox: é a pista de sobra que a onda
         consome ao deslizar. `overflow: visible` no CSS é o que deixa isso aparecer. */
      viewBox="0 0 1600 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* `pathLength="1"`, como na seção das telas: o dasharray vira 1 e o offset vira
          "quanto falta", então o CSS desenha o traço sem ninguém medir
          `getTotalLength()` em JavaScript. */}
      <path className="lp3-d-traco" d={ONDA_H} pathLength="1" />
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

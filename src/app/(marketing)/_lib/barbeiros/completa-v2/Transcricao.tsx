import React from "react";
import { FIO, partes, type Turno } from "./dados";
import { Maisa } from "../completa/Maisa";
import { ICPS } from "../../icp";

/* ============================================================================
 * O FIO — a conversa, dentro do celular.
 *
 * TERCEIRA VERSÃO deste bloco, e vale registrar por quê, porque as duas anteriores
 * erraram em direções opostas.
 *
 * A v1 tinha um stepper: quatro passos numerados numa lista à esquerda, um mockup
 * de celular à direita, autoplay de 5s trocando o painel. O celular estava CERTO —
 * ele ancora a conversa num lugar real, e a promessa da página é "no WhatsApp que
 * sua barbearia já usa". O stepper estava errado, e de forma medida: três dos
 * quatro painéis viviam em `aria-hidden` + `opacity: 0`, ou seja 75% do argumento
 * era invisível em qualquer instante; o texto dos passos inativos ficava a 2,51:1,
 * abaixo de AA; o autoplay trocava mais rápido do que dá para ler e o clique só
 * REINICIAVA o timer em vez de assumir o controle; e havia medalhões 01–04, barra
 * de progresso e eyebrow — scaffold de template.
 *
 * A v2 jogou fora o celular junto com o stepper e virou uma transcrição corrida de
 * 1.700px. Ficou legível e ficou sem lugar: sem a moldura, o fio lê como roteiro
 * de teatro, não como coisa que aconteceu no telefone de alguém.
 *
 * Esta versão fica com o que cada uma acertou: A MOLDURA VOLTA, O STEPPER NÃO.
 * Um celular só, a conversa INTEIRA dentro dele, nada escondido, nada girando
 * sozinho, nada numerado. O que era "passo 01/02/03" vira o que já é no WhatsApp
 * de verdade: separador de dia. E as notas de margem — o que cada trecho prova —
 * ficam FORA do aparelho, do lado, como quem aponta para a tela e explica.
 *
 * Server Component. Zero estado: não há o que pausar quando não há autoplay.
 * ========================================================================== */

/* ─────────────────────── as três vozes ───────────────────────
 * Dentro do aparelho a gramática é a do WhatsApp, e ela é conhecida: quem recebe
 * fica à esquerda, quem envia fica à direita. Aqui o "aparelho" é o do CLIENTE —
 * é a tela dele que estamos vendo —, então o cliente fica à direita e a barbearia
 * (maisa e dono) à esquerda. Isso é o oposto do que a v2 fazia, e o oposto estava
 * errado: a v2 punha a maisa à direita "porque ela fala pelo dono", o que é
 * verdade no organograma e mentira na tela de quem recebe a mensagem.
 *
 * O dono se separa da maisa por COR, não por lado: os dois são a barbearia, mas um
 * é gente. É a diferença que o bloco existe para mostrar. */
type EstiloVoz = {
  rotulo: string;
  alinhamento: "flex-start" | "flex-end";
  fundo: string;
  tinta: string;
  tintaHora: string;
  canto: string;
};

const VOZES: Record<Turno["voz"], EstiloVoz> = {
  /* o cliente é quem segura o telefone: direita, e no verde-escuro que o WhatsApp
     usa para a própria fala. --mk-whats é o verde já escurecido do sistema (o da
     marca, #25D366, nunca aceita texto branco: dá 1,98:1). */
  cliente: {
    rotulo: "Cliente:",
    alinhamento: "flex-end",
    fundo: "var(--mk-whats)",
    tinta: "var(--mk-whats-ink)",
    /* 88% e não 72%. A 72% a hora dava 3,99:1 sobre o verde, medido por
       rasterização (oklch → sRGB no canvas, luminância WCAG) — abaixo do 4,5:1 de
       AA, e 10,5px não é texto grande, então não existe a saída dos 3:1. Era a
       ÚNICA falha de contraste de toda a página, e aparecia 6 vezes: uma por bolha
       de cliente. A 88% passa e a hora continua recuada em relação à fala, que é o
       único trabalho dela. */
    tintaHora: "color-mix(in oklab, var(--mk-whats-ink) 88%, var(--mk-whats))",
    canto: "16px 4px 16px 16px",
  },
  /* a maisa é a barbearia respondendo: esquerda, bolha neutra do aparelho */
  maisa: {
    rotulo: "MAISA:",
    alinhamento: "flex-start",
    fundo: "var(--mk-panel-2)",
    tinta: "var(--mk-ink)",
    tintaHora: "var(--mk-muted)",
    canto: "4px 16px 16px 16px",
  },
  /* o dono também é a barbearia — mesmo lado — mas em dourado: é o momento em que
     um humano entra na conversa, e é o argumento inteiro deste bloco */
  dono: {
    rotulo: "Diego, da barbearia:",
    alinhamento: "flex-start",
    fundo: "var(--mk-cta)",
    tinta: "var(--mk-cta-ink)",
    /* OKLAB e não OKLCH: --mk-cta-ink (H 262) e --mk-cta (H 82) estão a 180° um do
       outro, e a interpolação polar nessa distância é ambígua — o navegador pode ir
       por qualquer lado do círculo. Em OKLAB a mistura é retangular e cai num
       neutro escuro, que é o que se quer numa hora discreta. */
    tintaHora: "color-mix(in oklab, var(--mk-cta-ink) 70%, var(--mk-cta))",
    canto: "4px 16px 16px 16px",
  },
};

function Bolha({ t }: { t: Turno }) {
  const v = VOZES[t.voz];
  return (
    <li
      style={{
        display: "flex",
        justifyContent: v.alinhamento,
        /* o `mk-reveal` NÃO entra aqui. A conversa inteira nasce visível: foi
           justamente o que estava escondido na v1 que tornava o argumento
           inalcançável. Movimento neste bloco só existiria para atrasar leitura. */
      }}
    >
      <div
        style={{
          maxWidth: "82%",
          padding: "9px 12px 7px",
          borderRadius: v.canto,
          background: v.fundo,
          color: v.tinta,
          fontFamily: "var(--mk-font-body)",
          /* 14px dentro de um aparelho de 300px é o tamanho real de uma mensagem —
             a v1 usava 13,5px num mockup menor e o texto virava textura. */
          fontSize: "14px",
          lineHeight: 1.45,
          textWrap: "pretty",
        }}
      >
        {/* quem fala, para leitor de tela: dentro do aparelho a autoria é dada por
            lado e cor, que não existem no áudio */}
        <span className="sr-only">{v.rotulo} </span>
        {partes(t.texto).map((p, i) =>
          p.marca ? <Maisa key={i} /> : <React.Fragment key={i}>{p.t}</React.Fragment>,
        )}
        <time
          dateTime={t.hora}
          style={{
            display: "block",
            marginTop: 2,
            textAlign: "right",
            fontSize: "10.5px",
            fontVariantNumeric: "tabular-nums",
            color: v.tintaHora,
          }}
        >
          {t.hora}
        </time>
      </div>
    </li>
  );
}

export function Transcricao() {
  const cfg = ICPS.barbeiros;
  /* onde a maisa para e chama o dono — detectado pelo CONTEÚDO (o primeiro par
     maisa → dono), não por índice fixo, para sobreviver a reescrita de copy */
  const marcoDaPassagem = FIO.findIndex((m) =>
    m.turnos.some((t, i) => t.voz === "maisa" && m.turnos[i + 1]?.voz === "dono"),
  );

  return (
    <section aria-labelledby="lp2-fio-titulo" className="lp2-r-denso" style={{ background: "var(--mk-bg)" }}>
      <div className="lp2-largura-bloco lp2-fio">
        {/* ───────────── a explicação, fora do aparelho ───────────── */}
        <div className="lp2-fio-nota">
          <h2 id="lp2-fio-titulo" className="lp2-titulo" style={{ margin: 0, color: "var(--mk-ink)" }}>
            É esta conversa que acontece sem você.
          </h2>

          <ol className="lp2-fio-marcos">
            {FIO.map((m, i) => (
              <li key={m.dia}>
                <span style={{ display: "block", fontFamily: "var(--mk-font-body)", fontWeight: 700, fontSize: "0.95rem", color: "var(--mk-ink)" }}>
                  {m.dia}
                </span>
                <span style={{ display: "block", marginTop: 4, font: "400 0.95rem/1.55 var(--mk-font-body)", color: "var(--mk-muted)", textWrap: "pretty" }}>
                  {m.nota}
                </span>
                {/* O CTA vive no marco em que ela chama o dono — mas DEPOIS da
                    explicação, fora do aparelho, e não no meio das bolhas.
                    A versão anterior punha o botão no indent onde a fala do dono
                    iria: era elegante e custava caro. Quem clicava nunca lia a
                    resposta do Diego, que é justamente a prova de que ela não
                    decide sozinha — o melhor argumento da página e o botão
                    disputavam o mesmo leitor. E o botão era da mesma cor da bolha
                    do dono logo abaixo: dois objetos dourados seguidos, fácil de
                    parsear o CTA como parte da conversa. Aqui ele fica na coluna
                    de quem explica, onde botão é botão. */}
                {i === marcoDaPassagem && (
                  <a href={cfg.rotas.base} className="lp2-btn mk-focus" style={{ marginTop: 18 }}>
                    <span>Quero isso na minha barbearia</span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* ───────────── o aparelho ─────────────
            Um só, com a conversa inteira. Não rola por dentro: a coluna cresce e a
            PÁGINA rola. Um scroll aninhado aqui esconderia texto de novo, que é o
            defeito que esta versão existe para não repetir. */}
        <div className="lp2-fio-fone" aria-hidden="false">
          <div className="lp2-fio-tela">
            {/* cabeçalho do contato — é a barbearia, porque a tela é a do cliente */}
            <header className="lp2-fio-topo">
              <span className="lp2-fio-avatar" aria-hidden="true">N</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", font: "700 13.5px/1.2 var(--mk-font-body)", color: "var(--mk-ink)" }}>
                  Navalha de Ouro
                </span>
                <span style={{ display: "block", marginTop: 2, font: "400 11px/1.2 var(--mk-font-body)", color: "var(--mk-muted)" }}>
                  online
                </span>
              </span>
            </header>

            <div className="lp2-fio-corpo">
              {FIO.map((m) => (
                <React.Fragment key={m.dia}>
                  {/* separador de dia — o que no WhatsApp real substitui a
                      numeração 01/02/03 que a v1 inventava */}
                  <p className="lp2-fio-dia-sep">{m.dia}</p>
                  <ol className="lp2-fio-lista">
                    {m.turnos.map((t, i) => (
                      <Bolha key={`${m.dia}-${i}`} t={t} />
                    ))}
                  </ol>
                </React.Fragment>
              ))}
            </div>

            {/* campo de mensagem: inerte de propósito, é cenário do aparelho */}
            <div className="lp2-fio-campo" aria-hidden="true">
              <span>Mensagem</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

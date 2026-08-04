import { PERGUNTAS, ROTULO_FIO } from "./dados";

/* ----------------------------------------------------------------------------
 * Bloco 4 — as três perguntas que travam a compra.
 *
 * Substitui DUAS seções da v1 de uma vez:
 *
 *  · o FAQ, que gastou os quatro slots em "qual o número", "e se eu tiver vários
 *    barbeiros", "quem é o time por trás da maisa" e "quanto tempo demora" —
 *    descartando as três objeções reais e já testadas que vivem em
 *    FaqBarbeiros.tsx:26, :30 e :42. Perguntar "quem é o time" numa landing page
 *    é a empresa se interessando por si mesma no espaço do cliente.
 *
 *  · a prova social, que fabricava seis clientes reciclando as fotos do herói e os
 *    nomes dos próprios barbeiros (dados.ts:82,91,102 → :152-153) sob a afirmação
 *    factual "Atendido ontem" — com a política contrária escrita no mesmo repo, em
 *    DepoimentosBarbeiros.tsx:8-13.
 *
 * A objeção de confiança é respondida sem inventar nada: pela garantia e pela
 * credencial verdadeira (Poli Júnior). Uma versão anterior deste bloco também
 * declarava a ausência de depoimentos — "não temos depoimento de barbeiro pra te
 * mostrar ainda" — na teoria de que a franqueza compraria confiança. Não compra:
 * lida na tela, ela só informa que ninguém usou o produto, no exato ponto em que a
 * pessoa está decidindo. Não afirmar prova falsa já é a honestidade; anunciar a
 * falta é autodepreciação, e autodepreciação não é argumento.
 *
 * Server Component. `<details>/<summary>` nativo, zero JS, mesmo padrão de
 * FaqBarbeiros.tsx. O conteúdo fica NO DOM: um FAQPage cujo conteúdo não está no
 * DOM não é elegível para rich result, então esconder as respostas atrás de JS
 * seria perder o SEO e o leitor de uma vez.
 * -------------------------------------------------------------------------- */

export function Perguntas() {
  /* O JSON-LD só é legítimo porque o texto acima está visível. */
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PERGUNTAS.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: { "@type": "Answer", text: p.a },
    })),
  };

  return (
    <section
      aria-labelledby="lp2-perguntas-titulo"
      className="lp2-r-estreito"
      style={{ background: "var(--mk-bg)" }}
    >
      <div className="lp2-largura-leitura">
        {/* O RÓTULO DE HONESTIDADE DO FIO, e ele vem AQUI — depois da transcrição,
            nunca antes. Dizer "isto não aconteceu" antes de ler a coisa cuja força
            é "isto aconteceu" desarma o próprio argumento. E a formulação diz o que
            é verdade: a autoridade do fio é comportamento demonstrado, não evento
            ocorrido. */}
        <p
          style={{
            margin: 0,
            paddingBottom: "clamp(28px, 4vw, 44px)",
            borderBottom: "1px solid var(--mk-line)",
            font: "400 0.92rem/1.6 var(--mk-font-body)",
            color: "var(--mk-muted)",
            textWrap: "pretty",
          }}
        >
          {ROTULO_FIO}
        </p>

        <h2
          id="lp2-perguntas-titulo"
          style={{
            margin: "clamp(40px, 5vw, 64px) 0 clamp(20px, 3vw, 32px)",
            fontFamily: "var(--mk-font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: "var(--mk-ink)",
            textWrap: "balance",
          }}
        >
          O que trava na hora de decidir
        </h2>

        {/* `<details>` nativo: abre sem JS, é focável por teclado de graça, anuncia
            estado no leitor de tela de graça, e não tem `disabled` que roube o foco
            no clique (o FAQ da v1 tinha exatamente esse bug). */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {PERGUNTAS.map((p, i) => (
            <details
              key={p.q}
              /* a primeira nasce aberta: se todas estiverem fechadas, o bloco vira
                 uma lista de três linhas e o leitor não sabe que há resposta ali */
              open={i === 0}
              style={{
                borderTop: i === 0 ? "1px solid var(--mk-line)" : undefined,
                borderBottom: "1px solid var(--mk-line)",
              }}
            >
              <summary
                className="mk-focus"
                style={{
                  cursor: "pointer",
                  listStyle: "none",
                  /* alvo de toque com folga — 44px é o piso e o padding entrega mais */
                  padding: "18px 40px 18px 0",
                  position: "relative",
                  fontFamily: "var(--mk-font-body)",
                  fontWeight: 600,
                  fontSize: "clamp(1.02rem, 1.5vw, 1.15rem)",
                  lineHeight: 1.4,
                  color: "var(--mk-ink)",
                  textWrap: "pretty",
                }}
              >
                {p.q}
                {/* O SINAL DE ESTADO, agora com estado. O comentário aqui dizia que
                    girar o glifo no `details[open]` "seria melhor, mas como não posso
                    depender disso aqui" — o que era falso: o v2.css existe, é
                    importado pela página e é exclusivo desta LP. O resultado do
                    engano é que o "+" nunca virava "−", inclusive no primeiro painel,
                    que nasce ABERTO e ainda assim mostrava "+" — o sinal dizia
                    "clique para abrir" em cima de um painel aberto.
                    A rotação de 45° transforma o "+" em "×" (fechar), que é o par
                    visual honesto de um "+" (abrir). A informação de estado real
                    continua vindo do próprio <details> para leitor de tela. */}
                <span
                  className="lp2-sinal"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    color: "var(--mk-muted)",
                    fontSize: "1.4rem",
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
              </summary>
              <p
                style={{
                  margin: 0,
                  padding: "0 0 22px",
                  font: "400 clamp(1rem, 1.4vw, 1.08rem)/1.65 var(--mk-font-body)",
                  color: "var(--mk-ink-soft)",
                  textWrap: "pretty",
                }}
              >
                {p.a}
              </p>
            </details>
          ))}
        </div>

        {/* AQUI NÃO VAI MAIS NADA, e as duas tentativas anteriores ensinam por quê.

            A primeira era "não temos depoimento de barbeiro pra te mostrar ainda", na
            teoria de que a franqueza compraria confiança. Não compra: lida na tela ela
            só informa que ninguém usou o produto, no exato ponto em que a pessoa está
            decidindo.

            A segunda foi "A maisa é construída e operada pela Poli Júnior", numa faixa
            dourada de 2px à esquerda. Saiu também, por dois motivos independentes:

            · O SIDE-STRIPE. `borderLeft: 2px solid var(--mk-accent)` é a proibição
              absoluta do skill escrita ao pé da letra — borda esquerda colorida com
              mais de 1px. Duas lentes da crítica acharam esta mesma linha.

            · A CREDENCIAL NÃO VIRAVA PROVA NESTE LUGAR. Ela já fecha a página em
              Conta.tsx, e repetida aqui não responde à objeção de confiança: para um
              barbeiro que não sabe o que é uma empresa júnior, "Poli Júnior" não diz o
              que é garantido nem por quem. Trocar uma frase que TIRAVA credibilidade
              por uma que não ADICIONA nenhuma é o mesmo defeito com o sinal invertido —
              ocupar o slot de prova sem ser prova.

            A objeção de confiança segue respondida por duas coisas que são prova de
            verdade: a terceira pergunta acima ("E se não der certo pra mim?") e a
            garantia no fechamento, onde ela ganha o maior corpo da página. Se a
            credencial tiver de voltar, ela precisa DIZER o que garante — quem responde,
            com que contrato — e aí é conteúdo novo, não uma linha de rodapé com
            destaque de acento. */}
      </div>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </section>
  );
}

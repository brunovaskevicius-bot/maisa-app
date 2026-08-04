import type { Metadata } from "next";
import { ICPS } from "@/app/(marketing)/_lib/icp";
import { MaisaDs } from "@/app/(marketing)/_lib/terapeutas-v2/MaisaDs";
import { Multidao } from "@/app/(marketing)/_lib/terapeutas-v2/Multidao";

/* ----------------------------------------------------------------------------
 * /terapeutas/v2 — LP de terapeutas no design system NOVO da maisa
 * (creme + verde-mata + âmbar), não no marketing.css antigo (navy + dourado).
 *
 * A HISTÓRIA, em três atos:
 *   1. quem chega — dez pessoas te procuraram esta semana (a multidão entra);
 *   2. o que elas custam — dez conversas, dez agendamentos, dez notas, e nada
 *      disso é terapia;
 *   3. quem resolve — a maisa atende uma por uma enquanto a seção sobe na tela,
 *      e a fila inteira fica verde.
 *
 * A ilustração conta o ato 2 e 3 sozinha; o texto ao lado só fecha a conta. Ver
 * a emenda do DS em .claude/skills/maisa-design/guidelines/illustration.card.html.
 *
 * VOZ (readme do DS): "você" com a terapeuta; "a maisa" minúscula em terceira
 * pessoa (primeira pessoa só DENTRO da conversa de chat); sentence case; sem
 * emoji; sem jargão; frase curta; número e hora em pt-BR com fonte mono.
 * -------------------------------------------------------------------------- */

const cfg = ICPS.terapeutas;

export const metadata: Metadata = {
  title: "Para terapeutas: a maisa atende, marca e emite a nota",
  description:
    "A maisa responde seus pacientes no WhatsApp, marca a sessão na sua agenda e emite a nota de cada atendimento. Você entra na conversa quando quiser.",
  alternates: { canonical: "/terapeutas/v2" },
};

const PASSOS = [
  {
    n: "01",
    titulo: "A pessoa chama no WhatsApp",
    texto:
      "No seu número, do jeito que ela já faz hoje. A maisa responde na hora, sem deixar ninguém no vácuo até você sair da sessão.",
  },
  {
    n: "02",
    titulo: "A maisa marca na sua agenda",
    texto:
      "Ela vê o que está livre, oferece os horários e confirma. Se a pessoa precisar remarcar, resolve sozinha e te avisa.",
  },
  {
    n: "03",
    titulo: "A nota sai junto",
    texto:
      "Terminou o atendimento, a nota é emitida e o link vai pro WhatsApp da paciente. Você não abre o site da prefeitura.",
  },
];

const RECURSOS = [
  { titulo: "Agenda sem choque", texto: "O mesmo horário nunca é oferecido duas vezes. Bloqueio de almoço e intervalo entre sessões são respeitados." },
  { titulo: "Nota no automático", texto: "NFS-e emitida por atendimento, com o link no WhatsApp de quem pagou. O mês fecha sozinho." },
  { titulo: "Histórico à mão", texto: "Cada pessoa tem a ficha dela: o que já foi conversado, o que foi marcado e o que foi pago." },
  { titulo: "Você entra quando quer", texto: "A maisa começa a conversa. No momento em que você digita, ela sai da frente." },
];

export default function TerapeutasV2Page() {
  return (
    <MaisaDs>
      <header className="t2-nav">
        <div className="t2-container t2-nav__row">
          <span className="ms-logo" style={{ fontSize: 22 }}>
            maisa<span className="ms-logo__dot">.</span>
          </span>
          <nav className="t2-nav__links" aria-label="Seções">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#depoimento">Quem usa</a>
          </nav>
          <a className="ms-btn ms-btn--primary ms-btn--md" href={cfg.ctaUrl} target="_blank" rel="noreferrer">
            Falar com a maisa
          </a>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        {/* ---- Ato 1: a promessa ------------------------------------------ */}
        <section className="t2-container t2-secao">
          <div className="t2-hero">
            <div>
              <p className="t2-eyebrow">Para terapeutas</p>
              <h1>Você estudou pra cuidar de gente. Não pra emitir nota.</h1>
              <p className="t2-lead" style={{ marginTop: "var(--space-6)" }}>
                A maisa atende seus pacientes no WhatsApp, marca a sessão na sua agenda e emite a
                nota de cada atendimento. Você entra na conversa quando quiser.
              </p>
              <div className="t2-hero__acoes">
                <a className="ms-btn ms-btn--primary ms-btn--lg" href={cfg.ctaUrl} target="_blank" rel="noreferrer">
                  Falar com a maisa
                </a>
                <a className="ms-btn ms-btn--secondary ms-btn--lg" href="#como-funciona">
                  Ver como funciona
                </a>
              </div>
              <p className="t2-hero__nota">
                Sem instalar nada. A maisa trabalha no WhatsApp que você já usa.
              </p>
            </div>

            {/* conversa real — dentro do chat a maisa fala em primeira pessoa */}
            <div className="ms-card t2-conversa">
              <div className="t2-conversa__topo">
                <span className="ms-avatar ms-avatar--md" aria-hidden="true">
                  J
                </span>
                <span>
                  <span className="t2-conversa__quem">Juliana Prado</span>
                  <br />
                  <span className="t2-conversa__estado">a maisa está respondendo</span>
                </span>
              </div>

              <div className="ms-chat-row">
                <div className="ms-bubble ms-bubble--in">
                  Oi! Consigo remarcar minha sessão de quinta?
                  <span className="ms-bubble__meta">
                    <span>08:12</span>
                  </span>
                </div>
              </div>
              <div className="ms-chat-row ms-chat-row--out">
                <div className="ms-bubble ms-bubble--out">
                  <span className="ms-bubble__author">maisa</span>
                  Consigo, sim. Tenho quinta às 15:00 ou sexta às 09:00. Qual fica melhor pra você?
                  <span className="ms-bubble__meta">
                    <span>08:12</span>
                  </span>
                </div>
              </div>
              <div className="ms-chat-row">
                <div className="ms-bubble ms-bubble--in">
                  Sexta às 9 tá ótimo
                  <span className="ms-bubble__meta">
                    <span>08:13</span>
                  </span>
                </div>
              </div>
              <div className="ms-chat-row ms-chat-row--out">
                <div className="ms-bubble ms-bubble--out">
                  <span className="ms-bubble__author">maisa</span>
                  Marcado: sexta, 09:00. Já mandei também a nota da sessão passada.
                  <span className="ms-bubble__meta">
                    <span>08:13</span>
                  </span>
                </div>
              </div>
              <div className="ms-chat-row">
                <div className="ms-bubble ms-bubble--note">
                  Você não precisou abrir o celular
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Ato 2 e 3: a multidão -------------------------------------- */}
        <section className="t2-container t2-secao" aria-labelledby="titulo-multidao">
          <p className="t2-eyebrow">A conta que ninguém faz</p>
          <h2 id="titulo-multidao">Dez pessoas te procuraram esta semana.</h2>
          <p className="t2-lead" style={{ marginTop: "var(--space-4)" }}>
            Cada uma quis um horário, uma remarcou duas vezes e todas precisaram de nota. São dez
            conversas, dez agendamentos e dez notas fiscais — e nenhuma dessas coisas é terapia.
          </p>

          <div style={{ marginTop: "var(--space-12)" }}>
            <Multidao />
          </div>
        </section>

        {/* ---- Como funciona --------------------------------------------- */}
        <section id="como-funciona" className="t2-container t2-secao">
          <p className="t2-eyebrow">Como funciona</p>
          <h2>Três passos, e nenhum deles é seu.</h2>

          <div className="t2-passos">
            {PASSOS.map((p) => (
              <article key={p.n} className="ms-card ms-card--pad-lg t2-passo">
                <p className="t2-passo__num">{p.n}</p>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---- Bloco verde: a única âncora escura da página --------------- */}
        <section id="recursos" className="t2-container t2-secao--curta">
          <div className="t2-verde">
            <p className="t2-eyebrow" style={{ color: "var(--accent)" }}>
              O que ela faz
            </p>
            <h2>Uma secretária que não dorme e não erra a data.</h2>
            <p className="t2-lead">
              A maisa cuida do operacional inteiro do consultório. Você continua sendo a única
              pessoa que atende.
            </p>

            <div className="t2-verde__grade">
              {RECURSOS.map((r) => (
                <div key={r.titulo} className="t2-recurso">
                  <div className="t2-recurso__marca" aria-hidden="true" />
                  <h3>{r.titulo}</h3>
                  <p>{r.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Depoimento -------------------------------------------------
            ATENÇÃO: depoimento de EXEMPLO, escrito para dar forma à seção.
            Não publique sem uma pessoa real que autorize nome e frase. */}
        <section id="depoimento" className="t2-container t2-secao">
          <div className="t2-depo">
            <blockquote>
              “Voltei a sair do consultório às 19:00. O mês fecha e as notas já estão emitidas.”
            </blockquote>
            <div className="t2-depo__quem">
              <span className="ms-avatar ms-avatar--md" aria-hidden="true">
                A
              </span>
              <span style={{ textAlign: "left" }}>
                <span className="t2-depo__nome">Ana R.</span>
                <br />
                <span className="t2-depo__papel">psicóloga clínica · depoimento a coletar</span>
              </span>
            </div>
          </div>
        </section>

        {/* ---- Chamada final --------------------------------------------- */}
        <section className="t2-container t2-secao">
          <div className="t2-final">
            <h2>Quer ver a maisa atendendo no seu WhatsApp?</h2>
            <p className="t2-lead" style={{ marginInline: "auto", marginTop: "var(--space-4)" }}>
              Ela começa respondendo. Você acompanha de perto e entra quando quiser.
            </p>
            <div className="t2-final__acoes">
              <a className="ms-btn ms-btn--primary ms-btn--lg" href={cfg.ctaUrl} target="_blank" rel="noreferrer">
                Falar com a maisa
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="t2-rodape">
        <div className="t2-container t2-rodape__row">
          <span className="ms-logo ms-logo--brand" style={{ fontSize: 18 }}>
            maisa<span className="ms-logo__dot">.</span>
          </span>
          <span>Feita para quem atende com a mão ocupada.</span>
        </div>
      </footer>
    </MaisaDs>
  );
}

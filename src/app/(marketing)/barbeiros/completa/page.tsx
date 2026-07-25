import type { Metadata } from "next";
import { Button, Eyebrow, Heading, Text, World } from "../../_lib";
import { ICPS } from "../../_lib/icp";
// Import direto de cada arquivo, sem barrel: um índice que reexporta dados
// (módulo puro) junto com Client Components mistura os dois mundos no mesmo
// módulo — o Fast Refresh cai em full reload e o limite server/client fica
// implícito. Explícito é mais barato de ler e de depurar.
import { DIFERENCIAIS, NUMEROS, SECOES } from "../../_lib/barbeiros/completa/dados";
import { Frase, Maisa } from "../../_lib/barbeiros/completa/Maisa";
import { NavCompleta } from "../../_lib/barbeiros/completa/NavCompleta";
import { HeroCompleto } from "../../_lib/barbeiros/completa/HeroCompleto";
import { ComoFunciona } from "../../_lib/barbeiros/completa/ComoFunciona";
import { AntesDepois } from "../../_lib/barbeiros/completa/AntesDepois";
import { ProvaSocial } from "../../_lib/barbeiros/completa/ProvaSocial";
import { FaqConversa } from "../../_lib/barbeiros/completa/FaqConversa";
import "../../_lib/barbeiros/completa/completa.css";

/* ----------------------------------------------------------------------------
 * /barbeiros/completa — a one-pager do ICP barbeiros.
 *
 * As outras 3 rotas de barbeiros são um funil (topo → meio → base), uma página
 * por estágio. Esta é a versão que percorre o funil inteiro numa rolagem: para
 * tráfego pago e para mandar num link só de WhatsApp, onde pedir três cliques
 * de navegação perde a pessoa.
 *
 * Server Component: só compõe. Cada seção que tem estado é client por conta
 * própria, então o HTML inicial já chega pronto e indexável.
 * -------------------------------------------------------------------------- */

const cfg = ICPS.barbeiros;

export const metadata: Metadata = {
  title: "Um cliente sai, outro já chega",
  description:
    "Enquanto você termina um corte, a MAISA já confirmou o próximo no WhatsApp. Agenda, confirmação e lembrete no automático para barbearias. Setup em 30 minutos.",
  alternates: { canonical: "/barbeiros/completa" },
  openGraph: {
    title: "MAISA para barbearias — um cliente sai, outro já chega",
    description:
      "Agenda, confirmação e lembrete no WhatsApp, no automático. Menos furo, mais cadeira ocupada.",
    url: "/barbeiros/completa",
    type: "website",
  },
};

/* --------------------------- ícones dos diferenciais ---------------------- */
const GLIFOS: Record<string, React.ReactNode> = {
  sparkle: (
    <>
      <path d="M12 3.5l1.6 4.9 4.9 1.6-4.9 1.6L12 16.5l-1.6-4.9L5.5 10l4.9-1.6Z" />
      <path d="M18.6 15.4l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r=".8" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
    </>
  ),
};

export default function LpBarbeirosCompleta() {
  return (
    <World icp="barbeiros" className="lp-completa">
      <NavCompleta />

      <main id="conteudo" tabIndex={-1}>
        <HeroCompleto />
        <ComoFunciona />
        <AntesDepois />

        {/* ------------------------------ DIFERENCIAIS ------------------------------ */}
        <section id="diferenciais" aria-label="Diferenciais" style={{ padding: "var(--mk-section-y) var(--mk-gutter)", background: "var(--mk-panel)" }}>
          <div style={{ maxWidth: "var(--mk-maxw)", marginInline: "auto" }}>
            <div style={{ maxWidth: "44ch", marginBottom: "clamp(28px,4vw,48px)" }}>
              <Eyebrow>
                Por que a <Maisa />
              </Eyebrow>
              <div style={{ marginTop: 14 }}>
                <Heading>Feita pra quem as big techs esquecem.</Heading>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--mk-gap)" }}>
              {DIFERENCIAIS.map((d, i) => (
                <div
                  key={d.titulo}
                  className="mk-reveal lp-card"
                  style={{
                    animationDelay: `${80 + i * 100}ms`,
                    background: "var(--mk-surface)",
                    border: "1px solid var(--mk-border)",
                    borderRadius: "var(--mk-radius-lg)",
                    padding: 26,
                    boxShadow: "var(--mk-shadow-soft)",
                  }}
                >
                  <span aria-hidden="true" style={{ display: "inline-flex", marginBottom: 14, color: d.icone === "target" ? "var(--mk-brand)" : "var(--mk-accent-ink)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {GLIFOS[d.icone]}
                    </svg>
                  </span>
                  <h3 style={{ fontFamily: "var(--mk-font-display)", fontSize: "1.25rem", lineHeight: 1.2, color: "var(--mk-ink)", margin: 0 }}>{d.titulo}</h3>
                  <div style={{ marginTop: 10 }}>
                    <Text muted>
                      <Frase trechos={d.texto} />
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------- NÚMEROS -------------------------------- */}
        <section aria-label="Números" style={{ padding: "clamp(48px,6vw,80px) var(--mk-gutter)", background: "var(--mk-bg)" }}>
          <div style={{ maxWidth: "var(--mk-maxw)", marginInline: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "var(--mk-gap)" }}>
            {NUMEROS.map(([valor, rotulo], i) => (
              <div key={rotulo} className="mk-reveal" style={{ animationDelay: `${40 + i * 80}ms`, textAlign: "center" }}>
                <div style={{ font: "700 clamp(2.2rem,4vw,3rem)/1 var(--font-geist-mono), 'JetBrains Mono', monospace", color: "var(--mk-accent)", letterSpacing: "-0.03em" }}>
                  {valor}
                </div>
                <div style={{ marginTop: 8, font: "600 0.92rem/1.4 var(--mk-font-body)", color: "var(--mk-muted)" }}>{rotulo}</div>
              </div>
            ))}
          </div>
        </section>

        <ProvaSocial />
        <FaqConversa />

        {/* ------------------------------- CTA FINAL ------------------------------- */}
        <section aria-label="Ativar a MAISA" style={{ padding: "var(--mk-section-y) var(--mk-gutter)", background: "var(--mk-band-bg)", color: "var(--mk-band-ink)", textAlign: "center" }}>
          <div style={{ maxWidth: "var(--mk-maxw-narrow)", marginInline: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <h2 style={{ fontFamily: "var(--mk-font-display)", fontSize: "clamp(1.9rem,3.6vw,3rem)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "var(--mk-band-ink)", margin: 0 }}>
              No primeiro mês, a{" "}
              <span style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, color: "var(--mk-band-ink)", letterSpacing: "-0.01em" }}>maisa</span>{" "}
              já se paga.
            </h2>
            <p style={{ font: "400 1.1rem/1.6 var(--mk-font-body)", color: "var(--mk-band-muted)", maxWidth: "44ch", margin: 0 }}>
              Ative, coloque seus clientes no WhatsApp da barbearia e deixe a agenda com ela. Menos furo, mais cadeira ocupada.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
              <Button href={cfg.rotas.base} variant="band" size="lg" icon="arrow" iconRight>
                Ativar grátis
              </Button>
              <Button href={cfg.ctaUrl} external variant="band-ghost" size="lg" icon="whatsapp">
                Falar no WhatsApp
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* -------------------------------- RODAPÉ -------------------------------- */}
      <footer className="mk-footer" style={{ background: "var(--mk-footer-bg)", color: "var(--mk-footer-ink)", padding: "clamp(40px,5vw,64px) var(--mk-gutter)" }}>
        <div style={{ maxWidth: "var(--mk-maxw-wide)", marginInline: "auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 32, alignItems: "flex-start" }}>
          <div style={{ maxWidth: "34ch" }}>
            <span style={{ fontSize: "1.4rem" }}>
              <Maisa escala="grande" />
            </span>
            <p style={{ marginTop: 16, color: "var(--mk-footer-muted)", font: "400 0.95rem/1.6 var(--mk-font-body)" }}>
              Atendimento e agenda no WhatsApp, no automático. Feito pra quem vive na cadeira, não na tela.
            </p>
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--mk-font-display)", fontWeight: 600, fontSize: "0.95rem", marginBottom: 14, color: "var(--mk-footer-ink)" }}>Produto</div>
              {SECOES.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="mk-footlink mk-focus" style={{ display: "block", font: "400 0.95rem/1 var(--mk-font-body)", paddingBlock: 6 }}>
                  {s.label}
                </a>
              ))}
              <a href={cfg.rotas.base} className="mk-footlink mk-focus" style={{ display: "block", font: "400 0.95rem/1 var(--mk-font-body)", paddingBlock: 6 }}>
                Planos
              </a>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mk-font-display)", fontWeight: 600, fontSize: "0.95rem", marginBottom: 14, color: "var(--mk-footer-ink)" }}>Empresa</div>
              <a href={cfg.rotas.topo} className="mk-footlink mk-focus" style={{ display: "block", font: "400 0.95rem/1 var(--mk-font-body)", paddingBlock: 6 }}>
                MAISA para barbearias
              </a>
              <a href="/terapeutas" className="mk-footlink mk-focus" style={{ display: "block", font: "400 0.95rem/1 var(--mk-font-body)", paddingBlock: 6 }}>
                MAISA para terapeutas
              </a>
              <a href={cfg.ctaUrl} target="_blank" rel="noopener noreferrer" className="mk-footlink mk-focus" style={{ display: "block", font: "400 0.95rem/1 var(--mk-font-body)", paddingBlock: 6 }}>
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </footer>
    </World>
  );
}

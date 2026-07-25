"use client";
import React, { useEffect, useRef, useState } from "react";
import { Eyebrow, Heading, Text } from "../../primitives";
import { Frase, Maisa } from "./Maisa";
import { PASSOS, PASSO_MS } from "./dados";

/* ----------------------------------------------------------------------------
 * Como funciona — 4 passos que se contam sozinhos.
 *
 * A lista à esquerda avança em autoplay a cada 5s; a conversa no celular à
 * direita troca junto. Clicar num passo assume o controle e reinicia o ciclo.
 *
 * Duas escolhas de implementação:
 *  • A barra de progresso é animação CSS remontada por `key`, não largura
 *    pintada a cada quadro por JS. Um requestAnimationFrame rodando o tempo
 *    todo só para desenhar uma barra não se paga.
 *  • O autoplay pausa fora da viewport: a seção não deve "passar" enquanto a
 *    pessoa lê outra parte da página e voltar já no passo 3.
 * -------------------------------------------------------------------------- */

export function ComoFunciona() {
  const [passo, setPasso] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const secao = useRef<HTMLDivElement>(null);

  // Só roda quando visível.
  useEffect(() => {
    const el = secao.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setAtivo(e.isIntersecting), { rootMargin: "120px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Um timer por passo: trocar de passo (por clique ou por tempo) reinicia a
  // contagem, porque o efeito depende de `passo`.
  useEffect(() => {
    if (!ativo) return;
    const t = setTimeout(() => setPasso((p) => (p + 1) % PASSOS.length), PASSO_MS);
    return () => clearTimeout(t);
  }, [passo, ativo]);

  return (
    <section
      id="como"
      aria-label="Como funciona"
      style={{ padding: "var(--mk-section-y) var(--mk-gutter)", background: "var(--mk-bg)" }}
    >
      <div style={{ maxWidth: "var(--mk-maxw)", marginInline: "auto" }}>
        <div style={{ maxWidth: "42ch", marginBottom: "clamp(28px,4vw,48px)" }}>
          <Eyebrow>Como funciona</Eyebrow>
          <div style={{ marginTop: 14 }}>
            <Heading>Do primeiro zap ao corte marcado.</Heading>
          </div>
          <div style={{ marginTop: 12 }}>
            <Text muted>Uma assistente que atende do jeito que seu cliente já manda mensagem.</Text>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: "clamp(2rem,4vw,4.5rem)", alignItems: "center" }}>
          {/* passos */}
          <div ref={secao} style={{ display: "flex", flexDirection: "column", gap: "clamp(18px,2.2vw,30px)" }}>
            {PASSOS.map((p, i) => {
              const atual = i === passo;
              const feito = i < passo;
              return (
                <button
                  key={p.titulo}
                  onClick={() => setPasso(i)}
                  aria-current={atual}
                  className="lp-passo mk-focus"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 20,
                    textAlign: "left",
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    opacity: atual ? 1 : 0.4,
                  }}
                >
                  <span
                    style={{
                      flex: "0 0 auto",
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--mk-font-display)",
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      letterSpacing: "-0.02em",
                      transition: "transform 400ms var(--mk-ease), background 400ms var(--mk-ease), border-color 400ms var(--mk-ease), color 400ms var(--mk-ease)",
                      border: `2px solid ${i <= passo ? "var(--mk-accent)" : "var(--mk-border)"}`,
                      background: atual ? "var(--mk-accent)" : feito ? "color-mix(in oklch,var(--mk-accent) 22%,transparent)" : "transparent",
                      color: atual ? "var(--mk-bg-deep)" : feito ? "var(--mk-accent)" : "var(--mk-ink-soft)",
                      transform: atual ? "scale(1.08)" : "scale(1)",
                    }}
                  >
                    {feito ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>

                  <span style={{ flex: "1 1 auto", minWidth: 0, display: "block" }}>
                    <span style={{ display: "block", fontFamily: "var(--mk-font-display)", fontWeight: 800, letterSpacing: "-0.035em", fontSize: "clamp(1.25rem,2vw,1.6rem)", lineHeight: 1.05, color: "var(--mk-ink)" }}>
                      {p.titulo}
                    </span>
                    <span className="mk-pretty" style={{ display: "block", marginTop: 8, font: "400 1rem/1.55 var(--mk-font-body)", color: "var(--mk-muted)" }}>
                      <Frase trechos={p.descricao} />
                    </span>
                    <span style={{ display: "block", marginTop: 14, height: 2, borderRadius: 2, background: "var(--mk-line)", overflow: "hidden", opacity: atual ? 1 : 0 }}>
                      {/* key = passo: remonta o elemento e reinicia a animação */}
                      {atual && (
                        <span
                          key={passo}
                          className="lp-progresso"
                          data-parado={!ativo}
                          style={{ display: "block", height: "100%", background: "var(--mk-accent)", ["--lp-passo-ms" as string]: `${PASSO_MS}ms` }}
                        />
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* celular */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-start", height: "clamp(560px,60vw,660px)", perspective: 1400 }}>
            <div style={{ position: "relative", width: "clamp(288px,26vw,336px)", height: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 44,
                  background: "linear-gradient(160deg, oklch(0.32 0.045 262), oklch(0.14 0.035 264))",
                  padding: 11,
                  boxShadow: "0 40px 80px oklch(0.12 0.04 264 / 0.6), 0 0 0 1px oklch(0.55 0.06 260 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.14)",
                }}
              >
                <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 34, overflow: "hidden", background: "var(--mk-bg-deep)", display: "flex", flexDirection: "column" }}>
                  {/* topo do WhatsApp */}
                  <div style={{ position: "relative", zIndex: 3, flex: "0 0 auto", background: "var(--mk-whats)", padding: "34px 14px 12px", display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto", opacity: 0.9 }} aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: "50%", background: "oklch(1 0 0 / 0.18)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="4.5" y="8" width="15" height="10.5" rx="3.2" />
                        <path d="M12 5v3" />
                        <circle cx="12" cy="4.1" r="1.1" />
                        <circle cx="9.4" cy="13" r="1.05" />
                        <circle cx="14.6" cy="13" r="1.05" />
                        <path d="M9.6 16h4.8" />
                      </svg>
                    </span>
                    <span style={{ flex: "1 1 auto", minWidth: 0, display: "block" }}>
                      <span style={{ display: "block", fontSize: 14, lineHeight: 1.15 }}><Maisa escala="grande" /></span>
                      <span style={{ display: "block", font: "600 10.5px/1.2 var(--mk-font-body)", opacity: 0.85 }}>online · responde na hora</span>
                    </span>
                  </div>

                  {/* conversas: uma por passo, empilhadas e cruzando em 3D */}
                  <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0 }}>
                    {PASSOS.map((p, i) => {
                      const atual = i === passo;
                      return (
                        <div
                          key={p.titulo}
                          aria-hidden={!atual}
                          style={{
                            position: "absolute",
                            inset: 0,
                            padding: "16px 13px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            gap: 8,
                            transformOrigin: "50% 50%",
                            transition: "opacity 480ms var(--mk-ease), transform 480ms var(--mk-ease)",
                            opacity: atual ? 1 : 0,
                            transform: atual ? "translateY(0) rotateX(0deg)" : i < passo ? "translateY(-14%) rotateX(14deg)" : "translateY(14%) rotateX(-14deg)",
                            pointerEvents: atual ? "auto" : "none",
                          }}
                        >
                          <span style={{ alignSelf: "center", marginBottom: 4, padding: "4px 12px", borderRadius: 999, background: "oklch(0.28 0.05 262 / 0.9)", font: "600 10px/1.3 var(--mk-font-body)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--mk-muted)" }}>
                            {p.legenda}
                          </span>
                          {p.msgs.map((m, k) => (
                            <span
                              key={k}
                              style={{
                                maxWidth: "84%",
                                padding: "9px 13px 7px",
                                font: "500 13.5px/1.42 var(--mk-font-body)",
                                display: "block",
                                alignSelf: m.doCliente ? "flex-start" : "flex-end",
                                background: m.doCliente ? "var(--mk-panel-2)" : "var(--mk-whats)",
                                color: m.doCliente ? "var(--mk-ink)" : "#fff",
                                borderRadius: m.doCliente ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                                boxShadow: m.doCliente ? "0 4px 12px oklch(0.12 0.04 264 / 0.35)" : "0 6px 16px oklch(0.48 0.13 150 / 0.3)",
                              }}
                            >
                              <Frase trechos={m.texto} />
                              <span style={{ display: "block", marginTop: 3, textAlign: "right", font: "600 9.5px/1 var(--mk-font-body)", color: m.doCliente ? "var(--mk-muted)" : "oklch(1 0 0 / 0.72)" }}>
                                {m.hora}
                              </span>
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* campo de mensagem */}
                  <div style={{ flex: "0 0 auto", padding: "10px 12px 16px", display: "flex", alignItems: "center", gap: 8, background: "var(--mk-bg-deep)", borderTop: "1px solid oklch(1 0 0 / 0.07)" }}>
                    <span style={{ flex: "1 1 auto", padding: "9px 14px", borderRadius: 999, background: "var(--mk-panel-2)", font: "400 12.5px/1.2 var(--mk-font-body)", color: "var(--mk-muted)" }}>Mensagem</span>
                    <span style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: "50%", background: "var(--mk-whats)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 4 9.5 14.5" />
                        <path d="M20 4 13.5 20l-4-7.5-7.5-4Z" />
                      </svg>
                    </span>
                  </div>

                  {/* dynamic island */}
                  <span aria-hidden="true" style={{ position: "absolute", zIndex: 4, top: 11, left: "50%", transform: "translateX(-50%)", width: 82, height: 20, borderRadius: 999, background: "oklch(0.11 0.03 264)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

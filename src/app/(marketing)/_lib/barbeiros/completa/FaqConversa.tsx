"use client";
import React, { useEffect, useRef, useState } from "react";
import { Eyebrow, Heading, Lead } from "../../primitives";
import { Frase, Maisa } from "./Maisa";
import { FAQ, textoPlano } from "./dados";

/* ----------------------------------------------------------------------------
 * FAQ que não parece FAQ.
 *
 * Em vez de acordeão, a dúvida entra numa conversa de WhatsApp: você clica na
 * pergunta e vê a resposta chegar do jeito que chegaria pro seu cliente. A
 * seção demonstra o produto ao ser usada — é a única parte da página onde o
 * visitante experimenta a assistente em vez de ler sobre ela.
 *
 * Pergunta já feita fica desabilitada: repetir a mesma resposta na conversa
 * quebraria a ilusão de estar falando com alguém.
 * -------------------------------------------------------------------------- */

export function FaqConversa() {
  const [feitas, setFeitas] = useState<number[]>([]);
  const chat = useRef<HTMLDivElement>(null);

  // A resposta nova precisa estar visível — senão o clique parece não ter efeito.
  useEffect(() => {
    const el = chat.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feitas]);

  return (
    <section
      id="duvidas"
      aria-label="Dúvidas frequentes"
      style={{ padding: "var(--mk-section-y) var(--mk-gutter)", background: "var(--mk-panel)" }}
    >
      <div style={{ maxWidth: "var(--mk-maxw-wide)", marginInline: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(2.5rem,5vw,5rem)" }}>
        <div className="mk-reveal" style={{ flex: "1 1 380px", minWidth: 0 }}>
          <Eyebrow>Nada de app novo</Eyebrow>
          <div style={{ marginTop: 14 }}>
            <Heading>
              Tem dúvida? Pergunta pra <Maisa escala="grande" />.
            </Heading>
          </div>
          <div style={{ marginTop: 14 }}>
            <Lead>É assim que seu cliente tira dúvida. Clica numa pergunta e vê a resposta chegar — do jeito que chegaria no WhatsApp dele.</Lead>
          </div>

          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ.map((f, i) => {
              const jaFoi = feitas.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => setFeitas((l) => (l.includes(i) ? l : [...l, i]))}
                  disabled={jaFoi}
                  // Nome explícito: o wordmark inline some do nome calculado.
                  aria-label={textoPlano(f.pergunta)}
                  className="lp-faq-btn mk-focus"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    padding: "14px 18px",
                    borderRadius: 999,
                    border: "1px solid var(--mk-border)",
                    background: "var(--mk-surface)",
                    color: "var(--mk-ink)",
                    font: "600 0.95rem/1.35 var(--mk-font-body)",
                    cursor: "pointer",
                  }}
                >
                  <span aria-hidden="true" style={{ flex: "0 0 auto", display: "inline-flex", color: jaFoi ? "var(--mk-accent)" : "var(--mk-brand)" }}>
                    {jaFoi ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 5.4A1.8 1.8 0 0 1 5.8 3.6H11a1.5 1.5 0 0 1 1 .5 1.5 1.5 0 0 1 1-.5h5.2A1.8 1.8 0 0 1 20 5.4V18a1.4 1.4 0 0 1-1.4 1.4H13a1.5 1.5 0 0 0-1 .5 1.5 1.5 0 0 0-1-.5H5.4A1.4 1.4 0 0 1 4 18Z" />
                        <path d="M12 4.1v15.3" />
                      </svg>
                    )}
                  </span>
                  <Frase trechos={f.pergunta} />
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 380, background: "var(--mk-surface)", border: "1px solid var(--mk-border)", borderRadius: "var(--mk-radius-lg)", boxShadow: "var(--mk-shadow)", overflow: "hidden" }}>
            <div style={{ background: "var(--mk-whats)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
              <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: "oklch(1 0 0 / 0.18)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4.5" y="8" width="15" height="10.5" rx="3.2" />
                  <path d="M12 5v3" />
                  <circle cx="12" cy="4.1" r="1.1" />
                  <circle cx="9.4" cy="13" r="1.05" />
                  <circle cx="14.6" cy="13" r="1.05" />
                  <path d="M9.6 16h4.8" />
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 14, lineHeight: 1.1 }}><Maisa escala="grande" /></div>
                <div style={{ font: "600 11px/1.1 var(--mk-font-body)", opacity: 0.85 }}>online · responde na hora</div>
              </div>
            </div>

            <div
              ref={chat}
              aria-live="polite"
              style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 320, maxHeight: 380, overflowY: "auto", background: "var(--mk-panel-2)" }}
            >
              <div style={{ alignSelf: "flex-end", maxWidth: "82%", background: "var(--mk-whats)", color: "#fff", borderRadius: "16px 4px 16px 16px", padding: "10px 14px", font: "500 14px/1.45 var(--mk-font-body)", boxShadow: "0 6px 16px oklch(0.48 0.13 150 / 0.3)" }}>
                Oi! Aqui é a <Maisa />. Escolhe uma dúvida aí do lado que eu respondo na hora.
              </div>

              {feitas.map((i, k) => (
                <div key={`${i}-${k}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="lp-msg" style={{ alignSelf: "flex-start", maxWidth: "82%", background: "var(--mk-panel)", color: "var(--mk-ink-soft)", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", font: "500 14px/1.45 var(--mk-font-body)", boxShadow: "var(--mk-shadow-soft)" }}>
                    <Frase trechos={FAQ[i].pergunta} />
                  </div>
                  <div className="lp-msg lp-msg-resposta" style={{ alignSelf: "flex-end", maxWidth: "82%", background: "var(--mk-whats)", color: "#fff", borderRadius: "16px 4px 16px 16px", padding: "10px 14px", font: "500 14px/1.45 var(--mk-font-body)", boxShadow: "0 6px 16px oklch(0.48 0.13 150 / 0.3)" }}>
                    <Frase trechos={FAQ[i].resposta} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

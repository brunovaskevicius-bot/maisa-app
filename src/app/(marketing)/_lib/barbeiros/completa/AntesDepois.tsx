"use client";
import React, { useState } from "react";
import { Button, Eyebrow, Heading } from "../../primitives";
import { ICPS } from "../../icp";
import { Maisa } from "./Maisa";
import { COMPARACAO } from "./dados";

/* ----------------------------------------------------------------------------
 * Antes e depois — o mesmo dia, com e sem a assistente.
 *
 * É um switch, não duas colunas lado a lado: comparar exige trocar de estado,
 * e a troca no mesmo lugar da tela deixa a diferença de cada linha evidente.
 * Começa em "depois" porque é o estado que vende.
 * -------------------------------------------------------------------------- */

export function AntesDepois() {
  const [depois, setDepois] = useState(true);
  const linhas = COMPARACAO.map((r) => (depois ? r.depois : r.antes));

  return (
    <section
      id="antes-depois"
      aria-label="Antes e depois"
      style={{ padding: "var(--mk-section-y) var(--mk-gutter)", background: "var(--mk-panel)" }}
    >
      <div style={{ maxWidth: "var(--mk-maxw-narrow)", marginInline: "auto", textAlign: "center" }}>
        <Eyebrow>Antes e depois</Eyebrow>
        <div style={{ marginTop: 14 }}>
          <Heading>O que muda na sua barbearia no mês seguinte.</Heading>
        </div>

        <div style={{ marginTop: 32, display: "inline-flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ font: "700 15px/1 var(--mk-font-body)", color: depois ? "var(--mk-muted)" : "var(--mk-ink)" }}>
            Antes da <Maisa />
          </span>
          <button
            onClick={() => setDepois((v) => !v)}
            role="switch"
            aria-checked={depois}
            aria-label="Alternar entre antes e depois da MAISA"
            className="mk-focus"
            style={{ position: "relative", width: 56, height: 32, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: "var(--mk-line)", flex: "0 0 auto" }}
          >
            <span
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--mk-accent)", opacity: depois ? 1 : 0, transition: "opacity 240ms var(--mk-ease)" }}
            />
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 3,
                left: depois ? 27 : 3,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 3px 8px oklch(0.1 0.04 264 / .4)",
                transition: "left 320ms cubic-bezier(0.34,1.56,0.64,1)",
                zIndex: 1,
              }}
            />
          </button>
          <span style={{ font: "700 15px/1 var(--mk-font-body)", color: depois ? "var(--mk-ink)" : "var(--mk-muted)" }}>
            Com a <Maisa />
          </span>
        </div>

        {/* key no container: trocar de lado remonta as linhas e reexecuta o reveal */}
        <div key={depois ? "depois" : "antes"} aria-live="polite" style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          {linhas.map((texto, i) => (
            <div
              key={texto}
              className="mk-reveal"
              style={{
                animationDelay: `${i * 50}ms`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "18px 22px",
                borderRadius: "var(--mk-radius-lg)",
                border: "1px solid var(--mk-border)",
                background: "var(--mk-surface)",
                boxShadow: "var(--mk-shadow-soft)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: depois ? "color-mix(in oklch,var(--mk-accent) 22%,transparent)" : "oklch(0.42 0.14 25 / 0.22)",
                  color: depois ? "var(--mk-accent-ink)" : "oklch(0.75 0.14 25)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  {depois ? <path d="m20 6-11 11-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
                </svg>
              </span>
              <span style={{ font: "600 1rem/1.4 var(--mk-font-body)", color: "var(--mk-ink)" }}>{texto}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <Button href={ICPS.barbeiros.rotas.base} variant="primary" size="lg" icon="arrow" iconRight>
            Ativar grátis
          </Button>
        </div>
      </div>
    </section>
  );
}

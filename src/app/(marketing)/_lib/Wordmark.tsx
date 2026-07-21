"use client";
import React from "react";

/* ----------------------------------------------------------------------------
 * Wordmark MAISA — lockup de marca reutilizável (nav + rodapé). O texto herda
 * currentColor (branco no mundo barbeiros, navy no terapeutas); o mark dourado
 * é decorativo (aria-hidden) e não precisa de contraste de texto. `rotulo`
 * mostra o recorte do público ("para barbearias") quando cabe.
 * -------------------------------------------------------------------------- */
export function Wordmark({
  href = "/",
  rotulo,
  size = 1.35,
  accent = "var(--mk-accent)",
  ariaLabel = "MAISA, ir para o início",
}: {
  href?: string;
  rotulo?: string;
  /** tamanho do wordmark em rem */
  size?: number;
  accent?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className="mk-focus"
      style={{ display: "inline-flex", alignItems: "center", gap: "0.62rem", textDecoration: "none", color: "inherit" }}
    >
      <span
        style={{
          fontFamily: "var(--mk-font-display)",
          fontWeight: 800,
          fontSize: `${size}rem`,
          letterSpacing: "0.02em",
          lineHeight: 1,
          color: "currentColor",
        }}
      >
        MAISA
      </span>
      <span
        aria-hidden="true"
        style={{
          width: "0.42rem",
          height: "0.42rem",
          borderRadius: "2px",
          background: accent,
          transform: "translateY(0.28rem)",
          boxShadow: "0 0 0 0.28rem color-mix(in oklch, var(--mk-accent) 22%, transparent)",
        }}
      />
      {rotulo ? (
        <span
          className="mk-hide-sm"
          style={{
            marginLeft: "0.2rem",
            fontFamily: "var(--mk-font-body)",
            fontSize: "0.82rem",
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "var(--mk-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {rotulo}
        </span>
      ) : null}
    </a>
  );
}

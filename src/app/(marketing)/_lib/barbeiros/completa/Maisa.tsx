import React from "react";
import type { Trecho } from "./dados";

/* ----------------------------------------------------------------------------
 * O wordmark "maisa" como palavra dentro da frase.
 *
 * Nesta LP a marca é lida como sujeito ("a maisa já confirmou o próximo"), não
 * como logo no topo. Então ela precisa viver no meio do texto sem quebrar a
 * linha de base: Jakarta 800 dourada com relevo, do mesmo jeito que aparece na
 * topbar do app — mesmo estando num escopo cuja fonte de corpo é outra.
 *
 * O relevo tem duas escalas porque a mesma sombra que dá corpo num h1 fica
 * pesada demais em 15px de corpo de texto.
 * -------------------------------------------------------------------------- */

export function Maisa({ escala = "inline" }: { escala?: "inline" | "grande" }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-jakarta), system-ui, sans-serif",
        fontWeight: 800,
        color: "var(--warm)",
        letterSpacing: "-0.01em",
        textShadow: escala === "grande"
          ? "0 1.5px 0 oklch(0.58 0.12 68), 0 3px 5px rgba(0,0,0,.22)"
          : "0 1px 0 oklch(0.58 0.12 68), 0 2px 3px rgba(0,0,0,.22)",
      }}
    >
      maisa
    </span>
  );
}

/** Renderiza uma frase com trechos marcados (ver `frase()` em dados.ts). */
export function Frase({ trechos, escala }: { trechos: Trecho[]; escala?: "inline" | "grande" }) {
  return (
    <>
      {trechos.map((p, i) => (p.marca ? <Maisa key={i} escala={escala} /> : <React.Fragment key={i}>{p.t}</React.Fragment>))}
    </>
  );
}

import type { ReactNode } from "react";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";

import "@/ds/ds.css";
import "./peeps.css";
import "./terapeutas-v2.css";

/* ----------------------------------------------------------------------------
 * <MaisaDs> — liga o design system novo da maisa (creme + verde-mata + âmbar).
 *
 * Os tokens do DS moram na classe `.maisa-ds`, não em `:root`. Isso é
 * obrigatório: seis nomes dele (--font-sans, --font-mono, --ease-out,
 * --dur-fast, --success, --danger) JÁ EXISTEM no globals.css do produto. Solto
 * em `:root`, o DS trocaria a fonte e as cores semânticas do app inteiro e do
 * mundo barbeiros. Ver src/ds/VENDORED.md e scripts/vendor-ds.mjs.
 *
 * Este div é FILHO de `.mkt-scope` (que define font-family para as LPs
 * antigas), nunca o mesmo elemento. Regra declarada no próprio elemento vence
 * herança do pai, então a tipografia daqui é a do DS — mas só se os dois não
 * colidirem no mesmo nó.
 *
 * As três famílias vêm por next/font (self-hosted) em vez do @import do Google
 * Fonts que o DS traz: o @import é requisição de rede bloqueante e dá FOUT.
 * O readme do DS já sinaliza isso como pendência ("Fontes carregadas do Google
 * Fonts, não self-hosted") — aqui ela está resolvida.
 * -------------------------------------------------------------------------- */

const dsDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-ds-display",
  display: "swap",
});

const dsSans = Figtree({
  subsets: ["latin"],
  variable: "--font-ds-sans",
  display: "swap",
});

const dsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-ds-mono",
  display: "swap",
});

export const fontesDs = [dsDisplay.variable, dsSans.variable, dsMono.variable].join(" ");

export function MaisaDs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["maisa-ds", fontesDs, className].filter(Boolean).join(" ")}>{children}</div>;
}

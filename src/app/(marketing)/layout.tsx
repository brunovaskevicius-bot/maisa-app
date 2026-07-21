import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Hanken_Grotesk, Spectral, Manrope } from "next/font/google";
import "./marketing.css";

/* ----------------------------------------------------------------------------
 * Layout do route group (marketing) — aninhado no root layout (que renderiza
 * <html>/<body>). Aqui NÃO se renderiza html/body: só o container `.mkt-scope`,
 * que carrega as fontes dos DOIS MUNDOS (via next/font/google) e sobrescreve a
 * Jakarta do body dentro do container. Os tokens de cor/mundo vivem no CSS
 * (marketing.css), escopados em `.mundo-barbeiros` / `.mundo-terapeutas`.
 *
 * Fontes — FORA da lista-reflexo (proibido Inter, Jakarta, Space Grotesk, etc.):
 *   BARBEIROS  → display Archivo (grotesco pesado, urbano) + corpo Hanken Grotesk.
 *   TERAPEUTAS → display Spectral (serifa quente e calma) + corpo Manrope.
 * Cada fonte expõe uma CSS var; `.mundo-*` liga a var certa em --mk-font-*.
 * -------------------------------------------------------------------------- */

const barberDisplay = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-barber-display",
  display: "swap",
});
const barberBody = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-barber-body",
  display: "swap",
});
const therapyDisplay = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-therapy-display",
  display: "swap",
});
const therapyBody = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-therapy-body",
  display: "swap",
});

const fontVars = [
  barberDisplay.variable,
  barberBody.variable,
  therapyDisplay.variable,
  therapyBody.variable,
].join(" ");

// Título coerente para as 6 LPs; cada page.tsx define seu próprio `title` de nível,
// que entra no template abaixo.
export const metadata: Metadata = {
  title: { default: "MAISA", template: "%s · MAISA" },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className={`mkt-scope ${fontVars}`}>{children}</div>;
}

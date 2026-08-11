/* ----------------------------------------------------------------------------
 * Ponto único de importação da biblioteca compartilhada das landing pages.
 * As páginas (Server Components) importam daqui:
 *   import { World, MarketingNav, Section, Display, Button, CTASection, Footer,
 *            ICPS, imagensBarbeiros } from "@/app/(marketing)/_lib";
 * -------------------------------------------------------------------------- */
export * from "./icp";
export * from "./imagens";
export * from "./primitives";
export { World } from "./World";
export { Wordmark } from "./Wordmark";
/* Importa `./glass-button.css` junto. Está aqui e não numa LP específica porque o
   botão é compartilhado por construção — quem importar o componente leva o vidro. */
export { GlassButton } from "./GlassButton";
export { MarketingNav } from "./MarketingNav";
export { StickyMobileCta } from "./StickyMobileCta";
export { Footer } from "./Footer";
export { CTASection } from "./CTASection";

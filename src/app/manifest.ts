import type { MetadataRoute } from "next";

// Web App Manifest — servido em /manifest.webmanifest.
// Faz o app ser instalável (Android/desktop) e abrir em tela cheia (display: standalone).
//
// ⚠️ A MARCA É `maisa`, MINÚSCULA. O design system é explícito ("nunca `Maisa` ou
// `MAISA`"), e até 22/09/2026 este arquivo escrevia "MAISA — Assistente" — que é o nome
// que aparece embaixo do ícone na tela inicial do celular, ou seja, o lugar mais visível
// que a marca tem. O `theme_color` navy foi trocado pelo verde da mesma vez; ver
// `public/icon.svg`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "maisa — secretária de IA",
    short_name: "maisa",
    description: "A secretária de IA que atende seus clientes no WhatsApp e marca na sua agenda.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F2E9", // --cream-100
    theme_color: "#0C2A1E", // --green-900
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}

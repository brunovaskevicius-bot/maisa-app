import type { MetadataRoute } from "next";

// Web App Manifest — servido em /manifest.webmanifest.
// Faz o app ser instalável (Android/desktop) e abrir em tela cheia (display: standalone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MAISA — Assistente",
    short_name: "MAISA",
    description: "Sua assistente de WhatsApp, no automático.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f2e8",
    theme_color: "#233E71",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}

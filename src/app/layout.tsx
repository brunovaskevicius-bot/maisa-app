import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "MAISA",
  title: "MAISA — atendimento no WhatsApp, no automático",
  description: "Agendamento e atendimento por WhatsApp, no automático — por MAISA",
  manifest: "/manifest.webmanifest",
  // apple explícito: definir `icons` no metadata desliga a auto-injeção do
  // apple-icon.tsx, então apontamos o apple-touch-icon pra rota gerada.
  icons: {
    icon: "/icon.svg",
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  // Faz o iOS abrir em tela cheia (sem barra do Safari) ao "Adicionar à Tela de Início".
  appleWebApp: {
    capable: true,
    title: "MAISA",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#233E71",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={geistMono.variable}>
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}

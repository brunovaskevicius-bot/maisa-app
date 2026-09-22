import { ImageResponse } from "next/og";

// Ícone da tela inicial do iPhone (apple-touch-icon). iOS mascara os cantos,
// então o fundo é um quadrado cheio (sem arredondar aqui).
//
// ⚠️ ERA NAVY #233E71 + DOURADO #EAAE3E até 22/09/2026 — a marca errada. A certa é a do
// design system, que é também a que já subiu verificada na tela de consentimento do
// Google. Ver o comentário em `public/icon.svg`, inclusive sobre a fonte.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0C2A1E", // --green-900
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 800,
            letterSpacing: "-2.5px",
            color: "#FDFBF7", // --cream-50
            fontFamily: "sans-serif",
            display: "flex",
          }}
        >
          maisa<span style={{ color: "#E09A34" }}>.</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

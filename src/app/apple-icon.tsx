import { ImageResponse } from "next/og";

// Ícone da tela inicial do iPhone (apple-touch-icon). iOS mascara os cantos,
// então o fundo é um quadrado navy cheio (sem arredondar aqui).
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
          background: "#233E71",
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 800,
            letterSpacing: "-3px",
            color: "#EAAE3E",
            fontFamily: "sans-serif",
          }}
        >
          maisa
        </div>
      </div>
    ),
    { ...size }
  );
}

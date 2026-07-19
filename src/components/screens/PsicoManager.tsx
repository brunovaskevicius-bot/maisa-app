"use client";
import { useEffect, useState } from "react";
import { s, Icon } from "@/lib/ui";

/* Módulo clínico = o Psico Manager ORIGINAL, embutido via iframe.
 * A URL vem de NEXT_PUBLIC_PSICO_URL (default localhost:3000 p/ dev).
 * Em produção, se a URL apontar p/ localhost, mostramos um placeholder
 * (o iframe pra localhost quebraria fora da máquina do dev). */
const PSICO_URL = process.env.NEXT_PUBLIC_PSICO_URL || "http://localhost:3000/";

export default function PsicoManager() {
  // null = 1º render (server + client) → nada, evita mismatch de hidratação.
  const [showIframe, setShowIframe] = useState<boolean | null>(null);

  useEffect(() => {
    const rodandoLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(window.location.hostname);
    const urlLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(PSICO_URL);
    // Só embute se a URL for pública OU se estivermos rodando localmente.
    setShowIframe(!urlLocal || rodandoLocal);
  }, []);

  if (showIframe === null) return <div style={s("height:100%;width:100%;background:var(--bg)")} />;

  if (!showIframe) {
    return (
      <div style={s("height:100%;width:100%;display:flex;align-items:center;justify-content:center;padding:32px;background:var(--bg)")}>
        <div
          className="m-reveal"
          style={s("max-width:460px;text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow-card);padding:36px 32px;display:flex;flex-direction:column;align-items:center;gap:14px")}
        >
          <span style={s("width:60px;height:60px;border-radius:18px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary-dark)")}>
            <Icon name="sparkle" size={30} />
          </span>
          <h2 style={s("font-size:19px;font-weight:800;letter-spacing:-.01em;color:var(--ink)")}>Módulo Clínico</h2>
          <p style={s("font-size:14px;line-height:1.55;color:var(--muted)")}>
            O Psico Manager é um app clínico completo, que roda separado. Ele aparece aqui embutido quando
            você o executa localmente — ou quando uma URL pública é configurada em{" "}
            <span style={s("font-family:var(--font-mono);font-size:12.5px;color:var(--ink)")}>NEXT_PUBLIC_PSICO_URL</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s("height:100%;width:100%;background:var(--bg);overflow:hidden")}>
      <iframe
        src={PSICO_URL}
        title="Psico Manager (app original)"
        style={{ width: "100%", height: "100%", border: "none", display: "block", background: "var(--bg)" }}
      />
    </div>
  );
}

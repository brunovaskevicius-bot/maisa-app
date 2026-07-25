"use client";
/* MAISA — a Gaveta.
 *
 * O detalhe de tudo mora aqui. No desktop é um modal centrado; no mobile, uma
 * folha que sobe de baixo. Mesmo conteúdo, mesma hierarquia, mesmo rodapé de
 * ações — muda só a forma, então o usuário não reaprende nada ao trocar de tela.
 *
 * O conteúdo vem tipado de useDetalhe() (src/lib/detalhe.tsx). Este arquivo só
 * sabe DESENHAR blocos; não sabe o que é cliente, nota ou conversa. */

import React, { useEffect, useRef } from "react";
import { s, Icon, Monogram, Toggle, Chip } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import { useStore } from "@/lib/store";
import { useDetalhe, type Bloco, type Recibo as ReciboT } from "@/lib/detalhe";

/* ───────────────────────────── blocos ───────────────────────────── */

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div style={s("font-size:11.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)")}>
      {children}
    </div>
  );
}

function Stats({ linhas }: { linhas: [string, string][] }) {
  return (
    <div style={s("display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:4px 16px")}>
      {linhas.map(([l, v], i) => (
        <div
          key={l + i}
          style={s(`display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:11px 0${i < linhas.length - 1 ? ";border-bottom:1px solid var(--line)" : ""}`)}
        >
          <span style={s("font-size:14px;color:var(--muted);flex-shrink:0")}>{l}</span>
          <span style={s("font-size:14px;font-weight:700;text-align:right;word-break:break-word")}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Texto({ texto }: { texto: string }) {
  return (
    <div style={s("font-size:14.5px;line-height:1.6;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px")}>
      {texto.split("\n\n").map((p, i) => (
        <span key={i} style={i > 0 ? s("font-size:13px;color:var(--muted)") : undefined}>{p}</span>
      ))}
    </div>
  );
}

function Aviso({ texto, tone = "warn" }: { texto: string; tone?: "warn" | "danger" }) {
  const c = tone === "danger"
    ? "background:var(--danger-soft);border-color:oklch(0.88 0.06 30);color:var(--danger)"
    : "background:var(--warn-soft);border-color:oklch(0.88 0.06 85);color:var(--warn)";
  return (
    <div style={s(`display:flex;gap:12px;align-items:flex-start;border:1px solid;border-radius:14px;padding:14px 16px;${c}`)}>
      <span style={s("flex-shrink:0;display:flex;padding-top:1px")}><Icon name="alert" size={18} sw={2} /></span>
      <span style={s("font-size:13.5px;line-height:1.55;font-weight:600")}>{texto}</span>
    </div>
  );
}

function Msgs({ msgs }: { msgs: { de: "cliente" | "bot" | "voce"; txt: string }[] }) {
  return (
    <div style={s("border-radius:16px;padding:16px;background:var(--primary-soft);border:1px solid var(--line);display:flex;flex-direction:column;gap:10px")}>
      {msgs.map((m, i) => {
        const meu = m.de !== "cliente";
        return (
          <div key={i} style={s(`max-width:86%;align-self:${meu ? "flex-end" : "flex-start"};display:flex;flex-direction:column;align-items:${meu ? "flex-end" : "flex-start"};gap:4px`)}>
            {m.de === "voce" && (
              <span style={s("font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)")}>Você</span>
            )}
            <div style={s(`padding:11px 14px;border-radius:16px;font-size:13.5px;line-height:1.45;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-bottom-${meu ? "right" : "left"}-radius:5px`)}>
              {m.txt}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Recibo da NFS-e — as bordas tracejadas e o total destacado fazem o bloco ler
   como documento fiscal, não como mais um cartão do app. */
function Recibo({ r }: { r: ReciboT }) {
  return (
    <div style={s("border-radius:16px;overflow:hidden;border:1px solid var(--border);background:var(--surface)")}>
      <div style={s("display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;background:var(--bg);border-bottom:1px dashed var(--border)")}>
        <div style={s("min-width:0")}>
          <div style={s("font-size:13.5px;font-weight:800;letter-spacing:-.01em")}>{r.prestador}</div>
          <div style={s("font-size:11.5px;color:var(--muted);margin-top:2px")}>{r.doc}</div>
        </div>
        <div style={s("text-align:right;flex-shrink:0")}>
          <div style={s("font-size:13px;font-weight:800")}>NFS-e</div>
          <div style={s("font-size:10.5px;color:var(--muted)")}>Nota Fiscal de Serviços</div>
        </div>
      </div>
      <div style={s("padding:14px 16px;display:flex;flex-direction:column;gap:9px")}>
        {r.linhas.map(([l, v]) => (
          <div key={l} style={s("display:flex;align-items:baseline;justify-content:space-between;gap:14px")}>
            <span style={s("font-size:12.5px;color:var(--muted);flex-shrink:0")}>{l}</span>
            <span style={s("font-size:13px;font-weight:600;text-align:right;word-break:break-word")}>{v}</span>
          </div>
        ))}
      </div>
      <div style={s("display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:14px 16px;border-top:1px dashed var(--border);background:var(--bg)")}>
        <span style={s("font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)")}>Total</span>
        <span style={s("font-family:var(--font-mono);font-size:19px;font-weight:700;letter-spacing:-.02em")}>{r.total}</span>
      </div>
    </div>
  );
}

function Toggles({ toggles }: { toggles: { titulo: string; desc: string; on: boolean; alternar: () => void }[] }) {
  return (
    <div style={s("display:flex;flex-direction:column;gap:8px")}>
      {toggles.map((t) => (
        <div
          key={t.titulo}
          style={s(`display:flex;align-items:center;gap:14px;padding:14px 15px;border-radius:14px;border:1px solid var(--line);background:${t.on ? "var(--primary-soft)" : "var(--bg)"};transition:background-color var(--dur-fast) var(--ease-out)`)}
        >
          <span style={s("flex:1;min-width:0")}>
            <span style={s("display:block;font-size:14.5px;font-weight:700")}>{t.titulo}</span>
            <span style={s("display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.4")}>{t.desc}</span>
          </span>
          <Toggle on={t.on} onChange={t.alternar} />
        </div>
      ))}
    </div>
  );
}

function Lista({ itens }: { itens: { id: string; nome: string; sub: string; seed?: string; onClick?: () => void }[] }) {
  return (
    <div style={s("display:flex;flex-direction:column;gap:2px")}>
      {itens.map((it) => {
        const conteudo = (
          <>
            {it.seed
              ? <Monogram name={it.nome} id={it.seed} size={32} radius={10} />
              : <span style={s("width:32px;height:32px;flex-shrink:0;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);display:flex;align-items:center;justify-content:center")}><Icon name="tag" size={16} /></span>}
            <span style={s("flex:1;min-width:0;text-align:left")}>
              <span style={s("display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{it.nome}</span>
              <span style={s("display:block;font-size:12px;color:var(--muted);margin-top:1px")}>{it.sub}</span>
            </span>
            {it.onClick && <Icon name="chevron-right" size={16} stroke="var(--muted)" />}
          </>
        );
        const estilo = s("display:flex;align-items:center;gap:11px;padding:9px 8px;border-radius:12px;width:100%;border:none;background:transparent");
        return it.onClick ? (
          <button key={it.id} onClick={it.onClick} className="m-hov-bg m-press m-focus" style={{ ...estilo, cursor: "pointer" }}>
            {conteudo}
          </button>
        ) : (
          <div key={it.id} style={estilo}>{conteudo}</div>
        );
      })}
    </div>
  );
}

function RenderBloco({ b }: { b: Bloco }) {
  const corpo = (() => {
    switch (b.tipo) {
      case "stats": return <Stats linhas={b.linhas} />;
      case "chips": return (
        <div style={s("display:flex;flex-wrap:wrap;gap:8px")}>
          {b.chips.map((c) => <Chip key={c.label} tone={c.on ? "primary" : "neutral"}>{c.label}</Chip>)}
        </div>
      );
      case "texto": return <Texto texto={b.texto} />;
      case "toggles": return <Toggles toggles={b.toggles} />;
      case "msgs": return <Msgs msgs={b.msgs} />;
      case "aviso": return <Aviso texto={b.texto} tone={b.tone} />;
      case "recibo": return <Recibo r={b.recibo} />;
      case "lista": return <Lista itens={b.itens} />;
    }
  })();
  const label = b.tipo === "aviso" ? undefined : b.label;
  return (
    <div style={s("display:flex;flex-direction:column;gap:10px")}>
      {label && <Rotulo>{label}</Rotulo>}
      {corpo}
    </div>
  );
}

/* ───────────────────────────── a gaveta ───────────────────────────── */

export default function Gaveta() {
  const st = useStore();
  const det = useDetalhe(st.sel);
  const mobile = useIsMobile();
  const painel = useRef<HTMLDivElement>(null);

  // Foco entra no painel ao abrir: o teclado não fica preso atrás do backdrop.
  useEffect(() => { if (det) painel.current?.focus(); }, [det]);

  // Trava o scroll do fundo enquanto a gaveta está aberta.
  useEffect(() => {
    if (!det) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [det]);

  if (!det) return null;

  const painelEstilo = mobile
    ? s("position:fixed;left:0;right:0;bottom:0;z-index:81;max-height:86vh;background:var(--surface);border-radius:26px 26px 0 0;box-shadow:0 -20px 50px oklch(0.30 0.03 60 / 0.22);display:flex;flex-direction:column;outline:none")
    : {
      ...s("position:fixed;top:50%;left:50%;z-index:81;background:var(--surface);border:1px solid var(--border);border-radius:26px;box-shadow:var(--shadow-pop);display:flex;flex-direction:column;overflow:hidden;outline:none"),
      width: "min(680px, calc(100vw - 80px))",
      maxHeight: "min(760px, calc(100vh - 88px))",
    };

  return (
    <>
      <div
        onClick={st.fechar}
        style={{ ...s("position:fixed;inset:0;z-index:80;background:oklch(0.28 0.03 262 / 0.34)"), backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", animation: "mfade .18s ease both" }}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={det.titulo}
        tabIndex={-1}
        className={mobile ? "m-sheet" : "m-modal"}
        style={painelEstilo}
      >
        {/* alça — só no mobile, sinaliza que a folha é arrastável/descartável */}
        {mobile && (
          <div style={s("padding:12px 0 4px;display:flex;justify-content:center;flex-shrink:0")}>
            <span style={s("width:42px;height:5px;border-radius:99px;background:var(--border)")} />
          </div>
        )}

        {/* cabeçalho */}
        <div style={s(`padding:${mobile ? "10px 20px 16px" : "22px 24px 18px"};border-bottom:1px solid var(--line);display:flex;align-items:flex-start;gap:14px;flex-shrink:0`)}>
          {det.seed && <Monogram name={det.titulo} id={det.seed} size={mobile ? 46 : 48} radius={15} />}
          <div style={s("flex:1;min-width:0")}>
            <h2 style={s(`font-size:${mobile ? "19px" : "20px"};font-weight:800;letter-spacing:-.02em;line-height:1.2`)}>{det.titulo}</h2>
            <p style={s("font-size:13.5px;color:var(--muted);margin-top:4px;line-height:1.4")}>{det.sub}</p>
          </div>
          {!mobile && (
            <button
              onClick={st.fechar}
              title="Fechar"
              aria-label="Fechar"
              className="m-hov-bg m-press-icon m-focus"
              style={s("width:36px;height:36px;flex-shrink:0;border:1px solid var(--border);border-radius:11px;background:var(--bg);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center")}
            >
              <Icon name="x" size={17} sw={2.2} />
            </button>
          )}
        </div>

        {/* blocos */}
        <div style={s(`flex:1;overflow-y:auto;padding:${mobile ? "18px 20px" : "22px 24px"};display:flex;flex-direction:column;gap:22px`)}>
          {det.blocos.map((b) => <RenderBloco key={b.key} b={b} />)}
        </div>

        {/* ações */}
        <div style={{
          ...s(`padding:${mobile ? "14px 20px" : "16px 24px 20px"};border-top:1px solid var(--line);background:var(--bg);display:flex;gap:10px;flex-shrink:0`),
          paddingBottom: mobile ? "max(20px, env(safe-area-inset-bottom))" : undefined,
        }}>
          {det.acoes.map((a) => {
            const cor = a.tone === "danger"
              ? "border:1px solid var(--danger-soft);background:var(--danger-soft);color:var(--danger)"
              : a.primaria
                ? "border:1px solid var(--primary);background:var(--primary);color:#fff"
                : "border:1px solid var(--border);background:var(--surface);color:var(--muted)";
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                className={`${a.primaria ? "m-hov-primary" : "m-hov-bg"} m-press m-focus`}
                style={s(`flex:${a.primaria ? "1" : "0 1 auto"};height:${mobile ? "50px" : "46px"};padding:0 20px;border-radius:13px;font-size:${mobile ? "15px" : "14.5px"};font-weight:700;cursor:pointer;white-space:nowrap;${cor}`)}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

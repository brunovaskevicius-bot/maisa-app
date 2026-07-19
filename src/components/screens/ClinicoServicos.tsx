"use client";
import React, { useEffect, useRef, useState } from "react";
import { s, Screen, Btn, fmt, toast } from "@/lib/ui";
import { servicos as servicosMock, type Servico } from "@/lib/clinicoMock";

/* ────────────────────────────── iconografia de serviços (dinâmica) ──────────────────────────────
 * Portado 1:1 do Psico Manager: a categoria é inferida do NOME do serviço (Carla cria os próprios).
 * Cada categoria tem um tile tintado + um fragmento SVG autoral. "session" é o DEFAULT forte. */
type SvcKey = "assessment" | "couple" | "group" | "mentoring" | "video" | "session";

function matchServico(nome: string): SvcKey {
  const n = (nome || "").toLowerCase();
  const has = (...ks: string[]) => ks.some((k) => n.includes(k));
  if (has("avali", "laudo", "diagnóst", "diagnost", "parecer", "teste", "psicométr", "psicometr", "anamnese")) return "assessment";
  if (has("casal", "famíl", "famil", "conjug", "relaciona", "vincul")) return "couple";
  if (has("grupo", "curso", "workshop", "oficina", "palestra", "turma", "coletiv", "roda")) return "group";
  if (has("mentor", "desenvolv", "coach", "carreira", "orientaç", "orientac", "superv")) return "mentoring";
  if (has("telepsic", "teleatend", "videochamada", "on-line", "por vídeo", "por video")) return "video";
  return "session"; // sessão, terapia, psicoterapia, atendimento, individual, avulsa…
}

// tint do tile (squircle) — fills suaves; âmbar só como FILL de tile preenchido.
const SVC_STYLE: Record<SvcKey, { tint: string; ink: string }> = {
  session:    { tint: "var(--primary-soft)",   ink: "var(--primary-dark)" },
  assessment: { tint: "var(--success-soft)",   ink: "var(--success)" },
  mentoring:  { tint: "var(--warm-soft)",      ink: "var(--warn)" },
  couple:     { tint: "oklch(0.93 0.035 32)",  ink: "oklch(0.48 0.12 34)" },
  group:      { tint: "oklch(0.93 0.032 172)", ink: "oklch(0.44 0.075 172)" },
  video:      { tint: "oklch(0.93 0.05 235)",  ink: "var(--primary-dark)" },
};

function svcIconPaths(k: SvcKey): React.ReactElement {
  switch (k) {
    case "assessment": return (<><rect x="4.8" y="5" width="14.4" height="15.6" rx="2.8"/><rect x="8.8" y="2.9" width="6.4" height="3.9" rx="1.5"/><path d="M8.7 12.8l2.3 2.2 4.3-4.6"/></>);
    case "couple":     return (<><circle cx="7.8" cy="11" r="2.5"/><circle cx="16.2" cy="11" r="2.5"/><path d="M3.3 19.8c0-2.5 1.9-4 4.5-4s4.5 1.5 4.5 4"/><path d="M11.7 19.8c0-2.5 1.9-4 4.5-4s4.5 1.5 4.5 4"/><path d="M12 7.5 10 5.6a1.5 1.5 0 0 1 .05-2.15 1.5 1.5 0 0 1 1.95.15 1.5 1.5 0 0 1 1.95-.15A1.5 1.5 0 0 1 14 5.6Z"/></>);
    case "group":      return (<><circle cx="12" cy="7.6" r="2.6"/><circle cx="5.6" cy="10.2" r="2.1"/><circle cx="18.4" cy="10.2" r="2.1"/><path d="M6.8 18.6c0-2.7 2.2-4.3 5.2-4.3s5.2 1.6 5.2 4.3"/><path d="M2.6 17.4c0-1.9.9-3.2 2.7-3.7M21.4 17.4c0-1.9-.9-3.2-2.7-3.7"/></>);
    case "mentoring":  return (<><path d="M12 20.5v-6.6"/><path d="M8.6 20.5h6.8"/><path d="M12 13.9c0-2.9-2.3-4.9-5.4-4.9-.2 3 2.3 4.9 5.4 4.9Z"/><path d="M12 12.4c0-3.4 2.7-5.7 5.9-5.7.2 3.4-2.7 5.7-5.9 5.7Z"/></>);
    case "video":      return (<><rect x="3.4" y="5" width="17.2" height="11.6" rx="2.6"/><path d="M8.5 20.4h7M12 16.6v3.8"/><path d="M12 13 10.1 11.1a1.55 1.55 0 0 1 0-2.2 1.5 1.5 0 0 1 1.9.1 1.5 1.5 0 0 1 1.9-.1 1.55 1.55 0 0 1 0 2.2Z"/></>);
    default:           return (<><path d="M5.5 5h13A2.5 2.5 0 0 1 21 7.5v6A2.5 2.5 0 0 1 18.5 16H11l-4 3.4V16H5.5A2.5 2.5 0 0 1 3 13.5v-6A2.5 2.5 0 0 1 5.5 5Z"/><path d="M12 13.2 9.5 10.7a1.9 1.9 0 0 1 0-2.75 1.9 1.9 0 0 1 2.5.15 1.9 1.9 0 0 1 2.5-.15 1.9 1.9 0 0 1 0 2.75Z"/></>);
  }
}

export default function ClinicoServicos() {
  // catálogo em ESTADO LOCAL — edições de preço persistem só na sessão (sem backend)
  const [servicos, setServicos] = useState<Servico[]>(servicosMock);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");

  // stagger só no primeiro mount (não em re-render por edição de preço)
  const firstMount = useRef(true);
  useEffect(() => { firstMount.current = false; }, []);
  const revealMount = firstMount.current;

  const startEdit = (sv: Servico) => { setEditingPriceId(sv.id); setPriceDraft(String(sv.preco)); };
  const savePrice = (id: string) => {
    const v = parseFloat(String(priceDraft).replace(",", "."));
    setEditingPriceId(null);
    if (isNaN(v) || v < 0) { toast("Informe um valor válido para o preço."); return; }
    setServicos((prev) => prev.map((x) => (x.id === id ? { ...x, preco: v } : x)));
    const alvo = servicos.find((x) => x.id === id);
    toast(`Preço de "${alvo?.nome ?? "serviço"}" atualizado para ${fmt(v)}.`);
  };

  return (
    <Screen style={s("max-width:1200px;margin-inline:auto")}>
      {/* cabeçalho da tela — dica + ação */}
      <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px")}>
        <p style={s("font-size:13.5px;color:var(--muted)")}>
          Clique no preço para editar. Os valores alimentam o cálculo de faturamento.
        </p>
        <Btn variant="primary" icon="plus" style={s("margin-left:auto")} onClick={() => toast("Cadastro de novos serviços em breve ✨")}>
          Novo serviço
        </Btn>
      </div>

      {/* grid de serviços */}
      <div style={s("display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:16px")}>
        {servicos.map((sv, i) => {
          const k = matchServico(sv.nome);
          const st = SVC_STYLE[k];
          const showReveal = revealMount && i < 8;
          const editing = editingPriceId === sv.id;
          return (
            <div
              key={sv.id}
              className={"m-card-hov" + (showReveal ? " m-reveal" : "")}
              style={s(
                `background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-card);padding:20px;display:flex;flex-direction:column;gap:14px${
                  showReveal ? `;animation-delay:${i * 50}ms` : ""
                }`
              )}
            >
              {/* topo: tile + badge de status */}
              <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:10px")}>
                <div style={{ ...s("width:42px;height:42px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center"), background: st.tint, color: st.ink }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{svcIconPaths(k)}</svg>
                </div>
                <span style={s(`background:${sv.ativo ? "var(--success-soft)" : "var(--line)"};color:${sv.ativo ? "var(--success)" : "var(--muted)"};font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:20px`)}>
                  {sv.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>

              {/* nome + descrição */}
              <div>
                <h3 style={s("font-size:16px;font-weight:700;line-height:1.25")}>{sv.nome}</h3>
                <p style={s("font-size:13px;color:var(--muted);margin-top:4px;line-height:1.4")}>{sv.descricao}</p>
              </div>

              {/* duração */}
              <div style={s("display:flex;align-items:center;gap:7px;font-size:13px;color:var(--muted);font-weight:600")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.7v3.8l2.5 1.5" /><path d="M9.5 3.6h5" /><path d="M12 3.6v2.4" /><path d="M18.4 6.6l1.3-1.3" /></svg>
                {sv.duracaoMin} min
              </div>

              {/* rodapé: preço editável inline */}
              <div style={s("border-top:1px solid var(--line);padding-top:14px;margin-top:auto")}>
                {editing ? (
                  <div style={s("display:flex;align-items:center;gap:8px")}>
                    <span style={s("font-size:18px;font-weight:700;color:var(--muted)")}>R$</span>
                    <input
                      value={priceDraft}
                      onChange={(e) => setPriceDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") savePrice(sv.id); if (e.key === "Escape") setEditingPriceId(null); }}
                      autoFocus
                      inputMode="decimal"
                      className="m-focus"
                      style={s("width:90px;font-size:20px;font-weight:800;border:1.5px solid var(--primary);border-radius:8px;padding:4px 8px;outline:none;color:var(--ink);background:var(--surface);font-family:var(--font-mono)")}
                    />
                    <button onClick={() => savePrice(sv.id)} className="m-hov-primary m-press m-focus" style={s("margin-left:auto;padding:7px 13px;border:none;border-radius:8px;background:var(--primary);color:#fff;font-weight:700;font-size:13px;cursor:pointer")}>
                      Salvar
                    </button>
                  </div>
                ) : (
                  <div onClick={() => startEdit(sv)} className="m-hov-bg m-press" style={s("display:flex;align-items:center;gap:8px;cursor:pointer;border-radius:8px;padding:3px")}>
                    <span style={s("font-size:24px;font-weight:800;font-family:var(--font-mono);font-variant-numeric:tabular-nums;letter-spacing:-.02em")}>{fmt(sv.preco)}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

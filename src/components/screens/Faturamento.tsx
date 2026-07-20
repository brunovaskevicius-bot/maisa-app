"use client";

import { useMemo, useRef, useState } from "react";
import { Screen, s, fmt, initials, toast, ConfirmDialog } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import { pacientes, resumoBy, notas, prestador, avatarClin, type NFInfo } from "@/lib/clinicoMock";

/* ---------- helpers locais ---------- */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type WaStatus = "idle" | "enviando" | "enviado" | "erro";

export default function Faturamento() {
  const isMobile = useIsMobile();

  /* ---------- dados estáticos (mock clínico) ---------- */
  const actives = useMemo(() => pacientes.filter((p) => p.status === "ATIVO"), []);
  const ativosN = actives.length;

  // resumo por paciente adaptado à view desta tela ({ sessoes, valor, servicoNome })
  const resView = useMemo(() => {
    const m: Record<string, { sessoes: number; valor: number; servicoNome: string }> = {};
    for (const [id, r] of Object.entries(resumoBy)) m[id] = { sessoes: r.totalSessoes, valor: r.valorTotal, servicoNome: r.servicos[0] || "—" };
    return m;
  }, []);

  /* ---------- estado local (sem backend) ---------- */
  const [nf, setNf] = useState<Record<string, NFInfo>>(() => ({ ...notas }));
  const [whats, setWhats] = useState<Record<string, WaStatus>>({});
  const [generating, setGenerating] = useState(false);
  const [gen, setGen] = useState({ done: 0, total: 0 });
  const [pdfId, setPdfId] = useState<string | null>(null);
  // ação irreversível pendente de confirmação (emitir todas OU emitir a NF de um paciente)
  const [confirm, setConfirm] = useState<{ tipo: "todas" | "uma"; pid?: string; nome?: string } | null>(null);
  const busy = useRef<Set<string>>(new Set());
  const numRef = useRef(117); // próximo número de NF (as 116 primeiras já existem no mock)

  const nextNumero = () => "2026/" + String(numRef.current++).padStart(6, "0");

  /* ---------- derivados ---------- */
  const totalFaturar = useMemo(() => actives.reduce((a, p) => a + (resView[p.id]?.valor || 0), 0), [actives, resView]);
  const emitidas = actives.filter((p) => nf[p.id]?.status === "emitida").length;
  const pendentes = useMemo(() => actives.filter((p) => (nf[p.id]?.status || "pendente") === "pendente"), [actives, nf]);
  const totalPendente = useMemo(() => pendentes.reduce((a, p) => a + (resView[p.id]?.valor || 0), 0), [pendentes, resView]);

  /* ---------- ações (estado local + toast) ---------- */
  const emitir = async (pid: string) => {
    setNf((st) => ({ ...st, [pid]: { status: "gerando" } }));
    await sleep(750);
    setNf((st) => ({ ...st, [pid]: { status: "emitida", numero: nextNumero(), notaId: "nf-" + pid, dataEmissao: "2026-06-30" } }));
  };

  // abre a confirmação da NF de um paciente (emissão é irreversível)
  const gerarUma = (pid: string) => {
    if (busy.current.has(pid)) return;
    const st = nf[pid]?.status;
    if (st && st !== "pendente") return;
    const nome = actives.find((p) => p.id === pid)?.nome || "paciente";
    setConfirm({ tipo: "uma", pid, nome });
  };

  const emitirUma = async (pid: string) => {
    if (busy.current.has(pid)) return;
    const st = nf[pid]?.status;
    if (st && st !== "pendente") return;
    busy.current.add(pid);
    const nome = actives.find((p) => p.id === pid)?.nome.split(" ")[0] || "paciente";
    await emitir(pid);
    toast(`NF de ${nome} emitida`);
    busy.current.delete(pid);
  };

  // abre a confirmação da emissão em lote (irreversível)
  const gerarTodas = () => {
    if (generating) return;
    if (!pendentes.length) { toast("Todas as NFs já foram emitidas"); return; }
    setConfirm({ tipo: "todas" });
  };

  const emitirTodas = async () => {
    if (generating) return;
    const pend = actives.filter((p) => (nf[p.id]?.status || "pendente") === "pendente");
    if (!pend.length) { toast("Todas as NFs já foram emitidas"); return; }
    setGenerating(true);
    setGen({ done: 0, total: pend.length });
    for (let i = 0; i < pend.length; i++) { await emitir(pend[i].id); setGen({ done: i + 1, total: pend.length }); }
    toast(`${pend.length} nota${pend.length > 1 ? "s" : ""} fiscal${pend.length > 1 ? "is" : ""} emitida${pend.length > 1 ? "s" : ""}`);
    setTimeout(() => setGenerating(false), 400);
  };

  // confirma a ação pendente e dispara a emissão de fato
  const confirmarEmissao = () => {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    if (c.tipo === "todas") emitirTodas();
    else if (c.pid) emitirUma(c.pid);
  };

  const enviar = async (pid: string) => {
    setWhats((st) => ({ ...st, [pid]: "enviando" }));
    await sleep(650);
    setWhats((st) => ({ ...st, [pid]: "enviado" }));
  };
  const enviarUm = (pid: string) => {
    const info = nf[pid];
    if (!info || info.status !== "emitida") return;
    if (whats[pid] === "enviado" || whats[pid] === "enviando") return;
    const nome = actives.find((p) => p.id === pid)?.nome.split(" ")[0] || "paciente";
    enviar(pid).then(() => toast(`NF enviada para ${nome} no WhatsApp`));
  };
  const enviarTodas = async () => {
    const emit = actives.filter((p) => nf[p.id]?.status === "emitida" && whats[p.id] !== "enviado");
    if (!emit.length) { toast("Nenhuma NF emitida para enviar"); return; }
    for (const p of emit) { await enviar(p.id); await sleep(220); }
    toast(`${emit.length} nota${emit.length > 1 ? "s" : ""} enviada${emit.length > 1 ? "s" : ""} no WhatsApp`);
  };

  const GRID = "display:grid;grid-template-columns:2fr 1.4fr .8fr 1fr 1.3fr 1.1fr;gap:12px";
  const pdfP = pacientes.find((p) => p.id === pdfId);

  /* ---------- render ---------- */
  return (
    <Screen>
      {/* ============ DESKTOP (idêntico ao original) ============ */}
      {!isMobile && (
        <>
      {/* RESUMO + AÇÕES */}
      <div className="m-reveal" style={s("display:flex;align-items:center;gap:16px;margin-bottom:18px;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-card);padding:18px 22px;flex-wrap:wrap")}>
        <div style={s("display:flex;flex-direction:column")}>
          <span style={s("font-size:13px;color:var(--muted);font-weight:600")}>Total a faturar em junho</span>
          <span style={s("font-size:28px;font-weight:800;letter-spacing:-.02em;font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{fmt(totalFaturar)}</span>
        </div>
        <div style={s("width:1px;height:42px;background:var(--border)")} />
        <div style={s("display:flex;flex-direction:column")}>
          <span style={s("font-size:13px;color:var(--muted);font-weight:600")}>NFs emitidas</span>
          <span style={s("font-size:20px;font-weight:800;color:var(--success)")}>{emitidas} / {ativosN}</span>
        </div>
        <div style={s("margin-left:auto;display:flex;gap:10px")}>
          <button onClick={enviarTodas} className="m-hov-bg m-press m-focus" style={s("display:flex;align-items:center;gap:8px;padding:11px 18px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--ink);font-weight:700;font-size:14px;cursor:pointer")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>Enviar todas
          </button>
          <button onClick={gerarTodas} className="m-hov-primary m-press m-focus" style={s("display:flex;align-items:center;gap:8px;padding:11px 20px;border:none;border-radius:10px;background:var(--primary);color:#fff;font-weight:700;font-size:14px;cursor:pointer")}>
            {generating && <span style={{ ...s("width:15px;height:15px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%"), animation: "mspin .7s linear infinite" }} />}
            {generating ? `Gerando ${gen.done}/${gen.total}…` : "Gerar todas as NFs"}
          </button>
        </div>
        {generating && <div style={s("width:100%;margin-top:6px")}><div style={s("height:7px;border-radius:5px;background:var(--line);overflow:hidden")}><div style={{ ...s("height:100%;background:var(--primary)"), width: (gen.total ? Math.round(gen.done / gen.total * 100) : 0) + "%", transition: "width .3s ease" }} /></div></div>}
      </div>

      {/* TABELA */}
      <div className="m-reveal" style={{ ...s("background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-card);overflow:hidden"), animationDelay: "60ms" }}>
        <div style={s(GRID + ";padding:13px 22px;border-bottom:1px solid var(--border);font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:.05em")}>
          <span>PACIENTE</span><span>SERVIÇO</span><span>SESSÕES</span><span>VALOR</span><span>NOTA FISCAL</span><span>WHATSAPP</span>
        </div>
        {actives.map((p) => {
          const [ab, af] = avatarClin(p.id);
          const r = resView[p.id];
          const info = nf[p.id];
          const st = info?.status || "pendente";
          const wa = whats[p.id] || "idle";
          const emit = st === "emitida";
          return (
            <div key={p.id} style={s(GRID + ";padding:12px 22px;border-bottom:1px solid var(--line);align-items:center")}>
              <div style={s("display:flex;align-items:center;gap:11px;min-width:0")}>
                <div style={s(`width:34px;height:34px;border-radius:50%;background:${ab};color:${af};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;flex-shrink:0`)}>{initials(p.nome)}</div>
                <span style={s("font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.nome}</span>
              </div>
              <span style={s("font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r?.servicoNome || "—"}</span>
              <span style={s("font-size:13.5px;color:var(--ink)")}>{r?.sessoes || 0}</span>
              <span style={s("font-size:14px;font-weight:700")}>{fmt(r?.valor || 0)}</span>
              <div>
                {st === "pendente" && <button onClick={() => gerarUma(p.id)} className="m-hov-prim-border m-press m-focus" style={s("display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);font-weight:700;font-size:12.5px;cursor:pointer")}>Gerar NF</button>}
                {st === "gerando" && <span style={s("display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--muted)")}><span style={{ ...s("width:13px;height:13px;border:2px solid var(--line);border-top-color:var(--primary);border-radius:50%"), animation: "mspin .7s linear infinite" }} />Gerando…</span>}
                {st === "processando" && <span style={s("display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--warn)")}><span style={{ ...s("width:13px;height:13px;border:2px solid var(--warn-soft);border-top-color:var(--warn);border-radius:50%"), animation: "mspin .7s linear infinite" }} />Processando…</span>}
                {emit && <button onClick={() => setPdfId(p.id)} className="m-pop m-press m-focus" style={s("display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border:none;border-radius:8px;background:var(--success-soft);color:var(--success);font-weight:700;font-size:12.5px;cursor:pointer")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>NF {info?.numero}</button>}
              </div>
              <div>
                {wa === "idle" && <button onClick={() => emit && enviarUm(p.id)} disabled={!emit} className="m-press m-focus" style={s(`display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-weight:700;font-size:12.5px;cursor:${emit ? "pointer" : "not-allowed"};opacity:${emit ? "1" : ".45"};color:var(--ink)`)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>Enviar</button>}
                {wa === "enviando" && <span style={s("display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--muted)")}><span style={{ ...s("width:13px;height:13px;border:2px solid var(--line);border-top-color:#25D366;border-radius:50%"), animation: "mspin .7s linear infinite" }} />Enviando…</span>}
                {wa === "enviado" && <span className="m-pop" style={s("display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--success)")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="m20 6-11 11-5-5" /></svg>Enviado</span>}
                {wa === "erro" && <button onClick={() => emit && enviarUm(p.id)} disabled={!emit} className="m-press m-focus" style={s(`display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--danger);border-radius:8px;background:var(--danger-soft);color:var(--danger);font-weight:700;font-size:12.5px;cursor:${emit ? "pointer" : "not-allowed"}`)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" /></svg>Tentar de novo</button>}
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* ============ MOBILE — resumo empilhado + cada linha vira um CARD ============ */}
      {isMobile && (
        <>
          {/* RESUMO + AÇÕES (empilhado, toque grande) */}
          <div className="m-reveal" style={s("display:flex;flex-direction:column;gap:16px;margin-bottom:16px;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-card);padding:20px")}>
            <div style={s("display:flex;flex-direction:column;gap:2px")}>
              <span style={s("font-size:13px;color:var(--muted);font-weight:600")}>Total a faturar em junho</span>
              <span style={s("font-size:30px;font-weight:800;letter-spacing:-.02em;font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{fmt(totalFaturar)}</span>
            </div>
            <div style={s("display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:12px")}>
              <span style={s("font-size:13px;color:var(--muted);font-weight:600")}>NFs emitidas</span>
              <span style={s("font-size:17px;font-weight:800;color:var(--success)")}>{emitidas} / {ativosN}</span>
            </div>
            <div style={s("display:flex;flex-direction:column;gap:10px")}>
              <button onClick={gerarTodas} className="m-hov-primary m-press m-focus" style={s("display:flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:0 20px;border:none;border-radius:12px;background:var(--primary);color:#fff;font-weight:700;font-size:15px;cursor:pointer")}>
                {generating && <span style={{ ...s("width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%"), animation: "mspin .7s linear infinite" }} />}
                {generating ? `Gerando ${gen.done}/${gen.total}…` : "Gerar todas as NFs"}
              </button>
              <button onClick={enviarTodas} className="m-hov-bg m-press m-focus" style={s("display:flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:0 20px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font-weight:700;font-size:15px;cursor:pointer")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>Enviar todas
              </button>
            </div>
            {generating && <div style={s("width:100%")}><div style={s("height:7px;border-radius:5px;background:var(--line);overflow:hidden")}><div style={{ ...s("height:100%;background:var(--primary)"), width: (gen.total ? Math.round(gen.done / gen.total * 100) : 0) + "%", transition: "width .3s ease" }} /></div></div>}
          </div>

          {/* LISTA — cada paciente vira um card empilhado */}
          {actives.map((p, i) => {
            const [ab, af] = avatarClin(p.id);
            const r = resView[p.id];
            const info = nf[p.id];
            const st = info?.status || "pendente";
            const wa = whats[p.id] || "idle";
            const emit = st === "emitida";
            return (
              <div key={p.id} className="m-reveal" style={{ ...s("background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-card);padding:16px;margin-bottom:12px"), animationDelay: Math.min(i, 8) * 45 + "ms" }}>
                {/* topo: avatar + nome + valor */}
                <div style={s("display:flex;align-items:center;gap:12px")}>
                  <div style={s(`width:44px;height:44px;border-radius:50%;background:${ab};color:${af};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0`)}>{initials(p.nome)}</div>
                  <div style={s("display:flex;flex-direction:column;min-width:0;flex:1")}>
                    <span style={s("font-size:15.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.nome}</span>
                    <span style={s("font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r?.servicoNome || "—"} · {r?.sessoes || 0} sessões</span>
                  </div>
                  <span style={s("font-size:17px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;flex-shrink:0")}>{fmt(r?.valor || 0)}</span>
                </div>

                {/* status da nota fiscal */}
                <div style={s("display:flex;align-items:center;gap:8px;margin-top:14px")}>
                  <span style={s("font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:.04em")}>NOTA FISCAL</span>
                  {st === "pendente" && <span style={s("display:inline-flex;align-items:center;font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px;background:var(--warn-soft);color:var(--warn)")}>Pendente</span>}
                  {st === "gerando" && <span style={s("display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px;background:var(--line);color:var(--muted)")}><span style={{ ...s("width:12px;height:12px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%"), animation: "mspin .7s linear infinite" }} />Gerando…</span>}
                  {st === "processando" && <span style={s("display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px;background:var(--warn-soft);color:var(--warn)")}><span style={{ ...s("width:12px;height:12px;border:2px solid var(--warn-soft);border-top-color:var(--warn);border-radius:50%"), animation: "mspin .7s linear infinite" }} />Processando…</span>}
                  {emit && <span className="m-pop" style={s("display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px;background:var(--success-soft);color:var(--success)")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>{info?.numero}</span>}
                </div>

                <div style={s("height:1px;background:var(--line);margin-top:14px")} />

                {/* ações: Gerar/Ver NF + Enviar WhatsApp (alvos de toque grandes) */}
                <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px")}>
                  {emit ? (
                    <button onClick={() => setPdfId(p.id)} className="m-hov-bg m-press m-focus" style={s("display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font-weight:700;font-size:14px;cursor:pointer")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 20.5V5.2A1.7 1.7 0 0 1 6.7 3.5h10.6A1.7 1.7 0 0 1 19 5.2V20.5l-2.33-1.6-2.34 1.6-2.33-1.6-2.34 1.6-2.33-1.6-2.33 1.6Z" /><path d="M8.5 8.4h7M8.5 11.8h4.5" /></svg>Ver NF
                    </button>
                  ) : (
                    <button onClick={() => gerarUma(p.id)} disabled={st !== "pendente"} className="m-hov-prim-border m-press m-focus" style={s(`display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font-weight:700;font-size:14px;cursor:${st === "pendente" ? "pointer" : "not-allowed"};opacity:${st === "pendente" ? "1" : ".5"}`)}>
                      Gerar NF
                    </button>
                  )}

                  {wa === "idle" && <button onClick={() => emit && enviarUm(p.id)} disabled={!emit} className="m-hov-bright m-press m-focus" style={s(`display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:1px solid var(--border);border-radius:12px;background:var(--surface);font-weight:700;font-size:14px;cursor:${emit ? "pointer" : "not-allowed"};opacity:${emit ? "1" : ".5"};color:var(--ink)`)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>Enviar</button>}
                  {wa === "enviando" && <span style={s("display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:12px;background:var(--line);font-size:14px;font-weight:700;color:var(--muted)")}><span style={{ ...s("width:14px;height:14px;border:2px solid var(--border);border-top-color:#25D366;border-radius:50%"), animation: "mspin .7s linear infinite" }} />Enviando…</span>}
                  {wa === "enviado" && <span className="m-pop" style={s("display:flex;align-items:center;justify-content:center;gap:7px;min-height:48px;border-radius:12px;background:var(--success-soft);font-size:14px;font-weight:700;color:var(--success)")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="m20 6-11 11-5-5" /></svg>Enviado</span>}
                  {wa === "erro" && <button onClick={() => emit && enviarUm(p.id)} className="m-press m-focus" style={s("display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:1px solid var(--danger);border-radius:12px;background:var(--danger-soft);color:var(--danger);font-weight:700;font-size:14px;cursor:pointer")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" /></svg>Tentar de novo</button>}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* PDF MODAL — pré-visualização da NFS-e (homologação) */}
      {pdfP && (() => {
        const r = resView[pdfP.id];
        const valor = r?.valor || 0;
        const info = nf[pdfP.id];
        return (
          <div onClick={() => setPdfId(null)} style={{ ...s("position:fixed;inset:0;background:rgba(25,30,28,.55);z-index:60;display:flex;align-items:center;justify-content:center;padding:30px"), animation: "mfade .2s ease" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...s("width:560px;max-width:94vw;max-height:90vh;overflow-y:auto;background:#fff;border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.35);position:relative"), animation: "mrise .25s ease" }}>
              <button onClick={() => setPdfId(null)} style={s("position:absolute;top:14px;right:14px;width:32px;height:32px;border:none;border-radius:8px;background:rgba(0,0,0,.06);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#555;z-index:2")}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
              <div style={{ ...s("position:absolute;top:90px;left:50%;font-size:60px;font-weight:800;color:rgba(207,82,71,.13);letter-spacing:.05em;pointer-events:none;white-space:nowrap;border:5px solid rgba(207,82,71,.13);padding:6px 26px;border-radius:10px"), transform: "translate(-50%,-50%) rotate(-22deg)" }}>HOMOLOGAÇÃO</div>
              <div style={s("padding:40px 44px;color:#1a1a1a;font-size:13px;line-height:1.5")}>
                <div style={s("display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:14px")}>
                  <div><div style={s("font-size:16px;font-weight:800")}>PREFEITURA DE SÃO PAULO</div><div style={s("font-size:12px;color:#555")}>Secretaria Municipal da Fazenda</div></div>
                  <div style={s("text-align:right")}><div style={s("font-size:13px;font-weight:800")}>NFS-e</div><div style={s("font-size:11px;color:#555")}>Nota Fiscal de Serviços Eletrônica</div></div>
                </div>
                <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-top:16px;font-size:12px")}>
                  <div><strong>Número:</strong> {info?.numero || "—"}</div>
                  <div><strong>Emissão:</strong> 30/06/2026</div>
                  <div><strong>Competência:</strong> 06/2026</div>
                  <div><strong>Código verif.:</strong> AB2X-9K4P</div>
                </div>
                <div style={s("margin-top:18px;background:#f5f5f3;border-radius:6px;padding:14px 16px")}>
                  <div style={s("font-size:10.5px;font-weight:700;color:#777;letter-spacing:.05em;margin-bottom:6px")}>PRESTADOR DE SERVIÇOS</div>
                  <div style={s("font-weight:700")}>{prestador.nome}</div>
                  <div style={s("font-size:12px;color:#555")}>CNPJ {prestador.cnpj}</div>
                </div>
                <div style={s("margin-top:12px;background:#f5f5f3;border-radius:6px;padding:14px 16px")}>
                  <div style={s("font-size:10.5px;font-weight:700;color:#777;letter-spacing:.05em;margin-bottom:6px")}>TOMADOR DE SERVIÇOS</div>
                  <div style={s("font-weight:700")}>{pdfP.nome}</div>
                  <div style={s("font-size:12px;color:#555")}>CPF {pdfP.cpf || "—"}</div>
                </div>
                <div style={s("margin-top:18px")}>
                  <div style={s("font-size:10.5px;font-weight:700;color:#777;letter-spacing:.05em;margin-bottom:6px")}>DISCRIMINAÇÃO DOS SERVIÇOS</div>
                  <div style={s("border:1px solid #ddd;border-radius:6px;overflow:hidden")}>
                    <div style={s("display:flex;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #eee")}><span>{r?.servicoNome || "Sessão de Psicologia"} — competência 06/2026 ({r?.sessoes || 0} sessões)</span><span style={s("font-weight:700")}>{fmt(valor)}</span></div>
                    <div style={s("display:flex;justify-content:space-between;padding:11px 14px;background:#fafafa")}><span style={s("font-size:11px;color:#666")}>ISS 2% (retido na fonte: não)</span><span style={s("font-size:11px;color:#666")}>ISS {fmt(valor * 0.02)}</span></div>
                  </div>
                </div>
                <div style={s("margin-top:16px;display:flex;justify-content:flex-end;align-items:baseline;gap:12px;border-top:2px solid #1a1a1a;padding-top:12px")}>
                  <span style={s("font-size:13px;color:#555")}>VALOR TOTAL DA NOTA</span><span style={s("font-size:22px;font-weight:800")}>{fmt(valor)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMAÇÃO — emitir NF é irreversível (uma ou em lote) */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.tipo === "todas" ? "Emitir todas as NFs?" : "Emitir nota fiscal?"}
        message={
          confirm?.tipo === "todas"
            ? `Emitir ${pendentes.length} nota${pendentes.length > 1 ? "s" : ""} fiscal${pendentes.length > 1 ? "is" : ""} somando ${fmt(totalPendente)}? A emissão é irreversível.`
            : confirm?.nome
              ? `Emitir a NF de ${confirm.nome}? A emissão é irreversível.`
              : undefined
        }
        confirmText="Emitir"
        cancelText="Cancelar"
        tone="primary"
        onConfirm={confirmarEmissao}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}

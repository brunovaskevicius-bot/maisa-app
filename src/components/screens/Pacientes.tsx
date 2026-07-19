"use client";
import React, { useMemo, useState } from "react";
import { s, Icon, Screen, fmt, initials, toast } from "@/lib/ui";
import {
  pacientes as pacientesMock,
  servicos,
  fixos as fixosMock,
  resumoBy,
  avatarClin,
  type Paciente,
  type Fixo,
} from "@/lib/clinicoMock";

/* ---------- helpers locais (adaptados do Psico Manager) ---------- */

// mês por extenso a partir de ISO "YYYY-MM-DD" — parse manual (sem new Date → SSR-safe)
const MESES_ABREV = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const fmtMes = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m] = iso.split("-").map(Number);
  return `${MESES_ABREV[(m || 1) - 1]} ${y}`;
};

const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// resumo do mês por paciente, no shape que a tela consome
const resumoDe = (id: string) => {
  const r = resumoBy[id];
  return r ? { sessoes: r.totalSessoes, valor: r.valorTotal, servicoNome: r.servicos[0] || "—" } : null;
};

// avatar "veludo" idêntico ao Psico: duplo radial-gradient (claro/escuro) sobre o tom escuro
function AvatarBox({ id, nome, size, radius, font }: { id: string; nome: string; size: number; radius: number; font: number }) {
  const [ab, af] = avatarClin(id); // [claro, escuro, dot]
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: font,
        letterSpacing: "-.01em",
        textShadow: "0 1px 2px rgba(30,20,10,.25)",
        background: `radial-gradient(circle at 28% 20%, ${af} 0%, transparent 60%), radial-gradient(circle at 80% 85%, ${ab} 0%, transparent 58%), ${af}`,
        boxShadow: "0 4px 12px oklch(30% 0.03 60 / 0.14)",
      }}
    >
      {initials(nome)}
    </div>
  );
}

const PAC_PER_PAGE = 12;

type Draft = { tel: string; email: string; diag: string };
type FixoDraft = { servicoId: string; valor: string; diaSemana: number; hora: string };

export default function Pacientes() {
  // cópias locais (sem backend): ações mutam estado local + toast
  const [pacientesList, setPacientesList] = useState<Paciente[]>(pacientesMock);
  const [fixosList, setFixosList] = useState<Fixo[]>(fixosMock);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  const [page, setPage] = useState(0);

  // ficha
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fichaSave, setFichaSave] = useState<"idle" | "saving" | "saved">("idle");
  const [draft, setDraft] = useState<Draft>({ tel: "", email: "", diag: "" });
  const [notasMap, setNotasMap] = useState<Record<string, number>>({});
  const [fixoDraft, setFixoDraft] = useState<Record<string, FixoDraft>>({});

  // modal de agendamento
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleConfirm, setScheduleConfirm] = useState(false);
  const [sched, setSched] = useState<{ pid: string; sid: string; valor: string; data: string; hora: string }>({ pid: "", sid: "s1", valor: "", data: "2026-06-22", hora: "09:00" });

  /* ---------- derivados ---------- */
  const ativosN = useMemo(() => pacientesList.filter((p) => p.status === "ATIVO").length, [pacientesList]);
  const inativosN = pacientesList.length - ativosN;
  const actives = useMemo(() => pacientesList.filter((p) => p.status === "ATIVO"), [pacientesList]);

  const q = search.trim().toLowerCase();
  const filtered = pacientesList.filter((p) => {
    if (statusFilter === "ativos" && p.status !== "ATIVO") return false;
    if (statusFilter === "inativos" && p.status !== "INATIVO") return false;
    if (q && !(p.nome.toLowerCase().includes(q) || p.telefone.includes(q) || (p.diagnostico || "").toLowerCase().includes(q))) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAC_PER_PAGE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageList = filtered.slice(pageSafe * PAC_PER_PAGE, pageSafe * PAC_PER_PAGE + PAC_PER_PAGE);

  const sel = pacientesList.find((p) => p.id === selectedId) || null;

  /* ---------- ações (estado local + toast) ---------- */
  const resetPage = () => setPage(0);
  const setFilter = (k: "todos" | "ativos" | "inativos") => { setStatusFilter(k); resetPage(); };
  const onSearch = (v: string) => { setSearch(v); resetPage(); };

  const openPatient = (id: string) => {
    const p = pacientesList.find((x) => x.id === id);
    setSelectedId(id);
    setFichaSave("idle");
    if (p) setDraft({ tel: p.telefone, email: p.email || "", diag: p.diagnostico || "" });
  };
  const closePatient = () => setSelectedId(null);

  const saveFicha = () => {
    if (!sel) return;
    setFichaSave("saving");
    window.setTimeout(() => {
      setPacientesList((list) => list.map((p) => (p.id === sel.id ? { ...p, telefone: draft.tel, email: draft.email, diagnostico: draft.diag } : p)));
      setFichaSave("saved");
      toast("Ficha atualizada");
      window.setTimeout(() => setFichaSave("idle"), 1600);
    }, 650);
  };

  const arquivar = () => {
    if (!sel) return;
    const novo = sel.status === "ATIVO" ? "INATIVO" : "ATIVO";
    setPacientesList((list) => list.map((p) => (p.id === sel.id ? { ...p, status: novo } : p)));
    toast(novo === "INATIVO" ? "Paciente arquivado" : "Paciente reativado");
  };

  const novoPaciente = () => toast("Novo cadastro — em breve por aqui");

  // agenda fixa (dentro da ficha)
  const fd = (f: Fixo): FixoDraft => fixoDraft[f.id] ?? { servicoId: f.servicoId, valor: String(f.valor), diaSemana: f.diaSemana, hora: f.hora };
  const updFd = (f: Fixo, patch: Partial<FixoDraft>) => setFixoDraft((st) => ({ ...st, [f.id]: { ...fd(f), ...patch } }));
  const fixoDirty = (f: Fixo) => { const d = fixoDraft[f.id]; return !!d && (d.servicoId !== f.servicoId || d.valor !== String(f.valor) || d.diaSemana !== f.diaSemana || d.hora !== f.hora); };
  const salvarFixo = (f: Fixo) => {
    const d = fd(f);
    const svc = servicos.find((x) => x.id === d.servicoId) || f.servico;
    setFixosList((list) => list.map((x) => (x.id === f.id ? { ...x, servicoId: d.servicoId, valor: parseFloat(d.valor) || 0, diaSemana: d.diaSemana, hora: d.hora, servico: { id: svc.id, nome: svc.nome, preco: svc.preco, duracaoMin: svc.duracaoMin } } : x)));
    setFixoDraft((st) => { const c = { ...st }; delete c[f.id]; return c; });
    toast("Atendimento fixo atualizado");
  };
  const removerFixo = (f: Fixo) => {
    setFixosList((list) => list.filter((x) => x.id !== f.id));
    setFixoDraft((st) => { const c = { ...st }; delete c[f.id]; return c; });
    toast("Atendimento fixo removido");
  };
  const novaAgendaPara = (pid: string) => { setSched({ pid, sid: "s1", valor: "", data: "2026-06-22", hora: "09:00" }); setShowSchedule(true); setScheduleConfirm(false); };

  const saveSchedule = () => {
    if (!sched.pid) return;
    const svc = servicos.find((x) => x.id === sched.sid) || servicos[0];
    const p = pacientesList.find((x) => x.id === sched.pid)!;
    const diaSemana = new Date(sched.data + "T00:00:00").getDay();
    const novo: Fixo = {
      id: `f-${Date.now()}`,
      pacienteId: sched.pid,
      servicoId: sched.sid,
      valor: sched.valor ? parseFloat(sched.valor) : svc.preco,
      diaSemana,
      hora: sched.hora,
      paciente: { id: p.id, nome: p.nome },
      servico: { id: svc.id, nome: svc.nome, preco: svc.preco, duracaoMin: svc.duracaoMin },
    };
    setFixosList((list) => [...list, novo]);
    setScheduleConfirm(true);
    toast("Agenda fixa criada");
    window.setTimeout(() => { setShowSchedule(false); setScheduleConfirm(false); setSched({ pid: "", sid: "s1", valor: "", data: "2026-06-22", hora: "09:00" }); }, 1100);
  };

  /* ---------- estilos reaproveitados na ficha ---------- */
  const inp = "display:block;width:100%;margin-top:6px;padding:11px 13px;border:1px solid var(--border);border-radius:12px;font-size:14px;outline:none;color:var(--ink);background:var(--surface)";
  const lbl = "font-size:12px;font-weight:700;color:var(--muted)";
  const sec = "font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px";

  /* ---------- render ---------- */
  return (
    <Screen style={s("display:flex;flex-direction:column;min-height:0")}>
      {/* barra de busca + filtros + ação */}
      <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap")}>
        <div style={s("display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;flex:1;min-width:240px;max-width:380px")}>
          <Icon name="search" size={17} sw={2} stroke="var(--muted)" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por nome, telefone ou diagnóstico…" style={s("border:none;outline:none;background:none;font-size:14px;width:100%;color:var(--ink)")} />
        </div>
        <div style={s("display:flex;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:3px;gap:2px")}>
          {(["todos", "ativos", "inativos"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className="m-press" style={s(`padding:7px 15px;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;background:${statusFilter === k ? "var(--primary)" : "transparent"};color:${statusFilter === k ? "#fff" : "var(--muted)"}`)}>{k.charAt(0).toUpperCase() + k.slice(1)}</button>
          ))}
        </div>
        <button onClick={novoPaciente} className="m-hov-primary m-press m-focus" style={s("margin-left:auto;display:flex;align-items:center;gap:8px;padding:10px 17px;border:none;border-radius:10px;background:var(--primary);color:#fff;font-weight:700;font-size:14px;cursor:pointer")}>
          <Icon name="plus" size={17} sw={2.2} stroke="#fff" />Novo paciente
        </button>
      </div>

      {/* grade de cards */}
      <div style={s("display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));grid-auto-rows:minmax(175px, auto);gap:16px;align-content:start")}>
        {pageList.map((p, i) => {
          const ativo = p.status === "ATIVO";
          const r = resumoDe(p.id);
          const ses = r?.sessoes || 0;
          const serv = r?.servicoNome;
          return (
            <div key={p.id} onClick={() => openPatient(p.id)} className="m-card-hov m-reveal" style={{ ...s("background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-card);padding:16px;cursor:pointer;display:flex;flex-direction:column;gap:11px"), animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              <div style={s("display:flex;align-items:center;gap:11px;min-width:0")}>
                <AvatarBox id={p.id} nome={p.nome} size={44} radius={13} font={16} />
                <div style={s("display:flex;flex-direction:column;line-height:1.25;min-width:0")}>
                  <span style={s("font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.nome}</span>
                  <span style={s("font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.tipoAtendimento === "ONLINE" ? "Online" : "Presencial"} · desde {fmtMes(p.dataInicio)}</span>
                </div>
              </div>
              <div style={{ ...s("font-size:13px;color:var(--muted);line-height:1.4;min-height:36px"), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.diagnostico ? p.diagnostico : "Sem foco registrado."}</div>
              <div style={s("display:flex;flex-wrap:wrap;gap:6px;margin-top:auto")}>
                <span style={s(`display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:20px;background:${ativo ? "var(--success-soft)" : "var(--line)"};color:${ativo ? "var(--success)" : "var(--muted)"}`)}><span style={s(`width:6px;height:6px;border-radius:50%;background:${ativo ? "var(--success)" : "var(--muted)"}`)} />{ativo ? "Ativo" : "Inativo"}</span>
                {serv && <span style={s("font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:20px;background:var(--primary-soft);color:var(--primary-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px")}>{serv}</span>}
                {ativo && ses > 0 && <span style={s("font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:20px;background:var(--warm-soft);color:var(--warn)")}>{ses} {ses === 1 ? "sessão" : "sessões"}</span>}
              </div>
            </div>
          );
        })}
        {!filtered.length && <div style={s("grid-column:1/-1;padding:50px;text-align:center;color:var(--muted);font-size:14px")}>Nenhum paciente encontrado para esta busca.</div>}
      </div>

      {/* rodapé: contagem + paginação */}
      <div style={s("display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap")}>
        <span style={s("font-size:12.5px;color:var(--muted)")}>{filtered.length} {filtered.length === 1 ? "paciente" : "pacientes"} · {ativosN} ativos · {inativosN} inativos</span>
        {totalPages > 1 && (
          <div style={s("margin-left:auto;display:flex;align-items:center;gap:6px")}>
            <button onClick={() => setPage(Math.max(0, pageSafe - 1))} className="m-hov-bg m-press" style={s(`width:32px;height:32px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink);cursor:${pageSafe === 0 ? "not-allowed" : "pointer"};opacity:${pageSafe === 0 ? ".45" : "1"};display:flex;align-items:center;justify-content:center`)}><Icon name="chevron-left" size={15} sw={2.2} /></button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} className="m-press" style={s(`min-width:32px;height:32px;padding:0 9px;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;background:${i === pageSafe ? "var(--primary)" : "transparent"};color:${i === pageSafe ? "#fff" : "var(--muted)"}`)}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages - 1, pageSafe + 1))} className="m-hov-bg m-press" style={s(`width:32px;height:32px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink);cursor:${pageSafe === totalPages - 1 ? "not-allowed" : "pointer"};opacity:${pageSafe === totalPages - 1 ? ".45" : "1"};display:flex;align-items:center;justify-content:center`)}><Icon name="chevron-right" size={15} sw={2.2} /></button>
          </div>
        )}
      </div>

      {/* FICHA — MODAL CENTRAL */}
      {sel && (() => {
        const ativo = sel.status === "ATIVO";
        const r = resumoDe(sel.id);
        const curNotas = notasMap[sel.id] || 1;
        const total = r?.valor || 0;
        const selFixos = fixosList.filter((f) => f.pacienteId === sel.id);
        return (
          <div onClick={closePatient} style={{ ...s("position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:28px;background:rgba(25,30,28,.45)"), backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "mfade .2s ease" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...s("width:820px;max-width:94vw;max-height:90vh;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:30px;box-shadow:var(--shadow-pop)"), animation: "mrise .3s var(--ease-out)" }}>
              {/* HEADER */}
              <div style={{ position: "relative", padding: "30px 32px 22px", background: "radial-gradient(120% 130% at 0% 0%, var(--primary-soft) 0%, transparent 58%)" }}>
                <button onClick={closePatient} className="m-hov-bg m-press-icon" style={s("position:absolute;top:20px;right:20px;width:34px;height:34px;border-radius:11px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center")}><Icon name="x" size={17} sw={2.2} /></button>
                <div style={s("display:flex;align-items:center;gap:16px")}>
                  <AvatarBox id={sel.id} nome={sel.nome} size={64} radius={18} font={24} />
                  <div style={s("min-width:0")}>
                    <h2 style={s("font-size:23px;font-weight:800;letter-spacing:-.02em")}>{sel.nome}</h2>
                    <div style={s("display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap")}>
                      <span style={s(`display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;background:${ativo ? "var(--success-soft)" : "var(--line)"};color:${ativo ? "var(--success)" : "var(--muted)"}`)}><span style={s(`width:6px;height:6px;border-radius:50%;background:${ativo ? "var(--success)" : "var(--muted)"}`)} />{ativo ? "Ativo" : "Inativo"}</span>
                      <span style={s("font-size:13px;color:var(--muted);font-weight:600")}>{sel.tipoAtendimento === "ONLINE" ? "Online" : "Presencial"} · CPF {sel.cpf || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* BODY */}
              <div style={s("padding:6px 32px 24px")}>
                <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:22px 24px;align-items:start")}>
                  <div style={s("display:flex;flex-direction:column;gap:22px")}>
                    <div>
                      <div style={s(sec)}>Dados do paciente</div>
                      <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:12px")}>
                        <label style={s(lbl)}>Telefone<input value={draft.tel} onChange={(e) => setDraft({ ...draft, tel: e.target.value })} style={s(inp)} /></label>
                        <label style={s(lbl)}>E-mail<input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} style={s(inp)} /></label>
                        <label style={{ ...s(lbl), gridColumn: "1 / -1" }}>Diagnóstico / foco<input value={draft.diag} onChange={(e) => setDraft({ ...draft, diag: e.target.value })} style={s(inp)} /></label>
                      </div>
                    </div>
                    <div>
                      <div style={s(sec)}>Resumo do mês</div>
                      <div style={s("display:grid;grid-template-columns:repeat(2,1fr);gap:10px")}>
                        <div style={s("background:var(--bg);border-radius:14px;padding:13px")}><div style={s("font-size:11px;color:var(--muted);font-weight:600")}>Início</div><div style={s("font-size:14.5px;font-weight:700;margin-top:4px")}>{fmtMes(sel.dataInicio)}</div></div>
                        <div style={s("background:var(--bg);border-radius:14px;padding:13px")}><div style={s("font-size:11px;color:var(--muted);font-weight:600")}>Serviço</div><div style={s("font-size:14.5px;font-weight:700;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r?.servicoNome || "—"}</div></div>
                        <div style={s("background:var(--bg);border-radius:14px;padding:13px")}><div style={s("font-size:11px;color:var(--muted);font-weight:600")}>Sessões</div><div style={s("font-size:14.5px;font-weight:700;margin-top:4px;font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{r?.sessoes || 0}</div></div>
                        <div style={s("background:var(--bg);border-radius:14px;padding:13px")}><div style={s("font-size:11px;color:var(--muted);font-weight:600")}>Valor / mês</div><div style={s("font-size:14.5px;font-weight:700;margin-top:4px;color:var(--primary-dark);font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{fmt(r?.valor || 0)}</div></div>
                      </div>
                    </div>
                  </div>
                  <div style={s("display:flex;flex-direction:column;gap:22px")}>
                    <div>
                      <div style={s("display:flex;align-items:baseline;justify-content:space-between")}>
                        <div style={s(sec)}>Agenda fixa semanal</div>
                        <span style={s("font-size:11.5px;font-weight:600;color:var(--muted)")}>preço por sessão</span>
                      </div>
                      <div style={s("display:flex;flex-direction:column;gap:10px")}>
                        {selFixos.map((f) => { const d = fd(f); return (
                          <div key={f.id} style={s("background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:11px;display:flex;flex-direction:column;gap:9px")}>
                            <div style={s("display:flex;gap:8px")}>
                              <select value={d.servicoId} onChange={(e) => updFd(f, { servicoId: e.target.value })} style={s("flex:1.5;padding:9px;border:1px solid var(--border);border-radius:10px;font-size:13px;outline:none;background:var(--surface);color:var(--ink)")}>
                                {servicos.map((sv) => <option key={sv.id} value={sv.id}>{sv.nome}</option>)}
                              </select>
                              <div style={s("display:flex;align-items:center;gap:5px;flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:0 9px")}>
                                <span style={s("font-size:12px;color:var(--muted);font-weight:700")}>R$</span>
                                <input type="number" value={d.valor} onChange={(e) => updFd(f, { valor: e.target.value })} style={s("width:100%;border:none;outline:none;background:none;font-size:14px;font-weight:700;padding:9px 0;color:var(--ink)")} />
                              </div>
                            </div>
                            <div style={s("display:flex;gap:8px;align-items:center")}>
                              <select value={d.diaSemana} onChange={(e) => updFd(f, { diaSemana: parseInt(e.target.value) })} style={s("flex:1;padding:9px;border:1px solid var(--border);border-radius:10px;font-size:13px;outline:none;background:var(--surface);color:var(--ink)")}>
                                {DIAS_LABEL.map((dl, i) => <option key={i} value={i}>{dl}</option>)}
                              </select>
                              <input type="time" value={d.hora} onChange={(e) => updFd(f, { hora: e.target.value })} style={s("flex:1;padding:9px;border:1px solid var(--border);border-radius:10px;font-size:13px;outline:none;background:var(--surface);color:var(--ink)")} />
                              {fixoDirty(f)
                                ? <button onClick={() => salvarFixo(f)} className="m-hov-primary m-press" style={s("padding:9px 13px;border:none;border-radius:10px;background:var(--primary);color:#fff;font-weight:700;font-size:12.5px;cursor:pointer")}>Salvar</button>
                                : <button onClick={() => removerFixo(f)} title="Remover" className="m-hov-bg m-press-icon" style={s("width:36px;height:36px;border:1px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;color:var(--danger);display:flex;align-items:center;justify-content:center")}><Icon name="trash" size={15} sw={2} /></button>}
                            </div>
                          </div>
                        ); })}
                        {!selFixos.length && <div style={s("font-size:13px;color:var(--muted);text-align:center;padding:12px;background:var(--bg);border-radius:12px")}>Nenhum atendimento fixo. Adicione abaixo.</div>}
                      </div>
                      <button onClick={() => novaAgendaPara(sel.id)} className="m-hov-bg m-press" style={s("width:100%;margin-top:10px;padding:11px;border:1px dashed var(--border);border-radius:12px;background:var(--surface);color:var(--primary-dark);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px")}>
                        <Icon name="plus" size={15} sw={2.2} />Adicionar atendimento fixo
                      </button>
                    </div>
                    <div>
                      <div style={s("display:flex;align-items:baseline;justify-content:space-between")}>
                        <div style={s(sec)}>Divisão de notas fiscais</div>
                        <span style={s("font-size:11.5px;font-weight:600;color:var(--muted)")}>fechamento do mês</span>
                      </div>
                      <div style={s("display:flex;background:var(--bg);border-radius:12px;padding:3px;gap:2px")}>
                        {[1, 2, 3, 4].map((n) => <button key={n} onClick={() => setNotasMap({ ...notasMap, [sel.id]: n })} className="m-press" style={s(`flex:1;padding:10px 0;border:none;border-radius:9px;cursor:pointer;font-size:14px;font-weight:700;background:${curNotas === n ? "var(--primary)" : "transparent"};color:${curNotas === n ? "#fff" : "var(--muted)"}`)}>{n}</button>)}
                      </div>
                      <div style={s("display:flex;align-items:center;gap:9px;margin-top:12px")}>
                        <Icon name="receipt" size={16} sw={2} stroke="var(--primary)" />
                        <span style={s("font-size:13.5px;font-weight:600;color:var(--ink)")}>{curNotas === 1 ? `1 nota de ${fmt(total)}` : `${curNotas} notas de ${fmt(total / curNotas)}`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* FOOTER STICKY */}
              <div style={{ position: "sticky", bottom: 0, display: "flex", alignItems: "center", gap: 10, padding: "16px 32px", borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
                <button onClick={arquivar} className="m-hov-bg m-press" style={s("padding:12px 18px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font-weight:700;font-size:14px;cursor:pointer")}>{ativo ? "Arquivar" : "Reativar"}</button>
                <button onClick={saveFicha} className={fichaSave === "saved" ? "m-pop" : "m-hov-primary m-press"} style={s("margin-left:auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:184px;padding:12px 22px;border:none;border-radius:12px;background:var(--primary);color:#fff;font-weight:700;font-size:14px;cursor:pointer")}>
                  {fichaSave === "saving" && <span style={{ ...s("width:15px;height:15px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%"), animation: "mspin .7s linear infinite" }} />}
                  {fichaSave === "saved" && <Icon name="check" size={16} sw={2.6} stroke="#fff" />}
                  {fichaSave === "saving" ? "Salvando…" : fichaSave === "saved" ? "Salvo" : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL — NOVA AGENDA FIXA */}
      {showSchedule && (
        <div onClick={() => setShowSchedule(false)} style={{ ...s("position:fixed;inset:0;background:rgba(25,30,28,.4);z-index:60;display:flex;align-items:center;justify-content:center"), animation: "mfade .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...s("width:440px;max-width:92vw;background:var(--surface);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-pop)"), animation: "mrise .25s ease" }}>
            <div style={s("padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between")}>
              <div><h2 style={s("font-size:17px;font-weight:800")}>Nova agenda fixa</h2><span style={s("font-size:12px;color:var(--muted);font-weight:600")}>O paciente se repete toda semana neste dia/horário</span></div>
              <button onClick={() => setShowSchedule(false)} className="m-hov-bg m-press-icon" style={s("width:30px;height:30px;border:none;border-radius:8px;background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted)")}><Icon name="x" size={16} sw={2.2} /></button>
            </div>
            <div style={s("padding:22px 24px;display:flex;flex-direction:column;gap:15px")}>
              <label style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>Paciente
                <select value={sched.pid} onChange={(e) => setSched({ ...sched, pid: e.target.value })} style={s("display:block;width:100%;margin-top:6px;padding:11px;border:1px solid var(--border);border-radius:9px;font-size:14px;outline:none;background:var(--surface);color:var(--ink)")}>
                  <option value="">Selecione um paciente…</option>
                  {actives.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </label>
              <div style={s("display:flex;gap:12px")}>
                <label style={s("flex:1.4;font-size:12.5px;font-weight:700;color:var(--muted)")}>Serviço
                  <select value={sched.sid} onChange={(e) => setSched({ ...sched, sid: e.target.value })} style={s("display:block;width:100%;margin-top:6px;padding:11px;border:1px solid var(--border);border-radius:9px;font-size:14px;outline:none;background:var(--surface);color:var(--ink)")}>
                    {servicos.map((sv) => <option key={sv.id} value={sv.id}>{sv.nome}</option>)}
                  </select>
                </label>
                <label style={s("flex:1;font-size:12.5px;font-weight:700;color:var(--muted)")}>Valor / sessão
                  <input type="number" value={sched.valor} onChange={(e) => setSched({ ...sched, valor: e.target.value })} placeholder={String(servicos.find((x) => x.id === sched.sid)?.preco ?? "")} style={s("display:block;width:100%;margin-top:6px;padding:11px;border:1px solid var(--border);border-radius:9px;font-size:14px;outline:none;background:var(--surface);color:var(--ink)")} />
                </label>
              </div>
              <div style={s("display:flex;gap:12px")}>
                <label style={s("flex:1;font-size:12.5px;font-weight:700;color:var(--muted)")}>Dia da semana (data exemplo)<input type="date" value={sched.data} onChange={(e) => setSched({ ...sched, data: e.target.value })} style={s("display:block;width:100%;margin-top:6px;padding:11px;border:1px solid var(--border);border-radius:9px;font-size:14px;outline:none;background:var(--surface);color:var(--ink)")} /></label>
                <label style={s("flex:1;font-size:12.5px;font-weight:700;color:var(--muted)")}>Hora<input type="time" value={sched.hora} onChange={(e) => setSched({ ...sched, hora: e.target.value })} style={s("display:block;width:100%;margin-top:6px;padding:11px;border:1px solid var(--border);border-radius:9px;font-size:14px;outline:none;background:var(--surface);color:var(--ink)")} /></label>
              </div>
              <div style={s("font-size:12px;color:var(--muted);background:var(--bg);border-radius:8px;padding:9px 11px")}>Repete toda <strong style={s("color:var(--ink)")}>{DIAS_FULL[new Date(sched.data + "T00:00:00").getDay()]}-feira</strong> às {sched.hora}. O valor do mês é calculado automaticamente.</div>
              {scheduleConfirm && <div className="m-pop" style={s("background:var(--success-soft);color:var(--success);font-size:13px;font-weight:700;padding:10px 12px;border-radius:9px;display:flex;align-items:center;gap:8px")}><Icon name="check" size={15} sw={2.4} />Agenda fixa criada com sucesso!</div>}
              <button onClick={saveSchedule} className="m-hov-primary m-press" style={s("padding:12px;border:none;border-radius:10px;background:var(--primary);color:#fff;font-weight:700;font-size:14.5px;cursor:pointer;margin-top:4px")}>Criar agenda fixa</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}

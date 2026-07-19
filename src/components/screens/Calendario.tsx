"use client";
import { useMemo, useState } from "react";
import { s, Icon, Screen, toast, initials } from "@/lib/ui";
import { fixos as fixosMock, pacientes, servicos, avatarClin, type Fixo } from "@/lib/clinicoMock";

/* ---------- calendário clínico (clone do Psico Manager) ----------
 * Grade por hora + navegação de semana. Dados 100% de @/lib/clinicoMock (sem fetch).
 * "Hoje" é FIXO em 17/jun/2026 (SSR-safe: nada de Date.now/new Date() dinâmico). */

type View = "dia" | "semana" | "duas" | "mes";

const DOW = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]; // por getDay() e cabeçalho do mês
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const HOURS = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`); // 08:00 → 20:00
const HH = 56; // px por hora
const H0 = 8;  // primeira hora
const REVEAL_CAP = 12;  // teto de itens com stagger
const REVEAL_STEP = 45; // ms por índice — efeito "construindo a agenda"

// cores do tile por serviço (idênticas ao Psico: [bg claro, texto, dot]).
const APPT_COLORS: Record<string, [string, string, string]> = {
  s1: ["var(--primary-soft)", "var(--primary-dark)", "var(--primary)"],
  s2: ["#F5E6C8", "#8A6220", "var(--warm)"],
  s3: ["#E7EAD8", "#5E6B3A", "#7C8C4A"],
  s4: ["#F3E0D6", "#A85A3C", "#C67B5C"],
};

const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const TODAY = new Date(2026, 5, 17); // qua, 17 de junho de 2026

let localSeq = 0;

export default function Calendario() {
  const [view, setView] = useState<View>("semana");
  const [anchor, setAnchor] = useState<Date>(TODAY);
  const [fixos, setFixos] = useState<Fixo[]>(fixosMock);

  // modal de agendamento (ação local: cria ocorrência fixa + toast)
  const ativos = useMemo(() => pacientes.filter((p) => p.status === "ATIVO"), []);
  const svcAtivos = useMemo(() => servicos.filter((v) => v.ativo), []);
  const [showSchedule, setShowSchedule] = useState(false);
  const [sched, setSched] = useState({ pid: ativos[0]?.id || "", sid: "s1", hora: "09:00", data: "2026-06-22" });

  const nav = (dir: number) =>
    setAnchor((a) => (view === "dia" ? addDays(a, dir) : view === "semana" ? addDays(a, dir * 7) : view === "duas" ? addDays(a, dir * 14) : addMonths(a, dir)));

  let visDays: Date[] = [];
  if (view === "dia") visDays = [anchor];
  else if (view === "semana") { const w = startOfWeek(anchor); visDays = Array.from({ length: 7 }, (_, i) => addDays(w, i)); }
  else if (view === "duas") { const w = startOfWeek(anchor); visDays = Array.from({ length: 14 }, (_, i) => addDays(w, i)); }
  else { const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const w = startOfWeek(first); visDays = Array.from({ length: 42 }, (_, i) => addDays(w, i)); }

  const isGrid = view === "dia" || view === "semana";

  const apptsForDate = (date: Date) =>
    fixos.filter((f) => f.diaSemana === date.getDay()).map((f) => {
      const [hh, mm] = f.hora.split(":").map(Number);
      const start = hh + (mm >= 30 ? 0.5 : 0);
      const c = APPT_COLORS[f.servicoId] || APPT_COLORS.s1;
      const dur = f.servico.duracaoMin || 50;
      return {
        id: `${f.id}-${date.getDate()}`, start,
        top: (start - H0) * HH, height: Math.max((dur / 60) * HH - 3, 26),
        bg: c[0], fg: c[1], dot: c[2],
        nome: f.paciente.nome, servicoNome: f.servico.nome,
        hora: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, pid: f.pacienteId,
      };
    }).sort((a, b) => a.start - b.start);

  const rangeLabel = (() => {
    if (view === "dia") return `${anchor.getDate()} de ${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === "mes") return `${MONTHS[anchor.getMonth()]} de ${anchor.getFullYear()}`;
    const a = visDays[0], b = visDays[visDays.length - 1];
    return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} de ${MONTHS[a.getMonth()]}` : `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)}`;
  })();

  // sessões por paciente no INTERVALO VISÍVEL (dinâmico por dia/semana/2 semanas/mês)
  const sessoesVis = (() => {
    const cnt: Record<string, { nome: string; count: number }> = {};
    for (const d of visDays) for (const ap of apptsForDate(d)) {
      if (!cnt[ap.pid]) cnt[ap.pid] = { nome: ap.nome, count: 0 };
      cnt[ap.pid].count++;
    }
    return Object.entries(cnt).map(([pid, v]) => ({ pid, nome: v.nome, count: v.count })).sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome));
  })();
  const totalVis = sessoesVis.reduce((a, x) => a + x.count, 0);

  const agendar = () => {
    const p = pacientes.find((x) => x.id === sched.pid);
    const v = servicos.find((x) => x.id === sched.sid);
    if (!p || !v) return;
    const diaSemana = new Date(sched.data + "T00:00:00").getDay();
    const novo: Fixo = {
      id: `local-${++localSeq}`, pacienteId: p.id, servicoId: v.id, valor: v.preco, diaSemana, hora: sched.hora,
      paciente: { id: p.id, nome: p.nome },
      servico: { id: v.id, nome: v.nome, preco: v.preco, duracaoMin: v.duracaoMin },
    };
    setFixos((f) => [...f, novo]);
    setShowSchedule(false);
    toast(`Sessão de ${p.nome.split(" ")[0]} agendada (${DOW[diaSemana]} · ${sched.hora})`);
  };

  const navBtn = (dir: number, icon: string, label: string) => (
    <button onClick={() => nav(dir)} className="m-hov-bg m-press" title={label} style={s("width:30px;height:30px;border:1px solid var(--border);border-radius:8px;background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink)")}>
      <Icon name={icon} size={15} sw={2.2} />
    </button>
  );

  const inputCss = "width:100%;border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:13.5px;background:var(--surface);color:var(--ink);outline:none;font-family:inherit";

  return (
    <Screen style={s("padding:24px 28px;height:100%")}>
      <div style={s("display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:stretch;height:100%")}>
        {/* CALENDÁRIO */}
        <div style={s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);overflow:hidden;display:flex;flex-direction:column;min-height:0")}>
          {/* toolbar */}
          <div style={s("display:flex;align-items:center;justify-content:space-between;padding:13px 20px;border-bottom:1px solid var(--border);gap:12px;flex-wrap:wrap")}>
            <div style={s("display:flex;align-items:center;gap:12px")}>
              <div style={s("display:flex;align-items:center;gap:4px")}>
                {navBtn(-1, "chevron-left", "Anterior")}
                <button onClick={() => setAnchor(TODAY)} className="m-hov-bg m-press" style={s("padding:0 12px;height:30px;border:1px solid var(--border);border-radius:8px;background:var(--surface);cursor:pointer;font-size:12.5px;font-weight:700;color:var(--ink)")}>Hoje</button>
                {navBtn(1, "chevron-right", "Próximo")}
              </div>
              <span style={s("font-size:15px;font-weight:700;text-transform:capitalize")}>{rangeLabel}</span>
            </div>
            <div style={s("display:flex;align-items:center;gap:10px")}>
              <div style={s("display:flex;background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:3px;gap:2px")}>
                {(["dia", "semana", "duas", "mes"] as const).map((k) => (
                  <button key={k} onClick={() => setView(k)} className="m-press m-focus" style={s(`padding:6px 12px;border:none;border-radius:6px;cursor:pointer;font-size:12.5px;font-weight:700;background:${view === k ? "var(--primary)" : "transparent"};color:${view === k ? "#fff" : "var(--muted)"}`)}>
                    {k === "dia" ? "Dia" : k === "semana" ? "Semana" : k === "duas" ? "2 Semanas" : "Mês"}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSchedule(true)} className="m-hov-primary m-press m-focus" style={s("display:flex;align-items:center;gap:7px;padding:8px 14px;border:none;border-radius:9px;background:var(--primary);color:#fff;font-weight:700;font-size:13px;cursor:pointer")}>
                <Icon name="plus" size={15} sw={2.2} />Agendar
              </button>
            </div>
          </div>

          {isGrid ? (
            <>
              {/* cabeçalho de dias */}
              <div style={s(`display:grid;grid-template-columns:54px repeat(${visDays.length},1fr)`)}>
                <div />
                {visDays.map((d) => {
                  const today = sameDay(d, TODAY);
                  return (
                    <div key={d.toISOString()} style={s("text-align:center;padding:11px 0;border-left:1px solid var(--line)")}>
                      <div style={s("font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.06em")}>{DOW[d.getDay()]}</div>
                      <div className={today ? "m-pop" : undefined} style={s(`font-size:19px;font-weight:800;margin-top:2px;color:${today ? "var(--primary)" : "var(--ink)"}`)}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
              {/* grade de tempo */}
              <div style={s(`position:relative;display:grid;grid-template-columns:54px repeat(${visDays.length},1fr);overflow-y:auto;min-height:0`)}>
                <div style={s("display:flex;flex-direction:column")}>
                  {HOURS.map((h) => <div key={h} style={s("height:56px;font-size:11px;color:var(--muted);text-align:right;padding-right:9px;padding-top:2px;font-weight:600")}>{h}</div>)}
                </div>
                {visDays.map((d) => {
                  const items = apptsForDate(d);
                  return (
                    <div key={d.toISOString()} style={s("position:relative;border-left:1px solid var(--line)")}>
                      {HOURS.map((h) => <div key={h} style={s("height:56px;border-bottom:1px solid var(--line)")} />)}
                      {items.map((ap, i) => (
                        <div key={`${view}-${ap.id}`} onClick={() => toast(`${ap.nome} · ${ap.servicoNome} · ${ap.hora}`)} className={"m-hov-bright m-lift" + (i < REVEAL_CAP ? " m-reveal" : "")} style={{ ...s(`position:absolute;left:4px;right:4px;top:${ap.top}px;height:${ap.height}px;border-radius:8px;padding:5px 8px;cursor:pointer;overflow:hidden`), ...(i < REVEAL_CAP ? s(`animation-delay:${i * REVEAL_STEP}ms`) : {}), background: ap.bg, borderLeft: `3px solid ${ap.dot}` }}>
                          <div style={{ ...s("font-size:12px;font-weight:700;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"), color: ap.fg }}>{ap.nome}</div>
                          <div style={{ ...s("font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"), color: ap.fg, opacity: 0.8 }}>{ap.hora} · {ap.servicoNome}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* grade mês / 2 semanas */}
              <div style={s("display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border)")}>
                {DOW.map((d) => <div key={d} style={s("text-align:center;padding:10px 0;font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.06em")}>{d}</div>)}
              </div>
              <div style={s("display:grid;grid-template-columns:repeat(7,1fr);overflow-y:auto;min-height:0")}>
                {(() => { let rIdx = 0; return visDays.map((d) => {
                  const items = apptsForDate(d);
                  const inScope = view === "duas" || d.getMonth() === anchor.getMonth();
                  const today = sameDay(d, TODAY);
                  return (
                    <div key={d.toISOString()} style={s(`min-height:104px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:6px 7px;display:flex;flex-direction:column;gap:3px;background:${inScope ? "transparent" : "var(--bg)"};opacity:${inScope ? "1" : ".5"}`)}>
                      <div className={today ? "m-pop" : undefined} style={s(`font-size:12.5px;font-weight:700;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;${today ? "background:var(--primary);color:#fff" : "color:var(--ink)"}`)}>{d.getDate()}</div>
                      {items.slice(0, 3).map((ap) => {
                        const gi = rIdx++;
                        return (
                          <div key={`${view}-${ap.id}`} onClick={() => toast(`${ap.nome} · ${ap.servicoNome} · ${ap.hora}`)} className={"m-hov-bright m-lift" + (gi < REVEAL_CAP ? " m-reveal" : "")} style={{ ...s(`border-radius:5px;padding:2px 6px;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis`), ...(gi < REVEAL_CAP ? s(`animation-delay:${gi * REVEAL_STEP}ms`) : {}), background: ap.bg, borderLeft: `3px solid ${ap.dot}` }}>
                            <span style={{ ...s("font-size:10.5px;font-weight:700"), color: ap.fg }}>{ap.hora} {ap.nome}</span>
                          </div>
                        );
                      })}
                      {items.length > 3 && <span style={s("font-size:10.5px;color:var(--muted);font-weight:600;padding-left:3px")}>+{items.length - 3} mais</span>}
                    </div>
                  );
                }); })()}
              </div>
            </>
          )}
        </div>

        {/* SESSÕES POR PACIENTE */}
        <div style={s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);padding:22px;display:flex;flex-direction:column;min-height:0")}>
          <h2 style={s("font-size:16px;font-weight:800;letter-spacing:-.01em")}>Sessões por paciente</h2>
          <span style={s("font-size:12.5px;color:var(--muted);font-weight:600;text-transform:capitalize;margin-top:2px")}>{rangeLabel}</span>
          <div style={s("display:flex;align-items:baseline;gap:8px;margin-top:14px")}>
            <span style={s("font-size:34px;font-weight:800;letter-spacing:-.02em;font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{totalVis}</span>
            <span style={s("font-size:13px;color:var(--muted)")}>{totalVis === 1 ? "sessão no período" : "sessões no período"}</span>
          </div>
          <div style={s("height:1px;background:var(--line);margin:16px 0")} />
          <div style={s("display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:0;flex:1")}>
            {sessoesVis.map((x) => {
              const [ab, af] = avatarClin(x.pid);
              return (
                <div key={x.pid} onClick={() => toast(`${x.nome} — ${x.count} ${x.count === 1 ? "sessão" : "sessões"} no período`)} className="m-hov-bg m-press" style={s("display:flex;align-items:center;gap:11px;padding:6px;border-radius:12px;cursor:pointer")}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, textShadow: "0 1px 2px rgba(30,20,10,.25)", background: `radial-gradient(circle at 28% 20%, ${af} 0%, transparent 60%), radial-gradient(circle at 80% 85%, ${ab} 0%, transparent 58%), ${af}` }}>{initials(x.nome)}</div>
                  <span style={s("font-size:13.5px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{x.nome}</span>
                  <span style={s("font-size:12px;font-weight:700;color:var(--primary-dark);background:var(--primary-soft);padding:3px 10px;border-radius:20px;font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{x.count}</span>
                </div>
              );
            })}
            {!sessoesVis.length && <div style={s("font-size:13px;color:var(--muted);text-align:center;padding:24px 10px")}>Nenhuma sessão neste período.</div>}
          </div>
        </div>
      </div>

      {/* MODAL: agendar sessão (ação local) */}
      {showSchedule && (
        <div onClick={() => setShowSchedule(false)} style={s("position:fixed;inset:0;z-index:9998;background:oklch(0.20 0.03 250 / 0.34);display:flex;align-items:center;justify-content:center;padding:24px")}>
          <div onClick={(e) => e.stopPropagation()} className="m-pop" style={s("width:100%;max-width:420px;background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-pop);padding:24px;display:flex;flex-direction:column;gap:14px")}>
            <div style={s("display:flex;align-items:center;justify-content:space-between")}>
              <h3 style={s("font-size:17px;font-weight:800;letter-spacing:-.01em")}>Agendar sessão</h3>
              <button onClick={() => setShowSchedule(false)} className="m-hov-bg m-press-icon" style={s("width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:9px;background:var(--surface);cursor:pointer;color:var(--muted)")}><Icon name="x" size={16} sw={2} /></button>
            </div>
            <label style={s("display:flex;flex-direction:column;gap:6px")}>
              <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>Paciente</span>
              <select value={sched.pid} onChange={(e) => setSched((v) => ({ ...v, pid: e.target.value }))} style={{ ...s(inputCss + ";cursor:pointer;appearance:none") }}>
                {ativos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <label style={s("display:flex;flex-direction:column;gap:6px")}>
              <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>Serviço</span>
              <select value={sched.sid} onChange={(e) => setSched((v) => ({ ...v, sid: e.target.value }))} style={{ ...s(inputCss + ";cursor:pointer;appearance:none") }}>
                {svcAtivos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </label>
            <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:12px")}>
              <label style={s("display:flex;flex-direction:column;gap:6px")}>
                <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>Data</span>
                <input type="date" value={sched.data} onChange={(e) => setSched((v) => ({ ...v, data: e.target.value }))} style={{ ...s(inputCss) }} />
              </label>
              <label style={s("display:flex;flex-direction:column;gap:6px")}>
                <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>Hora</span>
                <input type="time" value={sched.hora} onChange={(e) => setSched((v) => ({ ...v, hora: e.target.value }))} style={{ ...s(inputCss) }} />
              </label>
            </div>
            <div style={s("display:flex;gap:10px;margin-top:4px")}>
              <button onClick={() => setShowSchedule(false)} className="m-hov-bg m-press m-focus" style={s("flex:1;padding:11px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--ink);font-weight:700;font-size:14px;cursor:pointer")}>Cancelar</button>
              <button onClick={agendar} className="m-hov-primary m-press m-focus" style={s("flex:1;padding:11px;border:none;border-radius:10px;background:var(--primary);color:#fff;font-weight:700;font-size:14px;cursor:pointer")}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}

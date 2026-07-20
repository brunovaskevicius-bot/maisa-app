"use client";
import { useState } from "react";
import { s, Icon, Monogram, Screen, toast } from "@/lib/ui";
import { useAdmin } from "@/lib/adminConfig";
import { useIsMobile } from "@/lib/useIsMobile";
import type { AgFixo } from "@/lib/mock";

type View = "dia" | "semana" | "duas" | "mes";
type St = AgFixo["status"];

const DOW_G = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]; // por getDay()
const DOW_H = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]; // cabeçalho mês
const MES =["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const HOURS = Array.from({ length: 12 }, (_, i) => ({ h: 9 + i, label: `${String(9 + i).padStart(2, "0")}:00` }));
const ROW = 56; // px por hora
const H0 = 9; // primeira hora
const REVEAL_CAP = 12; // teto de itens com stagger; além disso entram sem classe
const REVEAL_STEP = 45; // ms por índice — efeito "construindo a agenda"

const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmtHora = (start: number) => { const h = Math.floor(start); const m = Math.round((start - h) * 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };

const STB: Record<St, { bg: string; ac: string; fg: string }> = {
  confirmado: { bg: "var(--primary-soft)", ac: "var(--primary)", fg: "var(--primary-dark)" },
  aguardando: { bg: "var(--warm-soft)", ac: "var(--warn)", fg: "var(--warn)" },
  concluido: { bg: "var(--success-soft)", ac: "var(--success)", fg: "var(--success)" },
  cancelado: { bg: "var(--danger-soft)", ac: "var(--danger)", fg: "var(--danger)" },
};

const TODAY = new Date(2026, 6, 17); // sex, 17 de julho

export default function Agenda() {
  const { data, t } = useAdmin();
  const { agendaFixa, nomeDoProfissional } = data;
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>("semana");
  const [anchor, setAnchor] = useState<Date>(TODAY);

  // effView = view nos dois. O mobile respeita o seletor de visão (igual ao Calendário):
  // visão-dia = lista-agenda de 1 dia (com faixa de dias); visões maiores = seções por dia.
  const effView: View = view;

  const nav = (dir: number) =>
    setAnchor((a) => (effView === "dia" ? addDays(a, dir) : effView === "semana" ? addDays(a, dir * 7) : effView === "duas" ? addDays(a, dir * 14) : addMonths(a, dir)));

  let visDays: Date[] = [];
  if (effView === "dia") visDays = [anchor];
  else if (effView === "semana") { const w = startOfWeek(anchor); visDays = Array.from({ length: 7 }, (_, i) => addDays(w, i)); }
  else if (effView === "duas") { const w = startOfWeek(anchor); visDays = Array.from({ length: 14 }, (_, i) => addDays(w, i)); }
  else { const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const w = startOfWeek(first); visDays = Array.from({ length: 42 }, (_, i) => addDays(w, i)); }

  const isGrid = effView === "dia" || effView === "semana";

  const apptsForDate = (date: Date) =>
    agendaFixa
      .filter((a) => a.dia === date.getDay())
      .map((a) => ({ ...a, hora: fmtHora(a.start), top: (a.start - H0) * ROW, height: (a.dur / 60) * ROW, c: STB[a.status] }))
      .sort((a, b) => a.start - b.start);

  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  let rangeLabel: string;
  if (effView === "dia") rangeLabel = `${["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][anchor.getDay()]}, ${anchor.getDate()} de ${MES[anchor.getMonth()]}`;
  else if (effView === "mes") rangeLabel = `${MES[anchor.getMonth()]} de ${anchor.getFullYear()}`;
  else { const a = visDays[0], b = visDays[visDays.length - 1]; rangeLabel = `${a.getDate()}/${a.getMonth() + 1} – ${b.getDate()}/${b.getMonth() + 1}`; }

  // atendimentos por barbeiro no período visível
  const tally: Record<string, number> = {};
  for (const d of visDays) for (const ap of apptsForDate(d)) tally[ap.barbeiroId] = (tally[ap.barbeiroId] || 0) + 1;
  const porBarbeiro = Object.entries(tally).map(([id, count]) => ({ id, nome: nomeDoProfissional(id), count })).sort((a, b) => b.count - a.count);
  const total = porBarbeiro.reduce((a, x) => a + x.count, 0);

  const navBtn = (dir: number, icon: string, label: string) => (
    <button onClick={() => nav(dir)} className="m-hov-bg m-press" title={label} style={s("width:30px;height:30px;border:1px solid var(--border);border-radius:8px;background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink)")}>
      <Icon name={icon} size={15} sw={2.2} />
    </button>
  );

  return (
    <Screen style={isMobile ? s("padding:16px") : s("padding:24px 28px;height:100%")}>
      <div style={isMobile ? s("display:flex;flex-direction:column;gap:16px") : s("display:grid;grid-template-columns:var(--rail-side);gap:20px;align-items:stretch;height:100%")}>
        {/* CALENDÁRIO */}
        <div style={s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);overflow:hidden;display:flex;flex-direction:column;min-height:0")}>
          {isMobile ? (
            <>
              {/* toolbar MOBILE — igual ao Calendário: nav de período + seletor de visão + Hoje/Agendar + faixa de dias */}
              <div style={s("padding:14px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:12px")}>
                <div style={s("display:flex;align-items:center;gap:10px")}>
                  <button onClick={() => nav(-1)} className="m-hov-bg m-press" title="Anterior" aria-label="Anterior" style={s("width:44px;height:44px;flex-shrink:0;border:1px solid var(--border);border-radius:12px;background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink)")}>
                    <Icon name="chevron-left" size={18} sw={2.2} />
                  </button>
                  <div style={s("flex:1;min-width:0;text-align:center;font-size:15.5px;font-weight:800;text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{cap(rangeLabel)}</div>
                  <button onClick={() => nav(1)} className="m-hov-bg m-press" title="Próximo" aria-label="Próximo" style={s("width:44px;height:44px;flex-shrink:0;border:1px solid var(--border);border-radius:12px;background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink)")}>
                    <Icon name="chevron-right" size={18} sw={2.2} />
                  </button>
                </div>
                <div style={s("display:flex;background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:3px;gap:2px;overflow-x:auto")}>
                  {(["dia", "semana", "duas", "mes"] as const).map((k) => (
                    <button key={k} onClick={() => setView(k)} className="m-press m-focus" style={s(`flex:1 0 auto;padding:9px 12px;border:none;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700;white-space:nowrap;background:${view === k ? "var(--primary)" : "transparent"};color:${view === k ? "#fff" : "var(--muted)"}`)}>
                      {k === "dia" ? "Dia" : k === "semana" ? "Semana" : k === "duas" ? "2 Semanas" : "Mês"}
                    </button>
                  ))}
                </div>
                <div style={s("display:flex;gap:10px")}>
                  <button onClick={() => setAnchor(TODAY)} className="m-hov-bg m-press m-focus" style={s("flex:0 0 auto;padding:0 18px;height:46px;border:1px solid var(--border);border-radius:12px;background:var(--surface);cursor:pointer;font-size:14px;font-weight:700;color:var(--ink)")}>Hoje</button>
                  <button onClick={() => toast("Novo agendamento em breve ✨")} className="m-hov-primary m-press m-focus" style={s("flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border:none;border-radius:12px;background:var(--primary);color:#fff;font-weight:700;font-size:14px;cursor:pointer")}>
                    <Icon name="plus" size={17} sw={2.2} />Agendar
                  </button>
                </div>
                {view === "dia" && (
                  <div style={s("display:flex;gap:6px")}>
                    {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((d) => {
                      const sel = sameDay(d, anchor);
                      const today = sameDay(d, TODAY);
                      return (
                        <button key={d.toISOString()} onClick={() => setAnchor(d)} className="m-press" aria-label={`${DOW_G[d.getDay()]} ${d.getDate()}`} style={s(`flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border:1px solid ${sel ? "var(--primary)" : "var(--border)"};border-radius:12px;background:${sel ? "var(--primary)" : "var(--surface)"};cursor:pointer`)}>
                          <span style={s(`font-size:10px;font-weight:800;letter-spacing:.03em;color:${sel ? "rgba(255,255,255,.85)" : "var(--muted)"}`)}>{DOW_G[d.getDay()]}</span>
                          <span style={s(`font-size:15px;font-weight:800;color:${sel ? "#fff" : today ? "var(--primary)" : "var(--ink)"}`)}>{d.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* lista-agenda (visão-dia = 1 dia; visões maiores = seções por dia) */}
              <div style={s("padding:16px 14px;display:flex;flex-direction:column;gap:8px")}>
                {(() => {
                  let ri = 0;
                  const row = (ap: ReturnType<typeof apptsForDate>[number]) => {
                    const i = ri++;
                    const rev = i < REVEAL_CAP;
                    return (
                      <div key={`m-${ap.id}-${i}`} onClick={() => toast(`${ap.cliente} · ${ap.hora}`)} className={"m-press" + (rev ? " m-reveal" : "")} style={{ ...s("display:flex;gap:12px;align-items:stretch;cursor:pointer"), ...(rev ? s(`animation-delay:${i * REVEAL_STEP}ms`) : {}) }}>
                        <div style={s("width:46px;flex-shrink:0;text-align:right;font-size:12.5px;font-weight:700;color:var(--muted);font-family:var(--font-mono);font-variant-numeric:tabular-nums;padding-top:15px")}>{ap.hora}</div>
                        <div className="m-hov-bright m-lift" style={{ ...s("flex:1;min-width:0;border-radius:12px;padding:11px 14px;min-height:54px;display:flex;flex-direction:column;justify-content:center;gap:3px"), background: ap.c.bg, borderLeft: `3px solid ${ap.c.ac}` }}>
                          <div style={{ ...s("font-size:14px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"), color: ap.c.fg }}>{ap.cliente}</div>
                          <div style={{ ...s("font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"), color: ap.c.fg, opacity: 0.8 }}>{ap.servico} · {nomeDoProfissional(ap.barbeiroId).split(" ")[0]}</div>
                        </div>
                      </div>
                    );
                  };
                  const emptyBox = (msg: string, sub: string) => (
                    <div style={s("display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:36px 16px;color:var(--muted)")}>
                      <span style={s("width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--primary-soft);color:var(--primary-dark)")}><Icon name="calendar" size={22} /></span>
                      <span style={s("font-size:14px;font-weight:700;color:var(--ink)")}>{msg}</span>
                      <span style={s("font-size:12.5px")}>{sub}</span>
                    </div>
                  );
                  if (view === "dia") {
                    const items = apptsForDate(anchor);
                    return items.length ? items.map(row) : emptyBox("Nenhum atendimento neste dia", "Toque em Agendar para incluir um horário.");
                  }
                  const groups = visDays.map((d) => ({ d, items: apptsForDate(d) })).filter((g) => g.items.length > 0);
                  if (!groups.length) return emptyBox("Nenhum atendimento neste período", "Navegue entre os períodos ou toque em Agendar.");
                  return groups.map((g, gi) => {
                    const today = sameDay(g.d, TODAY);
                    return (
                      <div key={g.d.toISOString()} style={s(`display:flex;flex-direction:column;gap:8px;${gi > 0 ? "margin-top:14px" : ""}`)}>
                        <div style={s("display:flex;align-items:baseline;gap:8px;padding:0 2px 2px")}>
                          <span style={s("font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--muted)")}>{DOW_G[g.d.getDay()]}</span>
                          <span style={s(`font-size:15px;font-weight:800;color:${today ? "var(--primary)" : "var(--ink)"}`)}>{g.d.getDate()} de {MES[g.d.getMonth()]}</span>
                          <span style={s("margin-left:auto;font-size:11.5px;font-weight:700;color:var(--muted)")}>{g.items.length} {g.items.length === 1 ? "atend." : "atends."}</span>
                        </div>
                        {g.items.map(row)}
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
          <>
          {/* toolbar */}
          <div style={s("display:flex;align-items:center;justify-content:space-between;padding:13px 20px;border-bottom:1px solid var(--border);gap:12px;flex-wrap:wrap")}>
            <div style={s("display:flex;align-items:center;gap:12px")}>
              <div style={s("display:flex;align-items:center;gap:4px")}>
                {navBtn(-1, "chevron-left", "Anterior")}
                <button onClick={() => setAnchor(TODAY)} className="m-hov-bg m-press" style={s("padding:0 12px;height:30px;border:1px solid var(--border);border-radius:8px;background:var(--surface);cursor:pointer;font-size:12.5px;font-weight:700;color:var(--ink)")}>Hoje</button>
                {navBtn(1, "chevron-right", "Próximo")}
              </div>
              <span style={s("font-size:15px;font-weight:700;text-transform:capitalize")}>{cap(rangeLabel)}</span>
            </div>
            <div style={s("display:flex;align-items:center;gap:10px")}>
              <div style={s("display:flex;background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:3px;gap:2px")}>
                {(["dia", "semana", "duas", "mes"] as const).map((k) => (
                  <button key={k} onClick={() => setView(k)} className="m-press m-focus" style={s(`padding:6px 12px;border:none;border-radius:6px;cursor:pointer;font-size:12.5px;font-weight:700;background:${view === k ? "var(--primary)" : "transparent"};color:${view === k ? "#fff" : "var(--muted)"}`)}>
                    {k === "dia" ? "Dia" : k === "semana" ? "Semana" : k === "duas" ? "2 Semanas" : "Mês"}
                  </button>
                ))}
              </div>
              <button onClick={() => toast("Novo agendamento em breve ✨")} className="m-hov-primary m-press m-focus" style={s("display:flex;align-items:center;gap:7px;padding:8px 14px;border:none;border-radius:9px;background:var(--primary);color:#fff;font-weight:700;font-size:13px;cursor:pointer")}>
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
                      <div style={s("font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.06em")}>{DOW_G[d.getDay()]}</div>
                      <div className={today ? "m-pop" : undefined} style={s(`font-size:19px;font-weight:800;margin-top:2px;color:${today ? "var(--primary)" : "var(--ink)"}`)}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
              {/* grade de tempo */}
              <div style={s(`position:relative;display:grid;grid-template-columns:54px repeat(${visDays.length},1fr);overflow-y:auto;min-height:0`)}>
                <div style={s("display:flex;flex-direction:column")}>
                  {HOURS.map((h) => <div key={h.label} style={s("height:56px;font-size:11px;color:var(--muted);text-align:right;padding-right:9px;padding-top:2px;font-weight:600")}>{h.label}</div>)}
                </div>
                {visDays.map((d) => {
                  const items = apptsForDate(d);
                  return (
                    <div key={d.toISOString()} style={s("position:relative;border-left:1px solid var(--line)")}>
                      {HOURS.map((h) => <div key={h.label} style={s("height:56px;border-bottom:1px solid var(--line)")} />)}
                      {items.map((ap, i) => (
                        <div key={`${view}-${ap.id}`} onClick={() => toast(`${ap.cliente} · ${ap.hora}`)} className={"m-hov-bright m-lift" + (i < REVEAL_CAP ? " m-reveal" : "")} style={{ ...s(`position:absolute;left:4px;right:4px;top:${ap.top}px;height:${ap.height}px;border-radius:8px;padding:5px 8px;cursor:pointer;overflow:hidden`), ...(i < REVEAL_CAP ? s(`animation-delay:${i * REVEAL_STEP}ms`) : {}), background: ap.c.bg, borderLeft: `3px solid ${ap.c.ac}` }}>
                          <div style={{ ...s("font-size:12px;font-weight:700;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"), color: ap.c.fg }}>{ap.cliente}</div>
                          <div style={{ ...s("font-size:10.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"), color: ap.c.fg }}>{ap.hora} · {nomeDoProfissional(ap.barbeiroId).split(" ")[0]}</div>
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
                {DOW_H.map((d) => <div key={d} style={s("text-align:center;padding:10px 0;font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.06em")}>{d}</div>)}
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
                        <div key={`${view}-${ap.id}`} onClick={() => toast(`${ap.cliente} · ${ap.hora}`)} className={"m-hov-bright m-lift" + (gi < REVEAL_CAP ? " m-reveal" : "")} style={{ ...s(`border-radius:5px;padding:2px 6px;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis`), ...(gi < REVEAL_CAP ? s(`animation-delay:${gi * REVEAL_STEP}ms`) : {}), background: ap.c.bg, borderLeft: `3px solid ${ap.c.ac}` }}>
                          <span style={{ ...s("font-size:10.5px;font-weight:700"), color: ap.c.fg }}>{ap.hora} {ap.cliente}</span>
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
          </>
          )}
        </div>

        {/* ATENDIMENTOS POR BARBEIRO */}
        <div style={isMobile ? s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);padding:18px;display:flex;flex-direction:column") : s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);padding:22px;display:flex;flex-direction:column;min-height:0")}>
          <h2 style={s("font-size:16px;font-weight:800;letter-spacing:-.01em")}>Atendimentos por {t.profissionalPlur}</h2>
          <span style={s("font-size:12.5px;color:var(--muted);font-weight:600;text-transform:capitalize;margin-top:2px")}>{cap(rangeLabel)}</span>
          <div style={s("display:flex;align-items:baseline;gap:8px;margin-top:14px")}>
            <span style={s("font-size:34px;font-weight:800;letter-spacing:-.02em;font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{total}</span>
            <span style={s("font-size:13px;color:var(--muted)")}>{total === 1 ? "atendimento no período" : "atendimentos no período"}</span>
          </div>
          <div style={s("height:1px;background:var(--line);margin:16px 0")} />
          <div style={isMobile ? s("display:flex;flex-direction:column;gap:10px") : s("display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:0;flex:1")}>
            {porBarbeiro.map((x) => (
              <div key={x.id} className="m-hov-bg" style={s("display:flex;align-items:center;gap:11px;padding:6px;border-radius:12px")}>
                <Monogram name={x.nome} id={x.id} size={34} radius={11} />
                <span style={s("font-size:13.5px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{x.nome}</span>
                <span style={s("font-size:12px;font-weight:700;color:var(--primary-dark);background:var(--primary-soft);padding:3px 10px;border-radius:20px;font-family:var(--font-mono);font-variant-numeric:tabular-nums")}>{x.count}</span>
              </div>
            ))}
            {!porBarbeiro.length && <div style={s("font-size:13px;color:var(--muted);text-align:center;padding:24px 10px")}>Nenhum atendimento neste período.</div>}
          </div>
        </div>
      </div>
    </Screen>
  );
}

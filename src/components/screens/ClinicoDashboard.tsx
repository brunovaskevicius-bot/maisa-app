"use client";
import { Screen, initials, toast, Icon, s, fmtK } from "@/lib/ui";
import { pacientes, fixos, avatarClin, kpisClinico, periodoLabel } from "@/lib/clinicoMock";

/* ───────── helpers portados do Psico (adaptados ao clinicoMock) ───────── */
// cor por serviço da agenda (s1–s4) — dot usado no calendário; aqui só precisamos do avatar.
const APPT_COLORS: Record<string, string[]> = {
  s1: ["var(--primary-soft)", "var(--primary-dark)", "var(--primary)"],
  s2: ["#F5E6C8", "#8A6220", "var(--warm)"],
  s3: ["#E7EAD8", "#5E6B3A", "#7C8C4A"],
  s4: ["#F3E0D6", "#A85A3C", "#C67B5C"],
};

const DOW_BY_GETDAY = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const DOW_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// "hoje" conceitual fixo (SSR-safe, igual ao Psico): junho/2026.
const TODAY = new Date(2026, 5, 17);

// ocorrências de um dia, geradas da agenda FIXA (recorrência semanal).
const apptsForDate = (date: Date) =>
  fixos
    .filter((f) => f.diaSemana === date.getDay())
    .map((f) => {
      const [hh, mm] = f.hora.split(":").map(Number);
      const start = hh + (mm >= 30 ? 0.5 : 0);
      const c = APPT_COLORS[f.servicoId] || APPT_COLORS.s1;
      return {
        id: `${f.id}-${date.getDate()}`,
        start,
        dot: c[2],
        nome: f.paciente.nome,
        servicoNome: f.servico.nome,
        hora: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        pid: f.pacienteId,
      };
    })
    .sort((a, b) => a.start - b.start);

export default function ClinicoDashboard() {
  // próximas sessões nos próximos 14 dias a partir de "hoje".
  const proximas = (() => {
    const out: Array<{ id: string; hora: string; dot: string; nome: string; servicoNome: string; pid: string; _t: number }> = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(TODAY, i);
      for (const o of apptsForDate(d)) out.push({ ...o, _t: d.getTime() + o.start * 3600000 });
    }
    return out.sort((a, b) => a._t - b._t).slice(0, 6);
  })();

  const next = proximas[0];
  const nextP = next ? pacientes.find((p) => p.id === next.pid) : null;
  const nd = next ? new Date(next._t) : null;
  const dayLabel = !nd ? "" : sameDay(nd, TODAY) ? "Hoje" : sameDay(nd, addDays(TODAY, 1)) ? "Amanhã" : `${DOW_BY_GETDAY[nd.getDay()]}, ${nd.getDate()} de ${MONTHS[nd.getMonth()]}`;
  const [avBg, avFg] = next ? avatarClin(next.pid) : ["var(--primary-soft)", "var(--primary-dark)"];

  // sessões de HOJE (mini-lista serena da faixa "hoje").
  const hoje = apptsForDate(TODAY);
  const dataHoje = `${DOW_FULL[TODAY.getDay()]}, ${TODAY.getDate()} de ${MONTHS[TODAY.getMonth()]}`;

  const k = kpisClinico;

  // 4 métricas-âncora — números em --ink (AA), cor só no chip de ícone.
  const metricas: Array<{ label: string; value: React.ReactNode; sub: string; icon: string; bg: string; fg: string }> = [
    { label: "Sessões na semana", value: k.sessoesSemana, sub: "agenda fixa · seg a sex", icon: "calendar-check", bg: "var(--primary-soft)", fg: "var(--primary-dark)" },
    { label: "Faturamento do mês", value: fmtK(k.faturamentoMes), sub: periodoLabel, icon: "trending-up", bg: "var(--success-soft)", fg: "var(--success)" },
    { label: "Pacientes ativos", value: k.pacientesAtivos, sub: `${k.novosPacientesMes} novo este mês`, icon: "user", bg: "var(--primary-soft)", fg: "var(--primary-dark)" },
    { label: "NFs pendentes", value: k.notasPendentes, sub: `${k.notasEmitidas} já emitidas`, icon: "receipt", bg: "var(--warm-soft)", fg: "var(--warn)" },
  ];

  const enviarAviso = () => {
    if (!nextP || !next) return;
    const num = (nextP.telefone || "").replace(/\D/g, "");
    const full = num.startsWith("55") ? num : `55${num}`;
    const primeiro = next.nome.split(" ")[0];
    const msg = encodeURIComponent(`Olá ${primeiro}! Passando para confirmar a sua ${next.servicoNome.toLowerCase()} ${dayLabel.toLowerCase()} às ${next.hora}. Qualquer coisa, é só me avisar por aqui.`);
    if (typeof window !== "undefined") window.open(`https://wa.me/${full}?text=${msg}`, "_blank", "noopener,noreferrer");
    toast(`Aviso preparado para ${primeiro}`);
  };
  const verDetalhes = () => { if (next) toast(`Abrindo agendamento de ${next.nome.split(" ")[0]}`); };
  const abrirAgendamento = (nome: string) => toast(`Abrindo agendamento de ${nome.split(" ")[0]}`);
  const abrirCalendario = () => toast("Abrindo calendário");
  const emitirNfs = () => toast(`Preparando ${k.notasPendentes} notas pendentes`);

  const glass: React.CSSProperties = {
    position: "relative", width: "100%", maxWidth: 560, textAlign: "center", padding: "48px 44px", borderRadius: 30,
    background: "rgba(255,255,255,0.55)", backdropFilter: "blur(26px) saturate(1.35)", WebkitBackdropFilter: "blur(26px) saturate(1.35)",
    border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 28px 80px oklch(30% 0.03 60 / 0.14), inset 0 1px 0 rgba(255,255,255,0.7)",
    animation: "mrise .45s var(--ease-out) both",
  };
  const kicker: React.CSSProperties = { marginTop: 22, fontSize: 12.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--primary-dark)" };
  const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 22px", border: "none", borderRadius: 999, background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" };
  // superfície SOFT dos blocos de apoio: tinta translúcida + sombra suave (sem vidro/backdrop — o vidro é só do hero).
  const soft = "background:rgba(255,255,255,0.72);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow-card)";

  return (
    <>
    {/* Brilho de fundo: camada fixa no viewport, atras de tudo (zIndex -1).
        Sidebar e topbar navy sao opacas e cobrem as bordas de cima/esquerda,
        entao nao da pra ver onde o brilho acaba. Fica fora do Screen de
        proposito: o Screen tem transform (.m-enter) e prenderia o fixed. */}
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", background: "radial-gradient(62% 58% at 32% 15%, var(--primary-soft) 0%, transparent 60%), radial-gradient(54% 54% at 90% 92%, var(--warm-soft) 0%, transparent 58%)" }} />
    <Screen style={{ padding: 0 }}>
    <div style={{ position: "relative", minHeight: "calc(100vh - 120px)", display: "flex", flexDirection: "column", alignItems: "center", padding: "clamp(28px, 5vh, 60px) 24px 60px" }}>
      <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 18 }}>

        {/* eyebrow calmo — orienta sem competir com o hero */}
        <div style={{ textAlign: "center", marginBottom: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Olá, Carla</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{dataHoje}</div>
        </div>

        {/* ───────── HERO de vidro — peça central: próxima sessão + ações ───────── */}
        <div style={glass}>
          {next ? (
            <>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: avBg, color: avFg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 29, margin: "0 auto", boxShadow: "0 8px 24px oklch(30% 0.03 60 / 0.12)" }}>{initials(next.nome)}</div>
              <div style={kicker}>Próximo na agenda</div>
              <h1 style={{ marginTop: 12, fontSize: 32, fontWeight: 700, lineHeight: 1.18, letterSpacing: "-.02em", color: "var(--ink)" }}>{next.servicoNome} com <span style={{ color: "var(--primary)" }}>{next.nome}</span></h1>
              <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 9, fontSize: 18, fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <span style={{ color: "var(--muted)" }}>{dayLabel}</span>
                <span style={{ color: "var(--border)" }}>·</span>
                <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--ink)" }}>{next.hora}</span>
              </div>
              <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={enviarAviso} className="m-hov-primary m-press m-focus" style={primaryBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>
                  Mandar aviso via WhatsApp
                </button>
                <button onClick={verDetalhes} className="m-hov-bg m-press m-focus" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 22px", borderRadius: 999, border: "1px solid var(--border)", background: "rgba(255,255,255,0.6)", color: "var(--ink)", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>
                  Ver detalhes do agendamento
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: "16px 0" }}>
              <div style={{ width: 84, height: 84, borderRadius: "50%", background: "var(--primary-soft)", color: "var(--primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3.2" /><path d="M3 9.5h18" /><path d="M8 3v3.4M16 3v3.4" /><circle cx="12" cy="14.8" r="1.7" /></svg>
              </div>
              <div style={kicker}>Próximo na agenda</div>
              <h1 style={{ marginTop: 12, fontSize: 30, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-.02em", color: "var(--ink)" }}>Nenhuma sessão à vista</h1>
              <p style={{ marginTop: 10, fontSize: 15, color: "var(--muted)" }}>Sua agenda está livre por aqui.</p>
              <div style={{ marginTop: 30 }}>
                <button onClick={abrirCalendario} className="m-hov-primary m-press m-focus" style={primaryBtn}>Abrir calendário</button>
              </div>
            </div>
          )}
        </div>

        {/* ───────── Faixa "HOJE" — mini-lista serena das sessões do dia ───────── */}
        <div className="m-reveal" style={{ ...s(soft), padding: "18px 16px 12px", animationDelay: "60ms" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, padding: "0 6px", marginBottom: hoje.length ? 6 : 0 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em", color: "var(--ink)" }}>Hoje</h2>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{dataHoje}</p>
            </div>
            <span style={s(`display:inline-flex;align-items:center;font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:20px;background:var(--primary-soft);color:var(--primary-dark)`)}>
              {hoje.length} {hoje.length === 1 ? "sessão" : "sessões"}
            </span>
          </div>
          {hoje.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {hoje.map((o) => {
                const isNext = next ? o.id === next.id : false;
                return (
                  <button key={o.id} onClick={() => abrirAgendamento(o.nome)} className="m-hov-bg m-press m-focus"
                    style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", padding: "11px 12px", borderRadius: 14, border: "1px solid transparent", background: isNext ? "var(--primary-soft)" : "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14, color: "var(--ink)", width: 46, flexShrink: 0 }}>{o.hora}</span>
                    <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: o.dot, flexShrink: 0 }} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.nome}</span>
                      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{o.servicoNome}</span>
                    </span>
                    {isNext && (
                      <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--primary-dark)", background: "var(--surface)", padding: "4px 9px", borderRadius: 999 }}>Próxima</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ padding: "18px 6px 14px", textAlign: "center", fontSize: 13.5, color: "var(--muted)" }}>Nenhuma sessão hoje — a agenda está livre.</p>
          )}
        </div>

        {/* ───────── Métricas-âncora — tiles soft, glanceáveis (não card-grid genérico) ───────── */}
        <div className="m-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, animationDelay: "120ms" }}>
          {metricas.map((m) => (
            <div key={m.label} style={{ ...s(soft), padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", lineHeight: 1.25 }}>{m.label}</span>
                <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.bg, color: m.fg }}><Icon name={m.icon} size={16} /></span>
              </div>
              <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "-.02em", lineHeight: 1, color: "var(--ink)" }}>{m.value}</span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.sub}</span>
            </div>
          ))}
        </div>

        {/* ───────── Ações rápidas contextuais — no mesmo idioma calmo ───────── */}
        <div className="m-reveal" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", animationDelay: "180ms" }}>
          <button onClick={abrirCalendario} className="m-hov-bg m-press m-focus" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 20px", borderRadius: 999, border: "1px solid var(--border)", background: "rgba(255,255,255,0.72)", color: "var(--ink)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="calendar" size={17} sw={2} />
            Ver agenda completa
          </button>
          <button onClick={emitirNfs} className="m-hov-prim-border m-press m-focus" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 20px", borderRadius: 999, border: "1px solid var(--primary-soft)", background: "var(--primary-soft)", color: "var(--primary-dark)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="receipt" size={17} sw={2} />
            Emitir NFs pendentes ({k.notasPendentes})
          </button>
        </div>

      </div>
    </div>
    </Screen>
    </>
  );
}

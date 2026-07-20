"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { s, Icon } from "@/lib/ui";

/* ============================================================
 * Gráficos e cards de métrica — construção adaptada de duas
 * referências (progress metric card + circular "TOTAL"), com a
 * identidade visual do MAISA (tokens + SVG + CSS, sem libs).
 * ============================================================ */

export type Pt = { value: number; label: string };
type View = "linha" | "barra";
type Accent = "primary" | "success" | "danger" | "warm";

const ACC: Record<Accent, { stroke: string; text: string; wash: string }> = {
  primary: { stroke: "var(--primary)", text: "var(--primary-dark)", wash: "oklch(0.50 0.145 248 / 0.14)" },
  success: { stroke: "var(--success)", text: "var(--success)", wash: "oklch(0.52 0.11 150 / 0.14)" },
  danger: { stroke: "var(--danger)", text: "var(--danger)", wash: "oklch(0.55 0.18 27 / 0.13)" },
  warm: { stroke: "var(--warn)", text: "var(--warn)", wash: "oklch(0.83 0.14 82 / 0.18)" },
};

export const formatCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1000) return (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
  return n.toLocaleString("pt-BR");
};
const fmtNum = (n: number) => n.toLocaleString("pt-BR");

/* alternativa textual p/ leitor de tela — INLINE (não acopla a classe global de outro agente) */
const SR_ONLY = s("position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap");

/* barras: sobem via scaleY (origin bottom) em stagger — só na montagem (troca p/ view "barra").
   startDelay entra na cascata "construindo" (só no 1º load; nos toggles vem 0) */
function Bars({ data, color, min, span, X, W, H, padX, padTop, padBot, hover, startDelay = 0 }: {
  data: Pt[]; color: string; min: number; span: number; X: (i: number) => number;
  W: number; H: number; padX: number; padTop: number; padBot: number; hover: number | null; startDelay?: number;
}) {
  const [inn, setInn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setInn(true), Math.max(0, startDelay) + 20);
    return () => window.clearTimeout(t);
  }, []);
  const bw = ((W - padX * 2) / data.length) * 0.56;
  return (
    <>
      {data.map((d, i) => {
        const bh = Math.max(2, ((d.value - min) / span) * (H - padTop - padBot));
        return (
          <rect key={i} x={X(i) - bw / 2} y={H - padBot - bh} width={bw} height={bh} rx="2.5" fill={color}
            style={{
              transformBox: "fill-box", transformOrigin: "center bottom",
              transform: `scaleY(${inn ? 1 : 0})`, opacity: hover === i ? 1 : 0.5,
              transition: `transform var(--dur-slow) var(--ease-out) ${Math.min(i, 7) * 40}ms, opacity var(--dur-fast) var(--ease-out)`,
            }} />
        );
      })}
    </>
  );
}

/* ---------- gráfico SVG (linha/área ou barra) + hover ---------- */
function Chart({ data, color, view, drawDelay = 0 }: { data: Pt[]; color: string; view: View; drawDelay?: number }) {
  const gid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  // "ready" = o atraso da cascata de entrada já passou. Aplica o drawDelay SÓ no 1º load;
  // uma vez pronto, permanece pronto → trocas de visão (barra↔linha) desenham na hora (sem ficar em branco).
  const [ready, setReady] = useState(drawDelay <= 0);
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), drawDelay);
    return () => window.clearTimeout(t);
  }, []);
  const W = 360, H = 150, padX = 8, padTop = 16, padBot = 10;
  const n = data.length;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const X = (i: number) => padX + (n <= 1 ? 0 : (i / (n - 1)) * (W - padX * 2));
  const Y = (v: number) => padTop + (1 - (v - min) / span) * (H - padTop - padBot);

  let line = `M ${X(0)},${Y(vals[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const cx = (X(i) + X(i + 1)) / 2;
    line += ` C ${cx},${Y(vals[i])} ${cx},${Y(vals[i + 1])} ${X(i + 1)},${Y(vals[i + 1])}`;
  }
  const area = `${line} L ${X(n - 1)},${H - padBot + 2} L ${X(0)},${H - padBot + 2} Z`;

  const onMove = (e: React.MouseEvent) => {
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rx * (n - 1)))));
  };

  return (
    <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={s("position:relative;width:100%;height:100%")}>
      <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {view === "linha" ? (
          <>
            {/* área: fica invisível durante a cascata; quando "ready", faz o fade (sem delay na string → não reinicia em hover/troca de período) */}
            <path d={area} fill={`url(#g${gid})`} style={ready ? { animation: `mfade 700ms var(--ease-out) both` } : { opacity: 0 }} />
            {/* linha: escondida (dashoffset cheio) até "ready"; então desenha em 700ms. Sem delay na string → hover/troca de período não reinicia; troca de visão desenha na hora */}
            <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              pathLength={1} style={ready
                ? ({ ["--len"]: 1, strokeDasharray: 1, animation: `mdraw 700ms var(--ease-out) both` } as React.CSSProperties)
                : ({ ["--len"]: 1, strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 } as React.CSSProperties)} />
          </>
        ) : (
          <Bars data={data} color={color} min={min} span={span} X={X} W={W} H={H} padX={padX} padTop={padTop} padBot={padBot} hover={hover} startDelay={ready ? 0 : drawDelay} />
        )}
      </svg>
      {/* indicador de hover (HTML — evita distorção do SVG esticado) */}
      {hover != null && view === "linha" && (
        <>
          <div style={{ ...s("position:absolute;top:0;bottom:0;width:1px;background:currentColor;opacity:.4;pointer-events:none"), left: `${(X(hover) / W) * 100}%`, color }} />
          <div style={{ ...s("position:absolute;width:9px;height:9px;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 0 2px var(--surface)"), left: `${(X(hover) / W) * 100}%`, top: `${(Y(vals[hover]) / H) * 100}%`, background: color } as React.CSSProperties} />
        </>
      )}
      {hover != null && (
        <div style={{ ...s("position:absolute;top:2px;pointer-events:none;transform:translateX(-50%);background:var(--ink);color:var(--surface);font-size:11px;font-weight:700;padding:4px 9px;border-radius:8px;white-space:nowrap;box-shadow:var(--shadow-pop);z-index:3"), left: `${Math.min(88, Math.max(12, (X(hover) / W) * 100))}%` }}>
          {fmtNum(data[hover].value)} <span style={{ opacity: 0.65 }}>· {data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const opt = (k: View, label: string, path: React.ReactNode) => (
    <button onClick={() => onChange(k)} aria-label={label} aria-pressed={view === k} title={label} style={s(`width:27px;height:22px;display:flex;align-items:center;justify-content:center;border:none;border-radius:6px;cursor:pointer;background:${view === k ? "var(--surface)" : "transparent"};color:${view === k ? "var(--ink)" : "var(--muted)"}`)}>
      <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
    </button>
  );
  return (
    <div role="group" aria-label="Tipo de gráfico" style={s("display:flex;gap:2px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:2px")}>
      {opt("linha", "Ver como linha", <path d="M4 15.5 10 9l3.5 3.5L20 6" />)}
      {opt("barra", "Ver como barras", <><path d="M5 20V10" /><path d="M12 20V4" /><path d="M19 20v-7" /></>)}
    </div>
  );
}

/* ---------- CARD DE MÉTRICA (gráfico ao fundo + stats) ---------- */
export function MetricCard({ title, data, unit, prefix, accent, total, deltaLabel = "vs. início do período", defaultView = "linha", drawDelay = 0 }: {
  title: string; data: Pt[]; unit?: string; prefix?: string; accent?: Accent; total?: string; deltaLabel?: string; defaultView?: View; drawDelay?: number;
}) {
  const gid = useId().replace(/:/g, "");
  const [view, setView] = useState<View>(defaultView);
  const PERIODS: { label: string; points?: number }[] = [{ label: "7 dias", points: 7 }, { label: "14 dias", points: 14 }, { label: "30 dias" }];
  const [pi, setPi] = useState(PERIODS.length - 1);
  const pts = PERIODS[pi].points;
  const vis = pts && pts < data.length ? data.slice(-pts) : data;

  const vals = vis.map((d) => d.value);
  const first = vals[0] ?? 0, last = vals[vals.length - 1] ?? 0, prev = vals[vals.length - 2] ?? first;
  const sum = vals.reduce((a, b) => a + b, 0);
  const net = last - first, pct = first ? (net / first) * 100 : 0, step = last - prev;
  const peak = vals.length ? Math.max(...vals) : 0, low = vals.length ? Math.min(...vals) : 0, avg = vals.length ? sum / vals.length : 0;
  const trend: "up" | "down" | "flat" = Math.abs(pct) < 0.5 ? "flat" : net >= 0 ? "up" : "down";
  const acc: Accent = accent ?? (trend === "up" ? "success" : trend === "down" ? "danger" : "primary");
  const c = ACC[acc];
  const trIcon = trend === "flat" ? "arrow-right" : trend === "down" ? "trending-down" : "trending-up";
  const sign = (v: number) => (v >= 0 ? "+" : "−") + formatCompact(Math.abs(v));

  // alternativa textual concisa: título + valor headline + tendência (o SVG é aria-hidden)
  const headlineText = `${prefix ?? ""}${total ?? formatCompact(sum)}${unit ? " " + unit : ""}`;
  const trendWord = trend === "flat" ? "estável" : trend === "up" ? "em alta" : "em queda";
  const a11yText = `${title}: ${headlineText}. Tendência ${trendWord}, ${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}% no período de ${PERIODS[pi].label}.`;

  return (
    <div style={s("position:relative;display:flex;flex-direction:column;overflow:hidden;border-radius:24px;border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow-card);min-height:276px")}>
      <span style={SR_ONLY}>{a11yText}</span>
      {/* topo — título + número (nenhum gráfico atrás do texto) */}
      <div style={s("position:relative;z-index:2;padding:22px 24px 0")}>
        <div style={s("display:flex;align-items:center;justify-content:space-between;gap:12px")}>
          <div style={s("display:flex;align-items:center;gap:10px;min-width:0")}>
            <h3 style={s("font-size:15px;font-weight:800;letter-spacing:-.01em;line-height:1.2")}>{title}</h3>
            <ViewToggle view={view} onChange={setView} />
          </div>
          <div style={s("display:flex;align-items:center;gap:12px;flex-shrink:0")}>
            <span style={{ ...s("display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:700"), color: c.text }}>
              <span aria-hidden className="m-pop" style={s("display:inline-flex")}><Icon name={trIcon} size={15} sw={2.4} /></span>{Math.abs(pct).toFixed(1)}%
            </span>
            {/* seletor de período — chevron visível deixa claro que é um dropdown (não texto estático) */}
            <span style={s("position:relative;display:inline-flex;align-items:center")}>
              <select aria-label="Período do gráfico" value={pi} onChange={(e) => setPi(Number(e.target.value))} style={s("appearance:none;border:none;background:transparent;font-size:12.5px;font-weight:700;color:var(--muted);cursor:pointer;outline:none;padding-right:16px")}>
                {PERIODS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
              </select>
              <span aria-hidden style={{ ...s("position:absolute;right:0;display:inline-flex;pointer-events:none;color:var(--muted)") }}><Icon name="chevron-down" size={13} sw={2.4} /></span>
            </span>
          </div>
        </div>
        <div style={s("margin-top:14px;font-size:44px;font-weight:700;letter-spacing:-.02em;line-height:1;font-family:var(--font-mono)")}>
          {prefix && <span style={s("font-size:24px;font-weight:600;color:var(--muted);margin-right:4px")}>{prefix}</span>}
          {total ?? formatCompact(sum)}
          {unit && <span style={s("font-size:16px;font-weight:600;color:var(--muted);margin-left:6px")}>{unit}</span>}
        </div>
      </div>

      {/* faixa do gráfico — abaixo do texto, com folga, nunca encostando nele */}
      <div style={s("position:relative;flex:1;min-height:104px;margin-top:16px")}>
        <div style={{ ...s("position:absolute;inset:0"), background: `linear-gradient(to top, ${c.wash}, transparent 90%)` }} />
        <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "oklch(0.30 0.02 60 / 0.13)", WebkitMaskImage: "linear-gradient(to top, black 22%, transparent 92%)", maskImage: "linear-gradient(to top, black 22%, transparent 92%)" }}>
          <defs><pattern id={`p${gid}`} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="currentColor" /></pattern></defs>
          <rect width="100%" height="100%" fill={`url(#p${gid})`} />
        </svg>
        <div style={s("position:absolute;inset:0")}>
          <Chart data={vis} color={c.stroke} view={view} drawDelay={drawDelay} />
        </div>
      </div>

      {/* rodapé */}
      <div style={s("position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 24px;border-top:1px solid var(--line);background:var(--surface);font-size:12.5px;flex-wrap:wrap")}>
        <div><span style={{ fontWeight: 700, color: c.text }}>{sign(step)}</span> <span style={s("color:var(--muted)")}>{deltaLabel}</span></div>
        <div style={s("display:flex;align-items:center;gap:8px;color:var(--muted);font-size:11.5px")}>
          <span><b style={s("color:var(--ink)")}>{formatCompact(peak)}</b> pico</span><span style={s("opacity:.4")}>·</span>
          <span><b style={s("color:var(--ink)")}>{formatCompact(low)}</b> mín</span><span style={s("opacity:.4")}>·</span>
          <span><b style={s("color:var(--ink)")}>{formatCompact(Math.round(avg))}</b> méd</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- CARD CIRCULAR "TOTAL" (anéis de dots) ---------- */
type Sub = { label: string; value: string; pct: string; color: string };
export function RingTotalCard({ total, label = "TOTAL", sub, onDetails }: { total: string; label?: string; sub: Sub[]; onDetails?: () => void }) {
  const ring = (count: number, radius: number, base: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * 2 * Math.PI;
      return { x: Math.round((224 + radius * Math.cos(a)) * 100) / 100, y: Math.round((224 + radius * Math.sin(a)) * 100) / 100, d: base + i * 0.012 };
    });
  const outer = ring(48, 190, 0);
  const inner = ring(36, 158, 0.22);
  const dot = (p: { x: number; y: number; d: number }, k: string, fill: string) => (
    <circle key={k} cx={p.x} cy={p.y} r="9" fill={fill} style={{ transformBox: "fill-box", transformOrigin: "center", opacity: 0, animation: "mdot .5s var(--ease-out) both", animationDelay: `${p.d}s` }} />
  );

  // alternativa textual: total + as 2 sub-métricas (o anel de dots é aria-hidden)
  const a11yText = `${label}: ${total}. ${sub.map((x) => `${x.label}: ${x.value} (${x.pct})`).join(", ")}.`;

  return (
    <div style={s("position:relative;overflow:hidden;border-radius:24px;border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow-card);display:flex;flex-direction:column;min-height:264px")}>
      <span style={SR_ONLY}>{a11yText}</span>
      <div style={s("position:relative;flex:1;padding:6px 6px 0")}>
        {/* o anel e o texto compartilham o MESMO quadro → texto no centro exato do anel */}
        <div style={s("position:relative")}>
          <svg viewBox="0 0 448 448" aria-hidden style={{ width: "100%", height: "auto", display: "block", maxHeight: "340px" }}>
            {outer.map((p, i) => dot(p, "o" + i, "var(--primary)"))}
            {inner.map((p, i) => dot(p, "i" + i, "var(--success)"))}
          </svg>
          {/* fade sobre a metade inferior dos dots */}
          <div style={{ ...s("position:absolute;left:0;right:0;bottom:0;height:56%;pointer-events:none;z-index:1"), background: "linear-gradient(to bottom, transparent, var(--surface) 70%)" }} />
          {/* texto centralizado no centro geométrico do anel */}
          <div style={s("position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none")}>
            <div style={s("font-size:12px;font-weight:800;letter-spacing:.16em;color:var(--muted);text-indent:.16em")}>{label}</div>
            <div style={s("font-size:36px;font-weight:800;letter-spacing:-.02em;font-family:var(--font-mono);color:var(--ink);margin-top:5px;text-align:center")}>{total}</div>
          </div>
        </div>
      </div>
      <div style={s("position:relative;z-index:2;padding:0 22px 20px;margin-top:-8px")}>
        <div style={s("display:flex;align-items:flex-start;gap:26px;margin-bottom:15px")}>
          {sub.map((x, i) => (
            <div key={i} style={s("display:flex;flex-direction:column;gap:5px")}>
              <div style={s("display:flex;align-items:center;gap:7px")}>
                <span style={{ ...s("width:3px;height:15px;border-radius:2px"), background: x.color }} />
                <span style={s("font-size:12.5px;font-weight:600;color:var(--muted)")}>{x.label}</span>
              </div>
              <div style={s("font-size:19px;font-weight:800;color:var(--ink);font-family:var(--font-mono)")}>{x.value}</div>
              <div style={{ ...s("font-size:12px;font-weight:700"), color: x.color }}>{x.pct}</div>
            </div>
          ))}
        </div>
        <button onClick={onDetails} className="m-hov-bg" style={s("width:100%;border:1px solid var(--border);background:var(--surface);color:var(--ink);padding:10px;border-radius:11px;font-weight:700;font-size:13.5px;cursor:pointer")}>Mais detalhes</button>
      </div>
    </div>
  );
}

"use client";
import React from "react";

/* ---------- helper de estilo: string CSS → React.CSSProperties ---------- */
export function s(css: string): React.CSSProperties {
  const o: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    if (prop.startsWith("--")) o[prop] = val;
    else o[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
  }
  return o as React.CSSProperties;
}

/* ---------- helpers ---------- */
export const fmt = (n: number) => "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtK = (n: number) => n >= 1000 ? "R$ " + (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k" : fmt(n);
export const initials = (nome: string) => {
  const p = nome.replace(/\s+e\s+/i, " ").split(" ").filter(Boolean);
  return (((p[0] || "")[0] || "") + ((p[1] || "")[0] || "")).toUpperCase();
};

// paleta AVELUDADA — SÓ a identidade MAISA: tonalidades de AZUL e ÂMBAR/dourado (pares claro→escuro,
// degradê matte). Nada de verde/rosa/roxo — tudo dentro de uma paleta só. Escuros fundos o bastante p/ iniciais brancas.
const PALETTE: [string, string][] = [
  ["#93B4DD", "#3F5F8D"], // azul aço
  ["#E4C88C", "#96702E"], // dourado
  ["#A6C4E8", "#567CAE"], // azul claro
  ["#DCBE82", "#8A6528"], // ocre
  ["#7C99C6", "#3A5687"], // azul profundo
  ["#EAD59F", "#9E7C36"], // mel
  ["#8AA9D6", "#456499"], // azul médio
  ["#B4C8E2", "#57709E"], // azul acinzentado
];
export function avatar(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/* ---------- iconografia autoral (inline SVG, traço, currentColor) ---------- */
const ICONS: Record<string, React.ReactNode> = {
  // navegação
  config: (<><circle cx="12" cy="12" r="3.1" /><path d="M12 3.4v2.3M12 18.3v2.3M20.6 12h-2.3M5.7 12H3.4M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></>),
  equipe: (<><circle cx="9" cy="8.2" r="3.2" /><path d="M3.2 19.4c0-3.2 2.6-5 5.8-5s5.8 1.8 5.8 5" /><path d="M16.4 5.7a3 3 0 0 1 .1 5.4" /><path d="M17.6 14.7c2 .5 3.4 2.1 3.4 4.5" /></>),
  scissors: (<><circle cx="6" cy="6.2" r="2.6" /><circle cx="6" cy="17.8" r="2.6" /><path d="M8.3 7.9 20 18M20 6 8.3 16.1M11 12l2.2-1.9" /></>),
  faq: (<><path d="M4 5.4A1.8 1.8 0 0 1 5.8 3.6H11a1.5 1.5 0 0 1 1 .5 1.5 1.5 0 0 1 1-.5h5.2A1.8 1.8 0 0 1 20 5.4V18a1.4 1.4 0 0 1-1.4 1.4H13a1.5 1.5 0 0 0-1 .5 1.5 1.5 0 0 0-1-.5H5.4A1.4 1.4 0 0 1 4 18Z" /><path d="M12 4.1v15.3" /></>),
  marketing: (<><path d="M3.5 10.4v3.2a1 1 0 0 0 1 1H7l9 4V5.4l-9 4H4.5a1 1 0 0 0-1 1Z" /><path d="m8 15.5 1.3 4.5" /><path d="M18.5 9.5a3.3 3.3 0 0 1 0 5" /></>),
  card: (<><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="M3 9.6h18" /><path d="M6.5 14.5h4.5" /></>),
  receipt: (<><path d="M5 20.5V5.2A1.7 1.7 0 0 1 6.7 3.5h10.6A1.7 1.7 0 0 1 19 5.2V20.5l-2.33-1.6-2.34 1.6-2.33-1.6-2.34 1.6-2.33-1.6-2.33 1.6Z" /><path d="M8.5 8.4h7M8.5 11.8h4.5" /></>),
  dashboard: (<><rect x="3" y="4.4" width="18" height="15.2" rx="3.3" /><path d="M3 9.4h18" /><path d="M6.6 15.8l2.3-2.6 2 1.6 2.4-3.2 2 2.5 1.5-1.1" /></>),
  chat: (<><path d="M5.5 4.5h13A2.5 2.5 0 0 1 21 7v6.5A2.5 2.5 0 0 1 18.5 16H12l-4.5 3.5V16H5.5A2.5 2.5 0 0 1 3 13.5V7A2.5 2.5 0 0 1 5.5 4.5Z" /><path d="M8 9h8M8 12h5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="3.2" /><path d="M3 9.5h18" /><path d="M8 3v3.4M16 3v3.4" /><circle cx="12" cy="14.8" r="1.7" /></>),
  // comuns
  plus: (<path d="M12 5v14M5 12h14" />),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  check: (<path d="m20 6-11 11-5-5" />),
  x: (<path d="M18 6 6 18M6 6l12 12" />),
  "chevron-left": (<path d="m15 18-6-6 6-6" />),
  "chevron-right": (<path d="m9 18 6-6-6-6" />),
  "chevron-down": (<path d="m6 9 6 6 6-6" />),
  edit: (<><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" /><path d="M14.4 6.6l3 3" /></>),
  trash: (<><path d="M4 6.5h16M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" /><path d="M18 6.5l-.9 12.2A1.6 1.6 0 0 1 15.5 20h-7a1.6 1.6 0 0 1-1.6-1.3L6 6.5" /><path d="M10 10.5v5M14 10.5v5" /></>),
  clock: (<><circle cx="12" cy="12" r="8" /><path d="M12 7.5v5l3 2" /></>),
  whatsapp: (<><path d="M4 19.8 5.1 16A7.9 7.9 0 1 1 8.2 19l-4.2.8Z" /><path d="M9.4 8.8c.2-.5.5-.5.75-.48.24.02.38.03.55.42.13.32.46 1.14.5 1.22.04.09.07.2.01.32-.06.12-.1.19-.19.29l-.28.33c-.1.1-.19.2-.09.38.1.19.48.82 1.05 1.33.74.66 1.37.87 1.56.97.19.1.31.08.42-.05.12-.14.48-.57.6-.77.13-.19.25-.16.42-.1.17.07 1.1.53 1.3.62" /></>),
  sparkle: (<><path d="M12 3.5l1.6 4.9 4.9 1.6-4.9 1.6L12 16.5l-1.6-4.9L5.5 10l4.9-1.6Z" /><path d="M18.6 15.4l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6Z" /></>),
  bell: (<><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5Z" /><path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" /></>),
  filter: (<path d="M4 6h16M7 12h10M10 18h4" />),
  dots: (<><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>),
  "arrow-right": (<path d="M5 12h14M13 6l6 6-6 6" />),
  "arrow-up-right": (<path d="M7 17 17 7M8 7h9v9" />),
  phone: (<path d="M6.5 4.5h3l1.2 4-2 1.3a12 12 0 0 0 5.5 5.5l1.3-2 4 1.2v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 4.5Z" />),
  star: (<path d="M12 3.8l2.5 5 5.5.8-4 3.9.95 5.5L12 16.9 7.1 19l.95-5.5-4-3.9 5.5-.8Z" />),
  bot: (<><rect x="4.5" y="8" width="15" height="10.5" rx="3.2" /><path d="M12 5v3" /><circle cx="12" cy="4.1" r="1.1" /><path d="M3.2 12.5v3M20.8 12.5v3" /><circle cx="9.4" cy="13" r="1.05" /><circle cx="14.6" cy="13" r="1.05" /><path d="M9.6 16h4.8" /></>),
  user: (<><circle cx="12" cy="8" r="3.4" /><path d="M5 19.5c0-3.4 3-5.5 7-5.5s7 2.1 7 5.5" /></>),
  send: (<><path d="M20 4 9.5 14.5" /><path d="M20 4 13.5 20l-4-7.5-7.5-4Z" /></>),
  "trending-up": (<><path d="M4 15.5 10 9l3.5 3.5L20 6" /><path d="M15.5 6H20v4.5" /></>),
  "trending-down": (<><path d="M4 8.5 10 15l3.5-3.5L20 18" /><path d="M15.5 18H20v-4.5" /></>),
  "arrow-up": (<path d="M12 19V5M6 11l6-6 6 6" />),
  "arrow-down": (<path d="M12 5v14M6 13l6 6 6-6" />),
  tag: (<><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" /><circle cx="8" cy="8" r="1.5" /></>),
  "calendar-check": (<><rect x="3" y="5" width="18" height="16" rx="3.2" /><path d="M3 9.5h18M8 3v3M16 3v3" /><path d="m9.5 15 2 2 3.5-3.5" /></>),
  copy: (<><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></>),
  image: (<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.7" /><path d="m4 17 5-4.5 4 3 3-2.5 4 3.5" /></>),
  link: (<><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" /></>),
  pin: (<><path d="M12 21s6.5-5.4 6.5-10.5A6.5 6.5 0 0 0 5.5 10.5C5.5 15.6 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.3" /></>),
  gift: (<><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M3 9h18M12 9v11M12 9S9.5 4 7.5 5.5 9.5 9 12 9ZM12 9s2.5-5 4.5-3.5S14.5 9 12 9Z" /></>),
  refresh: (<><path d="M20 11a8 8 0 0 0-14-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14 4.5L20 16" /><path d="M20 20v-4h-4" /></>),
  download: (<><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 19h14" /></>),
  play: (<path d="M7 5l12 7-12 7Z" />),
  moon: (<path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />),
  target: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".6" /></>),
  // profissões (ícone de "serviços" por área)
  heart: (<path d="M12 20.3s-6.8-4.1-6.8-9.1A3.7 3.7 0 0 1 12 8.3a3.7 3.7 0 0 1 6.8 2.9c0 5-6.8 9.1-6.8 9.1Z" />),
  tooth: (<path d="M8 3.5c-2 0-3.3 1.5-3.3 3.7 0 1.3.4 2.3.8 3.8.5 2 .5 6 1.9 6 1.2 0 1.1-3.4 2.3-3.4s1.1 3.4 2.3 3.4c1.4 0 1.4-4 1.9-6 .4-1.5.8-2.5.8-3.8C16.3 5 15 3.5 13 3.5c-1 0-1.5.6-2.5.6S9 3.5 8 3.5Z" />),
  stethoscope: (<><path d="M6 3.5v4.3a3.8 3.8 0 0 0 7.6 0V3.5" /><path d="M9.8 15.4a5 5 0 0 0 5 5 3.9 3.9 0 0 0 3.9-3.9v-1.7" /><circle cx="18.7" cy="12.7" r="2" /></>),
};

export function Icon({ name, size = 20, sw = 1.8, stroke = "currentColor", style }: { name: string; size?: number; sw?: number; stroke?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {ICONS[name] || ICONS.sparkle}
    </svg>
  );
}

/* ---------- primitivas ---------- */
export function Card({ children, style, onClick, hover, pad = 20, radius = 18, className = "" }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; hover?: boolean; pad?: number; radius?: number; className?: string }) {
  return (
    <div onClick={onClick} className={[hover ? "m-card-hov" : "", className].join(" ").trim()} style={{ ...s(`background:var(--surface);border:1px solid var(--border);border-radius:${radius}px;box-shadow:var(--shadow-card);padding:${pad}px${hover ? "" : ";transition:transform var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out)"}`), ...(onClick ? { cursor: "pointer" } : {}), ...(style || {}) }}>
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "whats";
const BTN_VAR: Record<BtnVariant, string> = {
  primary: "border:none;background:var(--primary);color:#fff",
  secondary: "border:1px solid var(--border);background:var(--surface);color:var(--ink)",
  ghost: "border:none;background:transparent;color:var(--muted)",
  danger: "border:1px solid var(--danger-soft);background:var(--danger-soft);color:var(--danger)",
  whats: "border:none;background:var(--whatsapp);color:#fff",
};
export function Btn({ variant = "primary", icon, children, onClick, style, full, size = "md" }: { variant?: BtnVariant; icon?: string; children?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; full?: boolean; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "8px 13px" : "10px 17px";
  const hov = variant === "primary" ? "m-hov-primary" : variant === "whats" ? "m-hov-bright" : "m-hov-bg";
  return (
    <button onClick={onClick} className={`${hov} m-press m-focus`} style={{ ...s(`display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;padding:${pad};${full ? "width:100%;" : ""}${BTN_VAR[variant]}`), ...(style || {}) }}>
      {icon && <Icon name={icon} size={16} sw={2} />}
      {children}
    </button>
  );
}

export function IconBtn({ icon, onClick, tone = "neutral", title }: { icon: string; onClick?: () => void; tone?: "neutral" | "danger" | "primary"; title?: string }) {
  const c = tone === "danger" ? "color:var(--danger)" : tone === "primary" ? "color:var(--primary)" : "color:var(--muted)";
  return (
    <button title={title} aria-label={title} onClick={onClick} className="m-hov-bg m-press-icon m-focus" style={s(`width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:9px;background:var(--surface);cursor:pointer;${c}`)}>
      <Icon name={icon} size={16} sw={2} />
    </button>
  );
}

type Tone = "success" | "warn" | "primary" | "danger" | "neutral" | "warm";
const TONES: Record<Tone, [string, string]> = {
  success: ["var(--success-soft)", "var(--success)"],
  warn: ["var(--warn-soft)", "var(--warn)"],
  primary: ["var(--primary-soft)", "var(--primary-dark)"],
  danger: ["var(--danger-soft)", "var(--danger)"],
  neutral: ["var(--line)", "var(--muted)"],
  warm: ["var(--warm-soft)", "var(--warn)"],
};
export function Badge({ tone = "neutral", children, dot }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  const [bg, fg] = TONES[tone];
  return (
    <span style={s(`display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:20px;background:${bg};color:${fg}`)}>
      {dot && <span style={s(`width:6px;height:6px;border-radius:50%;background:${fg}`)} />}
      {children}
    </span>
  );
}

// outline:none + classe .m-focus => mesmo anel de foco (:focus-visible) dos botões
const INPUT = "width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:14px;background:var(--surface);color:var(--ink);outline:none";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, className, ...rest } = props;
  return <input {...rest} className={["m-focus", className].filter(Boolean).join(" ")} style={{ ...s(INPUT), ...(style || {}) }} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { style, className, ...rest } = props;
  return <textarea {...rest} className={["m-focus", className].filter(Boolean).join(" ")} style={{ ...s(INPUT + ";resize:vertical;min-height:92px;line-height:1.55"), ...(style || {}) }} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, className, children, ...rest } = props;
  return <select {...rest} className={["m-focus", className].filter(Boolean).join(" ")} style={{ ...s(INPUT + ";cursor:pointer;appearance:none"), ...(style || {}) }}>{children}</select>;
}
export function Field({ label, hint, children, style }: { label?: string; hint?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ ...s("display:flex;flex-direction:column;gap:6px"), ...(style || {}) }}>
      {label && <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>{label}</span>}
      {children}
      {hint && <span style={s("font-size:11.5px;color:var(--muted)")}>{hint}</span>}
    </label>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange?.(!on)} className="m-hov-bright m-focus" style={s(`width:44px;height:26px;border:none;border-radius:20px;cursor:pointer;padding:3px;display:flex;justify-content:flex-start;background:${on ? "var(--primary)" : "var(--border)"};transition:background .18s var(--ease-out)`)}>
      <span className="m-knob" style={s(`width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.22);transform:translateX(${on ? 18 : 0}px)`)} />
    </button>
  );
}

export function Monogram({ name, id, size = 44, radius = 13 }: { name: string; id?: string; size?: number; radius?: number }) {
  const [lo, hi] = avatar(id || name);
  // matte, aveludado: degradê linear calmo + trama sutil (textura de tapete), sem brilho/vidro
  const weave =
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px)," +
    "repeating-linear-gradient(-45deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px)";
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
        color: "rgba(255,255,255,0.93)",
        fontWeight: 700,
        fontSize: Math.round(size * 0.34),
        letterSpacing: "0.02em",
        background: `${weave}, linear-gradient(150deg, ${lo} 0%, ${hi} 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), 0 1px 3px oklch(30% 0.02 60 / 0.10)",
      }}
    >
      {initials(name)}
    </div>
  );
}

export function StatTile({ label, value, sub, icon, tone = "primary" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: string; tone?: Tone }) {
  const [bg, fg] = TONES[tone];
  return (
    <Card pad={18} style={s("display:flex;flex-direction:column;gap:12px")}>
      <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
        <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>{label}</span>
        {icon && <span style={s(`width:34px;height:34px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${bg};color:${fg}`)}><Icon name={icon} size={18} /></span>}
      </div>
      <span style={s("font-size:26px;font-weight:800;font-family:var(--font-mono);letter-spacing:-.02em;line-height:1")}>{value}</span>
      {sub && <span style={s("font-size:12px;color:var(--muted)")}>{sub}</span>}
    </Card>
  );
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={s("display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap")}>
      <div>
        <h2 style={s("font-size:17px;font-weight:800;letter-spacing:-.01em")}>{title}</h2>
        {sub && <p style={s("font-size:13px;color:var(--muted);margin-top:2px")}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = "sparkle", title, sub, action }: { icon?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={s("display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 24px;gap:10px;color:var(--muted)")}>
      <span style={s("width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:var(--primary-soft);color:var(--primary-dark)")}><Icon name={icon} size={26} /></span>
      <span style={s("font-size:15px;font-weight:700;color:var(--ink)")}>{title}</span>
      {sub && <span style={s("font-size:13px;max-width:360px;line-height:1.5")}>{sub}</span>}
      {action}
    </div>
  );
}

export function Divider({ vertical, style }: { vertical?: boolean; style?: React.CSSProperties }) {
  return <div style={{ ...s(vertical ? "width:1px;align-self:stretch;background:var(--line)" : "height:1px;width:100%;background:var(--line)"), ...(style || {}) }} />;
}

/* container padrão de tela — 28px de respiro, largura fluida */
export function Screen({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="m-enter" style={{ ...s("padding:28px"), ...(style || {}) }}>{children}</div>;
}

/* ---------- toast: feedback leve para ações (evita botão "morto") ---------- */
let toastListeners: ((m: string) => void)[] = [];
let toastSeq = 0;
export function toast(msg: string) {
  toastListeners.forEach((l) => l(msg));
}
export function Toaster() {
  const [items, setItems] = React.useState<{ id: number; msg: string }[]>([]);
  React.useEffect(() => {
    const l = (msg: string) => {
      const id = ++toastSeq;
      setItems((x) => [...x, { id, msg }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2400);
    };
    toastListeners.push(l);
    return () => {
      toastListeners = toastListeners.filter((x) => x !== l);
    };
  }, []);
  return (
    <div role="status" aria-live="polite" style={s("position:fixed;left:0;right:0;bottom:26px;display:flex;flex-direction:column;align-items:center;gap:8px;z-index:9999;pointer-events:none")}>
      {items.map((i) => (
        <div key={i.id} className="m-pop" style={s("display:flex;align-items:center;gap:9px;background:var(--ink);color:var(--surface);font-size:13.5px;font-weight:600;padding:11px 18px;border-radius:12px;box-shadow:var(--shadow-pop)")}>
          <Icon name="check" size={16} sw={2.4} stroke="var(--surface)" />
          {i.msg}
        </div>
      ))}
    </div>
  );
}

/* ---------- ConfirmDialog: confirmação reutilizável no idioma visual do app ----------
   Modelado nos modais de Faturamento/Pacientes: backdrop escuro (mfade) + card central
   var(--surface) (mrise). Esc/backdrop chamam onCancel. prefers-reduced-motion respeitado
   pela regra global (@media reduce zera as durações das animações inline). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "primary";
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const danger = tone === "danger";
  const confirmVar = danger ? "background:var(--danger);color:#fff" : "background:var(--primary);color:#fff";
  const confirmHov = danger ? "m-hov-bright" : "m-hov-primary";

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ ...s("position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:28px;background:rgba(25,30,28,.5)"), backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", animation: "mfade .2s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...s("position:relative;width:420px;max-width:92vw;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-pop);padding:24px"), animation: "mrise .25s var(--ease-out)" }}
      >
        <button
          onClick={onCancel}
          title={cancelText}
          aria-label={cancelText}
          className="m-hov-bg m-press-icon m-focus"
          style={s("position:absolute;top:14px;right:14px;width:30px;height:30px;border:none;border-radius:8px;background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted)")}
        >
          <Icon name="x" size={16} sw={2.2} />
        </button>
        <h2 style={s("font-size:17px;font-weight:800;letter-spacing:-.01em;padding-right:34px")}>{title}</h2>
        {message && <p style={s("font-size:13.5px;color:var(--muted);line-height:1.55;margin-top:8px")}>{message}</p>}
        <div style={s("display:flex;justify-content:flex-end;gap:10px;margin-top:22px")}>
          <button
            onClick={onCancel}
            className="m-hov-bg m-press m-focus"
            style={s("border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;padding:10px 17px")}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${confirmHov} m-press m-focus`}
            style={s(`border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;padding:10px 17px;${confirmVar}`)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

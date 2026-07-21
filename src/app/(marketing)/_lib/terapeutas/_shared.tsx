import type { CSSProperties, ReactNode } from "react";
import type { Nivel } from "../icp";
import type { BtnIcon } from "../primitives";

/* ----------------------------------------------------------------------------
 * Utilitários internos da biblioteca de seções TERAPEUTAS.
 * Mundo visual: claro, arejado, calmo, organizado (consultório com luz da tarde).
 * Server-safe (sem "use client"): só tipos, funções puras e SVGs estáticos.
 * -------------------------------------------------------------------------- */

export type Tone = "default" | "panel" | "deep" | "brand";

/** Props que TODA seção do funil aceita (variação por nível + faixa/id). */
export interface SecaoBase {
  /** nível do funil — muda ênfase, densidade e CTAs padrão */
  nivel?: Nivel;
  /** id da <section> (para âncoras da nav; ex.: "recursos", "planos") */
  id?: string;
  /** cor da faixa (ritmo vertical entre seções) */
  tone?: Tone;
  className?: string;
}

/** Deriva alvo/ícone do href: WhatsApp/externo abre em nova aba com ícone do zap;
 *  link interno recebe seta (à direita). Espelha a convenção da CTASection. */
export function linkKind(href: string): { external: boolean; icon: BtnIcon; iconRight: boolean } {
  const external = /^https?:/i.test(href);
  return { external, icon: external ? "whatsapp" : "arrow", iconRight: !external };
}

/* ------------------------------- Iconografia ------------------------------ *
 * Traço fino e calmo, currentColor. Pequenos e ao LADO do texto (nunca o
 * "ícone grande arredondado acima de todo heading" — isso é banido).           */
const GLYPHS: Record<string, ReactNode> = {
  receipt: (
    <>
      <path d="M5 20.5V5.4A1.6 1.6 0 0 1 6.6 3.8h10.8A1.6 1.6 0 0 1 19 5.4V20.5l-2.33-1.5L14.33 20.5 12 19l-2.33 1.5L7.33 19 5 20.5Z" />
      <path d="M8.6 8.6h6.8M8.6 12h4.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.1" r="3.1" />
      <path d="M3.4 19.2c0-3.1 2.5-4.9 5.6-4.9s5.6 1.8 5.6 4.9" />
      <path d="M16.2 5.9a3 3 0 0 1 .1 5.3" />
      <path d="M17.5 14.6c1.9.5 3.2 2 3.2 4.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.6h17M8 3v3.4M16 3v3.4" />
      <path d="m9 15.2 2 2 3.5-3.6" />
    </>
  ),
  chat: (
    <>
      <path d="M5.5 4.8h13A2.4 2.4 0 0 1 20.9 7.2v6.3a2.4 2.4 0 0 1-2.4 2.4H12l-4.4 3.3V16H5.5A2.4 2.4 0 0 1 3.1 13.5V7.2A2.4 2.4 0 0 1 5.5 4.8Z" />
      <path d="M8 9.4h8M8 12.3h5" />
    </>
  ),
  insights: (
    <>
      <path d="M4 15.6 10 9l3.4 3.4L20 6" />
      <path d="M15.6 6H20v4.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.4v5l3.2 2" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C11 4 5 8 5 15a5 5 0 0 0 5 5c7 0 10-6 10-16Z" />
      <path d="M9.2 16c2.8-3.9 5.8-6 8.8-7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.4 5 6v5.3c0 4.3 3 7.6 7 9.3 4-1.7 7-5 7-9.3V6Z" />
      <path d="m9.2 12 2 2 3.6-3.7" />
    </>
  ),
  heart: <path d="M12 20.2s-6.7-4-6.7-9A3.65 3.65 0 0 1 12 8.4a3.65 3.65 0 0 1 6.7 2.8c0 5-6.7 9-6.7 9Z" />,
  spark: <path d="M12 3.4l1.7 5.2 5.2 1.7-5.2 1.7L12 17.2l-1.7-5.2L5.1 10.3l5.2-1.7Z" />,
  check: <path d="m20 6.4-10.6 11L4 12" />,
  minus: <path d="M6 12h12" />,
  arrow: <path d="M5 12h13M12 6l6 6-6 6" />,
};

export function TIcon({
  name,
  size = 22,
  sw = 1.7,
  style,
}: {
  name: keyof typeof GLYPHS | string;
  size?: number;
  sw?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {GLYPHS[name] ?? GLYPHS.spark}
    </svg>
  );
}

/** Selo de ícone suave: pequeno, âmbar-tingido, para listas de benefício/passo.
 *  Borda fina + fundo tint (sem sombra pesada → nunca vira "ghost-card"). */
export function IconBadge({
  children,
  size = 46,
  radius = 13,
}: {
  children: ReactNode;
  size?: number;
  radius?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius,
        color: "var(--mk-brand)",
        background: "color-mix(in oklch, var(--mk-accent) 15%, var(--mk-surface))",
        border: "1px solid color-mix(in oklch, var(--mk-accent) 32%, transparent)",
      }}
    >
      {children}
    </span>
  );
}

/** Pequena etiqueta/pill de contexto (ex.: rótulo de coluna Antes/Agora).
 *  Não é eyebrow-de-seção: é um rótulo local dentro de um bloco. */
export function Pill({
  children,
  variant = "soft",
}: {
  children: ReactNode;
  variant?: "soft" | "accent" | "muted";
}) {
  const styles: Record<string, CSSProperties> = {
    soft: {
      background: "color-mix(in oklch, var(--mk-accent) 16%, var(--mk-surface))",
      color: "var(--mk-accent-ink)",
      border: "1px solid color-mix(in oklch, var(--mk-accent) 30%, transparent)",
    },
    accent: {
      background: "var(--mk-brand)",
      color: "var(--mk-on-brand)",
      border: "1px solid transparent",
    },
    muted: {
      background: "color-mix(in oklch, var(--mk-ink) 6%, var(--mk-surface))",
      color: "var(--mk-muted)",
      border: "1px solid var(--mk-border)",
    },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        fontFamily: "var(--mk-font-body)",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.02em",
        lineHeight: 1,
        padding: "0.42rem 0.7rem",
        borderRadius: 999,
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}

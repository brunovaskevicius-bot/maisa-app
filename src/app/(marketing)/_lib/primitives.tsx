"use client";
import React from "react";
import { s } from "@/lib/ui";

/* ============================================================================
 * Primitivos GLOBAIS das landing pages MAISA. Todos leem os tokens `--mk-*` do
 * mundo ativo (herdados do wrapper `.mundo-*` / <World>), então o MESMO
 * componente muda de clima entre barbeiros e terapeutas sem props de cor.
 * Estilo inline (helper s() do app + objetos CSSProperties). Sem Tailwind.
 * ========================================================================== */

type Width = "default" | "wide" | "narrow";
const MAXW: Record<Width, string> = {
  default: "var(--mk-maxw)",
  wide: "var(--mk-maxw-wide)",
  narrow: "var(--mk-maxw-narrow)",
};

/* --------------------------------- Container ------------------------------ */
export function Container({
  children,
  width = "default",
  style,
  className,
}: {
  children: React.ReactNode;
  width?: Width;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: MAXW[width],
        marginInline: "auto",
        paddingInline: "var(--mk-gutter)",
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------- Section ------------------------------- *
 * Ritmo vertical fluido (--mk-section-y). `tone` pinta a faixa inteira usando
 * tokens do mundo. `container=false` deixa o conteúdo sangrar (full-bleed).   */
type SectionTone = "default" | "panel" | "deep" | "brand";
export function Section({
  children,
  id,
  tone = "default",
  width = "default",
  container = true,
  style,
  containerStyle,
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  id?: string;
  tone?: SectionTone;
  width?: Width;
  container?: boolean;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  className?: string;
  "aria-label"?: string;
}) {
  const toneStyle: React.CSSProperties =
    tone === "panel"
      ? { background: "var(--mk-panel)" }
      : tone === "deep"
      ? { background: "var(--mk-bg-deep)" }
      : tone === "brand"
      ? { background: "var(--mk-band-bg)", color: "var(--mk-band-ink)" }
      : {};
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={className}
      style={{ paddingBlock: "var(--mk-section-y)", ...toneStyle, ...(style || {}) }}
    >
      {container ? (
        <Container width={width} style={containerStyle}>
          {children}
        </Container>
      ) : (
        children
      )}
    </section>
  );
}

/* ------------------------------- Tipografia ------------------------------- */

/** Kicker curto. Use com parcimônia — NÃO ponha acima de toda seção (é banido
 *  como scaffolding). Um por página, no máximo, e só quando agrega. */
export function Eyebrow({
  children,
  as: As = "span",
  style,
}: {
  children: React.ReactNode;
  as?: React.ElementType;
  style?: React.CSSProperties;
}) {
  return (
    <As
      style={{
        display: "inline-block",
        fontFamily: "var(--mk-font-body)",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--mk-accent-ink)",
        ...(style || {}),
      }}
    >
      {children}
    </As>
  );
}

type DisplaySize = "lg" | "xl" | "2xl";
const DISPLAY_FS: Record<DisplaySize, string> = {
  lg: "clamp(1.9rem, 4vw, 3.1rem)",
  xl: "clamp(2.3rem, 5.4vw, 4.25rem)",
  "2xl": "clamp(2.7rem, 6.6vw, 5.5rem)", // teto <= 6rem (respeita o brief)
};
/** Título de herói. Fonte display do mundo, fluido, com text-wrap:balance. */
export function Display({
  children,
  as: As = "h1",
  size = "xl",
  style,
  className,
}: {
  children: React.ReactNode;
  as?: React.ElementType;
  size?: DisplaySize;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <As
      className={["mk-balance", className].filter(Boolean).join(" ")}
      style={{
        fontFamily: "var(--mk-font-display)",
        fontSize: DISPLAY_FS[size],
        lineHeight: 1.02,
        letterSpacing: "-0.02em",
        margin: 0,
        ...(style || {}),
      }}
    >
      {children}
    </As>
  );
}

/** Título de seção (h2 por padrão). */
export function Heading({
  children,
  as: As = "h2",
  style,
  className,
}: {
  children: React.ReactNode;
  as?: React.ElementType;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <As
      className={["mk-balance", className].filter(Boolean).join(" ")}
      style={{
        fontFamily: "var(--mk-font-display)",
        fontSize: "clamp(1.7rem, 3.4vw, 2.9rem)",
        lineHeight: 1.1,
        letterSpacing: "-0.015em",
        margin: 0,
        ...(style || {}),
      }}
    >
      {children}
    </As>
  );
}

/** Parágrafo de abertura (maior, respirado). */
export function Lead({
  children,
  as: As = "p",
  style,
  className,
}: {
  children: React.ReactNode;
  as?: React.ElementType;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <As
      className={["mk-pretty", className].filter(Boolean).join(" ")}
      style={{
        fontFamily: "var(--mk-font-body)",
        fontSize: "clamp(1.075rem, 1.5vw, 1.3rem)",
        lineHeight: 1.6,
        color: "var(--mk-ink-soft)",
        margin: 0,
        maxWidth: "48ch",
        ...(style || {}),
      }}
    >
      {children}
    </As>
  );
}

/** Corpo de texto padrão. `muted` para tom secundário (ainda AA). */
export function Text({
  children,
  as: As = "p",
  muted,
  style,
  className,
}: {
  children: React.ReactNode;
  as?: React.ElementType;
  muted?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <As
      className={["mk-pretty", className].filter(Boolean).join(" ")}
      style={{
        fontFamily: "var(--mk-font-body)",
        fontSize: "1rem",
        lineHeight: 1.65,
        color: muted ? "var(--mk-muted)" : "var(--mk-ink-soft)",
        margin: 0,
        ...(style || {}),
      }}
    >
      {children}
    </As>
  );
}

/* ---------------------------------- Ícones -------------------------------- */
function GlyphWhatsapp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.07-.8.38-.28.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.02 3.5A8.44 8.44 0 0 0 4.7 16.15L3.6 20.4l4.35-1.14a8.44 8.44 0 1 0 4.07-15.76zm0 15.32a6.9 6.9 0 0 1-3.5-.96l-.25-.15-2.58.68.69-2.51-.16-.26a6.88 6.88 0 1 1 6.06 3.46z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}
function GlyphArrow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13M12 6l6 6-6 6" />
    </svg>
  );
}

/* ---------------------------------- Button -------------------------------- *
 * Renderiza <a> quando há href (navegação/WhatsApp) ou <button> quando há
 * onClick. Variantes leem tokens do mundo → a MESMA variante muda de cor entre
 * barbeiros e terapeutas. Alvo de toque >= 44px (sm 44 / md 50 / lg 58).       */
export type BtnVariant = "primary" | "secondary" | "ghost" | "whatsapp" | "band" | "band-ghost";
export type BtnSize = "sm" | "md" | "lg";
export type BtnIcon = "none" | "whatsapp" | "arrow";

const SIZE: Record<BtnSize, string> = {
  sm: "min-height:44px;padding:0 18px;font-size:0.95rem;gap:8px",
  md: "min-height:50px;padding:0 24px;font-size:1.02rem;gap:10px",
  lg: "min-height:58px;padding:0 30px;font-size:1.08rem;gap:11px",
};
const VARIANT: Record<BtnVariant, string> = {
  primary: "background:var(--mk-cta);color:var(--mk-cta-ink);border:1px solid transparent",
  secondary: "background:transparent;color:var(--mk-ink);border:1px solid var(--mk-border)",
  ghost: "background:transparent;color:var(--mk-ink-soft);border:1px solid transparent",
  whatsapp: "background:var(--mk-whats);color:var(--mk-whats-ink);border:1px solid transparent",
  band: "background:var(--mk-band-btn);color:var(--mk-band-btn-ink);border:1px solid transparent",
  "band-ghost": "background:transparent;color:var(--mk-band-ink);border:1px solid color-mix(in oklch, var(--mk-band-ink) 40%, transparent)",
};

export interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: BtnIcon;
  /** posiciona o ícone à direita do rótulo (padrão: à esquerda) */
  iconRight?: boolean;
  full?: boolean;
  /** abre em nova aba (usado nos links de WhatsApp) */
  external?: boolean;
  ariaLabel?: string;
  type?: "button" | "submit";
  style?: React.CSSProperties;
  className?: string;
}

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  icon = "none",
  iconRight = false,
  full = false,
  external = false,
  ariaLabel,
  type = "button",
  style,
  className,
}: ButtonProps) {
  const base = s(
    `display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;font-family:var(--mk-font-body);font-weight:700;letter-spacing:0.005em;border-radius:var(--mk-btn-radius);cursor:pointer;text-decoration:none;${full ? "width:100%;" : ""}${SIZE[size]};${VARIANT[variant]}`,
  );
  const cls = ["mk-btn", `mk-btn-${variant}`, "mk-focus", className].filter(Boolean).join(" ");
  const glyph =
    icon === "whatsapp" ? <GlyphWhatsapp size={size === "lg" ? 20 : 18} /> : icon === "arrow" ? <GlyphArrow size={size === "lg" ? 20 : 18} /> : null;

  const inner = (
    <>
      {glyph && !iconRight ? glyph : null}
      <span>{children}</span>
      {glyph && iconRight ? glyph : null}
    </>
  );
  const styleFinal = { ...base, ...(style || {}) };

  if (href) {
    const rel = external ? "noopener noreferrer" : undefined;
    const target = external ? "_blank" : undefined;
    return (
      <a href={href} target={target} rel={rel} aria-label={ariaLabel} onClick={onClick} className={cls} style={styleFinal}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} aria-label={ariaLabel} className={cls} style={styleFinal}>
      {inner}
    </button>
  );
}

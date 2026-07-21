"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Section, Display, Lead, Button } from "../primitives";
import { ICPS, type Nivel } from "../icp";
import { imagensBarbeiros, type MktImagem } from "../imagens";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * HeroBarbeiros — o herói do mundo barbeiros. Uma variação por nível de funil
 * (topo/meio/base) muda copy, CTA e imagem; o clima (navy drenado + dourado)
 * vem dos tokens. Split editorial: manchete + prova à esquerda, a craft em foto
 * à direita com um selo de confirmação real por cima (sólido, não glass).
 * -------------------------------------------------------------------------- */

const cfg = ICPS.barbeiros;

type CTA = { label: string; href: string; whats: boolean };

interface NivelDef {
  title: string;
  lead: string;
  image: MktImagem;
  primary: CTA;
  secondary: CTA;
  destaques: string[];
}

const DEF: Record<Nivel, NivelDef> = {
  topo: {
    title: "Enquanto você corta, a agenda enche sozinha.",
    lead: "A MAISA confirma, lembra e traz cliente de volta pelo WhatsApp — no automático. Você fica de tesoura na mão; a cadeira não fica vazia.",
    image: imagensBarbeiros.hero,
    primary: { label: "Ver como funciona", href: cfg.rotas.meio, whats: false },
    secondary: { label: "Falar no WhatsApp", href: cfg.ctaUrl, whats: true },
    destaques: ["Setup em ~30 min", "Funciona no seu WhatsApp", "Sem fidelidade"],
  },
  meio: {
    title: "Veja a agenda encher sem largar a tesoura.",
    lead: "Confirmação automática, lembrete que mata o no-show e recuperação de quem sumiu — tudo pelo WhatsApp, sem você parar o corte.",
    image: imagensBarbeiros.corte,
    primary: { label: "Ativar minha agenda", href: cfg.ctaUrl, whats: true },
    secondary: { label: "Ver planos e preços", href: cfg.rotas.base, whats: false },
    destaques: ["Confirma e lembra sozinha", "Recupera cliente sumido", "Você no controle"],
  },
  base: {
    title: "Ative sua agenda hoje. Se paga em menos de um mês.",
    lead: "Escaneia um QR Code, cadastra seus serviços e a MAISA assume o WhatsApp. Em cerca de 30 minutos está no ar, confirmando cliente por você.",
    image: imagensBarbeiros.hero,
    primary: { label: "Ativar minha agenda", href: cfg.ctaUrl, whats: true },
    secondary: { label: "Ver os planos", href: "#planos", whats: false },
    destaques: ["No ar em ~30 min", "Garantia de 1 mês", "Cancele quando quiser"],
  },
};

export interface HeroBarbeirosProps {
  nivel: Nivel;
  title?: React.ReactNode;
  lead?: React.ReactNode;
  image?: MktImagem;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** linha de confiança curta abaixo dos CTAs */
  destaques?: string[];
}

export function HeroBarbeiros({
  nivel,
  title,
  lead,
  image,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  destaques,
}: HeroBarbeirosProps) {
  const d = DEF[nivel];
  const img = image ?? d.image;

  const pHref = primaryHref ?? d.primary.href;
  const pWhats = primaryHref ? pHref.startsWith("http") : d.primary.whats;
  const pLabel = primaryLabel ?? d.primary.label;

  const sHref = secondaryHref ?? d.secondary.href;
  const sWhats = secondaryHref ? sHref.startsWith("http") : d.secondary.whats;
  const sLabel = secondaryLabel ?? d.secondary.label;

  const marks = destaques ?? d.destaques;

  return (
    <Section width="wide" style={{ paddingTop: "clamp(2.75rem, 6vw, 4.75rem)" }}>
      <div className="bb-hero-grid">
        {/* Coluna de texto */}
        <div>
          <Display size="2xl" className="mk-reveal" style={{ maxWidth: "16ch" }}>
            {title ?? d.title}
          </Display>

          <Lead className="mk-reveal" style={{ marginTop: "1.4rem", maxWidth: "52ch", animationDelay: "80ms" }}>
            {lead ?? d.lead}
          </Lead>

          <div
            className="mk-reveal"
            style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "0.85rem", animationDelay: "150ms" }}
          >
            <Button
              href={pHref}
              external={pWhats}
              variant="primary"
              size="lg"
              icon={pWhats ? "whatsapp" : "arrow"}
              iconRight={!pWhats}
            >
              {pLabel}
            </Button>
            <Button href={sHref} external={sWhats} variant="secondary" size="lg" icon={sWhats ? "whatsapp" : "none"}>
              {sLabel}
            </Button>
          </div>

          {marks.length > 0 ? (
            <ul
              className="mk-fade"
              style={{
                marginTop: "1.9rem",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem 1.15rem",
                animationDelay: "260ms",
              }}
            >
              {marks.map((m, i) => (
                <li key={i} style={s("display:inline-flex;align-items:center;gap:8px;font-family:var(--mk-font-body);font-size:0.92rem;color:var(--mk-ink-soft)")}>
                  <Icon name="check" size={15} sw={2.6} style={{ color: "var(--mk-accent-ink)" }} />
                  {m}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Coluna da imagem + selo de confirmação */}
        <div style={{ position: "relative" }}>
          <div
            className="mk-image-in"
            style={{
              position: "relative",
              borderRadius: "var(--mk-radius-lg)",
              overflow: "hidden",
              aspectRatio: "4 / 5",
              boxShadow: "var(--mk-shadow)",
            }}
          >
            <img
              src={img.url}
              alt={img.alt}
              loading="eager"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* leve escurecida na base para o selo respirar (não é glass decorativo) */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, transparent 55%, oklch(0.12 0.04 264 / 0.55) 100%)",
              }}
            />
          </div>

          <div
            className="mk-fade"
            style={{
              position: "absolute",
              left: "clamp(0.85rem, 2.5vw, 1.15rem)",
              bottom: "clamp(0.85rem, 2.5vw, 1.15rem)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.7rem",
              padding: "0.7rem 0.95rem",
              borderRadius: "12px",
              background: "var(--mk-bg-deep)",
              boxShadow: "var(--mk-shadow-soft)",
              animationDelay: "380ms",
            }}
          >
            <span style={s("width:34px;height:34px;border-radius:9px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-accent);color:var(--mk-cta-ink)")}>
              <Icon name="calendar-check" size={19} sw={2} />
            </span>
            <span style={{ display: "grid", lineHeight: 1.25 }}>
              <strong style={s("font-family:var(--mk-font-body);font-size:0.9rem;font-weight:800;color:var(--mk-ink)")}>
                Horário confirmado
              </strong>
              <span style={s("font-family:var(--mk-font-body);font-size:0.8rem;color:var(--mk-muted)")}>
                Sábado, 15h · pelo WhatsApp
              </span>
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}

import type { ReactNode } from "react";
import { Section, Display, Lead, Button } from "../primitives";
import { imagensTerapeutas, type MktImagem } from "../imagens";
import { ICPS, type Nivel } from "../icp";
import { TIcon, linkKind, type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * Hero (TERAPEUTAS) — abertura de página, variando por nível do funil.
 *  • topo  → emoção na DOR + no "depois"; CTA leve (leva ao MEIO).
 *  • meio  → consideração; CTA de intenção (WhatsApp) + ver planos.
 *  • base  → decisão; CTA forte (WhatsApp) + garantia.
 * Composição assimétrica: texto à esquerda, foto real à direita (poltrona/luz da
 * tarde) com um selo de prova sólido sobreposto. Server Component.
 * -------------------------------------------------------------------------- */

const cfg = ICPS.terapeutas;

interface HeroDefault {
  title: ReactNode;
  lead: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  note?: string;
  image: MktImagem;
  proof?: { titulo: string; detalhe: string };
}

const CONTEUDO: Record<Nivel, HeroDefault> = {
  topo: {
    title: (
      <>
        Suas notas fiscais em <em>um clique</em>. O dia que sumia todo mês volta pra você.
      </>
    ),
    lead: "A MAISA é uma assistente de IA no WhatsApp, com um painel de gestão organizado: ela emite a nota de cada paciente, cuida da agenda e guarda o histórico. Você cuida de quem atende; ela cuida do resto.",
    primaryLabel: "Ver como funciona",
    primaryHref: cfg.rotas.meio,
    secondaryLabel: "Falar no WhatsApp",
    secondaryHref: cfg.ctaUrl,
    note: "Sem planilha, sem secretária e sem precisar entender de tecnologia.",
    image: imagensTerapeutas.hero,
    proof: { titulo: "Notas do mês emitidas", detalhe: "Todos os pacientes · 1 clique" },
  },
  meio: {
    title: (
      <>
        Veja a MAISA tirar o operacional <em>das suas costas</em>.
      </>
    ),
    lead: "Do primeiro acesso ao fechamento do mês: notas, agenda, lembretes e o histórico de cada paciente, organizados por uma assistente de IA que fala a sua língua — no WhatsApp e num painel de gestão simples.",
    primaryLabel: cfg.ctaLabel,
    primaryHref: cfg.ctaUrl,
    secondaryLabel: "Ver planos e preços",
    secondaryHref: cfg.rotas.base,
    image: imagensTerapeutas.espacoArejado,
  },
  base: {
    title: (
      <>
        Comece hoje. No primeiro mês, a MAISA <em>já se paga</em>.
      </>
    ),
    lead: "Ative a MAISA — sua assistente de IA no WhatsApp, com painel de gestão — traga seus pacientes e deixe o operacional com ela. Notas em um clique, agenda em ordem, e a casa volta a ser casa.",
    primaryLabel: cfg.ctaLabel,
    primaryHref: cfg.ctaUrl,
    secondaryLabel: "Ver planos",
    secondaryHref: "#planos",
    note: "Se paga já no primeiro mês — ou seu dinheiro de volta.",
    image: imagensTerapeutas.salaAcolhedora,
  },
};

export interface HeroProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: ReactNode;
  lead?: ReactNode;
  primaryLabel?: string;
  primaryHref?: string;
  /** passe null para esconder o CTA secundário */
  secondaryLabel?: string | null;
  secondaryHref?: string;
  note?: string;
  image?: MktImagem;
  /** mostra o selo de prova sobre a foto (padrão: conforme o nível) */
  proof?: { titulo: string; detalhe: string } | null;
}

export function Hero({
  nivel = "topo",
  tone = "default",
  id,
  title,
  lead,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  note,
  image,
  proof,
}: HeroProps) {
  const d = CONTEUDO[nivel];
  const pHref = primaryHref ?? d.primaryHref;
  const pLabel = primaryLabel ?? d.primaryLabel;
  const pk = linkKind(pHref);
  const displaySize = nivel === "topo" ? "2xl" : "xl";

  const sLabel = secondaryLabel === null ? null : secondaryLabel ?? d.secondaryLabel;
  const sHref = secondaryHref ?? d.secondaryHref;
  const sk = sHref ? linkKind(sHref) : null;

  const img = image ?? d.image;
  const noteText = note ?? d.note;
  const proofData = proof === null ? null : proof ?? d.proof ?? null;

  return (
    <Section id={id} tone={tone} width="wide">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(2.25rem, 5vw, 4.75rem)",
        }}
      >
        {/* Coluna de texto */}
        <div className="mk-reveal" style={{ flex: "1.08 1 380px", minWidth: 0 }}>
          <Display as="h1" size={displaySize} style={{ maxWidth: "16ch" }}>
            {title ?? d.title}
          </Display>

          <Lead style={{ marginTop: "1.35rem", maxWidth: "46ch" }}>{lead ?? d.lead}</Lead>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.85rem",
            }}
          >
            <Button
              href={pHref}
              external={pk.external}
              variant="primary"
              size="lg"
              icon={pk.icon}
              iconRight={pk.iconRight}
            >
              {pLabel}
            </Button>
            {sLabel && sHref && sk ? (
              <Button
                href={sHref}
                external={sk.external}
                variant="secondary"
                size="lg"
                icon={sk.external ? "whatsapp" : "none"}
              >
                {sLabel}
              </Button>
            ) : null}
          </div>

          {noteText ? (
            <p
              style={{
                marginTop: "1.4rem",
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                fontFamily: "var(--mk-font-body)",
                fontSize: "0.94rem",
                lineHeight: 1.5,
                color: "var(--mk-muted)",
              }}
            >
              <span style={{ color: "var(--mk-accent-ink)", display: "inline-flex", flexShrink: 0 }}>
                <TIcon name="check" size={18} sw={2} />
              </span>
              {noteText}
            </p>
          ) : null}
        </div>

        {/* Coluna de imagem */}
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          <figure
            className="mk-image-in"
            style={{
              position: "relative",
              margin: 0,
              borderRadius: "var(--mk-radius-lg)",
              overflow: "hidden",
              aspectRatio: "5 / 6",
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
          </figure>

          {proofData ? (
            <div
              role="note"
              style={{
                position: "relative",
                zIndex: 1,
                marginTop: "-3.25rem",
                marginLeft: "clamp(0.75rem, 3vw, 1.5rem)",
                marginRight: "clamp(1.5rem, 6vw, 4rem)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: "0.85rem 1.1rem",
                background: "var(--mk-surface)",
                borderRadius: 14,
                boxShadow: "0 14px 34px oklch(0.42 0.06 260 / 0.20)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--mk-on-brand)",
                  background: "var(--mk-brand)",
                }}
              >
                <TIcon name="check" size={20} sw={2.2} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--mk-font-body)",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "var(--mk-ink)",
                  }}
                >
                  {proofData.titulo}
                </span>
                <span
                  style={{
                    fontFamily: "var(--mk-font-body)",
                    fontSize: "0.82rem",
                    color: "var(--mk-muted)",
                  }}
                >
                  {proofData.detalhe}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

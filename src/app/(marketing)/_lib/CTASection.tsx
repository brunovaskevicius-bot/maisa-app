import type { ReactNode } from "react";
import { ICPS, type ICP } from "./icp";
import { Button } from "./primitives";
import { imagensBarbeiros, imagensTerapeutas, type MktImagem } from "./imagens";

/* ----------------------------------------------------------------------------
 * CTASection — faixa de conversão reutilizável (aparece em todos os níveis do
 * funil). Banda com o clima do mundo (dourada nos barbeiros, navy nos
 * terapeutas). CTA principal = WhatsApp por padrão; secundário opcional avança
 * no funil. Imagem opcional (verificada) reforça o mundo físico.
 * Server Component; conteúdo 100% sobrescrevível pelas páginas.
 * -------------------------------------------------------------------------- */

const DEFAULT_IMG: Record<ICP, MktImagem> = {
  barbeiros: imagensBarbeiros.cadeira,
  terapeutas: imagensTerapeutas.salaAcolhedora,
};

const DEFAULTS: Record<ICP, { title: string; description: string }> = {
  barbeiros: {
    title: "Sua próxima semana já pode estar cheia.",
    description:
      "Escaneie um QR Code, cadastre seus serviços e deixe a MAISA confirmar, lembrar e recuperar cliente pelo WhatsApp. Em cerca de 30 minutos está no ar.",
  },
  terapeutas: {
    title: "Recupere o dia que some todo mês com as notas.",
    description:
      "A MAISA emite as notas de todos os pacientes, organiza a agenda e guarda o histórico de cada um. No segundo mês, é só clicar.",
  },
};

export function CTASection({
  icp,
  id,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondary = true,
  secondaryLabel,
  secondaryHref,
  image,
}: {
  icp: ICP;
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  primaryLabel?: string;
  primaryHref?: string;
  /** mostra o CTA secundário (padrão true) */
  secondary?: boolean;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** imagem lateral; passe `null` para banda só de texto (centrada) */
  image?: MktImagem | null;
}) {
  const cfg = ICPS[icp];
  const d = DEFAULTS[icp];

  const pHref = primaryHref ?? cfg.ctaUrl;
  const pLabel = primaryLabel ?? cfg.ctaLabel;
  const pExternal = pHref.startsWith("http");

  const sHref = secondaryHref ?? cfg.rotas.base;
  const sLabel = secondaryLabel ?? "Ver planos e preços";

  const img: MktImagem | null = image === null ? null : image ?? DEFAULT_IMG[icp];

  const hasImage = img !== null;

  return (
    <section
      id={id}
      style={{ background: "var(--mk-band-bg)", color: "var(--mk-band-ink)", paddingBlock: "var(--mk-section-y)" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "var(--mk-maxw-wide)",
          marginInline: "auto",
          paddingInline: "var(--mk-gutter)",
          display: "grid",
          gap: "clamp(2rem, 4.5vw, 4rem)",
          gridTemplateColumns: hasImage ? "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" : "minmax(0, 1fr)",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: hasImage ? "none" : "58ch", marginInline: hasImage ? undefined : "auto", textAlign: hasImage ? "left" : "center" }}>
          <h2
            className="mk-balance"
            style={{
              fontFamily: "var(--mk-font-display)",
              fontSize: "clamp(1.9rem, 4vw, 3.2rem)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "var(--mk-band-ink)",
            }}
          >
            {title ?? d.title}
          </h2>
          <p
            className="mk-pretty"
            style={{
              marginTop: "1.1rem",
              fontFamily: "var(--mk-font-body)",
              fontSize: "clamp(1.02rem, 1.4vw, 1.2rem)",
              lineHeight: 1.6,
              color: "var(--mk-band-muted)",
              maxWidth: "52ch",
              marginInline: hasImage ? "0" : "auto",
            }}
          >
            {description ?? d.description}
          </p>
          <div
            style={{
              marginTop: "1.9rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.85rem",
              justifyContent: hasImage ? "flex-start" : "center",
            }}
          >
            <Button href={pHref} external={pExternal} variant="band" size="lg" icon={pExternal ? "whatsapp" : "arrow"} iconRight={!pExternal}>
              {pLabel}
            </Button>
            {secondary ? (
              <Button href={sHref} variant="band-ghost" size="lg">
                {sLabel}
              </Button>
            ) : null}
          </div>
        </div>

        {hasImage ? (
          <div
            className="mk-image-in"
            style={{
              position: "relative",
              borderRadius: "var(--mk-radius-lg)",
              overflow: "hidden",
              aspectRatio: "4 / 3",
              boxShadow: "var(--mk-shadow)",
            }}
          >
            <img
              src={img.url}
              alt={img.alt}
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

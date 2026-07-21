import { Section, Heading, Text } from "../primitives";
import { imagensTerapeutas, type MktImagem } from "../imagens";
import { type Nivel } from "../icp";
import { type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * Depoimentos / Prova (TERAPEUTAS) — voz humana. Um depoimento em destaque
 * (aspas em serifa itálica, quente) com foto real + dois de apoio. meio = prova
 * na consideração; base = reforço calmo antes do preço. Server Component.
 * NOTA: depoimentos ilustrativos — substituir por reais antes de publicar.
 * -------------------------------------------------------------------------- */

export interface Depoimento {
  quote: string;
  nome: string;
  papel: string;
}

const DESTAQUE: Depoimento = {
  quote: "O fechamento do mês era o meu pesadelo. Agora eu clico uma vez e volto a ter meus domingos.",
  nome: "Marina Alves",
  papel: "Psicóloga clínica · São Paulo",
};

const APOIO: Depoimento[] = [
  {
    quote: "Nunca fui de tecnologia. Conversei no WhatsApp e, numa tarde, estava tudo organizado.",
    nome: "Renata Prado",
    papel: "Psicanalista",
  },
  {
    quote: "Meus pacientes recebem o lembrete e quase não tenho mais falta. O histórico de cada um fica à mão.",
    nome: "Camila Ferreira",
    papel: "Terapeuta",
  },
];

function iniciais(nome: string): string {
  const p = nome.split(/\s+/).filter(Boolean);
  return (((p[0] || "")[0] || "") + ((p[p.length - 1] || "")[0] || "")).toUpperCase();
}

function Avatar({ nome, size = 48 }: { nome: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--mk-font-body)",
        fontWeight: 700,
        fontSize: `${Math.round(size * 0.34)}px`,
        letterSpacing: "0.01em",
        color: "var(--mk-on-brand)",
        background: "var(--mk-brand)",
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

function Assinatura({ nome, papel, size }: { nome: string; papel: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
      <Avatar nome={nome} size={size} />
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontFamily: "var(--mk-font-body)", fontWeight: 700, color: "var(--mk-ink)" }}>{nome}</span>
        <span style={{ fontFamily: "var(--mk-font-body)", fontSize: "0.9rem", color: "var(--mk-muted)" }}>{papel}</span>
      </span>
    </div>
  );
}

export interface DepoimentosProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  destaque?: Depoimento;
  apoio?: Depoimento[];
  /** foto ao lado do depoimento em destaque. null esconde. */
  image?: MktImagem | null;
}

export function Depoimentos({
  nivel = "meio",
  tone = "default",
  id,
  title,
  destaque,
  apoio,
  image,
}: DepoimentosProps) {
  const enxuto = nivel === "base";
  const d = destaque ?? DESTAQUE;
  const listaApoio = apoio ?? APOIO;
  const img = image === null ? null : image ?? imagensTerapeutas.conversa;

  const heading = title ?? "Quem já respira melhor com a MAISA";

  return (
    <Section id={id} tone={tone}>
      <Heading style={{ maxWidth: "20ch" }}>{heading}</Heading>

      {/* Depoimento em destaque */}
      <figure
        style={{
          margin: "clamp(2rem, 4vw, 3rem) 0 0",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(1.75rem, 4vw, 3rem)",
          alignItems: "center",
        }}
      >
        <blockquote style={{ flex: "1.3 1 340px", minWidth: 0, margin: 0 }}>
          <p
            className="mk-balance"
            style={{
              fontFamily: "var(--mk-font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(1.5rem, 3vw, 2.35rem)",
              lineHeight: 1.28,
              letterSpacing: "-0.01em",
              color: "var(--mk-ink)",
              margin: 0,
            }}
          >
            “{d.quote}”
          </p>
          <figcaption style={{ marginTop: "1.6rem" }}>
            <Assinatura nome={d.nome} papel={d.papel} size={52} />
          </figcaption>
        </blockquote>

        {img ? (
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div
              style={{
                borderRadius: "var(--mk-radius-lg)",
                overflow: "hidden",
                aspectRatio: "4 / 5",
                boxShadow: "var(--mk-shadow-soft)",
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
          </div>
        ) : null}
      </figure>

      {/* Depoimentos de apoio */}
      {!enxuto && listaApoio.length ? (
        <div
          style={{
            marginTop: "clamp(2rem, 4vw, 3rem)",
            display: "grid",
            gap: "clamp(1.25rem, 3vw, 2rem)",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
          }}
        >
          {listaApoio.map((t) => (
            <figure
              key={t.nome}
              style={{
                margin: 0,
                padding: "clamp(1.4rem, 3vw, 1.9rem)",
                background: "var(--mk-surface)",
                border: "1px solid var(--mk-border)",
                borderRadius: "var(--mk-radius)",
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
              }}
            >
              <blockquote style={{ margin: 0 }}>
                <Text style={{ fontSize: "1.08rem", color: "var(--mk-ink)", lineHeight: 1.6 }}>“{t.quote}”</Text>
              </blockquote>
              <figcaption>
                <Assinatura nome={t.nome} papel={t.papel} size={44} />
              </figcaption>
            </figure>
          ))}
        </div>
      ) : enxuto && listaApoio.length ? (
        <div
          style={{
            marginTop: "clamp(2rem, 4vw, 2.75rem)",
            display: "grid",
            gap: "clamp(1.25rem, 3vw, 2rem)",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
          }}
        >
          {listaApoio.map((t) => (
            <figure key={t.nome} style={{ margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <blockquote style={{ margin: 0 }}>
                <Text style={{ fontSize: "1.05rem", color: "var(--mk-ink)", lineHeight: 1.6 }}>“{t.quote}”</Text>
              </blockquote>
              <figcaption>
                <Assinatura nome={t.nome} papel={t.papel} size={42} />
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

import type { ReactNode } from "react";
import { Section, Heading, Lead, Text } from "../primitives";
import { imagensTerapeutas, type MktImagem } from "../imagens";
import { type Nivel } from "../icp";
import { TIcon, IconBadge, type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * "O que você vai sentir" (TERAPEUTAS) — reforço honesto no lugar de depoimento.
 * A MAISA está começando, então NÃO inventamos nomes, fotos de rosto ou métricas
 * apresentadas como prova. Em vez disso, descrevemos com franqueza o que ela foi
 * feita para te devolver: uma promessa em destaque (serifa itálica, quente) ao
 * lado de uma cena real, e três sinais concretos do dia a dia. Server Component.
 * -------------------------------------------------------------------------- */

/** Um "sinal" concreto do que a rotina passa a ser — expectativa honesta, não
 *  depoimento fabricado. (Mantém o nome exportado do slot de prova social.) */
export interface Sinal {
  icon: string;
  titulo: string;
  texto: string;
}

const DESTAQUE_PADRAO: ReactNode = (
  <>
    Chegar ao fim do mês e emitir a nota de cada paciente em um só clique — e ter o
    domingo de volta, sem o trabalho invadindo a sua casa.
  </>
);

const SINAIS: Sinal[] = [
  {
    icon: "receipt",
    titulo: "O fim do mês sem pavor",
    texto:
      "As notas de todos os pacientes saem juntas, em um clique — no lugar do dia inteiro que elas costumavam levar.",
  },
  {
    icon: "chat",
    titulo: "Nada de tecnologia complicada",
    texto:
      "Você conversa no WhatsApp, do seu jeito, e a MAISA organiza a agenda e o histórico por trás.",
  },
  {
    icon: "calendar",
    titulo: "Mais presença, menos falta",
    texto:
      "Os lembretes chegam sozinhos aos seus pacientes, e o contexto de cada um fica à mão quando você senta para atender.",
  },
];

export interface DepoimentosProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  lead?: string;
  /** promessa em destaque (serifa itálica). */
  destaque?: ReactNode;
  /** sinais concretos do dia a dia. */
  sinais?: Sinal[];
  /** foto real ao lado da promessa. null esconde. */
  image?: MktImagem | null;
}

export function Depoimentos({
  nivel = "meio",
  tone = "default",
  id,
  title,
  lead,
  destaque,
  sinais,
  image,
}: DepoimentosProps) {
  const enxuto = nivel === "base";
  const d = destaque ?? DESTAQUE_PADRAO;
  const listaSinais = sinais ?? SINAIS;
  const img = image === null ? null : image ?? imagensTerapeutas.conversa;

  const heading = title ?? "O que você vai sentir com a MAISA";
  const leadText =
    lead ??
    "A MAISA foi desenhada para tirar o operacional das suas costas — para você chegar ao fim do mês sem o peso das notas. É isto que a sua rotina deve passar a ser.";

  return (
    <Section id={id} tone={tone}>
      <div style={{ maxWidth: "42ch", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
        <Heading>{heading}</Heading>
        <Lead style={{ marginTop: "1rem" }}>{leadText}</Lead>
      </div>

      {/* Promessa em destaque + cena real (sem rosto/nome inventado) */}
      <figure
        style={{
          margin: 0,
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
            {d}
          </p>
          <figcaption
            style={{
              marginTop: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              fontFamily: "var(--mk-font-body)",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--mk-ink-soft)",
            }}
          >
            <span style={{ color: "var(--mk-brand)", display: "inline-flex", flexShrink: 0 }}>
              <TIcon name="heart" size={19} sw={1.9} />
            </span>
            A rotina que a MAISA foi feita para te devolver
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

      {/* Sinais concretos — lista editorial (não cartões idênticos): filete no topo,
          selo de ícone, título e texto. Some no nível base para um fecho mais calmo. */}
      {!enxuto && listaSinais.length ? (
        <ul
          style={{
            listStyle: "none",
            margin: "clamp(2.25rem, 4.5vw, 3.25rem) 0 0",
            padding: 0,
            display: "grid",
            gap: "clamp(1.25rem, 3vw, 2rem)",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
          }}
        >
          {listaSinais.map((sig) => (
            <li
              key={sig.titulo}
              style={{
                minWidth: 0,
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--mk-line)",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <IconBadge>
                <TIcon name={sig.icon} size={22} />
              </IconBadge>
              <h3
                style={{
                  fontFamily: "var(--mk-font-display)",
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  color: "var(--mk-ink)",
                  margin: 0,
                }}
              >
                {sig.titulo}
              </h3>
              <Text style={{ color: "var(--mk-ink-soft)", lineHeight: 1.55 }}>{sig.texto}</Text>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

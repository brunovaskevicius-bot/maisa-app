"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Heading, Lead } from "../primitives";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * Peças internas compartilhadas pelas seções do mundo BARBEIROS. NÃO são
 * exportadas na API pública (o barrel exporta só as seções). Ficam aqui para
 * padronizar cabeçalho de seção, ícone de check e a fileira de estrelas.
 * Client Component: usa o helper s() e o <Icon> do app (ambos "use client").
 * -------------------------------------------------------------------------- */

/** Cabeçalho de seção. SEM eyebrow por padrão — evita o kicker repetido acima de
 *  toda seção (banido como scaffolding). O peso vem do título display do mundo. */
export function SectionHead({
  title,
  lead,
  align = "start",
  leadMaxw = "46ch",
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "start" | "center";
  leadMaxw?: string;
}) {
  const center = align === "center";
  return (
    <div
      style={{
        maxWidth: center ? "60ch" : undefined,
        marginInline: center ? "auto" : undefined,
        textAlign: center ? "center" : undefined,
      }}
    >
      <Heading>{title}</Heading>
      {lead ? (
        <Lead style={{ marginTop: "1.05rem", maxWidth: leadMaxw, marginInline: center ? "auto" : undefined }}>
          {lead}
        </Lead>
      ) : null}
    </div>
  );
}

/** Selo de check dourado (usado em listas de "depois" e nos planos). */
export function CheckMark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={s(
        `flex-shrink:0;width:${size}px;height:${size}px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:color-mix(in oklch, var(--mk-accent) 22%, transparent);color:var(--mk-accent-ink)`,
      )}
    >
      <Icon name="check" size={Math.round(size * 0.62)} sw={2.4} />
    </span>
  );
}

/** Fileira de estrelas cheias (prova). role/aria comunicam a nota real. */
export function Stars({ n = 5 }: { n?: number }) {
  return (
    <span
      role="img"
      aria-label={`${n} de 5 estrelas`}
      style={s("display:inline-flex;gap:3px;color:var(--mk-accent)")}
    >
      {Array.from({ length: n }).map((_, i) => (
        <Icon key={i} name="star" size={16} sw={0} stroke="none" style={{ fill: "currentColor" }} />
      ))}
    </span>
  );
}

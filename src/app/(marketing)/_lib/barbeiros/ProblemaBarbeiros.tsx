"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Section } from "../primitives";
import { imagensBarbeiros, type MktImagem } from "../imagens";
import { SectionHead } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * ProblemaBarbeiros — a dor do público (agenda volátil, no-show, cliente que
 * some, parar no meio do corte). Variante "completo" (topo, com foto e 4 dores)
 * e "resumido" (meio, 3 dores compactas, sem foto). As dores são uma lista
 * editorial com hairlines — NÃO um grid de cards idênticos.
 * -------------------------------------------------------------------------- */

interface Dor {
  icon: string;
  titulo: string;
  texto: string;
}

const DORES: Dor[] = [
  {
    icon: "bell",
    titulo: "No-show sem aviso",
    texto: "Marcou e não apareceu. Ninguém confirmou no dia anterior, e aquele horário simplesmente morreu.",
  },
  {
    icon: "user",
    titulo: "Cliente que some",
    texto: "Faz três meses que ele não volta e você nem percebeu — sem ninguém pra chamar de volta, ele vira cliente de outro.",
  },
  {
    icon: "scissors",
    titulo: "Largar a tesoura pelo zap",
    texto: "O celular apita no meio do corte. Você para, responde, perde o ritmo — e ainda esquece de marcar direito.",
  },
  {
    icon: "clock",
    titulo: "Agenda no escuro",
    texto: "Você não sabe quantos vêm amanhã. O dia pode lotar ou render metade, e não dá pra planejar nada.",
  },
];

export interface ProblemaBarbeirosProps {
  variant?: "completo" | "resumido";
  id?: string;
  image?: MktImagem;
}

export function ProblemaBarbeiros({ variant = "completo", id, image }: ProblemaBarbeirosProps) {
  const resumido = variant === "resumido";
  const dores = resumido ? DORES.slice(0, 3) : DORES;
  const img = image ?? imagensBarbeiros.cadeira;

  const lista = (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {dores.map((dor, i) => (
        <li
          key={dor.titulo}
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            gap: "1rem",
            alignItems: "start",
            paddingBlock: "clamp(1.05rem, 2.2vw, 1.35rem)",
            borderTop: i === 0 ? "none" : "1px solid var(--mk-line)",
          }}
        >
          <span style={s("width:42px;height:42px;border-radius:11px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-panel-2);color:var(--mk-ink-soft)")}>
            <Icon name={dor.icon} size={21} sw={1.9} />
          </span>
          <span style={{ display: "grid", gap: "0.3rem" }}>
            <strong style={s("font-family:var(--mk-font-display);font-weight:800;font-size:1.12rem;letter-spacing:-0.02em;color:var(--mk-ink)")}>
              {dor.titulo}
            </strong>
            <span style={s("font-family:var(--mk-font-body);font-size:0.98rem;line-height:1.6;color:var(--mk-ink-soft)")} className="mk-pretty">
              {dor.texto}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );

  const head = (
    <SectionHead
      title={resumido ? "A cadeira vazia custa caro." : "Cadeira vazia é dinheiro que não volta."}
      lead={
        resumido
          ? "Enquanto o operacional te puxa pra fora do corte, o faturamento escorre pelo ralo."
          : "Todo horário perdido é um corte que não aconteceu. E quase sempre a culpa é do que rouba a sua atenção enquanto você está de tesoura na mão."
      }
    />
  );

  if (resumido) {
    return (
      <Section id={id} width="default">
        <div style={{ maxWidth: "56ch", marginBottom: "clamp(1.75rem, 4vw, 2.75rem)" }}>{head}</div>
        <div style={{ maxWidth: "760px" }}>{lista}</div>
      </Section>
    );
  }

  return (
    <Section id={id} width="wide">
      <div className="bb-split">
        <div
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
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div>
          <div style={{ marginBottom: "clamp(1.5rem, 3.5vw, 2.25rem)" }}>{head}</div>
          {lista}
        </div>
      </div>
    </Section>
  );
}

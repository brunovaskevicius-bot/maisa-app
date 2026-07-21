"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Section } from "../primitives";
import { imagensBarbeiros, type MktImagem } from "../imagens";
import { SectionHead } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * RecursosBarbeiros — o que a MAISA faz. Um recurso-âncora em destaque (foto +
 * copy) e os demais numa lista de duas colunas SEM chrome de card (evita o grid
 * de cards idênticos). Variante "completo" (meio) e "resumido" (base, 4 itens,
 * sem o destaque com foto). Ancora em #recursos (link da nav).
 * -------------------------------------------------------------------------- */

interface Recurso {
  icon: string;
  titulo: string;
  texto: string;
}

const RECURSOS: Recurso[] = [
  {
    icon: "refresh",
    titulo: "Recupera cliente sumido",
    texto: "Dispara mensagem pra quem não volta há semanas, com a sua oferta. A cadeira enche com quem já é seu.",
  },
  {
    icon: "calendar",
    titulo: "Agenda que se organiza",
    texto: "Oferece o melhor horário, remarca e evita buraco entre um corte e outro.",
  },
  {
    icon: "chat",
    titulo: "Responde na hora, 24h",
    texto: "Cliente manda mensagem à meia-noite e já sai com horário. Ninguém fica no vácuo.",
  },
  {
    icon: "receipt",
    titulo: "Nota fiscal para PJ",
    texto: "Virou PJ? A MAISA emite a nota de cada atendimento sem você abrir portal nenhum.",
  },
  {
    icon: "user",
    titulo: "Ficha do cliente",
    texto: "Histórico, preferências e quando ele costuma voltar — tudo à mão pra atender melhor.",
  },
];

export interface RecursosBarbeirosProps {
  variant?: "completo" | "resumido";
  id?: string;
  image?: MktImagem;
}

export function RecursosBarbeiros({ variant = "completo", id = "recursos", image }: RecursosBarbeirosProps) {
  const resumido = variant === "resumido";
  const img = image ?? imagensBarbeiros.corte;
  const lista = resumido ? RECURSOS.slice(0, 4) : RECURSOS;

  return (
    <Section id={id} width="wide">
      <div style={{ maxWidth: "58ch", marginBottom: "clamp(2rem, 4.5vw, 3.25rem)" }}>
        <SectionHead
          title="Tudo que uma secretária faria — sem contratar ninguém."
          lead="A MAISA cuida do WhatsApp e da agenda de ponta a ponta. Você só faz o que ninguém faz igual: cortar."
        />
      </div>

      {!resumido ? (
        <div className="bb-split" style={{ marginBottom: "clamp(2.25rem, 4.5vw, 3.25rem)" }}>
          <div style={{ order: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.9rem" }}>
              <span style={s("width:44px;height:44px;border-radius:12px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-accent);color:var(--mk-cta-ink)")}>
                <Icon name="calendar-check" size={23} sw={2} />
              </span>
              <span style={s("font-family:var(--mk-font-body);font-size:0.82rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--mk-accent-ink)")}>
                O que mais enche a agenda
              </span>
            </div>
            <h3 style={s("font-family:var(--mk-font-display);font-weight:800;font-size:clamp(1.5rem,3vw,2.1rem);letter-spacing:-0.03em;line-height:1.08;color:var(--mk-ink)")}>
              Confirmação e lembrete automáticos
            </h3>
            <p className="mk-pretty" style={s("margin-top:0.9rem;font-family:var(--mk-font-body);font-size:1.08rem;line-height:1.62;color:var(--mk-ink-soft);max-width:48ch")}>
              A MAISA confirma o horário quando o cliente marca e manda o lembrete no dia anterior. É o que mais derruba
              o no-show — sem você mexer no celular uma vez sequer.
            </p>
            <ul style={{ listStyle: "none", margin: "1.4rem 0 0", padding: 0, display: "grid", gap: "0.65rem" }}>
              {["Confirma na hora que o cliente agenda", "Lembra um dia antes, no WhatsApp", "Reoferece o horário se alguém desmarcar"].map((t) => (
                <li key={t} style={s("display:flex;align-items:center;gap:0.65rem;font-family:var(--mk-font-body);font-size:0.98rem;color:var(--mk-ink-soft)")}>
                  <Icon name="check" size={17} sw={2.6} style={{ color: "var(--mk-accent-ink)", flexShrink: 0 }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div
            style={{
              order: 2,
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
        </div>
      ) : null}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "clamp(0.25rem, 2vw, 0.5rem) clamp(1.5rem, 4vw, 3rem)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
          borderTop: "1px solid var(--mk-line)",
        }}
      >
        {lista.map((r) => (
          <li
            key={r.titulo}
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              gap: "0.95rem",
              alignItems: "start",
              paddingBlock: "clamp(1.15rem, 2.4vw, 1.5rem)",
              borderBottom: "1px solid var(--mk-line)",
            }}
          >
            <span style={s("width:42px;height:42px;border-radius:11px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-panel-2);color:var(--mk-accent-ink)")}>
              <Icon name={r.icon} size={21} sw={1.9} />
            </span>
            <span style={{ display: "grid", gap: "0.3rem" }}>
              <strong style={s("font-family:var(--mk-font-display);font-weight:800;font-size:1.12rem;letter-spacing:-0.02em;color:var(--mk-ink)")}>
                {r.titulo}
              </strong>
              <span className="mk-pretty" style={s("font-family:var(--mk-font-body);font-size:0.96rem;line-height:1.58;color:var(--mk-ink-soft)")}>
                {r.texto}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

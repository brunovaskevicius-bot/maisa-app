"use client";
import React from "react";
import { s } from "@/lib/ui";
import { Section } from "../primitives";
import { SectionHead, Stars } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * DepoimentosBarbeiros — prova social. Um depoimento-âncora em citação grande e
 * dois de apoio, com tratamentos DIFERENTES (não cards idênticos). Variante
 * "completo" (meio: 1 âncora + 2 apoios) e "resumido" (base: 1 âncora + 1 apoio).
 * Depoimentos ilustrativos — troque por reais antes de publicar.
 * -------------------------------------------------------------------------- */

interface Depo {
  quote: string;
  nome: string;
  papel: string;
}

const ANCORA: Depo = {
  quote:
    "Eu vivia largando a tesoura pra responder no zap. Agora a MAISA confirma tudo sozinha e minha sexta lota antes de quarta. Foi a primeira coisa que realmente me deu tempo.",
  nome: "Diego Ramos",
  papel: "Barbearia Navalha · São Paulo, SP",
};

const APOIOS: Depo[] = [
  {
    quote: "O no-show caiu quase pela metade. O lembrete do dia anterior salva meu faturamento toda semana.",
    nome: "Rafael Nunes",
    papel: "RN Cortes · Belo Horizonte, MG",
  },
  {
    quote: "Recuperei um monte de cliente que tinha sumido. Foi só disparar a mensagem e a cadeira encheu.",
    nome: "Thiago Alves",
    papel: "Studio T · Curitiba, PR",
  },
];

function Assinatura({ nome, papel }: { nome: string; papel: string }) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={s("width:44px;height:44px;border-radius:12px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-panel-2);color:var(--mk-accent-ink);font-family:var(--mk-font-display);font-weight:800;font-size:1rem")}>
        {iniciais}
      </span>
      <span style={{ display: "grid", lineHeight: 1.3 }}>
        <strong style={s("font-family:var(--mk-font-body);font-size:0.98rem;font-weight:800;color:var(--mk-ink)")}>{nome}</strong>
        <span style={s("font-family:var(--mk-font-body);font-size:0.86rem;color:var(--mk-muted)")}>{papel}</span>
      </span>
    </div>
  );
}

export interface DepoimentosBarbeirosProps {
  variant?: "completo" | "resumido";
  id?: string;
}

export function DepoimentosBarbeiros({ variant = "completo", id }: DepoimentosBarbeirosProps) {
  const resumido = variant === "resumido";
  const apoios = resumido ? APOIOS.slice(0, 1) : APOIOS;

  return (
    <Section id={id} tone="deep" width="wide">
      <div style={{ maxWidth: "54ch", marginBottom: "clamp(2rem, 4.5vw, 3rem)" }}>
        <SectionHead
          title="Quem já vive de cadeira cheia."
          lead="Barbeiros que trocaram o zap no meio do corte por uma agenda que se resolve sozinha."
        />
      </div>

      {/* Depoimento-âncora — citação grande */}
      <figure style={{ margin: 0, maxWidth: "900px" }}>
        <Stars n={5} />
        <blockquote style={{ margin: "1rem 0 0" }}>
          <p style={s("font-family:var(--mk-font-display);font-weight:700;font-size:clamp(1.35rem,3.2vw,2.05rem);line-height:1.28;letter-spacing:-0.02em;color:var(--mk-ink)")} className="mk-balance">
            “{ANCORA.quote}”
          </p>
        </blockquote>
        <figcaption style={{ marginTop: "1.5rem" }}>
          <Assinatura nome={ANCORA.nome} papel={ANCORA.papel} />
        </figcaption>
      </figure>

      {/* Apoios — tratamento menor, em painel */}
      <div
        style={{
          marginTop: "clamp(2.25rem, 4.5vw, 3.25rem)",
          display: "grid",
          gap: "clamp(1rem, 2.5vw, 1.5rem)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
        }}
      >
        {apoios.map((dep) => (
          <figure
            key={dep.nome}
            style={{
              margin: 0,
              background: "var(--mk-panel)",
              border: "1px solid var(--mk-line)",
              borderRadius: "var(--mk-radius-lg)",
              padding: "clamp(1.35rem, 2.6vw, 1.75rem)",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
            }}
          >
            <Stars n={5} />
            <blockquote style={{ margin: 0, flexGrow: 1 }}>
              <p className="mk-pretty" style={s("font-family:var(--mk-font-body);font-size:1.05rem;line-height:1.55;color:var(--mk-ink-soft)")}>
                “{dep.quote}”
              </p>
            </blockquote>
            <figcaption>
              <Assinatura nome={dep.nome} papel={dep.papel} />
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

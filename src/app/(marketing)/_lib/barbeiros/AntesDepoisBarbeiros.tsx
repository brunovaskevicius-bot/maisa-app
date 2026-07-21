"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Section } from "../primitives";
import { SectionHead, CheckMark } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * AntesDepoisBarbeiros — o Diagrama T da transformação. Dois painéis distintos
 * (não cards idênticos): ANTES é chapado e apagado (o problema); DEPOIS é
 * elevado e dourado (a aspiração), com uma seta conectando os dois. Variante
 * "aspiracional" (topo, foco no sonho) e "pragmatico" (meio, foco na rotina).
 * -------------------------------------------------------------------------- */

const ANTES: string[] = [
  "Larga a tesoura pra responder o zap",
  "Cadeira vazia sem ninguém avisar",
  "Cliente some e ninguém percebe",
  "Agenda só na cabeça, no escuro",
  "Nota fiscal e mensagem viram madrugada",
];

const DEPOIS: string[] = [
  "Foco total no corte, sem interrupção",
  "Confirmação e lembrete no automático",
  "Cliente sumido volta sozinho",
  "Agenda cheia e visível no painel",
  "Casa é casa — o trabalho fica na barbearia",
];

export interface AntesDepoisBarbeirosProps {
  variant?: "aspiracional" | "pragmatico";
  id?: string;
}

export function AntesDepoisBarbeiros({ variant = "aspiracional", id }: AntesDepoisBarbeirosProps) {
  const aspiracional = variant === "aspiracional";

  return (
    <Section id={id} width="wide">
      <div style={{ maxWidth: "58ch", marginBottom: "clamp(2rem, 4.5vw, 3.25rem)" }}>
        <SectionHead
          title={aspiracional ? "O mesmo dia, com o dobro de corte." : "O que muda na sua rotina, na prática."}
          lead={
            aspiracional
              ? "Não é trabalhar mais — é parar de fazer o que rouba o seu tempo. A MAISA assume o operacional e devolve o dia pra você faturar."
              : "A tesoura é a mesma; o que sai da sua frente é o operacional. Veja lado a lado o antes e o depois."
          }
        />
      </div>

      <div className="bb-tgrid">
        {/* ANTES — apagado, chapado */}
        <div
          style={{
            background: "var(--mk-panel)",
            border: "1px solid var(--mk-line)",
            borderRadius: "var(--mk-radius-lg)",
            padding: "clamp(1.5rem, 3vw, 2.1rem)",
          }}
        >
          <span style={s("display:inline-block;font-family:var(--mk-font-body);font-size:0.78rem;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--mk-muted)")}>
            Antes
          </span>
          <ul style={{ listStyle: "none", margin: "1.15rem 0 0", padding: 0, display: "grid", gap: "0.95rem" }}>
            {ANTES.map((t) => (
              <li key={t} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "0.75rem", alignItems: "start" }}>
                <span aria-hidden="true" style={s("flex-shrink:0;width:22px;height:22px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-panel-2);color:var(--mk-muted)")}>
                  <Icon name="x" size={13} sw={2.4} />
                </span>
                <span style={s("font-family:var(--mk-font-body);font-size:1rem;line-height:1.5;color:var(--mk-muted)")}>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* seta conectora */}
        <div className="bb-arrow" aria-hidden="true">
          <span style={s("width:52px;height:52px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-accent);color:var(--mk-cta-ink);box-shadow:var(--mk-shadow-soft)")}>
            <Icon name="arrow-right" size={26} sw={2.2} />
          </span>
        </div>

        {/* DEPOIS — elevado, dourado */}
        <div
          style={{
            background: "var(--mk-panel-2)",
            borderRadius: "var(--mk-radius-lg)",
            padding: "clamp(1.5rem, 3vw, 2.1rem)",
            boxShadow: "var(--mk-shadow)",
          }}
        >
          <span style={s("display:inline-block;font-family:var(--mk-font-body);font-size:0.78rem;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--mk-accent-ink)")}>
            Depois
          </span>
          <ul style={{ listStyle: "none", margin: "1.15rem 0 0", padding: 0, display: "grid", gap: "0.95rem" }}>
            {DEPOIS.map((t) => (
              <li key={t} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "0.75rem", alignItems: "start" }}>
                <CheckMark size={22} />
                <span style={s("font-family:var(--mk-font-body);font-size:1rem;line-height:1.5;color:var(--mk-ink)")}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

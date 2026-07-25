"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Section } from "../primitives";
import { SectionHead } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * DepoimentosBarbeiros — em vez de prova social fabricada (nomes e números que
 * não existem), esta seção fala HONESTAMENTE do que muda na semana do barbeiro:
 * linguagem de expectativa, descrevendo o que a MAISA passa a fazer no lugar
 * dele. Uma afirmação-âncora em destaque + frentes de apoio (não depoimentos com
 * nome). Variante "completo" (meio: âncora + 2 frentes) e "resumido" (base: 1).
 * -------------------------------------------------------------------------- */

interface Mudanca {
  icon: string;
  titulo: string;
  texto: string;
}

const APOIOS: Mudanca[] = [
  {
    icon: "bell",
    titulo: "Menos horário morrendo à toa",
    texto:
      "A confirmação na hora e o lembrete na véspera existem justamente pra derrubar o no-show que hoje esvazia a sua cadeira — sem você cobrar ninguém na unha.",
  },
  {
    icon: "refresh",
    titulo: "Cliente sumido de volta",
    texto:
      "Uma mensagem em massa pra quem não aparece há semanas basta pra reencher os horários com quem já conhece o seu corte.",
  },
];

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
          title="O que muda na sua semana."
          lead="Sem promessa de número mágico — é o operacional saindo da sua frente. Veja o que a MAISA passa a fazer no seu lugar assim que entra no ar."
        />
      </div>

      {/* Afirmação-âncora — o que muda no dia (expectativa, não citação com nome) */}
      <div style={{ maxWidth: "900px" }}>
        <span
          aria-hidden="true"
          style={s(
            "width:46px;height:46px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-accent);color:var(--mk-cta-ink)",
          )}
        >
          <Icon name="calendar-check" size={25} sw={2} />
        </span>
        <p
          className="mk-balance"
          style={s(
            "margin:1.15rem 0 0;font-family:var(--mk-font-display);font-weight:700;font-size:clamp(1.35rem,3.2vw,2.05rem);line-height:1.28;letter-spacing:-0.02em;color:var(--mk-ink)",
          )}
        >
          Você passa o dia de tesoura na mão. A agenda se confirma sozinha, lembra o cliente na véspera e chama de
          volta quem sumiu — tudo pelo WhatsApp, sem parar o corte.
        </p>
      </div>

      {/* Frentes de apoio — o que esperar em cada ponto (benefício verdadeiro) */}
      <div
        style={{
          marginTop: "clamp(2.25rem, 4.5vw, 3.25rem)",
          display: "grid",
          gap: "clamp(1rem, 2.5vw, 1.5rem)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
        }}
      >
        {apoios.map((m) => (
          <div
            key={m.titulo}
            style={{
              background: "var(--mk-panel)",
              border: "1px solid var(--mk-line)",
              borderRadius: "var(--mk-radius-lg)",
              padding: "clamp(1.35rem, 2.6vw, 1.75rem)",
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
          >
            <span
              aria-hidden="true"
              style={s(
                "width:42px;height:42px;border-radius:11px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:var(--mk-panel-2);color:var(--mk-accent-ink)",
              )}
            >
              <Icon name={m.icon} size={21} sw={1.9} />
            </span>
            <strong style={s("font-family:var(--mk-font-display);font-weight:800;font-size:1.18rem;letter-spacing:-0.02em;color:var(--mk-ink)")}>
              {m.titulo}
            </strong>
            <p className="mk-pretty" style={s("margin:0;font-family:var(--mk-font-body);font-size:1rem;line-height:1.58;color:var(--mk-ink-soft)")}>
              {m.texto}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

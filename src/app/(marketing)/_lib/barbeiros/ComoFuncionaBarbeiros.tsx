"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Section, Button } from "../primitives";
import { ICPS } from "../icp";
import { SectionHead } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * ComoFuncionaBarbeiros — os passos reais de setup e operação, numa timeline
 * vertical conectada (os números são uma SEQUÊNCIA de verdade, não scaffolding
 * decorativo). Variante "completo" (meio, 4 passos + CTA) e "resumido" (base,
 * 3 passos, sem CTA — a página base já tem os seus próprios botões).
 * -------------------------------------------------------------------------- */

const cfg = ICPS.barbeiros;

interface Passo {
  icon: string;
  titulo: string;
  texto: string;
}

const PASSOS: Passo[] = [
  {
    icon: "whatsapp",
    titulo: "Escaneie o QR Code",
    texto: "Aponta a câmera e conecta a MAISA ao seu WhatsApp. Nada pra instalar, nada de número novo pro cliente decorar.",
  },
  {
    icon: "scissors",
    titulo: "Cadastre serviços e horários",
    texto: "Corte, barba, combo, seus horários e as perguntas que mais te fazem. Leva cerca de 30 minutos, uma vez só.",
  },
  {
    icon: "bot",
    titulo: "A MAISA assume o WhatsApp",
    texto: "Ela responde, agenda, confirma e lembra cada cliente — 24 horas por dia, no seu tom, sem te interromper.",
  },
  {
    icon: "trending-up",
    titulo: "A agenda enche enquanto você corta",
    texto: "Você foca no corte; a cadeira não fica vazia, o no-show despenca e o cliente sumido volta sozinho.",
  },
];

const RESUMO: Passo[] = [
  {
    icon: "whatsapp",
    titulo: "Conecta em um QR Code",
    texto: "A MAISA entra no seu WhatsApp em minutos, sem instalar nada.",
  },
  {
    icon: "scissors",
    titulo: "Cadastra seus serviços",
    texto: "Serviços, horários e respostas. Cerca de 30 minutos, uma vez só.",
  },
  {
    icon: "trending-up",
    titulo: "Deixa a agenda rodar",
    texto: "Ela confirma, lembra e recupera cliente enquanto você atende.",
  },
];

export interface ComoFuncionaBarbeirosProps {
  variant?: "completo" | "resumido";
  id?: string;
}

export function ComoFuncionaBarbeiros({ variant = "completo", id }: ComoFuncionaBarbeirosProps) {
  const resumido = variant === "resumido";
  const passos = resumido ? RESUMO : PASSOS;

  return (
    <Section id={id} tone="panel" width="default">
      <div style={{ maxWidth: "58ch", marginBottom: "clamp(2rem, 4.5vw, 3.25rem)" }}>
        <SectionHead
          title={resumido ? "No ar em três passos." : "Do QR Code à agenda cheia, sem mistério."}
          lead={
            resumido
              ? "Sem técnico, sem planilha, sem curva de aprendizado. Se você usa WhatsApp, você usa a MAISA."
              : "Você não precisa entender de tecnologia. É rápido de ligar e, a partir daí, trabalha por você todos os dias."
          }
        />
      </div>

      <ol className="bb-steps" style={{ maxWidth: "760px" }}>
        {passos.map((passo, i) => (
          <li key={passo.titulo} className="bb-step">
            <div className="bb-node" aria-hidden="true">
              {i + 1}
            </div>
            <div style={{ paddingTop: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                <Icon name={passo.icon} size={20} sw={1.9} style={{ color: "var(--mk-accent-ink)" }} />
                <h3 style={s("font-family:var(--mk-font-display);font-weight:800;font-size:clamp(1.15rem,1.9vw,1.4rem);letter-spacing:-0.025em;color:var(--mk-ink)")}>
                  {passo.titulo}
                </h3>
              </div>
              <p className="mk-pretty" style={s("font-family:var(--mk-font-body);font-size:1rem;line-height:1.65;color:var(--mk-ink-soft);max-width:52ch")}>
                {passo.texto}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {!resumido ? (
        <div style={{ marginTop: "clamp(2.25rem, 4.5vw, 3rem)", display: "flex", flexWrap: "wrap", gap: "0.85rem" }}>
          <Button href={cfg.ctaUrl} external variant="primary" size="lg" icon="whatsapp">
            {cfg.ctaLabel}
          </Button>
          <Button href={cfg.rotas.base} variant="secondary" size="lg">
            Ver planos e preços
          </Button>
        </div>
      ) : null}
    </Section>
  );
}

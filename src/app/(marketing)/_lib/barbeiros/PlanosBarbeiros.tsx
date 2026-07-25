"use client";
import React from "react";
import { s, Icon } from "@/lib/ui";
import { Section, Button } from "../primitives";
import { ICPS, whatsappUrl } from "../icp";
import { SectionHead } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * PlanosBarbeiros — os planos (nível base). O plano recomendado é DOMINANTE
 * (elevado por sombra, etiqueta dourada), os outros são chapados com borda —
 * nunca borda + sombra no mesmo card. Sem side-stripe, raio 14–18px. Garantia
 * e setup rápido logo abaixo. Preços editáveis no array PLANOS.
 * -------------------------------------------------------------------------- */

const cfg = ICPS.barbeiros;

/* Mensagem de WhatsApp por plano — leva o NOME do plano pré-preenchido, pra
 * conversa já começar no contexto certo (não a mesma mensagem genérica em todos
 * os cards). Usa o helper único whatsappUrl (número/encode em ponto único). */
function mensagemPlano(nome: string): string {
  return `Oi! Tenho uma barbearia e quero ativar a MAISA no plano ${nome}. Como começo?`;
}

interface Plano {
  nome: string;
  preco: string;
  cadencia: string;
  resumo: string;
  itens: string[];
  destaque?: boolean;
  ctaLabel: string;
  ctaHref: string;
  ctaWhats: boolean;
}

const PLANOS: Plano[] = [
  {
    nome: "Essencial",
    preco: "R$ 97",
    cadencia: "/mês",
    resumo: "Pra encher a agenda e matar o no-show.",
    itens: ["Agenda pelo WhatsApp", "Confirmação automática", "Lembrete anti no-show", "Painel de horários"],
    ctaLabel: "Começar com o Essencial",
    ctaHref: whatsappUrl(mensagemPlano("Essencial")),
    ctaWhats: true,
  },
  {
    nome: "Profissional",
    preco: "R$ 147",
    cadencia: "/mês",
    resumo: "O favorito de quem quer escalar a cadeira.",
    itens: [
      "Tudo do Essencial",
      "Recuperação de cliente sumido",
      "Mensagens em massa",
      "Ficha do cliente (CRM)",
      "Relatórios da agenda",
    ],
    destaque: true,
    ctaLabel: cfg.ctaLabel,
    ctaHref: whatsappUrl(mensagemPlano("Profissional")),
    ctaWhats: true,
  },
  {
    nome: "Completo",
    preco: "R$ 197",
    cadencia: "/mês",
    resumo: "Pra barbearia com equipe e nota fiscal.",
    itens: ["Tudo do Profissional", "Nota fiscal para PJ", "Agenda por profissional", "Prioridade no suporte"],
    ctaLabel: "Falar sobre o Completo",
    ctaHref: whatsappUrl(mensagemPlano("Completo")),
    ctaWhats: true,
  },
];

const GARANTIAS: { icon: string; texto: string }[] = [
  { icon: "clock", texto: "No ar em cerca de 30 minutos" },
  { icon: "refresh", texto: "Se não se pagar no 1º mês, a gente devolve" },
  { icon: "check", texto: "Sem fidelidade — cancele quando quiser" },
];

export interface PlanosBarbeirosProps {
  id?: string;
}

export function PlanosBarbeiros({ id = "planos" }: PlanosBarbeirosProps) {
  return (
    <Section id={id} width="wide">
      <div style={{ maxWidth: "56ch", marginBottom: "clamp(2rem, 4.5vw, 3rem)" }}>
        <SectionHead
          title="Um plano que se paga na primeira semana cheia."
          lead="Escolha pelo tamanho da sua operação. Todos incluem o setup guiado e começam a confirmar cliente no mesmo dia."
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: "clamp(1rem, 2.5vw, 1.5rem)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
          alignItems: "stretch",
        }}
      >
        {PLANOS.map((plano) => {
          const destaque = !!plano.destaque;
          const cardStyle: React.CSSProperties = destaque
            ? {
                background: "var(--mk-panel-2)",
                borderRadius: "var(--mk-radius-lg)",
                boxShadow: "var(--mk-shadow)",
              }
            : {
                background: "var(--mk-panel)",
                border: "1px solid var(--mk-line)",
                borderRadius: "var(--mk-radius-lg)",
              };
          return (
            <div
              key={plano.nome}
              className="bb-lift"
              style={{
                ...cardStyle,
                padding: "clamp(1.5rem, 3vw, 2rem)",
                display: "flex",
                flexDirection: "column",
                gap: "1.15rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {destaque ? (
                  <span className="bb-plan-tag">
                    <Icon name="star" size={13} sw={0} stroke="none" style={{ fill: "currentColor" }} />
                    Recomendado
                  </span>
                ) : null}
                <h3 style={s("font-family:var(--mk-font-display);font-weight:800;font-size:1.4rem;letter-spacing:-0.03em;color:var(--mk-ink)")}>
                  {plano.nome}
                </h3>
                <p style={s("font-family:var(--mk-font-body);font-size:0.95rem;line-height:1.5;color:var(--mk-ink-soft)")}>
                  {plano.resumo}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                <span style={s("font-family:var(--mk-font-display);font-weight:800;font-size:clamp(2.1rem,4vw,2.6rem);letter-spacing:-0.03em;color:var(--mk-ink)")}>
                  {plano.preco}
                </span>
                <span style={s("font-family:var(--mk-font-body);font-size:1rem;color:var(--mk-muted)")}>{plano.cadencia}</span>
              </div>

              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.7rem", flexGrow: 1 }}>
                {plano.itens.map((item) => (
                  <li key={item} style={s("display:grid;grid-template-columns:auto minmax(0,1fr);gap:0.6rem;align-items:start;font-family:var(--mk-font-body);font-size:0.96rem;line-height:1.45;color:var(--mk-ink-soft)")}>
                    <Icon name="check" size={17} sw={2.6} style={{ color: "var(--mk-accent-ink)", marginTop: "2px", flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button
                href={plano.ctaHref}
                external={plano.ctaWhats}
                variant={destaque ? "primary" : "secondary"}
                size="lg"
                icon={plano.ctaWhats ? "whatsapp" : "none"}
                full
              >
                {plano.ctaLabel}
              </Button>
            </div>
          );
        })}
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: "clamp(1.75rem, 4vw, 2.5rem) 0 0",
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem 1.75rem",
          justifyContent: "center",
        }}
      >
        {GARANTIAS.map((g) => (
          <li key={g.texto} style={s("display:inline-flex;align-items:center;gap:0.55rem;font-family:var(--mk-font-body);font-size:0.94rem;color:var(--mk-ink-soft)")}>
            <Icon name={g.icon} size={17} sw={2.2} style={{ color: "var(--mk-accent-ink)", flexShrink: 0 }} />
            {g.texto}
          </li>
        ))}
      </ul>

      <p style={s("margin-top:1.1rem;text-align:center;font-family:var(--mk-font-body);font-size:0.85rem;color:var(--mk-muted)")}>
        Preços de lançamento. Fale no WhatsApp para o valor atual e para migrar a sua base de clientes.
      </p>
    </Section>
  );
}

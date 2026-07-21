"use client";
import React from "react";
import { s } from "@/lib/ui";
import { Section, Heading, Lead } from "../primitives";
import { type Nivel } from "../icp";
import { type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * FAQ (TERAPEUTAS) — acordeão acessível. meio = dúvidas (esclarece a solução);
 * base = objeções (quebra a barreira antes da decisão). Botão com aria-expanded
 * + região rotulada; abre/fecha por grid-template-rows (respostas ficam no DOM,
 * bom para SEO). prefers-reduced-motion zera a transição (regra global).
 * Client Component (estado de aberto/fechado).
 * -------------------------------------------------------------------------- */

export interface QA {
  pergunta: string;
  resposta: string;
}

const DUVIDAS: QA[] = [
  {
    pergunta: "Preciso entender de tecnologia?",
    resposta:
      "Não. Você conversa com a MAISA pelo WhatsApp, como conversaria com uma secretária. A parte técnica fica com ela.",
  },
  {
    pergunta: "Que tipo de nota a MAISA emite?",
    resposta:
      "Nota fiscal de serviço (NFS-e). Você cadastra seus dados fiscais uma vez e ela emite para todos os pacientes de uma vez.",
  },
  {
    pergunta: "Funciona com os meus pacientes atuais?",
    resposta:
      "Sim. Você importa a sua base e a MAISA monta o CRM com os dados e o histórico de cada paciente.",
  },
  {
    pergunta: "E se eu já uso uma planilha?",
    resposta:
      "A gente traz os dados da sua planilha para dentro da MAISA. Você não perde nada — só deixa de depender dela.",
  },
  {
    pergunta: "As mensagens saem com o meu tom?",
    resposta:
      "Sim. Os textos vão no seu estilo, calmos e humanos. Nada de mensagem que soa como robô.",
  },
];

const OBJECOES: QA[] = [
  {
    pergunta: "Quanto custa, afinal?",
    resposta:
      "A partir de R$ 39 por mês. Menos do que uma sessão para recuperar um dia inteiro que sumia com as notas.",
  },
  {
    pergunta: "Tem fidelidade?",
    resposta: "Não. Você cancela quando quiser, sem multa e sem burocracia.",
  },
  {
    pergunta: "É seguro com os dados dos pacientes?",
    resposta:
      "Sim. As informações são tratadas com sigilo e em conformidade com a LGPD, como a sua profissão exige.",
  },
  {
    pergunta: "Quanto tempo leva para configurar?",
    resposta:
      "Alguns minutos de conversa para ativar. Já no primeiro fechamento de mês você sente a diferença.",
  },
  {
    pergunta: "Emite a NFS-e da minha cidade?",
    resposta:
      "A MAISA se integra à emissão da sua prefeitura. Na ativação a gente confirma a sua e deixa tudo pronto.",
  },
  {
    pergunta: "E se eu precisar de ajuda?",
    resposta: "Tem suporte humano no WhatsApp — gente de verdade, sem fila de robô.",
  },
];

export interface FAQProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  lead?: string;
  items?: QA[];
  /** índice inicialmente aberto (padrão: 0). Passe -1 para todos fechados. */
  aberturaInicial?: number;
}

export function FAQ({ nivel = "base", tone = "default", id, title, lead, items, aberturaInicial = 0 }: FAQProps) {
  const lista = items ?? (nivel === "meio" ? DUVIDAS : OBJECOES);
  const [abertos, setAbertos] = React.useState<Set<number>>(
    () => new Set(aberturaInicial >= 0 ? [aberturaInicial] : []),
  );
  const uid = React.useId();

  const toggle = (i: number) =>
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const heading = title ?? (nivel === "meio" ? "Ainda com dúvidas? A gente responde." : "As perguntas que destravam a decisão");
  const leadText =
    lead ?? (nivel === "meio" ? "O básico para você entender como a MAISA entra no seu dia a dia." : undefined);

  return (
    <Section id={id} tone={tone} width="narrow">
      <div style={{ maxWidth: "40ch" }}>
        <Heading>{heading}</Heading>
        {leadText ? <Lead style={{ marginTop: "1rem" }}>{leadText}</Lead> : null}
      </div>

      <div style={{ marginTop: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
        {lista.map((qa, i) => {
          const open = abertos.has(i);
          const btnId = `${uid}-b${i}`;
          const panelId = `${uid}-p${i}`;
          return (
            <div key={qa.pergunta} style={{ borderTop: i === 0 ? "1px solid var(--mk-border)" : undefined, borderBottom: "1px solid var(--mk-border)" }}>
              <h3 style={{ margin: 0 }}>
                <button
                  type="button"
                  id={btnId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(i)}
                  className="mk-focus"
                  style={s(
                    "width:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem;text-align:left;background:transparent;border:none;cursor:pointer;padding:1.25rem 0.25rem;font-family:var(--mk-font-body);font-size:1.1rem;font-weight:700;color:var(--mk-ink);line-height:1.4",
                  )}
                >
                  <span style={{ minWidth: 0 }}>{qa.pergunta}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--mk-accent-ink)",
                      transition: "transform var(--mk-dur) var(--mk-ease)",
                      transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                className={`mk-mobile-panel${open ? " is-open" : ""}`}
              >
                <div>
                  <p
                    className="mk-pretty"
                    style={{
                      margin: 0,
                      paddingBottom: "1.35rem",
                      paddingRight: "2.5rem",
                      fontFamily: "var(--mk-font-body)",
                      fontSize: "1.02rem",
                      lineHeight: 1.6,
                      color: "var(--mk-ink-soft)",
                    }}
                  >
                    {qa.resposta}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

import type { ReactNode } from "react";
import { Section, Heading, Lead, Text } from "../primitives";
import { type Nivel } from "../icp";
import { TIcon, Pill, type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * AntesDepois (TERAPEUTAS) — Diagrama T da transformação. A "trave" é o título;
 * o "tronco" divide em duas colunas: Antes (opaca, mais pesada) e Agora (clara,
 * arejada). topo = aspiracional; meio = prova concreta. Painéis com borda (sem
 * sombra pesada — nunca ghost-card). Server Component.
 * -------------------------------------------------------------------------- */

const ANTES: string[] = [
  "Um dia inteiro do mês perdido nas notas",
  "Trabalho invadindo a noite e o fim de semana",
  "Histórico do paciente espalhado em vários lugares",
  "Paciente no vácuo e faltas sem aviso",
  "Planilha que só você entende — quando entende",
];

const DEPOIS: string[] = [
  "Notas de todos os pacientes em um clique",
  "A casa volta a ser casa, o descanso volta a ser seu",
  "CRM completo, com a jornada de cada paciente",
  "Lembretes e confirmações no automático",
  "Uma visão calma e organizada da sua gestão",
];

export interface AntesDepoisProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  lead?: string;
  antes?: string[];
  depois?: string[];
  /** frase de fecho abaixo das colunas. null esconde. */
  punch?: ReactNode | null;
}

export function AntesDepois({
  nivel = "topo",
  tone = "panel",
  id,
  title,
  lead,
  antes,
  depois,
  punch,
}: AntesDepoisProps) {
  const listaAntes = antes ?? ANTES;
  const listaDepois = depois ?? DEPOIS;

  const heading = title ?? (nivel === "meio" ? "O que muda no seu mês com a MAISA" : "Do dia que some ao dia que volta.");
  const leadText =
    lead ??
    "A mesma terapeuta, a mesma agenda de pacientes — só que o operacional deixa de ser o seu segundo emprego.";
  const punchNode =
    punch === null
      ? null
      : punch ?? (
          <>
            No fim, você rende quase o <strong style={{ color: "var(--mk-ink)", fontWeight: 700 }}>dobro</strong> — sem o
            operacional te interromper.
          </>
        );

  const painel = (
    variante: "antes" | "depois",
    rotulo: string,
    itens: string[],
  ) => {
    const depoisV = variante === "depois";
    return (
      <div
        style={{
          flex: "1 1 300px",
          minWidth: 0,
          background: depoisV ? "var(--mk-surface)" : "var(--mk-panel-2)",
          border: depoisV
            ? "1px solid color-mix(in oklch, var(--mk-accent) 34%, var(--mk-border))"
            : "1px solid var(--mk-border)",
          borderRadius: "var(--mk-radius-lg)",
          padding: "clamp(1.4rem, 3vw, 2.1rem)",
        }}
      >
        <Pill variant={depoisV ? "soft" : "muted"}>{rotulo}</Pill>
        <ul style={{ listStyle: "none", margin: "1.35rem 0 0", padding: 0, display: "grid", gap: "0.95rem" }}>
          {itens.map((t) => (
            <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem" }}>
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  marginTop: "0.05rem",
                  display: "inline-flex",
                  color: depoisV ? "var(--mk-on-brand)" : "var(--mk-muted)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  alignItems: "center",
                  justifyContent: "center",
                  background: depoisV ? "var(--mk-brand)" : "color-mix(in oklch, var(--mk-ink) 8%, transparent)",
                }}
              >
                <TIcon name={depoisV ? "check" : "minus"} size={15} sw={2.4} />
              </span>
              <Text
                as="span"
                muted={!depoisV}
                style={{ color: depoisV ? "var(--mk-ink)" : undefined, lineHeight: 1.5 }}
              >
                {t}
              </Text>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Section id={id} tone={tone}>
      <div style={{ maxWidth: "44ch", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
        <Heading>{heading}</Heading>
        <Lead style={{ marginTop: "1rem" }}>{leadText}</Lead>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(1.25rem, 3vw, 2rem)", alignItems: "stretch" }}>
        {painel("antes", "Antes", listaAntes)}
        {painel("depois", "Agora, com a MAISA", listaDepois)}
      </div>

      {punchNode ? (
        <p
          className="mk-balance"
          style={{
            margin: "clamp(2rem, 4vw, 2.75rem) auto 0",
            maxWidth: "40ch",
            textAlign: "center",
            fontFamily: "var(--mk-font-display)",
            fontSize: "clamp(1.25rem, 2.4vw, 1.7rem)",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            color: "var(--mk-ink-soft)",
          }}
        >
          {punchNode}
        </p>
      ) : null}
    </Section>
  );
}

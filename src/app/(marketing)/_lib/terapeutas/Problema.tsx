import { Section, Heading, Lead, Text } from "../primitives";
import { imagensTerapeutas, type MktImagem } from "../imagens";
import { type Nivel } from "../icp";
import { TIcon, type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * Problema / Dor (TERAPEUTAS) — a dor vital: a nota fiscal que come um dia
 * inteiro do mês, o trabalho que invade a casa, a planilha impossível, o
 * paciente no vácuo. topo = forte (com foto), meio = resumida (só a lista).
 * Editorial e organizado: linhas com divisor fino (nada de grid de cards).
 * Server Component.
 * -------------------------------------------------------------------------- */

export interface DorItem {
  icon: string;
  titulo: string;
  texto: string;
}

const DORES: DorItem[] = [
  {
    icon: "receipt",
    titulo: "Some um dia inteiro com as notas",
    texto: "Todo mês é uma nota por paciente, uma a uma. O que devia levar minutos toma um dia — e volta no mês seguinte.",
  },
  {
    icon: "clock",
    titulo: "O trabalho invade a casa",
    texto: "Responder mensagem à noite, emitir nota no fim de semana. A gestão persegue você para fora do consultório.",
  },
  {
    icon: "users",
    titulo: "O histórico do paciente fica espalhado",
    texto: "Contatos numa agenda, contexto na memória, dados numa planilha. Na hora de atender, falta a visão inteira.",
  },
  {
    icon: "calendar",
    titulo: "Remarcar e encaixar consome sua energia",
    texto: "Cada troca de horário vira uma conversa manual. O tempo que devia ser de descanso vira administração.",
  },
];

export interface ProblemaProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  lead?: string;
  items?: DorItem[];
  /** foto ao lado (padrão: mostra no topo, esconde no meio) */
  image?: MktImagem | null;
}

export function Problema({
  nivel = "topo",
  tone = "default",
  id,
  title,
  lead,
  items,
  image,
}: ProblemaProps) {
  const resumida = nivel !== "topo";
  const lista = items ?? (resumida ? DORES.slice(0, 3) : DORES);
  const img = image === null ? null : image ?? (resumida ? null : imagensTerapeutas.anotando);

  const heading = title ?? "O operacional não devia custar o seu descanso.";
  const leadText =
    lead ??
    "Você escolheu essa profissão para atender pessoas — não para virar o setor administrativo de si mesma. Mas o mês termina assim:";

  const listaEl = (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {lista.map((item, i) => (
        <li
          key={item.titulo}
          style={{
            display: "flex",
            gap: "1.05rem",
            alignItems: "flex-start",
            paddingBlock: "1.35rem",
            borderTop: i === 0 ? "none" : "1px solid var(--mk-line)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              marginTop: "0.15rem",
              color: "var(--mk-accent-ink)",
              display: "inline-flex",
            }}
          >
            <TIcon name={item.icon} size={26} sw={1.7} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontFamily: "var(--mk-font-body)",
                fontSize: "1.12rem",
                fontWeight: 700,
                letterSpacing: "-0.005em",
                color: "var(--mk-ink)",
                margin: 0,
              }}
            >
              {item.titulo}
            </h3>
            <Text muted style={{ marginTop: "0.35rem", maxWidth: "52ch" }}>
              {item.texto}
            </Text>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <Section id={id} tone={tone}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(2rem, 5vw, 4rem)",
          alignItems: "flex-start",
        }}
      >
        {/* Título + lead (e foto quando houver) */}
        <div style={{ flex: img ? "1 1 320px" : "1 1 100%", minWidth: 0, maxWidth: img ? undefined : "760px" }}>
          <Heading style={{ maxWidth: "18ch" }}>{heading}</Heading>
          <Lead style={{ marginTop: "1.1rem" }}>{leadText}</Lead>

          {img ? (
            <figure
              style={{
                margin: "1.9rem 0 0",
                borderRadius: "var(--mk-radius-lg)",
                overflow: "hidden",
                aspectRatio: "4 / 3",
                boxShadow: "var(--mk-shadow-soft)",
              }}
            >
              <img
                src={img.url}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </figure>
          ) : null}
        </div>

        {/* Lista de dores */}
        <div style={{ flex: img ? "1.15 1 380px" : "1 1 100%", minWidth: 0, maxWidth: img ? undefined : "760px" }}>
          {listaEl}
        </div>
      </div>
    </Section>
  );
}

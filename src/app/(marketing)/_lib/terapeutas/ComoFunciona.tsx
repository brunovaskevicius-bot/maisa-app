import { Section, Heading, Lead, Text, Button } from "../primitives";
import { imagensTerapeutas, type MktImagem } from "../imagens";
import { ICPS, type Nivel } from "../icp";
import { linkKind, type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * ComoFunciona (TERAPEUTAS) — os passos reais, do primeiro acesso ao clique do
 * fechamento do mês. Linha do tempo vertical conectada (nós numerados = a ordem
 * do processo, não decoração 01/02/03). meio = principal (4 passos + foto),
 * base = resumida (3 passos, foco em "rápido"). Server Component.
 * -------------------------------------------------------------------------- */

const cfg = ICPS.terapeutas;

export interface Passo {
  titulo: string;
  texto: string;
}

const PASSOS: Passo[] = [
  {
    titulo: "Conecte a MAISA e traga seus pacientes",
    texto: "Você conversa no WhatsApp e importa sua base. A MAISA monta o CRM com os dados e o histórico de cada paciente.",
  },
  {
    titulo: "Cadastre seus dados fiscais uma vez",
    texto: "Informe os dados da sua emissão uma única vez. A MAISA guarda tudo e assume a parte burocrática daí em diante.",
  },
  {
    titulo: "No fechamento do mês, clique uma vez",
    texto: "A MAISA emite a nota de todos os pacientes de uma só vez. Do segundo mês em diante, é só revisar e confirmar.",
  },
  {
    titulo: "Agenda e lembretes seguem no automático",
    texto: "Confirmações, remarcações e o histórico rodam sozinhos pelo WhatsApp. Você só cuida de quem senta na poltrona.",
  },
];

export interface ComoFuncionaProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  lead?: string;
  passos?: Passo[];
  image?: MktImagem | null;
  /** mostra um CTA abaixo dos passos (padrão: só no meio) */
  ctaLabel?: string | null;
  ctaHref?: string;
}

export function ComoFunciona({
  nivel = "meio",
  tone = "panel",
  id,
  title,
  lead,
  passos,
  image,
  ctaLabel,
  ctaHref,
}: ComoFuncionaProps) {
  const resumida = nivel === "base";
  const lista = passos ?? (resumida ? [PASSOS[0], PASSOS[2], PASSOS[3]] : PASSOS);
  const img = image === null ? null : image ?? (resumida ? null : imagensTerapeutas.plantasOrdem);

  const heading = title ?? (resumida ? "Simples do começo ao fim." : "Como a MAISA trabalha por você");
  const leadText =
    lead ??
    (resumida
      ? "Em poucos passos a MAISA assume o operacional — e o primeiro clique já devolve o seu tempo."
      : "Nada de migração complicada nem manual grosso. É uma conversa calma que termina com o mês inteiro no lugar.");

  const cLabel = ctaLabel === null ? null : ctaLabel ?? (resumida ? null : cfg.ctaLabel);
  const cHref = ctaHref ?? cfg.ctaUrl;
  const ck = cHref ? linkKind(cHref) : null;

  const timeline = (
    <ol
      style={{
        position: "relative",
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {/* trilho conectando os nós (some no primeiro/último) */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 22,
          top: 24,
          bottom: 24,
          width: 2,
          background: "color-mix(in oklch, var(--mk-accent) 40%, var(--mk-border))",
        }}
      />
      {lista.map((p, i) => (
        <li
          key={p.titulo}
          style={{
            position: "relative",
            display: "flex",
            gap: "1.15rem",
            alignItems: "flex-start",
            paddingBottom: i === lista.length - 1 ? 0 : "clamp(1.5rem, 3vw, 2.25rem)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "relative",
              zIndex: 1,
              width: 46,
              height: 46,
              flexShrink: 0,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--mk-font-display)",
              fontSize: "1.15rem",
              fontWeight: 600,
              color: "var(--mk-on-brand)",
              background: "var(--mk-brand)",
              boxShadow: "0 0 0 6px var(--mk-panel)",
            }}
          >
            {i + 1}
          </span>
          <div style={{ minWidth: 0, paddingTop: "0.35rem" }}>
            <h3
              style={{
                fontFamily: "var(--mk-font-body)",
                fontSize: "1.15rem",
                fontWeight: 700,
                letterSpacing: "-0.005em",
                color: "var(--mk-ink)",
                margin: 0,
              }}
            >
              {p.titulo}
            </h3>
            <Text muted style={{ marginTop: "0.4rem", maxWidth: "50ch" }}>
              {p.texto}
            </Text>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <Section id={id} tone={tone}>
      <div style={{ maxWidth: "44ch", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
        <Heading>{heading}</Heading>
        <Lead style={{ marginTop: "1rem" }}>{leadText}</Lead>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(2rem, 5vw, 4rem)",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1.2 1 380px", minWidth: 0 }}>
          {timeline}
          {cLabel && cHref && ck ? (
            <div style={{ marginTop: "2rem" }}>
              <Button href={cHref} external={ck.external} variant="primary" size="md" icon={ck.icon} iconRight={ck.iconRight}>
                {cLabel}
              </Button>
            </div>
          ) : null}
        </div>

        {img ? (
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <figure
              style={{
                position: "sticky",
                top: 96,
                margin: 0,
                borderRadius: "var(--mk-radius-lg)",
                overflow: "hidden",
                aspectRatio: "4 / 5",
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
          </div>
        ) : null}
      </div>
    </Section>
  );
}

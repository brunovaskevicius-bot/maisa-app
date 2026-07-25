import { Section, Heading, Lead, Text, Button } from "../primitives";
import { whatsappUrl, type Nivel } from "../icp";
import { TIcon, Pill, linkKind, type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * Planos (TERAPEUTAS) — nível BASE (decisão). Preço claro, plano recomendado em
 * destaque, garantia ("se paga no primeiro mês") e reforço de baixo risco. Dois
 * planos (mais legível que três), cartões com borda (sem sombra pesada).
 * Server Component.
 *
 * >>> VALORES DE PLACEHOLDER — troque `preco` pelos preços reais antes de publicar. <<<
 * -------------------------------------------------------------------------- */

/** Mensagem de WhatsApp pré-preenchida com o NOME do plano escolhido, para a
 *  MAISA já saber por onde a terapeuta quer começar. Ponto único do CTA por plano. */
function mensagemPlano(nome: string): string {
  return `Olá! Sou terapeuta e quero começar na MAISA com o plano ${nome}. Pode me explicar os próximos passos?`;
}

export interface Plano {
  nome: string;
  preco: string;
  periodo?: string;
  resumo: string;
  features: string[];
  destaque?: boolean;
  ctaLabel: string;
  ctaHref?: string;
}

const PLANOS: Plano[] = [
  {
    nome: "Essencial",
    preco: "R$ 39",
    periodo: "/mês",
    resumo: "Para tirar as notas e a agenda das suas costas.",
    features: [
      "Notas fiscais de todos os pacientes em um clique",
      "Agenda com confirmações no WhatsApp",
      "CRM com os dados de cada paciente",
      "Suporte humano no WhatsApp",
    ],
    ctaLabel: "Começar no Essencial",
  },
  {
    nome: "Completo",
    preco: "R$ 79",
    periodo: "/mês",
    resumo: "A gestão inteira no automático, com insights.",
    destaque: true,
    features: [
      "Tudo do Essencial",
      "CRM completo, com a jornada de cada paciente",
      "Lembretes e remarcação automáticos",
      "Mensagens para recuperar quem sumiu",
      "Insights de faturamento e frequência",
    ],
    ctaLabel: "Começar no Completo",
  },
];

export interface PlanosProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  lead?: string;
  planos?: Plano[];
  /** frase de garantia sob os planos. null esconde. */
  garantia?: string | null;
  /** micro-reforços de baixo risco */
  reforcos?: string[];
}

export function Planos({
  nivel = "base",
  tone = "panel",
  id = "planos",
  title,
  lead,
  planos,
  garantia,
  reforcos,
}: PlanosProps) {
  const lista = planos ?? PLANOS;
  const heading = title ?? "Um plano que se paga sozinho.";
  const leadText =
    lead ??
    "Menos do que uma sessão por mês para recuperar o dia que sumia com as notas. Sem fidelidade, sem pegadinha.";
  const garantiaText =
    garantia === null ? null : garantia ?? "Se a MAISA não te devolver o dia das notas no primeiro mês, seu dinheiro de volta.";
  const reforcosList = reforcos ?? ["Sem fidelidade", "Cancele quando quiser", "Configuração em minutos"];

  return (
    <Section id={id} tone={tone}>
      <div style={{ maxWidth: "42ch", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
        <Heading>{heading}</Heading>
        <Lead style={{ marginTop: "1rem" }}>{leadText}</Lead>
      </div>

      <div
        style={{
          display: "grid",
          gap: "clamp(1.25rem, 3vw, 1.75rem)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
          alignItems: "stretch",
        }}
      >
        {lista.map((p) => {
          const href = p.ctaHref ?? whatsappUrl(mensagemPlano(p.nome));
          const k = linkKind(href);
          return (
            <div
              key={p.nome}
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                background: p.destaque ? "var(--mk-surface)" : "var(--mk-bg)",
                border: p.destaque
                  ? "1.5px solid color-mix(in oklch, var(--mk-accent) 55%, var(--mk-brand))"
                  : "1px solid var(--mk-border)",
                borderRadius: "var(--mk-radius-lg)",
                overflow: "hidden",
              }}
            >
              {p.destaque ? (
                <div
                  style={{
                    background: "var(--mk-brand)",
                    color: "var(--mk-on-brand)",
                    padding: "0.7rem clamp(1.4rem, 3vw, 2rem)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontFamily: "var(--mk-font-body)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  <TIcon name="spark" size={16} />
                  Recomendado
                </div>
              ) : null}

              <div
                style={{
                  padding: "clamp(1.6rem, 3.2vw, 2.2rem)",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--mk-font-display)",
                    fontSize: "1.4rem",
                    fontWeight: 600,
                    color: "var(--mk-ink)",
                    margin: 0,
                  }}
                >
                  {p.nome}
                </h3>
                <Text muted style={{ marginTop: "0.4rem" }}>
                  {p.resumo}
                </Text>

                <div style={{ marginTop: "1.35rem", display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--mk-font-display)",
                      fontSize: "clamp(2.2rem, 4vw, 2.9rem)",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "var(--mk-ink)",
                      lineHeight: 1,
                    }}
                  >
                    {p.preco}
                  </span>
                  {p.periodo ? (
                    <span style={{ fontFamily: "var(--mk-font-body)", fontSize: "1rem", color: "var(--mk-muted)" }}>
                      {p.periodo}
                    </span>
                  ) : null}
                </div>

                <ul style={{ listStyle: "none", margin: "1.6rem 0 0", padding: 0, display: "grid", gap: "0.85rem" }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
                      <span style={{ color: "var(--mk-accent-ink)", flexShrink: 0, display: "inline-flex", marginTop: "0.1rem" }}>
                        <TIcon name="check" size={19} sw={2.1} />
                      </span>
                      <Text as="span" style={{ color: "var(--mk-ink)", lineHeight: 1.5 }}>
                        {f}
                      </Text>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: "auto", paddingTop: "1.9rem" }}>
                  <Button
                    href={href}
                    external={k.external}
                    variant={p.destaque ? "primary" : "secondary"}
                    size="lg"
                    full
                    icon={k.icon}
                    iconRight={k.iconRight}
                  >
                    {p.ctaLabel}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {garantiaText ? (
        <div
          style={{
            marginTop: "clamp(1.75rem, 3.5vw, 2.5rem)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.85rem",
            padding: "clamp(1.1rem, 2.5vw, 1.5rem) clamp(1.25rem, 3vw, 1.75rem)",
            background: "var(--mk-surface)",
            border: "1px solid var(--mk-border)",
            borderRadius: "var(--mk-radius)",
          }}
        >
          <span style={{ color: "var(--mk-accent-ink)", flexShrink: 0, display: "inline-flex", marginTop: "0.05rem" }}>
            <TIcon name="shield" size={24} />
          </span>
          <Text style={{ color: "var(--mk-ink)", fontWeight: 600, maxWidth: "60ch" }}>{garantiaText}</Text>
        </div>
      ) : null}

      {reforcosList.length ? (
        <ul
          style={{
            listStyle: "none",
            margin: "1.35rem 0 0",
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem 1.5rem",
          }}
        >
          {reforcosList.map((r) => (
            <li key={r} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ color: "var(--mk-accent-ink)", display: "inline-flex" }}>
                <TIcon name="check" size={17} sw={2.2} />
              </span>
              <span style={{ fontFamily: "var(--mk-font-body)", fontSize: "0.95rem", color: "var(--mk-muted)" }}>{r}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

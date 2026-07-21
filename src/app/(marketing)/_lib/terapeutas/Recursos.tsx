import { Section, Heading, Lead, Text } from "../primitives";
import { imagensTerapeutas, type MktImagem } from "../imagens";
import { type Nivel } from "../icp";
import { TIcon, IconBadge, type Tone } from "./_shared";

/* ----------------------------------------------------------------------------
 * Recursos / Benefícios (TERAPEUTAS) — a nota fiscal (dor vital) ganha um bloco
 * em destaque com foto; os demais benefícios vêm como blocos abertos (ícone +
 * título + texto), sem virar grade de cards idênticos. meio = completo,
 * base = enxuto (destaque + 3 benefícios de fechamento). Server Component.
 * -------------------------------------------------------------------------- */

export interface Beneficio {
  icon: string;
  titulo: string;
  texto: string;
}

const BENEFICIOS: Beneficio[] = [
  {
    icon: "users",
    titulo: "CRM completo por paciente",
    texto: "Dados, contatos, jornada e contexto de cada pessoa em um lugar só — pronto na hora do atendimento.",
  },
  {
    icon: "calendar",
    titulo: "Agenda que remarca sozinha",
    texto: "Encaixes, remarcações e confirmações acontecem no WhatsApp, sem você parar para administrar.",
  },
  {
    icon: "chat",
    titulo: "Lembretes no automático",
    texto: "A MAISA avisa o paciente antes da sessão e reduz a falta, com um tom que soa como você.",
  },
  {
    icon: "heart",
    titulo: "Recupera quem sumiu",
    texto: "Mensagens no momento certo trazem de volta o paciente que parou de marcar — sem soar automática.",
  },
  {
    icon: "insights",
    titulo: "Insights de gestão",
    texto: "Faturamento, frequência e retorno em uma visão calma, para decidir com clareza — não no escuro.",
  },
  {
    icon: "shield",
    titulo: "Cuidado com os dados",
    texto: "Informações de paciente tratadas com sigilo e em conformidade com a LGPD, do jeito que a sua profissão exige.",
  },
];

const DESTAQUE_SUB = [
  "A nota de todos os pacientes emitida de uma vez",
  "Seus dados fiscais guardados — configura uma vez só",
  "No segundo mês, é só revisar e confirmar",
];

export interface RecursosProps {
  nivel?: Nivel;
  tone?: Tone;
  id?: string;
  title?: string;
  lead?: string;
  beneficios?: Beneficio[];
  /** foto do bloco de destaque (notas). null esconde. */
  image?: MktImagem | null;
}

export function Recursos({
  nivel = "meio",
  tone = "default",
  id = "recursos",
  title,
  lead,
  beneficios,
  image,
}: RecursosProps) {
  const enxuto = nivel === "base";
  const lista =
    beneficios ??
    (enxuto ? [BENEFICIOS[0], BENEFICIOS[1], BENEFICIOS[4]] : BENEFICIOS);
  const img = image === null ? null : image ?? imagensTerapeutas.anotando;

  const heading = title ?? "Tudo o que pesava, agora ela carrega.";
  const leadText =
    lead ??
    "A nota fiscal é o alívio que se sente no primeiro mês. Em volta dela, a MAISA organiza o resto da sua gestão.";

  return (
    <Section id={id} tone={tone}>
      <div style={{ maxWidth: "46ch" }}>
        <Heading>{heading}</Heading>
        <Lead style={{ marginTop: "1rem" }}>{leadText}</Lead>
      </div>

      {/* Destaque: notas fiscais em um clique */}
      <div
        style={{
          marginTop: "clamp(2rem, 4vw, 3rem)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(1.75rem, 4vw, 3.25rem)",
          alignItems: "center",
          padding: "clamp(1.5rem, 3vw, 2.5rem)",
          background: "var(--mk-surface)",
          border: "1px solid var(--mk-border)",
          borderRadius: "var(--mk-radius-lg)",
        }}
      >
        <div style={{ flex: "1.1 1 320px", minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.7rem" }}>
            <IconBadge size={44}>
              <TIcon name="receipt" size={24} />
            </IconBadge>
            <span
              style={{
                fontFamily: "var(--mk-font-body)",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--mk-accent-ink)",
              }}
            >
              Dor nº 1 resolvida
            </span>
          </div>

          <h3
            style={{
              marginTop: "1rem",
              fontFamily: "var(--mk-font-display)",
              fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.012em",
              color: "var(--mk-ink)",
            }}
          >
            Notas fiscais em <em>um clique</em>
          </h3>
          <Text style={{ marginTop: "0.8rem", maxWidth: "48ch" }}>
            O dia que sumia todo mês vira um botão. A MAISA emite, organiza e arquiva a nota de cada
            paciente — e você acompanha tudo por uma conversa no WhatsApp.
          </Text>

          <ul style={{ listStyle: "none", margin: "1.4rem 0 0", padding: 0, display: "grid", gap: "0.7rem" }}>
            {DESTAQUE_SUB.map((s) => (
              <li key={s} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
                <span style={{ color: "var(--mk-accent-ink)", flexShrink: 0, display: "inline-flex", marginTop: "0.1rem" }}>
                  <TIcon name="check" size={20} sw={2} />
                </span>
                <Text as="span" style={{ color: "var(--mk-ink)" }}>
                  {s}
                </Text>
              </li>
            ))}
          </ul>
        </div>

        {img ? (
          <div style={{ flex: "1 1 300px", minWidth: 0 }}>
            <figure
              style={{
                margin: 0,
                borderRadius: "var(--mk-radius)",
                overflow: "hidden",
                aspectRatio: "5 / 4",
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

      {/* Demais benefícios — blocos abertos (sem chrome de card) */}
      <div
        style={{
          marginTop: "clamp(2rem, 4vw, 3.25rem)",
          display: "grid",
          gap: "clamp(1.5rem, 3.2vw, 2.5rem)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
        }}
      >
        {lista.map((b) => (
          <div key={b.titulo} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 }}>
            <IconBadge>
              <TIcon name={b.icon} size={24} />
            </IconBadge>
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
              {b.titulo}
            </h3>
            <Text muted style={{ maxWidth: "40ch" }}>
              {b.texto}
            </Text>
          </div>
        ))}
      </div>
    </Section>
  );
}

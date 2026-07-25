import type { Metadata } from "next";
import {
  World,
  MarketingNav,
  Footer,
  CTASection,
} from "@/app/(marketing)/_lib";
import { Hero, Problema, AntesDepois } from "@/app/(marketing)/_lib/terapeutas";

/* ----------------------------------------------------------------------------
 * /terapeutas — TOPO do funil (consciência).
 * Público: terapeuta/psicóloga autônoma. Dor vital = a nota fiscal que come um
 * dia inteiro do mês; secundárias = CRM/histórico e agenda. Intenção do nível:
 * despertar a DOR e desenhar o "mundo depois", de forma educacional e com pouca
 * fricção. UM CTA primário, leve ("Ver como funciona" → MEIO). Sem preço aqui.
 *
 * Composição (só reaproveita seções da biblioteca compartilhada — mesmas peças
 * que MEIO e BASE usarão com outra ênfase):
 *   Nav → Hero(topo) → Problema(topo, forte) → AntesDepois(topo, aspiracional)
 *       → CTASection(nudge para o MEIO) → Footer.
 * Ritmo de superfícies alternado (bg → panel → bg → banda navy) para respiro.
 * -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Para terapeutas: recupere o dia que some com as notas",
  description:
    "A MAISA emite a nota fiscal de cada paciente, cuida da agenda e organiza o histórico — numa conversa calma no WhatsApp. Menos operacional, mais presença com quem você atende.",
  alternates: { canonical: "/terapeutas" },
  openGraph: {
    title: "MAISA para terapeutas — notas, agenda e histórico sem esforço",
    description:
      "A nota de todos os pacientes em um clique, a agenda em ordem e o histórico à mão. O operacional deixa de ser o seu segundo emprego.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function TerapeutasTopoPage() {
  return (
    <World icp="terapeutas">
      <MarketingNav icp="terapeutas" current="topo" />

      <main id="conteudo" tabIndex={-1}>
        {/* Herói — a dor vital (o dia que some) e o mundo depois (um clique).
            CTA primário leve leva ao MEIO; WhatsApp fica como opção secundária. */}
        <Hero nivel="topo" />

        {/* A dor, por inteiro e sem pressa — lista editorial com foto real. */}
        <Problema nivel="topo" tone="panel" />

        {/* A transformação (Diagrama T): do dia que some ao dia que volta. */}
        <AntesDepois nivel="topo" tone="default" />

        {/* Fecho do TOPO: nudge educacional para o MEIO (sem falar de preço).
            nivel="topo" deriva o CTA leve ("Ver como funciona" → MEIO) da fonte
            única (ctaDoNivel), sem repetir rótulo/href aqui. */}
        <CTASection
          icp="terapeutas"
          nivel="topo"
          title="Menos operacional. Mais presença com quem você atende."
          description="Veja, passo a passo, como a MAISA assume as notas, a agenda e o histórico dos seus pacientes — para o tempo do seu mês voltar a ser seu."
          secondary={false}
        />
      </main>

      <Footer icp="terapeutas" />
    </World>
  );
}

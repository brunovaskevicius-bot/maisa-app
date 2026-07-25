import type { Metadata } from "next";
import { World, MarketingNav, Footer, CTASection } from "@/app/(marketing)/_lib";
import {
  Hero,
  Problema,
  ComoFunciona,
  Recursos,
  AntesDepois,
  Depoimentos,
  FAQ,
} from "@/app/(marketing)/_lib/terapeutas";

/* ----------------------------------------------------------------------------
 * TERAPEUTAS · MEIO do funil (consideração) — /terapeutas/como-funciona
 * Público já consciente da solução: mostramos COMO a MAISA funciona (passos),
 * os recursos, a transformação Antes→Depois, prova social e dúvidas. CTA de
 * intenção média (falar no WhatsApp) com ponte para os planos (base).
 *
 * A página COMPÕE seções da biblioteca compartilhada de terapeutas, cada uma na
 * variação `nivel="meio"`. Todas as seções já renderizam o próprio <Section>
 * (padding, container e tone) — aqui é só empilhá-las dentro de <main>.
 * -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Como funciona a MAISA para terapeutas",
  description:
    "Veja o passo a passo: a MAISA emite as notas fiscais de todos os pacientes em um clique, cuida da agenda e guarda o histórico de cada um — tudo por uma conversa no WhatsApp. Recursos, transformação e depoimentos.",
};

export default function TerapeutasComoFuncionaPage() {
  return (
    <World icp="terapeutas">
      <MarketingNav icp="terapeutas" current="meio" />

      <main id="conteudo" tabIndex={-1}>
        {/* Abertura de consideração: o que a MAISA faz por você, em movimento */}
        <Hero nivel="meio" />

        {/* Recapitulação curta da dor (3 itens, sem foto) que faz a ponte para o "como" */}
        <Problema
          nivel="meio"
          lead="Você já conhece essa dor de perto. Veja rápido o que ainda pesa hoje — e, logo abaixo, como a MAISA assume cada uma dessas partes por você."
        />

        {/* Seção principal do MEIO: os passos reais, do primeiro acesso ao clique do mês */}
        <ComoFunciona nivel="meio" />

        {/* Recursos / benefícios (a nota fiscal em destaque). id="recursos" — a nav ancora aqui */}
        <Recursos nivel="meio" />

        {/* Prova da transformação: o que muda no mês, lado a lado */}
        <AntesDepois nivel="meio" />

        {/* Prova social: a voz de quem já respira melhor */}
        <Depoimentos nivel="meio" />

        {/* Dúvidas que ainda seguram a consideração (acordeão acessível) */}
        <FAQ nivel="meio" tone="panel" />

        {/* Faixa de conversão de intenção média: convida a conversar e avança para os planos */}
        <CTASection
          icp="terapeutas"
          title="Quer ver a MAISA cuidando do seu mês?"
          description="Conte como é a sua rotina de notas e agenda. Numa conversa calma no WhatsApp, a gente mostra exatamente como a MAISA entra no seu dia a dia — sem compromisso."
        />
      </main>

      <Footer icp="terapeutas" />
    </World>
  );
}

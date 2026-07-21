import type { Metadata } from "next";
import { World, MarketingNav, Footer, CTASection } from "@/app/(marketing)/_lib";
import {
  HeroBarbeiros,
  ProblemaBarbeiros,
  ComoFuncionaBarbeiros,
  RecursosBarbeiros,
  AntesDepoisBarbeiros,
  DepoimentosBarbeiros,
  FaqBarbeiros,
} from "@/app/(marketing)/_lib/barbeiros";

/* ----------------------------------------------------------------------------
 * BARBEIROS · MEIO do funil (consideração) — /barbeiros/como-funciona
 * O barbeiro já sente a dor e já ouviu falar da solução: aqui mostramos COMO a
 * MAISA trabalha (os passos reais), os recursos que enchem a agenda, a
 * transformação Antes→Depois na rotina, a prova social e as dúvidas de operação.
 * CTA de intenção média — falar no WhatsApp — com ponte para os planos (base).
 *
 * A página COMPÕE seções da biblioteca compartilhada de barbeiros, cada uma na
 * variação de MEIO. Toda seção já renderiza o próprio <Section> (padding,
 * container e tone) e lê os tokens --mk-* do <World icp="barbeiros">; aqui é só
 * empilhá-las dentro de <main> na ordem do argumento de venda.
 * -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Como funciona a MAISA para barbearias",
  description:
    "Veja o passo a passo: a MAISA confirma horário, mata o no-show com lembrete e traz cliente sumido de volta — tudo pelo seu WhatsApp, sem você largar a tesoura. Recursos, transformação na rotina e depoimentos.",
};

export default function BarbeirosComoFuncionaPage() {
  return (
    <World icp="barbeiros">
      <MarketingNav icp="barbeiros" current="meio" />

      <main>
        {/* Abertura de consideração: a agenda enchendo enquanto o corte acontece */}
        <HeroBarbeiros nivel="meio" />

        {/* Recapitulação curta da dor (3 itens, sem foto): faz a ponte para o "como" */}
        <ProblemaBarbeiros variant="resumido" />

        {/* Seção principal do MEIO: os passos reais, do QR Code à agenda cheia */}
        <ComoFuncionaBarbeiros variant="completo" />

        {/* Recursos / benefícios (confirmação e lembrete em destaque). id="recursos" — a nav ancora aqui */}
        <RecursosBarbeiros variant="completo" />

        {/* Prova da transformação: o que muda na rotina do dia, lado a lado */}
        <AntesDepoisBarbeiros variant="pragmatico" />

        {/* Prova social: barbeiros que já vivem de cadeira cheia */}
        <DepoimentosBarbeiros variant="completo" />

        {/* Dúvidas de operação que ainda seguram a consideração (acordeão acessível) */}
        <FaqBarbeiros variant="duvidas" />

        {/* Faixa de conversão de intenção média: convida a conversar e avança para os planos */}
        <CTASection
          icp="barbeiros"
          title="Pronto pra ver a sua agenda encher sozinha?"
          description="Chama a MAISA no WhatsApp e conta como é a sua rotina de cortes. A gente mostra, sem compromisso, como ela confirma, lembra e recupera cliente por você — e você escolhe o plano quando fizer sentido."
        />
      </main>

      <Footer icp="barbeiros" />
    </World>
  );
}

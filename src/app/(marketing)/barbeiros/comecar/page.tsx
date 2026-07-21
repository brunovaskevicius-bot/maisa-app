import type { Metadata } from "next";
import { World, MarketingNav, Footer, CTASection } from "@/app/(marketing)/_lib";
import {
  HeroBarbeiros,
  RecursosBarbeiros,
  ComoFuncionaBarbeiros,
  PlanosBarbeiros,
  DepoimentosBarbeiros,
  FaqBarbeiros,
} from "@/app/(marketing)/_lib/barbeiros";

/* ----------------------------------------------------------------------------
 * BARBEIROS · BASE do funil (decisão) — /barbeiros/comecar
 * Público pronto para decidir. A página tira o foco da dor (já batida no topo e
 * no meio) e coloca tudo que fecha a conta: o valor entregue, como é rápido de
 * ligar, os planos com preço e garantia, prova de quem já usa, as objeções de
 * compra quebradas e um CTA forte, repetido em cada momento de decisão.
 *
 * Narrativa BoFu: valor → facilidade → preço+garantia → prova → objeções → CTA.
 * A página COMPÕE as seções da biblioteca do mundo barbeiros nas variações de
 * base (resumido / objecoes / nivel="base"); cada seção já renderiza o próprio
 * <Section> com ritmo e tom — aqui é só empilhá-las na ordem da decisão.
 * -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Comece agora — planos da MAISA para barbearias",
  description:
    "Ative a MAISA na sua barbearia em cerca de 30 minutos. Planos a partir de R$ 97/mês, garantia de um mês (se não se pagar, a gente devolve) e sem fidelidade. Veja os planos, tire as dúvidas e comece pelo WhatsApp.",
};

export default function BarbeirosComecarPage() {
  return (
    <World icp="barbeiros">
      <MarketingNav icp="barbeiros" current="base" />

      <main>
        {/* Abertura de decisão: ativar hoje, se paga em menos de um mês.
            O CTA secundário do herói ancora direto nos planos (#planos). */}
        <HeroBarbeiros nivel="base" />

        {/* Recapitula o valor entregue (4 recursos, sem foto) — justifica o preço
            que vem logo abaixo: "é tudo que uma secretária faria". */}
        <RecursosBarbeiros variant="resumido" />

        {/* Baixa a fricção de esforço antes do preço: no ar em três passos, sem
            técnico e sem curva de aprendizado. Sem CTA — a base tem os seus. */}
        <ComoFuncionaBarbeiros variant="resumido" />

        {/* O momento da decisão: planos, preço, plano recomendado em destaque e a
            faixa de garantias (setup ~30min, se paga no 1º mês, sem fidelidade).
            id="planos" — alvo das âncoras do herói e do CTA final. */}
        <PlanosBarbeiros id="planos" />

        {/* Prova logo após o preço, para de-riscar a compra: barbeiros de cadeira
            cheia (âncora + 1 apoio). */}
        <DepoimentosBarbeiros variant="resumido" />

        {/* Quebra as objeções que ainda travam o "sim" (instalar app, perder o
            controle, e se não der certo). */}
        <FaqBarbeiros variant="objecoes" id="faq" />

        {/* Empurrão final: um CTA dominante de WhatsApp reforçando a garantia; o
            secundário volta aos planos (evita autolink para a própria rota). */}
        <CTASection
          icp="barbeiros"
          title="Ative a agenda e encha a cadeira já nesta semana."
          description="Escaneie o QR Code, cadastre seus serviços e a MAISA assume o WhatsApp em cerca de 30 minutos. Se não se pagar no primeiro mês, a gente devolve — e você cancela quando quiser."
          secondaryLabel="Ver os planos"
          secondaryHref="#planos"
        />
      </main>

      <Footer icp="barbeiros" />
    </World>
  );
}

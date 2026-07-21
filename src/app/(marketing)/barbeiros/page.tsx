import type { Metadata } from "next";
import {
  World,
  MarketingNav,
  Footer,
  CTASection,
  ICPS,
  imagensBarbeiros,
} from "@/app/(marketing)/_lib";
import {
  HeroBarbeiros,
  ProblemaBarbeiros,
  ComoFuncionaBarbeiros,
  AntesDepoisBarbeiros,
} from "@/app/(marketing)/_lib/barbeiros";

/* ----------------------------------------------------------------------------
 * BARBEIROS · TOPO do funil (consciência) — /barbeiros
 * Público sente a dor (cadeira vazia, no-show, cliente que some) mas ainda não
 * conhece a solução. A página é EDUCACIONAL e de baixa fricção: primeiro fisga
 * na dor, depois mostra que resolver é simples, pinta o mundo "depois" e convida
 * a conhecer o passo a passo completo no MEIO do funil. Um único CTA primário
 * ("Ver como funciona"), sem preço.
 *
 * Arco narrativo:
 *   Hero (fisgada) → Problema (aprofunda a dor) → ComoFunciona resumido (é
 *   simples resolver) → Antes→Depois aspiracional (o mundo depois) → CTA leve.
 *
 * Cada seção da biblioteca compartilhada de barbeiros já renderiza o próprio
 * <Section> (padding, container e tone) — aqui só empilhamos dentro de <main>.
 * -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "MAISA para barbearias — a agenda enche enquanto você corta",
  description:
    "Cadeira vazia é dinheiro que não volta. Veja como a MAISA confirma horário, manda lembrete e traz cliente sumido de volta pelo WhatsApp, no automático — enquanto você fica de tesoura na mão. Menos no-show, sem largar o corte.",
};

export default function BarbeirosTopoPage() {
  return (
    <World icp="barbeiros">
      <MarketingNav icp="barbeiros" current="topo" />

      <main>
        {/* Fisgada de consciência: a promessa central (agenda cheia sem largar a
            tesoura) com CTA leve para o MEIO e WhatsApp como saída secundária. */}
        <HeroBarbeiros nivel="topo" />

        {/* Aprofunda a dor com foto e lista editorial (4 dores) — o custo real da
            cadeira vazia, para o leitor se reconhecer antes de ver a saída. */}
        <ProblemaBarbeiros variant="completo" />

        {/* Tira o medo de complexidade: em três passos a MAISA está no ar. Sem
            CTA (topo é de baixa fricção); serve de teaser do "como funciona". */}
        <ComoFuncionaBarbeiros variant="resumido" />

        {/* O mundo "depois", aspiracional: o mesmo dia rendendo o dobro de corte.
            Fecha o conteúdo na transformação, logo antes do convite. */}
        <AntesDepoisBarbeiros variant="aspiracional" />

        {/* Faixa de conversão de baixa fricção: um único CTA que leva ao passo a
            passo completo (MEIO). Sem preço no topo; imagem de barbearia à noite
            reforça o mundo real. */}
        <CTASection
          icp="barbeiros"
          title="Dá pra ver isso rodando antes de decidir qualquer coisa."
          description="Nada pra instalar agora, sem contrato. Veja o passo a passo de como a MAISA confirma, lembra e recupera cliente pelo WhatsApp — e decida com calma depois."
          primaryLabel="Ver como funciona"
          primaryHref={ICPS.barbeiros.rotas.meio}
          secondary={false}
          image={imagensBarbeiros.fachada}
        />
      </main>

      <Footer icp="barbeiros" />
    </World>
  );
}

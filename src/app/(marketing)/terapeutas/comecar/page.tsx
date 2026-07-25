import type { Metadata } from "next";
import {
  World,
  MarketingNav,
  Footer,
  CTASection,
  imagensTerapeutas,
} from "@/app/(marketing)/_lib";
import {
  Hero,
  ComoFunciona,
  Recursos,
  Planos,
  Depoimentos,
  FAQ,
} from "@/app/(marketing)/_lib/terapeutas";

/* ============================================================================
 * TERAPEUTAS · BASE do funil (BoFu / decisão) — rota /terapeutas/comecar.
 *
 * Intenção: a terapeuta já conhece a solução e está pronta para decidir. A página
 * reduz o risco e fecha: promessa datada + garantia (herói) → mostra que a
 * ativação é rápida (ComoFunciona resumido) → recapitula o valor (Recursos
 * enxuto) → APRESENTA A OFERTA (Planos + garantia) → prova social (Depoimentos)
 * → quebra objeções (FAQ) → empurrão final (CTASection). Uma só <h1> (no Hero).
 *
 * Reaproveitamento entre níveis: todas as seções vêm da biblioteca compartilhada
 * do terapeutas e mudam de ênfase por `nivel="base"` (mesmas seções que aparecem
 * em topo/meio, aqui na versão de fechamento). Ritmo vertical em faixas
 * alternadas (default → panel → default → panel → default → panel → banda navy).
 *
 * PLACEHOLDERS a plugar antes de publicar (fonte única na biblioteca):
 *   • Preços dos planos (R$ 39 / R$ 79) e o "a partir de R$ 39" no FAQ vivem em
 *     _lib/terapeutas/Planos.tsx e _lib/terapeutas/FAQ.tsx.
 *   • Depoimentos são ilustrativos (_lib/terapeutas/Depoimentos.tsx).
 *   • Número real do WhatsApp: WHATSAPP_NUMERO em _lib/icp.ts.
 * ========================================================================== */

export const metadata: Metadata = {
  title: "Comece agora — planos, garantia e ativação em minutos",
  description:
    "Ative a MAISA e tenha as notas fiscais de todos os pacientes em um clique. Planos claros, sem fidelidade e com garantia: se ela não devolver o seu dia no primeiro mês, seu dinheiro de volta.",
  alternates: { canonical: "/terapeutas/comecar" },
};

export default function TerapeutasComecarPage() {
  return (
    <World icp="terapeutas">
      <MarketingNav icp="terapeutas" current="base" />

      <main id="conteudo" tabIndex={-1}>
        {/* Herói de decisão: promessa datada ("comece hoje") + garantia na nota,
            selo de prova reforçando a baixa fricção da ativação. */}
        <Hero
          nivel="base"
          proof={{
            titulo: "Ativação em minutos",
            detalhe: "Tudo por uma conversa no WhatsApp",
          }}
        />

        {/* Tira a objeção "vai dar trabalho migrar": mostra que é simples e curto,
            do primeiro acesso ao clique do fechamento. */}
        <ComoFunciona nivel="base" />

        {/* Recapitula o valor concreto que a assinatura entrega (a nota fiscal em
            destaque + o que fecha a decisão). Ancorável por #recursos. */}
        <Recursos nivel="base" />

        {/* A OFERTA. Dois planos, o Completo em destaque, garantia "se paga no 1º
            mês" e micro-reforços de baixo risco. Âncora #planos (CTA do herói). */}
        <Planos nivel="base" />

        {/* Prova social calma logo após o preço, para sustentar a decisão. */}
        <Depoimentos nivel="base" />

        {/* Objeções finais (preço, fidelidade, LGPD, tempo de setup) resolvidas a
            um passo do clique. Faixa em painel para contraste com a prova acima. */}
        <FAQ nivel="base" tone="panel" />

        {/* Empurrão final: banda navy, um único CTA dominante para o WhatsApp.
            Imagem distinta das demais (detalhe calmo = "tempo recuperado"). */}
        <CTASection
          icp="terapeutas"
          title="Ative a MAISA hoje e feche o mês em um clique."
          description="Traga seus pacientes, deixe o operacional com ela e recupere o dia que sumia com as notas. Se não valer no primeiro mês, seu dinheiro de volta."
          secondary={false}
          image={imagensTerapeutas.detalheCalmo}
        />
      </main>

      <Footer icp="terapeutas" />
    </World>
  );
}

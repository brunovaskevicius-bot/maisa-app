"use client";
import { usePathname } from "next/navigation";
import { ICPS, ctaDoNivel, icpDoPath, nivelDoPath, type ICP } from "./icp";
import { Button } from "./primitives";

/* ----------------------------------------------------------------------------
 * StickyMobileCta — barra fixa inferior que aparece SÓ no mobile (<= 560px, via
 * `.mk-sticky-cta` no marketing.css). Mantém o CTA de conversão ao alcance do
 * polegar em todas as páginas, em vez de escondido no menu hambúrguer. O nível
 * do funil vem do pathname (ponto único: ctaDoNivel) — leve no topo, forte
 * (WhatsApp) na base. Respeita env(safe-area-inset-bottom); o padding-bottom do
 * conteúdo (no .mkt-world) evita que a barra cubra o rodapé.
 *
 * Montado uma vez no <World>, que já provê a classe do mundo. Reaplicamos a
 * classe do mundo aqui também para funcionar caso seja montado avulso (layout).
 * -------------------------------------------------------------------------- */
export function StickyMobileCta({ icp }: { icp?: ICP }) {
  const pathname = usePathname();
  const resolvedIcp = icp ?? icpDoPath(pathname);
  const nivel = nivelDoPath(pathname);
  const cta = ctaDoNivel(resolvedIcp, nivel);
  // base = WhatsApp (verde de conversão); topo/meio = CTA preenchido de avanço.
  const variant = cta.peso === "forte" ? "whatsapp" : "primary";

  return (
    <div className={`${ICPS[resolvedIcp].mundoClass} mk-sticky-cta`}>
      <Button href={cta.href} external={cta.external} variant={variant} size="md" icon={cta.icon} full>
        {cta.label}
      </Button>
    </div>
  );
}

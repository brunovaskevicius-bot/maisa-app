import type { ReactNode } from "react";
import { ICPS, type ICP } from "./icp";
import { StickyMobileCta } from "./StickyMobileCta";

/* ----------------------------------------------------------------------------
 * <World> — wrapper que cada page.tsx usa em volta de TODO o conteúdo (nav +
 * main + footer). Aplica a classe do mundo (que liga os tokens OKLCH escopados)
 * e a superfície `.mkt-world` (bg + fonte de corpo). Assim, Container/Section e
 * qualquer componente interno herdam o clima certo por variáveis CSS.
 * Server Component (sem estado) — pode envolver Server e Client Components.
 *
 * Também provê, de graça em todas as páginas:
 *   • o skip-link "Pular para o conteúdo" (1º foco tabulável) → #conteudo;
 *     as páginas devem marcar seu <main id="conteudo" tabIndex={-1}>.
 *   • a barra de CTA fixa do mobile (StickyMobileCta), ao alcance do polegar.
 * -------------------------------------------------------------------------- */
export function World({
  icp,
  children,
  className,
}: {
  icp: ICP;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[ICPS[icp].mundoClass, "mkt-world", className].filter(Boolean).join(" ")}>
      <a href="#conteudo" className="mk-skip">
        Pular para o conteúdo
      </a>
      {children}
      <StickyMobileCta icp={icp} />
    </div>
  );
}

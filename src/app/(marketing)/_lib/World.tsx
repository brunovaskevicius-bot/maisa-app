import type { ReactNode } from "react";
import { ICPS, type ICP } from "./icp";

/* ----------------------------------------------------------------------------
 * <World> — wrapper que cada page.tsx usa em volta de TODO o conteúdo (nav +
 * main + footer). Aplica a classe do mundo (que liga os tokens OKLCH escopados)
 * e a superfície `.mkt-world` (bg + fonte de corpo). Assim, Container/Section e
 * qualquer componente interno herdam o clima certo por variáveis CSS.
 * Server Component (sem estado) — pode envolver Server e Client Components.
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
      {children}
    </div>
  );
}

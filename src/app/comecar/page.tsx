import type { Metadata } from "next";
import Comecar from "./Comecar";

// ─────────────────────────────────────────────────────────────────────────────
// O WIZARD — de conta criada a negócio de pé.
//
// ⚠️ ATRÁS DO LOGIN, e de propósito: `/comecar` NÃO entra em `PUBLIC_PREFIXES`
// (`saida/supabase/sessao.ts`). Quem não está logado é mandado para o login pelo
// middleware, com `?next=/comecar` — e volta para cá depois de entrar.
//
// É o oposto do `/cadastro`, que precisou ser público porque atende justamente quem ainda
// não tem conta. Aqui a conta já existe; o que falta é o NEGÓCIO.
//
// `noindex` porque isto é tela de cliente logado. Não custa nada e evita que uma URL de
// onboarding apareça em busca, onde ela só pode confundir.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Começar · maisa",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Comecar />;
}

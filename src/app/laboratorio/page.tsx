import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Laboratorio from "./Laboratorio";

// ─────────────────────────────────────────────────────────────────────────────
// LABORATÓRIO DE CONVERSA — falar com a MAISA sem WhatsApp.
//
// Existe porque o tom de um agente conversacional não se afina lendo código. As 69
// asserções que provam os guardrails não dizem nada sobre a MAISA soar como gente — e
// "soar como gente" é metade do produto. Isto é o lugar de descobrir isso antes de pagar
// por um número.
//
// ⚠️ DEV-ONLY. Mesma fronteira da rota (`api/laboratorio/route.ts`): fecha por padrão em
// produção e só abre com `MAISA_LABORATORIO=1`. Uma página sem login que gasta token e
// escreve na agenda não pode ficar de pé em prod por esquecimento.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laboratório · maisa",
  // Não indexar, mesmo com a página fechada em prod: cinto e suspensório custam
  // uma linha, e um vazamento de rota de teste no Google é caro de desfazer.
  robots: { index: false, follow: false },
};

const LIBERADO = process.env.NODE_ENV !== "production" || process.env.MAISA_LABORATORIO === "1";

export default function Page() {
  /* `notFound()` e não uma mensagem de "acesso negado": uma página que se anuncia como
   * existente-mas-fechada conta a quem procura que ela existe. */
  if (!LIBERADO) notFound();
  return <Laboratorio />;
}

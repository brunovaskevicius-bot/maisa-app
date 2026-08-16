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
// ⚠️ DEV-ONLY — e a ROTA não é mais. Esta página fecha por padrão em produção e só abre
// com `MAISA_LABORATORIO=1`; a `api/laboratorio/route.ts` passou a `exigirSessao` em
// 15/08/2026, porque virou a etapa 4 do `/comecar`.
//
// As duas fronteiras deixaram de ser a mesma de propósito. Esta tela é a de DEPURAÇÃO: duas
// colunas, trilha crua em JSON, campo para trocar o telefone do cliente na mão. Nada disso é
// para o dono de barbearia — para ele existe a etapa 4 do wizard, que mostra o mesmo agente
// sem o instrumental. Abrir esta aqui em produção não vaza dado (a rota exige sessão), mas
// entrega uma tela de oficina a quem comprou um produto.
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

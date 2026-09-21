import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// O PORTAL DE COBRANÇA — trocar cartão, baixar fatura, cancelar.
//
// POST /api/assinatura/portal  →  { url }
//
// ── POR QUE UMA ROTA SEPARADA, E NÃO UM `?acao=portal` NA IRMÃ ──
//
// Porque o que acontece do outro lado é diferente em espécie: o checkout CRIA uma
// assinatura, o portal DEIXA A PESSOA CANCELAR A DELA. Juntar os dois num parâmetro faz
// a operação mais destrutiva do produto entrar pela mesma porta da mais construtiva, e
// a diferença entre elas vira uma string no corpo do request.
//
// Separada, ela também é auditável sozinha: "quem abriu o portal esta semana" é a
// pergunta que antecede um churn, e ela se responde com uma linha de log.
//
// ⚠️ CANCELAR AQUI NÃO AVISA O APP NA HORA. O cancelamento vira um evento
// `customer.subscription.updated` que chega no webhook segundos depois. Até ele chegar,
// a tela mostra o estado antigo — e isso é correto: o estado antigo É o estado, porque
// cancelamento na Stripe vale ao fim do período pago.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  const origem = new URL(req.url).origin;

  try {
    const { url } = await app.abrirPortalDeCobranca(porteiro.tenant, {
      /* `/?tela=mais` porque `/faturamento` não é rota — ver o ⚠️ na irmã. */
      voltarPara: `${origem}/?tela=mais`,
    });
    return NextResponse.json({ ok: true, status: "ok", url });
  } catch (e) {
    return falha("assinatura/portal", e);
  }
}

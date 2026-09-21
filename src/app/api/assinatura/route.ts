import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// A ASSINATURA — o que este negócio paga, e o botão que começa a pagar.
//
// GET  /api/assinatura                →  { assinatura }  (ou `null`, e isso não é erro)
// POST /api/assinatura  { plano }     →  { url }         (para onde mandar o navegador)
//
// ── ⚠️ O POST NÃO COBRA NADA. ELE ABRE UMA PÁGINA. ──
//
// Responder 200 aqui significa "a sessão de checkout existe", e mais nada. Quem pagou,
// se pagou e quando pagou é assunto de `/api/stripe/webhook`. Um `redirect` automático
// no lugar do `{ url }` esconderia isso: a tela precisa poder dizer "abrindo pagamento"
// antes de sair, e precisa poder falhar sem sair da página.
//
// A tela também não pode escrever "assinatura ativa" quando a pessoa voltar. Boleto
// demora um dia; a volta do navegador não é confirmação. Ver o ⚠️ em `demo/assinaturas.ts`.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const assinatura = await app.lerAssinatura(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", assinatura });
  } catch (e) {
    return falha("assinatura", e);
  }
}

export async function POST(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  let corpo: { plano?: unknown };
  try {
    corpo = (await req.json()) as { plano?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: "Corpo não é JSON." },
      { status: 400 },
    );
  }

  /* A volta é para ONDE A PESSOA ESTAVA, derivada do pedido — e não de
   * `MAISA_PUBLIC_URL`. A variável aponta para produção mesmo em `.env.local` (é fato
   * conhecido deste repositório), então usá-la aqui jogaria quem testa localmente para
   * dentro do app publicado, com a sessão errada e sem entender por quê. */
  const origem = new URL(req.url).origin;

  try {
    const { url } = await app.abrirCheckout(porteiro.tenant, {
      plano: corpo.plano as never,
      voltarPara: `${origem}/faturamento?pagamento=recebido`,
      cancelarPara: `${origem}/faturamento?pagamento=cancelado`,
    });
    return NextResponse.json({ ok: true, status: "ok", url });
  } catch (e) {
    return falha("assinatura", e);
  }
}

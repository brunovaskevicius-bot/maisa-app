import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR A ASSINATURA — o caminho de quem não tem portal.
//
// POST /api/assinatura/cancelar  →  { ok: true }
//
// ── POR QUE EXISTE, JÁ HAVENDO `/api/assinatura/portal` ──
//
// Porque os dois provedores cumprem a mesma promessa da LP ("cancele quando quiser") por
// caminhos que não se substituem:
//
//   · Stripe ...... tem Billing Portal. A pessoa cancela lá, e o cancelamento vale ao FIM
//                   do período já pago. Esta rota devolve 501.
//   · AbacatePay .. não tem portal nenhum. Cancela por API, e vale NA HORA.
//
// A tela lê `capacidades` em `GET /api/assinatura` e desenha UM dos dois botões. Não os
// dois: duas portas para a operação mais destrutiva do produto é como se acaba com uma
// delas cancelando diferente da outra.
//
// ── ⚠️ SEM CORPO, DE PROPÓSITO ──
//
// Não aceita `{ assinaturaId }`. Qual assinatura cancelar não é escolha de quem clica — um
// id vindo do request deixaria uma sessão cancelar a assinatura de OUTRO negócio. O caso
// de uso lê o id da linha do próprio inquilino. É a mesma razão pela qual `tenantId` nunca
// vem do pedido.
//
// ⚠️ NA ABACATEPAY O CANCELAMENTO É IMEDIATO E IRREVERSÍVEL (`cancelPolicy: NOW`, sem
// carência — a documentação deles é explícita). **A confirmação é obrigação da tela**, e
// ela precisa dizer que o acesso termina agora, não no fim do mês pago. Escrever
// "cancelar" ao lado de um botão que tira o acesso na hora é a diferença entre um churn e
// um pedido de reembolso.
//
// Responder 200 aqui significa "o provedor aceitou o cancelamento". O estado da tela só
// muda quando o webhook `subscription.cancelled` chegar — segundos depois. Até lá o plano
// aparece ativo, e isso é correto: quem grava é sempre o provedor.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    await app.cancelarAssinatura(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok" });
  } catch (e) {
    /* `NaoSuportado` (provedor com portal) vira 501 e `NaoEncontrado` (quem está em trial e
     * não tem assinatura para cancelar) vira 400 — a tradução está em
     * `entrada/http/respostas.ts`, num lugar só. */
    return falha("assinatura/cancelar", e);
  }
}

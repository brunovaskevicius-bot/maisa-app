import { NextResponse } from "next/server";
import { app, servicos } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falhaFiscal } from "@/adaptadores/entrada/http/fiscal";

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAMENTO DE NFS-e — POST /api/nf/cancelar { ref, justificativa? }
// Exige sessão. Usado tanto pelo "modo teste" (emitir → cancelar em segundos, já que
// a NFS-e só autoriza em produção) quanto por cancelamentos reais no futuro.
// Sem token da Focus → cancelamento "simulado" (para testar o fluxo local).
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  const body = await request.json().catch(() => ({} as any));

  try {
    const r = await app.cancelarNota(porteiro.tenant, {
      ref: String(body?.ref ?? ""),
      justificativa: body?.justificativa ? String(body.justificativa) : undefined,
    });

    if (r.status === "cancelado") {
      return NextResponse.json({ ok: true, status: "cancelado", ref: r.ref, simulado: servicos.emissor.simulado });
    }
    return NextResponse.json({ ok: false, status: "erro", ref: r.ref, erros: r.erros });
  } catch (e) {
    return falhaFiscal(e);
  }
}

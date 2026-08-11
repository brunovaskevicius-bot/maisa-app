import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falhaFiscal } from "@/adaptadores/entrada/http/fiscal";

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA DE STATUS DA NFS-e — GET /api/nf/status?ref=...
// Usada pelo front para acompanhar a emissão assíncrona (processando → autorizado).
// Exige sessão; sem token da Focus, responde "simulado".
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  const ref = new URL(request.url).searchParams.get("ref") ?? "";

  try {
    const r = await app.consultarNota(porteiro.tenant, ref);
    return NextResponse.json({
      ok: r.status !== "erro",
      status: r.status,
      ref: r.ref,
      numero: r.numero,
      url: r.url,
      pdf: r.pdf,
      xml: r.xml,
      erros: r.erros,
    });
  } catch (e) {
    return falhaFiscal(e);
  }
}

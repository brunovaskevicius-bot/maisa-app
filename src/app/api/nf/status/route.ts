import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NF_CONFIG } from "@/lib/nf/config";
import { consultarNfse, normalizarStatus } from "@/lib/nf/focus";

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA DE STATUS DA NFS-e — GET /api/nf/status?ref=...
// Usada pelo front para acompanhar a emissão assíncrona (processando → autorizado).
// Exige sessão; sem token da Focus, responde "simulado".
// ─────────────────────────────────────────────────────────────────────────────
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isSupabaseConfigured) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, status: "nao_autenticado" }, { status: 401 });
  }

  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ ok: false, status: "payload_invalido", info: "ref ausente" }, { status: 400 });

  if (!NF_CONFIG.token) {
    return NextResponse.json({ ok: true, status: "simulado", ref });
  }

  try {
    const { data } = await consultarNfse(ref);
    const status = normalizarStatus(data?.status);
    return NextResponse.json({
      ok: status !== "erro",
      status,
      ref,
      numero: data?.numero,
      url: data?.url,
      pdf: data?.url_danfse,
      xml: data?.caminho_xml_nota_fiscal,
      erros: data?.erros,
    });
  } catch {
    return NextResponse.json({ ok: false, status: "erro", ref, erros: [{ mensagem: "Erro ao consultar a Focus NFe." }] }, { status: 502 });
  }
}

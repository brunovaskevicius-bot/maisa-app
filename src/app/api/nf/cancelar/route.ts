import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NF_CONFIG } from "@/lib/nf/config";
import { cancelarNfse } from "@/lib/nf/focus";

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAMENTO DE NFS-e — POST /api/nf/cancelar { ref, justificativa? }
// Exige sessão. Usado tanto pelo "modo teste" (emitir → cancelar em 30s, já que
// a NFS-e só autoriza em produção) quanto por cancelamentos reais no futuro.
// Sem token da Focus → cancelamento "simulado" (para testar o fluxo local).
// ─────────────────────────────────────────────────────────────────────────────
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JUSTIFICATIVA_PADRAO = "Cancelamento automatico de nota emitida para teste de integracao MAISA.";

export async function POST(request: Request) {
  if (isSupabaseConfigured) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, status: "nao_autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as any));
  const ref = String(body?.ref ?? "").trim();
  if (!ref) return NextResponse.json({ ok: false, status: "payload_invalido", info: "ref ausente" }, { status: 400 });

  const justificativa = String(body?.justificativa || JUSTIFICATIVA_PADRAO);

  // Sem token → cancelamento simulado (fluxo validado, sessão exigida).
  if (!NF_CONFIG.token) return NextResponse.json({ ok: true, status: "cancelado", ref, simulado: true });

  try {
    const { data } = await cancelarNfse(ref, justificativa);
    if (data?.status === "cancelado") {
      return NextResponse.json({ ok: true, status: "cancelado", ref });
    }
    return NextResponse.json({
      ok: false,
      status: "erro",
      ref,
      erros: data?.erros ?? [{ mensagem: data?.mensagem ?? "Falha ao cancelar a NFS-e." }],
    });
  } catch {
    return NextResponse.json(
      { ok: false, status: "erro", ref, erros: [{ mensagem: "Erro de conexão ao cancelar a NFS-e." }] },
      { status: 502 },
    );
  }
}

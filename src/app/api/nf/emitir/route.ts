import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// ─────────────────────────────────────────────────────────────────────────────
// EMISSÃO DE NOTA FISCAL — SEMPRE NO SERVIDOR.
// O token da Focus NFe / certificado ficam em env de servidor (FOCUS_NFE_TOKEN),
// NUNCA no navegador. Esta rota (a) exige sessão autenticada e (b) só então
// chamaria a Focus NFe. Assim é impossível "emitir NF pelo front".
// Hoje é um esqueleto seguro; a integração real da Focus NFe entra no passo seguinte.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // 1) Exige login (quando o Auth está configurado).
  if (isSupabaseConfigured) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const token = process.env.FOCUS_NFE_TOKEN; // secret, só servidor

  // 2) Sem token da Focus NFe ainda → emissão simulada NO SERVIDOR (fluxo pronto).
  if (!token) {
    return NextResponse.json({
      status: "simulado",
      numero: "2026/000000",
      info: "Focus NFe ainda não configurada — emissão simulada no servidor (sessão validada).",
      recebido: body ?? null,
    });
  }

  // 3) TODO (próximo passo): chamar a API da Focus NFe aqui usando `token`.
  //    Ex.: POST https://api.focusnfe.com.br/v2/nfse ... (Authorization: token)
  return NextResponse.json({ status: "ok" });
}

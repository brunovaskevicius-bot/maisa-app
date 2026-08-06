import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGoogleConfigured, googleFaltando } from "@/lib/google/config";
import { listar } from "@/lib/google/integracoes";

// Quem já conectou a agenda. É o que a UI consulta para decidir entre
// "Conectar agenda Google" e "Conectado como fulano@".
// Devolve apenas profissionalId + e-mail — nunca token, nem cifrado.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isGoogleConfigured) {
    return NextResponse.json({ status: "nao_configurado", faltando: googleFaltando(), conexoes: [] });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ status: "login_necessario", conexoes: [] });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: "nao_autenticado", conexoes: [] });

  return NextResponse.json({ status: "ok", conexoes: await listar() });
}

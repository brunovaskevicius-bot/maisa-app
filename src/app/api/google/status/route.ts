import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { createClient } from "@/adaptadores/saida/supabase/server";
import { isSupabaseConfigured } from "@/adaptadores/saida/supabase/config";
import { googleFaltando, isGoogleConfigured } from "@/adaptadores/saida/google/config";

// Quem já conectou a agenda. É o que a UI consulta para decidir entre
// "Conectar agenda Google" e "Conectado como fulano@".
// Devolve apenas profissionalId + e-mail — nunca token, nem cifrado.
//
// Esta é a única rota que NÃO usa o porteiro de `entrada/http/contexto.ts`, e é de
// propósito: ela existe justamente para RELATAR o estado da sessão e da configuração.
// Responder 401 seria esconder a resposta que a pergunta pede — por isso tudo aqui é
// 200 com um `status` dentro.

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

  const conexoes = await app.listarConexoes({
    tenantId: user.id,
    usuarioId: user.id,
    ator: { tipo: "usuario", id: user.id },
  });
  return NextResponse.json({ status: "ok", conexoes });
}

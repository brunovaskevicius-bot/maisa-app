import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGoogleConfigured, googleFaltando } from "@/lib/google/config";
import { acessoValido } from "@/lib/google/integracoes";
import { PrecisaReconectar } from "@/lib/google/oauth";
import { listar, LimiteDoGoogle } from "@/lib/google/calendario";
import * as D from "@/lib/data";

// ─────────────────────────────────────────────────────────────────────────────
// LER A AGENDA DO GOOGLE — o que faz a tela Agenda mostrar a agenda de verdade.
//
// GET /api/google/agenda?pid=pr1&de=2026-07-27&ate=2026-09-06
//
// Rota SEPARADA de /api/google/evento de propósito, ainda que as duas falem com o
// mesmo calendário. A diferença não é técnica, é de consequência: um POST que falha
// é uma ação sua que não aconteceu e merece um toast; um GET que falha é a tela
// inteira sem conteúdo e merece um aviso DENTRO do cartão, com o que fazer a seguir.
// Misturar as duas na mesma rota misturaria as duas semânticas de erro.
//
// A conversão de instante para data civil + hora decimal acontece AQUI, no servidor:
// o cliente recebe a grade já na língua dela e nunca precisa saber que existe fuso.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Teto da janela. A grade de um mês pede ~42 dias; 120 dá folga para qualquer visão
 *  futura sem deixar um pedido forjado varrer dez anos da agenda de alguém. */
const MAX_DIAS = 120;

const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

export async function GET(request: Request) {
  if (!isGoogleConfigured) {
    return NextResponse.json({ ok: false, status: "nao_configurado", faltando: googleFaltando() }, { status: 400 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, status: "login_necessario" }, { status: 401 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, status: "nao_autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pid = searchParams.get("pid") ?? "";
  const de = searchParams.get("de") ?? "";
  const ate = searchParams.get("ate") ?? "";

  if (!D.COLUNAS_AGENDA.includes(pid)) {
    return NextResponse.json({ ok: false, status: "profissional_invalido" }, { status: 400 });
  }
  if (!ehData(de) || !ehData(ate) || de > ate) {
    return NextResponse.json({ ok: false, status: "janela_invalida" }, { status: 400 });
  }
  if ((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000 > MAX_DIAS) {
    return NextResponse.json({ ok: false, status: "janela_grande" }, { status: 400 });
  }

  try {
    const { token, email } = await acessoValido(pid);
    const eventos = await listar({ token, de, ate });
    // A janela volta na resposta: o cliente guarda um cache acumulativo e precisa saber
    // QUAL pedaço este lote substitui. Sem isso, uma resposta atrasada de agosto poderia
    // sobrescrever setembro — e a diferença apareceria como eventos sumindo sozinhos.
    return NextResponse.json({ ok: true, status: "ok", googleEmail: email, de, ate, eventos });
  } catch (e) {
    if (e instanceof PrecisaReconectar) {
      return NextResponse.json({ ok: false, status: "reconectar", info: e.motivo }, { status: 409 });
    }
    if (e instanceof LimiteDoGoogle) {
      return NextResponse.json({ ok: false, status: "limite", info: e.message }, { status: 429 });
    }
    console.error("[google/agenda]", String(e));
    return NextResponse.json(
      { ok: false, status: "erro", info: e instanceof Error ? e.message : "Falha ao ler a agenda." },
      { status: 502 },
    );
  }
}

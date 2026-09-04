import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessaoComGoogle } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// LER A AGENDA — o que faz a tela Agenda mostrar a agenda de verdade.
//
// GET /api/google/agenda?pid=pr1&de=2026-07-27&ate=2026-09-06
//
// Rota SEPARADA de /api/google/evento de propósito, ainda que as duas falem com o
// mesmo calendário. A diferença não é técnica, é de consequência: um POST que falha
// é uma ação sua que não aconteceu e merece um toast; um GET que falha é a tela
// inteira sem conteúdo e merece um aviso DENTRO do cartão, com o que fazer a seguir.
// Misturar as duas na mesma rota misturaria as duas semânticas de erro.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const porteiro = await exigirSessaoComGoogle();
  if (barrou(porteiro)) return porteiro.barrado;

  const { searchParams } = new URL(request.url);

  try {
    const r = await app.lerAgenda(porteiro.tenant, {
      agendaId: searchParams.get("pid") ?? "",
      de: searchParams.get("de") ?? "",
      ate: searchParams.get("ate") ?? "",
    });
    // A janela volta na resposta: o cliente guarda um cache acumulativo e precisa saber
    // QUAL pedaço este lote substitui. Sem isso, uma resposta atrasada de agosto poderia
    // sobrescrever setembro — e a diferença apareceria como eventos sumindo sozinhos.
    return NextResponse.json({
      ok: true, status: "ok",
      de: r.janela.de, ate: r.janela.ate,
      eventos: r.eventos,
    });
  } catch (e) {
    return falha("google/agenda", e);
  }
}

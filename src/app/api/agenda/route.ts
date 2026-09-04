import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessao } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// LER A AGENDA — o que faz a tela Agenda mostrar a agenda de verdade.
//
// GET /api/agenda?pid=pr1&de=2026-07-27&ate=2026-09-06
//
// ⚠️ ESTA ROTA MORAVA EM `/api/google/agenda`, E O NOME MENTIA (ADR-0009). A agenda é do
// produto; o Google é uma camada aditiva que o caso de uso soma quando existe. O que o
// nome antigo custava não era estética: o porteiro era `exigirSessaoComGoogle`, que
// devolve 400 `nao_configurado` quando o AMBIENTE não tem credencial do Google — então
// num deploy sem Google ninguém conseguia ler a própria agenda. Agora é `exigirSessao`.
//
// Rota SEPARADA de /api/atendimentos de propósito. A diferença não é técnica, é de
// consequência: um POST que falha é uma ação sua que não aconteceu e merece um toast; um
// GET que falha é a tela inteira sem conteúdo e merece um aviso DENTRO do cartão, com o
// que fazer a seguir. Misturar as duas na mesma rota misturaria as semânticas de erro.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const porteiro = await exigirSessao();
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
    return falha("agenda", e);
  }
}

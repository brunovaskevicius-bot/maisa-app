import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessaoComGoogle } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// ATENDIMENTO NA AGENDA — sempre no servidor.
//
// POST   → marca o atendimento (com videochamada, se pedido) e devolve o link
// DELETE → cancela
//
// A rota é FINA de propósito: ela só traduz HTTP para o caso de uso. Toda a regra
// (validação, allowlist, idempotência, título do evento) mora em
// `nucleo/aplicacao/agendar-atendimento.ts`, porque o agente de WhatsApp vai chamar
// a MESMA função sem passar por aqui. Quando isso valia como "a rota faz tudo", a
// única forma de marcar um horário era ter um navegador aberto.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const porteiro = await exigirSessaoComGoogle();
  if (barrou(porteiro)) return porteiro.barrado;

  const body = await request.json().catch(() => ({} as any));

  try {
    const r = await app.agendarAtendimento(porteiro.tenant, {
      agendaId: String(body?.profissionalId ?? ""),
      maisaAg: String(body?.maisaAg ?? ""),
      data: String(body?.data ?? ""),
      inicio: Number(body?.inicio),
      duracao: body?.duracao != null ? Number(body.duracao) : undefined,
      servicoId: String(body?.servicoId ?? ""),
      servicoNome: body?.servicoNome != null ? String(body.servicoNome) : undefined,
      servicoValor: body?.servicoValor != null ? Number(body.servicoValor) : undefined,
      clienteId: String(body?.clienteId ?? ""),
      clienteNome: body?.clienteNome != null ? String(body.clienteNome) : undefined,
      clienteTelefone: body?.clienteTelefone != null ? String(body.clienteTelefone) : undefined,
      comMeet: body?.comMeet !== false,
      convidarCliente: body?.convidarCliente === true,
    });

    return NextResponse.json({
      ok: true,
      // `criado` | `ja_existia` — a tela distingue para não dizer "marcado!" duas vezes.
      status: r.situacao === "ja_existia" ? "ja_existia" : "criado",
      eventoId: r.eventoId,
      meetLink: r.meetLink,
      htmlLink: r.htmlLink,
      inicioISO: r.inicioISO,
      semMeet: r.semMeet,
    });
  } catch (e) {
    return falha("google/evento", e);
  }
}

export async function DELETE(request: Request) {
  const porteiro = await exigirSessaoComGoogle();
  if (barrou(porteiro)) return porteiro.barrado;

  const { searchParams } = new URL(request.url);

  try {
    await app.cancelarAtendimento(porteiro.tenant, {
      agendaId: searchParams.get("pid") ?? "",
      eventoId: searchParams.get("eventoId") ?? "",
    });
    return NextResponse.json({ ok: true, status: "cancelado" });
  } catch (e) {
    return falha("google/evento", e);
  }
}

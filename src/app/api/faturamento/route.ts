import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessao } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// O FATURAMENTO — o que falta emitir, o que já saiu, e se dá para emitir.
//
// GET /api/faturamento → { aFaturar, emitidas, ambiente, falta }
//
// ── ★ POR QUE ESTA ROTA EXISTE ──
//
// Porque até 17/08/2026 a tela de Faturamento se montava com DUAS coisas erradas:
//
//   • `v_clientes.valor` — o total da COMPETÊNCIA do cliente, não "desde a última emissão".
//     Emitir duas vezes no mesmo mês cobrava o mês inteiro nas duas;
//   • o "já emitiu" vinha do `localStorage`, mapeado por cliente. Trocar de navegador
//     ressuscitava o botão, e clicar emitia o SEGUNDO documento fiscal do mesmo serviço.
//
// Agora as duas respostas vêm do banco: `aFaturar` é `atendimentos.nota_id is null`, que já
// significa "desde a última emissão" e já exclui quem tem nota. As duas metades da
// reclamação do Bruno caem da mesma coluna.
//
// ⚠️ `exigirSessao`, e não `sessaoOuDemo` como os `/api/nf/*`. Aqui se lê quanto cada cliente
// deve e o CPF dele — dado de faturamento de um negócio inteiro. Um inquilino de demonstração
// respondendo isto seria uma rota que lista dinheiro sem login em ambiente sem Supabase.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const f = await app.lerFaturamento(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...f });
  } catch (e) {
    return falha("faturamento", e);
  }
}

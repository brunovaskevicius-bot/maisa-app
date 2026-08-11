/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE ENTRADA (HTTP) — erro de domínio vira status HTTP.
 *
 * O núcleo lança `DadoInvalido`, `PrecisaReconectar`, `LimiteDoProvedor`. Nada disso
 * é HTTP. A tradução vive aqui, num lugar só, e é o que garante que duas rotas nunca
 * respondam diferente para a mesma falha.
 *
 * ⚠️ Os nomes de `status` são CONTRATO com o navegador: o store casa string por string
 * (ver `RESPOSTA_GOOGLE` e o tratamento de `reconectar`/`limite` em ui/estado/store).
 * Mudar um nome aqui é mudar o comportamento da tela.
 * ────────────────────────────────────────────────────────────────────────────── */

import { NextResponse } from "next/server";
import {
  DadoInvalido, LimiteDoProvedor, NaoConfigurado, NaoEncontrado, PrecisaReconectar,
} from "@/nucleo/dominio/erros";

/** Campo do pedido → status que a tela conhece. O que não estiver aqui é payload_invalido. */
const STATUS_POR_CAMPO: Record<string, string> = {
  agendaId: "profissional_invalido",
  janela: "janela_invalida",
};

export function falha(escopo: string, e: unknown): NextResponse {
  if (e instanceof NaoConfigurado) {
    return NextResponse.json({ ok: false, status: "nao_configurado", faltando: e.faltando }, { status: 400 });
  }

  if (e instanceof DadoInvalido) {
    const status = (e.campo && STATUS_POR_CAMPO[e.campo]) || "payload_invalido";
    return NextResponse.json({ ok: false, status, info: e.motivo }, { status: 400 });
  }

  if (e instanceof NaoEncontrado) {
    return NextResponse.json({ ok: false, status: "payload_invalido", info: e.message }, { status: 400 });
  }

  // 409 e não 500: existe uma AÇÃO do usuário que resolve, e a tela oferece o botão.
  if (e instanceof PrecisaReconectar) {
    return NextResponse.json({ ok: false, status: "reconectar", info: e.motivo }, { status: 409 });
  }

  // 429: transitório. A tela não grita — espera e tenta de novo sozinha.
  if (e instanceof LimiteDoProvedor) {
    return NextResponse.json({ ok: false, status: "limite", info: e.message }, { status: 429 });
  }

  console.error(`[${escopo}]`, String(e));
  return NextResponse.json(
    { ok: false, status: "erro", info: e instanceof Error ? e.message : "Falha ao falar com o serviço." },
    { status: 502 },
  );
}

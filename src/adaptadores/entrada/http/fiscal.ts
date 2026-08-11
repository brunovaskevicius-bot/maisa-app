/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE ENTRADA (HTTP) — erros da nota fiscal.
 *
 * As rotas fiscais têm um formato de erro PRÓPRIO (`erros: [{ mensagem }]`), herdado
 * da Focus e já entranhado na tela de Faturamento. Por isso não usam o `falha()`
 * genérico: um `info: string` no lugar de uma lista de mensagens faria a tela mostrar
 * "undefined" em toda rejeição da prefeitura.
 *
 * ⚠️ Contrato com o store (ui/estado/store → emitirNota): `config_incompleta` sai com
 * HTTP 200 e um `faltando`, porque não é falha de requisição — é o app dizendo ao dono
 * quais variáveis fiscais ele ainda precisa preencher.
 * ────────────────────────────────────────────────────────────────────────────── */

import { NextResponse } from "next/server";
import { DadoInvalido, NaoConfigurado } from "@/nucleo/dominio/erros";

export function falhaFiscal(e: unknown): NextResponse {
  if (e instanceof NaoConfigurado) {
    return NextResponse.json({ ok: false, status: "config_incompleta", faltando: e.faltando });
  }

  if (e instanceof DadoInvalido) {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: e.motivo },
      { status: 400 },
    );
  }

  console.error("[nf]", String(e));
  return NextResponse.json(
    { ok: false, status: "erro", erros: [{ mensagem: e instanceof Error ? e.message : "Falha ao falar com a Focus NFe." }] },
    { status: 502 },
  );
}

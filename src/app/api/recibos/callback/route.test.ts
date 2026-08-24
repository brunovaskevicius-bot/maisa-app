/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * ★ **GRAVAR ANTES DE RESPONDER 200.** A doc da Rebots diz que o dado é descartado depois da
 * nossa confirmação — "will be discarded and cannot be recovered" — e a API deles não tem
 * endpoint de consulta. Somados: um 200 nosso sem gravação **apaga a única cópia do desfecho que
 * existe no mundo**. A linha fica `pendente` para sempre, o pagamento segue trancado, e não há a
 * quem perguntar.
 *
 * Então falha de gravação tem que virar 500, para eles reentregarem. É o único teste deste
 * arquivo cuja ausência custaria um documento fiscal perdido em vez de um inconveniente.
 *
 * E a falha fechada: **sem segredo configurado, 401 em tudo**. O custo de errar para este lado é
 * um callback reentregue; para o outro, é qualquer um na internet marcando recibos como
 * "emitido" — o estado do qual o pagamento nunca mais volta para a lista.
 * ────────────────────────────────────────────────────────────────────────────── */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DesfechoDeRecibo, ReciboEmitido } from "@/nucleo/dominio/recibo-unitario";

const SEGREDO = "segredo-do-teste";

/** O que o dublê do livro-razão fez. Reiniciado por teste. */
let fechados: DesfechoDeRecibo[] = [];
let soltos: string[] = [];
let tenantResolvido: string | null = "t1";
let fecharDevolve: ReciboEmitido | null | "estoura" = null;

const linha = (over: Partial<ReciboEmitido> = {}): ReciboEmitido => ({
  id: "rec1", canal: "rebots", situacao: "emitido",
  protocolo: "rec-uuid-1", chave: "REC-9",
  pdfUrl: "https://x/9.pdf", pdfExpiraEm: "2026-08-26T00:00:00-03:00",
  erro: null, criadoEm: "2026-08-24T10:00:00-03:00", emitidoEm: "2026-08-24T10:05:00-03:00",
  ...over,
});

vi.mock("@/adaptadores/saida/supabase/livro-de-recibos", () => ({
  async tenantDoProtocolo() { return tenantResolvido; },
  livroDeRecibosSupabase: {
    async fechar(_t: unknown, d: DesfechoDeRecibo) {
      fechados.push(d);
      if (fecharDevolve === "estoura") throw new Error("conexão com o banco caiu");
      return fecharDevolve;
    },
    async soltar(_t: unknown, id: string) { soltos.push(id); return true; },
  },
}));

async function rota(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ RECIBOS_CALLBACK_SECRET: SEGREDO, ...env })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import("./route")).POST;
}

const pedir = (corpo: unknown, cabecalhos: Record<string, string> = { apikey: SEGREDO }) =>
  new Request("http://local/api/recibos/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cabecalhos },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });

const CALLBACK_OK = {
  receipt_id: "rec-uuid-1", issuer_code: "12345678909", success: true,
  key: "REC-9", file_url: "https://x/9.pdf", status_message: "ok",
  original_action: "issue", test: false,
};

const envOriginal = { ...process.env };

beforeEach(() => {
  fechados = []; soltos = []; tenantResolvido = "t1"; fecharDevolve = linha();
});
afterEach(() => { process.env = { ...envOriginal }; });

describe("autenticação — falha fechada", () => {
  it("sem segredo no ambiente, 401 mesmo com corpo perfeito", async () => {
    const POST = await rota({ RECIBOS_CALLBACK_SECRET: undefined, ROTINAS_SECRET: undefined });
    const r = await POST(pedir(CALLBACK_OK, {}));

    expect(r.status).toBe(401);
    /* ⚠️ E não gravou nada: um 401 que já tivesse escrito seria pior que inútil. */
    expect(fechados).toEqual([]);
  });

  it("segredo errado, 401", async () => {
    const POST = await rota();
    expect((await POST(pedir(CALLBACK_OK, { apikey: "chute" }))).status).toBe(401);
    expect(fechados).toEqual([]);
  });

  it("aceita Bearer, além de apikey", async () => {
    const POST = await rota();
    const r = await POST(pedir(CALLBACK_OK, { authorization: `Bearer ${SEGREDO}` }));
    expect(r.status).toBe(200);
  });

  /* `ROTINAS_SECRET` é a queda: um segredo só para o agendador e o callback é aceitável, e
   * evita mais uma variável esquecida na Vercel. */
  it("cai para ROTINAS_SECRET quando o específico não existe", async () => {
    const POST = await rota({ RECIBOS_CALLBACK_SECRET: undefined, ROTINAS_SECRET: SEGREDO });
    expect((await POST(pedir(CALLBACK_OK))).status).toBe(200);
  });
});

describe("o caminho felizardo", () => {
  it("grava o desfecho traduzido e responde a situação", async () => {
    const POST = await rota();
    const r = await POST(pedir(CALLBACK_OK));

    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, situacao: "emitido" });
    expect(fechados).toHaveLength(1);
    expect(fechados[0]).toMatchObject({
      protocolo: "rec-uuid-1", situacao: "emitido",
      chave: "REC-9", pdfUrl: "https://x/9.pdf",
    });
    /* Emitido NÃO solta o pagamento — ele saiu, e soltar faria o lote do mês emitir o segundo. */
    expect(soltos).toEqual([]);
  });

  /* Recusa confirmada pelo canal é a única transição que devolve o pagamento à lista. */
  it("recusa solta o pagamento", async () => {
    fecharDevolve = linha({ situacao: "recusado", chave: null, pdfUrl: null, erro: "Ocupação não cadastrada." });
    const POST = await rota();

    const r = await POST(pedir({ receipt_id: "rec-uuid-1", success: false, status_message: "Ocupação não cadastrada." }));

    expect(await r.json()).toEqual({ ok: true, situacao: "recusado" });
    expect(soltos).toEqual(["rec1"]);
  });

  /* Reentrega, ou a reconciliação chegou primeiro. **200 e não erro**: pedir reentrega de algo
   * já gravado é loop infinito de webhook. */
  it("linha já fechada devolve 200, não erro", async () => {
    fecharDevolve = null;
    const POST = await rota();

    const r = await POST(pedir(CALLBACK_OK));

    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, situacao: "ja_fechado" });
    expect(soltos).toEqual([]);
  });
});

describe("★ falha de gravação vira 500, para eles reentregarem", () => {
  /* O TESTE MAIS IMPORTANTE DESTE ARQUIVO. Ver o cabeçalho. */
  it("banco fora do ar responde 500, nunca 200", async () => {
    fecharDevolve = "estoura";
    const POST = await rota();

    const r = await POST(pedir(CALLBACK_OK));

    expect(r.status).toBe(500);
    const j = await r.json();
    expect(j.ok).toBe(false);
    expect(j.erro).toBe("falha_ao_gravar");
  });
});

describe("corpo e protocolo tortos não são incidente", () => {
  it("JSON ilegível é 400 — reentregar não conserta sintaxe", async () => {
    const POST = await rota();
    const r = await POST(pedir("{isso não é json", { apikey: SEGREDO }));

    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe("corpo_invalido");
  });

  it("sem receipt_id é 400 — não há de quem seja o desfecho", async () => {
    const POST = await rota();
    const r = await POST(pedir({ success: true, key: "K" }));

    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe("sem_receipt_id");
    expect(fechados).toEqual([]);
  });

  /* Protocolo desconhecido é ruído, tentativa de terceiro, ou reentrega de algo apagado. 404 e
   * não 500 — nada disso é incidente nosso. */
  it("protocolo que não existe é 404", async () => {
    tenantResolvido = null;
    const POST = await rota();
    const r = await POST(pedir(CALLBACK_OK));

    expect(r.status).toBe(404);
    expect((await r.json()).erro).toBe("protocolo_desconhecido");
    expect(fechados).toEqual([]);
  });
});

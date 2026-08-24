/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * A FORMA das requisições e a tradução das respostas — com `fetch` dublado. **Não** que a Rebots
 * as aceite: não temos conta nem chave, e o LEIA-ME desta pasta diz isso.
 *
 * Duas garantias valem mais que as outras:
 *
 *   1 · `test: true` em toda emissão enquanto `REBOTS_PRODUCAO` não for exatamente `"true"`.
 *       É a única flag do repo cujo padrão é "não valendo", porque errar para o outro lado
 *       custa um documento fiscal no CPF de uma paciente.
 *
 *   2 · A `master_key` aparece EXCLUSIVAMENTE no `/auth/token`. Se ela vazar para o corpo de
 *       `/receipts`, cada emissão multiplica a chance de ela cair num log de terceiro.
 * ────────────────────────────────────────────────────────────────────────────── */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmissorCredenciado, PedidoDeRecibo } from "@/nucleo/dominio/recibo-unitario";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";

const t: ContextoTenant = { tenantId: "t1", usuarioId: "u1", ator: { tipo: "usuario", id: "u1" } };

const carla: EmissorCredenciado = {
  cpf: "123.456.789-09",
  ocupacao: "psicologo",
  registroProfissional: " CRP 06/123456 ",
};

const pedido = (over: Partial<PedidoDeRecibo> = {}): PedidoDeRecibo => ({
  referencia: "rec-uuid-1",
  dataPagamento: "2026-08-14",
  valor: 250,
  descricao: "Atendimento realizado em 14/08/2026",
  cpfPagador: "987.654.321-00",
  cpfBeneficiario: "987.654.321-00",
  ...over,
});

/** Cada chamada capturada: caminho, corpo e se levava Authorization. */
type Chamada = { caminho: string; corpo: any; comBearer: boolean };

function dublarFetch(respostas: { status: number; corpo: unknown }[]) {
  const chamadas: Chamada[] = [];
  let i = 0;

  vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
    const corpo = JSON.parse(String(init?.body ?? "{}"));
    chamadas.push({
      caminho: String(url).replace(/^https?:\/\/[^/]+/, ""),
      corpo,
      comBearer: Boolean(init?.headers?.Authorization),
    });
    const r = respostas[Math.min(i++, respostas.length - 1)];
    return {
      status: r.status,
      async text() { return JSON.stringify(r.corpo); },
    } as any;
  }));

  return chamadas;
}

const TOKEN_OK = { status: 200, corpo: { access_token: "jwt-1", token_type: "Bearer", client_name: "maisa" } };
const ACEITO = { status: 200, corpo: { message: "registrado" } };

/** Carrega o módulo com o ambiente do teste — `config.ts` lê env no import. */
async function carregar(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries({
    REBOTS_IDENTIFICADOR: "maisa",
    REBOTS_MASTER_KEY: "chave-secreta-do-teste",
    REBOTS_BASE_URL: "https://api.rebots.test",
    ...env,
  })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const mod = await import("./emissor-recibo");
  const cli = await import("./cliente");
  cli.esquecerTokenRebots();
  return mod;
}

const envOriginal = { ...process.env };

beforeEach(() => { vi.restoreAllMocks(); });
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...envOriginal };
});

describe("emitir", () => {
  /* ★ A GARANTIA 1. */
  it("sem `REBOTS_PRODUCAO=true`, manda `test: true`", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar({ REBOTS_PRODUCAO: undefined });

    await emissorReciboRebots.emitir(t, carla, pedido());

    const emissao = chamadas.find((c) => c.caminho.endsWith("/receipts"))!;
    expect(emissao.corpo.test).toBe(true);
  });

  it("`REBOTS_PRODUCAO=false` também é teste — só `true` vale", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar({ REBOTS_PRODUCAO: "false" });

    await emissorReciboRebots.emitir(t, carla, pedido());
    expect(chamadas.find((c) => c.caminho.endsWith("/receipts"))!.corpo.test).toBe(true);
  });

  it("`REBOTS_PRODUCAO=true` vale de verdade", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar({ REBOTS_PRODUCAO: "true" });

    await emissorReciboRebots.emitir(t, carla, pedido());
    expect(chamadas.find((c) => c.caminho.endsWith("/receipts"))!.corpo.test).toBe(false);
  });

  /* ★ A GARANTIA 2. */
  it("a master_key aparece SÓ no /auth/token", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.emitir(t, carla, pedido());

    const auth = chamadas.filter((c) => c.caminho.endsWith("/auth/token"));
    const resto = chamadas.filter((c) => !c.caminho.endsWith("/auth/token"));

    expect(auth).toHaveLength(1);
    expect(auth[0].corpo.master_key).toBe("chave-secreta-do-teste");
    for (const c of resto) {
      expect(JSON.stringify(c.corpo)).not.toContain("chave-secreta-do-teste");
      expect(c.comBearer).toBe(true);
    }
  });

  it("manda a NOSSA referência como receipt_id", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    const r = await emissorReciboRebots.emitir(t, carla, pedido({ referencia: "rec-42" }));

    expect(chamadas.find((c) => c.caminho.endsWith("/receipts"))!.corpo.receipt_id).toBe("rec-42");
    /* O protocolo devolvido é a nossa chave — é isso que zera a janela sem protocolo. */
    expect(r.protocolo).toBe("rec-42");
  });

  /* ⚠️ 200 deles quer dizer "registrei o pedido", não "emiti". Ler como sucesso é a tela
   * prometer um documento que talvez não exista. */
  it("200 não vira `emitido`", async () => {
    dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    const r = await emissorReciboRebots.emitir(t, carla, pedido());
    expect(r.situacao).toBe("pendente");
    expect(r.chave).toBeNull();
  });

  it("limpa máscara de CPF e traduz ocupação para inteiro", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.emitir(t, carla, pedido());
    const c = chamadas.find((x) => x.caminho.endsWith("/receipts"))!.corpo;

    expect(c.issuer_code).toBe("12345678909");
    expect(c.payer).toBe("98765432100");
    expect(c.beneficiary).toBe("98765432100");
    expect(c.occupation_code).toBe(255);
    expect(c.registration).toBe("CRP 06/123456");
    expect(c.amount).toBe(250);
    expect(c.date).toBe("2026-08-14");
  });

  /* 4xx é problema do PEDIDO, e a frase deles é o que a dona precisa ler. */
  it("4xx vira DadoInvalido com a frase do canal", async () => {
    dublarFetch([TOKEN_OK, {
      status: 400,
      corpo: { error_code: "INVALID_CPF", error_message: "Beneficiário do serviço inválido." },
    }]);
    const { emissorReciboRebots } = await carregar();

    await expect(emissorReciboRebots.emitir(t, carla, pedido()))
      .rejects.toThrow("Beneficiário do serviço inválido.");
  });

  /* 5xx é problema deles, e a frase certa não é sobre o dado da dona. */
  it("5xx não vira DadoInvalido", async () => {
    dublarFetch([TOKEN_OK, { status: 503, corpo: { error_message: "upstream" } }]);
    const { emissorReciboRebots } = await carregar();

    await expect(emissorReciboRebots.emitir(t, carla, pedido()))
      .rejects.toThrow(/fora do ar \(503\)/);
  });

  /* O TTL do token não é documentado, então a única fonte confiável de "venceu" é o 401. */
  it("401 pega token novo e tenta uma vez", async () => {
    const chamadas = dublarFetch([
      TOKEN_OK,
      { status: 401, corpo: { error_message: "expired" } },
      { status: 200, corpo: { access_token: "jwt-2", token_type: "Bearer", client_name: "maisa" } },
      ACEITO,
    ]);
    const { emissorReciboRebots } = await carregar();

    const r = await emissorReciboRebots.emitir(t, carla, pedido());

    expect(r.situacao).toBe("pendente");
    expect(chamadas.map((c) => c.caminho)).toEqual([
      "/receita-saude/v2/auth/token",
      "/receita-saude/v2/receipts",
      "/receita-saude/v2/auth/token",
      "/receita-saude/v2/receipts",
    ]);
  });

  /* ⚠️ Um 4xx de autenticação pode ecoar o que foi mandado — e o que foi mandado é a
   * master_key. A mensagem não pode carregar o corpo cru. */
  it("falha de autenticação não vaza a master_key na mensagem", async () => {
    dublarFetch([{ status: 403, corpo: { echo: { master_key: "chave-secreta-do-teste" } } }]);
    const { emissorReciboRebots } = await carregar();

    await expect(emissorReciboRebots.emitir(t, carla, pedido()))
      .rejects.toThrow(/REBOTS_IDENTIFICADOR/);
    await expect(emissorReciboRebots.emitir(t, carla, pedido()))
      .rejects.not.toThrow(/chave-secreta-do-teste/);
  });
});

describe("cadastrarEmissor", () => {
  it("manda action enable, cpf limpo e ocupação inteira", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.cadastrarEmissor(t, carla);
    const c = chamadas.find((x) => x.caminho.endsWith("/issuers"))!.corpo;

    expect(c.action).toBe("enable");
    expect(c.cpf).toBe("12345678909");
    expect(c.issuer_code).toBe("12345678909");
    expect(c.occupation_code).toBe(255);
    expect(c.identificador).toBe("maisa");
  });
});

describe("consultar", () => {
  /* ⚠️ A DÍVIDA É DELES: cinco endpoints, todos POST, nenhum de consulta. `null` é a resposta
   * honesta — "o canal não me disse" — e o nosso desenho a trata como "continua pendente". */
  it("devolve null sem nem chamar a rede, porque não existe endpoint", async () => {
    const chamadas = dublarFetch([TOKEN_OK]);
    const { emissorReciboRebots } = await carregar();

    expect(await emissorReciboRebots.consultar(t, "rec-42")).toBeNull();
    expect(chamadas).toEqual([]);
  });
});

describe("desfechoDoCallbackRebots", () => {
  const agora = new Date("2026-08-24T12:00:00-03:00");

  it("success traduz para emitido, com chave, PDF e validade de 48h", async () => {
    const { desfechoDoCallbackRebots } = await carregar();

    const d = desfechoDoCallbackRebots({
      receipt_id: "rec-42", issuer_code: "12345678909", success: true,
      key: "REC-ABC-999", file_url: "https://rebots/f/1.pdf",
      status_message: "ok", original_action: "issue", test: false,
    }, agora);

    expect(d).toEqual({
      protocolo: "rec-42",
      situacao: "emitido",
      chave: "REC-ABC-999",
      pdfUrl: "https://rebots/f/1.pdf",
      /* 48h porque a doc diz que o dado é descartado nesse prazo e não há campo de validade.
       * Errar para mais mostraria link morto, e link morto em tela fiscal assusta. */
      pdfExpiraEm: new Date(agora.getTime() + 48 * 3600 * 1000).toISOString(),
      erro: null,
    });
  });

  it("success falso traduz para recusado, com a frase deles", async () => {
    const { desfechoDoCallbackRebots } = await carregar();

    const d = desfechoDoCallbackRebots({
      receipt_id: "rec-42", success: false,
      status_message: "Registro profissional não informado pelo conselho profissional.",
    }, agora);

    expect(d?.situacao).toBe("recusado");
    expect(d?.erro).toBe("Registro profissional não informado pelo conselho profissional.");
    expect(d?.chave).toBeNull();
    expect(d?.pdfUrl).toBeNull();
  });

  /* Sem `receipt_id` não há como saber de quem é o desfecho. A rota trata como 404, não 500 —
   * POST com corpo torto é ruído, não incidente. */
  it("callback sem receipt_id devolve null", async () => {
    const { desfechoDoCallbackRebots } = await carregar();
    expect(desfechoDoCallbackRebots({ success: true, key: "x" }, agora)).toBeNull();
    expect(desfechoDoCallbackRebots(null, agora)).toBeNull();
  });

  /* Emitido sem `file_url` acontece: o importante é o recibo existir. Sem URL não há validade
   * a inventar — `pdfDisponivel` já esconde o botão. */
  it("emitido sem file_url não inventa validade", async () => {
    const { desfechoDoCallbackRebots } = await carregar();
    const d = desfechoDoCallbackRebots({ receipt_id: "rec-42", success: true, key: "K" }, agora);

    expect(d?.situacao).toBe("emitido");
    expect(d?.pdfUrl).toBeNull();
    expect(d?.pdfExpiraEm).toBeNull();
  });
});

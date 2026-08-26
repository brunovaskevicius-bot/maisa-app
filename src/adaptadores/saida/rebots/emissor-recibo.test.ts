/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * A FORMA das requisições e a tradução das respostas — com `fetch` dublado.
 *
 * ⚠️ AGORA COM UMA DIFERENÇA IMPORTANTE: as formas aqui foram conferidas contra o **sandbox de
 * verdade** em 25/08/2026, chamada por chamada, e contra o OpenAPI deles
 * (<https://api.rebots.com.br/static/openapi.yaml>). Antes disso este arquivo prendia a forma que
 * a gente *supunha* — e prendia com confiança cinco coisas erradas. Cada teste que nasceu daquela
 * conferência cita o código de erro que a API devolvia.
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

/* ⚠️ A REFERÊNCIA É UM INTEIRO EM TEXTO, e este fixture dizia `"rec-uuid-1"` — que é exatamente
 * o que a API recusa. Ver `receiptIdParaApi` e o teste do uuid mais abaixo. */
const pedido = (over: Partial<PedidoDeRecibo> = {}): PedidoDeRecibo => ({
  referencia: "1042",
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

  /* ★ O DEFEITO 1 DOS CINCO DE 25/08/2026. Mandávamos o `id` da linha do razão, que é uuid, e a
   * API respondia `RECEIPT_ERROR_024 invalid literal for int() with base 10`. Nenhuma emissão
   * passava — e o teste antigo passava, porque afirmava a forma errada com convicção. */
  it("manda a NOSSA referência como receipt_id, e como INTEIRO", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    const r = await emissorReciboRebots.emitir(t, carla, pedido({ referencia: "1042" }));

    const enviado = chamadas.find((c) => c.caminho.endsWith("/receipts"))!.corpo.receipt_id;
    expect(enviado).toBe(1042);
    expect(typeof enviado).toBe("number");
    /* O protocolo devolvido é a nossa chave — é isso que zera a janela sem protocolo. E ele
     * continua TEXTO no nosso lado: o inteiro é exigência do canal, não do domínio. */
    expect(r.protocolo).toBe("1042");
  });

  /* ⚠️ RECUSA ANTES DA REDE. O 400 deles chegaria à tela da dona como "invalid literal for
   * int()", que não quer dizer nada para ela — e gastaria uma ida ao canal para descobrir algo
   * que se sabia antes de sair. A mensagem aponta a migração que conserta. */
  it("uuid como referência é recusado sem chamar a rede", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await expect(
      emissorReciboRebots.emitir(t, carla, pedido({ referencia: "3f2a1b4c-5d6e-4f8a-9b0c-1d" })),
    ).rejects.toThrow(/023_recibo_numero_e_comprovante/);

    expect(chamadas.filter((c) => c.caminho.endsWith("/receipts"))).toEqual([]);
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

  /* ✅ O VALOR É EM REAIS, e a prova medida no sandbox é o teto: `99999999.99` passa e
   * `100000000` devolve `RECEIPT_ERROR_016 maximum allowed value of 99,999,999.99`. Se o campo
   * fosse em centavos o teto bateria dez mil vezes mais alto — então 250.50 é R$ 250,50, e não
   * R$ 2,50, que era o risco que o `⚠️ FORMATO A CONFIRMAR` marcava. */
  it("o valor vai em reais decimais, não em centavos", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.emitir(t, carla, pedido({ valor: 250.5 }));
    expect(chamadas.find((c) => c.caminho.endsWith("/receipts"))!.corpo.amount).toBe(250.5);
  });

  /* ✅ Só-data basta, testado. O campo é `format: date-time` e o exemplo deles leva hora, mas a
   * hora de um pagamento não é dado que a gente tenha — inventar `T00:00:00` afirmaria uma coisa
   * a mais num documento fiscal. */
  it("a data vai só-data, sem hora inventada", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.emitir(t, carla, pedido({ dataPagamento: "2026-08-14T15:30:00-03:00" }));
    expect(chamadas.find((c) => c.caminho.endsWith("/receipts"))!.corpo.date).toBe("2026-08-14");
  });

  /* ⚠️ String vazia num campo de CPF é pedir para cair na validação deles algum dia
   * (`RECEIPT_ERROR_014`). O campo é opcional — "beneficiário, se diferente do pagador". */
  it("beneficiário vazio é OMITIDO, não mandado em branco", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.emitir(t, carla, pedido({ cpfBeneficiario: "" }));
    const c = chamadas.find((x) => x.caminho.endsWith("/receipts"))!.corpo;

    expect("beneficiary" in c).toBe(false);
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

describe("cancelar", () => {
  /* ★ O DEFEITO 2 DOS CINCO. A chamada saía sem `issuer_code` — campo obrigatório também no
   * cancelamento — e a API respondia `RECEIPT_ERROR_005 Missing field: issuer_code`. Nenhum
   * cancelamento passava, e nada no repositório notava, porque ninguém chama `cancelar` ainda. */
  it("manda issuer_code, que faltava", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.cancelar(t, {
      emissor: carla, protocolo: "1042", motivo: "Valor incorreto",
    });
    const c = chamadas.find((x) => x.caminho.endsWith("/receipts"))!.corpo;

    expect(c.issuer_code).toBe("12345678909");
    expect(c.action).toBe("cancel");
    expect(c.reason).toBe("Valor incorreto");
  });

  /* ⚠️ E O SEGUNDO ERRO DA MESMA CHAMADA: mandava `p.chave` — a chave que a RECEITA devolveu — no
   * `receipt_id`. O canal não acha nada por ela: o cancelamento se identifica pelo número que NÓS
   * cunhamos. Duas coisas erradas numa chamada de cinco campos. */
  it("cancela pelo NOSSO protocolo, não pela chave da Receita", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar();

    await emissorReciboRebots.cancelar(t, {
      emissor: carla, protocolo: "1042", motivo: "Valor incorreto",
    });
    const c = chamadas.find((x) => x.caminho.endsWith("/receipts"))!.corpo;

    expect(c.receipt_id).toBe(1042);
    /* A chave da Receita não tem o que fazer neste corpo. */
    expect(JSON.stringify(c)).not.toContain("REC-");
  });

  it("também nasce em modo teste sem REBOTS_PRODUCAO", async () => {
    const chamadas = dublarFetch([TOKEN_OK, ACEITO]);
    const { emissorReciboRebots } = await carregar({ REBOTS_PRODUCAO: undefined });

    await emissorReciboRebots.cancelar(t, { emissor: carla, protocolo: "1042", motivo: "x" });
    expect(chamadas.find((c) => c.caminho.endsWith("/receipts"))!.corpo.test).toBe(true);
  });
});

describe("consultar", () => {
  /* ⚠️ A DÍVIDA É DELES: nove endpoints no OpenAPI, nenhum GET. (`/expenses/list` existe, mas lê
   * despesa do Carnê-Leão, não recibo.) `null` é a resposta honesta — "o canal não me disse" — e
   * o nosso desenho a trata como "continua pendente". */
  it("devolve null sem nem chamar a rede, porque não existe endpoint", async () => {
    const chamadas = dublarFetch([TOKEN_OK]);
    const { emissorReciboRebots } = await carregar();

    expect(await emissorReciboRebots.consultar(t, "rec-42")).toBeNull();
    expect(chamadas).toEqual([]);
  });
});

describe("lerCallbackRebots", () => {
  const agora = new Date("2026-08-24T12:00:00-03:00");

  /** O corpo como a Rebots manda de verdade: tudo dentro de `data`. */
  const envelopado = (d: Record<string, unknown>) => ({ data: d });

  /* ★ O DEFEITO 3, E O MAIS CARO DOS CINCO. O `CallbackPayload` do OpenAPI tem UM campo, `data`,
   * e é lá dentro que estão `receipt_id`, `success` e `key`. Nós líamos `corpo.receipt_id` direto
   * — `undefined` — então TODO callback real seria respondido com 400 `sem_receipt_id`. Com a
   * linha travada em `pendente` e sem consulta na API, cada um desses seria um recibo resolvível
   * só olhando o e-CAC à mão. */
  it("lê o corpo de dentro do envelope `data`", async () => {
    const { lerCallbackRebots } = await carregar();

    const r = lerCallbackRebots(envelopado({
      receipt_id: "1042", issuer_code: "12345678909", success: true,
      key: "SANDBOX3F2A", file_url: "https://s3/f/1.pdf",
      status_message: "issued", original_action: "issue", test: true,
    }), agora);

    expect(r.tipo).toBe("desfecho");
    if (r.tipo !== "desfecho") return;
    expect(r.desfecho.protocolo).toBe("1042");
    expect(r.desfecho.situacao).toBe("emitido");
    expect(r.desfecho.chave).toBe("SANDBOX3F2A");
  });

  /* Os callbacks de DESPESA deles não são envelopados — o OpenAPI é explícito. Um fornecedor que
   * envelopa em alguns lugares e não em outros vai mudar de ideia; desembrulhar defensivamente
   * custa uma linha. */
  it("aceita também o corpo sem envelope", async () => {
    const { lerCallbackRebots } = await carregar();
    const r = lerCallbackRebots({ receipt_id: "1042", success: true, key: "K" }, agora);

    expect(r.tipo).toBe("desfecho");
    if (r.tipo !== "desfecho") return;
    expect(r.desfecho.protocolo).toBe("1042");
  });

  /* ★ O DEFEITO 4. A validade era calculada como 48h — número que vinha da retenção do
   * *resultado*, não do link. O OpenAPI diz "válida por 5 minutos" e a URL de exemplo carrega
   * `X-Amz-Expires=300`. Com 48h, a tela ofereceria por dois dias um botão morto em cinco
   * minutos. */
  it("a validade do PDF é de CINCO MINUTOS, não 48h", async () => {
    const { lerCallbackRebots } = await carregar();

    const r = lerCallbackRebots(envelopado({
      receipt_id: "1042", success: true, key: "K",
      file_url: "https://s3/f/1.pdf?X-Amz-Expires=300", status_message: "issued",
    }), agora);

    if (r.tipo !== "desfecho") throw new Error("esperava desfecho");
    expect(r.desfecho.pdfExpiraEm).toBe(new Date(agora.getTime() + 300_000).toISOString());
    /* Quem faz a cópia é o caso de uso, com a porta da guarda — o adaptador só diz onde está. */
    expect(r.desfecho.comprovanteCaminho).toBeNull();
  });

  /* ★ O DEFEITO 5, e o mais silencioso. O cancelamento chega com `success: true`, e o código lia
   * qualquer `success: true` como emissão: gravava "emitido" a confirmação de que o documento
   * deixou de existir. A tela seguiria oferecendo o recibo de um cancelamento. */
  it("cancelamento confirmado é `cancelado`, não `emitido`", async () => {
    const { lerCallbackRebots } = await carregar();

    const r = lerCallbackRebots(envelopado({
      receipt_id: "1042", success: true, key: "SANDBOX3F2A",
      status_message: "cancelled", original_action: "cancel", test: true,
    }), agora);

    if (r.tipo !== "desfecho") throw new Error("esperava desfecho");
    expect(r.desfecho.situacao).toBe("cancelado");
    /* Sem arquivo: no cancelamento a `key` é a do recibo original, e um PDF ali seria o
     * documento que acabou de ser cancelado. */
    expect(r.desfecho.pdfUrl).toBeNull();
  });

  it("`original_action: cancel` sozinho já basta — reentrega pode vir sem status", async () => {
    const { lerCallbackRebots } = await carregar();
    const r = lerCallbackRebots(
      envelopado({ receipt_id: "1042", success: true, key: "K", original_action: "cancel" }),
      agora,
    );
    if (r.tipo !== "desfecho") throw new Error("esperava desfecho");
    expect(r.desfecho.situacao).toBe("cancelado");
  });

  /* ★ AINDA O DEFEITO 5, do outro lado. `pending` é estado documentado do callback, e o código
   * antigo o lia como... recusa, porque `success` não era `true`. E `recusado` é o único estado
   * do qual a cascata pode tentar outro canal: um callback "estou na fila" liberava a emissão do
   * SEGUNDO recibo. */
  it("`pending` não é desfecho nenhum — nem emissão, nem recusa", async () => {
    const { lerCallbackRebots } = await carregar();

    const r = lerCallbackRebots(
      envelopado({ receipt_id: "1042", success: false, status_message: "pending" }),
      agora,
    );

    expect(r).toEqual({ tipo: "pendente", protocolo: "1042" });
  });

  it("`pending` com success true também não fecha nada", async () => {
    const { lerCallbackRebots } = await carregar();
    const r = lerCallbackRebots(
      envelopado({ receipt_id: "1042", success: true, status_message: "pending" }),
      agora,
    );
    expect(r.tipo).toBe("pendente");
  });

  /* ⚠️ E NUNCA `status_message` COMO MENSAGEM DE ERRO: o enum é `pending|issued|cancelled`.
   * Escrever "issued" no campo `erro` da tela da dona não explica nada a ninguém. O payload de
   * recibo não tem campo de erro, então quando `success` é `false` o que sabemos é só isso. */
  it("recusa não usa status_message como frase de erro", async () => {
    const { lerCallbackRebots } = await carregar();

    const r = lerCallbackRebots(
      envelopado({ receipt_id: "1042", success: false, status_message: "issued" }),
      agora,
    );

    if (r.tipo !== "desfecho") throw new Error("esperava desfecho");
    expect(r.desfecho.situacao).toBe("recusado");
    expect(r.desfecho.erro).not.toBe("issued");
    expect(r.desfecho.erro).toMatch(/e-CAC/);
    expect(r.desfecho.chave).toBeNull();
  });

  it("se um dia mandarem frase de erro, ela é usada", async () => {
    const { lerCallbackRebots } = await carregar();
    const r = lerCallbackRebots(
      envelopado({ receipt_id: "1042", success: false, error: "Registro não informado pelo CRP." }),
      agora,
    );
    if (r.tipo !== "desfecho") throw new Error("esperava desfecho");
    expect(r.desfecho.erro).toBe("Registro não informado pelo CRP.");
  });

  /* Sem `receipt_id` não há como saber de quem é o desfecho. A rota trata como 400 — POST com
   * corpo torto é ruído, e reentregar não conserta corpo torto. */
  it("callback sem receipt_id é ilegível", async () => {
    const { lerCallbackRebots } = await carregar();
    expect(lerCallbackRebots(envelopado({ success: true, key: "x" }), agora).tipo).toBe("ilegivel");
    expect(lerCallbackRebots(null, agora).tipo).toBe("ilegivel");
    expect(lerCallbackRebots({ data: null }, agora).tipo).toBe("ilegivel");
  });

  /* Emitido sem `file_url` acontece: o importante é o recibo existir. Sem URL não há validade a
   * inventar — `pdfDisponivel` já esconde o botão. */
  it("emitido sem file_url não inventa validade", async () => {
    const { lerCallbackRebots } = await carregar();
    const r = lerCallbackRebots(envelopado({
      receipt_id: "1042", success: true, key: "K", status_message: "issued",
    }), agora);

    if (r.tipo !== "desfecho") throw new Error("esperava desfecho");
    expect(r.desfecho.situacao).toBe("emitido");
    expect(r.desfecho.pdfUrl).toBeNull();
    expect(r.desfecho.pdfExpiraEm).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * A LISTA DE PERMITIDOS NÃO PODE CALAR CLIENTE DE OUTRO INQUILINO.
 *
 * ── O INCIDENTE QUE ESTE ARQUIVO CONGELA (17/08/2026) ──
 *
 * `MAISA_WHATSAPP_PERMITIDOS` nasceu quando existia UM inquilino: o celular pessoal do
 * Bruno. Ela impede que um conhecido dele caia numa IA que marca horário na agenda real.
 * Boa ideia, e ficou global.
 *
 * O que isso vira no dia da primeira venda: a barbearia pareia o WhatsApp dela, o cliente
 * dela escreve "tem horário amanhã?", o telefone desse cliente obviamente não está numa
 * env que fala do celular do Bruno — e a mensagem morre num `return` com HTTP 200. Nada
 * gravado, nada respondido. O dono abre Conversas, vê vazio, e conclui que o produto não
 * funciona. Não há erro em log nenhum: descartar é o comportamento pedido.
 *
 * É o pior tipo de defeito que este produto pode ter — silencioso, e do lado do cliente.
 *
 * ⚠️ ESTES TESTES MANIPULAM `process.env` E REIMPORTAM O MÓDULO. As duas constantes são
 * lidas no topo do arquivo (uma vez, na carga), que é o certo para config — e obriga o
 * teste a usar `resetModules` para ver valores diferentes. Sem isso, todos os casos leriam
 * o mesmo env e passariam sem provar nada.
 * ────────────────────────────────────────────────────────────────────────────── */

import { afterEach, describe, expect, it, vi } from "vitest";

const TENANT_TESTE = "11111111-1111-1111-1111-111111111111";
const OUTRO_TENANT = "22222222-2222-2222-2222-222222222222";
const DO_BRUNO = "5511994294906";
const CLIENTE_DA_BARBEARIA = "5511988887777";

/** Recarrega o módulo com o ambiente pedido — ver o ⚠️ do cabeçalho. */
async function comEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("./contexto");
}

afterEach(() => {
  delete process.env.MAISA_WHATSAPP_PERMITIDOS;
  delete process.env.MAISA_TENANT_DE_TESTE;
  vi.resetModules();
});

describe("numeroPermitido", () => {
  it("sem lista, todo mundo fala — é o fail-open deliberado", async () => {
    const { numeroPermitido } = await comEnv({
      MAISA_WHATSAPP_PERMITIDOS: undefined,
      MAISA_TENANT_DE_TESTE: undefined,
    });

    expect(numeroPermitido(CLIENTE_DA_BARBEARIA, OUTRO_TENANT)).toBe(true);
  });

  /* ★ O TESTE QUE JUSTIFICA O ARQUIVO. Se ele cair, a primeira venda vira suporte. */
  it("cliente de OUTRO inquilino nunca é calado pela lista do Bruno", async () => {
    const { numeroPermitido } = await comEnv({
      MAISA_WHATSAPP_PERMITIDOS: DO_BRUNO,
      MAISA_TENANT_DE_TESTE: TENANT_TESTE,
    });

    expect(numeroPermitido(CLIENTE_DA_BARBEARIA, OUTRO_TENANT)).toBe(true);
  });

  it("no inquilino de teste, quem não está na lista continua calado", async () => {
    const { numeroPermitido } = await comEnv({
      MAISA_WHATSAPP_PERMITIDOS: DO_BRUNO,
      MAISA_TENANT_DE_TESTE: TENANT_TESTE,
    });

    expect(numeroPermitido(CLIENTE_DA_BARBEARIA, TENANT_TESTE)).toBe(false);
    expect(numeroPermitido(DO_BRUNO, TENANT_TESTE)).toBe(true);
  });

  /* Lista escrita sem inquilino declarado é o estado ambíguo, e ele resolve para o lado
   * de RESPONDER: um filtro de teste que cala cliente pagante é pior que filtro nenhum. */
  it("lista sem MAISA_TENANT_DE_TESTE é inerte, não filtra ninguém", async () => {
    const { numeroPermitido, modoDaLista } = await comEnv({
      MAISA_WHATSAPP_PERMITIDOS: DO_BRUNO,
      MAISA_TENANT_DE_TESTE: undefined,
    });

    expect(numeroPermitido(CLIENTE_DA_BARBEARIA, OUTRO_TENANT)).toBe(true);
    expect(numeroPermitido(CLIENTE_DA_BARBEARIA, TENANT_TESTE)).toBe(true);
    /* E o diagnóstico DIZ isso por extenso: o estado perigoso é achar que filtra. */
    expect(String(modoDaLista())).toContain("inerte");
  });

  /* Sem tenant no argumento (chamada antiga, `curl` de diagnóstico) o comportamento
   * seguro é responder — nunca herdar o filtro de um inquilino que não foi informado. */
  it("sem inquilino no argumento, não filtra", async () => {
    const { numeroPermitido } = await comEnv({
      MAISA_WHATSAPP_PERMITIDOS: DO_BRUNO,
      MAISA_TENANT_DE_TESTE: TENANT_TESTE,
    });

    expect(numeroPermitido(CLIENTE_DA_BARBEARIA)).toBe(true);
  });

  it("compara pelos 8 últimos dígitos, com ou sem DDI", async () => {
    const { numeroPermitido } = await comEnv({
      MAISA_WHATSAPP_PERMITIDOS: "(11) 99429-4906",
      MAISA_TENANT_DE_TESTE: TENANT_TESTE,
    });

    expect(numeroPermitido("5511994294906", TENANT_TESTE)).toBe(true);
    expect(numeroPermitido("994294906", TENANT_TESTE)).toBe(true);
  });
});

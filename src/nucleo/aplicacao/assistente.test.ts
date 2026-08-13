/* ─────────────────────────────────────────────────────────────────────────────
 * AJUSTAR A ASSISTENTE — a mesma linha que o agente lê para montar o prompt.
 *
 * O que se prova aqui é o PATCH PARCIAL, e ele não é conveniência de API: a tela salva
 * campo a campo enquanto o dono digita. Um salvamento que mandasse o objeto inteiro
 * sobrescreveria, com o estado velho da tela, tudo que outra aba (ou o próprio agente)
 * tivesse mudado no meio.
 * ────────────────────────────────────────────────────────────────────────────── */

import { beforeEach, describe, expect, it } from "vitest";
import { DadoInvalido, NaoEncontrado } from "@/nucleo/dominio/erros";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type {
  AjustesDaAssistente, AjustesParciais, RepositorioAssistente,
} from "@/nucleo/portas/saida/repositorio-assistente";
import { criarAjustarAssistente, criarLerAssistente } from "./assistente";

/* ⚠️ O teste do adaptador demo NÃO mora aqui, e a razão é a mesma regra que ele testaria:
 * `src/nucleo` não importa `src/adaptadores`. A primeira versão deste arquivo importava
 * `assistenteDemo` e foi pega pelo `arquitetura.test.ts` — que é exatamente o serviço que
 * ele deveria prestar. Ver `adaptadores/saida/demo/assistente-repo.test.ts`. */

const t: ContextoTenant = { tenantId: "t1", usuarioId: "u1", ator: { tipo: "usuario", id: "u1" } };

const INICIAL = (): AjustesDaAssistente => ({
  assistente: { nome: "MAISA", tom: "amigável", saudacao: "Oi!", ativa: true },
  cfg: {
    confirmar: true, lembrete: true, remarcar: true, encaminhar: true,
    precoCatalogo: true, pix: false, encaixe: false,
  },
});

let guardado: AjustesDaAssistente;
let recebido: AjustesParciais | null;
let vazio: boolean;

const fake: RepositorioAssistente = {
  async ler() { return vazio ? null : guardado; },
  async salvar(_t, p) {
    recebido = p;
    guardado = {
      assistente: { ...guardado.assistente, ...(p.assistente ?? {}) },
      cfg: { ...guardado.cfg, ...(p.cfg ?? {}) },
    };
    return guardado;
  },
};

const ajustar = criarAjustarAssistente({ assistente: fake });
const ler = criarLerAssistente({ assistente: fake });

async function campoRecusado(p: unknown): Promise<string | undefined> {
  try {
    await ajustar(t, p as AjustesParciais);
    return undefined;
  } catch (e) {
    return e instanceof DadoInvalido ? e.campo : `erro inesperado: ${String(e)}`;
  }
}

beforeEach(() => {
  guardado = INICIAL();
  recebido = null;
  vazio = false;
});

describe("patch parcial", () => {
  it("manda ao repositório SÓ o que mudou", async () => {
    await ajustar(t, { cfg: { pix: true } });

    expect(recebido).toEqual({ cfg: { pix: true } });
  });

  it("não encosta no que não foi enviado", async () => {
    await ajustar(t, { cfg: { pix: true } });

    expect(guardado.cfg.pix).toBe(true);
    expect(guardado.cfg.lembrete).toBe(true);
    expect(guardado.assistente.nome).toBe("MAISA");
  });

  it("acumula entre chamadas", async () => {
    await ajustar(t, { cfg: { pix: true } });
    await ajustar(t, { assistente: { tom: "profissional" } });

    expect(guardado.assistente.tom).toBe("profissional");
    expect(guardado.cfg.pix).toBe(true);
  });
});

describe("normalização", () => {
  it("colapsa espaço no nome", async () => {
    await ajustar(t, { assistente: { nome: "  Aurora   Bot  " } });
    expect(guardado.assistente.nome).toBe("Aurora Bot");
  });

  /* Saudação vazia NÃO é erro: quem não quer mensagem de abertura apaga o campo. Recusar
   * aqui deixaria o dono sem jeito de desligar a saudação pela tela. */
  it("aceita saudação vazia", async () => {
    await ajustar(t, { assistente: { saudacao: "" } });
    expect(guardado.assistente.saudacao).toBe("");
  });
});

describe("recusas", () => {
  it.each([
    ["nome vazio", { assistente: { nome: "   " } }, "nome"],
    ["nome longo demais", { assistente: { nome: "x".repeat(41) } }, "nome"],
    ["tom fora da lista", { assistente: { tom: "sarcástico" } }, "tom"],
    ["saudação longa demais", { assistente: { saudacao: "x".repeat(281) } }, "saudacao"],
    ["ativa não-booleana", { assistente: { ativa: "sim" } }, "ativa"],
    ["chave de cfg desconhecida", { cfg: { pixx: true } }, "cfg"],
    ["valor de cfg não-booleano", { cfg: { pix: "sim" } }, "cfg"],
    /* Patch vazio é quase sempre bug de quem chama — e gravar "nada" custaria um round
     * trip e um `atualizado_em` novo dizendo que houve mudança quando não houve. */
    ["patch vazio", {}, "payload"],
    ["patch com objetos vazios", { assistente: {}, cfg: {} }, "payload"],
  ])("%s → campo %s", async (_nome, patch, campo) => {
    expect(await campoRecusado(patch)).toBe(campo);
  });
});

describe("ler", () => {
  it("devolve assistente e cfg", async () => {
    const lido = await ler(t);
    expect(lido.assistente.nome).toBe("MAISA");
    expect(lido.cfg.confirmar).toBe(true);
  });

  /* Só acontece com negócio nascido fora de `criar_negocio()`. Virar `NaoEncontrado` é o
   * que faz a tela dizer a frase certa em vez de um 500 sem explicação. */
  it("linha ausente vira NaoEncontrado", async () => {
    vazio = true;
    await expect(ler(t)).rejects.toBeInstanceOf(NaoEncontrado);
  });
});

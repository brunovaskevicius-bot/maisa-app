/* ─────────────────────────────────────────────────────────────────────────────
 * PROVISIONAR NEGÓCIO — a porta de entrada de todo cliente novo.
 *
 * O fake satisfaz `ProvisionadorDeNegocio` inteiro. Nenhum banco: o que se prova aqui é a
 * validação e a normalização, que são as duas coisas que decidem o que vira linha em
 * `negocios` — e o nome que o cliente vai ver em toda tela pelo resto da assinatura.
 * ────────────────────────────────────────────────────────────────────────────── */

import { beforeEach, describe, expect, it } from "vitest";
import { DadoInvalido } from "@/nucleo/dominio/erros";
import type {
  IdentidadeDaSessao, NegocioCriado, PedidoDeNegocio, ProvisionadorDeNegocio,
} from "@/nucleo/portas/saida/provisionador-negocio";
import { criarProvisionarNegocio } from "./provisionar";

const sessao: IdentidadeDaSessao = { usuarioId: "u1" };

let recebidas: PedidoDeNegocio[] = [];
let resposta: NegocioCriado = { ok: true, tenantId: "tenant-de-mentira" };

const fake: ProvisionadorDeNegocio = {
  faltando: () => [],
  async criar(_s, p) {
    recebidas.push(p);
    return resposta;
  },
};

const provisionar = criarProvisionarNegocio({ provisionador: fake });

/** Recusar tem que apontar O CAMPO — é o que a tela usa para acender o input certo. */
async function campoRecusado(p: unknown): Promise<string | undefined> {
  try {
    await provisionar(sessao, p as PedidoDeNegocio);
    return undefined;
  } catch (e) {
    return e instanceof DadoInvalido ? e.campo : `erro inesperado: ${String(e)}`;
  }
}

beforeEach(() => {
  recebidas = [];
  resposta = { ok: true, tenantId: "tenant-de-mentira" };
});

describe("normalização", () => {
  it("colapsa espaço interno e apara as pontas", async () => {
    const r = await provisionar(sessao, { nome: "  Espaço   Aurora  ", vertical: "terapeutas", profissional: "  Carla  " });

    expect(recebidas[0].nome).toBe("Espaço Aurora");
    expect(recebidas[0].profissional).toBe("Carla");
    expect(r.tenantId).toBe("tenant-de-mentira");
    expect(r.proximoPasso).toBe("abrir_painel");
  });

  /* Espaço em branco é o que um formulário manda quando o campo é opcional e o dedo
   * escorregou. Guardar " " faria a tela imprimir um profissional invisível. */
  it("profissional só de espaço vira ausente", async () => {
    await provisionar(sessao, { nome: "Studio", vertical: "generico", profissional: "   " });
    expect(recebidas[0].profissional).toBeUndefined();
  });
});

describe("recusas", () => {
  it.each([
    ["nome vazio", { nome: "   ", vertical: "barbeiros" }, "nome"],
    ["nome de uma letra", { nome: "A", vertical: "barbeiros" }, "nome"],
    ["nome só de pontuação", { nome: "---", vertical: "barbeiros" }, "nome"],
    ["nome longo demais", { nome: "x".repeat(81), vertical: "barbeiros" }, "nome"],
    ["vertical inventada", { nome: "Barbearia do Zé", vertical: "dentistas" }, "vertical"],
    ["vertical ausente", { nome: "Barbearia do Zé" }, "vertical"],
  ])("%s → campo %s", async (_nome, pedido, campo) => {
    expect(await campoRecusado(pedido)).toBe(campo);
  });
});

/* A regra que rejeita "nome só de pontuação" foi escrita à mão com faixas ASCII, e não
 * com `\p{L}`, porque o `target` do projeto não aceita a flag `u`. O risco dessa troca é
 * exatamente este: tratar acento e ideograma como pontuação e recusar nomes legítimos. */
describe("acento e ideograma não são pontuação", () => {
  it.each(["Açaí", "日本", "Björn Cabelo", "Ñandú"])("aceita %s", async (nome) => {
    await provisionar(sessao, { nome, vertical: "generico" });
    expect(recebidas).toHaveLength(1);
  });
});

describe("teto do banco", () => {
  /* O limite mora numa constraint do Postgres. Ela chega aqui como `restrict_violation` e
   * tem que virar frase para o dono, não 500 — o usuário fez algo compreensível. */
  it("limite_de_negocios vira DadoInvalido no campo 'limite'", async () => {
    resposta = { ok: false, motivo: "limite_de_negocios" };
    expect(await campoRecusado({ nome: "Mais um", vertical: "generico" })).toBe("limite");
  });
});

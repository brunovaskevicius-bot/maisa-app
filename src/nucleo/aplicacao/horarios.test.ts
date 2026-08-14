import { beforeEach, describe, expect, it } from "vitest";
import { DadoInvalido, NaoEncontrado } from "@/nucleo/dominio/erros";
import type { SemanaAnunciada } from "@/nucleo/dominio/horarios";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { RepositorioHorarios } from "@/nucleo/portas/saida/repositorio-horarios";
import { criarAjustarHorarios, criarLerHorarios } from "./horarios";

const t: ContextoTenant = { tenantId: "t1", usuarioId: "u1", ator: { tipo: "usuario", id: "u1" } };

const cheia = (): SemanaAnunciada =>
  Array.from({ length: 7 }, (_, dow) => ({ dow, aberto: true, de: "08:00", ate: "20:00" }));

let guardada: SemanaAnunciada | null;
let recebida: SemanaAnunciada | null;

const fake: RepositorioHorarios = {
  async ler() { return guardada; },
  async salvar(_t, semana) { recebida = semana; guardada = semana; return semana; },
};

const ler = criarLerHorarios({ horarios: fake });
const ajustar = criarAjustarHorarios({ horarios: fake });

async function campoRecusado(p: unknown): Promise<string | undefined> {
  try {
    await ajustar(t, p as SemanaAnunciada);
    return undefined;
  } catch (e) {
    return e instanceof DadoInvalido ? e.campo : `erro inesperado: ${String(e)}`;
  }
}

beforeEach(() => {
  guardada = cheia();
  recebida = null;
});

describe("ler", () => {
  it("devolve os sete dias", async () => {
    expect(await ler(t)).toHaveLength(7);
  });

  /* 404 porque quem chama é a TELA. O agente não passa por aqui — ele lê pela composição,
   * que degrada para "horário não cadastrado" em vez de morrer no meio de uma conversa. */
  it("sem linha nenhuma vira NaoEncontrado", async () => {
    guardada = null;
    await expect(ler(t)).rejects.toBeInstanceOf(NaoEncontrado);
  });

  it("lista vazia também, e não uma semana silenciosamente vazia", async () => {
    guardada = [];
    await expect(ler(t)).rejects.toBeInstanceOf(NaoEncontrado);
  });
});

describe("ajustar", () => {
  it("grava a semana normalizada", async () => {
    const semana = cheia();
    semana[5] = { dow: 5, aberto: false, de: "09:00", ate: "13:00" };

    const r = await ajustar(t, semana);

    expect(r[5]).toEqual({ dow: 5, aberto: false, de: null, ate: null });
  });

  /* A ordem do array não é confiável — ela vem de um JSON. Se a posição ganhasse do
   * campo, "terça" no índice 0 seria gravada como segunda, e a MAISA anunciaria o
   * horário de terça como se fosse o de segunda. */
  it("reordena por dow, ignorando a posição no array", async () => {
    const embaralhada = [...cheia()].reverse();
    embaralhada[0] = { dow: 6, aberto: false, de: null, ate: null };

    const r = await ajustar(t, embaralhada);

    expect(r.map((d) => d.dow)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(r[6].aberto).toBe(false);
  });

  /* A contagem é verificada ANTES do conteúdo, e por isso oito dias reclama de
   * "payload" e não do `dow: 7` que está lá dentro. É a ordem certa: a primeira coisa
   * errada é a mais fácil de a tela explicar. */
  it.each<[string, () => unknown, string]>([
    ["não é lista", () => ({ semana: [] }), "payload"],
    ["seis dias", () => cheia().slice(0, 6), "payload"],
    ["oito dias", () => [...cheia(), { dow: 7, aberto: false }], "payload"],
  ])("%s → campo %s", async (_nome, corpo, campo) => {
    expect(await campoRecusado(corpo())).toBe(campo);
  });

  it.each([-1, 7, 1.5, "0", null])("recusa dow %j", async (dow) => {
    const semana = cheia().map((d, i) => (i === 3 ? { ...d, dow } : d));
    expect(await campoRecusado(semana)).toBe("dow");
  });

  /* Sete dias com `dow` repetido passaria na contagem e deixaria dias sem definição —
   * `normalizarDia` receberia `undefined` e a mensagem falaria de "aberto", escondendo a
   * causa real. Recusar aqui nomeia o dia duplicado. */
  it("recusa dia repetido, mesmo com a contagem certa", async () => {
    const semana = cheia().map((d, i) => (i === 4 ? { ...d, dow: 3 } : d));
    expect(await campoRecusado(semana)).toBe("dow");
  });

  it("a escrita é idempotente — mandar duas vezes dá o mesmo", async () => {
    const semana = cheia();
    const a = await ajustar(t, semana);
    const b = await ajustar(t, a);

    expect(b).toEqual(a);
  });

  it("manda ao repositório a semana inteira, nunca um pedaço", async () => {
    await ajustar(t, cheia());
    expect(recebida).toHaveLength(7);
  });
});

import { describe, expect, it } from "vitest";
import { DadoInvalido } from "./erros";
import { normalizarDia, semanaEmTexto, type SemanaAnunciada } from "./horarios";

/** Semana cheia a partir de um mapa esparso — o resto vira fechado. */
const semana = (aberto: Record<number, [string, string]>): SemanaAnunciada =>
  Array.from({ length: 7 }, (_, dow) =>
    aberto[dow]
      ? { dow, aberto: true, de: aberto[dow][0], ate: aberto[dow][1] }
      : { dow, aberto: false, de: null, ate: null },
  );

describe("normalizarDia", () => {
  it("aceita um dia aberto bem formado", () => {
    expect(normalizarDia({ aberto: true, de: "08:00", ate: "20:00" }, 0))
      .toEqual({ dow: 0, aberto: true, de: "08:00", ate: "20:00" });
  });

  /* Guardar "fechado, das 9 às 18" faria quem lesse a linha crua no banco não saber
   * dizer se o negócio abre. A perda de informação é consciente. */
  it("dia fechado zera as horas, mesmo se vierem preenchidas", () => {
    expect(normalizarDia({ aberto: false, de: "09:00", ate: "18:00" }, 6))
      .toEqual({ dow: 6, aberto: false, de: null, ate: null });
  });

  it("exige dizer se abre", () => {
    expect(() => normalizarDia({ de: "08:00", ate: "20:00" }, 0)).toThrow(DadoInvalido);
    expect(() => normalizarDia({}, 0)).toThrow(/precisa dizer se abre/);
  });

  it.each(["8:00", "08:0", "24:00", "23:60", "0800", "oito", "", "08:00:00"])(
    "recusa a hora %j",
    (hora) => {
      expect(() => normalizarDia({ aberto: true, de: hora, ate: "20:00" }, 0)).toThrow(DadoInvalido);
    },
  );

  /* Atravessar a meia-noite é o que o dono está tentando dizer, e o produto não sabe
   * representar isso. Aceitar em silêncio anunciaria "das 20h às 2h" como um dia
   * fechado — pior que recusar. */
  it("recusa fechamento antes ou igual à abertura", () => {
    expect(() => normalizarDia({ aberto: true, de: "20:00", ate: "02:00" }, 0)).toThrow(/depois da abertura/);
    expect(() => normalizarDia({ aberto: true, de: "09:00", ate: "09:00" }, 0)).toThrow(/depois da abertura/);
  });

  it("nomeia o dia na mensagem, para a tela poder repeti-la", () => {
    expect(() => normalizarDia({ aberto: true, de: "20:00", ate: "02:00" }, 5)).toThrow(/Sábado/);
  });

  it("o dow vem do argumento, nunca do corpo", () => {
    /* Se o `dow` do corpo ganhasse, um cliente poderia mandar sete dias todos dizendo
     * `dow: 0` e sobrescrever segunda sete vezes, deixando o resto da semana intacto e
     * silenciosamente errado. */
    expect(normalizarDia({ dow: 3, aberto: false }, 6).dow).toBe(6);
  });
});

describe("semanaEmTexto", () => {
  it("agrupa dias seguidos com o mesmo horário", () => {
    const s = semana({ 0: ["08:00", "20:00"], 1: ["08:00", "20:00"], 2: ["08:00", "20:00"], 3: ["08:00", "20:00"], 4: ["08:00", "20:00"], 5: ["09:00", "13:00"] });
    expect(semanaEmTexto(s)).toBe("Seg–Sex 08:00–20:00 · Sáb 09:00–13:00 · Dom fechado");
  });

  it("não agrupa dias que não são vizinhos", () => {
    const s = semana({ 0: ["08:00", "20:00"], 2: ["08:00", "20:00"] });
    expect(semanaEmTexto(s)).toBe("Seg 08:00–20:00 · Ter fechado · Qua 08:00–20:00 · Qui–Dom fechado");
  });

  it("semana toda fechada é uma frase só", () => {
    expect(semanaEmTexto(semana({}))).toBe("Seg–Dom fechado");
  });

  /* O prompt é montado a partir do que vier do banco. Uma linha fora de ordem faria a
   * MAISA anunciar "Ter–Seg", que não é frase que ninguém diz. */
  it("ordena por dow antes de agrupar", () => {
    const embaralhada = [...semana({ 0: ["08:00", "20:00"], 1: ["08:00", "20:00"] })].reverse();
    expect(semanaEmTexto(embaralhada)).toBe("Seg–Ter 08:00–20:00 · Qua–Dom fechado");
  });

  it("lista vazia não vira frase inventada", () => {
    expect(semanaEmTexto([])).toBe("horário não cadastrado");
  });
});

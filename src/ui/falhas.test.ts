import { describe, expect, it } from "vitest";
import { mensagemDaFalha } from "./falhas";

describe("a frase de uma resposta que falhou", () => {
  /* ★ O bug que originou o arquivo: a recusa do lote vem em `info`, e a tela mostrava o
   * texto genérico — apagando justamente o nome de quem ficou sem CPF. */
  it("prefere `info`, que é o contrato de respostas.ts", () => {
    expect(mensagemDaFalha(
      { info: "Cliente ficou de fora — falta o CPF de quem foi atendido." },
      "Não consegui.",
    )).toMatch(/Cliente ficou de fora/);
  });

  it("transforma `faltando` em frase", () => {
    expect(mensagemDaFalha({ faltando: ["o CPF de quem atende", "a profissão"] }, "x"))
      .toBe("Falta o CPF de quem atende, a profissão.");
  });

  it("entende o formato herdado da Focus", () => {
    expect(mensagemDaFalha({ erros: [{ mensagem: "CNPJ inválido" }] }, "x")).toBe("CNPJ inválido");
  });

  it("cai no padrão quando não há nada aproveitável", () => {
    expect(mensagemDaFalha({}, "Não consegui gerar o arquivo.")).toBe("Não consegui gerar o arquivo.");
    expect(mensagemDaFalha(null, "padrão")).toBe("padrão");
  });

  it("ignora campo presente mas vazio", () => {
    expect(mensagemDaFalha({ info: "   " }, "padrão")).toBe("padrão");
  });
});

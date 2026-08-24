/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PROVAM — E O QUE ELES NÃO PROVAM.
 *
 * Provam que a linha sai no formato que o manual descreve: vírgula decimal, data brasileira,
 * campos vazios preservados na posição, teto de 1000, ano único, nada truncado em silêncio.
 *
 * ⚠️ NÃO PROVAM QUE A RECEITA ACEITA O ARQUIVO. A ordem dos campos veio da tabela do manual
 * (o "exemplo de linha" é imagem), e o juiz é o "Analisar Arquivo" do e-CAC, que aponta
 * linha, campo e erro sem emitir nada. Enquanto essa análise não rodar, este arquivo prova
 * consistência interna — o que é útil e não é a mesma coisa.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import {
  CAMPOS_DO_LOTE, CODIGO_OCUPACAO, CODIGO_RENDIMENTO, LIMITE_DESCRICAO, LIMITE_LINHAS,
  dataBrasileira, descricaoDoRecibo, linhaDoLote, montarLoteCsv, nomeDoArquivo, valorBrasileiro,
  type EmissorDeRecibo, type PagamentoRecebido,
} from "./recibo-saude";

const CARLA: EmissorDeRecibo = {
  cpf: "123.456.789-09",
  ocupacao: "psicologo",
  registroProfissional: "CRP 06/123456",
};

const sessao = (over: Partial<PagamentoRecebido> = {}): PagamentoRecebido => ({
  dataPagamento: "2026-08-14",
  valor: 250,
  descricao: "Sessão de psicoterapia — 14/08/2026",
  cpfPagador: "12345678909",
  cpfBeneficiario: "12345678909",
  ...over,
});

describe("a linha do lote", () => {
  it("tem exatamente um campo por entrada do layout", () => {
    expect(linhaDoLote(CARLA, sessao()).split(";")).toHaveLength(CAMPOS_DO_LOTE.length);
  });

  it("põe cada valor na posição que o manual manda", () => {
    const c = linhaDoLote(CARLA, sessao()).split(";");
    expect(c[0]).toBe("14/08/2026");
    expect(c[1]).toBe(CODIGO_RENDIMENTO);
    expect(c[2]).toBe(CODIGO_OCUPACAO.psicologo);
    expect(c[3]).toBe("250,00");
    expect(c[4]).toBe("");
    expect(c[6]).toBe("PF");
    expect(c[13]).toBe("S");
    expect(c[14]).toBe("12345678909");
    expect(c[15]).toBe("CRP 06/123456");
  });

  /* O CSV é posicional: suprimir um vazio desloca todo o resto, e o erro que a Receita
   * devolve fala do campo seguinte — apontando para o lugar errado. */
  it("mantém os campos que são sempre vazios", () => {
    const c = linhaDoLote(CARLA, sessao()).split(";");
    for (const i of [4, 9, 10, 11, 12]) expect(c[i]).toBe("");
  });

  it("tira pontuação dos CPFs", () => {
    const c = linhaDoLote(CARLA, sessao({ cpfPagador: "123.456.789-09" })).split(";");
    expect(c[7]).toBe("12345678909");
  });

  it("separa quem paga de quem é atendido", () => {
    const c = linhaDoLote(CARLA, sessao({ cpfPagador: "98765432100" })).split(";");
    expect(c[7]).toBe("98765432100");
    expect(c[8]).toBe("12345678909");
  });

  it("corta o registro profissional em 15 caracteres", () => {
    const c = linhaDoLote({ ...CARLA, registroProfissional: "x".repeat(40) }, sessao()).split(";");
    expect(c[15]).toHaveLength(15);
  });

  it("aceita registro vazio — quem tem um só pode omitir", () => {
    const c = linhaDoLote({ ...CARLA, registroProfissional: null }, sessao()).split(";");
    expect(c[15]).toBe("");
  });
});

describe("o valor", () => {
  it("usa vírgula decimal", () => expect(valorBrasileiro(250)).toBe("250,00"));
  /* Uma casa decimal viraria "12,3" e a Receita leria outro valor. */
  it("sempre tem duas casas", () => expect(valorBrasileiro(12.3)).toBe("12,30"));
  it("não usa separador de milhar", () => expect(valorBrasileiro(1234.5)).toBe("1234,50"));
});

describe("a data", () => {
  it("vira DD/MM/AAAA", () => expect(dataBrasileira("2026-08-21")).toBe("21/08/2026"));
});

describe("a descrição", () => {
  /* Um `;` no nome do serviço partiria a linha em duas colunas. */
  it("perde ponto e vírgula", () => {
    expect(descricaoDoRecibo("Sessão; retorno")).toBe("Sessão retorno");
  });

  it("perde quebra de linha", () => {
    expect(descricaoDoRecibo("Sessões\n14/08 e 21/08")).toBe("Sessões 14/08 e 21/08");
  });

  it(`cabe em ${LIMITE_DESCRICAO}`, () => {
    expect(descricaoDoRecibo("a".repeat(400))).toHaveLength(LIMITE_DESCRICAO);
  });
});

describe("o lote", () => {
  it("recusa a linha sem CPF do beneficiário, e diz por quê", () => {
    const lote = montarLoteCsv(CARLA, [sessao({ cpfBeneficiario: "" })]);
    expect(lote.linhas).toBe(0);
    expect(lote.recusadas[0].motivos).toContain("um CPF válido de quem foi atendido");
  });

  /* ★ O ERRO QUE A RECEITA DEVOLVEU EM 21/08/2026: "Beneficiário do serviço inválido." O CPF
   * tinha 11 dígitos e não fechava no módulo 11 — passava pela checagem antiga e morria no
   * portal, depois de o dono achar que o arquivo estava pronto. */
  it("recusa CPF com 11 dígitos que não fecha no dígito verificador", () => {
    const lote = montarLoteCsv(CARLA, [sessao({ cpfBeneficiario: "11122233344" })]);
    expect(lote.linhas).toBe(0);
    expect(lote.recusadas[0].motivos).toContain("um CPF válido de quem foi atendido");
  });

  it("recusa o CPF de placeholder (todos os dígitos iguais)", () => {
    expect(montarLoteCsv(CARLA, [sessao({ cpfPagador: "11111111111" })]).linhas).toBe(0);
  });

  it("recusa valor zero", () => {
    expect(montarLoteCsv(CARLA, [sessao({ valor: 0 })]).recusadas).toHaveLength(1);
  });

  /* A regra do manual que morde na virada do ano: um lote de janeiro com sessão de dezembro
   * é recusado INTEIRO pela Receita. Aqui cai a linha, não o arquivo. */
  it("mantém o ano da primeira linha e recusa as de outro ano", () => {
    const lote = montarLoteCsv(CARLA, [
      sessao({ dataPagamento: "2026-01-05" }),
      sessao({ dataPagamento: "2025-12-28" }),
    ]);
    expect(lote.linhas).toBe(1);
    expect(lote.recusadas[0].motivos[0]).toContain("é de 2025");
  });

  it(`corta em ${LIMITE_LINHAS} linhas e devolve a sobra`, () => {
    const lote = montarLoteCsv(CARLA, Array.from({ length: 1002 }, () => sessao()));
    expect(lote.linhas).toBe(LIMITE_LINHAS);
    expect(lote.sobraram).toHaveLength(2);
  });

  it("soma o que entrou, não o que foi pedido", () => {
    const lote = montarLoteCsv(CARLA, [sessao({ valor: 250 }), sessao({ valor: 0 })]);
    expect(lote.valor).toBe(250);
  });

  it("separa as linhas com CRLF", () => {
    expect(montarLoteCsv(CARLA, [sessao(), sessao()]).csv.split("\r\n")).toHaveLength(2);
  });

  it("não estoura com lista vazia", () => {
    const lote = montarLoteCsv(CARLA, []);
    expect(lote).toMatchObject({ csv: "", linhas: 0, valor: 0 });
  });
});

describe("o nome do arquivo", () => {
  it("leva CPF e competência, para não importar o mês errado", () => {
    expect(nomeDoArquivo("123.456.789-09", "2026-08-01")).toBe("receita-saude-12345678909-2026-08.csv");
  });
});

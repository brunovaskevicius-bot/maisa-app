/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTE TESTE PRENDE
 *
 * ★ QUE DOBRAR A LISTA NÃO ESCONDA O QUE PRECISA DE AÇÃO.
 *
 * A lista de pagamentos sem recibo passou a começar fechada porque um mês cheio (44 linhas)
 * empurrava o botão de gerar para fora da tela. O jeito óbvio de fazer isso — esconder todas as
 * linhas — tem um custo que não aparece em nenhuma tela: os pagamentos SEM CPF ficam de fora do
 * arquivo, e são a única coisa desta lista sobre a qual há o que fazer.
 *
 * Escondidos, o dono gera o arquivo do mês sem saber que perdeu três linhas, e descobre no e-CAC
 * ou nunca. Por isso `pagamentosNaTela` é função pura, exportada e testada: "simplificar" para
 * `aberta ? todos : []` passa em qualquer revisão visual e quebra isto.
 *
 * ⚠️ Ambiente `node` importando um `.tsx` — mesmo motivo e mesma condição do
 * `pareamento.test.ts`: a função é pura e nada do módulo toca DOM na carga.
 * ───────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { pagamentosNaTela } from "./LoteReceitaSaude";

const com = (n: number, cpf: string | null) =>
  Array.from({ length: n }, (_, i) => ({ id: `${cpf ? "ok" : "sem"}-${i}`, cpf }));

describe("lista curta não vira acordeão", () => {
  /* Cerimônia sobre três linhas é pior que a rolagem que ela evita. */
  it("até seis pagamentos, mostra tudo e não oferece o botão", () => {
    const r = pagamentosNaTela(com(6, "123"), false);
    expect(r.dobravel).toBe(false);
    expect(r.visiveis).toHaveLength(6);
  });

  it("o sétimo é que liga o botão", () => {
    expect(pagamentosNaTela(com(7, "123"), false).dobravel).toBe(true);
  });
});

describe("★ fechada, sobra o que precisa de CPF", () => {
  /* O TESTE QUE JUSTIFICA O ARQUIVO. */
  it("esconde os completos e mantém os sem CPF", () => {
    const todos = [...com(40, "123"), ...com(3, null)];

    const r = pagamentosNaTela(todos, false);

    expect(r.visiveis).toHaveLength(3);
    expect(r.visiveis.every((p) => !p.cpf)).toBe(true);
  });

  /* Mês inteiro em ordem: fechada não mostra nada, e é o certo — não há o que fazer. */
  it("todos com CPF: fechada fica vazia, e o botão continua lá", () => {
    const r = pagamentosNaTela(com(44, "123"), false);
    expect(r.visiveis).toEqual([]);
    expect(r.dobravel).toBe(true);
  });

  it("aberta, mostra os 44", () => {
    expect(pagamentosNaTela(com(44, "123"), true).visiveis).toHaveLength(44);
  });

  /* CPF em branco é o mesmo caso de CPF ausente: a Receita recusa os dois. */
  it("string vazia conta como sem CPF", () => {
    const todos = [...com(10, "123"), { id: "vazio", cpf: "" }];
    expect(pagamentosNaTela(todos, false).visiveis).toEqual([{ id: "vazio", cpf: "" }]);
  });
});

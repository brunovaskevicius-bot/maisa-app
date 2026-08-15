/* ─────────────────────────────────────────────────────────────────────────────
 * O NOME DO NEGÓCIO SAI NA VOZ DA MAISA.
 *
 * Este arquivo existe por causa de 14/08/2026: o primeiro lembrete de verdade chegou no
 * WhatsApp dizendo "…do seu horário hoje às 18:00, no bruno.vaskevicius". O nome viera de
 * SQL escrito à mão três dias antes, e ninguém tinha visto porque NENHUMA TELA ESCREVIA
 * ESSE CAMPO — o único caminho de escrita era `criar_negocio()`, no instante da criação.
 *
 * O que se testa aqui, então, não é "validação de string". É que este campo — que entra
 * no prompt do agente a CADA mensagem e no texto de todo lembrete — tem teto, tem chão, e
 * devolve o que o repositório gravou em vez do que a tela mandou.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it, vi } from "vitest";
import { criarAjustarNegocio } from "./cadastro";
import { NOME_NEGOCIO_MAX } from "../dominio/negocio";
import { DadoInvalido } from "../dominio/erros";
import type { ContextoTenant } from "../dominio/tenant";
import type { Negocio } from "../dominio/negocio";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";

const T: ContextoTenant = { tenantId: "t-1", usuarioId: "u-1", ator: { tipo: "usuario", id: "u-1" } };

const NEGOCIO: Negocio = {
  nome: "Barbearia do Zé",
  plano: "Profissional",
  precoPlano: 149.9,
  proximaCobranca: "05/09/2026",
  cartao: "Cartão final 4417",
  conversasPlano: "Ilimitadas",
};

/** Só o que este caso de uso toca. O resto da porta não participa da decisão. */
function repo(sobre: Partial<RepositorioNegocio> = {}) {
  return {
    renomear: vi.fn(async (_t: ContextoTenant, nome: string) => ({ ...NEGOCIO, nome })),
    ...sobre,
  } as unknown as RepositorioNegocio & { renomear: ReturnType<typeof vi.fn> };
}

describe("renomear o negócio", () => {
  it("grava o nome e devolve o negócio inteiro", async () => {
    const r = repo();
    const negocio = await criarAjustarNegocio({ negocio: r })(T, { nome: "Studio Aurora" });

    expect(r.renomear).toHaveBeenCalledWith(T, "Studio Aurora");
    /* O negócio INTEIRO, e não só o nome: a sidebar do painel pinta plano e cobrança da
     * mesma resposta, e uma segunda ida ao servidor para buscá-los seria um piscar. */
    expect(negocio).toEqual({ ...NEGOCIO, nome: "Studio Aurora" });
  });

  it("colapsa espaço antes de gravar", async () => {
    const r = repo();
    /* Sem isto o agente se apresentaria como "assistente de Barbearia   do  Zé" — o
     * espaço extra é invisível num campo de formulário e não é no meio de uma frase. */
    await criarAjustarNegocio({ negocio: r })(T, { nome: "  Barbearia   do  Zé  " });
    expect(r.renomear).toHaveBeenCalledWith(T, "Barbearia do Zé");
  });

  it("recusa nome vazio com a frase do campo em branco, não a do mínimo", async () => {
    const r = repo();
    const ajustar = criarAjustarNegocio({ negocio: r });

    /* A distinção importa: "precisa de 2 caracteres" manda a pessoa olhar o que digitou,
     * quando o problema é que ela apagou tudo. */
    await expect(ajustar(T, { nome: "   " })).rejects.toThrow(DadoInvalido);
    await expect(ajustar(T, { nome: "" })).rejects.toThrow(/precisa de um nome/i);
    expect(r.renomear).not.toHaveBeenCalled();
  });

  it("recusa nome de um caractere — o mesmo chão do check no banco", async () => {
    const r = repo();
    await expect(criarAjustarNegocio({ negocio: r })(T, { nome: "Z" })).rejects.toThrow(DadoInvalido);
    expect(r.renomear).not.toHaveBeenCalled();
  });

  it("recusa nome longo demais — ele é pago em token a cada mensagem", async () => {
    const r = repo();
    const enorme = "a".repeat(NOME_NEGOCIO_MAX + 1);

    /* O teto não é estética. Este texto entra inteiro no prompt do agente em TODA
     * mensagem daquele inquilino, e um campo de cadastro sem limite é também o lugar
     * óbvio para alguém escrever instrução dentro do nome. */
    await expect(criarAjustarNegocio({ negocio: r })(T, { nome: enorme })).rejects.toThrow(/passa de/i);
    expect(r.renomear).not.toHaveBeenCalled();
  });

  it("aceita exatamente o teto", async () => {
    const r = repo();
    const noLimite = "a".repeat(NOME_NEGOCIO_MAX);
    await criarAjustarNegocio({ negocio: r })(T, { nome: noLimite });
    expect(r.renomear).toHaveBeenCalledWith(T, noLimite);
  });

  it("o erro aponta o campo `nome`, senão a tela não sabe onde pintar", async () => {
    const r = repo();
    /* `respostas.ts` traduz `campo` em `status`, e o store casa esse status string por
     * string. Erro sem campo vira `payload_invalido` genérico e a tela não destaca nada. */
    await expect(criarAjustarNegocio({ negocio: r })(T, { nome: "" })).rejects.toMatchObject({
      campo: "nome",
    });
  });
});

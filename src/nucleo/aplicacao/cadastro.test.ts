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
import { criarAjustarNegocio, criarAjustarProfissional, criarAjustarServico } from "./cadastro";
import { NOME_NEGOCIO_MAX } from "../dominio/negocio";
import { DURACAO_MAX, DURACAO_MIN, NOME_SERVICO_MAX, PRECO_MAX } from "../dominio/catalogo";
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

/* ─────────────────────────────────────────────────────────────────────────────
 * O CATÁLOGO — a escrita que a tela fingia ter.
 *
 * Até 15/08/2026 `criarServico` e `editarServico` (`store.tsx`) mexiam em
 * `svcNovos`/`svcEdit` — estado do NAVEGADOR. O dono ajustava o preço do Corte, via a
 * lista mudar, dava F5, e o preço voltava. Sem rota, sem porta, sem erro.
 *
 * O que se prova aqui é o que essa história ensinou a desconfiar: que o que se grava é o
 * que se pediu, e que o que NÃO pode ser gravado é recusado com uma frase, não com um 500
 * vindo de um `check` do Postgres.
 * ────────────────────────────────────────────────────────────────────────────── */

const SERVICO = {
  id: "sv-1",
  nome: "Corte",
  categoria: "Recorrente" as const,
  preco: 60,
  duracao: 30,
  profissionalIds: ["pr-1"],
  ativo: true,
};

function repoServico(sobre: Partial<RepositorioNegocio> = {}) {
  return {
    salvarServico: vi.fn(async (_t: ContextoTenant, r: Record<string, unknown>) => ({
      ...SERVICO,
      ...r,
    })),
    salvarProfissional: vi.fn(async (_t: ContextoTenant, r: Record<string, unknown>) => ({
      id: "pr-1",
      nome: "Zé",
      papel: "Atendimento geral",
      atendimentosMes: 0,
      avaliacao: 0,
      comissao: 0,
      desde: "ago/2026",
      servicoIds: [],
      ativo: true,
      horario: "Seg–Sáb 09–19",
      folga: "domingo",
      expediente: { folga: [6], de: 9, ate: 19 },
      ...r,
    })),
    ...sobre,
  } as unknown as RepositorioNegocio & Record<string, ReturnType<typeof vi.fn>>;
}

const base = { nome: "Corte", categoria: "Recorrente" as const, preco: 60, duracao: 30 };

describe("ajustar um serviço", () => {
  it("sem id é criar; com id é editar aquela linha", async () => {
    const r = repoServico();
    const ajustar = criarAjustarServico({ negocio: r });

    await ajustar(T, base);
    expect(r.salvarServico).toHaveBeenLastCalledWith(T, expect.not.objectContaining({ id: expect.anything() }));

    await ajustar(T, { ...base, id: "sv-7" });
    expect(r.salvarServico).toHaveBeenLastCalledWith(T, expect.objectContaining({ id: "sv-7" }));
  });

  it("colapsa espaço no nome, senão 'Corte  ' e 'Corte' viram dois serviços", async () => {
    const r = repoServico();
    await criarAjustarServico({ negocio: r })(T, { ...base, nome: "  Corte   Social " });
    expect(r.salvarServico).toHaveBeenCalledWith(T, expect.objectContaining({ nome: "Corte Social" }));
  });

  /* ⚠️ `Number("")` é 0. Sem tratar, um campo de preço APAGADO viraria serviço grátis —
   * gravado, sem erro, e descoberto quando a MAISA anunciar "sai por R$ 0,00". */
  it.each([["", "vazio"], ["   ", "só espaço"], ["abc", "texto"], [null, "nulo"]] as const)(
    "recusa preço %s (%s) em vez de gravar zero",
    async (preco, _rotulo) => {
      const r = repoServico();
      await expect(
        criarAjustarServico({ negocio: r })(T, { ...base, preco: preco as never }),
      ).rejects.toThrow(DadoInvalido);
      expect(r.salvarServico).not.toHaveBeenCalled();
    },
  );

  it("aceita vírgula decimal — é assim que se digita preço no Brasil", async () => {
    const r = repoServico();
    await criarAjustarServico({ negocio: r })(T, { ...base, preco: "59,90" as never });
    expect(r.salvarServico).toHaveBeenCalledWith(T, expect.objectContaining({ preco: 59.9 }));
  });

  it("zero é preço válido — serviço de cortesia existe", async () => {
    const r = repoServico();
    await criarAjustarServico({ negocio: r })(T, { ...base, preco: 0 });
    expect(r.salvarServico).toHaveBeenCalledWith(T, expect.objectContaining({ preco: 0 }));
  });

  it("recusa preço acima do teto de teclado", async () => {
    const r = repoServico();
    /* O teto da coluna é 99.999.999,99 e não protege de nada. Este pega quem digita
     * 20000 querendo R$ 200,00 — centavos colados. */
    await expect(
      criarAjustarServico({ negocio: r })(T, { ...base, preco: PRECO_MAX + 1 }),
    ).rejects.toThrow(/alto demais/i);
  });

  it.each([
    [DURACAO_MIN - 1, "abaixo do mínimo"],
    [DURACAO_MAX + 1, "acima do máximo"],
  ])("recusa duração %i (%s) com frase, não com check_violation", async (duracao) => {
    const r = repoServico();
    await expect(
      criarAjustarServico({ negocio: r })(T, { ...base, duracao }),
    ).rejects.toThrow(DadoInvalido);
    expect(r.salvarServico).not.toHaveBeenCalled();
  });

  /* A coluna é `integer`. Arredondar aqui em silêncio gravaria uma duração que ninguém
   * pediu; mandar `45.5` para um `integer` é erro do Postgres, não arredondamento. */
  it("recusa duração fracionária em vez de arredondar por conta própria", async () => {
    const r = repoServico();
    await expect(
      criarAjustarServico({ negocio: r })(T, { ...base, duracao: 45.5 }),
    ).rejects.toThrow(/minutos inteiros/i);
  });

  it("recusa categoria inventada — o banco só conhece três", async () => {
    const r = repoServico();
    await expect(
      criarAjustarServico({ negocio: r })(T, { ...base, categoria: "Promoção" as never }),
    ).rejects.toMatchObject({ campo: "categoria" });
  });

  it.each([["   ", "em branco"], ["---", "só pontuação"]])(
    "recusa nome %s (%s)",
    async (nome) => {
      const r = repoServico();
      await expect(criarAjustarServico({ negocio: r })(T, { ...base, nome })).rejects.toMatchObject({
        campo: "nome",
      });
    },
  );

  it("recusa nome longo demais", async () => {
    const r = repoServico();
    await expect(
      criarAjustarServico({ negocio: r })(T, { ...base, nome: "a".repeat(NOME_SERVICO_MAX + 1) }),
    ).rejects.toThrow(/passa de/i);
  });

  /* Ausente na criação tem que significar "nasce ativo", e não `undefined` gravado —
   * senão o serviço que o dono acabou de cadastrar não aparece na lista dele. */
  it("não manda `ativo` quando ninguém pediu, para o default do banco valer", async () => {
    const r = repoServico();
    await criarAjustarServico({ negocio: r })(T, base);
    expect(r.salvarServico).toHaveBeenCalledWith(
      T,
      expect.not.objectContaining({ ativo: expect.anything() }),
    );
  });

  it("desativar passa `ativo: false` adiante — é como se aposenta um serviço", async () => {
    const r = repoServico();
    await criarAjustarServico({ negocio: r })(T, { ...base, id: "sv-1", ativo: false });
    expect(r.salvarServico).toHaveBeenCalledWith(T, expect.objectContaining({ ativo: false }));
  });
});

describe("ajustar quem atende", () => {
  it("grava o nome colapsado", async () => {
    const r = repoServico();
    await criarAjustarProfissional({ negocio: r })(T, { nome: "  José   da Silva " });
    expect(r.salvarProfissional).toHaveBeenCalledWith(T, expect.objectContaining({ nome: "José da Silva" }));
  });

  /* ⚠️ O caso real: `criar_negocio()` adivinha o nome do primeiro profissional a partir do
   * e-mail, e um negócio de verdade ficou com um profissional chamado
   * `bruno.vaskevicius` — nome que a MAISA fala ao confirmar "com quem?". */
  it("consegue corrigir o nome que o provisionamento adivinhou", async () => {
    const r = repoServico();
    await criarAjustarProfissional({ negocio: r })(T, { id: "pr-1", nome: "Bruno Vaskevicius" });
    expect(r.salvarProfissional).toHaveBeenCalledWith(
      T,
      expect.objectContaining({ id: "pr-1", nome: "Bruno Vaskevicius" }),
    );
  });

  /* Uma letra é digitação interrompida. É o `check` da coluna
   * (`length(btrim(nome)) between 2 and 120`) dito antes de chegar lá. */
  it("recusa nome de uma letra — profissional é pessoa", async () => {
    const r = repoServico();
    await expect(criarAjustarProfissional({ negocio: r })(T, { nome: "J" })).rejects.toThrow(DadoInvalido);
    expect(r.salvarProfissional).not.toHaveBeenCalled();
  });

  /* Sem isto, um campo que o dono abriu e fechou viraria uma função chamada "" na tela de
   * Equipe — a mesma regra que `provisionar.ts` já aplica ao profissional inicial. */
  it("papel em branco é o mesmo que não ter mandado", async () => {
    const r = repoServico();
    await criarAjustarProfissional({ negocio: r })(T, { nome: "Zé", papel: "   " });
    expect(r.salvarProfissional).toHaveBeenCalledWith(
      T,
      expect.not.objectContaining({ papel: expect.anything() }),
    );
  });
});

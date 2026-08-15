/* ─────────────────────────────────────────────────────────────────────────────
 * O QUINTO CASO DE "CONFIGURA E IGNORA".
 *
 * Até 15/08/2026 o agente respondia dúvida com uma FIXTURE de demonstração, igual para
 * todo inquilino, enquanto a tabela `faqs` de cada negócio dormia com o que o dono
 * cadastrou. Uma das respostas inventadas ("Seg a sex, das 8h às 20h") contradizia o
 * horário anunciado que o dono tinha configurado pela tela — dois lugares do produto
 * respondendo coisas diferentes para a mesma pergunta do cliente.
 *
 * O que se prova aqui é o que os quatro casos anteriores ensinaram a desconfiar:
 *   • que o que se grava é o que se pediu (e reindexado, senão a FAQ some da busca);
 *   • que NÃO reindexa quando não precisa (custo por chamada de embedding);
 *   • que vazio é resposta, e não erro maquiado de resposta.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it, vi } from "vitest";
import { criarAjustarFaq, criarLerFaqs, criarRemoverFaq, criarResponderDuvida } from "./faqs";
import { DIMENSOES_DO_VETOR, PERGUNTA_MAX, RESPOSTA_MAX, normalizarVetor } from "../dominio/faq";
import { DadoInvalido } from "../dominio/erros";
import type { ContextoTenant } from "../dominio/tenant";
import type { GeradorDeEmbedding } from "../portas/saida/gerador-de-embedding";
import type { RepositorioFaqs } from "../portas/saida/repositorio-faqs";

const T: ContextoTenant = { tenantId: "t-1", usuarioId: "u-1", ator: { tipo: "usuario", id: "u-1" } };

const vetorFalso = (n = 1) => new Array(DIMENSOES_DO_VETOR).fill(n / DIMENSOES_DO_VETOR);

function embedding(): GeradorDeEmbedding & { embutir: ReturnType<typeof vi.fn> } {
  return { embutir: vi.fn(async () => vetorFalso()) } as never;
}

function repo(sobre: Partial<RepositorioFaqs> = {}) {
  return {
    listar: vi.fn(async () => []),
    salvar: vi.fn(async (_t, r, _v) => ({
      id: r.id ?? "fq-novo", pergunta: r.pergunta, resposta: r.resposta, usos: 0,
    })),
    remover: vi.fn(async () => {}),
    buscar: vi.fn(async () => []),
    registrarUso: vi.fn(async () => {}),
    ...sobre,
  } as unknown as RepositorioFaqs & Record<string, ReturnType<typeof vi.fn>>;
}

describe("normalizarVetor", () => {
  it("põe o vetor na esfera unitária", () => {
    const n = normalizarVetor([3, 4]);
    expect(Math.hypot(...n)).toBeCloseTo(1, 10);
    expect(n).toEqual([0.6, 0.8]);
  });

  /* ⚠️ Este teste guarda um defeito MEDIDO, não hipotético: o `gemini-embedding-001`
   * devolve o vetor de 3072 já normalizado (norma 1.0000), mas os truncados por
   * `outputDimensionality` NÃO — 768 volta com 0.5882. Sem normalizar, a similaridade de
   * cosseno mede tamanho junto com direção e o ranking sai plausível e errado. */
  it("um vetor com norma 0.5882 vira norma 1 — o caso real do Gemini truncado", () => {
    const cru = new Array(DIMENSOES_DO_VETOR).fill(0.5882 / Math.sqrt(DIMENSOES_DO_VETOR));
    expect(Math.hypot(...cru)).toBeCloseTo(0.5882, 4);
    expect(Math.hypot(...normalizarVetor(cru))).toBeCloseTo(1, 10);
  });

  /* Dividir por zero produziria um vetor de `NaN`, que atravessa o insert e só morre no
   * `<=>` do Postgres — longe da causa. */
  it("vetor de zeros volta como está, sem NaN", () => {
    const z = normalizarVetor([0, 0, 0]);
    expect(z).toEqual([0, 0, 0]);
    expect(z.some(Number.isNaN)).toBe(false);
  });
});

describe("cadastrar uma FAQ", () => {
  it("indexa a PERGUNTA, não a resposta", async () => {
    const r = repo();
    const e = embedding();
    await criarAjustarFaq({ faqs: r, embedding: e })(T, {
      pergunta: "Vocês têm estacionamento?",
      resposta: "Temos convênio com o estacionamento da esquina.",
    });

    /* Quem busca é o cliente PERGUNTANDO, e a frase dele se parece com a pergunta
     * cadastrada — não com a resposta. Indexar as duas juntas empurra o vetor para o meio
     * e piora o casamento das duas pontas. */
    expect(e.embutir).toHaveBeenCalledTimes(1);
    expect(e.embutir).toHaveBeenCalledWith("Vocês têm estacionamento?");
  });

  it("gera o vetor ANTES de gravar — provedor que falha não deixa FAQ órfã", async () => {
    const r = repo();
    const e = { embutir: vi.fn(async () => { throw new Error("Gemini fora do ar"); }) } as never;

    await expect(
      criarAjustarFaq({ faqs: r, embedding: e })(T, { pergunta: "Aceita cartão?", resposta: "Sim." }),
    ).rejects.toThrow("Gemini fora do ar");

    /* Na ordem inversa a FAQ existiria na tela com vetor nulo: parecendo pronta e nunca
     * sendo encontrada. É o pior dos dois estados, porque é invisível. */
    expect(r.salvar).not.toHaveBeenCalled();
  });

  it("colapsa espaço antes de indexar, senão o mesmo texto vira dois vetores", async () => {
    const r = repo();
    const e = embedding();
    await criarAjustarFaq({ faqs: r, embedding: e })(T, {
      pergunta: "  Vocês   abrem   sábado? ",
      resposta: "  Sim,  das 9h às 13h. ",
    });
    expect(e.embutir).toHaveBeenCalledWith("Vocês abrem sábado?");
    expect(r.salvar).toHaveBeenCalledWith(
      T, expect.objectContaining({ pergunta: "Vocês abrem sábado?", resposta: "Sim, das 9h às 13h." }), expect.anything(),
    );
  });

  it.each([
    ["pergunta em branco", { pergunta: "   ", resposta: "ok" }],
    ["resposta em branco", { pergunta: "ok?", resposta: "  " }],
  ])("recusa %s sem gastar chamada de embedding", async (_rotulo, p) => {
    const r = repo();
    const e = embedding();
    await expect(criarAjustarFaq({ faqs: r, embedding: e })(T, p)).rejects.toThrow(DadoInvalido);
    /* Validar antes de embutir não é só correção: cada chamada é paga. */
    expect(e.embutir).not.toHaveBeenCalled();
  });

  it("recusa pergunta longa demais — texto grande dilui o vetor", async () => {
    const r = repo();
    const e = embedding();
    await expect(
      criarAjustarFaq({ faqs: r, embedding: e })(T, { pergunta: "a".repeat(PERGUNTA_MAX + 1), resposta: "ok" }),
    ).rejects.toThrow(/passa de/i);
  });

  it("recusa resposta longa demais — ela vai inteira para o WhatsApp", async () => {
    const r = repo();
    const e = embedding();
    await expect(
      criarAjustarFaq({ faqs: r, embedding: e })(T, { pergunta: "ok?", resposta: "a".repeat(RESPOSTA_MAX + 1) }),
    ).rejects.toThrow(/passa de/i);
  });

  it("editar passa o id adiante, para o adaptador atualizar em vez de duplicar", async () => {
    const r = repo();
    await criarAjustarFaq({ faqs: r, embedding: embedding() })(T, {
      id: "fq-7", pergunta: "Aceita Pix?", resposta: "Aceita.",
    });
    expect(r.salvar).toHaveBeenCalledWith(T, expect.objectContaining({ id: "fq-7" }), expect.anything());
  });
});

describe("o agente perguntando", () => {
  it("busca com o vetor da pergunta e devolve as achadas", async () => {
    const achada = { id: "fq-1", pergunta: "Onde fica?", resposta: "Rua X, 10.", similaridade: 0.91 };
    const r = repo({ buscar: vi.fn(async () => [achada]) as never });
    const e = embedding();

    const saida = await criarResponderDuvida({ faqs: r, embeddingDePergunta: e })(T, "vcs ficam onde?");

    expect(e.embutir).toHaveBeenCalledWith("vcs ficam onde?");
    expect(saida).toEqual([achada]);
  });

  /* "O dono não cadastrou isso" é resposta legítima. Devolver sempre a menos distante
   * faria a MAISA responder qualquer coisa com aparência de fonte — pior que não
   * responder, porque parece verificado. O corte de similaridade mora no banco. */
  it("vazio é resposta, não erro", async () => {
    const r = repo({ buscar: vi.fn(async () => []) as never });
    const saida = await criarResponderDuvida({ faqs: r, embeddingDePergunta: embedding() })(T, "vocês vendem carro?");
    expect(saida).toEqual([]);
    expect(r.registrarUso).not.toHaveBeenCalled();
  });

  it("pergunta vazia não chama o provedor nem estoura o turno do agente", async () => {
    const r = repo();
    const e = embedding();
    const saida = await criarResponderDuvida({ faqs: r, embeddingDePergunta: e })(T, "   ");
    expect(saida).toEqual([]);
    expect(e.embutir).not.toHaveBeenCalled();
    expect(r.buscar).not.toHaveBeenCalled();
  });

  it("conta uso SÓ da primeira colocada", async () => {
    const r = repo({
      buscar: vi.fn(async () => [
        { id: "fq-1", pergunta: "a", resposta: "a", similaridade: 0.9 },
        { id: "fq-2", pergunta: "b", resposta: "b", similaridade: 0.6 },
      ]) as never,
    });
    await criarResponderDuvida({ faqs: r, embeddingDePergunta: embedding() })(T, "qualquer coisa");
    await new Promise((r2) => setTimeout(r2, 0));

    /* Contar todas inflaria justamente as FAQs genéricas, que aparecem em qualquer busca —
     * e o dono leria isso como "essa é a dúvida principal" quando é ruído de vizinhança. */
    expect(r.registrarUso).toHaveBeenCalledTimes(1);
    expect(r.registrarUso).toHaveBeenCalledWith(T, "fq-1");
  });

  it("contador que falha NÃO derruba a resposta", async () => {
    const r = repo({
      buscar: vi.fn(async () => [{ id: "fq-1", pergunta: "a", resposta: "a", similaridade: 0.9 }]) as never,
      registrarUso: vi.fn(async () => { throw new Error("banco caiu"); }) as never,
    });
    /* O cliente já tem a resposta certa; perder um incremento não muda nada. Propagar o
     * erro daqui abortaria o turno inteiro por causa de estatística. */
    await expect(
      criarResponderDuvida({ faqs: r, embeddingDePergunta: embedding() })(T, "onde fica?"),
    ).resolves.toHaveLength(1);
  });
});

describe("listar e remover", () => {
  it("listar repassa ao repositório, sem regra própria", async () => {
    const lista = [{ id: "fq-1", pergunta: "a", resposta: "b", usos: 3 }];
    const r = repo({ listar: vi.fn(async () => lista) as never });
    await expect(criarLerFaqs({ faqs: r })(T)).resolves.toEqual(lista);
  });

  it("remover sem id é recusado antes de tocar o banco", async () => {
    const r = repo();
    await expect(criarRemoverFaq({ faqs: r })(T, "  ")).rejects.toThrow(DadoInvalido);
    expect(r.remover).not.toHaveBeenCalled();
  });
});

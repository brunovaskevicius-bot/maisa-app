/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM — a única tela do app que dispara uma COBRANÇA.
 *
 * ★ **BOTÃO DE COBRAR NÃO APARECE SOBRE DÚVIDA.** Enquanto a leitura está em `carregando`
 * ou deu `erro`, e quando a rota não achou linha de assinatura, a gaveta não oferece nada.
 * Um "Assinar" que pisca meio segundo antes da resposta do servidor é um botão que pode
 * cobrar o plano errado no cartão de alguém.
 *
 * ★ **PLANO QUE NÃO ESTÁ NA TABELA NÃO VIRA BOTÃO.** `assinaturas.plano` é texto livre, e o
 * `005_provisionar.sql` semeia o trial com `preco = 149.90` — valor que não é de plano
 * nenhum. Chutar "profissional" ali cobraria R$ 197 de quem contratou outra coisa.
 *
 * ★ **INADIMPLENTE COM ASSINATURA NO PROVEDOR NÃO ASSINA DE NOVO.** Assinaria em cima, e o
 * resultado são duas assinaturas ativas e duas cobranças no mesmo cartão. O caminho é o
 * portal: trocar o cartão e pagar a fatura que está aberta.
 *
 * E a volta do checkout: ela manda para uma rota QUE EXISTE. Ver o último `describe`.
 * ────────────────────────────────────────────────────────────────────────────── */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chaveDoPlano, resumoDaAssinatura, type EstadoAssinatura } from "./store";
import type { Assinatura } from "@/nucleo/dominio/assinatura";

/** Uma assinatura de trial como o `005_provisionar.sql` cria: sem cartão, sem id de provedor. */
const trial = (over: Partial<Assinatura> = {}): Assinatura => ({
  plano: "Profissional",
  preco: null,
  moeda: "BRL",
  status: "trial",
  clienteId: null,
  assinaturaId: null,
  periodoFim: null,
  trialFim: "2026-10-05",
  cartaoMarca: null,
  cartaoFinal4: null,
  ...over,
});

const ok = (a: Assinatura | null): EstadoAssinatura => ({ status: "ok", assinatura: a });
const linha = (r: ReturnType<typeof resumoDaAssinatura>, label: string) =>
  r.linhas.find(([l]) => l === label)?.[1];

describe("chaveDoPlano", () => {
  it("traduz o texto da tabela para a chave do POST", () => {
    expect(chaveDoPlano("Profissional")).toBe("profissional");
    expect(chaveDoPlano("Essencial")).toBe("essencial");
    expect(chaveDoPlano("  ESCALA ")).toBe("escala");
  });

  it("devolve null para o que não está na tabela — não chuta", () => {
    expect(chaveDoPlano("Premium")).toBeNull();
    expect(chaveDoPlano("Profissional Plus")).toBeNull();
    expect(chaveDoPlano("")).toBeNull();
    expect(chaveDoPlano(null)).toBeNull();
    expect(chaveDoPlano(undefined)).toBeNull();
  });
});

describe("resumoDaAssinatura — nenhum botão sobre dúvida", () => {
  it("carregando não oferece ação nem afirma situação", () => {
    const r = resumoDaAssinatura({ status: "carregando", assinatura: null });
    expect(r.assinar).toBeNull();
    expect(r.gerenciar).toBe(false);
    expect(r.linhas).toEqual([]);
    expect(r.sub).not.toMatch(/ativa|em teste/i);
  });

  it("erro não oferece ação, e avisa", () => {
    const r = resumoDaAssinatura({ status: "erro", assinatura: null });
    expect(r.assinar).toBeNull();
    expect(r.gerenciar).toBe(false);
    expect(r.aviso?.tone).toBe("warn");
  });

  it("assinatura ausente avisa em vez de oferecer botão", () => {
    const r = resumoDaAssinatura(ok(null));
    expect(r.assinar).toBeNull();
    expect(r.gerenciar).toBe(false);
    expect(r.aviso).not.toBeNull();
  });
});

describe("resumoDaAssinatura — os quatro status", () => {
  it("trial oferece assinar o plano que está na linha, e não o portal", () => {
    const r = resumoDaAssinatura(ok(trial()));
    expect(r.assinar).toBe("profissional");
    /* Sem assinatura no provedor o portal abre vazio — ver o comentário em `gerenciar`. */
    expect(r.gerenciar).toBe(false);
    expect(r.aviso).toBeNull();
    expect(linha(r, "Teste até")).toBe("5 de outubro");
  });

  it("trial com plano fora da tabela não vira botão de cobrança", () => {
    const r = resumoDaAssinatura(ok(trial({ plano: "Premium" })));
    expect(r.assinar).toBeNull();
    /* A linha continua mostrando o que a tabela diz: esconder o texto esconderia o defeito. */
    expect(linha(r, "Plano")).toBe("Premium");
  });

  it("ativa não oferece assinar de novo, só o portal", () => {
    const r = resumoDaAssinatura(ok(trial({
      status: "ativa", assinaturaId: "sub_1", clienteId: "cus_1",
      preco: 197, periodoFim: "2026-10-21", cartaoMarca: "Visa", cartaoFinal4: "4417",
    })));
    expect(r.assinar).toBeNull();
    expect(r.gerenciar).toBe(true);
    expect(linha(r, "Próxima cobrança")).toBe("21 de outubro");
    expect(linha(r, "Valor")).toBe("R$ 197,00");
    expect(linha(r, "Forma de pagamento")).toBe("Visa final 4417");
  });

  it("inadimplente com assinatura no provedor manda para o portal, nunca para um segundo checkout", () => {
    const r = resumoDaAssinatura(ok(trial({ status: "inadimplente", assinaturaId: "sub_1", preco: 197 })));
    expect(r.assinar).toBeNull();
    expect(r.gerenciar).toBe(true);
    expect(r.aviso?.tone).toBe("danger");
    /* A frase fala de boleto de propósito: é o caso brasileiro que mais vai cair aqui. */
    expect(r.aviso?.texto).toMatch(/boleto/i);
  });

  it("cancelada deixa assinar de novo", () => {
    const r = resumoDaAssinatura(ok(trial({ status: "cancelada", plano: "Essencial", assinaturaId: "sub_1" })));
    expect(r.assinar).toBe("essencial");
    expect(r.gerenciar).toBe(true);
  });

  it("preço não pago é travessão, não zero", () => {
    expect(linha(resumoDaAssinatura(ok(trial())), "Valor")).toBe("—");
  });

  it("data ausente ou torta é travessão, não `Invalid Date`", () => {
    expect(linha(resumoDaAssinatura(ok(trial({ trialFim: null }))), "Teste até")).toBe("—");
    expect(linha(resumoDaAssinatura(ok(trial({ trialFim: "31/12/2026" }))), "Teste até")).toBe("—");
  });
});

/**
 * ⚠️ ESTE TESTE EXISTE POR UM 404 QUE FOI SERVIDO A QUEM ACABOU DE PAGAR.
 *
 * As rotas mandavam a volta do checkout para `/faturamento?pagamento=recebido`. Essa rota
 * NÃO EXISTE: o app é uma página só, e a tela vem do store pelo `?tela=`. O erro é
 * invisível em teste de unidade e invisível no demo — só aparece depois do cartão passar.
 */
describe("a volta do checkout vai para uma rota que existe", () => {
  const rotas = [
    "src/app/api/assinatura/route.ts",
    "src/app/api/assinatura/portal/route.ts",
  ];

  it.each(rotas)("%s não manda para /faturamento", (r) => {
    expect(readFileSync(r, "utf8")).not.toMatch(/voltarPara:\s*`\$\{origem\}\/faturamento/);
  });

  it("o checkout devolve para a tela `mais`, com o desfecho na query", () => {
    const fonte = readFileSync(rotas[0], "utf8");
    expect(fonte).toContain("/?tela=mais&pagamento=recebido");
    expect(fonte).toContain("/?tela=mais&pagamento=cancelado");
  });

  it("`mais` está na lista de telas que o `?tela=` aceita", () => {
    /* A lista é validada em runtime: um alvo fora dela é ignorado em silêncio, e a volta
     * do pagamento cairia no Fluxo de hoje sem explicação nenhuma. */
    const store = readFileSync("src/ui/estado/store.tsx", "utf8");
    const lista = store.slice(store.indexOf("const VALIDAS: TelaId[]"));
    expect(lista.slice(0, lista.indexOf("];"))).toContain('"mais"');
  });
});

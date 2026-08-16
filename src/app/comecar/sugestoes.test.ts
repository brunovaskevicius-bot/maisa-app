/* ─────────────────────────────────────────────────────────────────────────────
 * A ETAPA 4 NÃO PODE FALAR DE UM SERVIÇO QUE O NEGÓCIO NÃO VENDE.
 *
 * É a única invariante daquela tela, e ela vale asserção porque o modo de falhar é mudo:
 * a sugestão sai bonita, a pessoa clica, e a MAISA responde — corretamente — que não
 * conhece aquilo. Na primeira mensagem da tela que existe para provar que o produto
 * funciona. Ninguém vê erro nenhum no console.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { primeiroNome, sugestoes, type ExemploDoNegocio } from "./sugestoes";

const VAZIO: ExemploDoNegocio = { servico: null, profissional: null };
const BARBEARIA: ExemploDoNegocio = { servico: "Corte + Barba", profissional: "Rafael Bessa" };

const meio = { comecou: true, marcou: false };
const inicio = { comecou: false, marcou: false };

describe("as falas sugeridas da etapa 4", () => {
  it("usa o serviço e o profissional que vieram do banco", () => {
    expect(sugestoes(BARBEARIA, meio)[0]).toBe("Pode ser Corte + Barba com Rafael");
  });

  /* ⚠️ O teste que dá nome ao arquivo. Sem exemplo, a frase tem que ficar GENÉRICA — nunca
   * cair num padrão inventado como "o atendimento padrão", que é o que o `/laboratorio`
   * usa e o que quebraria aqui. */
  it("sem exemplo nenhum, não inventa nome de serviço", () => {
    const fala = sugestoes(VAZIO, meio)[0];
    expect(fala).toBe("Pode ser esse mesmo");
    expect(fala).not.toMatch(/corte|barba|sessão|atendimento padrão/i);
  });

  it("com serviço e sem profissional, fala só do serviço", () => {
    expect(sugestoes({ servico: "Sessão de 50 min", profissional: null }, meio)[0])
      .toBe("Pode ser Sessão de 50 min");
  });

  it("com profissional e sem serviço, fala só de quem atende", () => {
    expect(sugestoes({ servico: null, profissional: "Carla Guth" }, meio)[0])
      .toBe("Pode ser com Carla");
  });

  /* A abertura é a mesma para todo mundo porque é vaga de propósito: sem serviço citado, a
   * MAISA precisa consultar a agenda e perguntar — que é o comportamento a exibir. Uma
   * abertura que já entrega tudo resolve em um turno, e um turno não mostra nada. */
  it("a primeira fala não depende do catálogo, e não cita serviço", () => {
    const a = sugestoes(VAZIO, inicio);
    expect(a).toEqual(sugestoes(BARBEARIA, inicio));
    expect(a[0]).toContain("amanhã às 13h");
    expect(a[0]).not.toContain("Corte");
  });

  /* Depois de marcar, a sugestão vira cancelar: é a segunda coisa que todo dono quer ver a
   * MAISA fazer, e desfaz de graça o horário que a demonstração criou na agenda REAL. Sem
   * esta linha, cada pessoa que passa pelo onboarding deixa um compromisso fantasma no
   * Google dela. */
  it("depois de marcar, oferece cancelar", () => {
    expect(sugestoes(BARBEARIA, { comecou: true, marcou: true })[0])
      .toBe("Preciso cancelar esse horário");
  });

  it("nenhuma sugestão sai vazia ou só com espaço", () => {
    const todas = [
      ...sugestoes(VAZIO, inicio), ...sugestoes(VAZIO, meio),
      ...sugestoes(BARBEARIA, meio), ...sugestoes(BARBEARIA, { comecou: true, marcou: true }),
    ];
    expect(todas.length).toBeGreaterThan(0);
    for (const f of todas) expect(f.trim()).toBe(f), expect(f.length).toBeGreaterThan(2);
  });

  describe("primeiroNome", () => {
    it("corta o sobrenome", () => expect(primeiroNome("Rafael Bessa Filho")).toBe("Rafael"));
    it("aguenta espaço duplo e bordas", () => expect(primeiroNome("  Ana   Paula ")).toBe("Ana"));
    /* Nome de uma palavra é o caso comum no cadastro semeado (`criar_negocio()` usa o
     * prefixo do e-mail), e o `|| n.trim()` existe para ele não virar string vazia. */
    it("nome de uma palavra volta inteiro", () => expect(primeiroNome("Fefo")).toBe("Fefo"));
  });
});

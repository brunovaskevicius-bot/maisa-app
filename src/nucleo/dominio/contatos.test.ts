/* ─────────────────────────────────────────────────────────────────────────────
 * A MAISA NÃO PODE FALAR COM O PAI DO DONO — E NÃO PODE CALAR PARA UM CLIENTE NOVO.
 *
 * As duas metades desta regra falham em direções opostas, e as duas são caras:
 *
 *   • responder um contato pessoal = a MAISA oferecendo horário para a família de quem
 *     comprou o produto. Custa a confiança, e não tem desfazer;
 *   • calar para um número desconhecido = o lead perdido em silêncio. É o argumento que
 *     derrubou a lista de permissão.
 *
 * Nenhum teste de integração pega isso: os dois caminhos devolvem "nada aconteceu" visto de
 * fora. É função pura justamente para poder ser interrogada aqui.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import {
  MODO_PADRAO, chaveDe, ehModoDoNumero, motivoDoSilencio, podeResponder,
  type Contato,
} from "./contatos";

const pai: Contato = { chave: "94294906", nome: "Pai", cliente: null };
const clienteSalvo: Contato = { chave: "97654321", nome: "Fernanda", cliente: true };
const naoCliente: Contato = { chave: "91112222", nome: "Dentista", cliente: false };

describe("quem a MAISA atende", () => {
  describe("no número só do negócio", () => {
    const modo = "negocio" as const;

    /* Aqui não há vida pessoal para proteger, e o caderno serve só para emprestar nome. */
    it("responde todo mundo, inclusive quem está nos contatos", () => {
      expect(podeResponder({ modo, contato: pai, cadernoVazio: false })).toBe(true);
      expect(podeResponder({ modo, contato: naoCliente, cadernoVazio: false })).toBe(true);
      expect(podeResponder({ modo, contato: null, cadernoVazio: false })).toBe(true);
    });
  });

  describe("no número que também é pessoal", () => {
    const modo = "pessoal" as const;

    /* ⚠️ O teste que dá nome ao arquivo. */
    it("NÃO responde um contato salvo que ninguém marcou como cliente", () => {
      expect(podeResponder({ modo, contato: pai, cadernoVazio: false })).toBe(false);
    });

    it("não responde quem foi marcado explicitamente como não-cliente", () => {
      expect(podeResponder({ modo, contato: naoCliente, cadernoVazio: false })).toBe(false);
    });

    /* ⚠️ A outra metade, e a que parece contraintuitiva: ela atende justamente quem NÃO
     * conhece. Quem não está na agenda de um barbeiro é, quase sempre, quem achou o número
     * procurando corte. Uma lista de permissão perderia essa pessoa — é o defeito que este
     * desenho existe para não ter. */
    it("responde número desconhecido, porque é o lead", () => {
      expect(podeResponder({ modo, contato: null, cadernoVazio: false })).toBe(true);
    });

    it("responde contato marcado como cliente", () => {
      expect(podeResponder({ modo, contato: clienteSalvo, cadernoVazio: false })).toBe(true);
    });
  });

  /* Fail-safe: o erro barato é calar para um contato salvo (visível na tela de Conversas,
   * corrigível com um toque). O erro caro é atender a mãe do dono. */
  it("o padrão é `pessoal` — o modo que erra para o lado barato", () => {
    expect(MODO_PADRAO).toBe("pessoal");
  });

  it("modo inventado não passa pela porta", () => {
    expect(ehModoDoNumero("negocio")).toBe(true);
    expect(ehModoDoNumero("pessoal")).toBe(true);
    expect(ehModoDoNumero("todos")).toBe(false);
    expect(ehModoDoNumero(undefined)).toBe(false);
    expect(ehModoDoNumero("")).toBe(false);
  });
});

describe("o motivo do silêncio", () => {
  /* Silêncio sem motivo registrado é o modo de falha mais caro deste canal: o dono vê "não
   * respondeu" e não distingue isso de um erro de verdade. */
  it("é nulo quando ela pode responder", () => {
    expect(motivoDoSilencio({ modo: "pessoal", contato: null, cadernoVazio: false })).toBeNull();
    expect(motivoDoSilencio({ modo: "negocio", contato: pai, cadernoVazio: false })).toBeNull();
  });

  it("diz o nome de quem foi calado, quando sabe", () => {
    expect(motivoDoSilencio({ modo: "pessoal", contato: pai, cadernoVazio: false })).toContain("Pai");
  });

  it("sem nome, ainda explica a regra", () => {
    const m = motivoDoSilencio({ modo: "pessoal", contato: { chave: "1", nome: null, cliente: null }, cadernoVazio: false });
    expect(m).toBeTruthy();
    expect(m).toContain("contatos");
  });
});

describe("a chave de casamento", () => {
  /* O mesmo telefone chega de três formas — com e sem DDI, com e sem o nono dígito. Oito
   * dígitos é a normalização que `clientes.telefone_chave` já usa; divergir aqui faria o
   * caderno nunca casar com quem escreve. */
  it("junta as escritas do mesmo número", () => {
    const esperado = "94294906";
    expect(chaveDe("5511994294906")).toBe(esperado);
    expect(chaveDe("11994294906")).toBe(esperado);
    expect(chaveDe("(11) 99429-4906")).toBe(esperado);
    expect(chaveDe("+55 11 99429 4906")).toBe(esperado);
    expect(chaveDe("994294906")).toBe(esperado);
  });

  /* ⚠️ Chave vazia NÃO é chave. Se `""` valesse, duas pessoas sem telefone legível casariam
   * entre si — e no modo pessoal isso calaria a MAISA para um desconhecido, que é justamente
   * o lead. Quem chama trata `""` como "não sei quem é". */
  it("o que não tem 8 dígitos volta vazio, não truncado", () => {
    expect(chaveDe("1234567")).toBe("");
    expect(chaveDe("")).toBe("");
    expect(chaveDe(null)).toBe("");
    expect(chaveDe(undefined)).toBe("");
    expect(chaveDe("sem número nenhum")).toBe("");
  });
});


/* ─────────────────────────────────────────────────────────────────────────────
 * ★ A TRAVA DO CADERNO VAZIO — escrita em 24/08/2026, DEPOIS de acontecer.
 *
 * O dono conectou o WhatsApp PESSOAL dele sem ter importado a agenda. O caderno ficou com
 * zero linhas, e `podeResponder` passou a ver todo mundo como "desconhecido" — que no modo
 * pessoal significa ATENDER, porque é o que um lead parece.
 *
 * Resultado: a MAISA respondeu gente conhecida do dono, no WhatsApp pessoal dele. Não foi
 * bug — foi esta função fazendo exatamente o que estava escrito, sem o dado de que ela
 * depende para distinguir "não conheço esta pessoa" de "não conheço ninguém".
 *
 * Os dois erros não são simétricos, e é por isso que aqui se falha FECHADO: calar até a
 * agenda ser importada custa um lead, que é recuperável e visível. Responder o conhecido
 * custa uma mensagem de robô no WhatsApp de terceiro, que não se apaga.
 * ────────────────────────────────────────────────────────────────────────────── */

describe("★ caderno vazio", () => {
  /* O TESTE QUE DÁ NOME AO INCIDENTE. */
  it("no modo pessoal, cala para TODO MUNDO enquanto a agenda não for importada", () => {
    for (const contato of [null, pai, clienteSalvo, naoCliente]) {
      expect(podeResponder({ modo: "pessoal", contato, cadernoVazio: true })).toBe(false);
    }
  });

  /* ⚠️ A ORDEM DAS GUARDAS IMPORTA. `negocio` é decidido ANTES do caderno vazio: quem
   * declarou a linha como do negócio não tem contato pessoal a proteger, e travar ali
   * silenciaria justamente o caso em que responder desconhecido é o produto inteiro. */
  it("no número do negócio, caderno vazio NÃO cala — é o dia 1 de qualquer cliente", () => {
    for (const contato of [null, pai, clienteSalvo]) {
      expect(podeResponder({ modo: "negocio", contato, cadernoVazio: true })).toBe(true);
    }
  });

  it("importada a agenda, a regra normal volta a valer", () => {
    expect(podeResponder({ modo: "pessoal", contato: null, cadernoVazio: false })).toBe(true);
    expect(podeResponder({ modo: "pessoal", contato: clienteSalvo, cadernoVazio: false })).toBe(true);
    expect(podeResponder({ modo: "pessoal", contato: pai, cadernoVazio: false })).toBe(false);
  });

  /* ⚠️ SILÊNCIO SEM MOTIVO REGISTRADO é o modo de falha mais caro deste canal: o dono vê "a
   * MAISA não respondeu" e não distingue isso de um erro de verdade. */
  it("o silêncio é explicado, e a frase manda importar", () => {
    const m = motivoDoSilencio({ modo: "pessoal", contato: null, cadernoVazio: true });
    expect(m).toContain("não foram importados");
    expect(m).toContain("Importe os contatos");
  });

  /* A frase da trava vem ANTES da frase do contato: quem está nesse estado não precisa marcar
   * pessoa por pessoa, precisa apertar um botão. Dizer a outra coisa manda consertar errado. */
  it("com caderno vazio, a frase é a da trava — não a do contato não marcado", () => {
    const m = motivoDoSilencio({ modo: "pessoal", contato: pai, cadernoVazio: true });
    expect(m).toContain("Importe os contatos");
    expect(m).not.toContain("não foi marcado como cliente");
  });
});

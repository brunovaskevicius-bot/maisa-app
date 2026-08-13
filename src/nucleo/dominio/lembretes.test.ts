import { describe, expect, it } from "vitest";
import { horaLocal, janelaDeLembrete, textoDoLembrete, type LembretePendente } from "./lembretes";

const base: LembretePendente = {
  id: "at-1",
  tenantId: "t1",
  clienteNome: "Maria Aparecida da Silva",
  clienteTel: "5511999990000",
  servicoNome: "Corte",
  inicio: "2026-08-14T18:00:00Z",
};

describe("horaLocal", () => {
  /* O TESTE MAIS IMPORTANTE DESTE ARQUIVO. O banco devolve UTC, a função serverless roda
   * em UTC, e a máquina que roda este teste também. Sem fuso explícito, tudo passaria e a
   * primeira mensagem real diria "18:00" para um atendimento das 15:00. */
  it("converte UTC para o fuso do negócio", () => {
    expect(horaLocal("2026-08-14T18:00:00Z")).toBe("15:00");
  });

  it("atravessa o dia sem estourar", () => {
    expect(horaLocal("2026-08-15T02:30:00Z")).toBe("23:30");
  });

  it("respeita um fuso diferente quando pedido", () => {
    expect(horaLocal("2026-08-14T18:00:00Z", "America/Manaus")).toBe("14:00");
  });

  it("usa 24h, e não am/pm", () => {
    expect(horaLocal("2026-08-14T23:00:00Z")).toBe("20:00");
  });
});

describe("janelaDeLembrete", () => {
  it("são três horas à frente", () => {
    expect(janelaDeLembrete(new Date("2026-08-14T12:00:00Z")).toISOString())
      .toBe("2026-08-14T15:00:00.000Z");
  });
});

describe("textoDoLembrete", () => {
  const texto = (over: Partial<LembretePendente> = {}) =>
    textoDoLembrete({
      pendente: { ...base, ...over },
      nomeDoNegocio: "Barbearia Aurora",
      nomeDaAssistente: "MAISA",
    });

  it("trata o cliente pelo primeiro nome", () => {
    expect(texto()).toContain("Oi, Maria!");
  });

  it("diz a hora local, o serviço e o negócio", () => {
    const t = texto();
    expect(t).toContain("15:00");
    expect(t).toContain("de Corte");
    expect(t).toContain("Barbearia Aurora");
  });

  /* Sem nome, a mensagem continua natural. "Oi, !" seria o sintoma clássico de template
   * mal costurado chegando no cliente do cliente. */
  it.each([null, "", "   "])("sem nome (%j) não deixa buraco na frase", (nome) => {
    const t = texto({ clienteNome: nome });
    expect(t).toContain("Oi! ");
    expect(t).not.toContain("Oi, !");
  });

  it("sem serviço, não inventa preposição solta", () => {
    const t = texto({ servicoNome: null });
    expect(t).toContain("seu horário hoje");
    expect(t).not.toMatch(/\sde\s+hoje/);
  });

  /* O valor do lembrete para o DONO não é o cliente lembrar — é o horário vago aparecer
   * cedo o bastante para ser reocupado. Um lembrete que não convida a responder perde
   * exatamente isso, e é a única frase deste texto que não é decoração. */
  it("convida a avisar quando não puder vir", () => {
    expect(texto()).toMatch(/me avisa/i);
  });

  it("assina com o nome da assistente", () => {
    expect(texto()).toContain("— MAISA");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * Que o demo **não mente sobre o tempo**. A emissão real é assíncrona: volta `pendente` e o
 * desfecho chega depois. Um demo que respondesse `emitido` na hora tornaria verde um código que
 * quebra em produção — porque o bug caro deste produto vive exatamente no intervalo entre os
 * dois instantes.
 *
 * E que `consultar` de um protocolo desconhecido devolve `null`, não um desfecho inventado. É
 * essa resposta que autoriza a cascata a tentar de novo com segurança.
 * ────────────────────────────────────────────────────────────────────────────── */

import { beforeEach, describe, expect, it } from "vitest";
import { emissorReciboDemo, limparEmissorDemo, resolverReciboDemo } from "./emissor-recibo";
import { podeTentarOutroCanal } from "@/nucleo/dominio/recibo-unitario";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { EmissorCredenciado, PedidoDeRecibo } from "@/nucleo/dominio/recibo-unitario";

const t: ContextoTenant = { tenantId: "t1", usuarioId: "u1", ator: { tipo: "usuario", id: "u1" } };

const carla: EmissorCredenciado = {
  cpf: "12345678909",
  ocupacao: "psicologo",
  registroProfissional: "CRP 06/123456",
};

const pedido = (over: Partial<PedidoDeRecibo> = {}): PedidoDeRecibo => ({
  referencia: "rec-demo-ref",
  dataPagamento: "2026-08-14",
  valor: 250,
  descricao: "Atendimento realizado em 14/08/2026",
  cpfPagador: "98765432100",
  cpfBeneficiario: "98765432100",
  ...over,
});

beforeEach(limparEmissorDemo);

describe("o ciclo assíncrono", () => {
  /* ★ O TESTE QUE DÁ SENTIDO AO ADAPTADOR. */
  it("emitir devolve `pendente`, nunca `emitido`", async () => {
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    const aceito = await emissorReciboDemo.emitir(t, carla, pedido());

    expect(aceito.situacao).toBe("pendente");
    expect(aceito.chave).toBeNull();
    expect(aceito.protocolo).toBeTruthy();
  });

  /* ⚠️ Enquanto o callback não chega, `consultar` devolve `null` — e `null` aqui significa
   * "ainda não sei", diferente do `null` de protocolo inexistente. Quem chama tem que tratar os
   * dois como "não caia para o outro canal". */
  it("antes do callback, o desfecho não existe", async () => {
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    const { protocolo } = await emissorReciboDemo.emitir(t, carla, pedido());

    expect(await emissorReciboDemo.consultar(t, protocolo)).toBeNull();
  });

  it("resolvido como emitido, ganha chave e PDF", async () => {
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    const { protocolo } = await emissorReciboDemo.emitir(t, carla, pedido());

    resolverReciboDemo(protocolo, { situacao: "emitido" });
    const d = await emissorReciboDemo.consultar(t, protocolo);

    expect(d?.situacao).toBe("emitido");
    expect(d?.chave).toBe(`DEMO-${protocolo}`);
    expect(d?.pdfUrl).toContain(protocolo);
    expect(d?.erro).toBeNull();
  });

  /* Só daqui a cascata pode tentar outro canal — e o teste amarra as duas peças. */
  it("resolvido como recusado, libera a cascata", async () => {
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    const { protocolo } = await emissorReciboDemo.emitir(t, carla, pedido());

    resolverReciboDemo(protocolo, { situacao: "recusado", erro: "Ocupação não cadastrada." });
    const d = await emissorReciboDemo.consultar(t, protocolo);

    expect(d?.situacao).toBe("recusado");
    expect(d?.chave).toBeNull();
    expect(d?.pdfUrl).toBeNull();
    expect(d?.erro).toBe("Ocupação não cadastrada.");
    expect(podeTentarOutroCanal({ situacao: d!.situacao })).toBe(true);
  });

  /* ★ `null` DE PROTOCOLO DESCONHECIDO é a resposta que autoriza retentativa segura. Inventar
   * um desfecho aqui é o que transformaria a reconciliação em máquina de duplicar documento. */
  it("protocolo que o canal nunca viu devolve null", async () => {
    expect(await emissorReciboDemo.consultar(t, "prot-que-nao-existe")).toBeNull();
  });
});

describe("recusa do PEDIDO, que é diferente de recusa do recibo", () => {
  it("emitir sem cadastrar o emissor falha na hora", async () => {
    await expect(emissorReciboDemo.emitir(t, carla, pedido())).rejects.toThrow(/habilitado/i);
  });

  it("cadastrar duas vezes não quebra nem duplica", async () => {
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    const aceito = await emissorReciboDemo.emitir(t, carla, pedido());
    expect(aceito.situacao).toBe("pendente");
  });

  /* Dígito verificador aqui também: é o erro que a Receita devolveu de verdade ("Beneficiário do
   * serviço inválido"), e o demo tem que reproduzi-lo para a tela ser testável. */
  it("CPF que não fecha é recusado antes de virar protocolo", async () => {
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    await expect(
      emissorReciboDemo.emitir(t, carla, pedido({ cpfBeneficiario: "11122233344" })),
    ).rejects.toThrow(/beneficiário/i);
  });

  it("valor zero é recusado", async () => {
    await emissorReciboDemo.cadastrarEmissor(t, carla);
    await expect(emissorReciboDemo.emitir(t, carla, pedido({ valor: 0 }))).rejects.toThrow(/valor/i);
  });
});

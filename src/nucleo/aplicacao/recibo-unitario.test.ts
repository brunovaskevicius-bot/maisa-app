/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * ★ A ORDEM: prende o pagamento ANTES de falar com o canal. O teste que amarra isso registra a
 * sequência de chamadas e exige `abrir` antes de `emitir`. Inverter os dois abre uma janela em
 * que o pagamento está livre e a emissão já saiu — e dois cliques nessa janela produzem dois
 * recibos que **nenhum banco reconhece como duplicata**, porque cada um tem sua própria linha.
 *
 * E o que a reconciliação NÃO pode fazer: transformar "não sei" em "recusado". O canal
 * respondendo `null` é ambíguo de propósito, e tem que continuar ambíguo — tratar como recusa
 * libera a cascata, e se o pedido tinha chegado, sai o segundo recibo.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { criarEmitirRecibo, criarReconciliarRecibos } from "./recibo-unitario";
import type { ConfigFiscal } from "../dominio/fiscal";
import type { RepositorioFiscal } from "../portas/saida/repositorio-fiscal";
import type { LivroDeRecibos, ReciboAberto } from "../portas/saida/livro-de-recibos";
import type { EmissorDeReciboSaude } from "../portas/saida/emissor-recibo";
import type { PagamentoAFaturar, RepositorioRecibos } from "../portas/saida/repositorio-recibos";
import type {
  DesfechoDeRecibo, ReciboAceito, ReciboEmitido,
} from "../dominio/recibo-unitario";
import type { ContextoTenant } from "../dominio/tenant";

const t: ContextoTenant = { tenantId: "t1", usuarioId: "u1", ator: { tipo: "usuario", id: "u1" } };

const carla: ConfigFiscal = {
  ambiente: "producao",
  cnpj: null, razaoSocial: null, codigoMunicipio: null,
  optanteMei: false, optanteSimples: false, empresaId: null,
  certificadoValidoAte: null, codigoTributacaoNacional: null,
  prestadorCpf: "12345678909",
  ocupacaoSaude: "psicologo",
  registroProfissional: "CRP 06/123456",
  procuradorDocumento: null,
  procuracaoValidaAte: null,
  inscricaoMunicipal: null, itemListaServico: null,
  aliquotaIss: null, codigoTributarioMunicipio: null,
};

const fiscalDe = (c: ConfigFiscal): RepositorioFiscal => ({
  async ler() { return c; },
  async salvar() { return c; },
});

const sessao = (over: Partial<PagamentoAFaturar> = {}): PagamentoAFaturar => ({
  id: "at1", fonte: "atendimento", clienteId: "cl1",
  nome: "Mariana Alves", cpf: "98765432100", cpfPagador: null,
  data: "2026-08-14", valor: 250, servico: "Sessão", teste: false,
  ...over,
});

/** Um ambiente de teste com espião de SEQUÊNCIA — é a sequência que este arquivo protege. */
function ambiente(p: {
  pendentes?: PagamentoAFaturar[];
  /** O que a claim devolve. `null` = já preso. */
  aberto?: ReciboAberto | null;
  /** `emitir` estoura? Simula recusa do PEDIDO, não da Receita. */
  emitirQuebra?: string;
  /** O que o canal responde em `consultar`. `undefined` = devolve null. */
  desfecho?: DesfechoDeRecibo | null;
  /** As linhas que a reconciliação vai encontrar. */
  pendentesDoLivro?: ReciboEmitido[];
  /** `fechar` devolve null = o callback chegou primeiro. */
  fecharDevolveNull?: boolean;
} = {}) {
  const ordem: string[] = [];
  const protocolos: { reciboId: string; protocolo: string }[] = [];
  const descartados: { reciboId: string; erro: string }[] = [];
  const soltos: string[] = [];
  const fechados: DesfechoDeRecibo[] = [];
  const consultados: string[] = [];
  let pedidoEmitido: { valor: number; cpfBeneficiario: string; cpfPagador: string; descricao: string } | null = null;

  const livro: LivroDeRecibos = {
    async abrir() {
      ordem.push("abrir");
      return p.aberto === undefined ? { id: "rec1", valor: 250 } : p.aberto;
    },
    async registrarProtocolo(_t, x) { ordem.push("registrarProtocolo"); protocolos.push(x); },
    async fechar(_t, d) {
      ordem.push("fechar");
      fechados.push(d);
      if (p.fecharDevolveNull) return null;
      return {
        id: "rec1", canal: "automacao", situacao: d.situacao,
        protocolo: d.protocolo, chave: d.chave, pdfUrl: d.pdfUrl,
        pdfExpiraEm: d.pdfExpiraEm, erro: d.erro,
        criadoEm: "2026-08-24T10:00:00-03:00", emitidoEm: null,
      };
    },
    async descartar(_t, x) { ordem.push("descartar"); descartados.push(x); },
    async soltar(_t, id) { ordem.push("soltar"); soltos.push(id); return true; },
    async porProtocolo() { return null; },
    async pendentes() { return p.pendentesDoLivro ?? []; },
    async listar() { return []; },
  };

  const emissor: EmissorDeReciboSaude = {
    canal: "automacao",
    async cadastrarEmissor() { ordem.push("cadastrarEmissor"); },
    async emitir(_t, _e, pedido): Promise<ReciboAceito> {
      ordem.push("emitir");
      pedidoEmitido = pedido;
      if (p.emitirQuebra) throw new Error(p.emitirQuebra);
      return { protocolo: "prot-1", situacao: "pendente", chave: null };
    },
    async consultar(_t, prot) {
      ordem.push("consultar");
      consultados.push(prot);
      return p.desfecho ?? null;
    },
    async cancelar() {},
  };

  const recibos = {
    async pendentes() { return p.pendentes ?? [sessao()]; },
  } as unknown as RepositorioRecibos;

  return {
    emitir: criarEmitirRecibo({ livro, emissor, recibos, fiscal: fiscalDe(carla) }),
    reconciliar: criarReconciliarRecibos({ livro, emissor }),
    ordem, protocolos, descartados, soltos, fechados, consultados,
    get pedido() { return pedidoEmitido; },
  };
}

const linha = (over: Partial<ReciboEmitido> = {}): ReciboEmitido => ({
  id: "rec1", canal: "automacao", situacao: "pendente",
  protocolo: "prot-1", chave: null, pdfUrl: null, pdfExpiraEm: null,
  erro: null, criadoEm: "2026-08-24T10:00:00-03:00", emitidoEm: null,
  ...over,
});

describe("emitirRecibo", () => {
  /* ★ O TESTE QUE PROTEGE A GARANTIA INTEIRA. */
  it("prende o pagamento ANTES de falar com o canal", async () => {
    const a = ambiente();
    await a.emitir(t, { fonte: "atendimento", id: "at1" });

    expect(a.ordem).toEqual(["abrir", "emitir", "registrarProtocolo"]);
    expect(a.ordem.indexOf("abrir")).toBeLessThan(a.ordem.indexOf("emitir"));
  });

  it("termina em `pendente`, com protocolo gravado", async () => {
    const a = ambiente();
    const r = await a.emitir(t, { fonte: "atendimento", id: "at1" });

    expect(r.situacao).toBe("pendente");
    expect(r.protocolo).toBe("prot-1");
    expect(a.protocolos).toEqual([{ reciboId: "rec1", protocolo: "prot-1" }]);
  });

  /* ⚠️ O valor é o que a CLAIM devolveu, não o que a lista de pendentes dizia. Tela aberta há
   * dez minutos manda total velho, e total velho aqui vira documento fiscal de valor errado. */
  it("usa o valor do banco, não o da tela", async () => {
    const a = ambiente({
      pendentes: [sessao({ valor: 999 })],
      aberto: { id: "rec1", valor: 250 },
    });
    const r = await a.emitir(t, { fonte: "atendimento", id: "at1" });

    expect(r.valor).toBe(250);
    expect(a.pedido?.valor).toBe(250);
  });

  /* A claim devolvendo `null` é o segundo clique, ou o lote que chegou primeiro. */
  it("pagamento já preso não emite de novo", async () => {
    const a = ambiente({ aberto: null });
    await expect(a.emitir(t, { fonte: "atendimento", id: "at1" }))
      .rejects.toThrow(/já entrou num recibo ou num lote/i);

    expect(a.ordem).toEqual(["abrir"]);
  });

  /* ⚠️ Recusa do PEDIDO solta o pagamento — nada foi emitido. Sem isso, um CPF digitado errado
   * trancaria o pagamento para sempre e ele sairia do faturamento sem erro nenhum. */
  it("recusa do pedido descarta a linha e devolve o pagamento", async () => {
    const a = ambiente({ emitirQuebra: "CPF do beneficiário não é válido." });
    await expect(a.emitir(t, { fonte: "atendimento", id: "at1" })).rejects.toThrow(/CPF/);

    expect(a.ordem).toEqual(["abrir", "emitir", "descartar"]);
    expect(a.descartados).toEqual([
      { reciboId: "rec1", erro: "CPF do beneficiário não é válido." },
    ]);
  });

  /* ★ O BUG QUE ESTE TESTE EXISTE PARA IMPEDIR DE VOLTAR: a primeira versão chamava `fechar`
   * com o nosso `reciboId` no lugar do protocolo. `fechar` busca POR PROTOCOLO — não casava com
   * nada, a linha ficava `pendente` para sempre, e o pagamento sumia do faturamento. */
  it("no caminho de erro não chama `fechar`, que buscaria por protocolo inexistente", async () => {
    const a = ambiente({ emitirQuebra: "qualquer" });
    await expect(a.emitir(t, { fonte: "atendimento", id: "at1" })).rejects.toThrow();

    expect(a.ordem).not.toContain("fechar");
    expect(a.fechados).toEqual([]);
  });

  it("pagamento fora da lista não emite", async () => {
    const a = ambiente({ pendentes: [sessao({ id: "outro" })] });
    await expect(a.emitir(t, { fonte: "atendimento", id: "at1" }))
      .rejects.toThrow(/não está na lista/i);
    expect(a.ordem).toEqual([]);
  });

  it("cliente de teste não gera recibo de verdade", async () => {
    const a = ambiente({ pendentes: [sessao({ teste: true })] });
    await expect(a.emitir(t, { fonte: "atendimento", id: "at1" }))
      .rejects.toThrow(/demonstração/i);
  });

  it("sem CPF válido, recusa antes de prender", async () => {
    const a = ambiente({ pendentes: [sessao({ cpf: null })] });
    await expect(a.emitir(t, { fonte: "atendimento", id: "at1" }))
      .rejects.toThrow(/Falta o CPF de Mariana Alves/);
    expect(a.ordem).toEqual([]);
  });

  /* A descrição é fixa por data. "Sessão" está no fixture e não pode aparecer no documento. */
  it("a descrição não leva o nome do serviço", async () => {
    const a = ambiente({ pendentes: [sessao({ servico: "Terapia de casal" })] });
    await a.emitir(t, { fonte: "atendimento", id: "at1" });

    expect(a.pedido?.descricao).toBe("Atendimento realizado em 14/08/2026");
    expect(a.pedido?.descricao).not.toMatch(/terapia/i);
  });

  /* Mãe paga a terapia do filho: o pagador é ela, o beneficiário é ele. */
  it("pagador diferente vai nos dois campos certos", async () => {
    const a = ambiente({ pendentes: [sessao({ cpf: "98765432100", cpfPagador: "12345678909" })] });
    await a.emitir(t, { fonte: "atendimento", id: "at1" });

    expect(a.pedido?.cpfBeneficiario).toBe("98765432100");
    expect(a.pedido?.cpfPagador).toBe("12345678909");
  });

  it("sem pagador, repete o CPF do beneficiário nos dois campos", async () => {
    const a = ambiente();
    await a.emitir(t, { fonte: "atendimento", id: "at1" });

    expect(a.pedido?.cpfPagador).toBe(a.pedido?.cpfBeneficiario);
  });

  it("negócio de CNPJ não usa este caminho", async () => {
    const cnpj: ConfigFiscal = { ...carla, prestadorCpf: null, ocupacaoSaude: null, optanteMei: true, cnpj: "11222333000181" };
    const livro = {} as LivroDeRecibos;
    const emissor = { canal: "automacao" } as EmissorDeReciboSaude;
    const recibos = { async pendentes() { return []; } } as unknown as RepositorioRecibos;
    const emitir = criarEmitirRecibo({ livro, emissor, recibos, fiscal: fiscalDe(cnpj) });

    await expect(emitir(t, { fonte: "atendimento", id: "at1" }))
      .rejects.toThrow(/nota fiscal, não recibo/i);
  });
});

describe("reconciliarRecibos", () => {
  const agora = new Date("2026-08-24T12:00:00-03:00");

  it("pergunta ao canal e grava `emitido`", async () => {
    const a = ambiente({
      pendentesDoLivro: [linha()],
      desfecho: {
        protocolo: "prot-1", situacao: "emitido", chave: "REC-9",
        pdfUrl: "https://x/9.pdf", pdfExpiraEm: "2026-08-26T00:00:00-03:00", erro: null,
      },
    });
    const r = await a.reconciliar(t, agora);

    expect(a.consultados).toEqual(["prot-1"]);
    expect(r).toEqual({ olhados: 1, emitidos: 1, recusados: 0, aindaPendentes: 0, semProtocolo: 0 });
  });

  /* Recusa CONFIRMADA pelo canal é a única transição que devolve o pagamento para a lista. */
  it("recusa confirmada solta o pagamento", async () => {
    const a = ambiente({
      pendentesDoLivro: [linha()],
      desfecho: {
        protocolo: "prot-1", situacao: "recusado", chave: null,
        pdfUrl: null, pdfExpiraEm: null, erro: "Ocupação não cadastrada.",
      },
    });
    const r = await a.reconciliar(t, agora);

    expect(r.recusados).toBe(1);
    expect(a.soltos).toEqual(["rec1"]);
  });

  /* ★ O TESTE MAIS IMPORTANTE DESTE describe. `null` do canal é ambíguo — "não conheço esse
   * protocolo" ou "ainda processando" — e tratar como recusa liberaria a cascata. Se o pedido
   * tinha chegado, sai o segundo recibo. */
  it("canal que responde `null` NÃO vira recusa", async () => {
    const a = ambiente({ pendentesDoLivro: [linha()], desfecho: null });
    const r = await a.reconciliar(t, agora);

    expect(r).toEqual({ olhados: 1, emitidos: 0, recusados: 0, aindaPendentes: 1, semProtocolo: 0 });
    expect(a.soltos).toEqual([]);
    expect(a.fechados).toEqual([]);
  });

  /* ⚠️ Irreconciliável: sem protocolo não há o que perguntar. Conta, não consulta, não solta. */
  it("pendente sem protocolo é contado para olho humano, e nada mais", async () => {
    const a = ambiente({ pendentesDoLivro: [linha({ protocolo: null })] });
    const r = await a.reconciliar(t, agora);

    expect(r.semProtocolo).toBe(1);
    expect(r.olhados).toBe(0);
    expect(a.consultados).toEqual([]);
    expect(a.soltos).toEqual([]);
  });

  /* Novo demais: o callback ainda pode chegar, e consulta paga não responde nada que o webhook
   * não fosse responder de graça. */
  it("pendente recente não gasta consulta", async () => {
    const a = ambiente({
      pendentesDoLivro: [linha({ criadoEm: "2026-08-24T11:59:00-03:00" })],
    });
    const r = await a.reconciliar(t, agora);

    expect(r.aindaPendentes).toBe(1);
    expect(r.olhados).toBe(0);
    expect(a.consultados).toEqual([]);
  });

  /* A corrida normal entre webhook e reconciliação. `fechar` devolvendo `null` significa que o
   * callback fechou primeiro — não é erro, e não pode contar como emitido nem recusado. */
  it("callback que chegou primeiro não é contado duas vezes", async () => {
    const a = ambiente({
      pendentesDoLivro: [linha()],
      fecharDevolveNull: true,
      desfecho: {
        protocolo: "prot-1", situacao: "emitido", chave: "REC-9",
        pdfUrl: null, pdfExpiraEm: null, erro: null,
      },
    });
    const r = await a.reconciliar(t, agora);

    expect(r.olhados).toBe(1);
    expect(r.emitidos).toBe(0);
    expect(r.recusados).toBe(0);
  });

  it("nada pendente, nada a fazer", async () => {
    const a = ambiente({ pendentesDoLivro: [] });
    expect(await a.reconciliar(t, agora)).toEqual({
      olhados: 0, emitidos: 0, recusados: 0, aindaPendentes: 0, semProtocolo: 0,
    });
  });
});

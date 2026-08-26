/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * Uma regra, e ela vale mais que todas as outras deste arquivo: **de `pendente` não se cai para
 * o próximo canal.** É o caso em que a tela está travada, o cliente esperando, e tentar pelo
 * outro canal parece a coisa gentil a fazer — e é o caso em que fazer isso emite o mesmo recibo
 * duas vezes. Recibo duplicado se cancela um por um, em dez dias, e o paciente já viu os dois.
 *
 * O resto protege a mesma coisa por outros ângulos: `pendente` conta como resolvido para quem
 * pergunta "posso emitir?", e o vencimento do `pendente` chama a RECONCILIAÇÃO, nunca a recusa.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import {
  MINUTOS_ATE_RECONCILIAR, estaResolvido, pdfDisponivel, podeTentarOutroCanal,
  precisaDeOlhoHumano, precisaReconciliar, type ReciboEmitido, type SituacaoDoRecibo,
} from "./recibo-unitario";

const recibo = (over: Partial<ReciboEmitido> = {}): ReciboEmitido => ({
  id: "r1",
  canal: "automacao",
  situacao: "pendente",
  protocolo: "prot-1",
  chave: null,
  pdfUrl: null,
  pdfExpiraEm: null,
  comprovanteCaminho: null,
  erro: null,
  criadoEm: "2026-08-23T12:00:00-03:00",
  emitidoEm: null,
  ...over,
});

const TODAS: SituacaoDoRecibo[] = ["pendente", "emitido", "recusado", "cancelado"];

describe("podeTentarOutroCanal", () => {
  /* ★ O TESTE QUE JUSTIFICA A FUNÇÃO EXISTIR. */
  it("só libera outro canal quando o anterior RECUSOU", () => {
    const liberados = TODAS.filter((situacao) => podeTentarOutroCanal({ situacao }));
    expect(liberados).toEqual(["recusado"]);
  });

  /* ⚠️ `pendente` é ignorância, não espera. Cair daqui duplica o documento. */
  it("não libera a partir de `pendente`, que é onde a tentação mora", () => {
    expect(podeTentarOutroCanal(recibo({ situacao: "pendente" }))).toBe(false);
  });

  /* Cancelado existiu. Emitir de novo em cima seria um segundo recibo, não uma correção. */
  it("não libera a partir de `cancelado`", () => {
    expect(podeTentarOutroCanal(recibo({ situacao: "cancelado" }))).toBe(false);
  });
});

describe("estaResolvido", () => {
  it("trata `pendente` como resolvido — ninguém emite em cima do que não se sabe", () => {
    expect(estaResolvido({ situacao: "pendente" })).toBe(true);
  });

  it("só `recusado` volta a ser emitível", () => {
    const naoResolvidos = TODAS.filter((situacao) => !estaResolvido({ situacao }));
    expect(naoResolvidos).toEqual(["recusado"]);
  });
});

describe("precisaReconciliar", () => {
  const nascimento = "2026-08-23T12:00:00-03:00";
  const depoisDe = (min: number) => new Date(Date.parse(nascimento) + min * 60_000);

  it(`chama a reconciliação a partir de ${MINUTOS_ATE_RECONCILIAR} minutos`, () => {
    const r = recibo({ criadoEm: nascimento });
    expect(precisaReconciliar(r, depoisDe(MINUTOS_ATE_RECONCILIAR - 1))).toBe(false);
    expect(precisaReconciliar(r, depoisDe(MINUTOS_ATE_RECONCILIAR))).toBe(true);
    expect(precisaReconciliar(r, depoisDe(120))).toBe(true);
  });

  /* Só `pendente` tem estado desconhecido. Reconciliar um emitido seria trabalho à toa; um
   * recusado já tem desfecho. */
  it("ignora tudo que não é `pendente`, por antigo que seja", () => {
    for (const situacao of TODAS.filter((s) => s !== "pendente")) {
      expect(precisaReconciliar(recibo({ situacao, criadoEm: nascimento }), depoisDe(9999))).toBe(false);
    }
  });

  /* Data ilegível não pode virar "vencido": um `criadoEm` torto chamaria reconciliação em loop
   * sobre a mesma linha, e o canal cobra por consulta. */
  it("data ilegível não vira vencimento", () => {
    expect(precisaReconciliar(recibo({ criadoEm: "ontem" }), depoisDe(9999))).toBe(false);
  });
});

describe("pdfDisponivel", () => {
  const agora = new Date("2026-08-23T15:00:00-03:00");
  const sem = { pdfUrl: null, pdfExpiraEm: null, comprovanteCaminho: null };

  it("sem URL e sem cópia, não há PDF", () => {
    expect(pdfDisponivel(sem, agora)).toBe(false);
  });

  /* ⚠️ O botão tem que DESAPARECER, não dar 404: link morto numa tela fiscal faz o dono achar
   * que perdeu o documento — e ele está no e-CAC dele, intacto. */
  it("URL expirada não está disponível", () => {
    expect(pdfDisponivel(
      { ...sem, pdfUrl: "https://x/recibo.pdf", pdfExpiraEm: "2026-08-23T14:59:00-03:00" },
      agora,
    )).toBe(false);
  });

  it("URL dentro do prazo está disponível", () => {
    expect(pdfDisponivel(
      { ...sem, pdfUrl: "https://x/recibo.pdf", pdfExpiraEm: "2026-08-25T00:00:00-03:00" },
      agora,
    )).toBe(true);
  });

  /* Sem prazo declarado, vale o que temos. O canal que não informa validade não deveria fazer a
   * tela esconder um link que funciona. */
  it("sem prazo declarado, assume disponível", () => {
    expect(pdfDisponivel({ ...sem, pdfUrl: "https://x/recibo.pdf" }, agora)).toBe(true);
  });

  /* ★ ESTES DOIS SÃO O PONTO DA MIGRAÇÃO 023. A URL do canal vale CINCO MINUTOS: quando a dona
   * abre a tela, ela já venceu. Se `pdfDisponivel` dependesse só dela, o botão nunca apareceria
   * — e o PDF oficial é a única coisa que o canal pago entrega e o lote CSV não. */
  it("a nossa cópia vale mesmo com a URL do canal vencida", () => {
    expect(pdfDisponivel({
      pdfUrl: "https://s3/presigned?X-Amz-Expires=300",
      pdfExpiraEm: "2026-08-23T14:00:00-03:00",
      comprovanteCaminho: "t1/1042.pdf",
    }, agora)).toBe(true);
  });

  it("a cópia vale sem URL nenhuma — é ela que sobrevive", () => {
    expect(pdfDisponivel({ ...sem, comprovanteCaminho: "t1/1042.pdf" }, agora)).toBe(true);
  });
});

describe("precisaDeOlhoHumano", () => {
  /* ★ `pendente` SEM PROTOCOLO é o estado que o processo morrendo no meio produz. Não há o que
   * perguntar ao canal, e as duas saídas automáticas são as duas erradas — ver a função. */
  it("pendente sem protocolo é irreconciliável e tem que aparecer", () => {
    expect(precisaDeOlhoHumano(recibo({ situacao: "pendente", protocolo: null }))).toBe(true);
  });

  it("pendente COM protocolo resolve-se sozinho, pela reconciliação", () => {
    expect(precisaDeOlhoHumano(recibo({ situacao: "pendente", protocolo: "prot-1" }))).toBe(false);
  });

  /* Sem protocolo mas já com desfecho não é problema: alguém fechou a linha por outro caminho,
   * e o que importa é o desfecho existir. */
  it("desfecho já gravado dispensa olho humano, mesmo sem protocolo", () => {
    for (const situacao of TODAS.filter((s) => s !== "pendente")) {
      expect(precisaDeOlhoHumano(recibo({ situacao, protocolo: null }))).toBe(false);
    }
  });
});

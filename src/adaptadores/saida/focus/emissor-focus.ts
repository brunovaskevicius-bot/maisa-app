/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a Focus NFe cumprindo a porta `EmissorFiscal`. ⚠️ SÓ SERVIDOR.
 *
 * Aqui mora a tradução do vocabulário da prefeitura para o nosso:
 * "processando_autorizacao" → "processando", "erro_autorizacao" → "erro". O núcleo
 * nunca vê uma string da Focus.
 *
 * Três modos, e a diferença importa:
 *   • sem FOCUS_NFE_TOKEN              → `simulado` — fluxo inteiro, nada real
 *   • token, mas faltando dado fiscal  → `NaoConfigurado` — não arrisca emitir errado
 *   • token + dados completos          → emissão de verdade (homologação ou produção)
 * ────────────────────────────────────────────────────────────────────────────── */

import type { EmissorFiscal } from "@/nucleo/portas/saida/emissor-fiscal";
import type { ResultadoDeNota } from "@/nucleo/dominio/fiscal";
import { FalhaDoProvedor, NaoConfigurado } from "@/nucleo/dominio/erros";
import { soDigitos } from "@/nucleo/dominio/clientes";
import { NF_CONFIG, focusFaltando, isFocusConfigured } from "./config";
import { cancelarNfse, consultarNfse, emitirNfse, normalizarStatus } from "./focus";

const JUSTIFICATIVA_PADRAO =
  "Cancelamento automatico de nota emitida para teste de integracao MAISA.";

/** Erros da Focus (ou da prefeitura) no formato que a UI já sabe mostrar. */
const errosDe = (data: any, padrao: string) =>
  data?.erros ?? [{ mensagem: data?.mensagem ?? padrao }];

export const emissorFocus: EmissorFiscal = {
  get configurado() {
    return isFocusConfigured;
  },
  get simulado() {
    return !NF_CONFIG.token;
  },
  get ambiente() {
    return NF_CONFIG.ambiente;
  },
  faltando: focusFaltando,

  async emitir(_t, p): Promise<ResultadoDeNota> {
    if (!NF_CONFIG.token) return { status: "simulado", ref: p.ref };
    if (!isFocusConfigured) throw new NaoConfigurado(focusFaltando());

    // Log da config EFETIVA (sem segredos) — aparece nos logs da Vercel para conferir
    // rápido que ambiente/item/cnpj estão exatamente como esperado, sem aspas nem espaço.
    console.log("[nf/emitir] config efetiva", {
      ref: p.ref,
      ambiente: NF_CONFIG.ambiente,
      prestador_cnpj: NF_CONFIG.prestador.cnpj,
      prestador_im: NF_CONFIG.prestador.inscricaoMunicipal,
      codigo_municipio: NF_CONFIG.prestador.codigoMunicipio,
      item_lista_servico: NF_CONFIG.servico.itemListaServico,
      tomador_doc: soDigitos(p.tomador.cnpj || p.tomador.cpf),
    });

    let httpStatus: number;
    let data: any;
    try {
      ({ httpStatus, data } = await emitirNfse({
        ref: p.ref,
        valorServicos: p.valor,
        discriminacao: p.discriminacao,
        tomador: {
          cpf: p.tomador.cpf,
          cnpj: p.tomador.cnpj,
          razaoSocial: p.tomador.nome,
          email: p.tomador.email,
          telefone: p.tomador.telefone,
        },
      }));
    } catch (e) {
      console.error("[nf/emitir] erro de conexão com a Focus", { ref: p.ref, erro: String(e) });
      throw new FalhaDoProvedor("Erro de conexão com a Focus NFe.", e);
    }

    if (data?.status === "autorizado") {
      return {
        status: "autorizado",
        ref: p.ref,
        numero: data.numero,
        url: data.url,
        pdf: data.url_danfse,
        xml: data.caminho_xml_nota_fiscal,
      };
    }
    // 202 accepted / processando_autorizacao → assíncrono, quem pediu faz polling.
    if (httpStatus === 202 || data?.status === "processando_autorizacao") {
      return { status: "processando", ref: p.ref };
    }

    console.error("[nf/emitir] Focus rejeitou (síncrono)", {
      ref: p.ref, httpStatus, status: data?.status, erros: data?.erros ?? data?.mensagem,
    });
    return { status: "erro", ref: p.ref, erros: errosDe(data, "Falha ao emitir a NFS-e.") };
  },

  async consultar(_t, ref): Promise<ResultadoDeNota> {
    if (!NF_CONFIG.token) return { status: "simulado", ref };

    let data: any;
    try {
      ({ data } = await consultarNfse(ref));
    } catch (e) {
      throw new FalhaDoProvedor("Erro ao consultar a Focus NFe.", e);
    }

    const status = normalizarStatus(data?.status);
    // A rejeição fiscal da prefeitura (ex.: "Código de Serviço inexistente") chega AQUI,
    // no status assíncrono — nunca na resposta da emissão.
    if (status === "erro") {
      console.error("[nf/status] erro_autorizacao da prefeitura", {
        ref, focusStatus: data?.status, erros: data?.erros,
      });
    }
    return {
      status,
      ref,
      numero: data?.numero,
      url: data?.url,
      pdf: data?.url_danfse,
      xml: data?.caminho_xml_nota_fiscal,
      erros: data?.erros,
    };
  },

  async cancelar(_t, ref, justificativa): Promise<ResultadoDeNota> {
    // Sem token → cancelamento simulado (fluxo validado, sessão exigida mesmo assim).
    if (!NF_CONFIG.token) return { status: "cancelado", ref };

    let data: any;
    try {
      ({ data } = await cancelarNfse(ref, justificativa || JUSTIFICATIVA_PADRAO));
    } catch (e) {
      throw new FalhaDoProvedor("Erro de conexão ao cancelar a NFS-e.", e);
    }

    if (data?.status === "cancelado") return { status: "cancelado", ref };
    return { status: "erro", ref, erros: errosDe(data, "Falha ao cancelar a NFS-e.") };
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — nota fiscal de serviço.
 *
 * Emitir é assíncrono por natureza: a prefeitura devolve "processando" e o número sai
 * depois. Por isso são três casos de uso e não um — quem pede acompanha por `consultar`
 * até virar autorizado, cancelado ou erro.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { CancelarNota, ConsultarNota, EmitirNota } from "../portas/entrada/casos-de-uso";
import type { EmissorFiscal } from "../portas/saida/emissor-fiscal";
import type { RepositorioFiscal } from "../portas/saida/repositorio-fiscal";
import { DadoInvalido } from "../dominio/erros";

export type DepsNota = {
  emissor: EmissorFiscal;
  /**
   * ⚠️ ENTROU EM 17/08/2026, e é o que faz a nota sair no CNPJ CERTO.
   *
   * Antes o emissor lia o prestador de variável de ambiente — uma resposta só, global. Com
   * dois clientes no ar, isso não é "configuração incompleta": é a nota de um saindo no
   * CNPJ do outro. Quem lê o banco é o caso de uso, e é por isso que a configuração é
   * argumento dos três verbos do emissor.
   */
  fiscal: RepositorioFiscal;
  /** Injetado para o núcleo não depender de `crypto` — e para dar teste determinístico. */
  novoId: () => string;
};

export function criarEmitirNota({ emissor, fiscal, novoId }: DepsNota): EmitirNota {
  return async (t, p) => {
    const doc = p.tomador.cpf || p.tomador.cnpj;
    if (!p.valor || !p.discriminacao.trim() || !doc) {
      throw new DadoInvalido("Faltam valor, discriminação ou documento do tomador.");
    }

    /* A `ref` é a chave da nota no emissor, e é cunhada AQUI — nunca recebida de fora.
     * Ela precisa ser única por emissão (a Focus recusa ref repetida) e reconhecível nos
     * relatórios do provedor, daí o prefixo e a origem no meio. */
    const semente = String(p.origem ?? "nf").replace(/[^a-zA-Z0-9]/g, "");
    const ref = `maisa-${semente}-${novoId().slice(0, 8)}`;

    return emissor.emitir(t, await fiscal.ler(t), {
      ref,
      valor: p.valor,
      discriminacao: p.discriminacao.trim(),
      tomador: p.tomador,
    });
  };
}

export function criarConsultarNota({ emissor, fiscal }: Pick<DepsNota, "emissor" | "fiscal">): ConsultarNota {
  return async (t, ref) => {
    if (!ref) throw new DadoInvalido("ref ausente.", "ref");
    return emissor.consultar(t, await fiscal.ler(t), ref);
  };
}

export function criarCancelarNota({ emissor, fiscal }: Pick<DepsNota, "emissor" | "fiscal">): CancelarNota {
  return async (t, p) => {
    if (!p.ref.trim()) throw new DadoInvalido("ref ausente.", "ref");
    return emissor.cancelar(t, await fiscal.ler(t), p.ref.trim(), p.justificativa);
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — nota fiscal de serviço.
 *
 * Emitir é assíncrono por natureza: a prefeitura devolve "processando" e o número sai
 * depois. Por isso são três casos de uso e não um — quem pede acompanha por `consultar`
 * até virar autorizado, cancelado ou erro.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { CancelarNota, ConsultarNota, EmitirNota } from "../portas/entrada/casos-de-uso";
import type { EmissorFiscal } from "../portas/saida/emissor-fiscal";
import { DadoInvalido } from "../dominio/erros";

export type DepsNota = {
  emissor: EmissorFiscal;
  /** Injetado para o núcleo não depender de `crypto` — e para dar teste determinístico. */
  novoId: () => string;
};

export function criarEmitirNota({ emissor, novoId }: DepsNota): EmitirNota {
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

    return emissor.emitir(t, {
      ref,
      valor: p.valor,
      discriminacao: p.discriminacao.trim(),
      tomador: p.tomador,
    });
  };
}

export function criarConsultarNota({ emissor }: Pick<DepsNota, "emissor">): ConsultarNota {
  return async (t, ref) => {
    if (!ref) throw new DadoInvalido("ref ausente.", "ref");
    return emissor.consultar(t, ref);
  };
}

export function criarCancelarNota({ emissor }: Pick<DepsNota, "emissor">): CancelarNota {
  return async (t, p) => {
    if (!p.ref.trim()) throw new DadoInvalido("ref ausente.", "ref");
    return emissor.cancelar(t, p.ref.trim(), p.justificativa);
  };
}

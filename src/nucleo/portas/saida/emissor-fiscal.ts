/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o emissor de nota fiscal de serviço.
 *
 * Quem implementa hoje é `adaptadores/saida/focus` (Focus NFe → NFS-e municipal).
 * O núcleo não sabe o que é "item_lista_servico" nem "optante_simples_nacional":
 * isso é vocabulário de prefeitura, e mora inteiro dentro do adaptador.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { PedidoDeNota, ResultadoDeNota } from "../../dominio/fiscal";

export interface EmissorFiscal {
  /** Falso quando falta token ou dado fiscal — a UI mostra o que falta em vez de tentar. */
  readonly configurado: boolean;
  /** Nomes das variáveis que faltam, para a mensagem ser específica. */
  faltando(): string[];
  /** Sem token de emissor a emissão roda em modo simulado — fluxo completo, nada real. */
  readonly simulado: boolean;
  /** "producao" | "homologacao" — a UI avisa quando a nota é de verdade. */
  readonly ambiente: string;

  emitir(t: ContextoTenant, p: PedidoDeNota): Promise<ResultadoDeNota>;
  consultar(t: ContextoTenant, ref: string): Promise<ResultadoDeNota>;
  cancelar(t: ContextoTenant, ref: string, justificativa?: string): Promise<ResultadoDeNota>;
}

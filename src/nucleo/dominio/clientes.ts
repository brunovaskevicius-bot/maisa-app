/* ─────────────────────────────────────────────────────────────────────────────
 * CLIENTES — quem é atendido.
 *
 * O `telefone` vai ganhar peso: é por ele que o agente de WhatsApp vai reconhecer
 * quem está falando ("+55 11 98123-4567" → cl1) antes de mexer na agenda. Hoje
 * ninguém depende disso, mas é o motivo de o campo ser obrigatório.
 * ────────────────────────────────────────────────────────────────────────────── */

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
  canal: "Online" | "Presencial";
  ativo: boolean;
  desde: string;
  servicoId: string;
  /** Atendimentos fechados na competência corrente. */
  atendimentos: number;
  /** Valor fechado na competência — base da nota fiscal. */
  valor: number;
  /**
   * Cliente que existe só para validar a integração fiscal em produção.
   * A NFS-e só autoriza de verdade em produção, então testar exige emitir uma
   * nota real — e uma nota real de teste não pode ficar de pé. Marcar `teste`
   * faz o store cancelar automaticamente logo após a autorização, de forma que
   * nunca sobra nota órfã.
   */
  teste?: boolean;
};

/** Só dígitos, do jeito que o WhatsApp e a prefeitura gostam. */
export const soDigitos = (v?: string | null) => (v ?? "").replace(/\D/g, "");

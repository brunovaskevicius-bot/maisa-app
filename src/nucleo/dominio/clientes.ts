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

/**
 * O caminho de volta: dígitos → "(11) 98123-4567".
 *
 * Existe por causa de quem manda mensagem e não está no cadastro. Uma conversa de WhatsApp
 * de número desconhecido tem que aparecer na lista com ALGUMA coisa no lugar do nome, e o
 * telefone cru ("5511981234567") é a única informação verdadeira que temos dela — mas escrito
 * assim é uma senha, não um contato. Nome inventado ("Cliente #4") seria pior: some a única
 * pista que o dono tem de quem é a pessoa.
 *
 * O DDI 55 é retirado da exibição por ser ruído: todo mundo aqui tem o mesmo. Número que não
 * tem cara de brasileiro volta como veio — melhor um formato feio que um recorte errado.
 */
export function telefoneBonito(v?: string | null): string {
  const d = soDigitos(v);
  const nacional = d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
  if (nacional.length === 11) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 7)}-${nacional.slice(7)}`;
  if (nacional.length === 10) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  // 8 dígitos é a `telefone_chave`: sem DDD, então nada de parênteses vazios.
  if (nacional.length === 8 || nacional.length === 9) {
    return `${nacional.slice(0, nacional.length - 4)}-${nacional.slice(-4)}`;
  }
  return d;
}

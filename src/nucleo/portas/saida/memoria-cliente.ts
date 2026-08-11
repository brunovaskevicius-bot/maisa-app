/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — onde a memória do cliente fica guardada.
 *
 * Duas portas, e é de propósito que sejam duas: **memória** é o perfil que atravessa
 * conversas (nome, favoritos), **histórico** é o texto da conversa corrente. Elas têm
 * ciclos de vida opostos — o perfil dura anos e é minúsculo, a thread dura horas e
 * cresce a cada mensagem — e vão terminar em tabelas com políticas de retenção
 * diferentes (a LGPD pede que a thread expire; o perfil o cliente pode querer que
 * fique). Uma interface só forçaria os dois a envelhecer juntos.
 *
 * ⚠️ Note o que o histórico NÃO fala: bloco de tool_use, id de mensagem do provedor,
 * papel de "assistant". Ele fala `Msg` — o tipo que a tela de Conversas já usa. Se a
 * porta falasse a língua do modelo, trocar de modelo (ou de canal) viraria migração
 * de banco, e o núcleo passaria a conhecer um detalhe da Anthropic.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { MemoriaCliente } from "../../dominio/memoria";
import type { Msg } from "../../dominio/conversas";

export interface RepositorioMemoria {
  /** `null` quando é a primeira vez que este número aparece. */
  ler(t: ContextoTenant, telefone: string): Promise<MemoriaCliente | null>;
  gravar(t: ContextoTenant, m: MemoriaCliente): Promise<void>;
}

export interface RepositorioHistorico {
  /**
   * As últimas mensagens desta conversa, mais antiga primeiro.
   *
   * `limite` existe porque quem chama paga por token: o agente manda o histórico
   * inteiro ao modelo a cada mensagem recebida, então uma conversa de 300 turnos
   * sem teto custaria mais que o atendimento vale.
   */
  ler(t: ContextoTenant, telefone: string, limite: number): Promise<Msg[]>;

  /** Acrescenta ao fim. Nunca reescreve o passado — thread é log, não estado. */
  anexar(t: ContextoTenant, telefone: string, msgs: Msg[]): Promise<void>;
}

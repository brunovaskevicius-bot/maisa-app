/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — por onde a MAISA FALA.
 *
 * Existe separada do adaptador de entrada porque responder não é o único caso de uso
 * de mandar mensagem: o lembrete de 3h antes e a cobrança de confirmação partem de
 * uma rotina, sem ninguém do outro lado tendo escrito nada. Se "enviar" morasse
 * dentro do webhook, o lembrete não teria como existir sem simular uma mensagem
 * recebida.
 *
 * Fala em LISTA de textos, não em texto: no WhatsApp cada item é uma bolha, e o
 * intervalo entre elas é o que faz a conversa parecer conversa. Quem implementa
 * decide o intervalo — é característica do canal, não do domínio.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";

export interface CanalDeMensagens {
  /** Envia na ordem. Uma falha no meio não desfaz as anteriores — não há transação
   *  em cima de mensagem entregue, e finge-la seria pior que assumir isso. */
  enviar(t: ContextoTenant, para: string, textos: string[]): Promise<void>;

  /** Chama o dono para assumir a conversa. Hoje é uma linha na fila do painel; um dia
   *  é um push. O agente precisa poder desistir — ver `chamar_humano`. */
  escalar(t: ContextoTenant, p: { telefone: string; motivo: string }): Promise<void>;
}

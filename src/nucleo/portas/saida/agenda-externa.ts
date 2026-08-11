/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — a agenda externa do negócio.
 *
 * O que o núcleo precisa de um calendário, dito sem falar de Google: listar uma
 * janela, procurar por marca, criar, remarcar, cancelar. Quem implementa hoje é
 * `adaptadores/saida/google`; se amanhã um cliente usar Outlook, entra outro
 * adaptador e nenhum caso de uso muda.
 *
 * ⚠️ Nenhum método recebe token. Autenticação é problema do adaptador: ele recebe o
 * ContextoAgenda (quem, qual agenda) e resolve o token sozinho. Antes o token era
 * lido na rota e passado adiante, o que obrigava toda rota nova a lembrar do passo.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoAgenda, ContextoTenant } from "../../dominio/tenant";
import type { AtendimentoMarcado, EventoCriado, EventoDeAgenda } from "../../dominio/agenda";
import type { Janela } from "../../dominio/tempo";

/** O que se manda criar. Instantes já resolvidos — o domínio faz a conta, não o adaptador. */
export type NovoEventoExterno = {
  /** ISO com offset, ex.: "2026-08-07T14:30:00-03:00". */
  inicio: string;
  fim: string;
  /** Duração em minutos. Redundante com inicio/fim, e gravada junto de propósito:
   *  é o que o app lê de volta sem ter que refazer a conta a cada leitura. */
  duracaoMin: number;
  titulo: string;
  descricao?: string;
  /** Convidados. Explícito: o padrão é NÃO convidar ninguém. */
  emails?: string[];
  /** Gera link de videochamada. */
  comMeet?: boolean;
  /**
   * O atendimento que este evento representa. O adaptador GRAVA isto de volta no
   * provedor (no Google, em `extendedProperties.private`) e é o que faz o evento
   * voltar da leitura como atendimento, e não como compromisso pessoal.
   *
   * A porta fala em `AtendimentoMarcado`, não em `Record<string,string>`: o formato
   * das chaves é problema de quem armazena.
   */
  atendimento: AtendimentoMarcado;
};

export interface AgendaExterna {
  listar(ctx: ContextoAgenda, janela: Janela): Promise<EventoDeAgenda[]>;

  /**
   * O evento deste atendimento, se ele já existir. É a metade do servidor da criação
   * idempotente: cobre o POST que CHEGOU ao provedor, criou o evento e perdeu a
   * resposta na volta.
   *
   * `perto` é um instante ISO — a busca varre alguns dias em torno dele em vez da
   * agenda inteira.
   */
  buscarPorAtendimento(ctx: ContextoAgenda, p: { ag: string; perto: string }): Promise<EventoDeAgenda | null>;

  criar(ctx: ContextoAgenda, ev: NovoEventoExterno): Promise<EventoCriado>;

  remarcar(ctx: ContextoAgenda, p: { eventoId: string; inicio: string; fim: string }): Promise<void>;

  cancelar(ctx: ContextoAgenda, p: { eventoId: string }): Promise<void>;
}

/* ───────────────────────────── conexão ─────────────────────────────
 * Operar a agenda e GERIR a conexão com ela são coisas diferentes, e por isso são
 * portas diferentes: a tela de ajustes conecta e desconecta sem nunca criar evento,
 * e o agente de WhatsApp vai criar evento sem nunca conectar nada. */

export type Conexao = { profissionalId: string; googleEmail: string };

export interface ConexoesDeAgenda {
  /** Quem já conectou. Nunca devolve token, nem cifrado. */
  listar(t: ContextoTenant): Promise<Conexao[]>;
  /** Revoga no provedor E apaga a conexão. Devolve se a revogação foi aceita. */
  desconectar(ctx: ContextoAgenda): Promise<{ revogado: boolean }>;
}

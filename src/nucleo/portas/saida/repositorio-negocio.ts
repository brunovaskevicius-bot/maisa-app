/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o cadastro do negócio.
 *
 * Quem é o profissional, quanto custa o serviço, qual o telefone do cliente. Hoje
 * responde `adaptadores/saida/demo` (fixtures em memória, um negócio só); amanhã
 * responde o Supabase, filtrando por inquilino.
 *
 * ⚠️ TODO método recebe ContextoTenant, mesmo que o adaptador de demonstração ignore.
 * É a costura multi-tenant: o dia em que o banco entrar, a assinatura já está certa e
 * não existe caso de uso lendo cadastro sem dizer de quem.
 *
 * Assíncrono mesmo lendo de um array: um repositório que hoje é síncrono e amanhã bate
 * no banco quebraria toda a cadeia de chamadas na migração.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { Negocio } from "../../dominio/negocio";
import type { Profissional, Servico } from "../../dominio/catalogo";
import type { Cliente } from "../../dominio/clientes";
import type { Expediente } from "../../dominio/expediente";

export interface RepositorioNegocio {
  negocio(t: ContextoTenant): Promise<Negocio>;

  profissional(t: ContextoTenant, id: string): Promise<Profissional | null>;
  servico(t: ContextoTenant, id: string): Promise<Servico | null>;
  cliente(t: ContextoTenant, id: string): Promise<Cliente | null>;
  expediente(t: ContextoTenant, profissionalId: string): Promise<Expediente | null>;

  /**
   * As agendas que este inquilino pode operar — a allowlist.
   *
   * Existe porque `profissionalId` chega de fora (query string, corpo do POST e, em
   * breve, de um argumento escolhido por um modelo de linguagem). Sem allowlist, esse
   * campo vira escrita livre na coluna `profissional_id`.
   */
  agendasPermitidas(t: ContextoTenant): Promise<string[]>;

  /**
   * Quem o cliente é, a partir do telefone.
   *
   * Ainda não tem chamador: é a porta por onde o agente de WhatsApp vai reconhecer
   * quem está falando antes de mexer na agenda. Está aqui — e não numa interface
   * futura — porque é o adaptador de dados que precisa saber respondê-la, e escrever
   * a pergunta agora é o que garante que o banco nasça com índice no telefone.
   */
  clientePorTelefone(t: ContextoTenant, telefone: string): Promise<Cliente | null>;
}

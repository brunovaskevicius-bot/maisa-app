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

  /* ─────────────────── as listas ───────────────────
   * "Quem é o profissional X" serve aos casos de uso; "quem são os profissionais" serve
   * às TELAS — a grade da Agenda monta uma coluna por pessoa, o catálogo lista serviços,
   * o select do rascunho lista clientes. É leitura de cadastro igual às de cima, e por
   * isso mora na mesma porta em vez de virar um segundo repositório.
   *
   * Estão aqui, e não como funções soltas do adaptador Supabase, por uma razão concreta:
   * enquanto elas fizerem parte da porta, o adaptador demo TAMBÉM tem que respondê-las —
   * e é isso que mantém o app inteiro de pé num ambiente sem banco, que é onde se afina
   * a MAISA por `curl`. Uma função só do adaptador real teria matado o modo demo em
   * silêncio, e o sintoma seria a Agenda abrir sem nenhuma coluna. */

  profissionais(t: ContextoTenant): Promise<Profissional[]>;
  servicos(t: ContextoTenant): Promise<Servico[]>;
  clientes(t: ContextoTenant): Promise<Cliente[]>;

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
   * É a porta por onde o agente de WhatsApp reconhece quem está falando antes de mexer
   * na agenda. Está aqui — e não numa interface futura — porque é o adaptador de dados
   * que precisa saber respondê-la, e escrever a pergunta agora é o que garante que o
   * banco nasça com índice no telefone.
   */
  clientePorTelefone(t: ContextoTenant, telefone: string): Promise<Cliente | null>;

  /**
   * O ÚNICO método de escrita desta porta: acha o cliente por telefone ou cria.
   *
   * ⚠️ Ele quebra a simetria do arquivo (todo o resto aqui é leitura), então o motivo
   * precisa estar escrito: sem ele, quem marca pelo WhatsApp nunca entra no cadastro.
   * O agente identificava o desconhecido como `lead:<telefone>` — uma string que o
   * `PARECE_UUID` do adaptador Supabase recusa de propósito, e que portanto nunca ia
   * resolver em cliente nenhum. O efeito era duplo e invisível: a tela de Clientes não
   * crescia com o canal que mais traz gente, e `atendimentos.cliente_id` ficava nulo —
   * então `v_clientes.valor` somava zero e o faturamento do mês não fechava.
   *
   * Mora nesta porta, e não numa porta de escrita nova, porque é o MESMO agregado das
   * leituras acima (`cliente`, `clientes`, `clientePorTelefone`): criar um cliente é
   * cadastro. Uma segunda porta só para isto obrigaria os dois adaptadores a implementar
   * duas interfaces para falar da mesma tabela.
   *
   * ⚠️ CONTRATO — `telefone` é obrigatório e é a chave de deduplicação. Chamar sem ele
   * criaria um cliente novo a cada mensagem da mesma pessoa. Quem não tem telefone não
   * chama este método: passa `clienteId: null` no espelho e deixa o snapshot preservar
   * nome e telefone (é para isso que as colunas `cliente_nome`/`cliente_tel` existem).
   *
   * Devolve o cliente EXISTENTE quando o telefone já casa — nunca duplica, e nunca
   * sobrescreve um nome que o dono digitou à mão com o que o modelo entendeu de uma
   * frase solta.
   */
  garantirCliente(t: ContextoTenant, p: { nome: string; telefone: string }): Promise<Cliente | null>;
}

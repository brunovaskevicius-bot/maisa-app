/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o caderno de nomes, e de quem é o número pareado.
 *
 * ── POR QUE É PORTA PRÓPRIA, E NÃO UM MÉTODO DO `RepositorioNegocio` ──
 *
 * Porque o caderno tem um leitor que o cadastro não tem: **o agente, no caminho quente de
 * cada mensagem**, e antes do primeiro token. Pendurá-lo no repositório de cadastro faria o
 * webhook carregar um objeto que sabe serviço, profissional e cliente para responder uma
 * pergunta de uma linha ("posso falar com este número?"). E o adaptador de demonstração,
 * que hoje responde cadastro com quatro arrays, teria que fingir conhecer uma agenda de
 * contatos de celular.
 *
 * ⚠️ E O MOTIVO MAIS FORTE: `clientes` e `contatos` NÃO SÃO A MESMA COISA, e o dia em que
 * alguém puser os dois no mesmo repositório é o dia em que um `INSERT` de importação cai em
 * `clientes`. Aquela tabela alimenta `v_clientes.valor`, que é a base da nota fiscal.
 * Medido: a agenda do Bruno tem 374 contatos com telefone; nenhum deles marcou nada.
 *
 * ── O QUE ESTA PORTA NÃO FAZ ──
 *
 * Não lê a agenda do provedor — isso é `ContatosDoCanal`, ao lado. Aqui é só o que já é
 * nosso. A separação existe porque as duas falham por motivos independentes: a Evolution
 * pode estar fora do ar com o banco de pé, e é justamente aí que a MAISA precisa continuar
 * decidindo quem atender com o caderno que já tem.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { Contato, ModoDoNumero } from "../../dominio/contatos";

/** Uma linha para gravar. `chave` é o que `dominio/contatos.chaveDe` produz. */
export type RascunhoDeContato = {
  chave: string;
  nome: string | null;
  telefone: string | null;
};

export interface RepositorioContatos {
  /**
   * Este número está no caderno?
   *
   * ⚠️ É O CAMINHO QUENTE. Chamado uma vez por mensagem recebida, antes de decidir se a
   * MAISA fala. Quem implementa consulta por chave primária `(tenant_id, telefone_chave)` —
   * varredura aqui é latência no meio de uma conversa.
   *
   * `null` quando não está. Quem chama trata isso como "não conheço esta pessoa", que no
   * modo pessoal significa ATENDER (é o lead) — ver `podeResponder`.
   */
  ler(t: ContextoTenant, chave: string): Promise<Contato | null>;

  /** O caderno inteiro, para a tela. */
  listar(t: ContextoTenant): Promise<Contato[]>;

  /**
   * Grava o lote importado. **Idempotente por `(tenant, chave)`** — reimportar não duplica.
   *
   * ⚠️ NÃO PODE APAGAR O QUE FOI DECIDIDO À MÃO. Quem já foi marcado como cliente (ou como
   * não-cliente) continua marcado depois de uma reimportação: o dono trocou de celular, a
   * agenda voltou com 400 nomes, e perder as marcações faria a MAISA voltar a calar para os
   * clientes dele. Quem implementa faz upsert só de `nome`/`telefone`, nunca de `cliente`.
   *
   * Devolve quantas linhas entraram novas — é o número que a tela mostra.
   */
  salvarLote(t: ContextoTenant, contatos: readonly RascunhoDeContato[]): Promise<{ novos: number; total: number }>;

  /**
   * O dono disse se esta pessoa é cliente.
   *
   * `cliente: null` volta ao estado "nunca disse". Existe porque desmarcar tem que ser
   * possível, e porque `false` significa outra coisa (ver `Contato.cliente`).
   *
   * Cria a linha se ela não existir: o dono pode marcar alguém que escreveu e não estava na
   * agenda importada — que é o caso mais comum de todos.
   */
  marcar(t: ContextoTenant, p: { chave: string; nome?: string | null; telefone?: string | null; cliente: boolean | null }): Promise<void>;

  /**
   * De quem é o número pareado. `null` quando não há canal — e aí não há mensagem chegando.
   *
   * Mora nesta porta, e não em `RepositorioCanal`, porque quem pergunta é o mesmo lugar que
   * pergunta pelo contato: o agente, no mesmo instante, para tomar UMA decisão. Duas portas
   * para as duas metades da mesma pergunta seriam dois round-trips no caminho quente.
   */
  modo(t: ContextoTenant): Promise<ModoDoNumero | null>;

  /** Troca o modo. É decisão de dono, feita uma vez, no pareamento. */
  definirModo(t: ContextoTenant, modo: ModoDoNumero): Promise<void>;
}

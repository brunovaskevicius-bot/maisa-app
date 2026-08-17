/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — a agenda de contatos que o PROVEDOR conhece.
 *
 * Uma capacidade só: pedir ao provedor de WhatsApp a lista de contatos daquela instância.
 * Não grava nada e não decide nada — quem guarda é `RepositorioContatos`, quem decide quem a
 * MAISA atende é `dominio/contatos.ts`.
 *
 * ── POR QUE O SERVIDOR LÊ, E NÃO O NAVEGADOR ──
 *
 * O desenho original era a Contact Picker API do navegador. Ela **só existe no Chrome do
 * Android**: o Safari do iPhone nunca a implementou, e metade do ICP usa iPhone. Lendo do
 * provedor, o mesmo código serve os dois — e o dono não precisa dar permissão de contatos
 * para um site.
 *
 * ── ⚠️ O QUE A MEDIÇÃO DISSE, E QUE MUDA O QUE SE PODE PROMETER ──
 *
 * Medido na Evolution do Bruno em 16/08/2026, `POST /chat/findContacts/{instancia}`:
 *
 *   1.840 entradas · 374 com telefone real · 1.113 `@lid` · 351 grupos · 2 especiais
 *
 * Ou seja **20% viram contato utilizável**. Os `@lid` são o endereçamento novo do WhatsApp,
 * que não carrega número — sem telefone não há como casar com quem escreve, e não há como
 * responder. Grupos saem fora por definição.
 *
 * Por isso o contrato desta porta é: **quem implementa já devolve só o que serve.** Filtrar
 * do lado de quem chama espalharia a regra do `@lid` por telas e casos de uso, e a primeira
 * cópia esquecida mostraria "1.840 contatos importados" para um dono que ganhou 374.
 *
 * `POST /chat/findChats` foi medido também e é fonte PIOR: 137 conversas, só 3 com telefone
 * real. Está escrito aqui para ninguém tentar de novo achando que "quem já conversou" é o
 * caminho óbvio.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";

/** Um contato como o provedor conhece — já filtrado e já normalizado. */
export type ContatoDoProvedor = {
  /** Telefone só com dígitos, como veio do provedor. Nunca vazio. */
  telefone: string;
  /** Como o dono salvou a pessoa. `null` quando o provedor não sabe o nome. */
  nome: string | null;
};

export interface ContatosDoCanal {
  /**
   * A agenda daquela instância, **só com o que dá para usar**: tem telefone e não é grupo.
   *
   * Lança quando o provedor recusa ou não está configurado — quem chama transforma em
   * mensagem de tela. Não devolve lista vazia para dizer "falhou": vazio significa agenda
   * vazia, e as duas coisas pedem frases diferentes na tela.
   */
  listar(t: ContextoTenant): Promise<ContatoDoProvedor[]>;

  /** O que falta configurar para isto funcionar. Vazio = dá para chamar. Nunca lança. */
  faltando(): string[];
}

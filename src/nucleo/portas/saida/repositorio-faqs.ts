/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — as respostas prontas do negócio.
 *
 * A tabela `faqs` existe desde `002_multitenant.sql` e passou meses sem ninguém ler: o
 * agente respondia dúvida com uma fixture de demonstração, a MESMA para todo inquilino. É
 * o quinto e último caso da família "o dono configura e o produto ignora" — depois de
 * `assistente`, `canal`, `horários` e o nome do negócio.
 *
 * ── A DECISÃO QUE ESTA PORTA ESCONDE ──
 *
 * `buscar` recebe um VETOR, não um texto. É deliberado: quem transforma pergunta em vetor
 * é o `GeradorDeEmbedding`, e o caso de uso junta os dois. Se esta porta recebesse texto,
 * ela teria que conhecer o provedor de embedding para poder comparar — e um repositório
 * que fala com a OpenAI é um repositório que não dá para trocar por um array em memória.
 *
 * O adaptador de demonstração é a prova disso: ele responde `buscar` com comparação de
 * cosseno em JavaScript sobre quatro fixtures, sem banco e sem rede. Se a porta recebesse
 * texto, o demo teria que chamar o Gemini para existir.
 *
 * ⚠️ TODO método recebe `ContextoTenant`, e aqui isso não é cerimônia: no caminho do
 * agente o cliente é service role e a RLS está DESLIGADA — o filtro por tenant no código é
 * a única barreira (ver `saida/supabase/contexto-cliente.ts`). Foi exatamente essa barreira
 * que faltou no Smiller, onde a busca de FAQ é global por padrão.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { Faq, FaqEncontrada } from "../../dominio/faq";

/** O que se grava. Sem `usos`: quem conta é o banco, não quem escreve. */
export type RascunhoDeFaq = {
  /** Ausente = criar. Presente = editar aquela linha, se ela for deste inquilino. */
  id?: string;
  pergunta: string;
  resposta: string;
  ativo?: boolean;
};

export interface RepositorioFaqs {
  /**
   * Todas as FAQs do inquilino, ativas e inativas, da mais usada para a menos.
   *
   * Inclui as inativas porque quem chama é a TELA de gestão — esconder uma linha que o
   * dono desligou faria o botão "desativar" parecer "apagar", e a próxima ação seria
   * cadastrar de novo o que já existe.
   */
  listar(t: ContextoTenant): Promise<Faq[]>;

  /**
   * Cria ou atualiza, e devolve a linha como ficou.
   *
   * ⚠️ `vetor` vem junto porque gravar a pergunta sem reindexar é o defeito que se paga
   * depois: a FAQ aparece na tela, o dono a considera pronta, e a busca nunca a encontra
   * porque o vetor ficou o da pergunta ANTIGA. Passá-lo aqui torna impossível salvar sem
   * decidir o que fazer com o índice.
   */
  salvar(t: ContextoTenant, rascunho: RascunhoDeFaq, vetor: number[]): Promise<Faq>;

  /** Apagar é apagar. FAQ não é histórico do negócio — para tirar do ar sem perder o
   *  texto existe o `ativo`, que é o que a tela oferece primeiro. */
  remover(t: ContextoTenant, id: string): Promise<void>;

  /**
   * As FAQs mais próximas do vetor, acima do corte de similaridade, da melhor para a pior.
   *
   * Devolve LISTA e não a melhor: o agente decide, com o texto da conversa na frente, se
   * a segunda colocada responde melhor — e uma lista vazia é uma resposta legítima, que
   * significa "o dono não cadastrou isso". Devolver sempre a menos distante faria o agente
   * responder qualquer coisa com fonte, que é pior que não responder.
   */
  buscar(t: ContextoTenant, vetor: number[], k?: number): Promise<FaqEncontrada[]>;

  /**
   * Marca que esta FAQ respondeu a alguém.
   *
   * `faqs.usos` nasceu com a tabela e nunca saiu de zero. É o que responde ao dono "qual
   * dúvida meus clientes mais têm" — e essa é a informação que vira serviço novo, preço
   * na tabela ou horário estendido. Falhar aqui NUNCA pode derrubar a resposta: é
   * estatística, não conversa.
   */
  registrarUso(t: ContextoTenant, id: string): Promise<void>;
}

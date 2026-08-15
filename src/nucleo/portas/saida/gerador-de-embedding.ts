/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — transformar texto em vetor.
 *
 * Uma capacidade só, e de propósito: dado um texto, devolva o ponto dele no espaço de
 * sentido. Quem decide o que fazer com o ponto é o caso de uso.
 *
 * ── POR QUE NÃO CABE EM `ModeloDeConversa` ──
 *
 * O provedor é o mesmo hoje (Gemini), e a tentação de juntar é real. Mas são contratos
 * diferentes em tudo que importa: um recebe histórico e ferramentas e devolve texto ou
 * uma chamada de função; o outro recebe uma string e devolve números. Preços diferentes,
 * limites de tamanho diferentes, e — o que decide — CICLOS DE TROCA diferentes: dá para
 * querer o Claude conversando e o Gemini indexando, e é uma escolha razoável, porque
 * embedding é commodity e conversa não é. Uma porta só obrigaria os dois a andarem juntos.
 *
 * ── ⚠️ ESTA PORTA NÃO RECEBE `ContextoTenant`, E É EXCEÇÃO CONSCIENTE ──
 *
 * Todas as outras portas de saída recebem — é a costura multi-tenant desta casa. Esta não,
 * porque não há nada de inquilino aqui: entra texto, sai vetor, nenhum dado é lido nem
 * escrito e não existe pergunta de "de quem é isso". Acrescentar o contexto só para manter
 * a simetria criaria um parâmetro que ninguém usa — e parâmetro ignorado ensina que o
 * contexto é decorativo, que é exatamente a lição errada neste repositório.
 *
 * O isolamento acontece um degrau acima: quem guarda e quem busca o vetor é o
 * `RepositorioFaqs`, e esse recebe contexto em todo método.
 * ────────────────────────────────────────────────────────────────────────────── */

export interface GeradorDeEmbedding {
  /**
   * O vetor do texto, JÁ NORMALIZADO e com `DIMENSOES_DO_VETOR` posições.
   *
   * ⚠️ A normalização é obrigação de quem implementa, não de quem chama. Está no contrato
   * porque o provedor atual entrega vetor truncado SEM normalizar (medido: norma 0.5882
   * em 768), e um adaptador futuro que devolvesse cru quebraria o ranking de toda busca
   * sem quebrar teste nenhum de conexão. `dominio/faq.ts` tem a função pronta.
   */
  embutir(texto: string): Promise<number[]>;
}

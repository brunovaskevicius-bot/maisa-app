/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — fila de lembretes vazia.
 *
 * Devolve sempre `[]`, e isso É o comportamento certo, não um esboço por preguiça.
 *
 * Sem banco não existem atendimentos marcados; a alternativa — inventar um pendente
 * fictício — faria a rotina mandar WhatsApp de verdade para um telefone de fixture toda
 * vez que alguém a disparasse num ambiente sem Supabase. O adaptador de mentira pode
 * mentir sobre o dado; não pode mentir sobre a CONSEQUÊNCIA, e a consequência aqui é uma
 * mensagem saindo para o celular de alguém.
 *
 * `faltando()` também é vazio, de propósito: a rotina RODA em modo demonstração, com zero
 * envios e sem erro. É o que permite pendurar o agendador e ver o caminho inteiro
 * responder `{"enviados":0}` antes de existir banco.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { LembretePendente } from "@/nucleo/dominio/lembretes";
import type { FilaDeLembretes } from "@/nucleo/portas/saida/fila-de-lembretes";

export const lembretesDemo: FilaDeLembretes = {
  faltando: () => [],

  async reservar(): Promise<LembretePendente[]> {
    console.info("[demo/lembretes] rotina rodou sem banco — nenhum atendimento para lembrar");
    return [];
  },

  async devolver(): Promise<void> {
    /* Nada foi reservado, então não há o que devolver. */
  },
};

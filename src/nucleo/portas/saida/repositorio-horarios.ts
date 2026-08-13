/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o horário ANUNCIADO do negócio.
 *
 * A terceira porta do mesmo padrão de `repositorio-assistente`, e pela mesma razão: até
 * hoje o horário anunciado morava no `localStorage` do navegador do dono. Ele digitava
 * "sábado até 13h", trocava de aparelho, e o ajuste sumia — e a MAISA, no WhatsApp, nunca
 * soube dele em momento nenhum, porque o `localStorage` de um dos aparelhos do dono não
 * atravessa para o servidor que atende o cliente.
 *
 * ── POR QUE `salvar` RECEBE A SEMANA INTEIRA, E NÃO UM DIA ──
 *
 * Diferente de `RepositorioAssistente`, que é patch por campo. Aqui o dado é uma grade de
 * sete linhas que só faz sentido completa: "quando abrimos" é a semana, não a terça. Uma
 * escrita parcial abriria a pergunta "e se faltar quarta?" — e as duas respostas
 * possíveis (manter a antiga, ou fechar) são armadilhas diferentes.
 *
 * A tela ainda edita um dia por vez; quem junta os sete antes de mandar é o caso de uso.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { SemanaAnunciada } from "../../dominio/horarios";
import type { ContextoTenant } from "../../dominio/tenant";

export interface RepositorioHorarios {
  /**
   * A semana deste inquilino, com os sete dias em ordem de `dow`.
   *
   * `null` quando não há linha nenhuma — só acontece com negócio nascido fora de
   * `criar_negocio()`, que semeia as sete (`005_provisionar.sql:195`). É diferente de
   * "sete dias fechados", que é uma configuração legítima de quem está de férias.
   */
  ler(t: ContextoTenant): Promise<SemanaAnunciada | null>;

  /** Substitui a semana inteira. Devolve o que ficou gravado, não o que foi mandado. */
  salvar(t: ContextoTenant, semana: SemanaAnunciada): Promise<SemanaAnunciada>;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — quanto deste negócio já está de pé.
 *
 * Uma capacidade só: olhar o mundo e dizer quais passos da ativação estão cumpridos. Não
 * grava nada, não decide nada — quem decide o que mostrar é a tela, e quem decide o que
 * conta como passo é `dominio/ativacao.ts`.
 *
 * ── POR QUE É PORTA PRÓPRIA, E NÃO UM MÉTODO DO `RepositorioNegocio` ──
 *
 * Porque ela atravessa agregados que o repositório de cadastro não conhece: canal de
 * WhatsApp, integração com Google, mensagens. Pendurá-la lá obrigaria aquele repositório
 * a importar meia dúzia de tabelas que não são dele — e o adaptador de demonstração,
 * que hoje responde cadastro com quatro arrays, teria que fingir conhecer conversas.
 *
 * ⚠️ O ADAPTADOR TEM QUE TOLERAR FALHA PARCIAL. Cada passo é uma consulta independente, e
 * uma que falhe (RLS mais estreita para quem não é dono, tabela indisponível) precisa
 * virar "não fez ainda", nunca derrubar o checklist inteiro. É `Promise.allSettled`, não
 * `Promise.all` — a diferença entre um cartão a menos e uma tela em branco. A lição veio
 * do `getOnboardingStatus` do Smiller, que trata cada consulta com `catch` próprio.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { ProgressoDaAtivacao } from "../../dominio/ativacao";

export interface ProgressoDeAtivacao {
  ler(t: ContextoTenant): Promise<ProgressoDaAtivacao>;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CASO DE USO — quanto deste negócio já está de pé.
 *
 * Curto de propósito: não há regra nova aqui. A regra de o que conta como passo mora em
 * `dominio/ativacao.ts`, e a de como apurar cada um mora no adaptador — que é onde tem
 * que morar, porque apurar significa perguntar a cinco tabelas diferentes.
 *
 * O valor deste arquivo é o mesmo do `criarLerCadastro`: ele é a fronteira. Sem ele, a
 * rota `/api/ativacao` importaria o adaptador do Supabase direto, e o modo demonstração
 * — que é onde o wizard é afinado antes de haver banco — deixaria de existir para esta
 * tela em silêncio.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { LerAtivacao } from "../portas/entrada/casos-de-uso";
import type { ProgressoDeAtivacao } from "../portas/saida/progresso-ativacao";
import type { ProgressoDaAtivacao } from "../dominio/ativacao";

export function criarLerAtivacao(deps: { ativacao: ProgressoDeAtivacao }): LerAtivacao {
  return async (t): Promise<ProgressoDaAtivacao> => deps.ativacao.ler(t);
}

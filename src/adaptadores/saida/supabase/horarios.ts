/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — o horário anunciado, na tabela `horarios_anunciados`.
 *
 * Sete linhas por inquilino, chaveadas por `(tenant_id, dow)`. A fronteira que este
 * arquivo guarda é de FORMATO DE HORA: o Postgres guarda `time`, e devolve `"09:00:00"`;
 * o domínio (e o `<input type="time">`) falam `"09:00"`. O de-para vive aqui e em lugar
 * nenhum mais — mandar `"09:00:00"` para a tela faz o input aparecer vazio, sem erro.
 *
 * ⚠️ `.eq("tenant_id", …)` em TODA consulta, pela mesma razão de `assistente.ts`: quando
 * quem lê é o agente, `clienteDoContexto` devolve service role e a RLS fica desligada. O
 * `.eq` passa a ser a única fronteira entre inquilinos.
 *
 * ── POR QUE `upsert` DOS SETE, E NÃO `delete` + `insert` ──
 *
 * Apagar e reinserir abriria uma janela em que o inquilino não tem horário nenhum. É
 * curta, mas o agente lê esta tabela no meio de conversas — e cair nessa janela faria a
 * MAISA responder "horário não cadastrado" para um negócio que tem horário. Um `upsert`
 * por chave composta nunca deixa a tabela sem as sete linhas.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { SemanaAnunciada } from "@/nucleo/dominio/horarios";
import type { RepositorioHorarios } from "@/nucleo/portas/saida/repositorio-horarios";
import { FalhaDoProvedor } from "@/nucleo/dominio/erros";
import { clienteDoContexto } from "./contexto-cliente";

const COLS = "dow, aberto, de, ate";

type Linha = {
  dow: number;
  aberto: boolean;
  de: string | null;
  ate: string | null;
};

/** `"09:00:00"` → `"09:00"`. O Postgres devolve segundos que ninguém digitou. */
const semSegundos = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

function paraDominio(l: Linha) {
  return {
    dow: l.dow,
    aberto: l.aberto,
    /* Fechado devolve `null` nos dois mesmo que a coluna tenha sobra de um estado
     * anterior — o domínio diz que fechado não tem hora, e é ele que manda. */
    de: l.aberto ? semSegundos(l.de) : null,
    ate: l.aberto ? semSegundos(l.ate) : null,
  };
}

export const horariosSupabase: RepositorioHorarios = {
  async ler(t: ContextoTenant): Promise<SemanaAnunciada | null> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("horarios_anunciados")
      .select(COLS)
      .eq("tenant_id", t.tenantId)
      .order("dow");

    if (error) throw new FalhaDoProvedor("Supabase", `ler horários: ${error.message}`);
    if (!data?.length) return null;

    return (data as Linha[]).map(paraDominio);
  },

  async salvar(t: ContextoTenant, semana: SemanaAnunciada): Promise<SemanaAnunciada> {
    const supabase = clienteDoContexto(t);

    const linhas = semana.map((d) => ({
      tenant_id: t.tenantId,
      dow: d.dow,
      aberto: d.aberto,
      de: d.de,
      ate: d.ate,
    }));

    const { data, error } = await supabase
      .from("horarios_anunciados")
      .upsert(linhas, { onConflict: "tenant_id,dow" })
      .select(COLS)
      .order("dow");

    if (error) throw new FalhaDoProvedor("Supabase", `salvar horários: ${error.message}`);
    /* Devolve o que o BANCO gravou, não o que foi mandado. É o que faz um `check` ou um
     * trigger do lado de lá aparecer na tela em vez de ficar escondido atrás de um eco. */
    if (!data?.length) throw new FalhaDoProvedor("Supabase", "salvar horários: nada voltou");

    return (data as Linha[]).map(paraDominio);
  },
};

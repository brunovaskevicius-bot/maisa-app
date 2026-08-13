/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a fila de lembretes, via `reservar_lembretes()`.
 *
 * Fino de propósito: a lógica inteira (quem entra na janela, quem ligou o toggle, a
 * reserva atômica) está na função SQL de `010_lembretes.sql`, porque ela precisa ser UM
 * passo. Espalhá-la entre um `select` e um `update` daqui reabriria a corrida que a
 * migração existe para fechar — duas execuções sobrepostas mandando o mesmo lembrete.
 *
 * ⚠️ USA A SERVICE ROLE, e é a única leitura do sistema que atravessa inquilinos.
 *
 * Não passa por `clienteDoContexto` porque não há contexto: a rotina não tem sessão e não
 * tem inquilino. A RLS não protegeria nada aqui de qualquer jeito — a função é
 * `security definer` e a pergunta é legitimamente global. O limite é o mesmo escrito na
 * porta: o que a varredura devolve traz `tenantId`, e tudo daí para frente é por
 * inquilino.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { LembretePendente } from "@/nucleo/dominio/lembretes";
import type { FilaDeLembretes } from "@/nucleo/portas/saida/fila-de-lembretes";
import { FalhaDoProvedor } from "@/nucleo/dominio/erros";
import { adminFaltando, createAdminClient, isAdminConfigured } from "./admin";
import { isSupabaseConfigured } from "./config";

type Linha = {
  id: string;
  tenant_id: string;
  cliente_nome: string | null;
  cliente_tel: string;
  servico_nome: string | null;
  inicio: string;
};

export const lembretesSupabase: FilaDeLembretes = {
  faltando() {
    if (!isSupabaseConfigured) return ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
    /* A service role é requisito DURO desta porta, diferente das outras onde ela é só o
     * caminho do agente: sem sessão nenhuma para cair, não existe alternativa. */
    if (!isAdminConfigured) return adminFaltando();
    return [];
  },

  async reservar(ate: Date, limite: number): Promise<LembretePendente[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("reservar_lembretes", {
      p_ate: ate.toISOString(),
      p_limite: limite,
    });

    if (error) throw new FalhaDoProvedor("Supabase", `reservar lembretes: ${error.message}`);

    return ((data ?? []) as Linha[]).map((l) => ({
      id: l.id,
      tenantId: l.tenant_id,
      clienteNome: l.cliente_nome,
      clienteTel: l.cliente_tel,
      servicoNome: l.servico_nome,
      inicio: l.inicio,
    }));
  },

  async devolver(id: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("devolver_lembrete", { p_id: id });
    /* Não lança: quem chama já está tratando um erro de envio, e trocar a mensagem certa
     * ("WhatsApp desconectado") por "falhou ao devolver a reserva" esconderia a causa. O
     * log existe para o caso em que a devolução vira o problema de verdade. */
    if (error) {
      console.error(`[supabase/lembretes] não devolveu a reserva de ${id}: ${error.message}`);
    }
  },
};

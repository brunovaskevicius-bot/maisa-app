/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — as FAQs, na tabela `faqs` com busca vetorial.
 *
 * A tabela nasceu em `002_multitenant.sql` e ficou meses sem leitor: o agente respondia
 * dúvida com fixture. A coluna `embedding` e as duas funções que este arquivo chama vêm de
 * `supabase/012_faqs_vetorial.sql`.
 *
 * ⚠️ `.eq("tenant_id", …)` em TODA consulta, e `p_tenant` nas duas RPCs, pela mesma razão
 * de `assistente.ts` e `horarios.ts`: quando quem lê é o AGENTE, `clienteDoContexto`
 * devolve service role e a RLS fica desligada. O filtro no código passa a ser a única
 * fronteira entre inquilinos — e foi exatamente ela que faltou no Smiller, onde a busca de
 * FAQ é global por padrão (`faq_filter_by_instancia`, desligada de fábrica).
 *
 * ── POR QUE A BUSCA É RPC E NÃO QUERY ──
 * Ordenar por `embedding <=> $1` exige o operador do pgvector, que o PostgREST não expõe.
 * A função `buscar_faqs` é `security invoker` de propósito: assim a RLS continua valendo
 * para quem tem sessão, e o `p_tenant` cobre o agente. Uma `security definer` teria
 * desligado a primeira barreira para ganhar sintaxe.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { Faq, FaqEncontrada } from "@/nucleo/dominio/faq";
import type { RascunhoDeFaq, RepositorioFaqs } from "@/nucleo/portas/saida/repositorio-faqs";
import { CORTE_DE_SIMILARIDADE } from "@/nucleo/dominio/faq";
import { FalhaDoProvedor, NaoEncontrado } from "@/nucleo/dominio/erros";
import { clienteDoContexto } from "./contexto-cliente";

const COLS = "id, pergunta, resposta, usos, ativo";

type Linha = { id: string; pergunta: string; resposta: string; usos: number; ativo: boolean };

const paraDominio = (l: Linha): Faq => ({
  id: l.id,
  pergunta: l.pergunta,
  resposta: l.resposta,
  usos: l.usos,
});

export const faqsSupabase: RepositorioFaqs = {
  async listar(t: ContextoTenant): Promise<Faq[]> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("faqs")
      .select(COLS)
      .eq("tenant_id", t.tenantId)
      .order("usos", { ascending: false })
      .order("criado_em", { ascending: true });

    if (error) throw new FalhaDoProvedor("Supabase", `listar FAQs: ${error.message}`);
    return (data ?? []).map((l) => paraDominio(l as Linha));
  },

  async salvar(t: ContextoTenant, rascunho: RascunhoDeFaq, vetor: number[]): Promise<Faq> {
    const supabase = clienteDoContexto(t);

    const campos = {
      pergunta: rascunho.pergunta,
      resposta: rascunho.resposta,
      ativo: rascunho.ativo ?? true,
      embedding: vetor,
    };

    if (rascunho.id) {
      /* ⚠️ O `.eq("tenant_id")` aqui não é redundante com o `.eq("id")`. O id é um uuid
       * que chega do corpo do request: sem o segundo filtro, conhecer o id de uma FAQ
       * alheia bastaria para reescrevê-la quando quem escreve é o agente (service role,
       * RLS desligada). É o mesmo furo que `tenant.ts` conta ter custado um incidente. */
      const { data, error } = await supabase
        .from("faqs")
        .update(campos)
        .eq("id", rascunho.id)
        .eq("tenant_id", t.tenantId)
        .select(COLS);

      if (error) throw new FalhaDoProvedor("Supabase", `atualizar FAQ: ${error.message}`);
      /* Zero linhas aqui é RLS ou id de outro inquilino — nunca erro do Postgres. Sem esta
       * checagem a tela diria "salvo" e o texto voltaria ao antigo no recarregamento. */
      if (!data?.length) throw new NaoEncontrado("FAQ para editar");
      return paraDominio(data[0] as Linha);
    }

    const { data, error } = await supabase
      .from("faqs")
      .insert({ ...campos, tenant_id: t.tenantId })
      .select(COLS);

    if (error) throw new FalhaDoProvedor("Supabase", `criar FAQ: ${error.message}`);
    if (!data?.length) throw new FalhaDoProvedor("Supabase", "criar FAQ não devolveu a linha.");
    return paraDominio(data[0] as Linha);
  },

  async remover(t: ContextoTenant, id: string): Promise<void> {
    const supabase = clienteDoContexto(t);
    const { error } = await supabase
      .from("faqs")
      .delete()
      .eq("id", id)
      .eq("tenant_id", t.tenantId);

    if (error) throw new FalhaDoProvedor("Supabase", `remover FAQ: ${error.message}`);
  },

  async buscar(t: ContextoTenant, vetor: number[], k = 3): Promise<FaqEncontrada[]> {
    const supabase = clienteDoContexto(t);
    /* `p_min` vai EXPLÍCITO, e não pelo padrão da função. O número saiu de medição e vive
     * em `dominio/faq.ts`, junto do texto que explica o que ele não faz — deixá-lo só no
     * `default` do Postgres colocaria a constante longe da explicação, e afiná-lo passaria
     * a exigir migração. O padrão do banco fica como rede para quem chamar a RPC à mão. */
    const { data, error } = await supabase.rpc("buscar_faqs", {
      p_tenant: t.tenantId,
      p_vetor: JSON.stringify(vetor),
      p_k: k,
      p_min: CORTE_DE_SIMILARIDADE,
    });

    if (error) throw new FalhaDoProvedor("Supabase", `buscar FAQs: ${error.message}`);
    return (data ?? []) as FaqEncontrada[];
  },

  async registrarUso(t: ContextoTenant, id: string): Promise<void> {
    const supabase = clienteDoContexto(t);
    const { error } = await supabase.rpc("registrar_uso_faq", { p_tenant: t.tenantId, p_faq: id });

    /* Estatística NUNCA derruba conversa. Se o contador falhar, o cliente já recebeu a
     * resposta certa e perder um incremento não muda nada — mas propagar o erro daqui
     * abortaria o turno do agente por causa de um número. Loga e segue. */
    if (error) console.warn(`[supabase/faqs] não contabilizou uso da FAQ ${id}: ${error.message}`);
  },
};

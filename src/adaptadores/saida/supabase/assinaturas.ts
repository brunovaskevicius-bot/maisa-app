/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a assinatura, no Postgres. ⚠️ SÓ SERVIDOR.
 *
 * Tabela `assinaturas` (DDL em `supabase/002_multitenant.sql` §11; RLS em
 * `supabase/003_rls.sql` §3.4 — os arquivos são a verdade, não esta prosa).
 *
 * ── ⚠️ A ESCRITA SÓ FUNCIONA COM SERVICE_ROLE, E ISSO É A RLS FAZENDO O TRABALHO DELA ──
 *
 * `003_rls.sql` §3.4 concede SELECT a dono e gestor e **nenhuma política de INSERT ou
 * UPDATE a ninguém logado**. O comentário de lá diz o porquê em cinco palavras: "dono
 * nenhum se dá desconto".
 *
 * Consequência prática: `gravar` só passa quando o `ContextoTenant` tem ator `sistema`
 * (é o que faz `contexto-cliente.ts` escolher o cliente service_role). Chamar `gravar`
 * a partir de uma sessão de usuário não explode — **não escreve e não reclama**, porque
 * um UPDATE que não casa nenhuma linha por RLS é um sucesso com zero linhas. Por isso a
 * verificação explícita abaixo: melhor um erro alto do que uma cobrança que sumiu.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { Assinatura } from "@/nucleo/dominio/assinatura";
import type { RepositorioAssinaturas } from "@/nucleo/portas/saida/repositorio-assinaturas";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { adminFaltando, createAdminClient, isAdminConfigured } from "./admin";
import { clienteDoContexto } from "./contexto-cliente";

const TABELA = "assinaturas";

const COLUNAS =
  "plano, preco, moeda, status, stripe_customer_id, stripe_subscription_id, "
  + "periodo_fim, trial_fim, cartao_marca, cartao_final4";

type Linha = {
  plano: string | null;
  preco: number | string | null;
  moeda: string | null;
  status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  periodo_fim: string | null;
  trial_fim: string | null;
  cartao_marca: string | null;
  cartao_final4: string | null;
};

const STATUS = ["trial", "ativa", "inadimplente", "cancelada"] as const;

function paraDominio(l: Linha): Assinatura {
  return {
    plano: l.plano ?? "—",
    /* `numeric` volta como string do driver quando passa da precisão de `double`. */
    preco: l.preco === null ? null : Number(l.preco),
    moeda: l.moeda ?? "BRL",
    /* Status fora da lista vira `inadimplente`, pela mesma razão do `statusDoProvedor`:
     * desconhecido nunca libera. Aqui só acontece se alguém alterar o `check` da coluna. */
    status: (STATUS as readonly string[]).includes(l.status ?? "")
      ? (l.status as Assinatura["status"])
      : "inadimplente",
    clienteId: l.stripe_customer_id,
    assinaturaId: l.stripe_subscription_id,
    periodoFim: l.periodo_fim,
    trialFim: l.trial_fim,
    cartaoMarca: l.cartao_marca,
    cartaoFinal4: l.cartao_final4,
  };
}

export const assinaturasSupabase: RepositorioAssinaturas = {
  async ler(t: ContextoTenant): Promise<Assinatura | null> {
    const { data, error } = await clienteDoContexto(t)
      .from(TABELA)
      .select(COLUNAS)
      .eq("tenant_id", t.tenantId)
      .maybeSingle();

    if (error) throw new Error(`assinaturas.ler: ${error.message}`);
    return data ? paraDominio(data as unknown as Linha) : null;
  },

  async gravar(t: ContextoTenant, a: Assinatura): Promise<void> {
    const { data, error } = await clienteDoContexto(t)
      .from(TABELA)
      .update({
        plano: a.plano,
        preco: a.preco,
        moeda: a.moeda,
        status: a.status,
        stripe_customer_id: a.clienteId,
        stripe_subscription_id: a.assinaturaId,
        periodo_fim: a.periodoFim,
        trial_fim: a.trialFim,
        cartao_marca: a.cartaoMarca,
        cartao_final4: a.cartaoFinal4,
        /* Existe a coluna `cancelada_em` e ela fica de fora de propósito: quem sabe a
         * data do cancelamento é o provedor, e ela chega em `periodo_fim`. Uma segunda
         * data escrita por nós divergiria da dele no primeiro cancelamento agendado. */
      })
      .eq("tenant_id", t.tenantId)
      .select("tenant_id");

    if (error) throw new Error(`assinaturas.gravar: ${error.message}`);

    /* ⚠️ ZERO LINHAS É FALHA, NÃO SUCESSO VAZIO. Dois caminhos chegam aqui, e os dois
     * são graves: o inquilino não existe (pagamento órfão) ou a RLS barrou a escrita
     * (ator errado). Sem este erro, o webhook devolve 200, a Stripe marca entregue, e a
     * assinatura fica com o estado antigo para sempre — sem log, sem reentrega. */
    if (!data || data.length === 0) {
      throw new Error(
        `assinaturas.gravar: nenhuma linha atualizada para o inquilino ${t.tenantId}. `
          + "Ou o negócio não existe, ou a escrita rodou sem service_role (ver RLS §3.4).",
      );
    }
  },

  async tenantDoCliente(clienteId: string): Promise<string | null> {
    /* ⚠️ A ÚNICA CONSULTA DO REPOSITÓRIO SEM `ContextoTenant`, e por construção: a
     * pergunta é "de QUEM é este cliente?". Ela atravessa inquilinos porque a resposta
     * ainda não é conhecida — é o mesmo arranjo de `integracoes_whatsapp.instancia` em
     * `entrada/whatsapp/contexto.ts`.
     *
     * O que a torna segura é o filtro: casa por `stripe_customer_id`, que é UNIQUE na
     * tabela e é dado que nós gravamos. Não há parâmetro por onde escolher inquilino. */
    if (!isAdminConfigured) throw new Error(`falta ${adminFaltando().join(", ")}`);

    const { data, error } = await createAdminClient()
      .from(TABELA)
      .select("tenant_id")
      .eq("stripe_customer_id", clienteId)
      .maybeSingle();

    if (error) throw new Error(`assinaturas.tenantDoCliente: ${error.message}`);
    return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
  },

  faltando: adminFaltando,
};

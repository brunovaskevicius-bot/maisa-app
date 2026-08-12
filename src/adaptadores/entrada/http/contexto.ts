/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE ENTRADA (HTTP) — quem está pedindo.
 *
 * Transforma a sessão do Supabase em `ContextoTenant`. É o ÚNICO lugar do app onde
 * um contexto de inquilino nasce a partir de HTTP.
 *
 * ⚠️ A regra que não se negocia: `tenantId` vem do COOKIE, jamais da query string ou
 * do corpo. Foi exatamente esse descuido — id de inquilino vindo por parâmetro, sem
 * autenticar quem pedia — que abriu o pior furo da integração de onde este código veio:
 * bastava conhecer o id da vítima para sobrescrever a agenda dela.
 * ────────────────────────────────────────────────────────────────────────────── */

import { NextResponse } from "next/server";
import { createClient } from "@/adaptadores/saida/supabase/server";
import { isSupabaseConfigured } from "@/adaptadores/saida/supabase/config";
import { googleFaltando, isGoogleConfigured } from "@/adaptadores/saida/google/config";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";

/** Ou o contexto, ou a resposta pronta que barra o pedido. Nunca os dois. */
export type Porteiro = { tenant: ContextoTenant } | { barrado: NextResponse };

export const barrou = (p: Porteiro): p is { barrado: NextResponse } => "barrado" in p;

/**
 * De qual NEGÓCIO é esta sessão.
 *
 * Antes isto era `tenantId = usuarioId`, com um comentário prometendo que "quando existir
 * a tabela de negócios, é AQUI que entra o select em `membros`". É este select. Nada mais
 * no app inteiro precisou saber da mudança — que era exatamente a aposta da porta.
 *
 * ⚠️ POR QUE NÃO DÁ MAIS PARA USAR O `usuarioId` COMO TENANT: as tabelas do
 * `002_multitenant.sql` têm `tenant_id uuid` com FK para `negocios(id)`. O id do usuário é
 * um uuid válido, então o TypeScript e o Postgres aceitam a atribuição sem reclamar — e
 * toda consulta simplesmente não acha linha nenhuma. Silencioso: a tela abre vazia e
 * parece "ainda não cadastrei nada".
 *
 * Usa `membros.padrao` para escolher quando a pessoa é de mais de um negócio. O índice
 * único parcial `ux_membros_padrao` garante no banco que existe no máximo um padrão por
 * pessoa, então `order by padrao desc` + `limit 1` é determinístico. O fallback por
 * `criado_em` cobre quem nunca teve padrão marcado (é o caso de quem virou membro por
 * convite, não por criar o negócio).
 */
export async function tenantDoUsuario(usuarioId: string): Promise<ContextoTenant | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("membros")
    .select("tenant_id")
    .eq("user_id", usuarioId)
    .order("padrao", { ascending: false })
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle<{ tenant_id: string }>();

  if (error) {
    console.error(`[entrada/http] falha ao resolver o negócio de ${usuarioId}: ${error.message}`);
    return null;
  }
  if (!data) return null;

  return {
    tenantId: data.tenant_id,
    usuarioId,
    ator: { tipo: "usuario", id: usuarioId },
  };
}

/**
 * Contexto de um inquilino sem login.
 *
 * Sem as chaves do Supabase o app roda como demonstração aberta (ver
 * `supabase/config.ts`). As rotas fiscais aceitam isso — a emissão fica em modo
 * simulado. As rotas de agenda NÃO: gravar token do Google sem dono seria pior do que
 * não conectar.
 */
export const TENANT_DEMO: ContextoTenant = {
  tenantId: "demo",
  usuarioId: "demo",
  ator: { tipo: "sistema", rotina: "demo-aberta" },
};

const json = (corpo: object, status: number) => NextResponse.json(corpo, { status });

/** A sessão logada, ou 401. Usada pelas rotas que só precisam de "tem alguém aí?". */
export async function exigirSessao(): Promise<Porteiro> {
  if (!isSupabaseConfigured) {
    return { barrado: json({ ok: false, status: "login_necessario" }, 401) };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { barrado: json({ ok: false, status: "nao_autenticado" }, 401) };

  const tenant = await tenantDoUsuario(user.id);

  /**
   * Logado, mas sem negócio. É um estado NOVO — e é o primeiro login de todo mundo.
   *
   * Antes não existia: `tenantId` era o próprio `usuarioId`, então ter conta já era ter
   * inquilino. Agora o negócio é uma linha em `negocios` + `membros`, criada por
   * `criar_negocio()` (arquivo `005_provisionar.sql`) — e entre "criei a conta" e "criei o
   * negócio" existe uma janela real.
   *
   * 409 e status próprio, não 401: 401 mandaria a tela para o login de novo, num laço
   * infinito com uma sessão perfeitamente válida. Existe uma AÇÃO que resolve (provisionar
   * o negócio), que é exatamente a semântica de 409 que `respostas.ts` já usa para
   * `reconectar`.
   */
  if (!tenant) {
    return {
      barrado: json(
        { ok: false, status: "sem_negocio", info: "Esta conta ainda não tem um negócio. Rode criar_negocio() no Supabase." },
        409,
      ),
    };
  }
  return { tenant };
}

/** Idem, mais a exigência de que a integração com o Google exista neste ambiente. */
export async function exigirSessaoComGoogle(): Promise<Porteiro> {
  if (!isGoogleConfigured) {
    return { barrado: json({ ok: false, status: "nao_configurado", faltando: googleFaltando() }, 400) };
  }
  return exigirSessao();
}

/**
 * A sessão quando houver; o inquilino de demonstração quando o Supabase estiver
 * desligado. É o que as rotas fiscais usam — elas nunca gravam credencial de ninguém.
 */
export async function sessaoOuDemo(): Promise<Porteiro> {
  if (!isSupabaseConfigured) return { tenant: TENANT_DEMO };
  return exigirSessao();
}

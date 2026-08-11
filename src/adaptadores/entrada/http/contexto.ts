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
 * Hoje um login = um negócio, então `tenantId` é o próprio `usuarioId`.
 *
 * Quando existir a tabela de negócios, é AQUI que entra o `select tenant_id from
 * membros where user_id = …` — e mais nada no app inteiro precisa saber disso.
 */
const tenantDoUsuario = (usuarioId: string): ContextoTenant => ({
  tenantId: usuarioId,
  usuarioId,
  ator: { tipo: "usuario", id: usuarioId },
});

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
  return { tenant: tenantDoUsuario(user.id) };
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

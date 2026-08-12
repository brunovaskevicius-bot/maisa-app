/* ─────────────────────────────────────────────────────────────────────────────
 * QUAL CLIENTE SUPABASE ESTE PEDIDO MERECE. ⚠️ SÓ SERVIDOR.
 *
 * Uma decisão, num lugar só: quem age com sessão fala com o banco pela sessão (RLS
 * ligada); quem age sem sessão fala com service role (RLS desligada, filtro no código).
 *
 * E o que decide é o `ator` do `ContextoTenant` — não a rota, não uma flag, não um
 * parâmetro que quem chama escolhe. Isso importa: `ator` é preenchido pelos adaptadores
 * de ENTRADA (`entrada/http/contexto.ts` e `entrada/whatsapp/contexto.ts`), e nenhum dos
 * dois aceita valor vindo do corpo do request. Então "usa service role?" é uma pergunta
 * que a borda do sistema já respondeu, não algo que se possa forçar de fora.
 *
 *   ator.tipo = "usuario"  → sessão + anon key. RLS decide. O padrão.
 *   ator.tipo = "agente"   → service role. É o webhook do WhatsApp: não há cookie.
 *   ator.tipo = "sistema"  → service role. Rotina automática (lembrete, fechamento).
 *
 * A razão de a escolha morar aqui e não em cada adaptador: se cada um decidisse, um dia
 * um deles decidiria diferente. E "um deles decidiu diferente" na direção errada é
 * vazamento entre inquilinos, não bug de tela.
 *
 * ⚠️ CONSEQUÊNCIA QUE NÃO DÁ PARA ESQUECER: quando este módulo devolve o cliente admin,
 * o `.eq("tenant_id", t.tenantId)` de quem consulta passa a ser a ÚNICA proteção. Ver o
 * cabeçalho de `admin.ts`. Todo adaptador que use isto tem que filtrar por tenant em
 * TODA consulta — inclusive nas que "obviamente" só têm uma linha.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { NaoConfigurado } from "@/nucleo/dominio/erros";
import { createClient } from "./server";
import { adminFaltando, createAdminClient, isAdminConfigured } from "./admin";
import { isSupabaseConfigured } from "./config";

/** Este ator tem cookie de sessão para oferecer ao Postgres? */
export const temSessao = (t: ContextoTenant): boolean => t.ator.tipo === "usuario";

/**
 * O cliente certo para este contexto.
 *
 * Lança `NaoConfigurado` (que `entrada/http/respostas.ts` já vira 400 com a lista do que
 * falta) em vez de devolver um cliente que estoura lá dentro do `postgrest`: a diferença
 * entre "falta SUPABASE_SERVICE_ROLE_KEY no ambiente" e um 500 genérico é meia hora de
 * quem for configurar isso.
 */
export function clienteDoContexto(t: ContextoTenant): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new NaoConfigurado(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  }

  if (temSessao(t)) return createClient();

  if (!isAdminConfigured) {
    /* O log existe para o caso REAL em que isso aparece: a MAISA respondendo no WhatsApp
     * num ambiente onde ninguém pôs a service role key. `NaoConfigurado` só carrega a
     * lista de variáveis (ver `dominio/erros.ts`), e "falta SUPABASE_SERVICE_ROLE_KEY"
     * sozinho não explica por que o agente parou de marcar horário. Sem esta linha, o
     * sintoma é "a MAISA escala toda conversa" e a causa fica invisível. */
    console.error(
      `[supabase/contexto-cliente] ator ${t.ator.tipo} não tem sessão e a service role não está configurada — ` +
        `o agente não consegue ler cadastro nem token do Google. Falta: ${adminFaltando().join(", ")}`,
    );
    throw new NaoConfigurado(adminFaltando());
  }
  return createAdminClient();
}

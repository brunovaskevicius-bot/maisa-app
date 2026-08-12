/* ─────────────────────────────────────────────────────────────────────────────
 * SUPABASE COM SERVICE ROLE — o cliente que NÃO tem sessão. ⚠️ SÓ SERVIDOR.
 *
 * Irmão de `server.ts`, com uma diferença que muda tudo: `server.ts` usa a anon key
 * mais o cookie do usuário, então a RLS do Postgres decide o que ele vê. Este aqui usa
 * a service role key, e a service role **ignora RLS por completo**.
 *
 * POR QUE ELE EXISTE — o webhook do WhatsApp.
 *
 * Um webhook não tem cookie: a requisição vem do servidor da Evolution, não de um
 * navegador. Com o cliente de sessão, `auth.uid()` é NULL, e TODA política de leitura do
 * `003_rls.sql` é da forma `tenant_id in (select public.negocios_do_usuario())` — que
 * para um `auth.uid()` nulo devolve conjunto vazio. Consequência medida no código: o
 * agente pedia o token do Google, `acessoValido()` não achava linha nenhuma e lançava
 * `PrecisaReconectar`; a MAISA respondia "a agenda se desconectou, chame o responsável"
 * e escalava. Ou seja: o agente conversava, mas NUNCA conseguia marcar. Não era bug de
 * lógica, era ausência de identidade.
 *
 * ⚠️ O QUE VOCÊ PASSA A CARREGAR AO USAR ISTO.
 *
 * Com RLS ativa, um `where tenant_id` esquecido não vaza nada — o Postgres barra. Com
 * service role, esse mesmo esquecimento vaza o inquilino inteiro para o vizinho. O
 * comentário do `001_google_integracoes.sql` conta a história: a auditoria do BIP achou
 * IDOR entre inquilinos em cinco rotas, todas por filtro esquecido no código **enquanto
 * a service key ignorava a RLS**. É exatamente esta faca.
 *
 * Por isso as três regras deste arquivo, e nenhuma delas é opcional:
 *
 *   1. **Ninguém importa isto direto.** O único consumidor é
 *      `saida/supabase/contexto-cliente.ts`, que escolhe entre sessão e service role a
 *      partir do `ator` do `ContextoTenant`. Uma rota que chame `createAdminClient()`
 *      na mão está pedindo para virar o sexto IDOR.
 *   2. **Todo `from()` daqui leva `.eq("tenant_id", …)`.** Não é cinto e suspensório
 *      como em `conexoes.ts`: aqui é o cinto ÚNICO.
 *   3. **O `tenantId` nunca vem do corpo do request.** Ele nasce de `membros` (sessão)
 *      ou de `integracoes_whatsapp.instancia` (webhook) — ver `dominio/tenant.ts`.
 *
 * Sem `SUPABASE_SERVICE_ROLE_KEY` no ambiente, `isAdminConfigured` é false e quem
 * precisar dela recebe `NaoConfigurado` com o nome da variável faltando — nunca um
 * cliente meia-boca que falha adiante.
 * ────────────────────────────────────────────────────────────────────────────── */

import { createClient as criarCliente, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/** Sem `NEXT_PUBLIC_`: a service role key não pode chegar ao navegador de jeito nenhum. */
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export const isAdminConfigured = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

/** Nomes do que falta — para a rota de diagnóstico dizer, em vez de a pessoa adivinhar. */
export function adminFaltando(): string[] {
  const faltam: string[] = [];
  if (!SUPABASE_URL) faltam.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SERVICE_ROLE_KEY) faltam.push("SUPABASE_SERVICE_ROLE_KEY");
  return faltam;
}

/**
 * Um cliente só para o processo. Não há sessão para renovar nem cookie para escrever,
 * então reaproveitar é seguro — e evita reconstruir o cliente a cada mensagem de
 * WhatsApp, que é o caminho quente.
 */
let _admin: SupabaseClient | null = null;

/**
 * ⚠️ IGNORA RLS. Leia o cabeçalho antes de usar. Prefira
 * `contexto-cliente.ts → clienteDoContexto(t)`, que escolhe sozinho.
 */
export function createAdminClient(): SupabaseClient {
  if (!isAdminConfigured) {
    throw new Error(`Supabase service role não configurado: falta ${adminFaltando().join(", ")}`);
  }
  if (!_admin) {
    _admin = criarCliente(SUPABASE_URL!, SERVICE_ROLE_KEY, {
      auth: {
        // Não há usuário: nada de persistir sessão, nada de renovar token, e nada de
        // tentar ler a sessão da URL (isto roda no servidor, não existe URL de retorno).
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _admin;
}

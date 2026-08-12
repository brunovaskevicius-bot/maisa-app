// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar — onde os tokens moram. ⚠️ SÓ SERVIDOR.
//
// Tabela `integracoes_google` no Supabase (DDL em supabase/002_multitenant.sql — o
// arquivo é a verdade, não a prosa). Chaveada por `(tenant_id, profissional_id)`, os dois
// `uuid`, com FK COMPOSTA para `profissionais (tenant_id, id)`.
//
// ── DUAS MUDANÇAS AQUI, E AS DUAS SÃO A MESMA HISTÓRIA ──
//
// **1. A tabela.** Antes era `google_integracoes` (arquivo 001), chaveada por
// `(user_id, profissional_id)` com o profissional em TEXTO — `"pr1"` — porque a equipe
// morava num array no código. Agora o profissional é uma linha no banco com uuid, e o
// dono da conexão é o NEGÓCIO, não a pessoa logada. A migração de uma para a outra é o
// `supabase/006_migrar_google.sql`, que já traduz `"pr1"` para o uuid do profissional
// provisionado e copia o token cifrado como está (o banco nunca soube decifrar, então não
// precisa da GOOGLE_TOKEN_KEY).
//
// **2. Quem fala com o banco.** Antes: `createClient()`, sempre — anon key + cookie de
// sessão. Isso tinha uma consequência que só aparecia no caminho do agente: o webhook do
// WhatsApp não tem cookie, `auth.uid()` era NULL, a política de leitura
// (`tenant_id in (select negocios_do_usuario())`) devolvia conjunto vazio, e este arquivo
// lançava `PrecisaReconectar` — "a agenda ainda não está conectada". A MAISA então dizia
// ao cliente que a agenda caiu e escalava para humano. **Conversava e nunca marcava.**
// Não era lógica errada: era falta de identidade. Agora o cliente vem de
// `clienteDoContexto(t)`, que decide pelo `ator` (ver `saida/supabase/contexto-cliente.ts`).
//
// ⚠️ CONSEQUÊNCIA: no caminho do agente a RLS NÃO se aplica, e os `.eq("tenant_id", …)`
// daqui deixam de ser cinto E suspensório para virar o cinto ÚNICO. Eles eram redundantes
// com a RLS quando só havia sessão; não são mais. Nenhuma consulta deste arquivo pode
// perder o filtro por tenant.
// ─────────────────────────────────────────────────────────────────────────────

import type { ContextoAgenda, ContextoTenant } from "@/nucleo/dominio/tenant";
import { FalhaDoProvedor, PrecisaReconectar } from "@/nucleo/dominio/erros";
import { clienteDoContexto } from "@/adaptadores/saida/supabase/contexto-cliente";
import { cifrar, decifrar } from "./cripto";
import { renovar } from "./oauth";

const TABELA = "integracoes_google";

export type Integracao = {
  profissionalId: string;
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiraEm: string;
};

type Linha = {
  profissional_id: string;
  google_email: string;
  access_token: string;
  refresh_token: string;
  expira_em: string;
};

/** Grava (ou atualiza) a conexão de uma agenda. */
export async function salvar(ctx: ContextoAgenda, i: Omit<Integracao, "profissionalId">): Promise<void> {
  const supabase = clienteDoContexto(ctx.tenant);
  const { error } = await supabase.from(TABELA).upsert(
    {
      tenant_id: ctx.tenant.tenantId,
      profissional_id: ctx.agendaId,
      google_email: i.googleEmail,
      access_token: cifrar(i.accessToken),
      refresh_token: cifrar(i.refreshToken),
      expira_em: i.expiraEm,
      atualizado_em: new Date().toISOString(),
      /* `calendar_id` fica de fora de propósito: a coluna tem default 'primary', e mandar
       * o valor aqui sobrescreveria a escolha de quem já apontou a integração para um
       * calendário separado (a loja, não o pessoal). Reconectar não deve mudar isso. */
    },
    { onConflict: "tenant_id,profissional_id" },
  );
  if (error) throw new FalhaDoProvedor(`Não foi possível salvar a conexão: ${error.message}`);
}

/** Quem já está conectado — só o que a UI precisa mostrar, nunca os tokens. */
export async function listar(t: ContextoTenant): Promise<{ profissionalId: string; googleEmail: string }[]> {
  const supabase = clienteDoContexto(t);
  const { data, error } = await supabase
    .from(TABELA)
    .select("profissional_id, google_email")
    .eq("tenant_id", t.tenantId);
  if (error) return [];
  return (data ?? []).map((l: Pick<Linha, "profissional_id" | "google_email">) => ({
    profissionalId: l.profissional_id,
    googleEmail: l.google_email,
  }));
}

/**
 * Apaga a conexão. **Lança quando o banco recusa** — e essa parte é nova de propósito.
 *
 * Antes o resultado do `delete` era ignorado (`await` sem olhar `error`), e havia um caminho
 * em que isso mentia: a política de DELETE de `integracoes_google` é
 * `tem_papel(tenant_id, array['dono','gestor'])`, mas a de SELECT é todo membro. Um
 * **atendente** portanto VÊ a conexão, clica em "Desconectar", o Postgres recusa a remoção
 * pela RLS — e a rota respondia `{ ok: true }`. A tela dizia "Agenda desconectada", o
 * refresh token continuava vivo no Google, e um F5 trazia a conexão de volta.
 *
 * Note que `delete` barrado por RLS não é erro do PostgREST: são zero linhas afetadas, sem
 * `error`. Por isso a checagem é por CONTAGEM, não por `error` — pedir `count: "exact"` é o
 * que transforma "não pude" em algo detectável.
 */
export async function apagar(ctx: ContextoAgenda): Promise<void> {
  const supabase = clienteDoContexto(ctx.tenant);
  const { error, count } = await supabase.from(TABELA).delete({ count: "exact" })
    .eq("tenant_id", ctx.tenant.tenantId)
    .eq("profissional_id", ctx.agendaId);

  if (error) throw new FalhaDoProvedor(`Não foi possível remover a conexão: ${error.message}`);

  /* `count === 0` tem duas causas, e as duas devem terminar em silêncio aqui:
   *   • a linha não existia (desconectar duas vezes, ou conexão já removida) — idempotente;
   *   • a RLS barrou (atendente tentando desconectar).
   * O adaptador não sabe distinguir as duas, e por isso não lança: quem lança seria injusto
   * com o caso idempotente, que é legítimo e comum. O que ele NÃO faz mais é ficar calado —
   * o log nomeia o ator, que é o que permite reconhecer o caso do atendente no Vercel. */
  if (count === 0) {
    console.warn(
      `[google/conexoes] delete não removeu linha (tenant=${ctx.tenant.tenantId} agenda=${ctx.agendaId} ` +
        `ator=${ctx.tenant.ator.tipo}) — ou não existia, ou a RLS barrou (só dono/gestor apaga).`,
    );
  }
}

/** Só o refresh token, decifrado — usado pelo desconectar para revogar no Google. */
export async function refreshTokenDe(ctx: ContextoAgenda): Promise<string | null> {
  const supabase = clienteDoContexto(ctx.tenant);
  const { data } = await supabase
    .from(TABELA)
    .select("refresh_token")
    .eq("tenant_id", ctx.tenant.tenantId)
    .eq("profissional_id", ctx.agendaId)
    .maybeSingle();
  if (!data?.refresh_token) return null;
  try {
    return decifrar(data.refresh_token);
  } catch {
    return null;
  }
}

/**
 * Devolve um access token VÁLIDO para a agenda, renovando e regravando se estiver
 * perto de expirar.
 *
 * A renovação acontece num lugar só: quem quer falar com o Google passa por esta
 * função, e ela já deixa o banco em dia. Nenhuma rota precisa lembrar de nada — e é
 * justamente por isso que a porta `AgendaExterna` não tem token na assinatura.
 *
 * Lança PrecisaReconectar quando o refresh token não vale mais.
 */
export async function acessoValido(ctx: ContextoAgenda): Promise<{ token: string; email: string }> {
  const supabase = clienteDoContexto(ctx.tenant);
  const { data, error } = await supabase
    .from(TABELA)
    .select("profissional_id, google_email, access_token, refresh_token, expira_em")
    .eq("tenant_id", ctx.tenant.tenantId)
    .eq("profissional_id", ctx.agendaId)
    .maybeSingle<Linha>();

  if (error) throw new FalhaDoProvedor("Não foi possível ler a conexão com o Google.");
  if (!data) throw new PrecisaReconectar("Esta agenda ainda não está conectada ao Google.");

  // Ainda vale? (expira_em já vem com 60s de folga embutidos — ver oauth.expiraEmISO)
  // O refresh token só é decifrado DEPOIS deste atalho: decifrar antes faria uma
  // chave rotacionada derrubar até as leituras que nem precisariam dele.
  if (new Date(data.expira_em).getTime() > Date.now()) {
    return { token: decifrar(data.access_token), email: data.google_email };
  }

  const refreshToken = decifrar(data.refresh_token);

  let novo;
  try {
    novo = await renovar(refreshToken);
  } catch (e) {
    // Refresh token morto (revogado no Google, senha trocada, 6 meses parado).
    // Apagar a linha AQUI é o que fecha o ciclo: sem isso, /status continua listando
    // a conexão, a tela segue dizendo "Conectado como fulano@" e todo clique volta
    // 409 — o usuário fica preso num erro sem nada indicando que a saída é reconectar.
    if (e instanceof PrecisaReconectar) {
      await apagar(ctx);
    }
    throw e;
  }

  const { error: erroUpdate } = await supabase
    .from(TABELA)
    .update({
      access_token: cifrar(novo.accessToken),
      // Numa renovação o Google normalmente não reemite o refresh token — só
      // sobrescrevemos quando ele de fato vem, senão apagaríamos o que funciona.
      ...(novo.refreshToken ? { refresh_token: cifrar(novo.refreshToken) } : {}),
      expira_em: novo.expiraEm,
      atualizado_em: new Date().toISOString(),
    })
    .eq("tenant_id", ctx.tenant.tenantId)
    .eq("profissional_id", ctx.agendaId);

  // Falhar em gravar não impede a operação em curso: o token renovado vale ~1h.
  // Custa um refresh extra na próxima vez, e só.
  if (erroUpdate) console.warn("[google] token renovado mas não persistido", erroUpdate.message);

  return { token: novo.accessToken, email: data.google_email };
}

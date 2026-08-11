// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar — onde os tokens moram. ⚠️ SÓ SERVIDOR.
//
// Tabela `google_integracoes` no Supabase (DDL versionada em
// supabase/001_google_integracoes.sql — o arquivo é a verdade, não a prosa).
//
// Isolamento: usamos o cliente Supabase da SESSÃO do usuário (anon key + cookie),
// nunca uma service key. Com a RLS da tabela, o Postgres garante que ninguém lê ou
// escreve a linha de outro — não é uma checagem que o código precisa lembrar de
// fazer em toda rota. Os `.eq("user_id", …)` daqui são cinto E suspensório: hoje
// são redundantes com a RLS, e no dia em que `tenantId` deixar de ser igual a
// `usuarioId` eles são o lugar onde a regra nova entra.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@/adaptadores/saida/supabase/server";
import type { ContextoAgenda, ContextoTenant } from "@/nucleo/dominio/tenant";
import { FalhaDoProvedor, PrecisaReconectar } from "@/nucleo/dominio/erros";
import { cifrar, decifrar } from "./cripto";
import { renovar } from "./oauth";

const TABELA = "google_integracoes";

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
  const supabase = createClient();
  const { error } = await supabase.from(TABELA).upsert(
    {
      user_id: ctx.tenant.usuarioId,
      profissional_id: ctx.agendaId,
      google_email: i.googleEmail,
      access_token: cifrar(i.accessToken),
      refresh_token: cifrar(i.refreshToken),
      expira_em: i.expiraEm,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id,profissional_id" },
  );
  if (error) throw new FalhaDoProvedor(`Não foi possível salvar a conexão: ${error.message}`);
}

/** Quem já está conectado — só o que a UI precisa mostrar, nunca os tokens. */
export async function listar(t: ContextoTenant): Promise<{ profissionalId: string; googleEmail: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABELA)
    .select("profissional_id, google_email")
    .eq("user_id", t.usuarioId);
  if (error) return [];
  return (data ?? []).map((l: Pick<Linha, "profissional_id" | "google_email">) => ({
    profissionalId: l.profissional_id,
    googleEmail: l.google_email,
  }));
}

export async function apagar(ctx: ContextoAgenda): Promise<void> {
  const supabase = createClient();
  await supabase.from(TABELA).delete()
    .eq("user_id", ctx.tenant.usuarioId)
    .eq("profissional_id", ctx.agendaId);
}

/** Só o refresh token, decifrado — usado pelo desconectar para revogar no Google. */
export async function refreshTokenDe(ctx: ContextoAgenda): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from(TABELA)
    .select("refresh_token")
    .eq("user_id", ctx.tenant.usuarioId)
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
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABELA)
    .select("profissional_id, google_email, access_token, refresh_token, expira_em")
    .eq("user_id", ctx.tenant.usuarioId)
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
    .eq("user_id", ctx.tenant.usuarioId)
    .eq("profissional_id", ctx.agendaId);

  // Falhar em gravar não impede a operação em curso: o token renovado vale ~1h.
  // Custa um refresh extra na próxima vez, e só.
  if (erroUpdate) console.warn("[google] token renovado mas não persistido", erroUpdate.message);

  return { token: novo.accessToken, email: data.google_email };
}

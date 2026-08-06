// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar — onde os tokens moram. ⚠️ SÓ SERVIDOR.
//
// Tabela `google_integracoes` no Supabase (DDL versionada em supabase/001_google_integracoes.sql
// — o BIP não versiona a dele, o schema só existe em prosa na documentação).
//
// Isolamento: usamos o cliente Supabase da SESSÃO do usuário (anon key + cookie),
// não uma service key. Com a RLS da tabela, o Postgres garante que ninguém lê ou
// escreve a linha de outro — não é uma checagem que o código precisa lembrar de
// fazer em toda rota. O BIP usa service_role (que ignora RLS) e paga por isso: a
// auditoria dele lista IDOR entre tenants em cinco rotas diferentes, todas por
// esquecer um filtro que o banco poderia ter imposto sozinho.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/server";
import { cifrar, decifrar } from "./cripto";
import { renovar, PrecisaReconectar } from "./oauth";

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

/** Grava (ou atualiza) a conexão de um profissional. */
export async function salvar(i: Integracao & { userId: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABELA).upsert(
    {
      user_id: i.userId,
      profissional_id: i.profissionalId,
      google_email: i.googleEmail,
      access_token: cifrar(i.accessToken),
      refresh_token: cifrar(i.refreshToken),
      expira_em: i.expiraEm,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id,profissional_id" },
  );
  if (error) throw new Error(`Não foi possível salvar a conexão: ${error.message}`);
}

/** Quem já está conectado — só o que a UI precisa mostrar, nunca os tokens. */
export async function listar(): Promise<{ profissionalId: string; googleEmail: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABELA).select("profissional_id, google_email");
  if (error) return [];
  return (data ?? []).map((l: Pick<Linha, "profissional_id" | "google_email">) => ({
    profissionalId: l.profissional_id,
    googleEmail: l.google_email,
  }));
}

export async function apagar(profissionalId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from(TABELA).delete().eq("profissional_id", profissionalId);
}

/** Só o refresh token, decifrado — usado pelo desconectar para revogar no Google. */
export async function refreshTokenDe(profissionalId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from(TABELA)
    .select("refresh_token")
    .eq("profissional_id", profissionalId)
    .maybeSingle();
  if (!data?.refresh_token) return null;
  try {
    return decifrar(data.refresh_token);
  } catch {
    return null;
  }
}

/**
 * Devolve um access token VÁLIDO para o profissional, renovando e regravando se
 * estiver perto de expirar.
 *
 * O BIP delega o refresh à lib do Google e depois tenta adivinhar se houve renovação
 * comparando o token antes/depois, com atributos grudados no objeto do client
 * (`service._bip_original_token`) e uma função que precisa ser chamada à mão depois de
 * CADA operação — esquecer numa rota nova significa perder o token renovado. Aqui a
 * renovação é explícita e acontece num lugar só: quem quer falar com o Google passa
 * por esta função, e ela já deixa o banco em dia.
 *
 * Lança PrecisaReconectar quando o refresh token não vale mais.
 */
export async function acessoValido(profissionalId: string): Promise<{ token: string; email: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABELA)
    .select("profissional_id, google_email, access_token, refresh_token, expira_em")
    .eq("profissional_id", profissionalId)
    .maybeSingle<Linha>();

  if (error) throw new Error("Não foi possível ler a conexão com o Google.");
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
      await supabase.from(TABELA).delete().eq("profissional_id", profissionalId);
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
    .eq("profissional_id", profissionalId);

  // Falhar em gravar não impede a operação em curso: o token renovado vale ~1h.
  // Custa um refresh extra na próxima vez, e só.
  if (erroUpdate) console.warn("[google] token renovado mas não persistido", erroUpdate.message);

  return { token: novo.accessToken, email: data.google_email };
}

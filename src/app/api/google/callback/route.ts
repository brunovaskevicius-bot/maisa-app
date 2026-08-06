import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGoogleConfigured, redirectUri, caminhoDeVolta } from "@/lib/google/config";
import { lerEstado } from "@/lib/google/cripto";
import { trocarCodigo, emailDaConta } from "@/lib/google/oauth";
import { salvar } from "@/lib/google/integracoes";

// ─────────────────────────────────────────────────────────────────────────────
// Volta do consentimento do Google.
//
// Como o BIP: NUNCA responde JSON — o usuário chegou aqui navegando, então toda
// saída é um redirect de volta para a tela com `?google=ok` ou `?google=erro&motivo=…`.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_PKCE = "maisa_google_pkce";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  const state = searchParams.get("state") ?? "";
  const code = searchParams.get("code");
  const negado = searchParams.get("error");

  // O `volta` sai do state ASSINADO, não de um parâmetro solto: um redirect cujo
  // destino vem de query string crua é um open redirect esperando para acontecer.
  const e = lerEstado(state);
  const destino = caminhoDeVolta(e?.volta);
  const erro = (motivo: string) => NextResponse.redirect(`${origin}${destino}?google=erro&motivo=${motivo}`);

  // O cookie do PKCE some em qualquer saída — sucesso ou erro, ele já cumpriu o papel.
  const encerrar = (r: NextResponse) => {
    r.cookies.set(COOKIE_PKCE, "", { httpOnly: true, path: "/api/google", maxAge: 0 });
    return r;
  };

  if (!isGoogleConfigured) return encerrar(erro("nao_configurado"));
  if (negado) return encerrar(erro("permissao_negada"));
  if (!e) return encerrar(erro("sessao_expirada")); // state inválido, adulterado ou vencido
  if (!code) return encerrar(erro("sem_codigo"));

  // Confere que quem voltou é quem saiu. O state prova que NÓS emitimos o pedido;
  // esta checagem prova que a sessão do navegador é a mesma de lá.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== e.userId) return encerrar(erro("nao_autenticado"));

  const verifier = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${COOKIE_PKCE}=`))
    ?.slice(COOKIE_PKCE.length + 1);
  if (!verifier) return encerrar(erro("pkce_ausente"));

  try {
    const tokens = await trocarCodigo(code, redirectUri(origin), verifier);

    // Sem refresh token a conexão é inútil: o acesso morre em uma hora e não há como
    // renovar. O BIP grava string vazia aqui e redireciona com status=success — a UI
    // mostra "conectado", e só na primeira operação de agenda é que quebra. Preferimos
    // falhar agora, com um motivo que diz o que fazer.
    if (!tokens.refreshToken) return encerrar(erro("sem_refresh_token"));

    const email = await emailDaConta(tokens.accessToken);

    await salvar({
      userId: user.id,
      profissionalId: e.profissionalId,
      googleEmail: email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiraEm: tokens.expiraEm,
    });

    return encerrar(NextResponse.redirect(`${origin}${destino}?google=ok&pid=${e.profissionalId}`));
  } catch (err) {
    console.error("[google/callback] falha ao concluir a conexão", String(err));
    return encerrar(erro("falha_ao_conectar"));
  }
}

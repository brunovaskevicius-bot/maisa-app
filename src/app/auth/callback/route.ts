import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { caminhoDeVolta } from "@/lib/google/config";

// Callback do OAuth (Google) e de confirmação por e-mail: troca o `code` por uma sessão
// e redireciona pro destino. O Supabase manda pra cá após o login social.
//
// Toda saída de erro carrega um MOTIVO, não um "auth" genérico. A versão anterior
// mandava sempre `?error=auth` e a tela dizia "Tente de novo" — conselho inútil
// quando a causa é o provedor Google estar desligado no projeto, porque tentar de
// novo dá exatamente no mesmo. Custou duas rodadas de depuração às cegas.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // `next` vem da query string, então é entrada de terceiro: sem sanear, um
  // /auth/callback?next=//site-malicioso vira redirect para FORA do app — "//" é
  // protocol-relative e o navegador obedece. Mesma função que a integração do
  // Google usa, para não existirem duas regras de saneamento discordando.
  const destino = caminhoDeVolta(searchParams.get("next"));

  const erro = (motivo: string) => NextResponse.redirect(`${origin}/login?error=${motivo}`);

  // O Supabase devolve o fracasso na própria URL de volta. `error_description` é
  // texto que NÃO controlamos: vira um código nosso aqui e nunca chega crua à tela,
  // senão a query string passaria a escrever a mensagem que o usuário lê.
  const falhaOAuth = searchParams.get("error");
  if (falhaOAuth) {
    const descricao = searchParams.get("error_description") ?? "";
    if (/not enabled|unsupported provider/i.test(descricao)) return erro("provedor_desligado");
    if (falhaOAuth === "access_denied") return erro("permissao_negada");
    return erro("oauth");
  }

  if (!code) return erro("sem_codigo");

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return erro("troca_falhou");

  return NextResponse.redirect(`${origin}${destino}`);
}

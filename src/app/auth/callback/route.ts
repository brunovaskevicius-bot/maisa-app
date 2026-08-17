import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/adaptadores/saida/supabase/server";
import { caminhoDeVolta } from "@/adaptadores/saida/google/config";

// Callback do OAuth (Google) e de confirmação por e-mail: transforma o que veio na URL
// em sessão e redireciona pro destino. O Supabase manda pra cá após o login social.
//
// Toda saída de erro carrega um MOTIVO, não um "auth" genérico. A versão anterior
// mandava sempre `?error=auth` e a tela dizia "Tente de novo" — conselho inútil
// quando a causa é o provedor Google estar desligado no projeto, porque tentar de
// novo dá exatamente no mesmo. Custou duas rodadas de depuração às cegas.
//
// ── ⚠️ O SUPABASE MANDA A CONFIRMAÇÃO EM TRÊS FORMATOS, E ATÉ 17/08/2026 ESTA ROTA
//    SÓ ENTENDIA UM ──
//
// 1. `?code=` — PKCE. Exige o `code_verifier`, que vive num cookie do navegador QUE
//    INICIOU o cadastro. Funciona no mesmo browser e falha por construção quando a
//    pessoa abre o e-mail no celular e se cadastrou no computador.
// 2. `?token_hash=&type=` — o link de verificação por OTP. NÃO depende de verifier
//    nenhum, então atravessa aparelho. É o formato que o template de e-mail passa a
//    mandar quando ele usa `{{ .TokenHash }}`.
// 3. `#access_token=…` — fluxo implícito. O fragmento NUNCA chega ao servidor: esta
//    rota não tem como vê-lo, e por isso quem o resolve é `RecuperarSessaoDaUrl`, no
//    navegador. Está listado aqui porque a ausência dele nesta lista foi metade do
//    diagnóstico.
//
// O sintoma de só entender o primeiro não é uma tela de erro: é uma tela de LOGIN
// LIMPA, sem mensagem nenhuma. Quando o `code` não vem (ou não vira sessão), o
// navegador chega numa rota protegida sem cookie e o middleware o manda para `/login`
// com `?next=`, sem `?error=` — porque quem redirecionou não foi esta rota.
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

  const supabase = createClient();

  /* ── CAMINHO 2, E ELE VEM PRIMEIRO DE PROPÓSITO ──
   *
   * `token_hash` não depende do `code_verifier`, então é o único que funciona quando o
   * e-mail é aberto em outro aparelho. Quando os dois parâmetros chegam juntos, preferir
   * este troca uma falha garantida por um sucesso garantido. */
  const tokenHash = searchParams.get("token_hash");
  const tipoCru = searchParams.get("type");

  if (tokenHash && tipoCru) {
    /* ⚠️ `type` vem da query string, então é entrada de terceiro e NÃO vai cru para o
     * SDK. A lista é fechada: o tipo decide o que a verificação autoriza, e aceitar
     * qualquer string seria deixar a URL escolher isso. */
    const TIPOS: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
    const tipo = TIPOS.find((t) => t === tipoCru);
    if (!tipo) return erro("tipo_invalido");

    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (error) return erro("link_vencido");

    return NextResponse.redirect(`${origin}${destino}`);
  }

  if (!code) return erro("sem_codigo");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  /* ⚠️ ERRO AQUI QUASE SEMPRE SIGNIFICA "OUTRO NAVEGADOR", não "link vencido". O
   * `code_verifier` do PKCE mora num cookie do browser que começou o cadastro; abrir o
   * e-mail no celular é o caso comum, e não há conserto do lado do servidor — o link já
   * chegou sem o par dele. Por isso o motivo é próprio, e a tela manda entrar com e-mail
   * e senha em vez de pedir para clicar no link de novo (que daria no mesmo). */
  if (error) return erro("outro_navegador");

  return NextResponse.redirect(`${origin}${destino}`);
}

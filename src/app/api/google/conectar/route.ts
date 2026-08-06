import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGoogleConfigured, googleFaltando, redirectUri, caminhoDeVolta } from "@/lib/google/config";
import { assinarEstado, pkce } from "@/lib/google/cripto";
import { urlDeConsentimento, revogar } from "@/lib/google/oauth";
import { apagar, refreshTokenDe } from "@/lib/google/integracoes";
import * as D from "@/lib/data";

// ─────────────────────────────────────────────────────────────────────────────
// CONECTAR / DESCONECTAR a agenda Google de um profissional.
//
// GET    → manda o navegador para a tela de consentimento do Google
// DELETE → revoga no Google e apaga a conexão
//
// ⚠️ A regra mais importante deste arquivo: QUEM está conectando vem da SESSÃO,
// nunca da query string. O `profissionalId` vem da URL (é uma escolha de tela),
// mas o `user_id` vem do cookie do Supabase.
//
// Isso é a correção do bug mais grave da integração original. Lá, /auth/google/login
// aceitava staff_id e school_id como query params SEM autenticar o solicitante: bastava
// conhecer o id de uma vítima para gerar um state válido com o id dela, autorizar com a
// PRÓPRIA conta Google e o upsert (on_conflict=staff_id) sobrescrevia a integração da
// vítima. A agenda da escola passava a ser escrita no Google do atacante. Está corrigido
// no BIP hoje, mas o schema OAuthLoginParams ficou lá como fóssil da versão vulnerável.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cookie httpOnly com o verifier do PKCE. Vive só o tempo do consent. */
const COOKIE_PKCE = "maisa_google_pkce";

async function usuario() {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  // Saneado ANTES de qualquer uso — inclusive antes de entrar no state assinado, para
  // não assinar um destino ruim e ter que confiar na validação da outra ponta.
  const volta = caminhoDeVolta(searchParams.get("volta"));

  // Erros do GET voltam para a tela como query string — nunca JSON. O usuário está
  // navegando (não é fetch): despejar um JSON na cara dele seria um beco sem saída.
  const erro = (motivo: string) => NextResponse.redirect(`${origin}${volta}?google=erro&motivo=${motivo}`);

  if (!isGoogleConfigured) return erro("nao_configurado");

  const user = await usuario();
  if (isSupabaseConfigured && !user) return erro("nao_autenticado");

  // Sem Supabase o app roda como demo aberta — mas aí não há user_id para amarrar a
  // conexão, e gravar tokens do Google sem dono seria pior do que não conectar.
  if (!user) return erro("login_necessario");

  const profissionalId = searchParams.get("pid") ?? "";
  // Só ids de profissional que existem de verdade. Sem isso, a query string viraria
  // escrita livre na coluna profissional_id.
  if (!D.COLUNAS_AGENDA.includes(profissionalId)) return erro("profissional_invalido");

  const { verifier, challenge } = pkce();
  const state = assinarEstado({ userId: user.id, profissionalId, volta });

  const r = NextResponse.redirect(
    urlDeConsentimento({ redirectUri: redirectUri(origin), state, challenge }),
  );

  // O verifier fica no cookie, não no state: o state trafega na URL, entra no
  // histórico do navegador e nos logs do Google. Guardar o verifier ali (como o BIP
  // faz) entrega justamente o segredo que o PKCE existe para proteger.
  r.cookies.set(COOKIE_PKCE, verifier, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax", // "lax" porque o Google devolve o usuário por navegação GET
    path: "/api/google",
    maxAge: 300,
  });
  return r;
}

export async function DELETE(request: Request) {
  if (!isGoogleConfigured) {
    return NextResponse.json({ ok: false, status: "nao_configurado", faltando: googleFaltando() }, { status: 400 });
  }

  const user = await usuario();
  if (!user) return NextResponse.json({ ok: false, status: "nao_autenticado" }, { status: 401 });

  const profissionalId = new URL(request.url).searchParams.get("pid") ?? "";
  if (!D.COLUNAS_AGENDA.includes(profissionalId)) {
    return NextResponse.json({ ok: false, status: "profissional_invalido" }, { status: 400 });
  }

  // Revoga no Google ANTES de apagar a linha: depois de apagar não haveria mais como.
  // O BIP pula essa parte — o "desconectar" dele só apaga a linha do banco e o refresh
  // token segue válido no Google até o usuário ir tirar na mão em myaccount.google.com.
  const refresh = await refreshTokenDe(profissionalId);
  const revogado = refresh ? await revogar(refresh) : false;

  await apagar(profissionalId);

  return NextResponse.json({ ok: true, revogado });
}

import { NextResponse } from "next/server";
import { app, servicos } from "@/composicao";
import { barrou, exigirSessao } from "@/adaptadores/entrada/http/contexto";
import { createClient } from "@/adaptadores/saida/supabase/server";
import { isSupabaseConfigured } from "@/adaptadores/saida/supabase/config";
import { caminhoDeVolta, isGoogleConfigured, redirectUri } from "@/adaptadores/saida/google/config";
import { assinarEstado, pkce } from "@/adaptadores/saida/google/cripto";
import { urlDeConsentimento } from "@/adaptadores/saida/google/oauth";

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
// Isso é a correção do bug mais grave da integração original: lá, o login do OAuth
// aceitava os ids da vítima como query params SEM autenticar o solicitante — bastava
// conhecê-los para autorizar com a PRÓPRIA conta Google e o upsert sobrescrever a
// integração dela. A agenda da escola passava a ser escrita no Google do atacante.
//
// O GET fica fora do porteiro padrão porque suas saídas são REDIRECTS, não JSON: o
// usuário chegou aqui navegando, e despejar um JSON na cara dele seria um beco sem saída.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cookie httpOnly com o verifier do PKCE. Vive só o tempo do consent. */
const COOKIE_PKCE = "maisa_google_pkce";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  // Saneado ANTES de qualquer uso — inclusive antes de entrar no state assinado, para
  // não assinar um destino ruim e ter que confiar na validação da outra ponta.
  const volta = caminhoDeVolta(searchParams.get("volta"));

  const erro = (motivo: string) => NextResponse.redirect(`${origin}${volta}?google=erro&motivo=${motivo}`);

  if (!isGoogleConfigured) return erro("nao_configurado");

  // Sem Supabase o app roda como demo aberta — mas aí não há user_id para amarrar a
  // conexão, e gravar tokens do Google sem dono seria pior do que não conectar.
  if (!isSupabaseConfigured) return erro("login_necessario");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return erro("nao_autenticado");

  const tenant = { tenantId: user.id, usuarioId: user.id, ator: { tipo: "usuario" as const, id: user.id } };

  const profissionalId = searchParams.get("pid") ?? "";
  // Só agendas que existem de verdade neste inquilino. Sem isso, a query string viraria
  // escrita livre na coluna profissional_id.
  const permitidas = await servicos.negocio.agendasPermitidas(tenant);
  if (!permitidas.includes(profissionalId)) return erro("profissional_invalido");

  const { verifier, challenge } = pkce();
  const state = assinarEstado({ userId: user.id, profissionalId, volta });

  const r = NextResponse.redirect(
    urlDeConsentimento({ redirectUri: redirectUri(origin), state, challenge }),
  );

  // O verifier fica no cookie, não no state: o state trafega na URL, entra no
  // histórico do navegador e nos logs do Google. Guardar o verifier ali entregaria
  // justamente o segredo que o PKCE existe para proteger.
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
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const { revogado } = await app.desconectarAgenda(porteiro.tenant, {
      agendaId: new URL(request.url).searchParams.get("pid") ?? "",
    });
    return NextResponse.json({ ok: true, revogado });
  } catch {
    // A allowlist do desconectar é frouxa de propósito (ver o caso de uso); o que
    // sobra aqui é id fora do formato `pr…`.
    return NextResponse.json({ ok: false, status: "profissional_invalido" }, { status: 400 });
  }
}

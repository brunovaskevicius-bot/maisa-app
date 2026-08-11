// ─────────────────────────────────────────────────────────────────────────────
// Google OAuth 2.0 — Authorization Code + PKCE + refresh token. ⚠️ SÓ SERVIDOR.
//
// Sem SDK: a API de token do Google é um POST form-urlencoded, e o app já fala
// com a Focus NFe no `fetch` puro. Uma dependência a menos para auditar.
// ─────────────────────────────────────────────────────────────────────────────

import { GOOGLE, ESCOPOS } from "./config";
import { FalhaDoProvedor, PrecisaReconectar } from "@/nucleo/dominio/erros";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

/** Recusa do endpoint de token, com o código que o PRÓPRIO Google devolveu.
 *
 *  `codigo` é o campo `error` do corpo — enumeração fechada do RFC 6749
 *  (`invalid_client`, `invalid_grant`, `redirect_uri_mismatch`…), não texto livre,
 *  então dá para mapear numa mensagem nossa sem ecoar string de terceiro na tela.
 *  A distinção importa: "client secret errado" e "redirect URI que não bate" caem
 *  os dois em "recusado", e o conserto de um não tem nada a ver com o do outro. */
export class RecusaDoGoogle extends Error {
  constructor(public codigo: string) {
    super(`Google recusou a troca: ${codigo}`);
    this.name = "RecusaDoGoogle";
  }
}

/* ───────────────────────────── consent ───────────────────────────── */

export function urlDeConsentimento(opts: { redirectUri: string; state: string; challenge: string }): string {
  const p = new URLSearchParams({
    client_id: GOOGLE.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: ESCOPOS.join(" "),
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    // offline é o que faz o Google devolver refresh_token.
    access_type: "offline",
    // consent força a reemissão do refresh token. Sem isso, quem já autorizou uma vez
    // reconecta e NÃO recebe refresh_token de volta — foi exatamente a dor registrada
    // no log do BIP ("pode acontecer se o usuário já autorizou antes sem revogar").
    prompt: "consent",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

/* ───────────────────────────── tokens ───────────────────────────── */

export type Tokens = {
  accessToken: string;
  /** Ausente quando o Google decide não reemitir. Quem chama decide se isso é erro. */
  refreshToken?: string;
  /** Instante de expiração em ISO. */
  expiraEm: string;
};

function expiraEmISO(expiresIn: unknown): string {
  const s = typeof expiresIn === "number" ? expiresIn : 3600;
  // 60s de folga: melhor renovar cedo do que descobrir a expiração no meio da chamada.
  return new Date(Date.now() + (s - 60) * 1000).toISOString();
}

/** Troca o `code` do callback por tokens. */
export async function trocarCodigo(code: string, redirectUri: string, verifier: string): Promise<Tokens> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE.clientId,
      client_secret: GOOGLE.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });

  const d = await r.json().catch(() => ({}));
  // `d.error_description` também vem, e fica SÓ no log: é texto que o Google escreve,
  // e texto de terceiro não deve virar a frase que o usuário lê na nossa tela.
  if (!r.ok) {
    console.error("[google/oauth] troca recusada:", d.error, d.error_description ?? "");
    throw new RecusaDoGoogle(String(d.error ?? r.status));
  }

  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiraEm: expiraEmISO(d.expires_in),
  };
}

/**
 * Renova o access_token. `invalid_grant` significa que o usuário revogou o acesso
 * (ou trocou a senha, ou o token passou de 6 meses sem uso) — vira PrecisaReconectar,
 * para o app dizer "reconecte" em vez de "erro interno". Essa distinção não existe no
 * BIP: lá a revogação cai num `except Exception` e vira 500 genérico.
 */
export async function renovar(refreshToken: string): Promise<Tokens> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE.clientId,
      client_secret: GOOGLE.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (d.error === "invalid_grant") throw new PrecisaReconectar("O acesso ao Google foi revogado.");
    throw new FalhaDoProvedor(`Falha ao renovar o acesso: ${d.error ?? r.status}`);
  }

  return {
    accessToken: d.access_token,
    // Numa renovação o Google não reemite o refresh token: o antigo continua valendo.
    refreshToken: d.refresh_token,
    expiraEm: expiraEmISO(d.expires_in),
  };
}

/** E-mail da conta que autorizou — é o que a UI mostra em "conectado como". */
export async function emailDaConta(accessToken: string): Promise<string> {
  const r = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new FalhaDoProvedor("Não foi possível ler a conta do Google.");
  const d = await r.json();
  if (!d.email) throw new FalhaDoProvedor("A conta do Google não devolveu e-mail.");
  return d.email as string;
}

/**
 * Revoga o acesso no Google. O BIP não faz isso: o "desconectar" de lá só apaga a
 * linha do banco, e o refresh token segue válido no Google até o usuário ir lá tirar
 * na mão. Desconectar tem que desconectar de verdade.
 *
 * Não lança: se a revogação falhar, ainda queremos apagar a linha local.
 */
export async function revogar(token: string): Promise<boolean> {
  try {
    const r = await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

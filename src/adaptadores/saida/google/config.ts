// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar — configuração. ⚠️ SÓ SERVIDOR.
//
// Mesma regra da Focus NFe (ver adaptadores/saida/focus/config.ts): nenhuma variável daqui
// tem prefixo NEXT_PUBLIC_, então o client_secret nunca chega ao navegador.
// Este módulo só pode ser importado de /app/api/**.
//
// Diferença deliberada em relação ao BIP (o projeto de onde a integração veio):
// lá, se a chave de criptografia faltasse, o sistema subia em "degraded mode" e
// gravava refresh_token em TEXTO PURO no banco, só com um warning no log — e a
// chave nem estava documentada no .env.example. Aqui não existe esse meio-termo:
// sem GOOGLE_TOKEN_KEY a integração fica DESLIGADA. Ou está tudo configurado e
// os tokens são cifrados, ou o botão de conectar nem aparece.
// ─────────────────────────────────────────────────────────────────────────────

const env = process.env;

/** Vercel guarda o valor cru: é comum colar com aspas ou espaço. Mesmo clean() da config fiscal. */
const clean = (v?: string): string => (v ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();

export const GOOGLE = {
  clientId: clean(env.GOOGLE_CLIENT_ID),
  clientSecret: clean(env.GOOGLE_CLIENT_SECRET),
  /** Chave de 32 bytes em base64 para cifrar os tokens (AES-256-GCM). */
  tokenKey: clean(env.GOOGLE_TOKEN_KEY),
  /** Opcional: força a redirect_uri. Vazio ⇒ derivada da origem do request. */
  redirectUri: clean(env.GOOGLE_REDIRECT_URI) || undefined,
};

/**
 * Escopos pedidos no consent.
 *
 * `calendar.events` em vez do `calendar` amplo que o BIP usa: dá exatamente o que
 * precisamos (criar/editar/apagar eventos, com Meet) e nada além — não lê a lista
 * de calendários, não mexe em configurações. Menos escopo = tela de consentimento
 * menos assustadora e menos estrago se um token vazar.
 */
export const ESCOPOS = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

/** Nomes das variáveis que faltam — para a UI dizer o que falta, sem adivinhação. */
const OBRIGATORIAS: [string, string][] = [
  ["GOOGLE_CLIENT_ID", GOOGLE.clientId],
  ["GOOGLE_CLIENT_SECRET", GOOGLE.clientSecret],
  ["GOOGLE_TOKEN_KEY", GOOGLE.tokenKey],
];

/** A chave precisa ser 32 bytes em base64 — "não-vazia" não basta.
 *  Com uma chave torta, `isGoogleConfigured` diria "sim" e o erro só apareceria lá
 *  dentro do `crypto`, virando uma página de erro 500 em vez do redirect explicando
 *  que falta configuração. */
const chaveValida = (() => {
  try {
    return Buffer.from(GOOGLE.tokenKey, "base64").length === 32;
  } catch {
    return false;
  }
})();

export const isGoogleConfigured = OBRIGATORIAS.every(([, v]) => Boolean(v)) && chaveValida;

export function googleFaltando(): string[] {
  const faltam = OBRIGATORIAS.filter(([, v]) => !v).map(([nome]) => nome);
  if (GOOGLE.tokenKey && !chaveValida) faltam.push("GOOGLE_TOKEN_KEY (precisa ser 32 bytes em base64)");
  return faltam;
}

/**
 * A redirect_uri precisa bater CARACTERE A CARACTERE com a cadastrada no Google Cloud.
 * Derivar da origem do request (em vez de uma env solta) evita a classe de bug que o
 * BIP tem: lá o FRONTEND_URL aceita lista separada por vírgula para o CORS, e a mesma
 * string é interpolada crua no redirect — com duas URLs configuradas, o retorno do
 * consent vira uma URL inválida.
 */
export function redirectUri(origin: string): string {
  return GOOGLE.redirectUri ?? `${origin}/api/google/callback`;
}

/**
 * Saneia o caminho de retorno pós-consent.
 *
 * Só aceita caminho relativo à raiz. Um `startsWith("/")` sozinho deixaria passar
 * `//evil.com` e `/\evil.com`: hoje eles resolvem para dentro da própria origem,
 * mas dependem de como cada parser de URL trata o prefixo — é fino demais para
 * apostar num redirect. Qualquer coisa fora do formato vira "/".
 */
export function caminhoDeVolta(volta: string | null | undefined): string {
  const v = volta ?? "";
  if (!v.startsWith("/")) return "/";
  if (v.startsWith("//") || v.startsWith("/\\")) return "/";
  return v;
}

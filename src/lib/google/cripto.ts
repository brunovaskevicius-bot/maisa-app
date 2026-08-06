// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar — criptografia dos tokens e assinatura do `state`. ⚠️ SÓ SERVIDOR.
//
// Tudo com o `crypto` nativo do Node: nenhuma dependência nova. O app inteiro é
// assim (a Focus NFe monta o Basic auth na mão, sem SDK), então seguimos igual.
// ─────────────────────────────────────────────────────────────────────────────

import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash, timingSafeEqual } from "crypto";
import { GOOGLE } from "./config";

/* ───────────────────────────── tokens (AES-256-GCM) ───────────────────────────── */

/** A chave de 32 bytes. Lança se estiver ausente/torta — quem chama já checou isGoogleConfigured. */
function chave(): Buffer {
  const k = Buffer.from(GOOGLE.tokenKey, "base64");
  if (k.length !== 32) {
    throw new Error("GOOGLE_TOKEN_KEY precisa ser 32 bytes em base64. Gere com: openssl rand -base64 32");
  }
  return k;
}

/**
 * Cifra um token para guardar no banco. Formato: `v1.<iv>.<tag>.<dados>` em base64url.
 * O prefixo de versão existe para permitir trocar de algoritmo depois sem adivinhar
 * o formato do que já está gravado.
 */
export function cifrar(valor: string): string {
  const iv = randomBytes(12); // GCM: 96 bits é o tamanho recomendado
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(valor, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), dados.toString("base64url")].join(".");
}

/**
 * Decifra. Ao contrário do BIP — que, se a decifragem falhasse, devolvia o valor BRUTO
 * e só logava —, aqui o erro sobe. Devolver lixo cifrado como se fosse um token faz o
 * Google responder 401 e o app culpar "autorização expirada", escondendo o problema real
 * (chave trocada/perdida). Falhar aqui é o comportamento honesto.
 */
export function decifrar(valor: string): string {
  const [versao, iv64, tag64, dados64] = valor.split(".");
  if (versao !== "v1" || !iv64 || !tag64 || !dados64) {
    throw new Error("Token cifrado em formato desconhecido.");
  }
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv64, "base64url"));
  d.setAuthTag(Buffer.from(tag64, "base64url"));
  return Buffer.concat([d.update(Buffer.from(dados64, "base64url")), d.final()]).toString("utf8");
}

/* ───────────────────────────── state (HMAC-SHA256) ───────────────────────────── */

export type Estado = {
  /** Usuário logado no Supabase que iniciou o fluxo. */
  userId: string;
  /** Profissional cuja agenda está sendo conectada (pr1, pr2, pr3…). */
  profissionalId: string;
  /** Para onde voltar no app depois do consent. */
  volta: string;
  /** Emissão, em segundos. */
  iat: number;
};

const VALIDADE_S = 300; // 5 min, igual ao BIP

/** Segredo do state: derivado da chave de tokens, para não exigir mais uma env var. */
const segredoState = () => createHash("sha256").update(chave()).update("state-v1").digest();

/**
 * Assina o state. Ele é anti-CSRF e carrega a identidade — mas NÃO carrega o
 * `code_verifier` do PKCE, como o BIP faz. O state trafega em query string, aparece
 * no histórico do navegador e nos logs do Google; guardar o verifier ali entrega
 * justamente o segredo que o PKCE existe para proteger. Aqui ele vai num cookie
 * httpOnly (ver rota /api/google/conectar).
 */
export function assinarEstado(e: Omit<Estado, "iat">): string {
  const corpo = Buffer.from(JSON.stringify({ ...e, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const mac = createHmac("sha256", segredoState()).update(corpo).digest("base64url");
  return `${corpo}.${mac}`;
}

/** Valida assinatura e expiração. Devolve null em qualquer problema — quem chama redireciona com erro. */
export function lerEstado(state: string): Estado | null {
  // Exatamente dois segmentos: o HMAC cobre só `corpo`, então "corpo.mac.lixo"
  // validaria com um pedaço extra pendurado. Inofensivo hoje, mas é gratuito recusar.
  const partes = (state ?? "").split(".");
  if (partes.length !== 2) return null;
  const [corpo, mac] = partes;
  if (!corpo || !mac) return null;

  const esperado = createHmac("sha256", segredoState()).update(corpo).digest();
  const recebido = Buffer.from(mac, "base64url");
  // Comparação em tempo constante; timingSafeEqual exige mesmo tamanho.
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null;

  try {
    const e = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as Estado;
    if (Math.floor(Date.now() / 1000) - e.iat > VALIDADE_S) return null;
    return e;
  } catch {
    return null;
  }
}

/* ───────────────────────────── PKCE ───────────────────────────── */

/** Par verifier/challenge (S256) do PKCE. O verifier vai para um cookie httpOnly. */
export function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

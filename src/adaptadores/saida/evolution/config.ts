/* ─────────────────────────────────────────────────────────────────────────────
 * EVOLUTION API — configuração. ⚠️ SÓ SERVIDOR.
 *
 * Mesma regra do Google e da Focus: nenhuma variável daqui tem prefixo NEXT_PUBLIC_,
 * porque a `apikey` da Evolution é uma credencial de escrita — quem a tem manda mensagem
 * pelo WhatsApp do negócio, para qualquer número, sem passar por nós.
 *
 * DOIS TOKENS EXISTEM NA EVOLUTION, e misturá-los é o erro de estreia mais comum:
 *   • token GLOBAL (`AUTHENTICATION_API_KEY` do servidor) — cria e apaga instância;
 *   • token da INSTÂNCIA (o `hash` que volta do `/instance/create`) — manda mensagem.
 *
 * Aqui queremos o da INSTÂNCIA. O global também funcionaria para mandar mensagem, e é
 * justamente por isso que ele não deve ser usado: um vazamento passaria de "mandaram
 * mensagem pelo número do negócio" para "apagaram todas as instâncias do servidor".
 * ────────────────────────────────────────────────────────────────────────────── */

const env = process.env;

/** A Vercel guarda o valor cru: é comum colar com aspas ou espaço. Mesmo clean() da
 *  config fiscal e da do Google. */
const clean = (v?: string): string => (v ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();

export const EVOLUTION = {
  /** Raiz do servidor, sem barra no fim: `https://evo.seudominio.com`. */
  baseUrl: clean(env.EVOLUTION_API_URL).replace(/\/+$/, ""),
  /** Token da instância (o `hash` do `/instance/create`). Vai no header `apikey`. */
  apiKey: clean(env.EVOLUTION_API_KEY),
  /** Nome da instância — é ele que entra no path de TODA chamada e é o identificador
   *  que o webhook devolve em `instance`. Ver `entrada/whatsapp/contexto.ts`. */
  instancia: clean(env.EVOLUTION_INSTANCIA),
  /**
   * Número pessoal do dono, para onde vai a escalação ("preciso de você nessa
   * conversa"). OPCIONAL: sem ele, escalar só escreve no log do servidor — o
   * atendimento não para, mas ninguém é avisado.
   */
  dono: clean(env.MAISA_WHATSAPP_DONO),
  /**
   * Teto por chamada. 15s é generoso para um POST de texto e curto o bastante para não
   * segurar o webhook até a função serverless morrer — quando o timeout da plataforma
   * chega primeiro, não sobra log nosso e a falha fica sem explicação.
   */
  timeoutMs: Number(clean(env.EVOLUTION_TIMEOUT_MS)) || 15_000,
};

/** Nomes das variáveis que faltam — para a rota dizer o que falta, sem adivinhação. */
const OBRIGATORIAS: [string, string][] = [
  ["EVOLUTION_API_URL", EVOLUTION.baseUrl],
  ["EVOLUTION_API_KEY", EVOLUTION.apiKey],
  ["EVOLUTION_INSTANCIA", EVOLUTION.instancia],
];

/** `http://` colado sem esquema é o erro de digitação que produz o pior sintoma:
 *  `fetch` falha com "Failed to parse URL", que não parece falta de configuração. */
const urlValida = /^https?:\/\/[^\s/]+/.test(EVOLUTION.baseUrl);

/**
 * Está tudo configurado? É isto que `composicao.ts` consulta para decidir entre mandar
 * WhatsApp de verdade e escrever no log (`canalDemo`).
 *
 * Note o que a MAISA faz quando isto é `false`: ela **continua respondendo** — a rota
 * devolve as bolhas no corpo e o log mostra o que teria sido enviado. Um agente que só
 * roda com número contratado é um agente que ninguém afina antes de pagar.
 */
export const isEvolutionConfigured = OBRIGATORIAS.every(([, v]) => Boolean(v)) && urlValida;

export function evolutionFaltando(): string[] {
  const faltam = OBRIGATORIAS.filter(([, v]) => !v).map(([nome]) => nome);
  if (EVOLUTION.baseUrl && !urlValida) faltam.push("EVOLUTION_API_URL (precisa começar com http:// ou https://)");
  return faltam;
}

/**
 * Problemas que não impedem funcionar, mas que alguém precisa ver.
 *
 * `http://` não é bloqueado porque Evolution auto-hospedada em rede interna é caso
 * legítimo. Mas em produção, na internet aberta, significa que a `apikey` e o texto das
 * conversas dos clientes viajam em claro — e isso não pode passar sem ninguém dizer.
 */
export function evolutionAvisos(): string[] {
  const avisos: string[] = [];
  if (EVOLUTION.baseUrl.startsWith("http://") && process.env.NODE_ENV === "production") {
    avisos.push("EVOLUTION_API_URL usa http:// em produção — a apikey e as mensagens dos clientes viajam sem cifra.");
  }
  if (!EVOLUTION.dono) {
    avisos.push("MAISA_WHATSAPP_DONO vazio — quando o agente escalar, ninguém é avisado (só fica no log).");
  }
  return avisos;
}

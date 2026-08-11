/* ─────────────────────────────────────────────────────────────────────────────
 * Cliente HTTP da Evolution API (v2). ⚠️ SÓ SERVIDOR.
 * Doc: https://doc.evolution-api.com/v2/  ·  Auth: header `apikey: <token>`
 *
 * Todas as rotas terminam com o nome da instância no PATH:
 *   POST /message/sendText/{instancia}
 *   POST /chat/sendPresence/{instancia}
 *   GET  /instance/connectionState/{instancia}
 *
 * Este arquivo faz duas coisas e nada além: fala HTTP e traduz falha da Evolution para
 * erro de domínio. Quem decide o que mandar é `canal-evolution.ts`.
 *
 * A TRADUÇÃO DE ERRO É A PARTE QUE IMPORTA. `LimiteDoProvedor` significa, no vocabulário
 * do `dominio/erros.ts`, "transitório, pergunte de novo" — e o agente confia nisso: ao
 * receber esse erro numa ferramenta, ele CHAMA DE NOVO (ver `comoFrase` em
 * `entrada/whatsapp/ferramentas.ts`). Classificar um envio como transitório quando ele
 * pode ter sido entregue faria o cliente receber a mesma mensagem duas vezes. Por isso
 * o critério aqui é "a Evolution disse que não processou", nunca "deu ruim".
 * ────────────────────────────────────────────────────────────────────────────── */

import {
  ErroDeDominio, FalhaDoProvedor, LimiteDoProvedor, NaoConfigurado, PrecisaReconectar,
} from "@/nucleo/dominio/erros";
import { EVOLUTION, evolutionFaltando, isEvolutionConfigured } from "./config";

export type RespostaCrua = { status: number; data: any };

/**
 * A Evolution reporta erro em três formatos diferentes, dependendo de onde ele nasceu
 * (validação do DTO, exceção do controller, erro do Baileys). Procuramos nos três
 * porque a mensagem dela costuma ser a única pista útil — "Bad Request" sozinho não
 * distingue "número não existe no WhatsApp" de "instância desconectada".
 */
function mensagemDeErro(data: any, status: number): string {
  const bruta =
    data?.response?.message ?? data?.message ?? data?.error ?? data?.response?.error ?? null;

  const texto = Array.isArray(bruta)
    ? bruta.map((m) => (typeof m === "string" ? m : JSON.stringify(m))).join("; ")
    : typeof bruta === "string"
      ? bruta
      : bruta
        ? JSON.stringify(bruta)
        : "";

  return texto || `Evolution respondeu ${status} sem detalhe.`;
}

/**
 * Chamada crua: devolve status e corpo, e **só lança em falha de rede**.
 *
 * Existe separada de `exigir()` porque a rota de diagnóstico precisa MOSTRAR o 401 em
 * vez de virar uma exceção — quando o problema é a credencial, o texto da Evolution é
 * exatamente o que a pessoa precisa ler.
 */
export async function chamar(
  caminho: string,
  opts: { metodo?: "GET" | "POST" | "PUT" | "DELETE"; corpo?: unknown; timeoutMs?: number } = {},
): Promise<RespostaCrua> {
  if (!isEvolutionConfigured) throw new NaoConfigurado(evolutionFaltando());

  const { metodo = "POST", corpo, timeoutMs = EVOLUTION.timeoutMs } = opts;

  /* AbortController em vez de `AbortSignal.timeout`: o `clearTimeout` no `finally`
   * garante que o timer não segure o event loop depois de a resposta chegar — numa
   * função serverless, timer pendente é invocação que não encerra. */
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(`${EVOLUTION.baseUrl}${caminho}`, {
      method: metodo,
      headers: {
        apikey: EVOLUTION.apiKey,
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: ac.signal,
      // Nunca cachear: são chamadas de efeito. O Next cacheia fetch por padrão no
      // App Router, e um POST de mensagem servido do cache seria uma mensagem não enviada.
      cache: "no-store",
    });

    /* ⚠️ CONFERIR QUE A RESPOSTA É JSON, e não só que o status foi 200.
     *
     * Isto não é paranoia — foi um erro real na primeira configuração: a
     * `EVOLUTION_API_URL` apontava para o serviço do **n8n** no mesmo Easypanel (o
     * projeto tem os dois). O n8n devolve o HTML do frontend dele para qualquer caminho
     * desconhecido, com **HTTP 200**. Sem esta checagem, `res.json()` falhava, virava
     * `{}`, o status 200 dizia "deu certo", e a rota de diagnóstico informava
     * `estado: "desconhecido"` — a única mensagem que NÃO ajuda a descobrir que o
     * problema era a URL do serviço errado.
     *
     * Vale para qualquer intermediário que responda HTML: página de login de proxy,
     * captive portal, tela de erro de CDN. Todos dão 200 e nenhum é a Evolution. */
    const tipo = res.headers.get("content-type") ?? "";
    const cru = await res.text();

    if (!tipo.includes("json")) {
      const parece = /n8n/i.test(cru) ? " (a resposta parece ser do n8n)" : "";
      throw new FalhaDoProvedor(
        `${EVOLUTION.baseUrl} respondeu "${tipo || "sem content-type"}" em vez de JSON${parece}. ` +
          `Isso não é um servidor Evolution: confira se EVOLUTION_API_URL é o domínio do serviço da Evolution ` +
          `(Easypanel → serviço evolution-api → Domains), e não de outro serviço do mesmo projeto.`,
      );
    }

    let data: any = {};
    try {
      data = cru ? JSON.parse(cru) : {};
    } catch {
      throw new FalhaDoProvedor(`A Evolution respondeu JSON inválido (${res.status}): ${cru.slice(0, 200)}`);
    }

    return { status: res.status, data };
  } catch (e) {
    /* Erro de domínio que nasceu ACIMA (resposta não-JSON, JSON inválido) passa direto.
     * Sem esta linha, o `catch` de rede engoliria a mensagem específica — "isso não é um
     * servidor Evolution" — e a substituiria por "não foi possível falar com a
     * Evolution", que descreve o sintoma errado e manda procurar no lugar errado. */
    if (e instanceof ErroDeDominio) throw e;

    /* Timeout e queda de rede caem aqui, e os dois são AMBÍGUOS: a mensagem pode ter
     * sido entregue e só a resposta ter se perdido. `FalhaDoProvedor` (terminal) e não
     * `LimiteDoProvedor` (transitório) exatamente por isso — ver o cabeçalho. */
    const abortou = e instanceof Error && e.name === "AbortError";
    throw new FalhaDoProvedor(
      abortou
        ? `A Evolution não respondeu em ${timeoutMs}ms. A mensagem pode ter sido enviada — não repita automaticamente.`
        : `Não foi possível falar com a Evolution em ${EVOLUTION.baseUrl}.`,
      e,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Status HTTP que significam "não processei" — os únicos seguros para repetir. */
export function ehTransitorio(status: number): boolean {
  // 429: recusou por cota, não entregou.
  // 502/503/504: o proxy respondeu, a Evolution não recebeu.
  // 500 fica FORA de propósito: erro dentro da Evolution pode ser depois do envio.
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Chamada que exige sucesso: devolve o corpo ou lança erro de domínio.
 *
 * O mapeamento de status é decisão de produto disfarçada de código:
 *   401/403 → `NaoConfigurado`: credencial errada não se resolve tentando de novo, e
 *             não é "reconectar o WhatsApp" — é variável de ambiente errada.
 *   404     → `PrecisaReconectar`: a instância não existe no servidor. A ação que
 *             resolve é humana (recriar/reconectar), e é o mesmo status que a agenda
 *             do Google usa para pedir a mesma coisa — a UI já sabe oferecer o botão.
 */
export async function exigir(
  caminho: string,
  opts: { metodo?: "GET" | "POST" | "PUT" | "DELETE"; corpo?: unknown; timeoutMs?: number } = {},
): Promise<any> {
  const { status, data } = await chamar(caminho, opts);
  if (status >= 200 && status < 300) return data;

  const msg = mensagemDeErro(data, status);

  if (status === 401 || status === 403) {
    throw new NaoConfigurado([`EVOLUTION_API_KEY (a Evolution recusou: ${msg})`]);
  }
  if (status === 404) {
    throw new PrecisaReconectar(
      `A instância "${EVOLUTION.instancia}" não existe nesse servidor Evolution (ou o caminho ${caminho} não existe nessa versão).`,
    );
  }
  if (ehTransitorio(status)) {
    throw new LimiteDoProvedor(`A Evolution está indisponível no momento (${status}): ${msg}`);
  }

  /* ⚠️ INSTÂNCIA NÃO PAREADA. Medido contra a Evolution 2.3.7: com a instância em
   * `state: "close"`, o `sendText` responde **HTTP 500** com
   * `{"response":{"message":"Connection Closed"}}`.
   *
   * 500 sugere "erro interno deles", mas não é: é o WhatsApp desconectado, e o conserto é
   * HUMANO — alguém tem que ler o QR Code no manager. É a definição de
   * `PrecisaReconectar` (ver `dominio/erros.ts`), e classificar assim tem dois efeitos
   * concretos: a rota de diagnóstico passa a responder 409 `status: "reconectar"` (que a
   * UI já sabe tratar com um botão, em vez de 502 "erro"), e o agente avisa o DONO em vez
   * de dizer ao cliente que deu problema técnico.
   *
   * Casamos pelo texto, não pelo 500 puro: um 500 de verdade da Evolution não deve virar
   * "reconecte", ou o dono passa a ler QR Code para resolver bug de servidor. */
  if (/connection closed|connection lost|not connected|close(d)? state/i.test(msg)) {
    throw new PrecisaReconectar(
      `A instância "${EVOLUTION.instancia}" não está conectada ao WhatsApp ("${msg}"). ` +
        `Abra ${EVOLUTION.baseUrl}/manager, entre na instância e leia o QR Code.`,
    );
  }

  throw new FalhaDoProvedor(`Evolution ${status}: ${msg}`);
}

/* ───────────────────────────── as chamadas que usamos ─────────────────────────────
 * Só quatro. Cada endpoint a mais é superfície que alguém tem que manter alinhada com
 * uma API que muda de versão em versão — e a MAISA conversa por texto. */

const inst = () => encodeURIComponent(EVOLUTION.instancia);

/**
 * Manda texto. `number` é DDI+DDD+número em DÍGITOS PUROS ("5511988887777"): a Evolution
 * acrescenta o `@s.whatsapp.net`. Mandar o JID pronto funciona em algumas versões e
 * falha silenciosamente em outras — dígitos é o formato documentado.
 *
 * `delay` pausa o envio DENTRO da Evolution (ela segura a requisição). É o que dá ritmo
 * de conversa às bolhas; ver `canal-evolution.ts`.
 */
export function enviarTexto(p: { numero: string; texto: string; delayMs?: number }): Promise<any> {
  return exigir(`/message/sendText/${inst()}`, {
    corpo: {
      number: p.numero,
      text: p.texto,
      ...(p.delayMs ? { delay: p.delayMs } : {}),
      /* Sem prévia de link, sempre. A prévia depende de a Evolution baixar a URL, o que
       * atrasa o envio, e num agendamento a única URL que aparece é o Meet — cuja prévia
       * é uma caixa cinza sem informação. */
      linkPreview: false,
    },
  });
}

/**
 * "digitando…" por `delayMs`. Disponível, mas fora do caminho normal de envio — ver a
 * nota em `canal-evolution.ts` sobre por que o ritmo vem do `delay` do sendText.
 *
 * Corpo PLANO. Em versões antigas a doc mostrava tudo dentro de `options`, e é erro
 * conhecido (evolution-api#1107): mandar aninhado devolve 400 de validação.
 */
export function sinalizarDigitando(p: { numero: string; delayMs: number }): Promise<any> {
  return exigir(`/chat/sendPresence/${inst()}`, {
    corpo: { number: p.numero, delay: p.delayMs, presence: "composing" },
  });
}

/** Estado do pareamento: `open` (conectado), `connecting`, `close`. */
export async function estadoDaInstancia(): Promise<{ estado: string; cru: any }> {
  const data = await exigir(`/instance/connectionState/${inst()}`, { metodo: "GET" });
  return { estado: String(data?.instance?.state ?? data?.state ?? "desconhecido"), cru: data };
}

/**
 * Aponta o webhook da instância para o nosso app. Chamada de OPERAÇÃO, não de conversa:
 * roda uma vez por instância (ou quando a URL do app muda).
 *
 * `headers.apikey` é o que faz a autenticação da nossa rota funcionar: a Evolution
 * repassa esses headers em cada POST, então ela passa a provar quem é (ver o header
 * `apikey` conferido em `app/api/whatsapp/route.ts`).
 *
 * `events` com UM item de propósito. Assinar tudo faz a Evolution nos entregar recibo de
 * entrega, "digitando" do cliente e presença — dezenas de POST por conversa, todos
 * descartados, cada um uma invocação paga.
 *
 * ⚠️ O nome do evento aqui é `MESSAGES_UPSERT` (maiúsculo), mas o que chega no corpo do
 * webhook é `messages.upsert` (minúsculo, com ponto). A Evolution é inconsistente nisso
 * — o normalizador aceita as duas grafias.
 */
export function configurarWebhook(p: { url: string; segredo: string }): Promise<any> {
  return exigir(`/webhook/set/${inst()}`, {
    corpo: {
      webhook: {
        enabled: true,
        url: p.url,
        headers: { apikey: p.segredo, "Content-Type": "application/json" },
        /* `byEvents: false` — com `true`, a Evolution acrescenta o nome do evento ao
         * path (`/api/whatsapp/messages-upsert`), e a nossa rota deixaria de existir. */
        byEvents: false,
        /* Não pedimos mídia em base64: a MAISA lê texto, e um áudio de 2 MB embutido no
         * JSON é payload que atravessa a rede para ser descartado. */
        base64: false,
        events: ["MESSAGES_UPSERT"],
      },
    },
  });
}

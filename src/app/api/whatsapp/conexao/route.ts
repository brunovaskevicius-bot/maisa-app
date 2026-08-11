import { NextResponse } from "next/server";
import { modoDaLista, SEGREDO } from "@/adaptadores/entrada/whatsapp/contexto";
import { agenteConfigurado } from "@/composicao";
import { EVOLUTION, evolutionAvisos, evolutionFaltando, isEvolutionConfigured } from "@/adaptadores/saida/evolution/config";
import { configurarWebhook, estadoDaInstancia } from "@/adaptadores/saida/evolution/cliente";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// CONEXÃO COM A EVOLUTION — diagnóstico e instalação do webhook.
//
// GET  → o que está configurado e se a instância está pareada com o WhatsApp
// POST → aponta o webhook da instância para ESTE app
//
// Rota de OPERAÇÃO, não de conversa. Existe porque a alternativa é decorar dois `curl`
// com o path da instância no meio — e porque a pergunta "por que a MAISA não respondeu?"
// tem cinco respostas possíveis (env faltando, instância caída, webhook apontando para o
// deploy antigo, segredo diferente, evento não assinado) que ninguém distingue no escuro.
//
// AUTENTICAÇÃO: o mesmo segredo do webhook, e não a sessão do painel. Não é atalho —
// é a fronteira certa: quem tem esse segredo já pode se passar pela Evolution e fazer a
// MAISA marcar horário, então poder ler o estado da instância não adiciona privilégio
// nenhum. Amarrar isto à sessão do Supabase criaria uma dependência de login numa rota
// cuja função é justamente diagnosticar ambiente onde nada mais funciona.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mesma leitura de segredo da rota do webhook: `apikey` (Evolution) ou Bearer (curl). */
function autorizado(request: Request): boolean {
  if (!SEGREDO) return false;
  const enviado =
    request.headers.get("apikey") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return enviado === SEGREDO;
}

/** O retrato do ambiente, sem segredo nenhum dentro. */
function configuracao() {
  return {
    /* Nunca o valor: só se existe. Uma rota de diagnóstico que devolve credencial é uma
     * rota de diagnóstico que vira vazamento no primeiro print de tela em grupo. */
    segredoWebhook: SEGREDO ? "definido" : "FALTANDO",
    /* "modelo" e não "anthropic": o agente fala com a porta `ModeloDeConversa` e hoje
     * atende Gemini OU Anthropic (ver `composicao.ts`). Nomear o provedor aqui faria o
     * diagnóstico dizer "anthropic: definido" num ambiente que roda Gemini. */
    modelo: agenteConfigurado() ? "definido" : "FALTANDO",
    evolution: {
      configurada: isEvolutionConfigured,
      faltando: evolutionFaltando(),
      avisos: evolutionAvisos(),
      baseUrl: EVOLUTION.baseUrl || null,
      instancia: EVOLUTION.instancia || null,
      apiKey: EVOLUTION.apiKey ? "definida" : "FALTANDO",
      escalaPara: EVOLUTION.dono || null,
    },
    tenant: {
      tenantId: process.env.MAISA_TENANT_ID ? "definido" : "FALTANDO",
      numero: process.env.MAISA_WHATSAPP_NUMERO || null,
    },
    /* O modo da allowlist é o dado mais importante desta resposta em produção, e o único
     * que não dá para inferir de fora: `"todos"` significa que qualquer pessoa que mande
     * mensagem para o número é atendida pela IA. Fica visível para ser conferido de
     * propósito — fail-open que ninguém consegue ver é fail-open esquecido. */
    quemPodeFalar: modoDaLista(),
  };
}

export async function GET(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ ok: false, erro: "nao_autorizado" }, { status: 401 });

  const cfg = configuracao();
  if (!isEvolutionConfigured) {
    // 200 e não 503: a resposta é a informação pedida. Quem chamou quer saber o que
    // falta, e um status de erro faria o cliente HTTP esconder justamente a lista.
    return NextResponse.json({ ok: true, conectado: false, motivo: "evolution_nao_configurada", ...cfg });
  }

  try {
    const { estado, cru } = await estadoDaInstancia();
    return NextResponse.json({
      ok: true,
      /* `open` é o único estado em que a MAISA consegue responder. `connecting` e `close`
       * significam QR Code para ler — e é um humano com o celular na mão que resolve. */
      conectado: estado === "open",
      estado,
      ...cfg,
      cru,
    });
  } catch (e) {
    return falha("api/whatsapp/conexao", e);
  }
}

/**
 * Instala o webhook na instância.
 *
 * A URL é derivada da origem do request (mesmo padrão do `redirectUri` do Google), com
 * override por `{ "url": "..." }` no corpo para quando o app está atrás de proxy e a
 * origem interna não é a pública. Idempotente: rodar de novo só reescreve o mesmo valor.
 */
export async function POST(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ ok: false, erro: "nao_autorizado" }, { status: 401 });

  if (!isEvolutionConfigured) {
    return NextResponse.json({ ok: false, erro: "evolution_nao_configurada", faltando: evolutionFaltando() }, { status: 503 });
  }

  const corpo = await request.json().catch(() => null);
  const url = typeof corpo?.url === "string" && corpo.url.startsWith("http")
    ? corpo.url
    : `${new URL(request.url).origin}/api/whatsapp`;

  /* `localhost` não serve e o erro que ele produz é confuso: a Evolution aceita a
   * configuração, tenta entregar, falha do lado dela — e aqui parece ter dado certo.
   * Dizer isso agora poupa a tarde de procurar mensagem que nunca chegou. */
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url)) {
    return NextResponse.json(
      {
        ok: false,
        erro: "url_local",
        info: `A Evolution roda em outro servidor e não alcança ${url}. Use um túnel (ngrok/cloudflared) ou o domínio do deploy, e mande a URL no corpo: { "url": "https://…/api/whatsapp" }`,
      },
      { status: 400 },
    );
  }

  try {
    const resposta = await configurarWebhook({ url, segredo: SEGREDO });
    return NextResponse.json({ ok: true, url, eventos: ["MESSAGES_UPSERT"], resposta });
  } catch (e) {
    return falha("api/whatsapp/conexao", e);
  }
}

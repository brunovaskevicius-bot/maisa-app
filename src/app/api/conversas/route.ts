import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// AS CONVERSAS DE WHATSAPP — o que o painel mostra e o que ele responde.
//
// GET  /api/conversas               →  { conversas: Conversa[] }
// GET  /api/conversas?telefone=…    →  { conversa, msgs }        ← uma thread
// POST /api/conversas               →  responder ou mudar quem conduz
//
// ── POR QUE A LISTA E A THREAD SÃO A MESMA ROTA ──
//
// Pela regra que `/api/cadastro` já escreveu: a fronteira de uma rota é a UNIDADE DE
// CONSEQUÊNCIA. Lista e thread são a MESMA leitura da mesma tabela, falham juntas (é a mesma
// sessão, o mesmo inquilino, a mesma conexão) e se consertam juntas. O que muda é o recorte —
// muitas conversas com uma fala, ou uma conversa com muitas falas.
//
// Escrever é outra consequência, e por isso é outro verbo: mandar mensagem para o WhatsApp de
// alguém não se desfaz.
//
// ── O QUE O CORPO DO POST *NÃO* PODE MANDAR: O NÚMERO DE DESTINO ──
//
// Ele manda `telefone` — que é a CHAVE da conversa, os 8 últimos dígitos, e não serve para
// enviar nada. Quem descobre o número completo é o servidor, na thread (ver
// `RepositorioHistorico.conversa`). Sem isso o painel seria um jeito de mandar WhatsApp para
// qualquer número do Brasil pela instância do dono — e a lição do IDOR que a auditoria achou
// cinco vezes na integração anterior foi exatamente essa: identidade e destino nunca vêm do
// corpo do request.
//
// `sessaoOuDemo` e não `exigirSessao`, igual ao cadastro: esta rota não toca credencial de
// ninguém, e num ambiente sem Supabase ela é a única forma de a tela ver as conversas do
// `/laboratorio` (que vivem no `Map` do adaptador de demonstração, no mesmo processo do dev).
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  const telefone = new URL(request.url).searchParams.get("telefone");

  try {
    if (telefone) {
      const { conversa, msgs } = await app.lerConversa(porteiro.tenant, telefone);
      return NextResponse.json({ ok: true, status: "ok", conversa, msgs });
    }
    const conversas = await app.listarConversas(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", conversas });
  } catch (e) {
    return falha("conversas", e);
  }
}

/** O que a tela pede. `acao` explícita em vez de inferida do que veio preenchido: "sem texto
 *  significa devolver" é o tipo de contrato que ninguém lê e todo mundo quebra. */
type Pedido = {
  telefone?: unknown;
  acao?: unknown;
  texto?: unknown;
};

const ACOES = new Set(["responder", "assumir", "devolver", "resolver", "reabrir"]);

export async function POST(request: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  const corpo = (await request.json().catch(() => null)) as Pedido | null;
  const telefone = typeof corpo?.telefone === "string" ? corpo.telefone : "";
  const acao = typeof corpo?.acao === "string" ? corpo.acao : "";

  /* Validação de FORMA fica na rota; validação de REGRA fica no caso de uso. "É uma das cinco
   * ações?" é forma. "Este telefone falou com o negócio?" é regra, e mora no núcleo. */
  if (!telefone || !ACOES.has(acao)) {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: "Informe `telefone` e uma `acao` válida." },
      { status: 400 },
    );
  }

  try {
    if (acao === "responder") {
      const texto = typeof corpo?.texto === "string" ? corpo.texto : "";
      const msg = await app.responderConversa(porteiro.tenant, { telefone, texto });
      /* A mensagem gravada volta, e não um `{ ok: true }` pelado: a tela mostrou o texto no
       * instante do Enter (é o que faz o composer parecer instantâneo) e precisa reconciliar
       * com o que o servidor de fato gravou. */
      return NextResponse.json({ ok: true, status: "ok", msg });
    }

    /* As outras quatro são a mesma escrita: duas datas numa linha. Ver
     * `criarMudarPosseConversa` — e note que devolver NÃO resolve e resolver NÃO devolve. */
    await app.mudarPosseConversa(porteiro.tenant, {
      telefone,
      assumida: acao === "assumir" ? true : acao === "devolver" ? false : undefined,
      resolvida: acao === "resolver" ? true : acao === "reabrir" ? false : undefined,
    });
    return NextResponse.json({ ok: true, status: "ok" });
  } catch (e) {
    return falha("conversas", e);
  }
}

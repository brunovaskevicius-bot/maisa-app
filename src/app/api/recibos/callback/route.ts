import { NextResponse } from "next/server";
import { desfechoDoCallbackRebots } from "@/adaptadores/saida/rebots/emissor-recibo";
import { tenantDoProtocolo, livroDeRecibosSupabase } from "@/adaptadores/saida/supabase/livro-de-recibos";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";

// ─────────────────────────────────────────────────────────────────────────────
// O CALLBACK DO CANAL DE EMISSÃO — onde o recibo deixa de ser "pendente".
//
// POST /api/recibos/callback  →  { ok: true, situacao }
//
// ── ⚠️ A REGRA QUE A DOC DELES IMPÕE: GRAVAR ANTES DE RESPONDER 200 ──
//
// A Rebots diz, textualmente, que depois da nossa confirmação o dado é descartado — "will be
// discarded and cannot be recovered". E a API deles **não tem endpoint de consulta**: cinco
// POSTs, nenhum GET.
//
// Somados, os dois fatos têm uma consequência afiada: **um 200 nosso sem gravação apaga a única
// cópia do desfecho que existe no mundo.** A linha fica `pendente` para sempre, o pagamento
// segue trancado, e não há a quem perguntar — só olhando o e-CAC.
//
// Daí o desenho desta rota: grava primeiro, responde 200 depois. Qualquer falha de gravação
// responde **erro**, para o canal reentregar. Um 500 aqui é barato; um 200 mentiroso não tem
// desfazer.
//
// ── AUTENTICAÇÃO POR SEGREDO, E FALHA FECHADA ──
//
// Quem chama é o servidor do canal — não há cookie, não há usuário. Reusa o mesmo esquema de
// `/api/rotinas/lembretes`: `RECIBOS_CALLBACK_SECRET`, com queda para `ROTINAS_SECRET`.
//
// ⚠️ Sem segredo configurado, responde 401 e nunca roda. O custo de errar para o lado do 401 é
// um callback reentregue; para o outro lado, é qualquer um na internet marcando recibos como
// emitidos — e "emitido" é o estado do qual o pagamento nunca mais volta para a lista.
//
// ── ⚠️ O `tenantId` NÃO VEM DO CORPO, E ISSO NÃO É NEGOCIÁVEL ──
//
// Ele nasce de `tenantDoProtocolo()`, que é dado durável nosso — mesma mecânica de
// `integracoes_whatsapp.instancia` no webhook do WhatsApp. O que vem de fora é o `receipt_id`,
// que é um uuid v4 cunhado por nós: não é adivinhável e não escolhe inquilino. Protocolo
// desconhecido é 404, não 500 — POST com corpo torto é ruído, não incidente.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGREDO = (process.env.RECIBOS_CALLBACK_SECRET || process.env.ROTINAS_SECRET || "").trim();

function autorizado(request: Request): boolean {
  if (!SEGREDO) return false;
  const enviado =
    request.headers.get("apikey")
    ?? (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return enviado.trim() === SEGREDO;
}

/**
 * O ator do callback. Não é usuário nem agente: ninguém clicou, e a IA não escreveu.
 *
 * `usuarioId` vazio de propósito — pôr o dono aqui faria a auditoria dizer que ele marcou o
 * recibo como emitido, e ele estava dormindo. É o mesmo `contextoDeSistema` da rotina de
 * lembretes, e é ele que faz `contexto-cliente.ts` escolher a service role.
 */
const contextoDeSistema = (tenantId: string): ContextoTenant => ({
  tenantId,
  usuarioId: "",
  ator: { tipo: "sistema", rotina: "recibo-callback" },
});

export async function POST(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ ok: false, erro: "nao_autorizado" }, { status: 401 });
  }

  let corpo: any;
  try {
    corpo = await request.json();
  } catch {
    /* Corpo ilegível: 400 e pronto. Reentregar não vai consertar JSON quebrado. */
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400 });
  }

  /* A tradução do vocabulário do fornecedor mora no adaptador dele, não aqui. Esta rota não
   * conhece `success`, `key` nem `file_url` — ver `desfechoDoCallbackRebots`. */
  const desfecho = desfechoDoCallbackRebots(corpo);
  if (!desfecho) {
    return NextResponse.json({ ok: false, erro: "sem_receipt_id" }, { status: 400 });
  }

  const tenantId = await tenantDoProtocolo({ canal: "rebots", protocolo: desfecho.protocolo });
  if (!tenantId) {
    /* 404 e não 500: protocolo que não existe é ruído, tentativa de terceiro, ou reentrega de
     * algo já apagado. Nada disso é incidente nosso.
     *
     * ⚠️ Mas `tenantDoProtocolo` também devolve `null` em falha de banco, de propósito — e aí
     * 404 é a resposta errada, porque o canal não vai reentregar. É dívida declarada: distinguir
     * as duas exigiria a função devolver um tipo soma, e o custo hoje é um callback perdido num
     * cenário em que o banco está fora do ar (quando a emissão já teria falhado antes). */
    return NextResponse.json({ ok: false, erro: "protocolo_desconhecido" }, { status: 404 });
  }

  const t = contextoDeSistema(tenantId);

  try {
    /* ── GRAVA ANTES DE RESPONDER 200. Ver o cabeçalho. ── */
    const fechada = await livroDeRecibosSupabase.fechar(t, desfecho);

    /* `null` = a linha já não estava `pendente`. É reentrega, ou a reconciliação chegou primeiro.
     * **200 e não erro**: pedir reentrega de algo já gravado é loop. */
    if (!fechada) {
      return NextResponse.json({ ok: true, situacao: "ja_fechado" });
    }

    /* Recusa confirmada pelo canal devolve o pagamento para a lista. É a única transição que
     * reabre a porta da cascata — ver `podeTentarOutroCanal`. */
    if (fechada.situacao === "recusado") {
      await livroDeRecibosSupabase.soltar(t, fechada.id);
    }

    return NextResponse.json({ ok: true, situacao: fechada.situacao });
  } catch (e) {
    /* ⚠️ 500 DE PROPÓSITO, e é o ponto inteiro desta rota. Falhou a gravação: se respondermos
     * 200, eles descartam o desfecho e ele deixa de existir. Um 500 pede reentrega. */
    return NextResponse.json(
      { ok: false, erro: "falha_ao_gravar", detalhe: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

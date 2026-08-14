import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessao } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// O CANAL DE WHATSAPP DO NEGÓCIO — conectar, consultar, desconectar.
//
// GET    /api/canal  →  { status, instancia, numero, conectadoEm }
// POST   /api/canal  →  { pareamento: { qrcode, status, instancia } }  (cria/recria, devolve o QR)
// DELETE /api/canal  →  { ok: true }
//
// ── POR QUE ESTA ROTA EXISTE, SE JÁ HÁ `/api/whatsapp/conexao` ──
//
// Porque as duas respondem a perguntas de pessoas diferentes, e por isso autenticam
// diferente. `/api/whatsapp/conexao` é DIAGNÓSTICO: responde "por que a MAISA não
// respondeu?", é autenticada pelo segredo do webhook e fala da instância global do
// ambiente. É ferramenta de quem opera o servidor.
//
// Esta é PRODUTO: responde "quero ligar o meu WhatsApp", é autenticada pela SESSÃO e
// fala da instância DAQUELE inquilino. É a tela que o cliente pagante usa.
//
// Amarrar as duas na mesma rota obrigaria uma delas a aceitar a autenticação da outra —
// e a direção errada é fatal: o segredo do webhook é compartilhado com a Evolution, e
// aceitá-lo aqui deixaria quem o tem provisionar canal em nome de qualquer inquilino.
//
// ── `exigirSessao`, E NÃO `sessaoOuDemo` ──
//
// Diferente de `/api/cadastro` e `/api/assistente`. Conectar canal ESCREVE num serviço
// externo com uma credencial que cria e apaga instância — não é leitura que se possa
// deixar cair num inquilino de demonstração. Sem Supabase configurado, esta rota barra,
// e é o comportamento certo: não existe "conectar o WhatsApp do negócio" sem negócio.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Criar instância envolve consultar, apagar, esperar 3s e criar. O padrão da Vercel (10s)
 * é apertado para isso, e estourar no meio deixa a instância apagada e não recriada —
 * o pior estado possível, porque o cliente fica com o canal fora do ar. */
export const maxDuration = 60;

export async function GET() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const canal = await app.lerCanal(porteiro.tenant);
    /* `faltando` vem no GET, e não só no erro do POST, porque a tela precisa saber se
     * consegue RECONSTRUIR o canal antes de oferecer o botão que o derruba. Ver o
     * comentário de `canalFaltando` em `composicao.ts` — nasceu de um incidente. */
    return NextResponse.json({ ok: true, status: "ok", canal, faltando: app.canalFaltando() });
  } catch (e) {
    return falha("canal", e);
  }
}

export async function POST() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    /* Sem corpo de propósito: não há nada a escolher. O nome da instância é derivado do
     * inquilino e o webhook vem da configuração do ambiente — se qualquer um dos dois
     * viesse do request, seria um parâmetro por onde apontar o canal de um negócio para
     * outro lugar. */
    const pareamento = await app.conectarCanal(porteiro.tenant);
    /* ANINHADO, não espalhado. `Pareamento` tem um campo `status` (o do canal:
     * pareando/conectado) e a resposta tem outro (o contrato com o store: "ok",
     * "sem_negocio", "nao_configurado"). Espalhar sobrescreveria o segundo pelo primeiro,
     * e a tela passaria a receber `status: "pareando"` onde espera `"ok"` — tratando um
     * sucesso como erro desconhecido. */
    return NextResponse.json({ ok: true, status: "ok", pareamento });
  } catch (e) {
    return falha("canal", e);
  }
}

export async function DELETE() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    await app.desconectarCanal(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok" });
  } catch (e) {
    return falha("canal", e);
  }
}

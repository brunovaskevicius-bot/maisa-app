import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// OS AJUSTES DA MAISA — a tela "A MAISA", com efeito.
//
// GET   /api/assistente  →  { assistente, cfg }
// PATCH /api/assistente  {  assistente?: {...}, cfg?: {...} }  →  { assistente, cfg }
//
// ── POR QUE ROTA PRÓPRIA, E NÃO `PATCH /api/cadastro` ──
//
// O roadmap deste passo dizia "PATCH /api/cadastro". A regra da casa diz o contrário, e
// ela ganha: o cabeçalho de `api/cadastro/route.ts` afirma que "a fronteira de uma rota
// é a UNIDADE DE CONSEQUÊNCIA, não a tabela", e conclui com "⚠️ Isto é LEITURA. Escrever
// cadastro não entra aqui: cada escrita tem validação e consequência próprias, então
// pede rota própria".
//
// Ajustar a assistente tem consequência que nenhuma das cinco leituras de `/api/cadastro`
// tem: muda o que a MAISA responde no WhatsApp do cliente, na mensagem seguinte. Enfiar
// isso na rota de leitura do painel tornaria a frase acima falsa no dia em que foi
// escrita — e a próxima escrita entraria lá também, por precedente.
//
// ── SEM MUDAR O CONTRATO DE `/api/cadastro` ──
//
// A alternativa seria devolver os ajustes junto do cadastro, na primeira pintura. Não
// fiz: `CadastroDoNegocio` é contrato com `ui/estado/store.tsx`, e acrescentar campo ali
// é mexer num arquivo de 2132 linhas por uma economia de um round-trip numa tela que não
// é a primeira que abre.
//
// `sessaoOuDemo` como em `/api/cadastro`: sem Supabase o app é demonstração aberta, e
// esta é a rota em que se afina o tom da MAISA por `curl` antes de ter banco. O
// adaptador de demonstração responde, e o estado vive no processo.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const ajustes = await app.lerAssistente(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...ajustes });
  } catch (e) {
    return falha("assistente", e);
  }
}

export async function PATCH(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, status: "payload_invalido", info: "Corpo não é JSON." }, { status: 400 });
  }

  try {
    /* O corpo vai cru para o caso de uso, que valida campo a campo. A rota NÃO peneira
     * aqui de propósito: se peneirasse, a mesma regra teria que ser reescrita para o dia
     * em que o agente ou um script ajustar a assistente sem passar por HTTP. */
    const ajustes = await app.ajustarAssistente(porteiro.tenant, (corpo ?? {}) as never);
    return NextResponse.json({ ok: true, status: "ok", ...ajustes });
  } catch (e) {
    return falha("assistente", e);
  }
}

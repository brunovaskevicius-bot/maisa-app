import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// O HORÁRIO ANUNCIADO — a resposta de "que horas vocês atendem?".
//
// GET /api/horarios              →  { semana: [7 dias] }
// PUT /api/horarios  [7 dias]    →  { semana: [7 dias] }
//
// ── `PUT`, E NÃO `PATCH` ──
//
// É a única rota de escrita do painel que não é `PATCH`, e a diferença carrega a
// semântica: `/api/assistente` recebe o que MUDOU, esta recebe o que a semana É. O corpo
// é a representação completa do recurso, mandá-lo duas vezes dá o mesmo resultado, e é
// exatamente o que `PUT` significa.
//
// O porquê de ser assim está em `aplicacao/horarios.ts`: "quando abrimos" é uma grade que
// só é verdade completa, e semana inteira faz duas telas abertas convergirem para a
// última que salvou em vez de produzirem uma semana que nunca existiu em nenhuma das duas.
//
// ── SEPARADA DE `/api/assistente`, MESMO A TELA SENDO A MESMA ──
//
// As duas seções vivem lado a lado em "A MAISA", e a tentação é servir tudo junto. Mas a
// consequência de errar é diferente: o horário é o que a MAISA AFIRMA ao cliente, e a
// escrita é substituição total. Juntar obrigaria uma rota a ter dois verbos e duas
// semânticas de escrita — e a documentar qual campo é patch e qual é replace.
//
// `sessaoOuDemo` como as irmãs: sem Supabase o app é demonstração aberta, e afinar o
// horário por `curl` antes de ter banco é caminho legítimo.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const semana = await app.lerHorarios(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", semana });
  } catch (e) {
    return falha("horarios", e);
  }
}

export async function PUT(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, status: "payload_invalido", info: "Corpo não é JSON." }, { status: 400 });
  }

  try {
    /* Aceita tanto `[...]` quanto `{ semana: [...] }`. O primeiro é o que a tela manda; o
     * segundo é o que quem lê o GET tende a devolver de volta, e recusá-lo seria uma
     * pegadinha sem nenhum ganho — a validação de verdade é do caso de uso. */
    const semana = Array.isArray(corpo) ? corpo : (corpo as { semana?: unknown })?.semana;
    const salva = await app.ajustarHorarios(porteiro.tenant, semana as never);
    return NextResponse.json({ ok: true, status: "ok", semana: salva });
  } catch (e) {
    return falha("horarios", e);
  }
}

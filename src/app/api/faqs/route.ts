import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

/* ─────────────────────────────────────────────────────────────────────────────
 * AS RESPOSTAS PRONTAS DO NEGÓCIO.
 *
 * GET    /api/faqs              →  { faqs: [...] }
 * PUT    /api/faqs  { pergunta, resposta, id?, ativo? }  →  { faq }
 * DELETE /api/faqs?id=…         →  { ok }
 *
 * ── `sessaoOuDemo`, COMO `/api/assistente` E `/api/horarios` ──
 * É tela de configuração: sem banco, o modo demonstração precisa abrir e responder, senão
 * o `/laboratorio` deixa de servir para afinar a MAISA. Quem grava de verdade é a RLS.
 *
 * ── POR QUE `PUT` E NÃO `POST` ──
 * O mesmo verbo cria e edita, decidido pela presença de `id`. Duas rotas para "salvar uma
 * FAQ" obrigariam a TELA a saber qual chamar — e a tela já sabe se está editando, então
 * seria a mesma informação em dois lugares, com um deles livre para discordar.
 *
 * ⚠️ NÃO EXISTE ROTA DE BUSCA AQUI, e a ausência é decisão. Quem busca é o AGENTE, pelo
 * caso de uso `responderDuvida`, dentro do mesmo processo (ver o `LEIA-ME.md` da pasta
 * `whatsapp`: o agente chama caso de uso, nunca `fetch` na própria API). Uma rota de busca
 * exposta seria uma superfície a mais mexendo em embedding, sem nenhum cliente.
 * ────────────────────────────────────────────────────────────────────────────── */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const faqs = await app.lerFaqs(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", faqs });
  } catch (e) {
    return falha("faqs", e);
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

  const { id, pergunta, resposta, ativo } = (corpo ?? {}) as {
    id?: unknown; pergunta?: unknown; resposta?: unknown; ativo?: unknown;
  };

  try {
    /* A validação de verdade (vazio, teto de tamanho) mora no caso de uso — o agente e um
     * futuro importador de documento precisam da mesma regra, e regra que mora na rota só
     * vale para quem entra por HTTP. */
    const faq = await app.ajustarFaq(porteiro.tenant, {
      id: id == null ? undefined : String(id),
      pergunta: String(pergunta ?? ""),
      resposta: String(resposta ?? ""),
      ativo: typeof ativo === "boolean" ? ativo : undefined,
    });
    return NextResponse.json({ ok: true, status: "ok", faq });
  } catch (e) {
    return falha("faqs", e);
  }
}

export async function DELETE(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  /* Query string e não corpo: `DELETE` com corpo é aceito pelo Next mas atravessa mal
   * proxy e cache, e a única informação necessária é um id. */
  const id = new URL(req.url).searchParams.get("id") ?? "";

  try {
    await app.removerFaq(porteiro.tenant, id);
    return NextResponse.json({ ok: true, status: "ok" });
  } catch (e) {
    return falha("faqs", e);
  }
}

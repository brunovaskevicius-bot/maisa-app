import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessao } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// O CADERNO DE NOMES, E DE QUEM É O NÚMERO PAREADO.
//
// GET   /api/contatos  →  { contatos, modo }
// POST  /api/contatos  →  { novos, total, lidos }   importa a agenda do provedor
// PATCH /api/contatos  →  { ok }                    marca alguém como cliente (ou não), OU troca o modo
//
// ── POR QUE O MODO MORA AQUI E NÃO EM `/api/canal` ──
//
// Porque ele não é configuração do canal, é a resposta de "quem a MAISA atende" — e essa
// pergunta só faz sentido junto com o caderno. A tela também os lê e escreve juntos: trocar
// o modo para "pessoal" sem contatos importados não protege ninguém, e importar contatos no
// modo "negócio" não muda comportamento nenhum. Separá-los em duas rotas convidaria a fazer
// uma metade e achar que acabou.
//
// ⚠️ `exigirSessao`, e não `sessaoOuDemo`. Diferente de `/api/cadastro`: aqui se decide QUEM
// A MAISA VAI IGNORAR. Um inquilino de demonstração recebendo essa escrita significaria que
// um ambiente sem Supabase aceita configurar o silêncio de um negócio que não existe.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Ler 1.840 entradas de agenda num servidor Evolution de plano modesto passa fácil dos 10s
 * padrão da Vercel. Estourar no meio não corrompe nada (o upsert é idempotente), mas devolve
 * "não deu" para uma importação que talvez tenha funcionado — e aí o dono clica de novo. */
export const maxDuration = 60;

export async function GET() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const { contatos, modo } = await app.lerContatos(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", contatos, modo });
  } catch (e) {
    return falha("contatos", e);
  }
}

export async function POST() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    /* Sem corpo de propósito, pela mesma razão do `POST /api/canal`: não há nada a escolher.
     * A instância é derivada do inquilino. Se ela viesse do request, seria um parâmetro por
     * onde ler a agenda de contatos de OUTRO negócio — o pior vazamento possível aqui, porque
     * agenda de contatos é dado pessoal de terceiros que nem são clientes deste app. */
    const r = await app.importarContatos(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...r });
  } catch (e) {
    return falha("contatos", e);
  }
}

export async function PATCH(request: Request) {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  const corpo = await request.json().catch(() => null);

  try {
    /* Duas formas de corpo, discriminadas pela presença de `modo`. A alternativa era uma
     * quarta rota; e como as duas escritas são a mesma decisão de produto vista de dois
     * ângulos ("quem ela atende"), separá-las por URL seria fronteira sem conteúdo. */
    if (corpo && typeof corpo === "object" && "modo" in corpo) {
      /* Não valida o valor aqui: quem valida é `criarDefinirModoDoNumero`, no núcleo, que
       * transforma o inválido em `DadoInvalido` com frase. Rota que decide regra é bug de
       * camada — e uma segunda validação divergiria da primeira no dia em que houver um
       * terceiro modo. */
      await app.definirModoDoNumero(porteiro.tenant, (corpo as { modo: never }).modo);
      return NextResponse.json({ ok: true, status: "ok" });
    }

    const telefone = String((corpo as { telefone?: unknown } | null)?.telefone ?? "");
    const nome = (corpo as { nome?: unknown } | null)?.nome;
    const cliente = (corpo as { cliente?: unknown } | null)?.cliente;

    await app.marcarContato(porteiro.tenant, {
      telefone,
      nome: typeof nome === "string" ? nome : null,
      /* Ternário preservado até o núcleo: `null` é "nunca disse" e `false` é "disse que não".
       * Um `Boolean(cliente)` aqui apagaria a distinção que a coluna existe para guardar. */
      cliente: cliente === null ? null : cliente === true ? true : cliente === false ? false : null,
    });
    return NextResponse.json({ ok: true, status: "ok" });
  } catch (e) {
    return falha("contatos", e);
  }
}

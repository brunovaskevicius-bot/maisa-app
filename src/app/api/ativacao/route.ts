import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// QUANTO DESTE NEGÓCIO JÁ ESTÁ DE PÉ.
//
// GET /api/ativacao  →  { feitos: PassoDeAtivacao[], porcentagem, completo }
//
// ── POR QUE ELA EXISTE ──
//
// A `FluxoHoje` de um inquilino novo abre VAZIA, e o estado vazio dela é comemorativo por
// desenho: *"se ele está vazio, a assistente está fazendo o trabalho"* (`FluxoHoje.tsx:8`).
// Para quem acabou de criar a conta isso lê exatamente ao contrário — o cliente vê "tudo
// certo" quando nada está conectado. Esta rota é o que permite dizer a verdade.
//
// Serve dois lugares: o wizard (`/comecar`), para saber onde retomar quem abandonou no
// meio, e a jornada no painel, para mostrar o que falta.
//
// ── É DERIVADA, E ISSO É O PONTO ──
//
// Não existe coluna `onboarding_step`. Cada leitura pergunta ao mundo: há WhatsApp
// pareado? há agenda ligada? alguém já mandou mensagem? Uma flag seria mais barata e
// erraria de dois jeitos — dessincronizaria quando o dono fizesse a coisa por outro
// caminho, e obrigaria a repetir quem já tinha feito. O porquê inteiro está em
// `dominio/ativacao.ts`.
//
// ⚠️ NUNCA responde erro por passo que não deu para apurar. O adaptador usa
// `Promise.allSettled` e trata falha como "não fez ainda" — um `Promise.all` derrubaria o
// checklist inteiro por causa de uma tabela com RLS mais estreita, e quem veria a tela em
// branco seria justamente o cliente novo.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const progresso = await app.lerAtivacao(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...progresso });
  } catch (e) {
    return falha("ativacao", e);
  }
}

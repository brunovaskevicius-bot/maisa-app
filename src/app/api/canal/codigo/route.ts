import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessao } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// OUTRO CÓDIGO PARA O PAREAMENTO QUE JÁ ESTÁ NA TELA.
//
// POST /api/canal/codigo  { numero }  →  { codigo: string | null }
//
// ── POR QUE ROTA PRÓPRIA, E NÃO UM `?renovar=1` NO `POST /api/canal` ──
//
// Porque as duas fazem coisas de custo e risco MUITO diferentes, e um parâmetro que troca
// uma pela outra é um parâmetro por onde se destrói um canal por engano. `POST /api/canal`
// apaga a instância, espera três segundos e recria — é a operação que derruba o WhatsApp
// de quem estava atendendo, e por isso ela tem `maxDuration: 60` e uma recusa embutida
// para quem já está conectado.
//
// Esta aqui não destrói nada: a instância continua em `connecting` e o Baileys emite outro
// código na mesma sessão. É uma chamada, sem espera, e pode ser disparada por um contador
// chegando a zero sem que ninguém tenha clicado em coisa nenhuma — que é exatamente o uso
// para o qual a outra seria perigosa demais.
//
// ⚠️ NÃO ACEITA `instancia`. Ela é derivada do inquilino da sessão, como em todo o resto.
// Se viesse do corpo, esta rota emitiria código de pareamento para o canal de outro
// negócio — e código de pareamento é o que dá acesso ao WhatsApp dele.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const corpo = await req.json().catch(() => ({}) as Record<string, unknown>);
    const numero = typeof corpo?.numero === "string" ? corpo.numero : "";

    const codigo = await app.renovarCodigo(porteiro.tenant, { numero });

    /* `codigo: null` sai com `ok: true`, e é decisão, não descuido. "Não consegui emitir
     * outro agora" não é falha da requisição — a instância segue de pé e o QR segue
     * válido. Devolver erro faria a tela acender aviso vermelho para quem ainda tem um
     * caminho funcionando na frente. */
    return NextResponse.json({ ok: true, status: "ok", codigo });
  } catch (e) {
    return falha("canal", e);
  }
}

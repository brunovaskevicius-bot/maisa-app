import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falhaFiscal } from "@/adaptadores/entrada/http/fiscal";

// ─────────────────────────────────────────────────────────────────────────────
// EMISSÃO DE NOTA FISCAL — SEMPRE NO SERVIDOR.
//
// O token da Focus NFe fica em env de servidor (FOCUS_NFE_TOKEN) e NUNCA no
// navegador. Esta rota (a) exige sessão quando há Auth e (b) só então chama o
// emissor. Assim é impossível "emitir NF pelo front".
//
// Modos (decididos dentro do adaptador, ver saida/focus/emissor-focus.ts):
//   • sem FOCUS_NFE_TOKEN             → "simulado" (seguro, sessão validada)
//   • token sem dados do inquilino    → "config_incompleta" (lista o que falta)
//   • tudo pronto                     → emissão real (homologação ou produção)
//
// ⚠️ `ambiente` VEM DO RESULTADO, e não mais de `servicos.emissor.ambiente` (17/08/2026).
// Aquele getter era global — o ambiente do ENV — e respondia o mesmo para todo inquilino.
// Numa tela fiscal isso é a mentira mais cara possível: a rota dizia
// `ambiente: "homologacao"` para uma nota que saiu em PRODUÇÃO, e o dono lia "isto é teste"
// sobre um documento com validade fiscal. Agora quem responde é a emissão que aconteceu.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  const body = await request.json().catch(() => ({} as any));
  const tomador = body?.tomador ?? {};

  try {
    const r = await app.emitirNota(porteiro.tenant, {
      valor: Number(body?.valor),
      discriminacao: String(body?.discriminacao ?? ""),
      origem: String(body?.pid ?? "nf"),
      tomador: {
        cpf: tomador.cpf,
        cnpj: tomador.cnpj,
        nome: tomador.nome,
        email: tomador.email,
        telefone: tomador.telefone,
      },
    });

    return NextResponse.json({
      ok: r.status !== "erro",
      status: r.status,
      ref: r.ref,
      ambiente: r.ambiente,
      simulado: r.simulado,
      numero: r.numero,
      url: r.url,
      pdf: r.pdf,
      xml: r.xml,
      erros: r.erros,
    });
  } catch (e) {
    return falhaFiscal(e);
  }
}

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NF_CONFIG, isFocusConfigured, focusFaltando } from "@/lib/nf/config";
import { emitirNfse } from "@/lib/nf/focus";

// ─────────────────────────────────────────────────────────────────────────────
// EMISSÃO DE NOTA FISCAL — SEMPRE NO SERVIDOR.
// O token da Focus NFe fica em env de servidor (FOCUS_NFE_TOKEN), NUNCA no
// navegador. Esta rota (a) exige sessão autenticada e (b) só então chama a
// Focus NFe. Assim é impossível "emitir NF pelo front".
//
// Modos:
//   • sem FOCUS_NFE_TOKEN            → "simulado" (seguro, sessão validada)
//   • token sem dados fiscais        → "config_incompleta" (lista o que falta)
//   • token + dados fiscais completos → emissão real (homologação ou produção)
// ─────────────────────────────────────────────────────────────────────────────
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1) Exige login quando o Auth está configurado.
  if (isSupabaseConfigured) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, status: "nao_autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as any));
  const valor = Number(body?.valor);
  const discriminacao = String(body?.discriminacao ?? "").trim();
  const tomador = body?.tomador ?? {};

  // 2) Validação mínima do payload.
  if (!valor || !discriminacao || !(tomador.cpf || tomador.cnpj)) {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: "Faltam valor, discriminação ou documento do tomador." },
      { status: 400 },
    );
  }

  const refBase = String(body?.pid ?? "nf").replace(/[^a-zA-Z0-9]/g, "");
  const ref = `maisa-${refBase}-${randomUUID().slice(0, 8)}`;

  // 3) Sem token → emissão simulada NO SERVIDOR (fluxo pronto, sessão validada).
  if (!NF_CONFIG.token) {
    return NextResponse.json({ ok: true, status: "simulado", ref, ambiente: NF_CONFIG.ambiente });
  }

  // 4) Token presente, mas faltam dados fiscais → não arrisca emitir errado.
  if (!isFocusConfigured) {
    return NextResponse.json({ ok: false, status: "config_incompleta", faltando: focusFaltando() });
  }

  // 5) Emissão real (ambiente conforme FOCUS_NFE_AMBIENTE).
  // Log da config EFETIVA (sem segredos) — aparece nos logs da Vercel p/ conferência
  // rápida de que ambiente/item/cnpj estão exatamente como esperado (sem aspas/espaços).
  console.log("[nf/emitir] config efetiva", {
    ref,
    ambiente: NF_CONFIG.ambiente,
    prestador_cnpj: NF_CONFIG.prestador.cnpj,
    prestador_im: NF_CONFIG.prestador.inscricaoMunicipal,
    codigo_municipio: NF_CONFIG.prestador.codigoMunicipio,
    item_lista_servico: NF_CONFIG.servico.itemListaServico,
    tomador_doc: (tomador.cnpj || tomador.cpf || "").replace(/\D/g, ""),
  });
  try {
    const { httpStatus, data } = await emitirNfse({
      ref,
      valorServicos: valor,
      discriminacao,
      tomador: {
        cpf: tomador.cpf,
        cnpj: tomador.cnpj,
        razaoSocial: tomador.nome,
        email: tomador.email,
        telefone: tomador.telefone,
      },
    });

    if (data?.status === "autorizado") {
      return NextResponse.json({
        ok: true, status: "autorizado", ref, ambiente: NF_CONFIG.ambiente,
        numero: data.numero, url: data.url, pdf: data.url_danfse, xml: data.caminho_xml_nota_fiscal,
      });
    }
    // 202 accepted / processando_autorizacao → assíncrono, cliente faz polling.
    if (httpStatus === 202 || data?.status === "processando_autorizacao") {
      return NextResponse.json({ ok: true, status: "processando", ref, ambiente: NF_CONFIG.ambiente });
    }
    // Erro de validação/autorização (ex.: 422) → devolve os erros da Focus.
    console.error("[nf/emitir] Focus rejeitou (síncrono)", { ref, httpStatus, status: data?.status, erros: data?.erros ?? data?.mensagem });
    return NextResponse.json({
      ok: false, status: "erro", ref, httpStatus,
      erros: data?.erros ?? [{ mensagem: data?.mensagem ?? "Falha ao emitir a NFS-e." }],
    });
  } catch (e) {
    console.error("[nf/emitir] erro de conexão com a Focus", { ref, erro: String(e) });
    return NextResponse.json(
      { ok: false, status: "erro", ref, erros: [{ mensagem: "Erro de conexão com a Focus NFe." }] },
      { status: 502 },
    );
  }
}

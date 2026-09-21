import { NextResponse } from "next/server";
import { app, repositorioDeAssinaturas } from "@/composicao";
import {
  assinaturaDoEvento,
  ehRelevante,
  lerAssinaturaNaStripe,
  verificar,
} from "@/adaptadores/entrada/stripe/eventos";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK DA STRIPE — por onde o dinheiro entra no app.
//
// POST /api/stripe/webhook
//
// FINA como as outras: confere a assinatura, resolve o inquilino, chama o caso de uso.
// Nenhuma regra mora aqui. A tradução do evento está em `entrada/stripe/eventos.ts`, e é
// lá que estão os três ⚠️ que importam (releitura na API, `current_period_end` no item,
// e de onde vem o inquilino).
//
// ── A TABELA DE STATUS DE RESPOSTA, QUE É O CONTRATO COM A STRIPE ──
//
// Para a Stripe, resposta ≠ 2xx significa REENTREGAR — por até 3 dias, com recuo. Então
// o status não é decoração, é a escolha entre "tente de novo" e "esqueça":
//
//   assinatura HMAC inválida ....... 400 · e NÃO reentrega: o corpo não é dela ou o
//                                    segredo está errado, e repetir não conserta nenhum
//                                    dos dois. 400 é o que a Stripe mostra no painel.
//   evento que não nos interessa ... 200 · a conta recebe dezenas de tipos; ignorar
//                                    explicitamente é o contrato certo
//   pagamento de quem não é nosso .. 200 · acontece de verdade em conta compartilhada.
//                                    Reentregar isso enche o painel de vermelho à toa
//   falha nossa (banco fora) ....... 500 · ★ É AQUI QUE A REENTREGA SALVA. O Supabase
//                                    cai por 40 segundos, a Stripe volta, e a assinatura
//                                    é gravada. Devolver 200 aqui perderia o pagamento
//                                    em silêncio — para sempre, porque não há segunda
//                                    chance e ninguém fica olhando.
//
// ⚠️ ESTA ROTA É PÚBLICA por construção: não há cookie num POST vindo de outro servidor.
// Toda a proteção é a assinatura criptográfica. `/api` inteiro já passa pelo middleware
// sem login (ver `PUBLIC_PREFIXES` em `saida/supabase/sessao.ts`), então NÃO há nada a
// cadastrar lá — e é justamente por isso que a conferência abaixo não é opcional.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* A releitura na Stripe + a escrita no Postgres cabem folgado em 10s. O teto existe
 * pelo mesmo motivo do webhook do WhatsApp: estourar não é "deu erro", é reentrega — e
 * reentrega de um processamento lento é o mesmo processamento lento, de novo. */
export const maxDuration = 30;

export async function POST(req: Request) {
  /* ── 1. o corpo CRU ──
   * ⚠️ `req.text()`, nunca `req.json()`. O HMAC é sobre os bytes exatos que chegaram;
   * reserializar reordena chaves e muda espaçamento, e a conferência passa a falhar em
   * 100% dos eventos com uma mensagem que parece segredo errado. */
  const cru = await req.text();

  let evento;
  try {
    evento = await verificar(cru, req.headers.get("stripe-signature"));
  } catch (e) {
    console.error("[api/stripe/webhook] assinatura inválida", e);
    return NextResponse.json({ ok: false, erro: "assinatura_invalida" }, { status: 400 });
  }

  if (!ehRelevante(evento.type)) {
    return NextResponse.json({ ok: true, ignorado: true, tipo: evento.type });
  }

  const id = assinaturaDoEvento(evento);
  if (!id) {
    /* Evento relevante por tipo mas sem assinatura dentro — fatura avulsa, por exemplo.
     * Não é erro nosso e não adianta reentregar. */
    return NextResponse.json({ ok: true, ignorado: true, motivo: "sem_assinatura" });
  }

  try {
    /* ── 2. releitura na fonte ──
     * O estado gravado é o ATUAL, não o do evento. É o que torna a ordem de chegada
     * irrelevante e a reentrega inofensiva. Ver o cabeçalho de `eventos.ts`. */
    const { assinatura, tenantId } = await lerAssinaturaNaStripe(id);

    /* ── 3. de quem é ──
     * Primeiro o carimbo que nós escrevemos; depois o reverso pelo cliente, que cobre a
     * assinatura criada à mão no painel da Stripe. Nunca um campo escolhido por quem
     * mandou o POST — e o POST inteiro já passou pela conferência HMAC. */
    const dono = tenantId ?? (assinatura.clienteId
      ? await repositorioDeAssinaturas.tenantDoCliente(assinatura.clienteId)
      : null);

    if (!dono) {
      console.warn(
        `[api/stripe/webhook] ${evento.type}: assinatura ${id} sem inquilino conhecido `
          + `(cliente ${assinatura.clienteId ?? "—"}). Ignorada.`,
      );
      return NextResponse.json({ ok: true, ignorado: true, motivo: "inquilino_desconhecido" });
    }

    /* ⚠️ ATOR `sistema`, e é o que destrava a escrita: `contexto-cliente.ts` só escolhe
     * o cliente service_role quando o ator não é `usuario`, e a RLS de `assinaturas`
     * não deixa usuário logado escrever (`003_rls.sql` §3.4). Trocar para `usuario` aqui
     * faria o UPDATE casar zero linhas — sem erro do Postgres, e o pagamento sumiria. */
    const contexto: ContextoTenant = {
      tenantId: dono,
      usuarioId: "stripe",
      ator: { tipo: "sistema", rotina: "stripe:webhook" },
    };

    await app.registrarAssinatura(contexto, assinatura);

    console.info(
      `[api/stripe/webhook] ${evento.type} → ${dono}: ${assinatura.plano} ${assinatura.status}`,
    );
    return NextResponse.json({ ok: true, status: assinatura.status });
  } catch (e) {
    /* ★ 500 DE PROPÓSITO. Ver a tabela no cabeçalho: é a única resposta que faz a Stripe
     * tentar de novo, e é a única chance de o pagamento não se perder. */
    console.error(`[api/stripe/webhook] falha ao processar ${evento.type} (${id})`, e);
    return NextResponse.json({ ok: false, erro: "falha_interna" }, { status: 500 });
  }
}

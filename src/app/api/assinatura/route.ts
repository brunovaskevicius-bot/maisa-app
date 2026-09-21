import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";
/* A tabela de preços da landing page. Importada AQUI, e não na tela, de propósito: esta
 * rota é adaptador de entrada e mora no mesmo `src/app` que ela, então a seta não sai de
 * lugar nenhum. Se a gaveta importasse `_lib/planos.ts`, a UI passaria a depender de
 * `app/(marketing)` — e o preço exibido no app viraria cópia da copy da LP, livre para
 * divergir. Aqui a tela recebe o que a fonte única diz, e o `planos.test.ts` continua
 * sendo quem cobra que ela bata com o HTML estático. */
import { PLANOS } from "@/app/(marketing)/_lib/planos";

// ─────────────────────────────────────────────────────────────────────────────
// A ASSINATURA — o que este negócio paga, e o botão que começa a pagar.
//
// GET  /api/assinatura                →  { assinatura }  (ou `null`, e isso não é erro)
// POST /api/assinatura  { plano }     →  { url }         (para onde mandar o navegador)
//
// ── ⚠️ O POST NÃO COBRA NADA. ELE ABRE UMA PÁGINA. ──
//
// Responder 200 aqui significa "a sessão de checkout existe", e mais nada. Quem pagou,
// se pagou e quando pagou é assunto de `/api/stripe/webhook`. Um `redirect` automático
// no lugar do `{ url }` esconderia isso: a tela precisa poder dizer "abrindo pagamento"
// antes de sair, e precisa poder falhar sem sair da página.
//
// A tela também não pode escrever "assinatura ativa" quando a pessoa voltar. Boleto
// demora um dia; a volta do navegador não é confirmação. Ver o ⚠️ em `demo/assinaturas.ts`.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * As três ofertas, para a tela poder mostrar nome e preço ANTES de cobrar.
 *
 * ⚠️ O PREÇO AQUI É O EXIBIDO, NÃO O COBRADO. Quem cobra é o objeto Price do provedor,
 * achado por `lookup_key`. Os dois têm que bater, e quem garante isso é `planos.test.ts`
 * — esta rota só repassa o que a fonte única da LP diz, sem redigitar número nenhum.
 *
 * `resumo` usa as DUAS PRIMEIRAS specs porque a tabela de `_lib/planos.ts` é ordenada por
 * relevância de decisão: quantas pessoas atendem e quantos agendamentos entram. Reordenar
 * as specs lá muda esta linha aqui — é acoplamento por ordem, e está escrito para que
 * quem reordenar saiba.
 */
const OFERTAS = PLANOS.map((p) => ({
  plano: p.chave,
  nome: p.nome,
  preco: `${p.preco}${p.periodo}`,
  resumo: p.specs.slice(0, 2).map((s) => `${s.rotulo} ${s.valor}`).join(" · "),
  /** O plano base — o mesmo que a LP destaca. Um só, e a tabela é quem decide qual. */
  base: p.destaque === true,
}));

export async function GET() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const assinatura = await app.lerAssinatura(porteiro.tenant);
    /* As ofertas vão JUNTO com a assinatura, e não numa rota separada: a tela precisa das
     * duas para desenhar uma única vez. Separadas, ela teria um estado em que sabe o plano
     * atual e ainda não sabe os preços — e nesse instante ou mostra botão sem valor, ou
     * pisca. */
    return NextResponse.json({ ok: true, status: "ok", assinatura, ofertas: OFERTAS });
  } catch (e) {
    return falha("assinatura", e);
  }
}

export async function POST(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  let corpo: { plano?: unknown };
  try {
    corpo = (await req.json()) as { plano?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: "Corpo não é JSON." },
      { status: 400 },
    );
  }

  /* A volta é para ONDE A PESSOA ESTAVA, derivada do pedido — e não de
   * `MAISA_PUBLIC_URL`. A variável aponta para produção mesmo em `.env.local` (é fato
   * conhecido deste repositório), então usá-la aqui jogaria quem testa localmente para
   * dentro do app publicado, com a sessão errada e sem entender por quê. */
  const origem = new URL(req.url).origin;

  try {
    const { url } = await app.abrirCheckout(porteiro.tenant, {
      plano: corpo.plano as never,
      /* ⚠️ `/?tela=mais`, NÃO `/faturamento`: AQUELA ROTA NÃO EXISTE. O app é uma página
       * só (`app/page.tsx`) e a tela sai do store — quem chega de fora chega por `?tela=`,
       * o mesmo mecanismo do link que a gente manda no WhatsApp. Enquanto isto apontou para
       * `/faturamento`, a volta do checkout era um 404 servido a quem acabou de pagar
       * R$ 127. Ver o efeito de `?pagamento=` em `ui/estado/store.tsx`. */
      voltarPara: `${origem}/?tela=mais&pagamento=recebido`,
      cancelarPara: `${origem}/?tela=mais&pagamento=cancelado`,
    });
    return NextResponse.json({ ok: true, status: "ok", url });
  } catch (e) {
    return falha("assinatura", e);
  }
}

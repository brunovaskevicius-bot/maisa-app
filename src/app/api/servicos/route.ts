import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// O CATÁLOGO — o que o negócio vende, agora gravável.
//
// PUT /api/servicos  { id?, nome, categoria, preco, duracao, ativo? }  →  { servico }
//
// ── POR QUE ESTA ROTA PRECISOU EXISTIR ──
//
// Porque a tela de Serviços tinha "adicionar" e "editar" desde sempre, e os dois mexiam em
// `svcNovos`/`svcEdit` no `store.tsx` — estado do NAVEGADOR. O dono ajustava o preço do
// Corte, via a lista mudar, dava F5, e o preço voltava. Não havia rota, não havia porta,
// não havia erro: a escrita simplesmente não existia, e a tela não sabia disso.
//
// É o que bloqueia o onboarding. A etapa "confirme o que você faz" existe para ajustar os
// cinco serviços que `criar_negocio()` semeia com preço de chute — e um wizard que não
// grava ensina, no primeiro minuto de uso, que o app perde o que você digita.
//
// ── PUT E NÃO POST, E UM VERBO SÓ ──
//
// Criar e editar são o MESMO pedido, distinguidos pela presença de `id`. É o padrão que
// `/api/faqs` já usa, e a razão é a mesma: a tela tem um formulário só, e dois verbos
// obrigariam o navegador a saber se aquela linha já existe no banco — informação que ele
// tem por acaso, não por contrato.
//
// DELETE /api/servicos?id=…  →  { ok }
//
// ── APAGAR SERVIÇO É SEGURO, E ISSO FOI CONFERIDO NO ESQUEMA ──
//
// `atendimentos.servico_id` NÃO tem FK: ele é snapshot, ao lado de `servico_nome` e
// `servico_valor`, e o comentário da coluna (`002_multitenant.sql`) diz o porquê — "o
// domínio JÁ assume que esse id pode não resolver". Faturamento fechado continua fechado.
// `clientes.servico_id` cai para nulo e `servicos_profissionais` some junto.
//
// É por isso que a rota de EQUIPE não tem DELETE: lá `atendimentos.profissional_id` tem
// `on delete cascade`, e apagar a pessoa apagaria os atendimentos dela.
//
// ⚠️ `ativo: false` continua sendo o certo para "não faço mais isso". O DELETE é para o
// que nunca deveria ter existido — sem ele, um clique errado em "+ Serviço" deixa um
// "Novo serviço" morto na lista para sempre.
//
// `sessaoOuDemo` e não `exigirSessao`, como o `/api/cadastro` que esta rota completa: num
// ambiente sem Supabase o adaptador demo responde, e é assim que o wizard é afinado antes
// de existir banco. A RLS é quem barra de verdade quando há banco.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: "Corpo não é JSON." },
      { status: 400 },
    );
  }

  const { id, nome, categoria, preco, duracao, ativo } = (corpo ?? {}) as Record<string, unknown>;

  try {
    /* A validação inteira (nome vazio, categoria inventada, preço absurdo, duração fora da
     * faixa) mora no caso de uso, não aqui: o wizard, a tela de Serviços e um futuro
     * import de planilha precisam da mesma recusa, e regra que mora na rota só vale para
     * quem entra por HTTP. Aqui só se traduz JSON. */
    const servico = await app.ajustarServico(porteiro.tenant, {
      ...(id == null ? {} : { id: String(id) }),
      nome: String(nome ?? ""),
      categoria: categoria as never,
      preco: preco as never,
      duracao: duracao as never,
      ...(ativo === undefined ? {} : { ativo: Boolean(ativo) }),
    });

    return NextResponse.json({ ok: true, status: "ok", servico });
  } catch (e) {
    return falha("servicos", e);
  }
}

/** `id` na query e não no corpo: DELETE com corpo é aceito por Next e ignorado por
 *  proxies e por `fetch` em alguns navegadores. Mesma escolha do `DELETE /api/faqs`. */
export async function DELETE(req: Request) {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  const id = new URL(req.url).searchParams.get("id") ?? "";

  try {
    await app.removerServico(porteiro.tenant, id);
    return NextResponse.json({ ok: true, status: "ok" });
  } catch (e) {
    return falha("servicos", e);
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGoogleConfigured, googleFaltando } from "@/lib/google/config";
import { acessoValido } from "@/lib/google/integracoes";
import { PrecisaReconectar } from "@/lib/google/oauth";
import * as G from "@/lib/google/calendario";
import { instanteISO } from "@/lib/google/datas";
import * as D from "@/lib/data";

// ─────────────────────────────────────────────────────────────────────────────
// EVENTO NO GOOGLE CALENDAR — sempre no servidor.
//
// POST   → cria o evento (com Meet, se pedido) e devolve o link
// DELETE → cancela o evento
//
// O cliente manda o ID DO AGENDAMENTO, nunca datas nem títulos prontos: o servidor
// resolve tudo a partir de src/lib/data.ts. Se o horário viesse do corpo do request,
// qualquer um poderia escrever o que quisesse na agenda de quem conectou o Google.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guarda() {
  if (!isGoogleConfigured) {
    return NextResponse.json({ ok: false, status: "nao_configurado", faltando: googleFaltando() }, { status: 400 });
  }
  if (isSupabaseConfigured) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, status: "nao_autenticado" }, { status: 401 });
  } else {
    return NextResponse.json({ ok: false, status: "login_necessario" }, { status: 401 });
  }
  return null;
}

/** Erro → resposta. PrecisaReconectar vira um status próprio para a UI oferecer "reconectar". */
function falha(e: unknown) {
  if (e instanceof PrecisaReconectar) {
    return NextResponse.json({ ok: false, status: "reconectar", info: e.motivo }, { status: 409 });
  }
  console.error("[google/evento]", String(e));
  return NextResponse.json(
    { ok: false, status: "erro", info: e instanceof Error ? e.message : "Falha ao falar com o Google." },
    { status: 502 },
  );
}

export async function POST(request: Request) {
  const barrado = await guarda();
  if (barrado) return barrado;

  const body = await request.json().catch(() => ({} as any));
  const agId = String(body?.agendamentoId ?? "");
  const comMeet = body?.comMeet !== false; // padrão: com Meet

  // Convidar o cliente por e-mail é OPT-IN, e o padrão é NÃO convidar.
  //
  // Os clientes deste protótipo são fictícios e todos apontam para o e-mail do
  // dono do projeto (ver src/lib/data.ts) — antes usavam `@email.com`, que é um
  // domínio REAL e mandava convite para a caixa de estranhos. Hoje o convite não
  // atinge mais terceiros, mas continua sendo um e-mail de verdade despachado
  // pelo Google (e "cancelar" depois manda um segundo). Por isso segue opt-in.
  const convidarCliente = body?.convidarCliente === true;

  // A POSIÇÃO (dia, hora, profissional) vem do CLIENTE, e isso é proposital.
  //
  // Arrastar na grade é a forma nº 1 de remarcar neste app, e o resultado do arrasto
  // mora no localStorage (store.posicoes) — o servidor não tem como saber dele. A
  // primeira versão desta rota preferia D.agendamento() ao corpo, e o efeito era o
  // pior possível: a gaveta mostrava "15:00", o evento nascia às 10:00, e a mensagem
  // de WhatsApp anunciava um horário que não existia na agenda de ninguém. Pior ainda
  // com a coluna: um atendimento arrastado do Diego para o Rafael era criado na agenda
  // do Diego, porque a UI olhava um profissional e o servidor, outro.
  //
  // Não é furo de segurança: o usuário está autenticado e escrevendo na PRÓPRIA agenda
  // conectada (acessoValido é escopado à sessão) — ele poderia criar o mesmo evento
  // direto no Google. A validação abaixo é sanidade de dado, não fronteira de acesso.
  // O catálogo entra só como PADRÃO para o que o cliente não mandou.
  const base = D.agendamento(agId);
  const data = String(body?.data ?? base?.data ?? D.HOJE.iso);
  const inicio = Number(body?.inicio ?? base?.inicio);
  const profissionalId = String(body?.profissionalId ?? base?.profissionalId ?? "");
  const servicoId = String(body?.servicoId ?? base?.servicoId ?? "");
  const clienteId = String(body?.clienteId ?? base?.clienteId ?? "");

  const profissional = D.profissional(profissionalId);
  const cliente = D.cliente(clienteId);

  // Serviço criado pelo usuário (id "sv-novo-…") só existe no localStorage, então a
  // duração vem do corpo. Sem isso, marcar num serviço novo falhava com "Faltam dados
  // do atendimento" e nada na tela dizia que a causa era o serviço.
  const doCatalogo = D.servico(servicoId);
  const duracao = Number(body?.duracao ?? doCatalogo?.duracao);
  const nomeServico = String(body?.servicoNome ?? doCatalogo?.nome ?? "Atendimento").slice(0, 120);

  if (!agId || !profissional || !Number.isFinite(inicio) || !Number.isFinite(duracao)) {
    return NextResponse.json({ ok: false, status: "payload_invalido" }, { status: 400 });
  }
  // Só profissional que é coluna da Agenda — as três rotas usam o mesmo critério.
  // Com D.profissional() sozinho, "pr4" (existe na equipe, não tem coluna) passava
  // aqui e só falhava lá na frente como 409 "reconectar", que é o diagnóstico errado.
  if (!D.COLUNAS_AGENDA.includes(profissionalId)) {
    return NextResponse.json({ ok: false, status: "profissional_invalido" }, { status: 400 });
  }
  // Formato E validade: "2026-02-31" passa no regex e é um dia que não existe. Sem o
  // Date.parse, ele viraria um ISO que o Google aceitaria deslocando para 3 de março.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(`${data}T00:00:00Z`))) {
    return NextResponse.json({ ok: false, status: "payload_invalido", info: "Data inválida." }, { status: 400 });
  }
  // `inicio` é hora decimal. Sem limite, um valor forjado (999) viraria um ISO
  // inválido — "T999:00:00-03:00" — e o erro só apareceria como recusa crua do Google.
  if (inicio < 0 || inicio >= 24 || Math.round(inicio * 2) !== inicio * 2) {
    return NextResponse.json({ ok: false, status: "payload_invalido", info: "Horário fora do dia." }, { status: 400 });
  }
  if (duracao < 5 || duracao > 480) {
    return NextResponse.json({ ok: false, status: "payload_invalido", info: "Duração fora do razoável." }, { status: 400 });
  }

  const inicioISO = instanteISO(data, inicio);
  // Criar evento no passado não ajuda ninguém — e agora que as datas são reais, esta
  // recusa passou a significar o que diz. Antes ela era um artefato: o calendário fixo
  // era empurrado por semanas inteiras, e o dia 1 podia cair exatamente em hoje.
  if (new Date(inicioISO).getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: "Esse horário já passou." },
      { status: 400 },
    );
  }

  try {
    const { token, email } = await acessoValido(profissionalId);

    const nomeCliente = cliente?.nome ?? "Cliente";
    const ev = await G.criar({
      token,
      chave: `maisa-${agId}`, // estável ⇒ retry não duplica a conferência
      inicio: inicioISO,
      fim: instanteISO(data, inicio + duracao / 60),
      // Etiqueta de dono no TÍTULO, não só na descrição.
      //
      // Nada impede que a mesma conta Google seja conectada para mais de um
      // profissional: a PK é (user_id, profissional_id) e `google_email` não é
      // única. Quando isso acontece, os atendimentos de todos caem no MESMO
      // "primary" e a grade do Google fica sem dizer de quem é cada um — a
      // descrição resolve, mas só depois de abrir o evento. O prefixo aparece
      // já na grade e não atrapalha quem conectou uma conta por profissional.
      titulo: `[${D.primeiroNome(profissional.nome)}] ${nomeServico} — ${nomeCliente}`,
      descricao: [
        `Agendado pela MAISA · ${D.NEGOCIO.nome}`,
        `Profissional: ${profissional.nome}`,
        cliente?.telefone ? `Telefone: ${cliente.telefone}` : "",
      ].filter(Boolean).join("\n"),
      emails: convidarCliente && cliente?.email ? [cliente.email] : [],
      comMeet,
    });

    return NextResponse.json({
      ok: true,
      status: "criado",
      googleEmail: email,
      eventId: ev.eventId,
      meetLink: ev.meetLink ?? null,
      htmlLink: ev.htmlLink ?? null,
      // O instante REALMENTE usado. O cliente grava isto e passa a exibir a partir
      // daqui — a previsão (rotuloReal) anda 7 dias por semana, o evento não.
      inicioISO,
      // Sem Meet mesmo tendo sido pedido: a UI precisa saber para não prometer link.
      semMeet: comMeet && !ev.meetLink,
    });
  } catch (e) {
    return falha(e);
  }
}

export async function DELETE(request: Request) {
  const barrado = await guarda();
  if (barrado) return barrado;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") ?? "";
  const profissionalId = searchParams.get("pid") ?? "";

  if (!eventId || !D.COLUNAS_AGENDA.includes(profissionalId)) {
    return NextResponse.json({ ok: false, status: "payload_invalido" }, { status: 400 });
  }

  try {
    const { token } = await acessoValido(profissionalId);
    await G.cancelar({ token, eventId });
    return NextResponse.json({ ok: true, status: "cancelado" });
  } catch (e) {
    return falha(e);
  }
}

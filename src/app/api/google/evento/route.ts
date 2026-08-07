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

  // A POSIÇÃO (dia, hora, profissional) vem do CLIENTE, e agora vem SÓ dele.
  //
  // O atendimento mora no localStorage do navegador; o servidor nunca teve como
  // conhecê-lo. Havia um `D.agendamento(agId)` aqui como padrão para o que o corpo não
  // mandasse — resto da época em que data.ts guardava uma agenda de exemplo. Com ela
  // fora, esse fallback devolveria `undefined` para todo id: um padrão que nunca cai é
  // pior que padrão nenhum, porque esconde a ausência do campo até o erro aparecer
  // longe daqui. Faltou campo, é `payload_invalido` — a validação abaixo cobre todos.
  //
  // (A prioridade já era essa e continua sendo. A primeira versão preferia o catálogo ao
  // corpo, e o efeito era o pior possível: a gaveta mostrava "15:00" e o evento nascia
  // às 10:00, porque o arrasto do usuário só existia no navegador.)
  //
  // Não é furo de segurança: o usuário está autenticado e escrevendo na PRÓPRIA agenda
  // conectada (acessoValido é escopado à sessão) — ele poderia criar o mesmo evento
  // direto no Google. A validação abaixo é sanidade de dado, não fronteira de acesso.
  const data = String(body?.data ?? "");
  const inicio = Number(body?.inicio);
  const profissionalId = String(body?.profissionalId ?? "");
  const servicoId = String(body?.servicoId ?? "");
  const clienteId = String(body?.clienteId ?? "");

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
  // Criar no PASSADO deixou de ser recusado — a recusa é que estava errada.
  //
  // Enquanto o calendário era fictício, "já passou" pegava um artefato: o mês fixo era
  // empurrado por semanas inteiras, então clicar em quase qualquer dia anterior batia
  // aqui e voltava 400. Com datas reais o clique é legítimo: registrar às 15h o encaixe
  // que entrou às 14h é uso normal de agenda, e o Google cria sem reclamar.
  //
  // Fica a sanidade de faixa. Uma data corrompida não deve plantar evento em 1998 nem em
  // 2200 — lá ninguém olha, e o dono levaria meses para descobrir que tem lixo na agenda.
  const distanciaDias = (Date.parse(inicioISO) - Date.now()) / 86_400_000;
  if (Math.abs(distanciaDias) > 366) {
    return NextResponse.json(
      { ok: false, status: "payload_invalido", info: "Data a mais de um ano daqui." },
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

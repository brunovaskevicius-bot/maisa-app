import { NextResponse } from "next/server";
import { agenteConfigurado, agenteWhatsapp, modeloEmUso, servicos } from "@/composicao";
import { atorAgente, type ContextoTenant } from "@/nucleo/dominio/tenant";
import { espiarMemoriaDemo, limparDemo } from "@/adaptadores/saida/demo/memoria";
import { espiarAgendaDemo, limparAgendaDemo } from "@/adaptadores/saida/demo/agenda";
import { espelhoDemo, zerarEspelhoDemo } from "@/adaptadores/saida/demo/atendimentos";
import { isGoogleConfigured } from "@/adaptadores/saida/google/config";
import { isEvolutionConfigured } from "@/adaptadores/saida/evolution/config";
import { isGeminiConfigured } from "@/adaptadores/saida/gemini/config";
import { hhmm } from "@/nucleo/dominio/tempo";

// ─────────────────────────────────────────────────────────────────────────────
// LABORATÓRIO — conversar com a MAISA sem WhatsApp.
//
// GET    → estado (quem responde, qual agenda, o que a MAISA lembra)
// POST   → manda uma mensagem como se fosse o cliente
// DELETE → esquece tudo (memória, histórico, agenda)
//
// ⚠️ POR QUE NÃO É A ROTA `/api/whatsapp`.
//
// Aquela é um webhook PÚBLICO e falha fechada: sem `WHATSAPP_WEBHOOK_SECRET` ela recusa
// tudo, e o inquilino sai do DESTINO da mensagem (instância da Evolution ou número da
// Cloud API). Para testar o tom da MAISA no navegador, isso significaria configurar
// Evolution só para digitar "bom dia" — e a tentação seria afrouxar a autenticação do
// webhook "só no dev". Webhook afrouxado no dev é webhook afrouxado.
//
// Então este é um adaptador de entrada IRMÃO, com fronteira própria: fechado em
// produção, e o contexto do inquilino montado aqui em vez de resolvido de um envelope
// que não existe. Uma mentira menor e visível, em vez de um furo no lugar sério.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ⚠️ A FRONTEIRA DESTE ARQUIVO. Rota sem autenticação nenhuma que fala com o agente
 * (gastando token) e escreve na agenda: em produção ela não pode existir.
 *
 * Fecha por padrão e só abre com `MAISA_LABORATORIO=1` explícito — o inverso (abrir por
 * padrão e fechar com flag) é o arranjo que vaza, porque ninguém lembra de setar a flag
 * no deploy que importa.
 */
const LIBERADO = process.env.NODE_ENV !== "production" || process.env.MAISA_LABORATORIO === "1";

/** Telefone padrão: a Mariana Alves dos fixtures. Escolhido para o laboratório abrir já
 *  no caminho de CLIENTE RECONHECIDO — é o que exercita a memória. Trocar o número no
 *  campo da tela dá o caminho de desconhecido. */
const TELEFONE_PADRAO = "11981234567";

/**
 * O inquilino, montado aqui.
 *
 * `MAISA_TENANT_ID` com fallback para uma constante é deliberado: exigir a variável
 * faria o laboratório precisar de DUAS configurações para funcionar, e o objetivo é que
 * uma chave de IA baste para conversar. O id só precisa ser estável — é chave de
 * memória, não credencial.
 */
function tenantDoLaboratorio(): ContextoTenant {
  const tenantId = process.env.MAISA_TENANT_ID?.trim() || "laboratorio";
  return { tenantId, usuarioId: tenantId, ator: atorAgente("laboratorio") };
}

function fechado() {
  return NextResponse.json({ ok: false, erro: "laboratorio_fechado" }, { status: 404 });
}

export async function GET() {
  if (!LIBERADO) return fechado();

  const t = tenantDoLaboratorio();

  return NextResponse.json({
    ok: true,
    pronto: agenteConfigurado(),
    modelo: modeloEmUso(),
    provedor: isGeminiConfigured ? "gemini" : process.env.ANTHROPIC_API_KEY ? "anthropic" : null,
    /* Os três avisos que explicam qualquer estranheza no comportamento. Sem eles, um
     * horário que "não existe" parece bug do agente quando é só a agenda de mentira. */
    agenda: isGoogleConfigured ? "google" : "demonstração (em memória)",
    canal: isEvolutionConfigured ? "evolution" : "log do servidor",
    telefonePadrao: TELEFONE_PADRAO,
    memoria: espiarMemoriaDemo(t.tenantId).map((m) => ({
      telefone: m.telefone,
      nome: m.nome ?? null,
      servicoFavorito: m.servicoFavoritoId ?? null,
      profissionalFavorito: m.profissionalFavoritoId ?? null,
      // Hora legível: `14.5` na tela seria a MAISA falando em hora decimal.
      horarioFavorito: m.horarioFavorito !== undefined ? hhmm(m.horarioFavorito) : null,
      visitas: m.historico.length,
    })),
    agendados: espiarAgendaDemo(t.tenantId)
      .filter((e) => e.daMaisa)
      .map((e) => ({ data: e.data, hora: hhmm(e.inicio), cliente: e.cliente, servico: e.servico })),
    /**
     * O ESPELHO — a linha que foi (ou não) para `atendimentos`.
     *
     * Vale a coluna própria por um motivo específico: `agendados` mostra a AGENDA, e a
     * agenda é o Google. Um agendamento pode aparecer lá e faltar aqui, e é exatamente
     * essa divergência que interessa — ela significa que o faturamento e a auditoria de
     * ator perderam aquele atendimento. Sem esta lista, o buraco no espelho é invisível
     * até alguém abrir a tela de Faturamento e achar o mês fraco.
     *
     * `ator` está aqui porque é a pergunta que o espelho existe para responder: quais
     * destes a MAISA marcou sozinha?
     */
    espelho: espelhoDemo(t.tenantId).map((l) => ({
      data: l.dataLocal,
      hora: hhmm(l.horaInicio),
      cliente: l.clienteNome,
      /* `null` aqui é o sinal de que quem marcou não entrou no cadastro — e é o que faz
       * `v_clientes.valor` somar zero para essa pessoa. */
      clienteId: l.clienteId,
      servico: l.servicoNome,
      valor: l.servicoValor,
      ator: l.ator,
      situacao: l.situacao,
    })),
    /** Quem a MAISA cadastrou conversando. Só os criados pelo agente — o fixture tem 17
     *  e listá-los todos afogaria o que interessa. */
    clientesNovos: (await servicos.negocio.clientes(t))
      .filter((c) => c.id.startsWith("cl-demo-"))
      .map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone })),
  });
}

export async function POST(request: Request) {
  if (!LIBERADO) return fechado();

  if (!agenteConfigurado()) {
    return NextResponse.json(
      { ok: false, erro: "Sem chave de IA. Preencha GEMINI_API_KEY (ou ANTHROPIC_API_KEY) no .env.local e reinicie o dev." },
      { status: 503 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const texto = String(corpo?.texto ?? "").trim();
  const de = String(corpo?.de ?? "").trim() || TELEFONE_PADRAO;

  if (!texto) return NextResponse.json({ ok: false, erro: "mensagem vazia" }, { status: 400 });

  try {
    const r = await agenteWhatsapp()(tenantDoLaboratorio(), { de, texto });

    return NextResponse.json({
      ok: true,
      bolhas: r.bolhas,
      escalou: r.escalou,
      motivo: r.motivo ?? null,
      /* A trilha é o motivo de este laboratório existir em vez de um `curl`. Ela mostra
       * se a MAISA chamou `oferecer_horarios` ANTES de falar de agenda — e no texto da
       * resposta os dois casos (consultou / inventou) são indistinguíveis. */
      trilha: r.trilha,
      modelo: r.modelo,
      voltas: r.voltas,
    });
  } catch (e) {
    /* No laboratório o erro VAI para a tela, ao contrário da rota de produção que engole.
     * É o ponto: aqui quem lê é quem consegue consertar, e esconder a mensagem do
     * provedor (o 400 que diz qual campo do schema da ferramenta ele recusou) trocaria
     * dez minutos de conserto por uma tarde de adivinhação. */
    console.error("[api/laboratorio] falha", e);
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE() {
  if (!LIBERADO) return fechado();

  limparDemo();
  limparAgendaDemo();
  /* O espelho entra no "Esquecer tudo" junto com memória e agenda: deixá-lo de fora faria
   * o caminho "cliente que nunca falou com a MAISA" mostrar o atendimento da rodada
   * anterior, e é justamente esse caminho que decide a primeira impressão do produto.
   *
   * ⚠️ O CLIENTE CADASTRADO NÃO SAI. `garantirCliente` empurra no array de fixture, e não
   * há como distinguir o que ele criou do que já vinha — quem quiser o estado limpo de
   * verdade reinicia o `next dev`. Está escrito para ninguém achar que zerou e não zerou. */
  zerarEspelhoDemo();
  return NextResponse.json({ ok: true, limpou: true });
}

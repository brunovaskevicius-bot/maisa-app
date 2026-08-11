/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `AgendaExterna` em MEMÓRIA DE PROCESSO.
 *
 * Existe por um motivo prático e imediato: sem credencial do Google, `oferecerHorarios`
 * estoura, o agente escala para humano em toda tentativa de marcar, e o laboratório de
 * conversa não serve para nada — o que a gente mais precisa testar (o fluxo de marcar)
 * seria justamente o que não roda.
 *
 * Mesmo padrão do `canal`: com a integração de verdade configurada, usa a de verdade;
 * sem, usa esta. A escolha vive em `composicao.ts`.
 *
 * ⚠️ LIMITAÇÃO DECLARADA. `Map` de módulo: morre no redeploy e não é compartilhado
 * entre instâncias. Aqui isso é ACEITÁVEL de um jeito que não era na memória do
 * cliente — uma agenda de mentira que reseta é uma agenda de mentira, e ninguém
 * esperava persistência dela. Nunca selecione este adaptador em produção.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { AgendaExterna, ConexoesDeAgenda } from "@/nucleo/portas/saida/agenda-externa";
import type { EventoDeAgenda } from "@/nucleo/dominio/agenda";
import { civilSP, hojeISO, instanteISO, somarDias } from "@/nucleo/dominio/tempo";
import { NaoEncontrado } from "@/nucleo/dominio/erros";

type Guardado = EventoDeAgenda & { tenantId: string; agendaId: string };

const EVENTOS: Guardado[] = [];
let sequencia = 0;

/**
 * Almoço de 12h às 13h, todo dia útil, nas próximas duas semanas.
 *
 * A agenda começa com ALGO ocupado de propósito. Uma agenda vazia responde "tenho tudo
 * livre" a qualquer pergunta, e aí o laboratório nunca exercita o caminho que mais
 * importa: a MAISA topando com um horário tomado e tendo que oferecer outro. Um bloco
 * sem marca da MAISA também prova que compromisso pessoal do dono bloqueia horário —
 * que é o comportamento que o dono espera e o mais fácil de quebrar sem notar.
 */
function semear(tenantId: string, agendaId: string) {
  const jaTem = EVENTOS.some((e) => e.tenantId === tenantId && e.agendaId === agendaId && e.titulo === "Almoço");
  if (jaTem) return;

  const hoje = hojeISO();
  for (let i = 0; i < 14; i++) {
    const data = somarDias(hoje, i);
    EVENTOS.push({
      tenantId, agendaId,
      eventoId: `almoco-${data}`,
      data, inicio: 12, fim: 13, duracao: 60,
      titulo: "Almoço",
      recorrente: false,
      aguardandoResposta: false,
    });
  }
}

export const agendaDemo: AgendaExterna = {
  async listar(ctx, janela) {
    semear(ctx.tenant.tenantId, ctx.agendaId);
    return EVENTOS
      .filter(
        (e) =>
          e.tenantId === ctx.tenant.tenantId &&
          e.agendaId === ctx.agendaId &&
          e.data >= janela.de &&
          e.data <= janela.ate,
      )
      // Cópia: o núcleo trata evento como leitura, e devolver a referência do array
      // faria uma mutação acidental "funcionar" aqui e falhar contra o Google.
      .map((e) => ({ ...e }));
  },

  async buscarPorAtendimento(ctx, p) {
    /* A metade de servidor da criação idempotente. Aqui a busca é trivial (varredura de
     * array); no Google ela varre alguns dias em torno de `perto`. O `perto` é ignorado
     * de propósito — filtrar por proximidade num array de dez itens só criaria uma
     * diferença de comportamento entre os dois adaptadores. */
    const achado = EVENTOS.find(
      (e) => e.tenantId === ctx.tenant.tenantId && e.agendaId === ctx.agendaId && e.maisa?.ag === p.ag,
    );
    return achado ? { ...achado } : null;
  },

  async criar(ctx, ev) {
    const c = civilSP(ev.inicio);
    if (!c) throw new NaoEncontrado("Instante do evento");

    const fim = civilSP(ev.fim);
    const eventoId = `demo-${++sequencia}`;

    EVENTOS.push({
      tenantId: ctx.tenant.tenantId,
      agendaId: ctx.agendaId,
      eventoId,
      data: c.data,
      inicio: c.hora,
      fim: fim?.hora ?? c.hora + ev.duracaoMin / 60,
      duracao: ev.duracaoMin,
      titulo: ev.titulo,
      recorrente: false,
      // Sem convidado, ninguém tem o que responder — igual ao caminho real, onde
      // convidar o cliente é opt-in e o padrão é não convidar.
      aguardandoResposta: false,
      maisa: ev.atendimento,
      // Sem Meet: não há provedor de videochamada de mentira, e devolver um link falso
      // faria a MAISA prometer ao cliente uma sala que não existe.
    });

    return { eventoId };
  },

  async remarcar(ctx, p) {
    const ev = EVENTOS.find(
      (e) => e.tenantId === ctx.tenant.tenantId && e.agendaId === ctx.agendaId && e.eventoId === p.eventoId,
    );
    if (!ev) throw new NaoEncontrado("Evento");

    const c = civilSP(p.inicio);
    const f = civilSP(p.fim);
    if (!c) throw new NaoEncontrado("Instante do evento");

    ev.data = c.data;
    ev.inicio = c.hora;
    ev.fim = f?.hora ?? c.hora + ev.duracao / 60;
  },

  async cancelar(ctx, p) {
    const i = EVENTOS.findIndex(
      (e) => e.tenantId === ctx.tenant.tenantId && e.agendaId === ctx.agendaId && e.eventoId === p.eventoId,
    );
    /* Cancelar o que não existe é SUCESSO, não erro: é o resultado que quem pediu
     * queria (o horário não está mais lá), e uma retentativa do agente depois de um
     * cancelamento que deu certo não deve virar mensagem de falha para o cliente. */
    if (i >= 0) EVENTOS.splice(i, 1);
  },
};

/** Nenhuma conta conectada, e é a resposta honesta: não há OAuth de mentira aqui. A
 *  tela de ajustes mostra "conectar", que é exatamente o estado real. */
export const conexoesDemo: ConexoesDeAgenda = {
  async listar() {
    return [];
  },
  async desconectar() {
    return { revogado: false };
  },
};

/** Dev-only: zera a agenda para o laboratório poder recomeçar limpo. Não faz parte da
 *  porta — é afordância deste adaptador, e por isso não aparece em `AgendaExterna`. */
export function limparAgendaDemo() {
  EVENTOS.length = 0;
  sequencia = 0;
}

/** Para o laboratório mostrar o que está na agenda sem passar por caso de uso. */
export function espiarAgendaDemo(tenantId: string) {
  return EVENTOS.filter((e) => e.tenantId === tenantId).map((e) => ({
    data: e.data,
    inicio: e.inicio,
    titulo: e.titulo,
    daMaisa: !!e.maisa,
    cliente: e.maisa?.clienteNome,
    servico: e.maisa?.servicoNome,
  }));
}

/** Instante ISO de um horário civil — reexportado para o semeador de teste. */
export const instanteDemo = instanteISO;

/* ─────────────────────────────────────────────────────────────────────────────
 * AGENDA — atendimentos, etapas do dia e o que se lê de uma agenda externa.
 *
 * A fonte da verdade dos atendimentos é a TABELA `atendimentos` do produto (ADR-0009). O
 * calendário externo conectado é uma camada ADITIVA: acrescenta o compromisso que nasceu
 * fora da MAISA e, quando não existe ou falha, acrescenta zero.
 *
 * ⚠️ Este cabeçalho dizia o contrário — "a fonte da verdade é a agenda externa… o app não
 * mantém uma segunda lista". O que aquilo protegia continua valendo: duas listas
 * SIMÉTRICAS deixam toda tela sem saber qual é a real. A assimetria é o que sustenta duas
 * fontes — uma manda, a outra soma.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Etapa do dia — as três colunas do kanban. */
export type Etapa = "chegando" | "atendendo" | "feito";

export const ETAPAS: Etapa[] = ["chegando", "atendendo", "feito"];

export type Agendamento = {
  id: string;
  /** Data ISO, "YYYY-MM-DD". Ausente ⇒ hoje. */
  data?: string;
  /** Início em hora decimal: 9.5 = 09:30. */
  inicio: number;
  profissionalId: string;
  servicoId: string;
  clienteId: string;
  /** Confirmou pelo WhatsApp? false ⇒ a MAISA ainda está cobrando. */
  confirmado: boolean;
  etapaInicial: Etapa;
};

/** Atendimento sendo marcado, antes de virar evento de verdade na agenda.
 *  Nasce com horário e profissional (vieram do clique no vago); cliente e serviço faltam. */
export type RascunhoAgendamento = {
  id: string;
  /**
   * uuid cunhado quando o rascunho nasce, e mandado ao servidor na criação.
   *
   * É a chave de IDEMPOTÊNCIA: o servidor procura um evento com esta marca antes de
   * inserir. Nasce na origem do pedido, e não na hora de enviar, justamente para
   * sobreviver a uma falha — "Tentar de novo" reusa a mesma chave e encontra o evento
   * que a primeira tentativa talvez tenha criado, em vez de criar um segundo.
   *
   * Vale igual para o agente de WhatsApp: ele cunha o uuid quando decide marcar, e uma
   * retentativa do modelo não vira dois horários para o mesmo cliente.
   */
  maisaAg: string;
  /** Data ISO em que o clique caiu — com Semana e Mês na tela, o vago já não é sempre hoje. */
  data: string;
  profissionalId: string;
  inicio: number;
  clienteId: string;
  servicoId: string;
};

/* ───────────────────────────── o que volta da agenda externa ───────────────────────────── */

/**
 * Um atendimento da MAISA reconhecido dentro de um evento externo.
 *
 * Os nomes vêm DESNORMALIZADOS de propósito: um serviço criado pelo usuário pode existir
 * só no navegador dele, e sem a cópia o evento voltaria apontando para um id que não
 * resolve — o atendimento simplesmente não renderizaria noutro dispositivo.
 */
export type AtendimentoMarcado = {
  /** O uuid de idempotência (ver RascunhoAgendamento.maisaAg). */
  ag: string;
  profissionalId: string;
  clienteId: string;
  clienteNome: string;
  clienteTel: string;
  servicoId: string;
  servicoNome: string;
  servicoValor: number;
};

/** Um evento já traduzido para a língua da grade: data civil + hora decimal. */
export type EventoDeAgenda = {
  eventoId: string;
  /** "2026-08-06" em horário de São Paulo. */
  data: string;
  /** Hora decimal: 14.5 = 14:30. */
  inicio: number;
  fim: number;
  /** Minutos. */
  duracao: number;
  titulo: string;
  meetLink?: string;
  htmlLink?: string;
  /** Instância de evento recorrente. Renderiza, mas não se arrasta. */
  recorrente: boolean;
  /**
   * Presente só quando o evento foi criado pela MAISA. É o que separa, na MESMA
   * resposta do provedor, o atendimento de cliente do compromisso pessoal — um vira
   * bloco colorido e arrastável, o outro vira bloqueio cinza e intocável.
   */
  maisa?: AtendimentoMarcado;
  /**
   * Algum convidado que não é você ainda não respondeu.
   *
   * É a única fonte REAL de "confirmado" que existe hoje. Como convidar o cliente é
   * opt-in e o padrão é não convidar, na prática quase todo atendimento nasce sem
   * convidados e portanto confirmado — o que é honesto, porque ninguém prometeu nada
   * a ninguém por e-mail.
   */
  aguardandoResposta: boolean;
};

/** O que a criação devolve de volta. */
export type EventoCriado = {
  eventoId: string;
  /** URL do Meet. Ausente quando o provedor ainda não terminou de criar a conferência. */
  meetLink?: string;
  htmlLink?: string;
};

/* ───────────────────────────── invariantes ───────────────────────────── */

/** Hora decimal dentro do dia e em passos de meia hora. */
export const horaValida = (h: number) =>
  Number.isFinite(h) && h >= 0 && h < 24 && Math.round(h * 2) === h * 2;

/** Atendimento de menos de 5 min ou mais de 8 h é dado corrompido, não caso de uso. */
export const duracaoValida = (min: number) => Number.isFinite(min) && min >= 5 && min <= 480;

/** Um uuid v4 canônico — o formato da chave de idempotência. */
export const ehUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * Quão longe daqui uma data pode estar. Não é regra de negócio, é sanidade: uma data
 * corrompida não deve plantar evento em 1998 nem em 2200 — lá ninguém olha, e o dono
 * levaria meses para descobrir que tem lixo na agenda.
 *
 * Marcar no PASSADO é permitido de propósito: registrar às 15h o encaixe que entrou às
 * 14h é uso normal de agenda.
 */
export const DIAS_DE_ALCANCE = 366;

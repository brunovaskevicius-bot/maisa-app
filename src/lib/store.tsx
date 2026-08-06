"use client";
/* MAISA — store central do app.
 *
 * Uma fonte de verdade para tudo que o usuário muda: etapa do kanban, posição na
 * agenda, quem conduz cada conversa, toggles do catálogo/equipe, ajustes da MAISA
 * e o ciclo de vida das notas fiscais.
 *
 * Persistência: localStorage, chave "maisa.app.v2". Só o que é DECISÃO do usuário
 * persiste — estado de navegação (tela, gaveta aberta, filtro, drag) é volátil de
 * propósito: recarregar cai no Fluxo de hoje limpo, não no meio de um arrasto.
 *
 * A emissão de nota é a única ação que sai do navegador: ela chama /api/nf/*, que
 * valida a sessão e fala com a Focus NFe do lado do servidor. Sem token da Focus a
 * rota responde "simulado" e o fluxo roda inteiro igual — inclusive o polling. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as D from "./data";
import { toast } from "./ui";

/* ───────────────────────────── tipos ───────────────────────────── */

export type TelaId =
  | "fluxo" | "conversas" | "agenda" | "clientes" | "faturamento"
  | "equipe" | "servicos" | "assistente" | "mais";

export type AbaConversa = "todas" | "espera" | "maisa" | "ok";

export type Assistente = { nome: string; tom: D.Tom; saudacao: string; ativa: boolean };

/** Agendamento com tudo já resolvido — o que as telas consomem. */
export type AgendamentoVivo = {
  id: string;
  /** Dia do mês em D.MES_AGENDA. */
  dia: number;
  inicio: number;
  fim: number;
  duracao: number;
  profissionalId: string;
  profissional: D.Profissional;
  servico: D.Servico;
  cliente: D.Cliente;
  confirmado: boolean;
  etapa: D.Etapa;
};

/** Evento criado no Google Calendar para um agendamento.
 *
 *  Mora no localStorage, junto do resto: o Supabase guarda só os TOKENS. Os
 *  agendamentos deste app são mock em src/lib/data.ts + o que o usuário marca no
 *  navegador — não existe tabela de agendamentos para pendurar um google_event_id.
 *  Manter o vínculo aqui é o que permite a integração ser real sem transformar o
 *  protótipo inteiro num app com banco. */
export type EventoGoogle = {
  eventId: string;
  meetLink?: string;
  htmlLink?: string;
  /** De quem era a agenda — necessário para cancelar depois. */
  profissionalId: string;
  /** Instante REAL do evento ("2026-08-21T14:30:00-03:00"), como o servidor criou.
   *
   *  Gravado porque a previsão não serve depois: `semanasDeslocadas` depende de
   *  Date.now() e salta 7 dias uma vez por semana. Sem isto, a gaveta passaria a
   *  mostrar — e o WhatsApp a anunciar — uma data 7 dias à frente do evento que
   *  está de fato no Google. */
  inicioISO?: string;
};

/** O que sobrevive a um F5. */
type Persistido = {
  etapas: Record<string, D.Etapa>;
  /** Resultado de arrastar na Agenda. `dia` é opcional: posição gravada antes da visão de Semana
   *  não tem o campo, e o fallback é o dia de origem do agendamento. */
  posicoes: Record<string, { profissionalId: string; inicio: number; dia?: number }>;
  profAtivo: Record<string, boolean>;
  svcAtivo: Record<string, boolean>;
  /** Edições de serviço por id (nome/preço/duração/categoria). D.SERVICOS é catálogo de partida. */
  svcEdit: Record<string, Partial<D.Servico>>;
  /** Serviços criados pelo usuário — não existem em D.SERVICOS. */
  svcNovos: D.Servico[];
  /** Atendimentos marcados pelo usuário na Agenda — D.AGENDAMENTOS é o dia de partida. */
  novosAgendamentos: D.Agendamento[];
  cliAtivo: Record<string, boolean>;
  assumidas: Record<string, boolean>;
  resolvidos: Record<string, boolean>;
  enviadas: Record<string, D.Msg[]>;
  notas: Record<string, D.Nota>;
  proximoNumero: number;
  /** Eventos já criados no Google, por id de agendamento. */
  googleEventos: Record<string, EventoGoogle>;
  assistente: Assistente;
  dias: D.Dia[];
  cfg: Record<D.ChaveCfg, boolean>;
};

const CHAVE = "maisa.app.v2";

/* Motivos que a rota de conexão devolve na query string, em português de gente.
 * Cada um diz o que aconteceu E o que fazer — "erro genérico" não ajuda ninguém. */
const MOTIVO_GOOGLE: Record<string, string> = {
  nao_configurado: "O Google Calendar ainda não está configurado neste ambiente",
  nao_autenticado: "Sua sessão expirou — entre de novo para conectar",
  login_necessario: "Entre na sua conta para conectar uma agenda",
  profissional_invalido: "Profissional não encontrado",
  permissao_negada: "Você não autorizou o acesso à agenda",
  sessao_expirada: "A conexão demorou demais — tente de novo",
  sem_codigo: "O Google não devolveu a autorização",
  pkce_ausente: "A conexão foi interrompida — tente de novo",
  sem_refresh_token: "O Google não liberou acesso contínuo. Remova a MAISA em myaccount.google.com → Segurança e conecte de novo",
  falha_ao_conectar: "Não foi possível concluir a conexão com o Google",
};

/** Status de erro das rotas de evento (respostas JSON). */
const RESPOSTA_GOOGLE: Record<string, string> = {
  nao_configurado: "O Google Calendar não está configurado neste ambiente",
  nao_autenticado: "Sua sessão expirou — entre de novo",
  login_necessario: "Entre na sua conta para usar o Google Calendar",
  payload_invalido: "Faltam dados do atendimento",
};

/** Um único array vazio compartilhado para os dias sem nada marcado — devolver `[]` novo a cada
 *  chamada faria toda dependência de memo mudar de identidade sem nada ter mudado de verdade. */
const SEM_ATENDIMENTO: AgendamentoVivo[] = [];

const INICIAL: Persistido = {
  etapas: {},
  posicoes: {},
  profAtivo: {},
  svcAtivo: {},
  svcEdit: {},
  svcNovos: [],
  novosAgendamentos: [],
  cliAtivo: {},
  assumidas: {},
  resolvidos: {},
  enviadas: {},
  notas: {},
  proximoNumero: D.PROXIMO_NUMERO,
  googleEventos: {},
  assistente: {
    nome: "MAISA",
    tom: "amigável",
    saudacao: `Olá! Aqui é a MAISA, assistente do ${D.NEGOCIO.nome}. Como posso te ajudar hoje?`,
    ativa: true,
  },
  dias: D.DIAS_PADRAO,
  cfg: D.CFG_PADRAO,
};

/* ───────────────────────────── contexto ───────────────────────────── */

export type StoreValue = {
  /* navegação */
  tela: TelaId;
  irPara: (t: TelaId) => void;
  /** id aberto na Gaveta (cliente, agendamento, conversa, serviço, seção…). */
  sel: string | null;
  abrir: (id: string) => void;
  fechar: () => void;

  /* fluxo de hoje + agenda (mesma lista) — `agendamentos` é o MÊS inteiro */
  agendamentos: AgendamentoVivo[];
  agendamentosDoDia: (dia: number) => AgendamentoVivo[];
  agendamentoPorId: (id: string) => AgendamentoVivo | undefined;
  moverEtapa: (id: string, etapa: D.Etapa) => void;
  avancarEtapa: (id: string) => void;
  reposicionar: (id: string, profissionalId: string, inicio: number, dia?: number) => void;
  /** Itens da fila "Precisa de você" que ainda não foram resolvidos. */
  fila: D.ItemFila[];
  resolverFila: (alvo: string) => void;

  /* arrasto (compartilhado por kanban e agenda) */
  arrastando: string | null;
  alvoSolta: string | null;
  iniciarArrasto: (id: string) => void;
  encerrarArrasto: () => void;
  marcarAlvo: (alvo: string | null) => void;

  /* conversas */
  convSel: string;
  selecionarConversa: (id: string) => void;
  abaConv: AbaConversa;
  setAbaConv: (a: AbaConversa) => void;
  estadoConversa: (id: string) => D.EstadoConversa;
  threadDe: (id: string) => D.Msg[];
  assumir: (id: string) => void;
  devolver: (id: string) => void;
  enviar: (id: string, txt: string) => void;

  /* catálogo, equipe, clientes */
  profAtivo: (id: string) => boolean;
  alternarProf: (id: string) => void;
  svcAtivo: (id: string) => boolean;
  alternarSvc: (id: string) => void;
  /** Catálogo vivo: D.SERVICOS + edições + criados. As telas leem daqui, não de D.SERVICOS. */
  servicos: D.Servico[];
  servicoDe: (id: string) => D.Servico | undefined;
  editarServico: (id: string, patch: Partial<D.Servico>) => void;
  criarServico: () => void;
  excluirServico: (id: string) => void;
  cliAtivo: (id: string) => boolean;
  alternarCli: (id: string) => void;
  filtroSvc: string;
  setFiltroSvc: (f: string) => void;
  filtroCli: string;
  setFiltroCli: (f: string) => void;

  /* nota fiscal */
  notaDe: (clienteId: string) => D.Nota;
  emitirNota: (clienteId: string) => void;
  emitirPendentes: () => void;
  cancelarNota: (clienteId: string) => void;
  /** Clientes com valor fechado no mês — a base do Faturamento. */
  fechamento: D.Cliente[];
  /** O que o lote REALMENTE vai emitir. Hero, topbar e lote leem daqui — fonte única. */
  emitiveis: D.Cliente[];
  loteAberto: boolean;
  pedirLote: () => void;
  fecharLote: () => void;
  confirmarLote: () => void;

  /* ajustes da MAISA */
  secAtiva: string | null;
  abrirSecao: (id: string) => void;
  assistente: Assistente;
  setAssistente: (patch: Partial<Assistente>) => void;
  dias: D.Dia[];
  alternarDia: (nome: string) => void;
  setHorario: (nome: string, campo: "de" | "ate", valor: string) => void;
  cfg: Record<D.ChaveCfg, boolean>;
  alternarCfg: (chave: D.ChaveCfg) => void;
  salvo: boolean;
  salvar: () => void;

  /* agenda — dia visível e criação de atendimento */
  /** Número do dia que a Agenda está mostrando. Começa em hoje. */
  diaSel: number;
  verDia: (num: number) => void;
  /** Atendimento sendo marcado (clique num horário vago), antes de virar agendamento. */
  rascunho: D.RascunhoAgendamento | null;
  novoAgendamento: (profissionalId: string, inicio: number, dia: number) => void;
  editarRascunho: (patch: Partial<D.RascunhoAgendamento>) => void;
  confirmarRascunho: () => void;
  descartarRascunho: () => void;

  /* google calendar */
  /** Estado da integração: se está configurada, se precisa de login, quem conectou. */
  google: EstadoGoogle;
  /** Conexão do profissional, se houver. */
  googleDe: (profissionalId: string) => { googleEmail: string } | undefined;
  /** Manda o navegador para o consentimento do Google (sai do app e volta). */
  conectarGoogle: (profissionalId: string) => void;
  desconectarGoogle: (profissionalId: string) => void;
  /** Evento já criado para um agendamento, se houver. */
  eventoGoogleDe: (agendamentoId: string) => EventoGoogle | undefined;
  criarEventoGoogle: (agendamentoId: string) => void;
  cancelarEventoGoogle: (agendamentoId: string) => void;
  /** Há chamada em voo para este id (agendamento ou profissional)? Desabilita o botão. */
  googleOcupado: (id: string) => boolean;

  /* rail */
  railAberto: boolean;
  setRailAberto: (v: boolean) => void;
};

/** O que a UI precisa saber sobre a integração antes de oferecer qualquer botão. */
export type EstadoGoogle = {
  /** "carregando" | "ok" | "nao_configurado" | "nao_autenticado" | "login_necessario" */
  status: "carregando" | "ok" | "nao_configurado" | "nao_autenticado" | "login_necessario";
  conexoes: { profissionalId: string; googleEmail: string }[];
  /** Variáveis de ambiente que faltam, quando status = nao_configurado. */
  faltando: string[];
};

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore() precisa estar dentro de <StoreProvider>.");
  return c;
}

/* ───────────────────────────── provider ───────────────────────────── */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  /* --- persistido --- */
  const [db, setDb] = useState<Persistido>(INICIAL);
  const hidratado = useRef(false);

  // Ler depois do mount: o 1º render precisa bater com o HTML do servidor.
  useEffect(() => {
    try {
      const cru = localStorage.getItem(CHAVE);
      if (cru) {
        const p = JSON.parse(cru) as Partial<Persistido>;
        setDb((prev) => ({
          ...prev,
          ...p,
          // `dias` é array de tamanho fixo: só aceita se vier íntegro, senão o padrão.
          dias: Array.isArray(p.dias) && p.dias.length === D.DIAS_PADRAO.length ? p.dias : prev.dias,
          assistente: { ...prev.assistente, ...(p.assistente ?? {}) },
          cfg: { ...prev.cfg, ...(p.cfg ?? {}) },
        }));
      }
    } catch {
      /* localStorage indisponível — segue nos defaults */
    }
    hidratado.current = true;
  }, []);

  useEffect(() => {
    if (!hidratado.current) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* noop */ }
  }, [db]);

  const patch = useCallback((f: (d: Persistido) => Partial<Persistido>) => {
    setDb((d) => ({ ...d, ...f(d) }));
  }, []);

  /* --- volátil --- */
  const [tela, setTela] = useState<TelaId>("fluxo");
  const [sel, setSel] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvoSolta, setAlvoSolta] = useState<string | null>(null);
  const [convSel, setConvSel] = useState<string>(D.CONVERSAS[0].id);
  const [abaConv, setAbaConv] = useState<AbaConversa>("todas");
  const [filtroSvc, setFiltroSvc] = useState("Todos");
  const [filtroCli, setFiltroCli] = useState("Ativos");
  const [secAtiva, setSecAtiva] = useState<string | null>("personalidade");
  const [salvo, setSalvo] = useState(false);
  const [railAberto, setRailAberto] = useState(false);
  // Dia visível na Agenda. Volátil de propósito: recarregar cai em hoje, como o resto da
  // navegação. Antes os seis botões de dia não tinham onClick nenhum — eram decoração.
  const [diaSel, setDiaSel] = useState(D.HOJE.num);

  /* ── navegação ── */
  const irPara = useCallback((t: TelaId) => { setTela(t); setSel(null); }, []);
  const abrir = useCallback((id: string) => setSel(id), []);
  const fechar = useCallback(() => setSel(null), []);

  // Esc fecha a gaveta — atalho único, vale nas duas formas (modal e folha).
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  /* ── agendamentos do mês ── */
  const agendamentos = useMemo<AgendamentoVivo[]>(() => {
    // D.AGENDAMENTOS é o dia de partida, D.AGENDA_MES é o resto do mês (gerado — ver data.ts),
    // e `novosAgendamentos` são os que o usuário marcou na Agenda.
    return [...D.AGENDAMENTOS, ...D.AGENDA_MES, ...db.novosAgendamentos].map((a) => {
      const pos = db.posicoes[a.id];
      const profissionalId = pos?.profissionalId ?? a.profissionalId;
      const inicio = pos?.inicio ?? a.inicio;
      const sv = D.servico(a.servicoId) ?? db.svcNovos.find((s) => s.id === a.servicoId)!;
      return {
        id: a.id,
        dia: pos?.dia ?? a.dia ?? D.HOJE.num,
        inicio,
        duracao: sv.duracao,
        fim: inicio + sv.duracao / 60,
        profissionalId,
        profissional: D.profissional(profissionalId)!,
        servico: sv,
        cliente: D.cliente(a.clienteId)!,
        confirmado: a.confirmado,
        etapa: db.etapas[a.id] ?? a.etapaInicial,
      };
    }).sort((x, y) => x.dia - y.dia || x.inicio - y.inicio);
    // novosAgendamentos e svcNovos entram nas deps: sem elas o memo ficava preso na lista antiga e
    // um atendimento recém-marcado era gravado no localStorage sem NUNCA aparecer na grade.
  }, [db.posicoes, db.etapas, db.novosAgendamentos, db.svcNovos]);

  /** Índice por dia. A grade de mês pergunta 35 vezes por render (uma por célula, e o hover
   *  re-renderiza a cada célula que o mouse cruza); com `.filter()` cada pergunta varria o mês
   *  inteiro. Além do custo, `filter` devolvia um array NOVO a cada chamada, então qualquer memo
   *  com essa lista na dependência nunca acertava o cache. */
  const porDia = useMemo(() => {
    const m = new Map<number, AgendamentoVivo[]>();
    for (const a of agendamentos) {
      const lista = m.get(a.dia);
      if (lista) lista.push(a);
      else m.set(a.dia, [a]);
    }
    return m;
  }, [agendamentos]);

  /** Os atendimentos de UM dia. `agendamentos` agora é o mês inteiro, então quem fala de "hoje"
   *  (o Fluxo, o kanban) precisa dizer qual dia quer — antes isso era implícito e virou uma
   *  armadilha no dia em que a lista passou a ter trinta dias. */
  const agendamentosDoDia = useCallback((dia: number) => porDia.get(dia) ?? SEM_ATENDIMENTO, [porDia]);

  const agendamentoPorId = useCallback(
    (id: string) => agendamentos.find((a) => a.id === id),
    [agendamentos],
  );

  /** Etapa atual de um agendamento, com o default do dado de origem. */
  const etapaDe = useCallback(
    (id: string): D.Etapa => db.etapas[id] ?? D.agendamento(id)?.etapaInicial ?? "chegando",
    [db.etapas],
  );

  /* As três ações abaixo eram IRREVERSÍVEIS E SILENCIOSAS: arrastar um cartão para "Feito hoje"
   * marcava um atendimento como concluído sem toast, sem anúncio para leitor de tela e sem volta.
   * Agora todas confirmam e todas oferecem "Desfazer" — inclusive porque remarcar dispara WhatsApp
   * de verdade para o cliente. O rótulo nomeia quem mudou, não "item atualizado". */
  const ROTULO_ETAPA: Record<D.Etapa, string> = {
    chegando: "Chegando", atendendo: "Em atendimento", feito: "Feito hoje",
  };

  /** O registro CRU de um agendamento — o do dado de partida, o do mês gerado, ou o que o usuário
   *  criou. D.agendamento() sozinho não conhece o terceiro, e por isso os toasts caíam no genérico
   *  "Atendimento →" justo para os atendimentos que o próprio usuário tinha marcado. */
  const registroDe = useCallback(
    (id: string) => D.agendamento(id) ?? db.novosAgendamentos.find((a) => a.id === id),
    [db.novosAgendamentos],
  );

  const moverEtapa = useCallback((id: string, etapa: D.Etapa) => {
    const antes = etapaDe(id);
    patch((d) => ({ etapas: { ...d.etapas, [id]: etapa } }));
    setArrastando(null);
    setAlvoSolta(null);
    if (antes === etapa) return;
    const a = registroDe(id);
    toast(
      `${a ? D.nomeCliente(a.clienteId) : "Atendimento"} → ${ROTULO_ETAPA[etapa]}`,
      { label: "Desfazer", onClick: () => patch((d) => ({ etapas: { ...d.etapas, [id]: antes } })) },
    );
  }, [patch, etapaDe, registroDe]);

  const avancarEtapa = useCallback((id: string) => {
    const antes = etapaDe(id);
    const i = D.ETAPAS.indexOf(antes);
    const prox = D.ETAPAS[Math.min(i + 1, D.ETAPAS.length - 1)];
    if (prox === antes) return;
    patch((d) => ({ etapas: { ...d.etapas, [id]: prox } }));
    const a = registroDe(id);
    toast(
      `${a ? D.nomeCliente(a.clienteId) : "Atendimento"} → ${ROTULO_ETAPA[prox]}`,
      { label: "Desfazer", onClick: () => patch((d) => ({ etapas: { ...d.etapas, [id]: antes } })) },
    );
  }, [patch, etapaDe, registroDe]);

  /** Remarca: muda hora, profissional e — desde a visão de Semana — o DIA.
   *  `dia` é opcional e o fallback é o dia atual do agendamento, então uma posição gravada antes
   *  desta mudança (localStorage de uma sessão anterior) continua válida em vez de cair no dia 1. */
  const reposicionar = useCallback((id: string, profissionalId: string, inicio: number, dia?: number) => {
    // registroDe e não D.agendamento(): sem os atendimentos que o USUÁRIO marcou, arrastar um
    // recém-criado saía pelo `if (!orig) return` lá embaixo — ele mudava de lugar sem toast e,
    // pior, sem "Desfazer".
    const orig = registroDe(id);
    const diaAtual = db.posicoes[id]?.dia ?? orig?.dia ?? D.HOJE.num;
    const destino = dia ?? diaAtual;
    // guarda a posição anterior REAL (a de origem, se nunca foi movido) para poder voltar
    const antes = db.posicoes[id] ?? (orig ? { profissionalId: orig.profissionalId, inicio: orig.inicio, dia: diaAtual } : null);
    patch((d) => ({ posicoes: { ...d.posicoes, [id]: { profissionalId, inicio, dia: destino } } }));
    setArrastando(null);
    setAlvoSolta(null);
    if (!orig) return;
    const quando = destino === D.HOJE.num ? D.hhmm(inicio) : `${destino} de ${D.MES_AGENDA.nome}, ${D.hhmm(inicio)}`;
    toast(
      `${D.nomeCliente(orig.clienteId)} → ${quando} com ${D.primeiroNome(D.nomeProfissional(profissionalId))}`,
      antes
        ? { label: "Desfazer", onClick: () => patch((d) => ({ posicoes: { ...d.posicoes, [id]: antes } })) }
        : undefined,
    );
  }, [patch, db.posicoes, registroDe]);

  /* ── fila "precisa de você" ──
   * A fila esvazia sozinha conforme você age em qualquer lugar do app: assumir a
   * conversa resolve o item dela, e dar chegada resolve a cobrança de confirmação
   * daquele horário. Sem isso o painel viraria uma lista que nunca zera. */
  const fila = useMemo(() => D.FILA.filter((f) => {
    if (db.resolvidos[f.alvo] || db.assumidas[f.alvo]) return false;
    if (f.alvo.startsWith("ag")) {
      const etapa = db.etapas[f.alvo] ?? D.agendamento(f.alvo)?.etapaInicial;
      return etapa === "chegando";
    }
    return true;
  }), [db.resolvidos, db.assumidas, db.etapas]);
  const resolverFila = useCallback((alvo: string) => {
    patch((d) => ({ resolvidos: { ...d.resolvidos, [alvo]: true } }));
    // "Já resolvi" gravava em localStorage para sempre e não existia função inversa: era a única
    // ação irreversível da tela e a estilizada como a MENOS importante.
    toast("Item resolvido", {
      label: "Desfazer",
      onClick: () => patch((d) => {
        const r = { ...d.resolvidos };
        delete r[alvo];
        return { resolvidos: r };
      }),
    });
  }, [patch]);

  /* ── arrasto ── */
  const iniciarArrasto = useCallback((id: string) => setArrastando(id), []);
  const encerrarArrasto = useCallback(() => { setArrastando(null); setAlvoSolta(null); }, []);
  const marcarAlvo = useCallback((alvo: string | null) => {
    setAlvoSolta((a) => (a === alvo ? a : alvo));
  }, []);

  /* ── conversas ── */
  const estadoConversa = useCallback((id: string): D.EstadoConversa => {
    if (db.assumidas[id]) return "voce";
    return D.conversa(id)?.estado ?? "maisa";
  }, [db.assumidas]);

  const threadDe = useCallback(
    (id: string) => [...(D.THREADS[id] ?? []), ...(db.enviadas[id] ?? [])],
    [db.enviadas],
  );

  const selecionarConversa = useCallback((id: string) => setConvSel(id), []);

  const assumir = useCallback((id: string) => {
    patch((d) => ({
      assumidas: { ...d.assumidas, [id]: true },
      resolvidos: { ...d.resolvidos, [id]: true },
    }));
    toast("Conversa assumida — a MAISA não responde mais aqui");
  }, [patch]);

  const devolver = useCallback((id: string) => {
    setDb((d) => {
      const a = { ...d.assumidas };
      delete a[id];
      return { ...d, assumidas: a };
    });
    toast("Devolvida à MAISA");
  }, []);

  const enviar = useCallback((id: string, txt: string) => {
    const t = txt.trim();
    if (!t) return;
    patch((d) => ({ enviadas: { ...d.enviadas, [id]: [...(d.enviadas[id] ?? []), { de: "voce", txt: t }] } }));
  }, [patch]);

  /* ── toggles ── */
  const profAtivo = useCallback(
    (id: string) => db.profAtivo[id] ?? D.profissional(id)?.ativo ?? false,
    [db.profAtivo],
  );
  const alternarProf = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.profAtivo[id] ?? D.profissional(id)?.ativo ?? false;
      return { ...d, profAtivo: { ...d.profAtivo, [id]: !atual } };
    });
  }, []);

  /* CATÁLOGO VIVO. D.SERVICOS é o ponto de partida; o que o usuário edita ou cria vem por cima.
   * Antes o catálogo era imutável e a gaveta do serviço só mostrava — com um chip prometendo
   * "abrir e editar". Preço e duração são a razão de existir de uma tela de catálogo. */
  const servicos = useMemo<D.Servico[]>(
    () => [
      ...D.SERVICOS.map((sv) => ({ ...sv, ...(db.svcEdit[sv.id] ?? {}) })),
      ...db.svcNovos.map((sv) => ({ ...sv, ...(db.svcEdit[sv.id] ?? {}) })),
    ],
    [db.svcEdit, db.svcNovos],
  );
  const servicoDe = useCallback(
    (id: string) => servicos.find((sv) => sv.id === id),
    [servicos],
  );

  const svcAtivo = useCallback(
    (id: string) => db.svcAtivo[id] ?? servicoDe(id)?.ativo ?? false,
    [db.svcAtivo, servicoDe],
  );
  const alternarSvc = useCallback((id: string) => {
    setDb((d) => {
      const base = D.servico(id)?.ativo ?? d.svcNovos.find((s) => s.id === id)?.ativo ?? false;
      const atual = d.svcAtivo[id] ?? base;
      return { ...d, svcAtivo: { ...d.svcAtivo, [id]: !atual } };
    });
  }, []);

  /** Grava uma edição de serviço. Persiste na hora — o app não tem botão "Salvar" de mentira. */
  const editarServico = useCallback((id: string, p: Partial<D.Servico>) => {
    patch((d) => ({ svcEdit: { ...d.svcEdit, [id]: { ...(d.svcEdit[id] ?? {}), ...p } } }));
  }, [patch]);

  /** Cria um serviço em branco, já fora do catálogo, e abre a gaveta para preencher. */
  const criarServico = useCallback(() => {
    const id = `sv-novo-${Date.now().toString(36)}`;
    const novo: D.Servico = {
      id, nome: "Novo serviço", categoria: "Extra",
      preco: 0, duracao: 30, profissionalIds: [],
      // nasce FORA do catálogo: um serviço sem preço não deveria poder ser agendado.
      ativo: false,
    };
    patch((d) => ({ svcNovos: [...d.svcNovos, novo] }));
    setSel(id);
    toast("Serviço criado — preencha preço e duração");
  }, [patch]);

  const verDia = useCallback((num: number) => {
    setDiaSel(num);
    setSel(null); // trocar de dia fecha a gaveta: o que estava aberto é de outro dia
  }, []);

  /* CRIAR ATENDIMENTO. A Agenda tinha 40 zonas de soltura que só aceitavam `onDrop`: não existia
   * caminho nenhum para MARCAR um horário — a ação nº1 de qualquer agenda. Clicar num vago agora
   * abre a gaveta num rascunho com o horário e o profissional já preenchidos (é o que o clique
   * disse), faltando só cliente e serviço. */
  const [rascunho, setRascunho] = useState<D.RascunhoAgendamento | null>(null);

  const novoAgendamento = useCallback((profissionalId: string, inicio: number, dia: number) => {
    // O dia entra no id junto com profissional e hora: com Semana e Mês na tela, "pr1 às 14h" já
    // não identifica um vago — existe um por dia do mês.
    const id = `novo-${dia}-${profissionalId}-${inicio}`;
    setRascunho({ id, dia, profissionalId, inicio, clienteId: "", servicoId: "" });
    setSel(id);
  }, []);

  const editarRascunho = useCallback((p: Partial<D.RascunhoAgendamento>) => {
    setRascunho((r) => (r ? { ...r, ...p } : r));
  }, []);

  const confirmarRascunho = useCallback(() => {
    // Lê `rascunho` direto, NÃO de dentro de um `setRascunho(r => …)`: gravar e emitir toast são
    // efeitos, e um updater de estado precisa ser puro — em desenvolvimento o React o invoca duas
    // vezes, e o atendimento entrava duplicado no localStorage. Pego no teste, não na leitura.
    const r = rascunho;
    if (!r || !r.clienteId || !r.servicoId) return;
    const novo: D.Agendamento = {
      id: `ag-novo-${r.dia}-${r.profissionalId}-${r.inicio}`,
      dia: r.dia,
      clienteId: r.clienteId,
      servicoId: r.servicoId,
      profissionalId: r.profissionalId,
      inicio: r.inicio,
      // marcado por você, na sua frente: já nasce confirmado
      confirmado: true,
      etapaInicial: "chegando",
    };
    // id derivado de profissional+hora, e não de Date.now(): idempotente, então mesmo se este
    // caminho rodar duas vezes o resultado é UM agendamento.
    patch((d) => ({
      novosAgendamentos: [...d.novosAgendamentos.filter((a) => a.id !== novo.id), novo],
    }));
    setRascunho(null);
    setSel(null);
    const quando = r.dia === D.HOJE.num ? "hoje" : `dia ${r.dia}`;
    toast(`${D.nomeCliente(r.clienteId)} marcado para ${quando} às ${D.hhmm(r.inicio)}`);
  }, [patch, rascunho]);

  const descartarRascunho = useCallback(() => { setRascunho(null); setSel(null); }, []);

  const excluirServico = useCallback((id: string) => {
    // Só apaga o que o usuário criou. Serviço do catálogo de partida se despublica pelo toggle,
    // porque pode haver agendamento histórico apontando para ele.
    patch((d) => ({ svcNovos: d.svcNovos.filter((s) => s.id !== id) }));
    setSel(null);
    toast("Serviço excluído");
  }, [patch]);

  const cliAtivo = useCallback(
    (id: string) => db.cliAtivo[id] ?? D.cliente(id)?.ativo ?? false,
    [db.cliAtivo],
  );
  const alternarCli = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.cliAtivo[id] ?? D.cliente(id)?.ativo ?? false;
      return { ...d, cliAtivo: { ...d.cliAtivo, [id]: !atual } };
    });
  }, []);

  /* ── nota fiscal ── */
  const notaDe = useCallback(
    (clienteId: string): D.Nota => db.notas[clienteId] ?? D.NOTAS_INICIAIS[clienteId] ?? { status: "pendente" },
    [db.notas],
  );

  const setNota = useCallback((clienteId: string, nota: D.Nota) => {
    patch((d) => ({ notas: { ...d.notas, [clienteId]: nota } }));
  }, [patch]);

  /** Número local, usado quando a emissão é simulada (sem token da Focus). */
  const numeroLocal = useCallback((clienteId: string, ref?: string) => {
    setDb((d) => ({
      ...d,
      proximoNumero: d.proximoNumero + 1,
      notas: {
        ...d.notas,
        [clienteId]: {
          status: "emitida",
          numero: `2026/${String(d.proximoNumero).padStart(6, "0")}`,
          data: D.HOJE.data,
          ref,
          simulada: true,
        },
      },
    }));
  }, []);

  // Timers de polling ativos — limpos no unmount para não vazar.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const agendar = useCallback((f: () => void, ms: number) => {
    timers.current.push(setTimeout(f, ms));
  }, []);

  const cancelarNota = useCallback(async (clienteId: string) => {
    const n = notaDe(clienteId);
    // Notas históricas (as que já vinham emitidas) não têm ref na Focus — cancela só aqui.
    if (!n.ref) { setNota(clienteId, { ...n, status: "cancelada" }); toast("Nota cancelada"); return; }
    try {
      const r = await fetch("/api/nf/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: n.ref }),
      }).then((x) => x.json());
      if (r.status === "cancelado") { setNota(clienteId, { ...n, status: "cancelada" }); toast("Nota cancelada"); return; }
      setNota(clienteId, { ...n, erro: r.erros?.[0]?.mensagem ?? "Não foi possível cancelar." });
    } catch {
      setNota(clienteId, { ...n, erro: "Sem conexão para cancelar a nota." });
    }
  }, [notaDe, setNota]);

  /**
   * Nota de cliente de teste se cancela sozinha.
   *
   * A NFS-e só autoriza de verdade em produção, então validar a integração exige
   * emitir uma nota real. Deixá-la de pé seria um documento fiscal indevido — o
   * cancelamento automático é o que torna o teste seguro de repetir.
   */
  const agendarCancelamentoDeTeste = useCallback((clienteId: string) => {
    if (!D.cliente(clienteId)?.teste) return;
    const seg = Math.round(D.TESTE_CANCELA_APOS_MS / 1000);
    toast(`Nota de teste emitida — cancelando em ${seg}s`);
    agendar(() => { void cancelarNota(clienteId); }, D.TESTE_CANCELA_APOS_MS);
  }, [agendar, cancelarNota]);

  /** Acompanha a emissão assíncrona até sair número (ou erro). */
  const acompanhar = useCallback((clienteId: string, ref: string, tentativa = 0) => {
    if (tentativa > 20) {
      setNota(clienteId, { status: "processando", ref });
      return;
    }
    agendar(async () => {
      try {
        const r = await fetch(`/api/nf/status?ref=${encodeURIComponent(ref)}`).then((x) => x.json());
        if (r.status === "autorizado") {
          setNota(clienteId, { status: "emitida", numero: r.numero, data: D.HOJE.data, ref, pdf: r.pdf });
          agendarCancelamentoDeTeste(clienteId);
          return;
        }
        if (r.status === "cancelado") { setNota(clienteId, { status: "cancelada", ref }); return; }
        if (r.status === "simulado") { numeroLocal(clienteId, ref); agendarCancelamentoDeTeste(clienteId); return; }
        if (r.status === "erro") {
          setNota(clienteId, { status: "erro", ref, erro: r.erros?.[0]?.mensagem ?? "A prefeitura rejeitou a nota." });
          return;
        }
        acompanhar(clienteId, ref, tentativa + 1);
      } catch {
        acompanhar(clienteId, ref, tentativa + 1);
      }
    }, tentativa === 0 ? 1400 : 3000);
  }, [agendar, setNota, numeroLocal, agendarCancelamentoDeTeste]);

  const emitirNota = useCallback(async (clienteId: string) => {
    const c = D.cliente(clienteId);
    if (!c || c.valor <= 0) return;
    if (notaDe(clienteId).status === "processando") return;

    setNota(clienteId, { status: "processando" });
    try {
      const r = await fetch("/api/nf/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pid: clienteId,
          valor: c.valor,
          discriminacao: `${D.nomeServico(c.servicoId)} — ${c.atendimentos} atendimentos · ${D.PERIODO}`,
          tomador: {
            cpf: c.cpf.replace(/\D/g, ""),
            nome: c.nome,
            email: c.email,
            telefone: c.telefone.replace(/\D/g, ""),
          },
        }),
      }).then((x) => x.json());

      if (r.status === "simulado") { numeroLocal(clienteId, r.ref); agendarCancelamentoDeTeste(clienteId); return; }
      if (r.status === "autorizado") {
        setNota(clienteId, { status: "emitida", numero: r.numero, data: D.HOJE.data, ref: r.ref, pdf: r.pdf });
        agendarCancelamentoDeTeste(clienteId);
        return;
      }
      if (r.status === "processando") { setNota(clienteId, { status: "processando", ref: r.ref }); acompanhar(clienteId, r.ref); return; }
      if (r.status === "config_incompleta") {
        setNota(clienteId, { status: "erro", erro: `Faltam dados fiscais: ${(r.faltando ?? []).join(", ")}.` });
        return;
      }
      if (r.status === "nao_autenticado") {
        setNota(clienteId, { status: "erro", erro: "Sua sessão expirou. Entre de novo para emitir." });
        return;
      }
      setNota(clienteId, { status: "erro", ref: r.ref, erro: r.erros?.[0]?.mensagem ?? r.info ?? "Não foi possível emitir." });
    } catch {
      setNota(clienteId, { status: "erro", erro: "Sem conexão com o servidor de notas." });
    }
  }, [notaDe, setNota, numeroLocal, acompanhar, agendarCancelamentoDeTeste]);

  const fechamento = useMemo(
    () => D.CLIENTES.filter((c) => cliAtivo(c.id) && c.valor > 0),
    [cliAtivo],
  );

  /* FONTE DA VERDADE ÚNICA de "o que o lote vai emitir".
   * Antes havia três regras divergentes: o hero contava pendente|erro|cancelada, a topbar repetia
   * essa conta, e o lote emitia só pendente|erro. Resultado: o botão prometia N e o sistema
   * emitia M, sem explicar a diferença — e se só houvesse canceladas o botão aparecia e não
   * fazia nada. Agora hero, topbar e lote leem DAQUI. */
  const emitiveis = useMemo(
    () => fechamento.filter((c) => {
      // Tomador de teste fica FORA do lote de propósito: em produção ele emite
      // uma nota real, e um botão de fechar o mês não deveria disparar isso sem
      // que alguém pedisse. Ele emite só pela própria gaveta, um a um.
      if (c.teste) return false;
      const s = notaDe(c.id).status;
      return s === "pendente" || s === "erro";
    }),
    [fechamento, notaDe],
  );

  const emitirPendentes = useCallback(() => {
    if (!emitiveis.length) return;
    toast(`Enviando ${emitiveis.length} ${emitiveis.length === 1 ? "nota" : "notas"} à prefeitura`);
    // Escalonado: emissão em lote não deve disparar N requisições no mesmo tick.
    emitiveis.forEach((c, i) => agendar(() => { void emitirNota(c.id); }, i * 300));
    // Toast de conclusão: emitir em lote é irreversível e caro; terminar em silêncio deixava o
    // usuário sem saber se acabou. O atraso acompanha o escalonamento acima.
    agendar(() => toast(`${emitiveis.length === 1 ? "Nota enviada" : "Notas enviadas"} — acompanhe o status em cada cliente`), emitiveis.length * 300 + 400);
  }, [emitiveis, emitirNota, agendar]);

  /* Confirmação do lote fiscal. Vive no store porque a MESMA ação é disparada de dois lugares
   * (hero do Faturamento e topbar), e o diálogo precisa ser um só. */
  const [loteAberto, setLoteAberto] = useState(false);
  const pedirLote = useCallback(() => setLoteAberto(true), []);
  const fecharLote = useCallback(() => setLoteAberto(false), []);
  const confirmarLote = useCallback(() => { setLoteAberto(false); emitirPendentes(); }, [emitirPendentes]);

  /* ── ajustes da MAISA ── */
  const abrirSecao = useCallback((id: string) => {
    setSecAtiva((s) => (s === id ? null : id));
  }, []);

  const setAssistente = useCallback((p: Partial<Assistente>) => {
    patch((d) => ({ assistente: { ...d.assistente, ...p } }));
  }, [patch]);

  const alternarDia = useCallback((nome: string) => {
    patch((d) => ({
      dias: d.dias.map((x) => {
        if (x.nome !== nome) return x;
        const aberto = !x.aberto;
        // Dia fechado guarda "—" nos horários; ao abrir precisa de hora válida,
        // senão o <input type="time"> recebe um valor que ele não sabe exibir.
        const semHora = x.de === "—" || x.ate === "—";
        return aberto && semHora ? { ...x, aberto, de: "09:00", ate: "18:00" } : { ...x, aberto };
      }),
    }));
  }, [patch]);

  const setHorario = useCallback((nome: string, campo: "de" | "ate", valor: string) => {
    patch((d) => ({ dias: d.dias.map((x) => (x.nome === nome ? { ...x, [campo]: valor } : x)) }));
  }, [patch]);

  const alternarCfg = useCallback((chave: D.ChaveCfg) => {
    patch((d) => ({ cfg: { ...d.cfg, [chave]: !d.cfg[chave] } }));
  }, [patch]);

  const salvar = useCallback(() => {
    setSalvo(true);
    agendar(() => setSalvo(false), 2200);
  }, [agendar]);

  /* ── google calendar ──
   * Duas metades bem separadas: a CONEXÃO (tokens) vive no Supabase e é consultada
   * do servidor; o VÍNCULO evento↔agendamento vive aqui no localStorage, porque o
   * agendamento também vive. Ver o comentário do tipo EventoGoogle lá em cima. */

  const [google, setGoogle] = useState<EstadoGoogle>({ status: "carregando", conexoes: [], faltando: [] });

  /* Ids com operação em voo. É um CONJUNTO, e não um id só: desconectar um
   * profissional, criar um evento e cancelar outro compartilhavam o mesmo slot, então
   * o `finally` de qualquer um deles reabilitava os botões dos outros dois — inclusive
   * o de um POST que ainda estava no ar. */
  const [googleOcupados, setGoocupados] = useState<string[]>([]);
  const marcarOcupado = useCallback((id: string, on: boolean) => {
    setGoocupados((v) => (on ? [...v, id] : v.filter((x) => x !== id)));
  }, []);
  const googleOcupado = useCallback((id: string) => googleOcupados.includes(id), [googleOcupados]);

  /** Trava SÍNCRONA das chamadas em voo.
   *
   *  `googleOcupado` é estado do React: entre o clique e o re-render que desabilita o
   *  botão existe uma janela em que um segundo clique passa pela mesma checagem e
   *  dispara um segundo POST — dois eventos no Google para o mesmo atendimento. Um ref
   *  fecha essa janela porque é atualizado no mesmo tick. (O `requestId` estável evita
   *  duplicar a CONFERÊNCIA, mas não o evento.) */
  const googleEmVoo = useRef<Set<string>>(new Set());

  const lerStatusGoogle = useCallback(async () => {
    try {
      const r = await fetch("/api/google/status").then((x) => x.json());
      setGoogle({ status: r.status, conexoes: r.conexoes ?? [], faltando: r.faltando ?? [] });
    } catch {
      setGoogle({ status: "nao_configurado", conexoes: [], faltando: [] });
    }
  }, []);

  useEffect(() => { void lerStatusGoogle(); }, [lerStatusGoogle]);

  /* A volta do consentimento chega como ?google=ok|erro na URL. Lemos, avisamos e
   * limpamos a query — deixar o parâmetro para trás faria o toast voltar a cada F5. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("google");
    if (!r) return;

    if (r === "ok") {
      toast("Agenda do Google conectada");
      void lerStatusGoogle();
    } else {
      toast(MOTIVO_GOOGLE[q.get("motivo") ?? ""] ?? "Não foi possível conectar ao Google");
    }
    q.delete("google"); q.delete("motivo"); q.delete("pid");
    const busca = q.toString();
    window.history.replaceState({}, "", window.location.pathname + (busca ? `?${busca}` : ""));
  }, [lerStatusGoogle]);

  const googleDe = useCallback(
    (pid: string) => google.conexoes.find((c) => c.profissionalId === pid),
    [google.conexoes],
  );

  const conectarGoogle = useCallback((pid: string) => {
    // Navegação de página inteira, não fetch: o consentimento acontece no domínio do
    // Google e ele devolve o usuário por redirect. `volta` traz de volta para a tela atual.
    const volta = encodeURIComponent(window.location.pathname);
    window.location.href = `/api/google/conectar?pid=${encodeURIComponent(pid)}&volta=${volta}`;
  }, []);

  const desconectarGoogle = useCallback(async (pid: string) => {
    marcarOcupado(pid, true);
    try {
      const r = await fetch(`/api/google/conectar?pid=${encodeURIComponent(pid)}`, { method: "DELETE" })
        .then((x) => x.json());
      if (r.ok) {
        toast(r.revogado ? "Agenda desconectada e acesso revogado no Google" : "Agenda desconectada");
        await lerStatusGoogle();
      } else {
        toast("Não foi possível desconectar");
      }
    } catch {
      toast("Sem conexão com o servidor");
    } finally {
      marcarOcupado(pid, false);
    }
  }, [lerStatusGoogle]);

  const eventoGoogleDe = useCallback((agId: string) => db.googleEventos[agId], [db.googleEventos]);

  const criarEventoGoogle = useCallback(async (agId: string) => {
    const ag = agendamentoPorId(agId);
    if (!ag || db.googleEventos[agId] || googleEmVoo.current.has(agId)) return;

    googleEmVoo.current.add(agId);
    marcarOcupado(agId, true);
    try {
      const r = await fetch("/api/google/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agendamentoId: agId,
          // Agendamento criado pelo usuário não existe em D.AGENDAMENTOS: o servidor
          // não teria como resolvê-lo sozinho, então mandamos os campos. Ele valida
          // tudo de novo contra o catálogo antes de usar.
          dia: ag.dia,
          inicio: ag.inicio,
          profissionalId: ag.profissionalId,
          servicoId: ag.servico.id,
          clienteId: ag.cliente.id,
          // Serviço criado pelo usuário não existe no catálogo do servidor: sem estes
          // dois, o POST voltaria "Faltam dados do atendimento" sem dizer por quê.
          duracao: ag.servico.duracao,
          servicoNome: ag.servico.nome,
          comMeet: true,
        }),
      }).then((x) => x.json());

      if (r.ok) {
        patch((d) => ({
          googleEventos: {
            ...d.googleEventos,
            [agId]: {
              eventId: r.eventId,
              meetLink: r.meetLink ?? undefined,
              htmlLink: r.htmlLink ?? undefined,
              profissionalId: ag.profissionalId,
              inicioISO: r.inicioISO ?? undefined,
            },
          },
        }));
        toast(r.semMeet ? "Evento criado — o Google não devolveu link do Meet" : "Evento criado com link do Meet");
        return;
      }

      if (r.status === "reconectar") {
        toast("O acesso ao Google expirou — conecte a agenda de novo");
        await lerStatusGoogle();
        return;
      }
      toast(RESPOSTA_GOOGLE[r.status] ?? r.info ?? "Não foi possível criar o evento");
    } catch {
      toast("Sem conexão com o servidor");
    } finally {
      googleEmVoo.current.delete(agId);
      marcarOcupado(agId, false);
    }
  }, [agendamentoPorId, db.googleEventos, patch, lerStatusGoogle]);

  const cancelarEventoGoogle = useCallback(async (agId: string) => {
    const ev = db.googleEventos[agId];
    if (!ev || googleEmVoo.current.has(agId)) return;

    googleEmVoo.current.add(agId);
    marcarOcupado(agId, true);
    try {
      const r = await fetch(
        `/api/google/evento?eventId=${encodeURIComponent(ev.eventId)}&pid=${encodeURIComponent(ev.profissionalId)}`,
        { method: "DELETE" },
      ).then((x) => x.json());

      if (r.ok) {
        patch((d) => {
          const { [agId]: _, ...resto } = d.googleEventos;
          return { googleEventos: resto };
        });
        toast("Evento removido do Google");
        return;
      }
      toast(RESPOSTA_GOOGLE[r.status] ?? "Não foi possível remover o evento");
    } catch {
      toast("Sem conexão com o servidor");
    } finally {
      googleEmVoo.current.delete(agId);
      marcarOcupado(agId, false);
    }
  }, [db.googleEventos, patch]);

  /* ── valor ── */
  const value = useMemo<StoreValue>(() => ({
    tela, irPara, sel, abrir, fechar,
    agendamentos, agendamentosDoDia, agendamentoPorId, moverEtapa, avancarEtapa, reposicionar,
    fila, resolverFila,
    arrastando, alvoSolta, iniciarArrasto, encerrarArrasto, marcarAlvo,
    convSel, selecionarConversa, abaConv, setAbaConv, estadoConversa, threadDe, assumir, devolver, enviar,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    servicos, servicoDe, editarServico, criarServico, excluirServico,
    filtroSvc, setFiltroSvc, filtroCli, setFiltroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento, emitiveis,
    loteAberto, pedirLote, fecharLote, confirmarLote,
    secAtiva, abrirSecao,
    assistente: db.assistente, setAssistente,
    dias: db.dias, alternarDia, setHorario,
    cfg: db.cfg, alternarCfg,
    salvo, salvar,
    diaSel, verDia,
    rascunho, novoAgendamento, editarRascunho, confirmarRascunho, descartarRascunho,
    google, googleDe, conectarGoogle, desconectarGoogle,
    eventoGoogleDe, criarEventoGoogle, cancelarEventoGoogle, googleOcupado,
    railAberto, setRailAberto,
  }), [
    tela, irPara, sel, abrir, fechar,
    agendamentos, agendamentosDoDia, agendamentoPorId, moverEtapa, avancarEtapa, reposicionar,
    fila, resolverFila,
    arrastando, alvoSolta, iniciarArrasto, encerrarArrasto, marcarAlvo,
    convSel, selecionarConversa, abaConv, estadoConversa, threadDe, assumir, devolver, enviar,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    servicos, servicoDe, editarServico, criarServico, excluirServico,
    filtroSvc, filtroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento, emitiveis,
    loteAberto, pedirLote, fecharLote, confirmarLote,
    secAtiva, abrirSecao,
    db.assistente, setAssistente,
    db.dias, alternarDia, setHorario,
    db.cfg, alternarCfg,
    salvo, salvar,
    diaSel, rascunho,
    google, googleDe, conectarGoogle, desconectarGoogle,
    eventoGoogleDe, criarEventoGoogle, cancelarEventoGoogle, googleOcupado,
    railAberto,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

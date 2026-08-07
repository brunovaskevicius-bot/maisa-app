"use client";
/* MAISA — store central do app.
 *
 * Uma fonte de verdade para tudo que o usuário muda: etapa do kanban, posição na
 * agenda, quem conduz cada conversa, toggles do catálogo/equipe, ajustes da MAISA
 * e o ciclo de vida das notas fiscais.
 *
 * Persistência: localStorage, chave "maisa.app.v3". Só o que é DECISÃO do usuário
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
  /** Data ISO, "YYYY-MM-DD". */
  data: string;
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
 *  agendamentos deste app são o que o usuário marca no navegador — não existe tabela
 *  de agendamentos para pendurar um google_event_id. Manter o vínculo aqui é o que
 *  permite a integração ser real sem transformar o protótipo inteiro num app com banco.
 *
 *  ⚠️ Vínculo é o que ele é, e vínculo pressupõe DOIS lados. Na fatia 4 o atendimento
 *  passa a NASCER no Google (com `extendedProperties.private`) e deixa de haver um par
 *  para ligar — este tipo some junto. */
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

/** Um compromisso lido da agenda do Google que NÃO é um atendimento da MAISA.
 *
 *  Aparece na grade em cinza, ocupa o horário e não se arrasta. É o dentista, o
 *  almoço, a reunião — coisas que tornam o horário indisponível e que a agenda
 *  precisa mostrar para não oferecer um horário que não existe. Só leitura: um
 *  arrasto que fizesse PATCH aqui mexeria no compromisso pessoal de alguém. */
export type Bloqueio = {
  /** "bloq:<eventId>" — o prefixo é o que impede confundir com um agendamento. */
  id: string;
  eventId: string;
  data: string;
  inicio: number;
  fim: number;
  duracao: number;
  titulo: string;
  recorrente: boolean;
  meetLink?: string;
  htmlLink?: string;
};

/** O que sobrevive a um F5. */
type Persistido = {
  /** Versão do formato, gravada junto. Sem ela, um `maisa.app.v3` escrito por uma versão
   *  futura seria lido como se fosse deste formato — e o sintoma apareceria como dado
   *  estranho na tela, não como incompatibilidade. */
  __v: number;
  etapas: Record<string, D.Etapa>;
  profAtivo: Record<string, boolean>;
  svcAtivo: Record<string, boolean>;
  /** Edições de serviço por id (nome/preço/duração/categoria). D.SERVICOS é catálogo de partida. */
  svcEdit: Record<string, Partial<D.Servico>>;
  /** Serviços criados pelo usuário — não existem em D.SERVICOS. */
  svcNovos: D.Servico[];
  /** Os atendimentos. Não "os novos" — com os exemplos fora, esta lista é a única que o
   *  app tem. O nome fica até a fatia 4, quando marcar passar a criar direto no Google.
   *
   *  Aqui do lado morava um `posicoes`, um mapa que guardava o resultado de cada arrasto
   *  POR FORA do agendamento. Ele existia por um motivo que deixou de valer: os exemplos
   *  eram regerados por função pura, não havia registro para editar, só uma camada de
   *  correções por cima. Agora há registro — arrastar edita o próprio atendimento.
   *
   *  E a camada precisava SUMIR, não só ficar sem uso. No dia em que o Google mandar nas
   *  datas, uma posição local velha ganharia da real: o Bruno moveria o evento no Google
   *  Calendar e o app o moveria de volta, sozinho, sem nada na tela explicando por quê. */
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

const CHAVE = "maisa.app.v3";
const CHAVE_ANTIGA = "maisa.app.v2";

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
  /* Os quatro abaixo eram um "falha_ao_conectar" só. Separados porque o conserto de
     cada um é diferente — e quem conecta uma agenda não tem como abrir log de servidor. */
  troca_recusada: "O Google recusou a troca do código. Confira o GOOGLE_CLIENT_SECRET e se o redirect URI cadastrado bate exatamente com o do app",
  secret_invalido: "O Google não reconheceu o app (invalid_client): o GOOGLE_CLIENT_ID ou o GOOGLE_CLIENT_SECRET no Vercel não são os do client OAuth que você criou",
  uri_nao_bate: "O redirect URI não bate. Cadastre exatamente https://…/api/google/callback no client OAuth, sem barra no fim",
  codigo_gasto: "A autorização venceu ou já tinha sido usada. Clique em Conectar de novo e conclua sem recarregar a página",
  sem_email: "Autorizou, mas não deu para ler o e-mail da conta. Falta o escopo userinfo.email na tela de consentimento",
  chave_invalida: "GOOGLE_TOKEN_KEY inválida: precisa dar 32 bytes ao decodificar de base64. Gere com openssl rand -base64 32 e cole o valor inteiro",
  falha_ao_salvar: "Autorizou, mas o banco recusou a gravação. Confira se o SQL de supabase/ rodou no projeto certo",
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
const SEM_BLOQUEIO: Bloqueio[] = [];

/** De quem é a agenda que a tela lê. Uma pessoa só, por enquanto — ver o comentário de
 *  D.EQUIPE. Quando voltar a haver equipe, isto vira um laço sobre COLUNAS_AGENDA e o
 *  cache passa a ser por profissional. */
const PID_AGENDA = D.COLUNAS_AGENDA[0];

const INICIAL: Persistido = {
  __v: 3,
  etapas: {},
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

/**
 * Traz o que dá do `maisa.app.v2` para o v3, uma única vez.
 *
 * O que MUDOU e por isso não atravessa: a agenda deixou de ser um julho/2026 fixo
 * endereçado por dia do mês e passou a usar datas reais. Três campos eram chaveados
 * por aquele calendário e não têm tradução:
 *
 *   posicoes          — "o atendimento X está no dia 17 às 14h". Não existe dia 17 de
 *                       um mês que não existe. Trazer viraria bloco em data aleatória.
 *   novosAgendamentos — mesmo problema: `dia: 22` não aponta para lugar nenhum.
 *   etapas            — chaveado por ids (`ag-17-3`) que o gerador não produz mais.
 *
 * O que ATRAVESSA é o que custa caro perder: `notas` guarda referências REAIS da Focus
 * e números de NFS-e que foram emitidos de verdade na prefeitura — apagar isso seria
 * apagar documento fiscal do histórico da tela. `googleEventos` guarda eventIds de
 * eventos que estão de pé no Google Calendar agora.
 *
 * ⚠️ A v2 NÃO é apagada. Ela fica como a única saída de emergência se esta conversão
 * estiver errada de um jeito que só apareça em uso. Sai numa versão futura.
 */
function migrarDaV2(): string | null {
  const velho = localStorage.getItem(CHAVE_ANTIGA);
  if (!velho) return null;
  try {
    // `posicoes` já não existe no formato de hoje, mas existia no v2 e é justamente um dos
    // campos a DESCARTAR — o tipo precisa admiti-lo para o destructuring poder recusá-lo.
    const v2 = JSON.parse(velho) as Partial<Persistido> & { posicoes?: Record<string, unknown> };
    const { posicoes, novosAgendamentos, etapas, ...atravessa } = v2;
    const novo = JSON.stringify({ ...atravessa, __v: 3 });
    localStorage.setItem(CHAVE, novo);
    const perdidos = [
      Object.keys(posicoes ?? {}).length && "posições de arrasto",
      (novosAgendamentos ?? []).length && "atendimentos marcados no protótipo",
      Object.keys(etapas ?? {}).length && "etapas do kanban",
    ].filter(Boolean);
    if (perdidos.length) {
      console.info(`[store] migrado v2 → v3. Não veio junto (era do calendário fixo): ${perdidos.join(", ")}.`);
    }
    return novo;
  } catch {
    // v2 corrompido não deve impedir o app de abrir no v3 limpo.
    return null;
  }
}

/* ───────────────────────────── contexto ───────────────────────────── */

export type StoreValue = {
  /* navegação */
  tela: TelaId;
  irPara: (t: TelaId) => void;
  /** id aberto na Gaveta (cliente, agendamento, conversa, serviço, seção…). */
  sel: string | null;
  abrir: (id: string) => void;
  fechar: () => void;

  /* fluxo de hoje + agenda (mesma lista) — `agendamentos` é a JANELA visível */
  agendamentos: AgendamentoVivo[];
  agendamentosDoDia: (data: string) => AgendamentoVivo[];
  agendamentoPorId: (id: string) => AgendamentoVivo | undefined;
  moverEtapa: (id: string, etapa: D.Etapa) => void;
  avancarEtapa: (id: string) => void;
  reposicionar: (id: string, profissionalId: string, inicio: number, data?: string) => void;
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
  /** Data ISO que a Agenda está mostrando. Começa em hoje. */
  diaSel: string;
  verDia: (data: string) => void;
  /** Atendimento sendo marcado (clique num horário vago), antes de virar agendamento. */
  rascunho: D.RascunhoAgendamento | null;
  novoAgendamento: (profissionalId: string, inicio: number, data: string) => void;
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

  /* a AGENDA REAL, lida do Google */
  /** Compromissos do Google que não são atendimentos da MAISA, num dia. */
  bloqueiosDoDia: (data: string) => Bloqueio[];
  bloqueioPorId: (id: string) => Bloqueio | undefined;
  /** Como está a leitura da agenda — o que o cartão precisa para se explicar. */
  agendaGoogle: EstadoAgendaGoogle;
  /** Relê a janela atual, ignorando o cache. */
  recarregarAgenda: () => void;

  /* rail */
  railAberto: boolean;
  setRailAberto: (v: boolean) => void;
};

/**
 * O estado da LEITURA da agenda — coisa diferente do estado da CONEXÃO.
 *
 * `nao_conectado` — nunca houve conexão. A tela oferece "Conectar".
 * `carregando`    — primeira busca desta janela em voo.
 * `ok`            — tem dado, e ele está fresco.
 * `reconectar`    — o Google recusou o token. Cache anterior segue na tela, esmaecido,
 *                   com banner: apagar a grade acrescentaria um segundo problema ao primeiro.
 * `limite`        — cota do Google. Transitório; a tela não grita, só espera.
 * `erro`          — o resto.
 *
 * Grade vazia sem aviso é a pior saída possível: ela AFIRMA "você não tem nada hoje",
 * e essa afirmação pode estar errada.
 */
export type EstadoAgendaGoogle = {
  status: "nao_conectado" | "carregando" | "ok" | "reconectar" | "limite" | "erro";
  info?: string;
  /** Já houve pelo menos uma leitura bem-sucedida? Separa "vazio" de "ainda não sei". */
  jaLeu: boolean;
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

  /**
   * ⚠️ ESTADO, não `useRef`. Aqui morava um bug que APAGAVA dado real, e ele era
   * invisível porque o sintoma parecia outra coisa.
   *
   * Era `const hidratado = useRef(false)`, marcado no fim do efeito de leitura. O efeito
   * de gravação vem logo abaixo e roda no MESMO passo de efeitos, imediatamente depois —
   * já lendo `hidratado.current === true`, mas com `db` ainda em INICIAL, porque o
   * `setDb` da linha acima só vira estado no próximo render. Resultado: o primeiro ato do
   * app ao abrir era ESCREVER OS PADRÕES POR CIMA do que estava salvo.
   *
   * Em produção o estrago se desfazia sozinho: o render seguinte trazia o dado bom e
   * regravava. Em desenvolvimento não: o StrictMode roda os efeitos duas vezes, e a
   * segunda leitura encontrava os padrões que a gravação acabara de escrever — e os
   * adotava como se fossem o que o usuário tinha salvo. O dado ia embora de verdade.
   *
   * (Isto explica, e me desmente, o "sumiço" que investiguei na sessão passada e atribuí
   * a outra aba do app escrevendo na mesma chave. Não era outra aba. Era isto.)
   *
   * Como estado, `setHidratado` e `setDb` entram no MESMO lote: quando a gravação enfim
   * vê `hidratado === true`, `db` já é o que veio do disco.
   */
  const [hidratado, setHidratado] = useState(false);

  // Ler depois do mount: o 1º render precisa bater com o HTML do servidor.
  useEffect(() => {
    try {
      const cru = localStorage.getItem(CHAVE) ?? migrarDaV2();
      if (cru) {
        // `posicoes` saiu do formato (ver Persistido). Um v3 gravado antes disso ainda o
        // traz, e o spread abaixo o devolveria ao disco a cada gravação — dado morto se
        // reescrevendo em silêncio. Não vale uma v4: nada mais mudou de forma.
        const { posicoes: _saiuDoFormato, ...p } =
          JSON.parse(cru) as Partial<Persistido> & { posicoes?: unknown };
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
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* noop */ }
  }, [db, hidratado]);

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
  // Dia visível na Agenda, data ISO. Volátil de propósito: recarregar cai em hoje, como o
  // resto da navegação. Antes os seis botões de dia não tinham onClick nenhum — eram decoração.
  const [diaSel, setDiaSel] = useState(D.HOJE.iso);

  /* A JANELA. É a grade do mês do dia visível, com os vizinhos que fecham as semanas.
   *
   * Uma janela só serve às três visões — dia, semana e mês —, e isso não é economia: é o
   * que faz trocar de visão não disparar request. A grade de um mês cobre semanas
   * inteiras, então a semana de QUALQUER dia daquele mês cabe dentro dela, inclusive a que
   * atravessa a virada. Ver D.janelaDoMes.
   *
   * Os dois campos são STRINGS, e é por isso que o efeito de busca lá embaixo pode
   * depender deles diretamente sem virar laço infinito. */
  const janela = useMemo(() => D.janelaDoMes(D.mesDe(diaSel)), [diaSel]);

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

  /* ── os atendimentos ──
   *
   * Uma origem só: o que o usuário marcou. Eram três — os nove de hoje escritos à mão, o
   * mês inteiro gerado sob demanda, e estes. Some junto o recorte por janela: o gerador
   * precisava saber qual mês desenhar, e por isso o Fluxo de hoje esvaziava quando a
   * Agenda navegava para setembro (hoje entrava "fora da janela" e tinha que ser
   * reinjetado à mão). Uma lista que já existe inteira não tem esse problema. */
  const agendamentos = useMemo<AgendamentoVivo[]>(() => {
    return db.novosAgendamentos.flatMap((a) => {
      const profissionalId = a.profissionalId;
      const inicio = a.inicio;
      const sv = D.servico(a.servicoId) ?? db.svcNovos.find((s) => s.id === a.servicoId);
      const pf = D.profissional(profissionalId);
      const cl = D.cliente(a.clienteId);

      /* Aqui havia três `!`. Eles são promessa de compilação e não valem nada em
       * runtime: um agendamento apontando para profissional/serviço/cliente que não
       * existe mais devolvia `undefined`, e a primeira leitura de `.nome` derrubava
       * a tela INTEIRA — inclusive o Fluxo de hoje, que é a porta de entrada.
       *
       * Isso deixou de ser hipótese quando a equipe encolheu para uma pessoa: basta
       * um registro velho no localStorage citando `pr2`. Some da lista e avisa no
       * console; um atendimento a menos é muito melhor que tela branca. */
      if (!sv || !pf || !cl) {
        console.warn(
          `[store] agendamento ${a.id} ignorado — ` +
          [!pf && `profissional ${profissionalId}`, !sv && `serviço ${a.servicoId}`, !cl && `cliente ${a.clienteId}`]
            .filter(Boolean).join(", ") + " não existe(m)",
        );
        return [];
      }

      return [{
        id: a.id,
        data: a.data ?? D.HOJE.iso,
        inicio,
        duracao: sv.duracao,
        fim: inicio + sv.duracao / 60,
        profissionalId,
        profissional: pf,
        servico: sv,
        cliente: cl,
        confirmado: a.confirmado,
        etapa: db.etapas[a.id] ?? a.etapaInicial,
      }];
      // Comparar duas datas ISO com `<` JÁ é comparação cronológica — campos de largura
      // fixa, do mais significativo para o menos. É a razão de o formato ter sido escolhido.
    }).sort((x, y) => (x.data < y.data ? -1 : x.data > y.data ? 1 : x.inicio - y.inicio));
    // novosAgendamentos e svcNovos entram nas deps: sem elas o memo ficava preso na lista antiga e
    // um atendimento recém-marcado era gravado no localStorage sem NUNCA aparecer na grade.
  }, [db.etapas, db.novosAgendamentos, db.svcNovos]);

  /** Índice por data. A grade de mês pergunta 42 vezes por render (uma por célula, e o hover
   *  re-renderiza a cada célula que o mouse cruza); com `.filter()` cada pergunta varria o mês
   *  inteiro. Além do custo, `filter` devolvia um array NOVO a cada chamada, então qualquer memo
   *  com essa lista na dependência nunca acertava o cache. */
  const porDia = useMemo(() => {
    const m = new Map<string, AgendamentoVivo[]>();
    for (const a of agendamentos) {
      const lista = m.get(a.data);
      if (lista) lista.push(a);
      else m.set(a.data, [a]);
    }
    return m;
  }, [agendamentos]);

  /** Os atendimentos de UM dia, por data ISO. `agendamentos` é a janela inteira, então quem
   *  fala de "hoje" (o Fluxo, o kanban) precisa dizer qual dia quer. */
  const agendamentosDoDia = useCallback((data: string) => porDia.get(data) ?? SEM_ATENDIMENTO, [porDia]);

  const agendamentoPorId = useCallback(
    (id: string) => agendamentos.find((a) => a.id === id),
    [agendamentos],
  );

  /** O registro CRU de um atendimento — o objeto gravado, antes de resolver profissional,
   *  serviço e cliente. Um lugar só agora; eram três, e esquecer o terceiro fazia os toasts
   *  caírem no genérico "Atendimento →" justo para os que o próprio usuário tinha marcado. */
  const registroDe = useCallback(
    (id: string) => db.novosAgendamentos.find((a) => a.id === id),
    [db.novosAgendamentos],
  );

  /** Etapa atual de um agendamento, com o default do dado de origem. */
  const etapaDe = useCallback(
    (id: string): D.Etapa => db.etapas[id] ?? registroDe(id)?.etapaInicial ?? "chegando",
    [db.etapas, registroDe],
  );

  /* As três ações abaixo eram IRREVERSÍVEIS E SILENCIOSAS: arrastar um cartão para "Feito hoje"
   * marcava um atendimento como concluído sem toast, sem anúncio para leitor de tela e sem volta.
   * Agora todas confirmam e todas oferecem "Desfazer" — inclusive porque remarcar dispara WhatsApp
   * de verdade para o cliente. O rótulo nomeia quem mudou, não "item atualizado". */
  const ROTULO_ETAPA: Record<D.Etapa, string> = {
    chegando: "Chegando", atendendo: "Em atendimento", feito: "Feito hoje",
  };

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

  /**
   * Remarca: muda hora, profissional e — desde a visão de Semana — o DIA.
   * `data` é opcional e o fallback é a data atual do agendamento.
   *
   * Agora EDITA o atendimento. Antes gravava num mapa `posicoes` paralelo, porque o
   * atendimento de exemplo era regerado por função pura e não havia objeto para mexer —
   * o mapa era uma camada de correções por cima de um dado imutável. Com os exemplos
   * fora, a correção e o corrigido viraram a mesma coisa, e "Desfazer" reescreve os
   * mesmos três campos.
   *
   * ⚠️ Só mexe no que vive no app. Compromisso lido do Google é `bloq:…`, não é
   * arrastável (ver BlocoBloqueio na Agenda) e não chega aqui — um PATCH disparado por
   * engano mexeria no compromisso pessoal de alguém.
   */
  const reposicionar = useCallback((id: string, profissionalId: string, inicio: number, data?: string) => {
    const orig = registroDe(id);
    // Solta e não faz nada, mas encerra o arrasto: deixar `arrastando` setado congelaria o
    // cartão translúcido e a coluna destacada até o próximo clique.
    setArrastando(null);
    setAlvoSolta(null);
    if (!orig) {
      console.warn(`[store] reposicionar(${id}) ignorado — não é um atendimento deste app`);
      return;
    }

    const antes = { profissionalId: orig.profissionalId, inicio: orig.inicio, data: orig.data };
    const destino = data ?? orig.data ?? D.HOJE.iso;
    const mover = (p: Partial<D.Agendamento>) => patch((d) => ({
      novosAgendamentos: d.novosAgendamentos.map((a) => (a.id === id ? { ...a, ...p } : a)),
    }));

    mover({ profissionalId, inicio, data: destino });
    const quando = destino === D.HOJE.iso ? D.hhmm(inicio) : `${D.rotuloDia(destino)}, ${D.hhmm(inicio)}`;
    toast(
      `${D.nomeCliente(orig.clienteId)} → ${quando} com ${D.primeiroNome(D.nomeProfissional(profissionalId))}`,
      { label: "Desfazer", onClick: () => mover(antes) },
    );
  }, [patch, registroDe]);

  /* ── fila "precisa de você" ──
   *
   * DUAS origens. As conversas vêm escritas (D.FILA_CONVERSAS, ainda demonstração — o
   * WhatsApp não está integrado); as cobranças de confirmação são DERIVADAS dos
   * atendimentos de hoje.
   *
   * Eram quatro linhas fixas, e duas delas apontavam para `ag5` e `ag8`. Sem os exemplos
   * elas não dariam erro: o filtro simplesmente não as encontraria e a fila encolheria de
   * quatro para dois, calada. Derivar troca isso por uma regra — "quem é de hoje, ainda
   * não confirmou e ainda não chegou" —, que continua valendo quando o atendimento for
   * real.
   *
   * A fila esvazia sozinha conforme você age em qualquer lugar do app: assumir a conversa
   * resolve o item dela, e dar chegada tira a cobrança daquele horário (a etapa deixa de
   * ser "chegando"). Sem isso o painel viraria uma lista que nunca zera. */
  const fila = useMemo<D.ItemFila[]>(() => [
    ...D.FILA_CONVERSAS.filter((f) => !db.resolvidos[f.alvo] && !db.assumidas[f.alvo]),
    ...agendamentosDoDia(D.HOJE.iso)
      .filter((a) => !a.confirmado && a.etapa === "chegando" && !db.resolvidos[a.id])
      .map((a) => ({
        id: `fl:${a.id}`,
        alvo: a.id,
        titulo: a.cliente.nome,
        tag: "confirmar",
        msg: `${D.hhmm(a.inicio)} ainda não confirmado — a MAISA já cobrou.`,
      })),
  ], [db.resolvidos, db.assumidas, agendamentosDoDia]);
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

  const verDia = useCallback((data: string) => {
    setDiaSel(data);
    setSel(null); // trocar de dia fecha a gaveta: o que estava aberto é de outro dia
  }, []);

  /* CRIAR ATENDIMENTO. A Agenda tinha 40 zonas de soltura que só aceitavam `onDrop`: não existia
   * caminho nenhum para MARCAR um horário — a ação nº1 de qualquer agenda. Clicar num vago agora
   * abre a gaveta num rascunho com o horário e o profissional já preenchidos (é o que o clique
   * disse), faltando só cliente e serviço. */
  const [rascunho, setRascunho] = useState<D.RascunhoAgendamento | null>(null);

  const novoAgendamento = useCallback((profissionalId: string, inicio: number, data: string) => {
    // A data entra no id junto com profissional e hora: com Semana e Mês na tela, "pr1 às 14h" já
    // não identifica um vago — existe um por dia.
    const id = `novo-${data}-${profissionalId}-${inicio}`;
    setRascunho({ id, data, profissionalId, inicio, clienteId: "", servicoId: "" });
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
      id: `ag-novo-${r.data}-${r.profissionalId}-${r.inicio}`,
      data: r.data,
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
    const quando = r.data === D.HOJE.iso ? "hoje" : D.rotuloDia(r.data);
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
          // Agendamento criado pelo usuário não existe no catálogo de exemplo: o servidor
          // não teria como resolvê-lo sozinho, então mandamos os campos. Ele valida
          // tudo de novo contra o catálogo antes de usar.
          data: ag.data,
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

  /* ── LER a agenda do Google ──
   * A metade que faltava. Até aqui o app só ESCREVIA no Google e nunca olhava de volta:
   * eram dois calendários que não se conheciam. */

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [agendaGoogle, setAgendaGoogle] = useState<EstadoAgendaGoogle>({ status: "nao_conectado", jaLeu: false });

  /* Qual janela está em voo. Ref e não estado, pela mesma razão do `googleEmVoo`: entre
   * disparar o fetch e o re-render existe uma janela em que o efeito rodaria de novo. */
  const leituraEmVoo = useRef<string | null>(null);
  /* Quando terminou a última leitura bem-sucedida. Um alt-tab não deve virar um GET. */
  const lidoEm = useRef(0);

  const conectado = google.conexoes.some((c) => c.profissionalId === PID_AGENDA);

  const lerAgenda = useCallback(async (de: string, ate: string) => {
    const chave = `${de}..${ate}`;
    if (leituraEmVoo.current === chave) return;
    leituraEmVoo.current = chave;
    setAgendaGoogle((a) => ({ ...a, status: "carregando" }));

    try {
      const r = await fetch(`/api/google/agenda?pid=${PID_AGENDA}&de=${de}&ate=${ate}`).then((x) => x.json());

      if (r.ok) {
        const novos: Bloqueio[] = (r.eventos ?? []).map((e: any) => ({
          id: `bloq:${e.eventId}`,
          eventId: e.eventId,
          data: e.data,
          inicio: e.inicio,
          fim: e.fim,
          duracao: e.duracao,
          titulo: e.titulo,
          recorrente: !!e.recorrente,
          meetLink: e.meetLink ?? undefined,
          htmlLink: e.htmlLink ?? undefined,
        }));
        /* Cache ACUMULATIVO: só o pedaço que acabou de chegar é substituído. Navegar
         * para setembro e voltar para agosto não refaz request, e — mais importante —
         * o Fluxo de hoje continua com os dados de hoje enquanto a Agenda passeia. */
        setBloqueios((prev) => [...prev.filter((b) => b.data < r.de || b.data > r.ate), ...novos]);
        lidoEm.current = Date.now();
        setAgendaGoogle({ status: "ok", jaLeu: true });
        return;
      }

      if (r.status === "reconectar") {
        // O access token morreu. `acessoValido` já apagou a linha do banco quando o
        // refresh também morreu, então relemos o status: é ele que decide se a tela
        // oferece "Reconectar" ou volta para "Conectar".
        setAgendaGoogle((a) => ({ status: "reconectar", jaLeu: a.jaLeu, info: r.info }));
        void lerStatusGoogle();
        return;
      }

      if (r.status === "limite") {
        // Cota não é erro, é "pergunte de novo daqui a pouco". A tela não muda de cara.
        setAgendaGoogle((a) => ({ status: "limite", jaLeu: a.jaLeu }));
        agendar(() => { leituraEmVoo.current = null; void lerAgenda(de, ate); }, 20_000);
        return;
      }

      setAgendaGoogle((a) => ({ status: "erro", jaLeu: a.jaLeu, info: r.info ?? RESPOSTA_GOOGLE[r.status] }));
    } catch {
      setAgendaGoogle((a) => ({ status: "erro", jaLeu: a.jaLeu, info: "Sem conexão com o servidor." }));
    } finally {
      // No caminho do `limite` o timer já reassumiu a chave; limpar aqui é inofensivo
      // porque o retry roda depois.
      if (leituraEmVoo.current === chave) leituraEmVoo.current = null;
    }
  }, [lerStatusGoogle, agendar]);

  /* Buscar quando a janela muda.
   *
   * ⚠️ As dependências são só STRINGS e BOOLEANOS. Depender de `st`, de `bloqueios` ou de
   * um callback recriado por render faria o efeito rodar depois de cada resposta — que
   * dispara outra busca, que dispara outra. `lerAgenda` só existe nas deps porque é
   * estável (useCallback sobre coisas estáveis). */
  useEffect(() => {
    if (google.status !== "ok") return;
    if (!conectado) {
      setAgendaGoogle({ status: "nao_conectado", jaLeu: false });
      setBloqueios([]);
      return;
    }
    void lerAgenda(janela.de, janela.ate);
  }, [google.status, conectado, janela.de, janela.ate, lerAgenda]);

  /* Voltar para a aba relê a janela.
   *
   * É o caminho principal da fatia: o Bruno marca no Google Calendar, volta para o app e
   * espera ver o compromisso. Sem isto, só um F5 traria. Com carência de 30s porque
   * `focus` dispara a cada alt-tab, e trinta GETs por minuto é como se perde cota. */
  useEffect(() => {
    if (!conectado) return;
    const talvezReler = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lidoEm.current < 30_000) return;
      void lerAgenda(janela.de, janela.ate);
    };
    window.addEventListener("focus", talvezReler);
    document.addEventListener("visibilitychange", talvezReler);
    return () => {
      window.removeEventListener("focus", talvezReler);
      document.removeEventListener("visibilitychange", talvezReler);
    };
  }, [conectado, janela.de, janela.ate, lerAgenda]);

  const recarregarAgenda = useCallback(() => {
    leituraEmVoo.current = null;
    lidoEm.current = 0;
    void lerAgenda(janela.de, janela.ate);
  }, [lerAgenda, janela.de, janela.ate]);

  /** Índice por data — mesma razão do `porDia`: a grade do mês pergunta 42 vezes por render. */
  const bloqPorDia = useMemo(() => {
    const m = new Map<string, Bloqueio[]>();
    for (const b of bloqueios) {
      const lista = m.get(b.data);
      if (lista) lista.push(b);
      else m.set(b.data, [b]);
    }
    m.forEach((lista) => lista.sort((x, y) => x.inicio - y.inicio));
    return m;
  }, [bloqueios]);

  const bloqueiosDoDia = useCallback((data: string) => bloqPorDia.get(data) ?? SEM_BLOQUEIO, [bloqPorDia]);
  const bloqueioPorId = useCallback((id: string) => bloqueios.find((b) => b.id === id), [bloqueios]);

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
    bloqueiosDoDia, bloqueioPorId, agendaGoogle, recarregarAgenda,
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
    bloqueiosDoDia, bloqueioPorId, agendaGoogle, recarregarAgenda,
    railAberto,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

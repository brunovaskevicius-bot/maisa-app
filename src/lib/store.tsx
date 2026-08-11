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

/**
 * Um atendimento com tudo resolvido — o que as telas consomem.
 *
 * ⚠️ Ele **É** um evento do Google Calendar. Não existe atendimento fora de lá: o `id`
 * deriva do `eventId`, e a única coisa que o app guarda por cima é a etapa do kanban.
 * Apagou no Google, sumiu daqui. Abriu noutro navegador, está lá.
 *
 * Aqui morava um `EventoGoogle`, que era o VÍNCULO entre um agendamento do localStorage
 * e o evento correspondente lá. Vínculo pressupõe dois lados; agora há um só.
 */
export type AgendamentoVivo = {
  /** "ag:<eventId>". O prefixo é o que separa, na Gaveta, um atendimento de um
   *  bloqueio (`bloq:`) e de um rascunho ainda não criado (`novo-…`). */
  id: string;
  eventId: string;
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
  meetLink?: string;
  htmlLink?: string;
  /** Instância de série recorrente. A MAISA nunca cria uma — se houver, veio de fora. */
  recorrente: boolean;
  /** O catálogo local não conhece este serviço (ou cliente): os dados vieram gravados no
   *  próprio evento. Acontece ao abrir noutro navegador um atendimento marcado com um
   *  serviço que o usuário criou. Renderiza igual; a gaveta é que avisa. */
  soltoDoCatalogo: boolean;
};

/** Um atendimento como o Google devolveu, antes de resolver profissional/serviço/cliente. */
type AtendimentoLido = {
  eventId: string;
  data: string;
  inicio: number;
  fim: number;
  duracao: number;
  profissionalId: string;
  clienteId: string;
  clienteNome: string;
  clienteTel: string;
  servicoId: string;
  servicoNome: string;
  servicoValor: number;
  confirmado: boolean;
  meetLink?: string;
  htmlLink?: string;
  recorrente: boolean;
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
  /* Aqui moravam `novosAgendamentos` (os atendimentos) e `googleEventos` (o vínculo com
   * o Google). Os dois saíram na fatia 4, e a razão é a mesma: o atendimento AGORA É o
   * evento do Google. Guardar uma cópia local seria manter uma segunda verdade que
   * começa igual e diverge no primeiro arrasto feito direto no Google Calendar.
   *
   * O que sobrou por cima do evento é `etapas`, chaveado por `ag:<eventId>`. Fica aqui e
   * não lá de propósito: pôr a etapa no Google transformaria cada arrasto do kanban num
   * PATCH numa agenda real. */
  cliAtivo: Record<string, boolean>;
  assumidas: Record<string, boolean>;
  resolvidos: Record<string, boolean>;
  enviadas: Record<string, D.Msg[]>;
  notas: Record<string, D.Nota>;
  proximoNumero: number;
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

/* ── quando o catálogo local não conhece o que veio do Google ──
 *
 * O caso real não é exótico: o Bruno marca no computador com um serviço que ele mesmo
 * criou (que vive só no localStorage dali) e abre o app no celular. O `maisaSvc` do evento
 * aponta para um id que aquele navegador nunca viu.
 *
 * Sem isto o atendimento simplesmente não renderizaria — some da grade sem aviso, e some
 * DEPOIS de ter aparecido no outro aparelho. Com as cópias gravadas no próprio evento (ver
 * PROPS em calendario.ts) ele renderiza inteiro; o que se perde é a ligação com o catálogo,
 * e é isso que `soltoDoCatalogo` marca para a gaveta poder dizer. */
const servicoDoEvento = (e: AtendimentoLido): D.Servico => ({
  id: e.servicoId || `sv-google-${e.eventId}`,
  nome: e.servicoNome,
  categoria: "Extra",
  preco: e.servicoValor,
  duracao: e.duracao,
  profissionalIds: [e.profissionalId],
  // `ativo: false` — ele não está no catálogo, então não deve aparecer como opção para
  // marcar o PRÓXIMO atendimento. Serve só para descrever este.
  ativo: false,
});

const clienteDoEvento = (e: AtendimentoLido): D.Cliente => ({
  id: e.clienteId || `cl-google-${e.eventId}`,
  nome: e.clienteNome,
  telefone: e.clienteTel,
  email: "",
  cpf: "",
  canal: "Online",
  ativo: true,
  desde: "—",
  servicoId: e.servicoId,
  atendimentos: 0,
  valor: 0,
});

/** uuid v4. `randomUUID` existe em todo navegador com https (ou localhost); o fallback é
 *  para o resto e não precisa ser criptográfico — só precisa não repetir. */
function uuid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const INICIAL: Persistido = {
  __v: 3,
  etapas: {},
  profAtivo: {},
  svcAtivo: {},
  svcEdit: {},
  svcNovos: [],
  cliAtivo: {},
  assumidas: {},
  resolvidos: {},
  enviadas: {},
  notas: {},
  proximoNumero: D.PROXIMO_NUMERO,
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
 * `googleEventos` entrou na lista dos descartados depois, na fatia 4: ele era o VÍNCULO
 * entre um agendamento local e um evento do Google, e agora não há agendamento local para
 * vincular. Os eventos que ele apontava seguem de pé no Google — e são LIDOS de volta,
 * que é justamente por que o vínculo deixou de ser necessário. Não se perde nada.
 *
 * O que ATRAVESSA é o que custa caro perder: `notas` guarda referências REAIS da Focus
 * e números de NFS-e que foram emitidos de verdade na prefeitura — apagar isso seria
 * apagar documento fiscal do histórico da tela.
 *
 * ⚠️ A v2 NÃO é apagada. Ela fica como a única saída de emergência se esta conversão
 * estiver errada de um jeito que só apareça em uso. Sai numa versão futura.
 */
function migrarDaV2(): string | null {
  const velho = localStorage.getItem(CHAVE_ANTIGA);
  if (!velho) return null;
  try {
    // Estes três já não existem no formato de hoje, mas existiam no v2 e são justamente
    // campos a DESCARTAR — o tipo precisa admiti-los para o destructuring poder recusá-los.
    const v2 = JSON.parse(velho) as Partial<Persistido> & {
      posicoes?: Record<string, unknown>;
      novosAgendamentos?: unknown[];
      googleEventos?: Record<string, unknown>;
    };
    const { posicoes, novosAgendamentos, etapas, googleEventos, ...atravessa } = v2;
    const novo = JSON.stringify({ ...atravessa, __v: 3 });
    localStorage.setItem(CHAVE, novo);
    const perdidos = [
      Object.keys(posicoes ?? {}).length && "posições de arrasto",
      (novosAgendamentos ?? []).length && "atendimentos marcados no protótipo",
      Object.keys(etapas ?? {}).length && "etapas do kanban",
      Object.keys(googleEventos ?? {}).length && "vínculos com eventos do Google (os eventos seguem lá)",
    ].filter(Boolean);
    if (perdidos.length) {
      console.info(`[store] migrado v2 → v3. Não veio junto: ${perdidos.join(", ")}.`);
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
  /** Id do atendimento com um cancelamento à espera do segundo toque. */
  cancelarPedido: string | null;
  pedirCancelamento: (id: string) => void;
  /** ⚠️ APAGA o evento na agenda real e avisa quem estiver convidado. Peça confirmação. */
  cancelarAtendimento: (id: string) => void;
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
  /** Nome pelo catálogo vivo. Prefira este a `D.nomeServico`, que só lê o catálogo de partida. */
  nomeServico: (id: string) => string;
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
  /** Atendimento sendo marcado (clique num horário vago), antes de virar evento no Google. */
  rascunho: D.RascunhoAgendamento | null;
  /** O POST em voo, e o que voltou se ele falhou. Quem mostra é a gaveta. */
  rascunhoEstado: { enviando: boolean; erro?: string };
  novoAgendamento: (profissionalId: string, inicio: number, data: string) => void;
  editarRascunho: (patch: Partial<D.RascunhoAgendamento>) => void;
  /** ⚠️ CRIA o evento na agenda real do profissional. */
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
        /* Campos que saíram do formato (ver Persistido). Um v3 gravado antes deles ainda os
         * traz, e o spread abaixo os devolveria ao disco a cada gravação — dado morto se
         * reescrevendo em silêncio. Não vale uma v4: o resto do formato não mudou.
         *
         * `novosAgendamentos` é o único que dói: são atendimentos que o usuário marcou
         * quando o app ainda guardava agenda própria. Eles NÃO foram para o Google (o
         * botão da gaveta é que fazia isso, um a um), então não há para onde levá-los sem
         * escrever numa agenda real por conta própria — coisa que este código não faz sem
         * alguém pedir. Ficam registrados no console, com data e cliente, para poderem ser
         * remarcados à mão. */
        const {
          posicoes: _saiuDoFormato,
          novosAgendamentos: agLocais,
          googleEventos: _vinculoSemPar,
          ...p
        } = JSON.parse(cru) as Partial<Persistido> & {
          posicoes?: unknown;
          novosAgendamentos?: { data?: string; inicio?: number; clienteId?: string }[];
          googleEventos?: unknown;
        };
        if (agLocais?.length) {
          console.info(
            `[store] ${agLocais.length} atendimento(s) do formato antigo não vieram — o app agora só ` +
            `guarda atendimento no Google Calendar. Eram: ` +
            agLocais.map((a) => `${a.data ?? "?"} ${D.hhmm(a.inicio ?? 0)} ${D.nomeCliente(a.clienteId ?? "")}`).join("; "),
          );
        }
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
  /** De qual atendimento há um "Cancelar" à espera de confirmação. Ver cancelarAtendimento. */
  const [cancelarPedido, setCancelarPedido] = useState<string | null>(null);
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
  // Trocar de tela ou de item descarta um "Cancelar" pela metade — ver cancelarAtendimento.
  const irPara = useCallback((t: TelaId) => { setTela(t); setSel(null); setCancelarPedido(null); }, []);
  const abrir = useCallback((id: string) => { setSel(id); setCancelarPedido(null); }, []);
  const fechar = useCallback(() => { setSel(null); setCancelarPedido(null); }, []);

  // Esc fecha a gaveta — atalho único, vale nas duas formas (modal e folha).
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  /* CATÁLOGO VIVO. D.SERVICOS é o ponto de partida; o que o usuário edita ou cria vem por cima.
   * Antes o catálogo era imutável e a gaveta do serviço só mostrava — com um chip prometendo
   * "abrir e editar". Preço e duração são a razão de existir de uma tela de catálogo.
   *
   * Está declarado AQUI, longe dos outros toggles, porque o memo dos atendimentos logo abaixo
   * resolve o serviço de cada cartão por ele. Enquanto vivia lá embaixo, aquele memo não tinha
   * como enxergá-lo e lia `D.servico` direto: renomear "Corte" trocava o nome na tela Serviços e
   * NÃO trocava no cartão do atendimento. E o nome era o menor dos problemas — a duração antiga
   * continuava ditando `fim`, ou seja, a ALTURA do cartão na grade da Agenda. */
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
  /** O `D.nomeServico` do catálogo VIVO. O de data.ts enxerga só o catálogo de partida: usar
   *  aquele numa tela é imprimir o nome que o usuário acabou de trocar. Quem tem o store à mão
   *  usa este. */
  const nomeServico = useCallback((id: string) => servicoDe(id)?.nome ?? "—", [servicoDe]);

  /** Os atendimentos como o Google os devolveu, acumulados por janela já lida.
   *
   *  Declarado aqui em cima, longe do bloco de leitura lá embaixo, só por ordem de hooks:
   *  o memo logo abaixo depende dele. Quem o ESCREVE é `lerAgenda`. */
  const [atendimentos, setAtendimentos] = useState<AtendimentoLido[]>([]);

  /* ── os atendimentos ──
   *
   * Uma origem só, e ela é o Google Calendar. Já foram três (os nove de hoje escritos à
   * mão, o mês gerado sob demanda, e os marcados no navegador); as duas primeiras morreram
   * com os exemplos, a terceira morreu aqui — marcar agora cria o evento lá, e o que a
   * tela mostra é o que voltou da leitura.
   *
   * O que este memo faz é RESOLVER: pegar os ids que vieram gravados no evento e trocá-los
   * pelos objetos do catálogo vivo, caindo nas cópias do próprio evento quando o catálogo
   * local não conhece o id (ver servicoDoEvento).
   *
   * A duração vem do EVENTO (`e.duracao`, a diferença entre start e end), não do catálogo.
   * São coisas diferentes desde que o horário passou a poder mudar por fora: se alguém
   * esticar o evento no Google Calendar, o bloco na grade tem que esticar junto. */
  const agendamentos = useMemo<AgendamentoVivo[]>(() => {
    return atendimentos.flatMap((e) => {
      const pf = D.profissional(e.profissionalId);
      /* Sem profissional não dá para desenhar: `.nome` aparece no cartão, na gaveta e no
       * aria-label. Sumir da lista com aviso no console é muito melhor que tela branca —
       * foi a lição de quando a equipe encolheu para uma pessoa e sobrou `pr2` no
       * localStorage. Serviço e cliente NÃO caem aqui: para eles existe a cópia gravada
       * no evento, que é justamente a razão de ela existir. */
      if (!pf) {
        console.warn(`[store] evento ${e.eventId} ignorado — profissional ${e.profissionalId} não existe`);
        return [];
      }
      const doCatalogo = servicoDe(e.servicoId);
      const cl = D.cliente(e.clienteId);
      const id = `ag:${e.eventId}`;

      return [{
        id,
        eventId: e.eventId,
        data: e.data,
        inicio: e.inicio,
        fim: e.fim,
        duracao: e.duracao,
        profissionalId: e.profissionalId,
        profissional: pf,
        // O nome e o preço vêm do catálogo quando ele conhece o serviço (assim renomear em
        // Serviços reflete no cartão); a duração vem do evento, sempre.
        servico: doCatalogo ? { ...doCatalogo, duracao: e.duracao } : servicoDoEvento(e),
        cliente: cl ?? clienteDoEvento(e),
        confirmado: e.confirmado,
        // Passado sem etapa gravada nasce "feito": ninguém volta ao kanban de terça-feira
        // para arrastar o que já aconteceu, e deixá-los todos em "Chegando" encheria a
        // primeira coluna de gente que já foi embora.
        etapa: db.etapas[id] ?? (e.data < D.HOJE.iso ? "feito" : "chegando"),
        meetLink: e.meetLink,
        htmlLink: e.htmlLink,
        recorrente: e.recorrente,
        soltoDoCatalogo: !doCatalogo || !cl,
      }];
      // Comparar duas datas ISO com `<` JÁ é comparação cronológica — campos de largura
      // fixa, do mais significativo para o menos. É a razão de o formato ter sido escolhido.
    }).sort((x, y) => (x.data < y.data ? -1 : x.data > y.data ? 1 : x.inicio - y.inicio));
    // `servicoDe` nas deps cobre svcNovos E svcEdit de uma vez: é ele que muda de identidade
    // quando o catálogo muda. Listar `db.svcNovos` à mão era meia dependência — pegava o
    // serviço criado e perdia o serviço editado.
  }, [atendimentos, db.etapas, servicoDe]);

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

  /** Etapa atual. O padrão já foi calculado pelo memo (ver `etapa` lá em cima), então aqui
   *  é só perguntar ao atendimento resolvido — antes isto reimplementava o mesmo default e
   *  as duas cópias podiam discordar. */
  const etapaDe = useCallback(
    (id: string): D.Etapa => agendamentoPorId(id)?.etapa ?? "chegando",
    [agendamentoPorId],
  );

  /* As três ações abaixo eram IRREVERSÍVEIS E SILENCIOSAS: arrastar um cartão para "Feito hoje"
   * marcava um atendimento como concluído sem toast, sem anúncio para leitor de tela e sem volta.
   * Agora todas confirmam e todas oferecem "Desfazer" — inclusive porque remarcar dispara WhatsApp
   * de verdade para o cliente. O rótulo nomeia quem mudou, não "item atualizado". */
  const ROTULO_ETAPA: Record<D.Etapa, string> = {
    chegando: "Chegando", atendendo: "Em atendimento", feito: "Feito hoje",
  };

  const moverEtapa = useCallback((id: string, etapa: D.Etapa) => {
    const a = agendamentoPorId(id);
    const antes = a?.etapa ?? "chegando";
    patch((d) => ({ etapas: { ...d.etapas, [id]: etapa } }));
    setArrastando(null);
    setAlvoSolta(null);
    if (antes === etapa) return;
    toast(
      `${a?.cliente.nome ?? "Atendimento"} → ${ROTULO_ETAPA[etapa]}`,
      { label: "Desfazer", onClick: () => patch((d) => ({ etapas: { ...d.etapas, [id]: antes } })) },
    );
  }, [patch, agendamentoPorId]);

  const avancarEtapa = useCallback((id: string) => {
    const a = agendamentoPorId(id);
    const antes = a?.etapa ?? "chegando";
    const i = D.ETAPAS.indexOf(antes);
    const prox = D.ETAPAS[Math.min(i + 1, D.ETAPAS.length - 1)];
    if (prox === antes) return;
    patch((d) => ({ etapas: { ...d.etapas, [id]: prox } }));
    toast(
      `${a?.cliente.nome ?? "Atendimento"} → ${ROTULO_ETAPA[prox]}`,
      { label: "Desfazer", onClick: () => patch((d) => ({ etapas: { ...d.etapas, [id]: antes } })) },
    );
  }, [patch, agendamentoPorId]);

  /* Aqui morava `reposicionar` — arrastar um bloco para outro horário.
   *
   * Ele saiu junto com o atendimento local, e o motivo é que não sobrou nada para editar:
   * o atendimento é o evento do Google, então remarcar é um PATCH numa agenda real. Isso
   * chega na fatia 5, e precisa de uma peça que ainda não existe — uma FILA DE ESCRITA
   * serializada por evento. Arrastar 10h→11h→12h dispara dois PATCH que podem chegar fora
   * de ordem, e o que fica no calendário é o penúltimo. Numa agenda de verdade isso é o
   * cliente aparecendo na hora errada.
   *
   * Enquanto isso não vem, o bloco NÃO é arrastável (ver Bloco na Agenda) e a barra da
   * grade não promete que seja. Um arrasto que não faz nada seria pior que a ausência dele:
   * a tela diria que remarcou e o Google discordaria em silêncio. Para remarcar hoje: no
   * Google Calendar, e o app mostra a mudança na leitura seguinte. */

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

  /* `servicos`, `servicoDe` e `nomeServico` — o catálogo vivo — moraram aqui. Subiram para
   * antes do memo dos atendimentos, que precisa deles para resolver o serviço de cada cartão. */

  const svcAtivo = useCallback(
    (id: string) => db.svcAtivo[id] ?? servicoDe(id)?.ativo ?? false,
    [db.svcAtivo, servicoDe],
  );
  const alternarSvc = useCallback((id: string) => {
    setDb((d) => {
      // Mesma conta de `svcAtivo`, inclusive o svcEdit — se as duas divergissem, o primeiro
      // clique no toggle podia "virar" para o valor que a tela já mostrava, sem efeito visível.
      const doCatalogo = D.servico(id) ?? d.svcNovos.find((s) => s.id === id);
      const base = d.svcEdit[id]?.ativo ?? doCatalogo?.ativo ?? false;
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

  /* CRIAR ATENDIMENTO desceu para o bloco do Google Calendar, lá embaixo.
   *
   * Não é organização: marcar um horário virou uma ESCRITA numa agenda real, e este
   * callback passou a precisar de `conectado` e de `lerStatusGoogle`, que só existem
   * depois. Deixá-lo aqui exigiria um ref só para furar a ordem dos hooks — e o lugar
   * honesto de uma função que faz POST no Google é junto das outras que fazem. */

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
          // catálogo vivo, e aqui não é cosmético: a discriminação é o que a prefeitura imprime
          // no documento. Com `D.nomeServico` a nota saía com o nome que o usuário já trocou.
          discriminacao: `${nomeServico(c.servicoId)} — ${c.atendimentos} atendimentos · ${D.PERIODO}`,
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
  }, [notaDe, setNota, numeroLocal, acompanhar, agendarCancelamentoDeTeste, nomeServico]);

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

  /* ── cancelar um atendimento ──
   *
   * Era "Remover do Google", e o nome fazia sentido quando o atendimento vivia aqui e o
   * evento era uma cópia dele lá. Agora são a mesma coisa: apagar o evento É cancelar o
   * atendimento, e chamar isso de "remover do Google" faria parecer que o atendimento
   * continua marcado em algum lugar.
   *
   * É a única ação DESTRUTIVA em agenda real que o app tem, então pede confirmação — em
   * dois toques na própria gaveta, e não num diálogo novo. `cancelarPedido` guarda de
   * qual atendimento é o pedido, e abrir/fechar a gaveta o descarta: um "Confirmar" que
   * sobrevive à navegação é um clique acidental esperando acontecer.
   */
  const pedirCancelamento = useCallback((id: string) => setCancelarPedido(id), []);

  const cancelarAtendimento = useCallback(async (id: string) => {
    const ag = agendamentoPorId(id);
    if (!ag || googleEmVoo.current.has(id)) return;

    googleEmVoo.current.add(id);
    marcarOcupado(id, true);
    try {
      const r = await fetch(
        `/api/google/evento?eventId=${encodeURIComponent(ag.eventId)}&pid=${encodeURIComponent(ag.profissionalId)}`,
        { method: "DELETE" },
      ).then((x) => x.json());

      if (r.ok) {
        // Tira da lista local na hora. A rota trata 404/410 como sucesso (o evento já não
        // estava lá), então este caminho também cobre "alguém apagou pelo Google antes".
        setAtendimentos((prev) => prev.filter((e) => e.eventId !== ag.eventId));
        setCancelarPedido(null);
        setSel(null);
        toast(`${ag.cliente.nome} — atendimento cancelado e evento removido do Google`);
        return;
      }
      toast(RESPOSTA_GOOGLE[r.status] ?? r.info ?? "Não foi possível cancelar o atendimento");
    } catch {
      toast("Sem conexão com o servidor");
    } finally {
      googleEmVoo.current.delete(id);
      marcarOcupado(id, false);
    }
  }, [agendamentoPorId]);

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
        /* A MESMA resposta traz as duas coisas, e a marca `maisa` é o que as separa: o
         * evento criado por este app vira ATENDIMENTO (colorido, com cliente e serviço); o
         * resto vira BLOQUEIO (cinza, só leitura). Ver PROPS em calendario.ts.
         *
         * Sem essa separação, um atendimento marcado aqui voltaria da leitura como
         * bloqueio cinza sem cliente — o app criaria o evento e depois não se reconheceria
         * nele. */
        const novosAtend: AtendimentoLido[] = [];
        const novosBloq: Bloqueio[] = [];
        for (const e of (r.eventos ?? []) as any[]) {
          const base = {
            eventId: String(e.eventId), data: e.data, inicio: e.inicio, fim: e.fim,
            duracao: e.duracao, recorrente: !!e.recorrente,
            meetLink: e.meetLink ?? undefined, htmlLink: e.htmlLink ?? undefined,
          };
          if (e.maisa) {
            novosAtend.push({
              ...base,
              profissionalId: e.maisa.profissionalId || PID_AGENDA,
              clienteId: e.maisa.clienteId ?? "",
              clienteNome: e.maisa.clienteNome ?? "Cliente",
              clienteTel: e.maisa.clienteTel ?? "",
              servicoId: e.maisa.servicoId ?? "",
              servicoNome: e.maisa.servicoNome ?? "Atendimento",
              servicoValor: Number(e.maisa.servicoValor) || 0,
              // A única fonte real de "confirmado" que existe: a resposta de quem foi
              // convidado. Sem convidados ninguém deve nada, então está confirmado.
              confirmado: !e.aguardandoResposta,
            });
          } else {
            novosBloq.push({ ...base, id: `bloq:${base.eventId}`, titulo: e.titulo });
          }
        }
        /* Cache ACUMULATIVO: só o pedaço que acabou de chegar é substituído. Navegar
         * para setembro e voltar para agosto não refaz request, e — mais importante —
         * o Fluxo de hoje continua com os dados de hoje enquanto a Agenda passeia. */
        const foraDaJanela = (d: string) => d < r.de || d > r.ate;
        setBloqueios((prev) => [...prev.filter((b) => foraDaJanela(b.data)), ...novosBloq]);
        setAtendimentos((prev) => [...prev.filter((a) => foraDaJanela(a.data)), ...novosAtend]);
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
      // Os atendimentos vão junto: eles SÃO os eventos daquela agenda. Deixá-los na tela
      // depois de desconectar mostraria uma agenda que o app já não tem como ler nem mexer.
      setAtendimentos([]);
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

  /* ══ MARCAR UM ATENDIMENTO ══
   *
   * Clicar num vago abre um rascunho na gaveta com dia, hora e profissional já resolvidos
   * pelo clique; falta escolher quem e o quê. Confirmar CRIA O EVENTO NO GOOGLE — não
   * existe mais um passo "criar evento" separado, e não existe mais atendimento que só
   * viva aqui. Era duas entradas para a mesma coisa: quem marcasse e não clicasse no botão
   * da gaveta ficava com um horário que o Google nunca soube que existia.
   *
   * Mora nesta altura do arquivo porque depende de `conectado` e de `lerStatusGoogle`. */
  const [rascunho, setRascunho] = useState<D.RascunhoAgendamento | null>(null);
  /** Enquanto o POST está no ar, e o que voltou se ele falhou. A gaveta é quem mostra. */
  const [rascunhoEstado, setRascunhoEstado] = useState<{ enviando: boolean; erro?: string }>({ enviando: false });
  const criacaoEmVoo = useRef(false);

  const novoAgendamento = useCallback((profissionalId: string, inicio: number, data: string) => {
    /* Recusa cedo e explica. Sem isto o clique abriria a gaveta, o usuário escolheria
     * cliente e serviço, e só então descobriria que não há para onde mandar. O ambiente
     * local é exatamente esse caso: `.env.local` vazio ⇒ Google `nao_configurado`. */
    if (!conectado) {
      toast(
        google.status === "ok"
          ? "Conecte a agenda do Google em Minha Equipe — é lá que o atendimento é criado"
          : (MOTIVO_GOOGLE[google.status] ?? "O Google Calendar não está disponível agora"),
      );
      return;
    }
    // A data entra no id junto com profissional e hora: com Semana e Mês na tela, "pr1 às 14h" já
    // não identifica um vago — existe um por dia.
    const id = `novo-${data}-${profissionalId}-${inicio}`;
    /* O uuid nasce AQUI, com o rascunho, e não na hora de enviar. É o que faz a
     * retentativa depois de uma falha reusar a mesma chave — o servidor consulta por ela
     * antes de inserir (ver buscarPorProp), então "Tentar de novo" depois de um timeout
     * não cria um segundo evento. Um uuid sorteado por tentativa não protegeria de nada. */
    setRascunho({ id, maisaAg: uuid(), data, profissionalId, inicio, clienteId: "", servicoId: "" });
    setRascunhoEstado({ enviando: false });
    setSel(id);
  }, [conectado, google.status]);

  const editarRascunho = useCallback((p: Partial<D.RascunhoAgendamento>) => {
    setRascunho((r) => (r ? { ...r, ...p } : r));
    // Mexeu em algo depois de falhar: some o erro velho, que já não descreve o que há na tela.
    setRascunhoEstado((e) => (e.erro ? { enviando: false } : e));
  }, []);

  const confirmarRascunho = useCallback(async () => {
    /* Lê `rascunho` direto, NÃO de dentro de um `setRascunho(r => …)`: disparar POST e
     * emitir toast são efeitos, e um updater de estado precisa ser puro — em
     * desenvolvimento o React o invoca duas vezes. Antes isso duplicava o atendimento no
     * localStorage; agora duplicaria um evento numa agenda real. */
    const r = rascunho;
    if (!r || !r.clienteId || !r.servicoId) return;
    // Trava SÍNCRONA. `rascunhoEstado.enviando` só desabilita o botão no próximo render, e
    // entre o clique e ele cabe um segundo clique. Ver o mesmo padrão em `googleEmVoo`.
    if (criacaoEmVoo.current) return;

    const sv = servicoDe(r.servicoId);
    const cl = D.cliente(r.clienteId);
    if (!sv || !cl) return;

    criacaoEmVoo.current = true;
    setRascunhoEstado({ enviando: true });
    try {
      const resp = await fetch("/api/google/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maisaAg: r.maisaAg,
          data: r.data,
          inicio: r.inicio,
          profissionalId: r.profissionalId,
          servicoId: sv.id,
          clienteId: cl.id,
          // Nome, telefone, duração e valor vão junto porque serão GRAVADOS no evento: um
          // serviço criado pelo usuário só existe neste navegador, e sem a cópia o
          // atendimento não renderizaria em nenhum outro. Ver PROPS em calendario.ts.
          duracao: sv.duracao,
          servicoNome: sv.nome,
          servicoValor: sv.preco,
          clienteNome: cl.nome,
          clienteTelefone: cl.telefone,
          comMeet: true,
        }),
      }).then((x) => x.json());

      if (resp.ok) {
        /* Entra na lista JÁ CONFIRMADO — não é inserção otimista, é o resultado do POST.
         * Poderia ser um refetch da janela, mas seria um segundo round-trip para saber o
         * que a resposta já disse. A leitura seguinte reconcilia de qualquer forma. */
        setAtendimentos((prev) => [
          ...prev.filter((e) => e.eventId !== resp.eventId),
          {
            eventId: String(resp.eventId),
            data: r.data,
            inicio: r.inicio,
            fim: r.inicio + sv.duracao / 60,
            duracao: sv.duracao,
            profissionalId: r.profissionalId,
            clienteId: cl.id, clienteNome: cl.nome, clienteTel: cl.telefone,
            servicoId: sv.id, servicoNome: sv.nome, servicoValor: sv.preco,
            confirmado: true,
            meetLink: resp.meetLink ?? undefined,
            htmlLink: resp.htmlLink ?? undefined,
            recorrente: false,
          },
        ]);
        setRascunho(null);
        setRascunhoEstado({ enviando: false });
        setSel(null);
        const quando = r.data === D.HOJE.iso ? "hoje" : D.rotuloDia(r.data);
        toast(
          resp.status === "ja_existia"
            ? `${cl.nome} já estava marcado ${quando} às ${D.hhmm(r.inicio)}`
            : `${cl.nome} marcado ${quando} às ${D.hhmm(r.inicio)}${resp.semMeet ? " — sem link do Meet" : " · na sua agenda do Google"}`,
        );
        return;
      }

      if (resp.status === "reconectar") {
        setRascunhoEstado({ enviando: false, erro: "O acesso ao Google expirou. Reconecte a agenda em Minha Equipe e tente de novo." });
        void lerStatusGoogle();
        return;
      }
      setRascunhoEstado({ enviando: false, erro: RESPOSTA_GOOGLE[resp.status] ?? resp.info ?? "Não foi possível marcar." });
    } catch {
      /* Rede caiu. O evento PODE ter sido criado — por isso o erro fala em "tentar de
       * novo" e não em "não foi criado": só o `maisaAg` sabe a verdade, e ele garante que
       * a segunda tentativa encontre o primeiro em vez de criar outro. */
      setRascunhoEstado({ enviando: false, erro: "Sem conexão com o servidor. Tentar de novo é seguro — não cria duplicado." });
    } finally {
      criacaoEmVoo.current = false;
    }
  }, [rascunho, servicoDe, lerStatusGoogle]);

  const descartarRascunho = useCallback(() => {
    setRascunho(null);
    setRascunhoEstado({ enviando: false });
    setSel(null);
  }, []);

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
    agendamentos, agendamentosDoDia, agendamentoPorId, moverEtapa, avancarEtapa,
    cancelarPedido, pedirCancelamento, cancelarAtendimento,
    fila, resolverFila,
    arrastando, alvoSolta, iniciarArrasto, encerrarArrasto, marcarAlvo,
    convSel, selecionarConversa, abaConv, setAbaConv, estadoConversa, threadDe, assumir, devolver, enviar,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    servicos, servicoDe, nomeServico, editarServico, criarServico, excluirServico,
    filtroSvc, setFiltroSvc, filtroCli, setFiltroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento, emitiveis,
    loteAberto, pedirLote, fecharLote, confirmarLote,
    secAtiva, abrirSecao,
    assistente: db.assistente, setAssistente,
    dias: db.dias, alternarDia, setHorario,
    cfg: db.cfg, alternarCfg,
    salvo, salvar,
    diaSel, verDia,
    rascunho, rascunhoEstado, novoAgendamento, editarRascunho, confirmarRascunho, descartarRascunho,
    google, googleDe, conectarGoogle, desconectarGoogle, googleOcupado,
    bloqueiosDoDia, bloqueioPorId, agendaGoogle, recarregarAgenda,
    railAberto, setRailAberto,
  }), [
    tela, irPara, sel, abrir, fechar,
    agendamentos, agendamentosDoDia, agendamentoPorId, moverEtapa, avancarEtapa,
    cancelarPedido, pedirCancelamento, cancelarAtendimento,
    fila, resolverFila,
    arrastando, alvoSolta, iniciarArrasto, encerrarArrasto, marcarAlvo,
    convSel, selecionarConversa, abaConv, estadoConversa, threadDe, assumir, devolver, enviar,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    servicos, servicoDe, nomeServico, editarServico, criarServico, excluirServico,
    filtroSvc, filtroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento, emitiveis,
    loteAberto, pedirLote, fecharLote, confirmarLote,
    secAtiva, abrirSecao,
    db.assistente, setAssistente,
    db.dias, alternarDia, setHorario,
    db.cfg, alternarCfg,
    salvo, salvar,
    diaSel, rascunho, rascunhoEstado, novoAgendamento, editarRascunho, confirmarRascunho, descartarRascunho,
    google, googleDe, conectarGoogle, desconectarGoogle, googleOcupado,
    bloqueiosDoDia, bloqueioPorId, agendaGoogle, recarregarAgenda,
    railAberto,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

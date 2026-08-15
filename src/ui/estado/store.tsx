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
import * as D from "@/adaptadores/saida/demo";
import type { Canal } from "@/nucleo/dominio/canal";
import type { Faq } from "@/nucleo/dominio/faq";
import { toast } from "@/ui/primitivos";

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
  /* Aqui moravam `assumidas` e `enviadas` — quem conduzia cada conversa e o que você tinha
   * respondido. Saíram na fatia das conversas reais, e o motivo é o mesmo dos atendimentos:
   * o dado tem dono, e o dono não é este navegador.
   *
   * `assumidas` era pior que uma cópia local: o botão "Assumir" prometia, no toast, que a
   * MAISA não responderia mais naquela conversa — e o webhook nunca soube. Estado que muda o
   * comportamento do AGENTE não pode morar no `localStorage` de um dos aparelhos do dono.
   *
   * `enviadas` guardava as suas respostas só aqui: elas não iam para o WhatsApp de ninguém e
   * não entravam na thread que o modelo replaya. Agora `voce` é gravado em `mensagens_agente`
   * como qualquer outra fala — era a dívida "voce nunca é gravado" do LEIA-ME do agente. */
  resolvidos: Record<string, boolean>;
  notas: Record<string, D.Nota>;
  proximoNumero: number;
  /* Aqui moravam `assistente` e `cfg` — o nome, o tom, a saudação e os sete toggles de
   * comportamento. Saíram em 13/08/2026 pelo MESMO motivo que `assumidas` saiu, e a
   * frase que está escrita quinze linhas acima já dizia o porquê antes de existir para
   * onde ir: "estado que muda o comportamento do AGENTE não pode morar no `localStorage`
   * de um dos aparelhos do dono".
   *
   * Era literalmente isso: o dono escrevia o tom no notebook, e no WhatsApp a MAISA
   * respondia com a fixture global — a mesma para todo inquilino. Configurar não
   * configurava nada. Agora vêm de `GET /api/assistente` e vão por `PATCH`, e o agente lê
   * a MESMA linha (ver `composicao.ts`, `configuracaoDoAgente`).
   *
   * `dias` foi junto, algumas horas depois, e a dívida que estava escrita aqui ("tem
   * tabela e ainda não tem porta… some se o dono trocar de aparelho") ficou paga. Era
   * pior do que a frase dizia: a MAISA respondia "que horas vocês atendem?" com o
   * expediente do PROFISSIONAL — outro dado, com outra finalidade. Agora vem de
   * `GET /api/horarios` e vai por `PUT`, e a persona anuncia a MESMA grade.
   *
   * Sobra a regra, e ela vale para o próximo campo que alguém pensar em pôr aqui: só
   * mora no `localStorage` o que é preferência de APARELHO (a aba aberta, o rascunho de
   * um formulário). O que muda o comportamento do agente, não. */
};

const CHAVE = "maisa.app.v3";
const CHAVE_ANTIGA = "maisa.app.v2";

/**
 * Quanto se espera antes de mandar os ajustes da MAISA ao servidor.
 *
 * 500ms é o intervalo em que uma pausa de digitação já parece fim de palavra, e curto o
 * bastante para que sair da tela logo depois ainda encontre o timer vivo (o desmonte
 * força o envio de qualquer jeito). Aumentar economiza requisição e aumenta a chance de
 * perder a última tecla; diminuir faz o contrário.
 */
const JANELA_AJUSTES = 500;

/** De quanto em quanto se pergunta se o QR já foi escaneado. */
const INTERVALO_PAREAMENTO = 3000;
/** Quantas perguntas antes de desistir. 3s × 40 ≈ 2min, mais que a validade de um QR. */
const TENTATIVAS_PAREAMENTO = 40;

/* Motivos que a rota de conexão devolve na query string, em português de gente.
 * Cada um diz o que aconteceu E o que fazer — "erro genérico" não ajuda ninguém. */
const MOTIVO_GOOGLE: Record<string, string> = {
  nao_configurado: "O Google Calendar ainda não está configurado neste ambiente",
  nao_autenticado: "Sua sessão expirou — entre de novo para conectar",
  login_necessario: "Entre na sua conta para conectar uma agenda",
  profissional_invalido: "Profissional não encontrado",
  /* Novo com o `tenantId` real: logado, mas sem linha em `membros`. Não é erro de OAuth —
   * é o estado de quem acabou de criar a conta e ainda não tem negócio provisionado. */
  sem_negocio: "Esta conta ainda não tem um negócio. Rode criar_negocio() no Supabase antes de conectar a agenda",
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
  sem_negocio: "Esta conta ainda não tem um negócio criado",
  payload_invalido: "Faltam dados do atendimento",
};

/** Um único array vazio compartilhado para os dias sem nada marcado — devolver `[]` novo a cada
 *  chamada faria toda dependência de memo mudar de identidade sem nada ter mudado de verdade. */
const SEM_ATENDIMENTO: AgendamentoVivo[] = [];
const SEM_BLOQUEIO: Bloqueio[] = [];

/* ─────────────────────────────────────────────────────────────────────────────
 * O CADASTRO — quem eu sou, quem atende, o que eu vendo, quem são meus clientes.
 *
 * Vem de `GET /api/cadastro`, que por dentro é o caso de uso `lerCadastro`. Antes as telas
 * liam `D.EQUIPE`, `D.SERVICOS`, `D.CLIENTES` e `D.NEGOCIO` — arrays importados do módulo
 * de fixtures — e por isso o app inteiro dependia de dado em memória para desenhar a grade.
 *
 * ⚠️ O FIXTURE CONTINUA AQUI, COMO VALOR INICIAL, E ISSO É DELIBERADO.
 *
 * A alternativa era começar com `null` e ensinar cada consumidor a esperar. Só que
 * praticamente todo consumidor é síncrono e nenhum tem estado de carregando: a grade da
 * Agenda monta `grid-template-columns` a partir de `agendas` (lista vazia ⇒ `repeat(0, …)`
 * e sobra só a régua de horas), o rail lê `negocio.nome` sem `?.`, e a cascata de despacho
 * da Gaveta decide a entidade por "qual lista contém este id" — com listas vazias ela abre
 * gaveta em branco. Seriam seis arquivos ganhando estado de carregando de uma vez, num
 * passo que já troca a fonte do dado.
 *
 * Então o fixture virou PLACEHOLDER: a tela pinta na primeira passada com ele e repinta com
 * o real quando o fetch volta. Em modo demonstração (sem Supabase) os dois são iguais, e o
 * repinte é invisível — porque `/api/cadastro` cai no mesmo `repositorioDemo`.
 *
 * O PREÇO, e o que se faz com ele: se o fetch FALHAR, a tela segue mostrando o fixture — ou
 * seja, mentindo com cara de dado real. É o pior modo de falha desta escolha, e é por isso
 * que `cadastroErro` existe e viaja no store: quem mostra número de negócio tem como dizer
 * que aquilo não é o negócio de verdade. Sem esse aviso, esta decisão seria indefensável.
 * ────────────────────────────────────────────────────────────────────────────── */

export type Cadastro = {
  negocio: D.Negocio;
  profissionais: D.Profissional[];
  servicos: D.Servico[];
  clientes: D.Cliente[];
  /** Agendas que ESTA sessão pode operar. Vem do servidor: é allowlist, não filtro de tela. */
  agendas: string[];
};

const CADASTRO_INICIAL: Cadastro = {
  negocio: D.NEGOCIO,
  profissionais: D.EQUIPE,
  servicos: D.SERVICOS,
  clientes: D.CLIENTES,
  agendas: D.COLUNAS_AGENDA,
};

/** Motivo → frase, no mesmo espírito de `MOTIVO_GOOGLE`. O `status` é contrato com
 *  `entrada/http/respostas.ts` e com o porteiro — procure o nome lá antes de mudar aqui. */
const MOTIVO_CADASTRO: Record<string, string> = {
  nao_autenticado: "Faça login para ver os dados do seu negócio.",
  login_necessario: "Faça login para ver os dados do seu negócio.",
  sem_negocio: "Esta conta ainda não tem um negócio criado.",
  nao_configurado: "O banco de dados não está configurado neste ambiente.",
  erro: "Não foi possível carregar o cadastro do negócio.",
};

/* Idem para os ajustes da MAISA. Mesmos nomes de `status` — contrato com `respostas.ts`.
 *
 * ⚠️ `carregar` e `salvar` são fallbacks SEPARADOS de propósito. Uma frase só para os dois
 * mente na metade das vezes: "não foi possível salvar" numa falha de LEITURA manda o dono
 * procurar o que ele fez de errado ao editar, quando o problema é que a tela nunca chegou
 * a ter o dado dele.
 *
 * `payload_invalido` é o que `respostas.ts:34` devolve para `NaoEncontrado` — e aqui isso
 * tem UM significado concreto: não existe linha em `assistente` para este inquilino. Só
 * acontece com negócio nascido fora de `criar_negocio()`, e a frase diz o que fazer. */
const MOTIVO_AJUSTES: Record<string, string> = {
  nao_autenticado: "Faça login para ajustar a MAISA.",
  login_necessario: "Faça login para ajustar a MAISA.",
  sem_negocio: "Esta conta ainda não tem um negócio criado.",
  nao_configurado: "O banco de dados não está configurado neste ambiente.",
  payload_invalido: "Este negócio não tem ajustes da MAISA gravados. Ele foi criado sem passar por criar_negocio().",
  carregar: "Não foi possível carregar os ajustes da MAISA.",
  salvar: "Não foi possível salvar os ajustes da MAISA.",
};

/* O horário anunciado. `payload_invalido` aqui é quase sempre uma recusa COM frase
 * própria (`"Sábado: o fechamento tem que ser depois da abertura."`), e por isso quem
 * envia prefere o `info` do servidor a este mapa — ver `enviarSemana`. */
const MOTIVO_HORARIOS: Record<string, string> = {
  nao_autenticado: "Faça login para ajustar o horário.",
  login_necessario: "Faça login para ajustar o horário.",
  sem_negocio: "Esta conta ainda não tem um negócio criado.",
  nao_configurado: "O banco de dados não está configurado neste ambiente.",
  payload_invalido: "Este negócio não tem horário gravado. Ele foi criado sem passar por criar_negocio().",
  carregar: "Não foi possível carregar o horário de atendimento.",
  salvar: "Não foi possível salvar o horário de atendimento.",
};

/* O canal de WhatsApp. `reconectar` é o status que `respostas.ts:39` devolve para
 * `PrecisaReconectar` — e aqui ele chega quando o inquilino não tem canal e alguém tentou
 * mandar mensagem. A frase precisa dizer a AÇÃO, porque existe uma e é esta tela. */
const MOTIVO_CANAL: Record<string, string> = {
  nao_autenticado: "Faça login para conectar o WhatsApp.",
  login_necessario: "Faça login para conectar o WhatsApp.",
  sem_negocio: "Esta conta ainda não tem um negócio criado.",
  nao_configurado: "Falta configuração no servidor para conectar o WhatsApp.",
  reconectar: "O WhatsApp deste negócio não está conectado.",
  ler: "Não foi possível consultar o WhatsApp.",
  conectar: "Não foi possível gerar o QR code.",
  desconectar: "Não foi possível desconectar.",
};

/**
 * A frase do erro do canal, COM a lista do que falta quando o servidor a mandou.
 *
 * `respostas.ts:26` sempre devolve `faltando[]` junto de `nao_configurado`, e essa lista
 * era descartada aqui: a tela dizia "falta configuração no servidor" e o nome da variável
 * ficava só no código. Em 13/08/2026 isso custou um canal fora do ar e uma hora de
 * caça — a informação existia na resposta e ninguém a mostrava.
 */
function motivoCanal(r: { status?: string; info?: string; faltando?: string[] }, padrao: string): string {
  const base = MOTIVO_CANAL[r?.status ?? ""] ?? r?.info ?? padrao;
  const faltam = r?.faltando ?? [];
  return faltam.length ? `${base} Falta: ${faltam.join(", ")}.` : base;
}

/** Idem para as conversas. Mesmos nomes de `status` — eles são contrato com `respostas.ts`. */
const MOTIVO_CONVERSAS: Record<string, string> = {
  nao_autenticado: "Faça login para ver as conversas do WhatsApp.",
  login_necessario: "Faça login para ver as conversas do WhatsApp.",
  sem_negocio: "Esta conta ainda não tem um negócio criado.",
  nao_configurado: "O banco de dados não está configurado neste ambiente.",
  erro: "Não foi possível carregar as conversas do WhatsApp.",
};

/** Thread vazia compartilhada — devolver `[]` novo a cada chamada faria a Thread repintar
 *  a cada render, e junto com ela o `scrollIntoView` do fim da conversa. */
const SEM_MSG: D.Msg[] = [];

/**
 * De quanto em quanto tempo a tela de Conversas relê, com ela aberta.
 *
 * 15s é o intervalo em que uma resposta da MAISA aparece "quase na hora" para quem está
 * olhando, sem virar uma consulta por segundo. Só roda com a tela de Conversas em foco (ver o
 * efeito): num inbox, dado velho é pior que em qualquer outra tela do app — o dono decide
 * assumir ou não a partir do que está escrito ali.
 *
 * O caminho honesto seria realtime (o Supabase tem), e é a próxima fatia. Polling é o que dá
 * para fazer sem abrir um canal novo, e num painel de uma pessoa o custo é irrelevante.
 */
const RELER_CONVERSAS_MS = 15_000;

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
  resolvidos: {},
  notas: {},
  proximoNumero: D.PROXIMO_NUMERO,
};

/**
 * Os ajustes da MAISA enquanto `GET /api/assistente` não respondeu.
 *
 * É placeholder de PRIMEIRA PINTURA, não default de produto: o padrão de verdade nasce
 * no banco, no provisionamento, com o tom variando por vertical
 * (`005_provisionar.sql:209`). Se estes valores ficarem na tela, é porque a resposta não
 * chegou — e é isso que `ajustesErro` existe para dizer.
 */
const AJUSTES_PLACEHOLDER = {
  assistente: {
    nome: "MAISA",
    tom: "amigável" as D.Tom,
    saudacao: `Olá! Aqui é a MAISA, assistente do ${D.NEGOCIO.nome}. Como posso te ajudar hoje?`,
    ativa: true,
  },
  cfg: D.CFG_PADRAO,
};

/**
 * A semana enquanto `GET /api/horarios` não respondeu.
 *
 * Mesmo papel do `AJUSTES_PLACEHOLDER`, e o mesmo aviso: se estes valores ficarem na
 * tela, é porque a resposta não chegou. O padrão de verdade nasce no provisionamento,
 * derivado do expediente do primeiro profissional (`005_provisionar.sql:195`).
 */
const SEMANA_PLACEHOLDER: D.SemanaAnunciada = D.DIAS_PADRAO.map((d, dow) => ({
  dow,
  aberto: d.aberto,
  de: d.aberto ? d.de : null,
  ate: d.aberto ? d.ate : null,
}));

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

  /* ── conversas de WhatsApp, do servidor ──
   *
   * Vinham de `D.CONVERSAS` e `D.THREADS` — seis conversas escritas à mão, com horas fixas e
   * ids `cv1`…`cv6`. Agora vêm de `GET /api/conversas`, que lê a MESMA tabela que o agente
   * escreve. Aqui NÃO há placeholder de fixture, ao contrário do cadastro: uma conversa
   * inventada na tela é uma pessoa inventada, e o dono responderia a ela. Lista vazia é a
   * verdade quando ninguém escreveu ainda. */

  /** Mais recente primeiro. O `id` de cada uma é a chave do telefone — ver `dominio/conversas`. */
  conversas: D.Conversa[];
  conversaDe: (id: string) => D.Conversa | null;
  /** Frase quando a lista não carregou. A tela mostra isso em vez de "nenhuma conversa". */
  conversasErro: string | null;
  /** Já voltou do servidor? `false` cobre "carregando" e "falhou" — a tela distingue pelo erro. */
  conversasCarregadas: boolean;
  recarregarConversas: () => void;

  convSel: string;
  selecionarConversa: (id: string) => void;
  abaConv: AbaConversa;
  setAbaConv: (a: AbaConversa) => void;
  /* `estadoConversa(id)` morava aqui. Saiu: `Conversa` agora CARREGA o estado (derivado no
     servidor por `estadoDaConversa`), então a tela lê `c.estado` do objeto que ela já tem.
     Manter a função seria oferecer dois jeitos de fazer a mesma pergunta — e o jeito indireto
     obrigava a varrer a lista por id para descobrir o que estava na mão. Quem só tem o id usa
     `conversaDe(id)?.estado`. */
  threadDe: (id: string) => D.Msg[];
  /** A thread da conversa aberta ainda está vindo? Só ela — as outras não interessam. */
  threadCarregando: boolean;

  /** ⚠️ MANDA MENSAGEM DE VERDADE no WhatsApp da pessoa. Não se desfaz. */
  enviar: (id: string, txt: string) => void;
  /** Enquanto o envio está no ar. O composer desabilita — Enter duplo mandaria duas. */
  enviando: boolean;

  /** Assumir CALA A MAISA naquela conversa, no servidor. Devolver a solta de novo. */
  assumir: (id: string) => void;
  devolver: (id: string) => void;

  /* ── o cadastro, vindo do servidor ──
   * O que substituiu `import * as D from "@/adaptadores/saida/demo"` nas telas. Ver
   * `CADASTRO_INICIAL` para o porquê de ainda existir um placeholder de fixture. */

  /** Negócio, equipe, catálogo de partida, carteira e as agendas permitidas. */
  cadastro: Cadastro;
  /** Frase quando o cadastro NÃO carregou. Não-nulo significa que o que está na tela é
   *  placeholder — quem mostra número do negócio tem obrigação de dizer isso. */
  cadastroErro: string | null;
  /** Já voltou do servidor? `false` cobre tanto "carregando" quanto "falhou". */
  cadastroCarregado: boolean;

  /** Profissional por id, do cadastro. Substitui `D.profissional`. */
  profissionalDe: (id: string) => D.Profissional | null;
  /** Cliente por id, do cadastro. Substitui `D.cliente`. */
  clienteDe: (id: string) => D.Cliente | null;
  /** Serviço como o CADASTRO o conhece, sem as edições locais — é o que responde
   *  "veio do catálogo ou o usuário criou?". Para o vivo, use `servicoDe`. */
  servicoDoCadastro: (id: string) => D.Servico | null;
  nomeDoProfissional: (id: string) => string;
  nomeDoCliente: (id: string) => string;

  /** A agenda que a tela lê. Vazio até o cadastro chegar — guarde antes de usar na URL. */
  pidAgenda: string;
  /** Este profissional atende neste dia? Lê o expediente do próprio profissional. */
  atendeNoDia: (pid: string, data: string) => boolean;
  /** Cabe um atendimento começando nesta hora? */
  podeComecarEm: (pid: string, data: string, inicio: number) => boolean;

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
  /**
   * Trocar o nome do NEGÓCIO (não o da assistente).
   *
   * Recurso diferente e rota diferente (`PATCH /api/negocio`), por isso não entra em
   * `setAssistente`. O valor atual se lê em `cadastro.negocio.nome` — é o mesmo que a
   * sidebar pinta e o mesmo que a MAISA diz no WhatsApp.
   */
  setNomeDoNegocio: (nome: string) => void;

  /* ── as respostas prontas ──
   * `salvarFaq` devolve se DEU CERTO, e não `void`: a tela precisa saber se limpa o
   * formulário. Limpar sempre apagaria o que o dono escreveu quando o servidor recusou —
   * e ele teria que digitar tudo de novo para descobrir o que estava errado. */
  faqs: Faq[];
  faqsErro: string | null;
  /** Uma gravação em curso. Cada uma gera um embedding, então o botão trava enquanto isso. */
  faqsOcupado: boolean;
  salvarFaq: (p: { id?: string; pergunta: string; resposta: string }) => Promise<boolean>;
  removerFaq: (id: string) => Promise<void>;
  /** Frase quando os ajustes não carregaram ou não salvaram. Não-nulo = o que está na
   *  tela pode não ser o que a MAISA está usando no WhatsApp. */
  ajustesErro: string | null;
  /** Já voltou do servidor? `false` = o que se vê é placeholder de primeira pintura. */
  ajustesCarregados: boolean;

  /* ── o canal de WhatsApp ── */
  /** `null` enquanto não voltou do servidor. */
  canal: Canal | null;
  canalErro: string | null;
  /** Há uma chamada em voo — a tela desabilita os botões para não disparar duas. */
  canalOcupado: boolean;
  /** O que falta NO SERVIDOR para conseguir conectar. Vazio = dá para conectar.
   *  Com item, a tela mostra a lista e trava o que derrubaria o canal atual. */
  canalFaltando: string[];
  /** QR do pareamento em curso, pronto para `<img src>`. `null` = nenhum. */
  qrcode: string | null;
  conectarCanal: () => Promise<void>;
  desconectarCanal: () => Promise<void>;
  /** Desconecta e já pede QR novo. Perde o número atual — confirme antes de chamar. */
  trocarNumero: () => Promise<void>;
  /** O horário ANUNCIADO — o que a MAISA responde a "que horas vocês atendem?".
   *  Vem de `GET /api/horarios`; `semanaCarregada` diz se já é o do servidor. */
  semana: D.SemanaAnunciada;
  semanaErro: string | null;
  semanaCarregada: boolean;
  alternarDia: (dow: number) => void;
  setHorario: (dow: number, campo: "de" | "ate", valor: string) => void;
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
  /**
   * `sem_negocio` entrou junto com o `tenantId` real: `/api/google/status` passou a
   * responder isso quando a conta está logada mas ainda não tem linha em `membros` — o
   * primeiro login de todo mundo. Sem estar na união, o valor chegava como string que
   * nenhum ramo tratava e a tela caía no "carregando" para sempre: um spinner eterno em
   * vez de "crie o negócio primeiro".
   */
  status: "carregando" | "ok" | "nao_configurado" | "nao_autenticado" | "login_necessario" | "sem_negocio";
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
          /* Os dois das conversas. Não vão para o console como os atendimentos porque não há
           * nada a resgatar: quem conduzia cada conversa é uma pergunta que o servidor agora
           * responde melhor (e para todos os aparelhos), e as respostas guardadas aqui nunca
           * chegaram a ninguém — se fossem impressas, seriam uma lista de mensagens que o
           * cliente nunca recebeu, o que é pior que silêncio. */
          assumidas: _posseAgoraNoServidor,
          enviadas: _respostasQueNuncaSairam,
          /* Os ajustes da MAISA, que passaram a vir de `GET /api/assistente`.
           *
           * DESCARTAR é obrigatório, não higiene: mantê-los daria uma corrida em que o
           * disco (escrito na sessão passada, talvez noutro aparelho) sobrescreveria a
           * resposta do servidor sempre que chegasse depois — e o dono veria o tom voltar
           * sozinho ao que era, sem nada na tela explicando. Sumir com eles aqui é o que
           * torna o servidor a única fonte. */
          assistente: _tomAgoraNoServidor,
          cfg: _togglesAgoraNoServidor,
          /* `dias` seguiu o mesmo caminho horas depois — `GET /api/horarios`. A dívida
           * que estava escrita em `Persistido` ("tem tabela e ainda não tem porta") ficou
           * paga, e o motivo de descartar é idêntico ao dos dois acima. */
          dias: _horarioAgoraNoServidor,
          ...p
        } = JSON.parse(cru) as Partial<Persistido> & {
          posicoes?: unknown;
          novosAgendamentos?: { data?: string; inicio?: number; clienteId?: string }[];
          googleEventos?: unknown;
          assumidas?: unknown;
          enviadas?: unknown;
          assistente?: unknown;
          cfg?: unknown;
          dias?: unknown;
        };
        if (agLocais?.length) {
          console.info(
            `[store] ${agLocais.length} atendimento(s) do formato antigo não vieram — o app agora só ` +
            `guarda atendimento no Google Calendar. Eram: ` +
            agLocais.map((a) => `${a.data ?? "?"} ${D.hhmm(a.inicio ?? 0)} ${nomeDoCliente(a.clienteId ?? "")}`).join("; "),
          );
        }
        setDb((prev) => ({ ...prev, ...p }));
      }
    } catch {
      /* localStorage indisponível — segue nos defaults */
    }
    setHidratado(true);
    /* ⚠️ `[]` é PROPOSITAL, e `nomeDoCliente` NÃO entra aqui, ainda que o corpo o use.
     *
     * Este efeito é a hidratação: ele lê o disco e sobrescreve `db`. Rodar de novo
     * significaria reler o localStorage DEPOIS de o usuário já ter mexido em coisa, e
     * descartar o que ele fez. Como `nomeDoCliente` muda de identidade quando o cadastro
     * chega do servidor, listá-lo aqui — que é o que a regra de dependências exaustivas
     * pediria — transformaria uma resposta de rede num "desfazer" silencioso.
     *
     * O custo de não listar é conhecido e é irrelevante: a closure vê o cadastro inicial,
     * então o log de migração pode imprimir o nome do placeholder. É uma linha de
     * console.info que roda uma vez na vida daquele navegador. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  /* Começa VAZIO, não na primeira conversa: as conversas vêm do servidor, e no primeiro render
   * não existe "primeira". Quem escolhe por padrão é o efeito lá embaixo, quando a lista chega. */
  const [convSel, setConvSel] = useState<string>("");
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

  /* ── o cadastro do negócio ──
   * Uma ida ao servidor, no primeiro render, e o resultado substitui o placeholder de
   * fixture. Ver o comentário de `CADASTRO_INICIAL` para o porquê de haver placeholder. */

  const [cadastro, setCadastro] = useState<Cadastro>(CADASTRO_INICIAL);
  const [cadastroErro, setCadastroErro] = useState<string | null>(null);
  const [cadastroCarregado, setCadastroCarregado] = useState(false);

  useEffect(() => {
    /* `vivo` porque o efeito roda no StrictMode duas vezes em desenvolvimento, e porque o
     * provider pode desmontar antes de a resposta chegar. Sem ele, `setState` depois do
     * unmount vira aviso no console — e, pior, a resposta da PRIMEIRA montagem pode chegar
     * depois da segunda e sobrescrever dado mais novo com dado mais velho. */
    let vivo = true;

    void (async () => {
      try {
        const r = await fetch("/api/cadastro").then((x) => x.json());
        if (!vivo) return;

        if (!r?.ok) {
          /* Mantém o placeholder na tela e ACENDE o aviso. Zerar as listas aqui seria
           * pior: a Agenda perderia as colunas e a Gaveta abriria vazia, sintomas que não
           * apontam para "o cadastro não carregou". */
          setCadastroErro(MOTIVO_CADASTRO[r?.status] ?? MOTIVO_CADASTRO.erro);
          return;
        }

        setCadastro({
          negocio: r.negocio,
          profissionais: r.profissionais ?? [],
          servicos: r.servicos ?? [],
          clientes: r.clientes ?? [],
          agendas: r.agendas ?? [],
        });
        setCadastroErro(null);
        setCadastroCarregado(true);
      } catch {
        if (vivo) setCadastroErro(MOTIVO_CADASTRO.erro);
      }
    })();

    return () => { vivo = false; };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────────
   * AS CONVERSAS DE WHATSAPP.
   *
   * Vinham de `D.CONVERSAS`/`D.THREADS`: seis conversas escritas à mão, com hora fixa, e as
   * suas respostas indo para o `localStorage` em vez de para o WhatsApp de alguém. Agora vêm
   * de `GET /api/conversas`, que lê a mesma tabela que o agente escreve.
   *
   * ⚠️ AQUI NÃO HÁ PLACEHOLDER DE FIXTURE, ao contrário do cadastro logo acima — e a diferença
   * é de consequência, não de estilo. Cadastro com placeholder mostra um preço errado; conversa
   * com placeholder mostra uma PESSOA que não existe, com um pedido que ninguém fez. O dono
   * responderia a ela. Lista vazia é a verdade quando ninguém escreveu.
   * ────────────────────────────────────────────────────────────────────────────── */

  const [conversas, setConversas] = useState<D.Conversa[]>([]);
  const [conversasErro, setConversasErro] = useState<string | null>(null);
  const [conversasCarregadas, setConversasCarregadas] = useState(false);
  /** Threads já buscadas, por id de conversa. Cache: voltar para uma conversa não repinta vazio. */
  const [threads, setThreads] = useState<Record<string, D.Msg[]>>({});
  const [threadCarregando, setThreadCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  /** Uma leitura no ar por vez. O polling e o `focus` disparam do mesmo lugar. */
  const lendoConversas = useRef(false);

  const recarregarConversas = useCallback(async () => {
    if (lendoConversas.current) return;
    lendoConversas.current = true;
    try {
      const r = await fetch("/api/conversas").then((x) => x.json());
      if (!r?.ok) {
        setConversasErro(MOTIVO_CONVERSAS[r?.status] ?? MOTIVO_CONVERSAS.erro);
        return;
      }
      setConversas(r.conversas ?? []);
      setConversasErro(null);
      setConversasCarregadas(true);
    } catch {
      setConversasErro(MOTIVO_CONVERSAS.erro);
    } finally {
      lendoConversas.current = false;
    }
  }, []);

  /**
   * A thread de UMA conversa.
   *
   * A resposta traz a conversa junto, e nós aproveitamos: abrir uma conversa reconcilia a linha
   * dela na lista. Sem isso, quem abre uma conversa cujo estado mudou no servidor (a MAISA
   * respondeu enquanto a lista estava velha) veria a thread nova com o rótulo antigo.
   */
  const carregarThread = useCallback(async (id: string) => {
    setThreadCarregando(true);
    try {
      const r = await fetch(`/api/conversas?telefone=${encodeURIComponent(id)}`).then((x) => x.json());
      if (!r?.ok) return;
      setThreads((t) => ({ ...t, [id]: r.msgs ?? [] }));
      if (r.conversa) setConversas((cs) => cs.map((c) => (c.id === id ? r.conversa : c)));
    } catch {
      /* Silêncio de propósito: a tela segue mostrando a thread que já tinha em cache. Um erro
       * aqui é transitório (rede), e trocar a conversa por uma mensagem de falha faria o dono
       * perder o contexto do que estava lendo. `conversasErro` cobre o caso que importa. */
    } finally {
      setThreadCarregando(false);
    }
  }, []);

  useEffect(() => { void recarregarConversas(); }, [recarregarConversas]);

  /* Escolhe a primeira quando a lista chega. Não é `useState(conversas[0])` porque no primeiro
   * render não existe lista — e não sobrescreve escolha nenhuma: só age com `convSel` vazio. */
  useEffect(() => {
    if (!convSel && conversas.length) setConvSel(conversas[0].id);
  }, [conversas, convSel]);

  useEffect(() => {
    if (convSel) void carregarThread(convSel);
  }, [convSel, carregarThread]);

  /* ── manter a tela viva ──
   *
   * Duas coisas, e as duas só com a tela de Conversas aberta: polling de 15s e releitura ao
   * voltar para a aba. Fora dela, nada roda — o rail mostra contador de pendência, e contador
   * atrasado em 30s não muda decisão nenhuma; a lista aberta, sim.
   *
   * `document.visibilityState` no polling porque um `setInterval` não para quando a aba vai para
   * o fundo: sem a checagem, uma aba esquecida do painel faria quatro requests por minuto a
   * noite inteira. */
  useEffect(() => {
    if (tela !== "conversas") return;

    const reler = () => {
      if (document.visibilityState !== "visible") return;
      void recarregarConversas();
      if (convSel) void carregarThread(convSel);
    };

    const timer = window.setInterval(reler, RELER_CONVERSAS_MS);
    window.addEventListener("focus", reler);
    document.addEventListener("visibilitychange", reler);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", reler);
      document.removeEventListener("visibilitychange", reler);
    };
  }, [tela, convSel, recarregarConversas, carregarThread]);

  const conversaDe = useCallback(
    (id: string) => conversas.find((c) => c.id === id) ?? null,
    [conversas],
  );

  /* ── conversas: as ações ── */

  const threadDe = useCallback((id: string) => threads[id] ?? SEM_MSG, [threads]);

  const selecionarConversa = useCallback((id: string) => setConvSel(id), []);

  /**
   * As quatro mudanças de posse, num lugar só.
   *
   * ⚠️ SEM ATUALIZAÇÃO OTIMISTA, de propósito — e é a única ação do app onde eu recuso otimismo.
   * Pintar "assumida" antes da confirmação exigiria recalcular o estado no navegador, ou seja,
   * uma segunda cópia de `estadoDaConversa`. E aqui a mentira é caríssima: a tela diria que a
   * MAISA está calada enquanto ela continua respondendo ao cliente. A ida ao servidor é a
   * própria garantia — é ela que o webhook vai ler.
   */
  const mudarPosse = useCallback(
    async (id: string, acao: "assumir" | "devolver" | "resolver" | "reabrir", aviso?: string) => {
      try {
        const r = await fetch("/api/conversas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ telefone: id, acao }),
        }).then((x) => x.json());

        if (!r?.ok) {
          toast(r?.info ?? "Não foi possível mudar quem conduz esta conversa");
          return;
        }
        await recarregarConversas();
        if (aviso) toast(aviso);
      } catch {
        toast("Sem conexão com o servidor — nada mudou");
      }
    },
    [recarregarConversas],
  );

  const assumir = useCallback((id: string) => {
    // O toast só aparece DEPOIS do ok do servidor. Antes ele era imediato e a frase era falsa.
    void mudarPosse(id, "assumir", "Conversa assumida — a MAISA não responde mais aqui");
  }, [mudarPosse]);

  const devolver = useCallback((id: string) => {
    void mudarPosse(id, "devolver", "Devolvida à MAISA");
  }, [mudarPosse]);

  /**
   * RESPONDER — manda mensagem de verdade no WhatsApp da pessoa.
   *
   * A bolha aparece na hora e o envio vai atrás: num composer, esperar a rede para ver o que se
   * digitou faz a tela parecer quebrada. O que NÃO se faz é deixá-la lá se o envio falhar — a
   * bolha otimista é removida e o toast diz o motivo. Mensagem visível no painel que o cliente
   * nunca recebeu é a pior falha possível aqui: o dono segue a conversa achando que respondeu.
   *
   * Depois do ok, relê lista e thread em vez de confiar na própria bolha: quem grava o instante
   * é o banco, e é o `criado_em` dele que ordena a conversa.
   */
  const enviar = useCallback((id: string, txt: string) => {
    const t = txt.trim();
    if (!t || enviando) return;

    const provisoria: D.Msg = { de: "voce", txt: t, em: new Date().toISOString() };
    setThreads((ts) => ({ ...ts, [id]: [...(ts[id] ?? []), provisoria] }));
    setEnviando(true);

    /* `!== provisoria` por IDENTIDADE de objeto, não por conteúdo: duas mensagens iguais na
     * mesma conversa ("ok") são normais, e filtrar por texto apagaria a errada. */
    const desfazer = () =>
      setThreads((ts) => ({ ...ts, [id]: (ts[id] ?? []).filter((m) => m !== provisoria) }));

    void (async () => {
      try {
        const r = await fetch("/api/conversas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ telefone: id, acao: "responder", texto: t }),
        }).then((x) => x.json());

        if (!r?.ok) {
          desfazer();
          toast(r?.info ?? "Não foi possível enviar a mensagem");
          return;
        }
        await Promise.all([recarregarConversas(), carregarThread(id)]);
      } catch {
        desfazer();
        toast("Sem conexão com o servidor — a mensagem não foi enviada");
      } finally {
        setEnviando(false);
      }
    })();
  }, [enviando, recarregarConversas, carregarThread]);


  /* Buscas por id. Antes eram `D.profissional(id)` / `D.cliente(id)` / `D.servico(id)` —
   * funções do módulo de fixtures que varriam um array constante. Agora varrem o cadastro
   * carregado, e é só isso que muda: mesma assinatura, mesmo `null` quando não acha.
   *
   * Varredura linear e não `Map`: são 1 profissional, 7 serviços e 17 clientes. Indexar
   * custaria mais em complexidade do que economiza em tempo, e o dia em que a carteira
   * crescer o problema não é a busca — é a lista inteira vindo no payload. */

  const profissionalDe = useCallback(
    (id: string) => cadastro.profissionais.find((p) => p.id === id) ?? null,
    [cadastro.profissionais],
  );

  const clienteDe = useCallback(
    (id: string) => cadastro.clientes.find((c) => c.id === id) ?? null,
    [cadastro.clientes],
  );

  /** O serviço como o CADASTRO o conhece — sem as edições locais. É o que responde
   *  "este serviço veio do catálogo ou o usuário criou?" (ver `servicoDe` para o vivo). */
  const servicoDoCadastro = useCallback(
    (id: string) => cadastro.servicos.find((s) => s.id === id) ?? null,
    [cadastro.servicos],
  );

  const nomeDoProfissional = useCallback(
    (id: string) => profissionalDe(id)?.nome ?? "—",
    [profissionalDe],
  );

  const nomeDoCliente = useCallback((id: string) => clienteDe(id)?.nome ?? "—", [clienteDe]);

  /**
   * De quem é a agenda que a tela lê.
   *
   * Era `const PID_AGENDA = D.COLUNAS_AGENDA[0]` no topo do módulo — avaliado no import, o
   * que era exatamente o que impedia o dado de vir do servidor. Agora é derivado do
   * cadastro, e por isso os callbacks que o usam ganharam dependência dele.
   *
   * Continua sendo UMA agenda só. Quando voltar a haver equipe, isto vira laço sobre
   * `cadastro.agendas` e o cache de agenda passa a ser por profissional.
   */
  const pidAgenda = cadastro.agendas[0] ?? "";

  /* ── expediente ──
   * Era `D.atende(pid, data)` / `D.podeComecar(pid, data, hora)`, que liam um
   * `Record<string, Expediente>` chaveado por `"pr1"` dentro do fixture. Com o cadastro
   * real os ids são uuid, e aquele Record devolveria `undefined` para tudo — e o domínio
   * degrada `undefined` para `false` em silêncio, o que pintaria TODA fatia da grade como
   * fora do expediente. Agenda inteira aparentemente fechada, zero erro no console.
   *
   * Aqui o expediente vem do próprio profissional, que é quem o tem. */

  /** `undefined` e não `null` porque é o que `atendeNoDia`/`podeComecarEm` recebem — eles
   *  já tratam a ausência (e degradam para "não atende", que é o lado seguro). */
  const expedienteDe = useCallback(
    (pid: string): D.Expediente | undefined => profissionalDe(pid)?.expediente,
    [profissionalDe],
  );

  const atendeNoDia = useCallback(
    (pid: string, data: string) => D.atendeNoDia(expedienteDe(pid), data),
    [expedienteDe],
  );

  const podeComecarEm = useCallback(
    (pid: string, data: string, inicio: number) => D.podeComecarEm(expedienteDe(pid), data, inicio),
    [expedienteDe],
  );

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
      ...cadastro.servicos.map((sv) => ({ ...sv, ...(db.svcEdit[sv.id] ?? {}) })),
      ...db.svcNovos.map((sv) => ({ ...sv, ...(db.svcEdit[sv.id] ?? {}) })),
    ],
    [cadastro.servicos, db.svcEdit, db.svcNovos],
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
      const pf = profissionalDe(e.profissionalId);
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
      const cl = clienteDe(e.clienteId);
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
  }, [atendimentos, db.etapas, servicoDe, profissionalDe, clienteDe]);

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
    /* A metade das conversas era `D.FILA_CONVERSAS`: dois itens escritos à mão apontando para
     * `cv1` e `cv2`. Agora é uma REGRA sobre o dado real — "o cliente falou e ninguém
     * respondeu" —, que é exatamente o `espera` do domínio (ver `estadoDaConversa`).
     *
     * ⚠️ O filtro é o estado do SERVIDOR, e não `db.resolvidos`: resolver uma conversa agora é
     * `resolvida_em` no banco, então a fila zera igual em todos os aparelhos do dono. E ela
     * esvazia sozinha pelo caminho certo — assumir muda o estado para `voce`, responder muda a
     * última fala para `voce`; nos dois casos o item sai daqui sem ninguém "resolver" nada. */
    ...conversas
      .filter((c) => c.estado === "espera")
      .map((c) => ({
        id: `cv:${c.id}`,
        alvo: c.id,
        titulo: c.nome,
        tag: "responder",
        msg: c.ultima?.txt ?? "Mandou mensagem e ainda não foi respondido.",
      })),
    ...agendamentosDoDia(D.HOJE.iso)
      .filter((a) => !a.confirmado && a.etapa === "chegando" && !db.resolvidos[a.id])
      .map((a) => ({
        id: `fl:${a.id}`,
        alvo: a.id,
        titulo: a.cliente.nome,
        tag: "confirmar",
        msg: `${D.hhmm(a.inicio)} ainda não confirmado — a MAISA já cobrou.`,
      })),
  ], [db.resolvidos, conversas, agendamentosDoDia]);

  /**
   * "Já resolvi" — o item some da fila.
   *
   * DOIS destinos, porque os dois tipos de item têm donos diferentes: conversa resolvida é
   * `resolvida_em` no banco (vale em todos os aparelhos, e é o que a MAISA e a tela leem juntas);
   * cobrança de confirmação continua no `localStorage`, porque ela é derivada do atendimento e
   * não existe coluna para "o dono já viu isto".
   *
   * O "Desfazer" existe nos dois — era a única ação irreversível da tela, e a estilizada como a
   * menos importante.
   */
  const resolverFila = useCallback((alvo: string) => {
    if (conversas.some((c) => c.id === alvo)) {
      void mudarPosse(alvo, "resolver");
      toast("Conversa resolvida", { label: "Desfazer", onClick: () => void mudarPosse(alvo, "reabrir") });
      return;
    }
    patch((d) => ({ resolvidos: { ...d.resolvidos, [alvo]: true } }));
    toast("Item resolvido", {
      label: "Desfazer",
      onClick: () => patch((d) => {
        const r = { ...d.resolvidos };
        delete r[alvo];
        return { resolvidos: r };
      }),
    });
  }, [patch, conversas, mudarPosse]);

  /* ── arrasto ── */
  const iniciarArrasto = useCallback((id: string) => setArrastando(id), []);
  const encerrarArrasto = useCallback(() => { setArrastando(null); setAlvoSolta(null); }, []);
  const marcarAlvo = useCallback((alvo: string | null) => {
    setAlvoSolta((a) => (a === alvo ? a : alvo));
  }, []);

  /* ── toggles ── */
  const profAtivo = useCallback(
    (id: string) => db.profAtivo[id] ?? profissionalDe(id)?.ativo ?? false,
    [db.profAtivo, profissionalDe],
  );
  const alternarProf = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.profAtivo[id] ?? profissionalDe(id)?.ativo ?? false;
      return { ...d, profAtivo: { ...d.profAtivo, [id]: !atual } };
    });
  }, [profissionalDe]);

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
      const doCatalogo = servicoDoCadastro(id) ?? d.svcNovos.find((s) => s.id === id);
      const base = d.svcEdit[id]?.ativo ?? doCatalogo?.ativo ?? false;
      const atual = d.svcAtivo[id] ?? base;
      return { ...d, svcAtivo: { ...d.svcAtivo, [id]: !atual } };
    });
  }, [servicoDoCadastro]);

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
    (id: string) => db.cliAtivo[id] ?? clienteDe(id)?.ativo ?? false,
    [db.cliAtivo, clienteDe],
  );
  const alternarCli = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.cliAtivo[id] ?? clienteDe(id)?.ativo ?? false;
      return { ...d, cliAtivo: { ...d.cliAtivo, [id]: !atual } };
    });
  }, [clienteDe]);

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
    if (!clienteDe(clienteId)?.teste) return;
    const seg = Math.round(D.TESTE_CANCELA_APOS_MS / 1000);
    toast(`Nota de teste emitida — cancelando em ${seg}s`);
    agendar(() => { void cancelarNota(clienteId); }, D.TESTE_CANCELA_APOS_MS);
  }, [agendar, cancelarNota, clienteDe]);

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
    const c = clienteDe(clienteId);
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
  }, [notaDe, setNota, numeroLocal, acompanhar, agendarCancelamentoDeTeste, nomeServico, clienteDe]);

  const fechamento = useMemo(
    () => cadastro.clientes.filter((c) => cliAtivo(c.id) && c.valor > 0),
    [cadastro.clientes, cliAtivo],
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

  /* ─────────────────────────────────────────────────────────────────────────────
   * OS AJUSTES DA MAISA — servidor, não localStorage.
   *
   * O que a tela "A MAISA" edita é o PROMPT do agente. Enquanto isto morava no disco do
   * navegador, o dono escrevia o tom e a MAISA respondia no WhatsApp com a fixture
   * global — a mesma para todo inquilino. Agora entra por `GET /api/assistente`, sai por
   * `PATCH`, e o agente lê a MESMA linha (`composicao.ts`, `configuracaoDoAgente`).
   *
   * ── OTIMISTA, COALESCIDO, COM VOLTA ATRÁS ──
   *
   * A tela pinta na hora e o servidor é avisado depois, porque um toggle que espera a
   * rede parece quebrado. Mas otimismo sem volta atrás é mentira: se o PATCH falhar, o
   * estado volta ao que era ANTES da primeira mexida pendente — não ao valor anterior
   * daquele campo, que já não é o que o servidor tem.
   *
   * Coalescido porque digitar o nome dispara um evento por tecla. Sem juntar, "Aurora"
   * seriam seis PATCH, seis linhas de log e uma corrida em que a resposta de "Auro" pode
   * chegar depois da de "Aurora" e pintar a tela de volta. Junta-se por `JANELA_AJUSTES`
   * e manda-se UM patch com tudo que mudou.
   * ────────────────────────────────────────────────────────────────────────────── */

  const [ajustes, setAjustes] = useState(AJUSTES_PLACEHOLDER);
  const [ajustesErro, setAjustesErro] = useState<string | null>(null);
  const [ajustesCarregados, setAjustesCarregados] = useState(false);

  /** O patch que ainda não foi para o servidor, acumulado entre teclas. */
  const ajustesPendentes = useRef<{ assistente?: Partial<Assistente>; cfg?: Partial<Record<D.ChaveCfg, boolean>> }>({});
  /** O estado ANTES da primeira mexida pendente. É para onde se volta se o PATCH falhar. */
  const ajustesAntes = useRef<typeof AJUSTES_PLACEHOLDER | null>(null);
  const ajustesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Depois da hidratação, não antes: a hidratação sobrescreve `db` com o disco, e um
   * efeito que corresse em paralelo poderia ter a resposta do servidor descartada por
   * ela. Aqui os dois não competem — `assistente` e `cfg` nem existem mais em `db`. */
  useEffect(() => {
    if (!hidratado) return;
    let vivo = true;

    void (async () => {
      try {
        const r = await fetch("/api/assistente").then((x) => x.json());
        if (!vivo) return;
        if (!r?.ok) {
          /* Mantém o placeholder na tela e acende o aviso, como `/api/cadastro` faz.
           * Zerar aqui deixaria a tela de ajustes em branco, sintoma que não aponta para
           * "não carregou". */
          setAjustesErro(MOTIVO_AJUSTES[r?.status] ?? MOTIVO_AJUSTES.carregar);
          return;
        }
        setAjustes({ assistente: r.assistente, cfg: r.cfg });
        setAjustesErro(null);
        setAjustesCarregados(true);
      } catch {
        if (vivo) setAjustesErro(MOTIVO_AJUSTES.carregar);
      }
    })();

    return () => { vivo = false; };
  }, [hidratado]);

  const enviarAjustes = useCallback(async () => {
    const corpo = ajustesPendentes.current;
    const antes = ajustesAntes.current;
    ajustesPendentes.current = {};
    ajustesAntes.current = null;
    if (!corpo.assistente && !corpo.cfg) return;

    try {
      const r = await fetch("/api/assistente", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      }).then((x) => x.json());

      if (!r?.ok) {
        if (antes) setAjustes(antes);
        /* O toast repete o MOTIVO, não um genérico. Foi assim que o primeiro teste real
         * quase virou caça ao fantasma: o servidor respondia 409 `sem_negocio`, a frase
         * certa ficava guardada em `ajustesErro` e a tela dizia só "não foi possível
         * salvar" — mandando procurar defeito na edição quando o problema era que a conta
         * não tinha negócio. */
        const motivo = MOTIVO_AJUSTES[r?.status] ?? r?.info ?? MOTIVO_AJUSTES.salvar;
        setAjustesErro(motivo);
        toast(motivo);
        return;
      }

      /* Pinta com o que o BANCO gravou, não com o que foi mandado: normalização (espaço
       * colapsado no nome) e saudação vazia virando nada acontecem lá. Sem isto, a tela
       * mostraria "Aurora  Bot" e o agente usaria "Aurora Bot". */
      setAjustes({ assistente: r.assistente, cfg: r.cfg });
      setAjustesErro(null);
      setSalvo(true);
      agendar(() => setSalvo(false), 2200);
    } catch {
      if (antes) setAjustes(antes);
      setAjustesErro(MOTIVO_AJUSTES.salvar);
      toast(MOTIVO_AJUSTES.salvar);
    }
  }, [agendar, toast]);

  /** Aplica na tela agora e agenda o envio, juntando com o que já estava pendente. */
  const mexerNosAjustes = useCallback((
    p: { assistente?: Partial<Assistente>; cfg?: Partial<Record<D.ChaveCfg, boolean>> },
  ) => {
    setAjustes((a) => {
      /* A foto para a volta atrás é tirada UMA vez por rajada, aqui dentro do updater,
       * onde `a` é garantidamente o estado corrente. Tirá-la fora leria um `ajustes` de
       * closure que pode estar uma tecla atrasado. */
      if (!ajustesAntes.current) ajustesAntes.current = a;
      return {
        assistente: { ...a.assistente, ...(p.assistente ?? {}) },
        cfg: { ...a.cfg, ...(p.cfg ?? {}) },
      };
    });

    ajustesPendentes.current = {
      assistente: { ...ajustesPendentes.current.assistente, ...(p.assistente ?? {}) },
      cfg: { ...ajustesPendentes.current.cfg, ...(p.cfg ?? {}) },
    };
    if (!Object.keys(ajustesPendentes.current.assistente ?? {}).length) delete ajustesPendentes.current.assistente;
    if (!Object.keys(ajustesPendentes.current.cfg ?? {}).length) delete ajustesPendentes.current.cfg;

    if (ajustesTimer.current) clearTimeout(ajustesTimer.current);
    ajustesTimer.current = setTimeout(() => { void enviarAjustes(); }, JANELA_AJUSTES);
  }, [enviarAjustes]);

  /* Sai da tela com tecla pendente? Manda antes de morrer. `clearTimeout` sozinho
   * perderia a última palavra digitada — o caso mais comum de todos. */
  useEffect(() => () => {
    if (ajustesTimer.current) {
      clearTimeout(ajustesTimer.current);
      void enviarAjustes();
    }
  }, [enviarAjustes]);

  /* ─────────────────────────────────────────────────────────────────────────────
   * O HORÁRIO ANUNCIADO — a terceira coisa a sair do `localStorage`.
   *
   * O comentário de `Persistido` dizia, sobre `dias`: "exceção consciente, não
   * esquecimento — tem tabela e ainda não tem porta. Enquanto não tiver, é preferência de
   * tela, e some se o dono trocar de aparelho, que é a dívida honesta a pagar depois".
   * Esta é a hora de pagar. Era pior que perder no aparelho: a MAISA respondia "que horas
   * vocês atendem?" com o expediente do PROFISSIONAL, que é outro dado.
   *
   * ── PUT DA SEMANA INTEIRA, E NÃO PATCH DO DIA ──
   *
   * Diferente dos ajustes acima. Não é gosto: "quando abrimos" é uma GRADE, e mandar
   * sábado sozinho abriria a pergunta "e a quarta que a outra aba mexeu?". Semana
   * completa faz duas telas convergirem para a última que salvou, em vez de produzirem
   * uma semana que nunca existiu em nenhuma das duas. Ver `aplicacao/horarios.ts`.
   *
   * A coalescência continua valendo, e aqui ela vale MAIS: arrastar o relógio de um
   * `<input type="time">` dispara um `onChange` por minuto. Sem a janela, seria uma
   * requisição por minuto arrastado.
   * ────────────────────────────────────────────────────────────────────────────── */

  const [semana, setSemana] = useState<D.SemanaAnunciada>(SEMANA_PLACEHOLDER);
  const [semanaErro, setSemanaErro] = useState<string | null>(null);
  const [semanaCarregada, setSemanaCarregada] = useState(false);
  const semanaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** A foto de antes da rajada, para a volta atrás. Mesma mecânica de `ajustesAntes`. */
  const semanaAntes = useRef<D.SemanaAnunciada | null>(null);
  /** A grade que ainda não foi mandada. Existe para o desmonte ter o que enviar. */
  const semanaPendente = useRef<D.SemanaAnunciada | null>(null);

  useEffect(() => {
    if (!hidratado) return;
    let vivo = true;

    void (async () => {
      try {
        const r = await fetch("/api/horarios").then((x) => x.json());
        if (!vivo) return;
        if (!r?.ok) {
          setSemanaErro(MOTIVO_HORARIOS[r?.status] ?? MOTIVO_HORARIOS.carregar);
          return;
        }
        setSemana(r.semana);
        setSemanaErro(null);
        setSemanaCarregada(true);
      } catch {
        if (vivo) setSemanaErro(MOTIVO_HORARIOS.carregar);
      }
    })();

    return () => { vivo = false; };
  }, [hidratado]);

  const enviarSemana = useCallback(async (corpo: D.SemanaAnunciada) => {
    const antes = semanaAntes.current;
    semanaAntes.current = null;
    semanaPendente.current = null;

    try {
      const r = await fetch("/api/horarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      }).then((x) => x.json());

      if (!r?.ok) {
        if (antes) setSemana(antes);
        /* `info` antes do genérico: as recusas daqui são específicas e acionáveis
         * ("Sábado: o fechamento tem que ser depois da abertura"), e trocá-las por "não
         * foi possível salvar" esconderia exatamente o que o dono precisa corrigir. */
        const motivo = r?.info ?? MOTIVO_HORARIOS[r?.status] ?? MOTIVO_HORARIOS.salvar;
        setSemanaErro(motivo);
        toast(motivo);
        return;
      }

      /* Pinta com o que o banco gravou: dia fechado volta com `de`/`ate` em `null`, e a
       * tela precisa ver isso para não reexibir a hora de um dia que fechou. */
      setSemana(r.semana);
      setSemanaErro(null);
      setSalvo(true);
      agendar(() => setSalvo(false), 2200);
    } catch {
      if (antes) setSemana(antes);
      setSemanaErro(MOTIVO_HORARIOS.salvar);
    }
  }, [agendar, toast]);

  /** Aplica na tela agora e agenda o envio da semana inteira. */
  const mexerNaSemana = useCallback((f: (s: D.SemanaAnunciada) => D.SemanaAnunciada) => {
    setSemana((s) => {
      if (!semanaAntes.current) semanaAntes.current = s;
      const nova = f(s);
      semanaPendente.current = nova;
      if (semanaTimer.current) clearTimeout(semanaTimer.current);
      /* O corpo é montado AQUI DENTRO, com o estado novo em mãos. Montá-lo fora leria um
       * `semana` de closure que pode estar um clique atrasado — e como aqui se manda a
       * grade completa, um clique atrasado significa mandar de volta o dia que acabou de
       * mudar, desfazendo silenciosamente o que o dono fez. */
      semanaTimer.current = setTimeout(() => { void enviarSemana(nova); }, JANELA_AJUSTES);
      return nova;
    });
  }, [enviarSemana]);

  const alternarDia = useCallback((dow: number) => {
    mexerNaSemana((s) => s.map((d) => {
      if (d.dow !== dow) return d;
      const aberto = !d.aberto;
      /* Ao reabrir, repõe um horário válido: o domínio zera as horas de dia fechado, e um
       * `<input type="time">` que recebe `null` fica em branco sem dizer por quê. */
      return aberto
        ? { ...d, aberto, de: d.de ?? "09:00", ate: d.ate ?? "18:00" }
        : { ...d, aberto, de: null, ate: null };
    }));
  }, [mexerNaSemana]);

  const setHorario = useCallback((dow: number, campo: "de" | "ate", valor: string) => {
    mexerNaSemana((s) => s.map((d) => (d.dow === dow ? { ...d, [campo]: valor } : d)));
  }, [mexerNaSemana]);

  /* Mesma rede de segurança dos ajustes: sair da tela com o relógio mexido manda antes
   * de morrer, em vez de perder a última alteração. */
  useEffect(() => () => {
    if (semanaTimer.current) {
      clearTimeout(semanaTimer.current);
      if (semanaPendente.current) void enviarSemana(semanaPendente.current);
    }
  }, [enviarSemana]);

  /* ─────────────────────────────────────────────────────────────────────────────
   * O CANAL DE WHATSAPP — conectar, trocar número, desconectar.
   *
   * ── POR QUE "TROCAR NÚMERO" É DESCONECTAR + CONECTAR, E NÃO UM BOTÃO SÓ ──
   *
   * `POST /api/canal` se RECUSA a recriar quando o canal já está conectado: recriar ali
   * derrubaria o WhatsApp de um negócio que está atendendo, por causa de um clique. Essa
   * recusa é proposital e fica no servidor, onde nenhuma tela pode contorná-la.
   *
   * A consequência é que trocar de número exige dizer que se quer perder o atual. Então a
   * tela faz os dois passos, com confirmação no meio. Um botão só, "esperto", teria que
   * mandar um `forçar: true` — e aí a proteção viraria enfeite.
   *
   * ── O POLLING ──
   *
   * Parear é assíncrono e o único aviso é o WhatsApp do cliente conectando. Sem polling, a
   * tela ficaria em "pareando" para sempre e o dono acharia que falhou. Ele PARA sozinho:
   * ao conectar, ao sair da tela, e depois de `TENTATIVAS_PAREAMENTO` — QR expira, e um
   * intervalo que roda para sempre num painel aberto o dia inteiro é bateria e requisição
   * queimadas por nada.
   * ────────────────────────────────────────────────────────────────────────────── */

  const [canal, setCanal] = useState<Canal | null>(null);
  const [canalErro, setCanalErro] = useState<string | null>(null);
  const [canalOcupado, setCanalOcupado] = useState(false);
  /** O que falta no SERVIDOR para conseguir conectar. Vazio = dá para conectar.
   *  Enquanto tiver item, a tela não deixa derrubar o canal que já está de pé. */
  const [canalFaltando, setCanalFaltando] = useState<string[]>([]);
  /** O QR do pareamento em curso. `null` = não há pareamento na tela. */
  const [qrcode, setQrcode] = useState<string | null>(null);
  const pollCanal = useRef<ReturnType<typeof setInterval> | null>(null);

  const pararPolling = useCallback(() => {
    if (pollCanal.current) { clearInterval(pollCanal.current); pollCanal.current = null; }
  }, []);

  const buscarCanal = useCallback(async (): Promise<Canal | null> => {
    try {
      const r = await fetch("/api/canal").then((x) => x.json());
      if (!r?.ok) { setCanalErro(motivoCanal(r, MOTIVO_CANAL.ler)); return null; }
      setCanal(r.canal);
      setCanalFaltando(r.faltando ?? []);
      setCanalErro(null);
      return r.canal as Canal;
    } catch {
      setCanalErro(MOTIVO_CANAL.ler);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    let vivo = true;
    void (async () => { if (vivo) await buscarCanal(); })();
    return () => { vivo = false; };
  }, [hidratado, buscarCanal]);

  const iniciarPolling = useCallback(() => {
    pararPolling();
    let tentativas = 0;
    pollCanal.current = setInterval(() => {
      tentativas++;
      void (async () => {
        const c = await buscarCanal();
        if (c?.status === "conectado") {
          pararPolling();
          /* O QR some no instante em que conecta. Deixá-lo na tela convidaria a apontar a
           * câmera de novo para um código morto — e o cliente concluiria que não funcionou. */
          setQrcode(null);
          toast("WhatsApp conectado");
        } else if (tentativas >= TENTATIVAS_PAREAMENTO) {
          pararPolling();
          setQrcode(null);
          setCanalErro("O QR expirou sem ninguém escanear. Clique em conectar para gerar outro.");
        }
      })();
    }, INTERVALO_PAREAMENTO);
  }, [buscarCanal, pararPolling, toast]);

  /* Sair da tela para o polling. Sem isto, um painel aberto numa aba esquecida continuaria
   * batendo na rota para sempre. */
  useEffect(() => () => pararPolling(), [pararPolling]);

  const conectarCanal = useCallback(async () => {
    setCanalOcupado(true);
    setCanalErro(null);
    try {
      const r = await fetch("/api/canal", { method: "POST" }).then((x) => x.json());
      if (!r?.ok) {
        setCanalErro(motivoCanal(r, MOTIVO_CANAL.conectar));
        /* Reaproveita a lista do erro como estado da tela: se conectar falhou por
         * configuração, os botões destrutivos têm que travar AGORA, não no próximo GET. */
        if (r?.faltando?.length) setCanalFaltando(r.faltando);
        return;
      }
      setQrcode(r.pareamento?.qrcode ?? null);
      await buscarCanal();
      if (r.pareamento?.status !== "conectado") iniciarPolling();
    } catch {
      setCanalErro(MOTIVO_CANAL.conectar);
    } finally {
      setCanalOcupado(false);
    }
  }, [buscarCanal, iniciarPolling]);

  const desconectarCanal = useCallback(async () => {
    setCanalOcupado(true);
    setCanalErro(null);
    pararPolling();
    setQrcode(null);
    try {
      const r = await fetch("/api/canal", { method: "DELETE" }).then((x) => x.json());
      if (!r?.ok) { setCanalErro(motivoCanal(r, MOTIVO_CANAL.desconectar)); return; }
      await buscarCanal();
      toast("WhatsApp desconectado");
    } catch {
      setCanalErro(MOTIVO_CANAL.desconectar);
    } finally {
      setCanalOcupado(false);
    }
  }, [buscarCanal, pararPolling, toast]);

  /**
   * Desconecta e já pede o QR novo. Ver o cabeçalho para por que não é um botão só.
   *
   * ⚠️ A GUARDA É O CORAÇÃO DESTA FUNÇÃO, não um detalhe defensivo.
   *
   * Em 13/08/2026 isto rodou com `MAISA_PUBLIC_URL` ausente na Vercel: o `desconectar`
   * apagou a instância na Evolution, o `conectar` seguinte morreu montando a URL do
   * webhook, e o WhatsApp do negócio ficou fora do ar — sem ninguém ter escolhido isso.
   *
   * Os dois passos não são atômicos e não dá para fazê-los atômicos: quem apaga a
   * instância é outro servidor. O que dá é NÃO COMEÇAR quando já se sabe que o segundo
   * passo não termina. É por isso que `GET /api/canal` devolve `faltando`.
   */
  const trocarNumero = useCallback(async () => {
    if (canalFaltando.length) {
      setCanalErro(
        `Não dá para trocar o número agora: o servidor não conseguiria reconectar. ` +
          `Falta: ${canalFaltando.join(", ")}. O WhatsApp atual segue no ar.`,
      );
      return;
    }
    await desconectarCanal();
    await conectarCanal();
  }, [canalFaltando, conectarCanal, desconectarCanal]);

  const abrirSecao = useCallback((id: string) => {
    setSecAtiva((s) => (s === id ? null : id));
  }, []);

  const setAssistente = useCallback((p: Partial<Assistente>) => {
    mexerNosAjustes({ assistente: p });
  }, [mexerNosAjustes]);

  /* ─────────────────────────────────────────────────────────────────────────────
   * O NOME DO NEGÓCIO — a mesma mecânica dos ajustes, num campo só.
   *
   * Debounce próprio, e não o `mexerNosAjustes` acima, porque são DOIS recursos: os
   * ajustes vão para `PATCH /api/assistente` e o nome vai para `PATCH /api/negocio`.
   * Juntá-los num timer só faria uma tecla no nome do negócio reenviar a saudação inteira.
   *
   * ⚠️ Este campo não é cosmético: ele entra no prompt do agente a cada mensagem
   * ("sou a assistente de ___") e no texto de todo lembrete. Até 14/08/2026 NENHUMA tela
   * o escrevia, e um negócio de teste passou três dias chamado `bruno.vaskevicius` — o
   * nome saiu no primeiro lembrete de verdade que chegou num celular.
   * ────────────────────────────────────────────────────────────────────────────── */
  const nomeAntes = useRef<string | null>(null);
  const nomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enviarNomeDoNegocio = useCallback(async (nome: string) => {
    const antes = nomeAntes.current;
    nomeAntes.current = null;

    try {
      const r = await fetch("/api/negocio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      }).then((x) => x.json());

      if (!r?.ok) {
        /* Volta ao nome anterior E diz o motivo do servidor. O campo fica no rail e no
         * WhatsApp do cliente: deixar na tela um nome que o banco recusou faria o dono
         * acreditar num nome que a MAISA nunca vai usar. */
        if (antes !== null) setCadastro((c) => ({ ...c, negocio: { ...c.negocio, nome: antes } }));
        toast(r?.info ?? "Não foi possível salvar o nome do negócio.");
        return;
      }

      /* Pinta o que o BANCO gravou — a normalização (espaço colapsado) acontece lá. */
      setCadastro((c) => ({ ...c, negocio: r.negocio ?? c.negocio }));
      setSalvo(true);
      agendar(() => setSalvo(false), 2200);
    } catch {
      if (antes !== null) setCadastro((c) => ({ ...c, negocio: { ...c.negocio, nome: antes } }));
      toast("Não foi possível salvar o nome do negócio.");
    }
  }, [agendar]);

  /* ─────────────────────────────────────────────────────────────────────────────
   * AS DÚVIDAS FREQUENTES.
   *
   * Sem placeholder de fixture, ao contrário do cadastro: uma FAQ inventada na tela seria
   * indistinguível de uma que o dono cadastrou, e ele a deixaria lá achando que é dele. A
   * lista começa VAZIA e a frase de vazio convida a escrever a primeira.
   * ────────────────────────────────────────────────────────────────────────────── */
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqsErro, setFaqsErro] = useState<string | null>(null);
  const [faqsOcupado, setFaqsOcupado] = useState(false);

  useEffect(() => {
    if (!hidratado) return;
    let vivo = true;
    void (async () => {
      try {
        const r = await fetch("/api/faqs").then((x) => x.json());
        if (!vivo) return;
        if (!r?.ok) { setFaqsErro(r?.info ?? "Não foi possível carregar as dúvidas."); return; }
        setFaqs(r.faqs ?? []);
        setFaqsErro(null);
      } catch {
        if (vivo) setFaqsErro("Não foi possível carregar as dúvidas.");
      }
    })();
    return () => { vivo = false; };
  }, [hidratado]);

  const salvarFaq = useCallback(async (p: { id?: string; pergunta: string; resposta: string }) => {
    setFaqsOcupado(true);
    try {
      const r = await fetch("/api/faqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      }).then((x) => x.json());

      if (!r?.ok) {
        /* A frase do SERVIDOR, não um genérico. Os limites de tamanho e o campo em branco
         * têm mensagens próprias no caso de uso, e é isso que diz ao dono o que corrigir. */
        const motivo = r?.info ?? "Não foi possível salvar.";
        setFaqsErro(motivo);
        toast(motivo);
        return false;
      }

      /* Substitui a linha editada ou acrescenta a nova — pinta o que o BANCO devolveu, que
       * é onde a normalização aconteceu. Uma segunda ida ao servidor para reler a lista
       * inteira seria um piscar por uma informação que já veio na resposta. */
      setFaqs((atual) => {
        const i = atual.findIndex((f) => f.id === r.faq.id);
        if (i < 0) return [...atual, r.faq];
        const copia = [...atual];
        copia[i] = r.faq;
        return copia;
      });
      setFaqsErro(null);
      setSalvo(true);
      agendar(() => setSalvo(false), 2200);
      return true;
    } catch {
      setFaqsErro("Sem conexão com o servidor — nada mudou.");
      return false;
    } finally {
      setFaqsOcupado(false);
    }
  }, [agendar]);

  const removerFaq = useCallback(async (id: string) => {
    /* Tira da tela primeiro e devolve se o servidor recusar: apagar é a ação em que a
     * espera mais incomoda, e o custo de errar é baixo — a linha volta. */
    const antes = faqs;
    setFaqs((atual) => atual.filter((f) => f.id !== id));
    try {
      const r = await fetch(`/api/faqs?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then((x) => x.json());
      if (!r?.ok) { setFaqs(antes); toast(r?.info ?? "Não foi possível apagar."); }
    } catch {
      setFaqs(antes);
      toast("Sem conexão com o servidor — nada mudou.");
    }
  }, [faqs]);

  const setNomeDoNegocio = useCallback((nome: string) => {
    setCadastro((c) => {
      /* A foto para a volta atrás é tirada UMA vez por rajada, dentro do updater, onde o
       * estado é garantidamente o corrente — mesma razão do `mexerNosAjustes`. */
      if (nomeAntes.current === null) nomeAntes.current = c.negocio.nome;
      return { ...c, negocio: { ...c.negocio, nome } };
    });

    if (nomeTimer.current) clearTimeout(nomeTimer.current);
    nomeTimer.current = setTimeout(() => { void enviarNomeDoNegocio(nome); }, JANELA_AJUSTES);
  }, [enviarNomeDoNegocio]);

  const alternarCfg = useCallback((chave: D.ChaveCfg) => {
    /* Lê do estado dentro do updater, e não da closure, porque duas batidas rápidas no
     * mesmo toggle precisam ver a primeira já aplicada — senão a segunda manda o mesmo
     * valor e o switch fica preso. */
    setAjustes((a) => {
      if (!ajustesAntes.current) ajustesAntes.current = a;
      const valor = !a.cfg[chave];
      ajustesPendentes.current.cfg = { ...ajustesPendentes.current.cfg, [chave]: valor };
      if (ajustesTimer.current) clearTimeout(ajustesTimer.current);
      ajustesTimer.current = setTimeout(() => { void enviarAjustes(); }, JANELA_AJUSTES);
      return { ...a, cfg: { ...a.cfg, [chave]: valor } };
    });
  }, [enviarAjustes]);

  /**
   * O botão "Salvar" da tela de ajustes.
   *
   * Antes ele só acendia um "salvo" por 2,2s — não gravava nada, porque não havia onde
   * gravar. Agora ele FORÇA o envio do que estiver pendente, em vez de esperar a janela
   * de debounce fechar. Quem clica em salvar quer certeza agora; e o "salvo" passou a
   * ser aceso pela resposta do servidor, dentro de `enviarAjustes`, não por um timer.
   *
   * Sem nada pendente, `enviarAjustes` devolve na hora e o indicador não acende — o que
   * está certo: não houve o que salvar.
   */
  const salvar = useCallback(() => {
    if (ajustesTimer.current) clearTimeout(ajustesTimer.current);
    void enviarAjustes();
  }, [enviarAjustes]);

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
        `/api/google/evento?eventoId=${encodeURIComponent(ag.eventId)}&pid=${encodeURIComponent(ag.profissionalId)}`,
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

  /* `pidAgenda` pode ser "" na primeira passada, antes de `/api/cadastro` responder. Sem a
   * guarda, uma conexão com `profissionalId` vazio (que não existe, mas o `some` não sabe)
   * daria falso positivo e a tela anunciaria "conectado" com o cadastro ainda em branco. */
  const conectado = !!pidAgenda && google.conexoes.some((c) => c.profissionalId === pidAgenda);

  const lerAgenda = useCallback(async (de: string, ate: string) => {
    /* Sem agenda resolvida não há o que pedir. Acontece na primeira passada (o cadastro
     * ainda não voltou) e num negócio sem profissional ativo. Antes isto era impossível de
     * acontecer porque `PID_AGENDA` era constante de módulo; agora é. Sem esta linha o GET
     * sairia com `pid=` vazio, o servidor recusaria com `profissional_invalido` e a tela
     * mostraria erro de agenda para uma condição que se resolve sozinha em milissegundos. */
    if (!pidAgenda) return;

    const chave = `${de}..${ate}`;
    if (leituraEmVoo.current === chave) return;
    leituraEmVoo.current = chave;
    setAgendaGoogle((a) => ({ ...a, status: "carregando" }));

    try {
      const r = await fetch(`/api/google/agenda?pid=${pidAgenda}&de=${de}&ate=${ate}`).then((x) => x.json());

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
            eventId: String(e.eventoId), data: e.data, inicio: e.inicio, fim: e.fim,
            duracao: e.duracao, recorrente: !!e.recorrente,
            meetLink: e.meetLink ?? undefined, htmlLink: e.htmlLink ?? undefined,
          };
          if (e.maisa) {
            novosAtend.push({
              ...base,
              profissionalId: e.maisa.profissionalId || pidAgenda,
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
    /* `pidAgenda` É dependência, e esquecê-la seria o bug mais caro desta mudança: ela
     * começa vazia e só ganha valor quando `/api/cadastro` responde. Um callback preso ao
     * primeiro render capturaria `""` para sempre, o `if (!pidAgenda) return` acima
     * devolveria toda chamada, e a agenda NUNCA carregaria — sem erro, sem request, sem
     * nada no console. Quando era `const PID_AGENDA` de módulo isso não existia. */
  }, [lerStatusGoogle, agendar, pidAgenda]);

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
    const cl = clienteDe(r.clienteId);
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
          ...prev.filter((e) => e.eventId !== resp.eventoId),
          {
            eventId: String(resp.eventoId),
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
  }, [rascunho, servicoDe, lerStatusGoogle, clienteDe]);

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
    conversas, conversaDe, conversasErro, conversasCarregadas, recarregarConversas,
    convSel, selecionarConversa, abaConv, setAbaConv, threadDe, threadCarregando,
    enviar, enviando, assumir, devolver,
    cadastro, cadastroErro, cadastroCarregado,
    profissionalDe, clienteDe, servicoDoCadastro, nomeDoProfissional, nomeDoCliente,
    pidAgenda, atendeNoDia, podeComecarEm,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    servicos, servicoDe, nomeServico, editarServico, criarServico, excluirServico,
    filtroSvc, setFiltroSvc, filtroCli, setFiltroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento, emitiveis,
    loteAberto, pedirLote, fecharLote, confirmarLote,
    secAtiva, abrirSecao,
    assistente: ajustes.assistente, setAssistente, ajustesErro, ajustesCarregados, setNomeDoNegocio,
    faqs, faqsErro, faqsOcupado, salvarFaq, removerFaq,
    canal, canalErro, canalOcupado, canalFaltando, qrcode, conectarCanal, desconectarCanal, trocarNumero,
    semana, semanaErro, semanaCarregada, alternarDia, setHorario,
    cfg: ajustes.cfg, alternarCfg,
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
    conversas, conversaDe, conversasErro, conversasCarregadas, recarregarConversas,
    convSel, selecionarConversa, abaConv, threadDe, threadCarregando,
    enviar, enviando, assumir, devolver,
    cadastro, cadastroErro, cadastroCarregado,
    profissionalDe, clienteDe, servicoDoCadastro, nomeDoProfissional, nomeDoCliente,
    pidAgenda, atendeNoDia, podeComecarEm,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    servicos, servicoDe, nomeServico, editarServico, criarServico, excluirServico,
    filtroSvc, filtroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento, emitiveis,
    loteAberto, pedirLote, fecharLote, confirmarLote,
    secAtiva, abrirSecao,
    ajustes.assistente, setAssistente, ajustesErro, ajustesCarregados, setNomeDoNegocio,
    faqs, faqsErro, faqsOcupado, salvarFaq, removerFaq,
    canal, canalErro, canalOcupado, canalFaltando, qrcode, conectarCanal, desconectarCanal, trocarNumero,
    semana, semanaErro, semanaCarregada, alternarDia, setHorario,
    ajustes.cfg, alternarCfg,
    salvo, salvar,
    diaSel, rascunho, rascunhoEstado, novoAgendamento, editarRascunho, confirmarRascunho, descartarRascunho,
    google, googleDe, conectarGoogle, desconectarGoogle, googleOcupado,
    bloqueiosDoDia, bloqueioPorId, agendaGoogle, recarregarAgenda,
    railAberto,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

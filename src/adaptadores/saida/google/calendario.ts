// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar v3 — listar, criar, remarcar e cancelar evento (com Google Meet).
// ⚠️ SÓ SERVIDOR.
// ─────────────────────────────────────────────────────────────────────────────

import { PrecisaReconectar, LimiteDoProvedor, FalhaDoProvedor } from "@/nucleo/dominio/erros";
import type { EventoCriado, EventoDeAgenda } from "@/nucleo/dominio/agenda";
import { TZ, civilSP, instanteISO } from "@/nucleo/dominio/tempo";

const BASE = "https://www.googleapis.com/calendar/v3";

/** Sempre a agenda principal de quem autorizou. */
const CALENDARIO = "primary";

type Params = {
  token: string;
  /** ISO com offset, ex.: "2026-08-07T14:30:00-03:00". */
  inicio: string;
  fim: string;
  titulo: string;
  descricao?: string;
  /** Convidados. Só entram e-mails de verdade — ver comentário em `convidados`. */
  emails?: string[];
  /** Gera link do Meet. */
  comMeet?: boolean;
  /** Chave estável para o createRequest — ver comentário em `criar`. */
  chave: string;
  /** Marcas da MAISA, gravadas em `extendedProperties.private`. Ver PROPS. */
  props?: Record<string, string>;
};

/**
 * As marcas que fazem um evento do Google ser reconhecido como atendimento da MAISA.
 *
 * ⚠️ **`private`, nunca `shared`.** `shared` é copiado para a agenda de todo convidado —
 * o id interno do cliente e o do serviço iriam parar no calendário de terceiros. `private`
 * fica só na cópia de quem é dono da agenda, que é o próprio negócio.
 *
 * Os campos com `N` no fim são CÓPIAS DESNORMALIZADAS do nome, e existem por um motivo
 * concreto: um serviço criado pelo usuário mora só no localStorage. Abrir o app noutro
 * navegador — ou limpar este — deixaria `maisaSvc` apontando para um id que não resolve, e
 * o atendimento não renderizaria. Com a cópia ele renderiza com o nome certo e só perde a
 * ligação com o catálogo. Mesma razão para o telefone e o valor: são o que a gaveta mostra.
 *
 * O HORÁRIO não está aqui de propósito. Ele mora em `start`/`end` e só lá — duplicar
 * criaria duas verdades que divergem no instante em que alguém arrasta o evento no
 * próprio Google Calendar.
 */
export const PROPS = {
  /** "1" — a marca. Sem ela, o evento é compromisso pessoal e vira bloqueio cinza. */
  marca: "maisa",
  /** uuid cunhado pelo cliente ANTES do POST. É a chave de idempotência. */
  ag: "maisaAg",
  pro: "maisaPro",
  cli: "maisaCli",
  cliNome: "maisaCliN",
  cliTel: "maisaCliT",
  svc: "maisaSvc",
  svcNome: "maisaSvcN",
  svcDur: "maisaDur",
  svcVal: "maisaVal",
} as const;

/* ───────────────────────────── HTTP ───────────────────────────── */

async function chamar(token: string, caminho: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (r.status === 401) throw new PrecisaReconectar("O Google recusou o acesso. Conecte a agenda de novo.");
  return r;
}

/** Erro legível a partir do corpo de erro do Google. */
async function erroDe(r: Response, quando: string): Promise<Error> {
  const d = await r.json().catch(() => ({} as any));
  const msg = d?.error?.message ?? `HTTP ${r.status}`;
  if (r.status === 429) return new LimiteDoProvedor();
  if (r.status === 403) {
    // 403 no Calendar é ambíguo: pode ser falta de escopo (definitivo, precisa reconectar)
    // ou cota (transitório). Só o `reason` de dentro do corpo separa os dois — pelo código
    // HTTP os dois são iguais, e tratá-los igual significa ou desistir cedo demais ou
    // insistir para sempre.
    const razao = String(d?.error?.errors?.[0]?.reason ?? "");
    if (/rateLimitExceeded|userRateLimitExceeded|quotaExceeded/i.test(razao)) return new LimiteDoProvedor();
    return new FalhaDoProvedor(`Sem permissão no Google Calendar (${msg}).`);
  }
  return new FalhaDoProvedor(`${quando}: ${msg}`);
}

/* ───────────────────────────── Meet ───────────────────────────── */

/**
 * Extrai a URL do Meet da resposta.
 *
 * Duas fontes, nessa ordem: `hangoutLink` (campo de topo, o mais direto) e, se
 * faltar, o entryPoint de vídeo. E NUNCA por índice fixo: `entryPoints[0]` pode ser
 * um telefone ou um "more", não o vídeo — o BIP tem um comentário explícito dizendo
 * que já apanhou disso.
 */
function meetDe(ev: any): string | undefined {
  if (typeof ev?.hangoutLink === "string" && ev.hangoutLink) return ev.hangoutLink;
  const pontos = ev?.conferenceData?.entryPoints;
  if (!Array.isArray(pontos)) return undefined;
  return pontos.find((p: any) => p?.entryPointType === "video")?.uri;
}

/** O Google às vezes devolve a conferência ainda "pending" — só o statusCode diz. */
const meetPendente = (ev: any) => ev?.conferenceData?.createRequest?.status?.statusCode === "pending";

/* ───────────────────────────── listar ─────────────────────────────
 * A leitura que transforma a Agenda do app numa vista da agenda REAL. */

/** Teto de páginas. Um mês numa agenda humana não passa de uma; o laço existe para
 *  não travar caso passe, e o teto existe para um bug do outro lado não virar laço
 *  infinito consumindo cota. */
const MAX_PAGINAS = 10;

/**
 * Os eventos de uma janela de datas, prontos para a grade.
 *
 * `singleEvents=true` é o que faz uma reunião semanal virar uma ocorrência por semana
 * em vez de um único registro com regra de recorrência que teríamos que interpretar
 * aqui. Com ele, `orderBy=startTime` passa a ser aceito.
 */
export async function listar(p: { token: string; de: string; ate: string }): Promise<EventoDeAgenda[]> {
  const out: EventoDeAgenda[] = [];
  let pagina: string | undefined;

  for (let i = 0; i < MAX_PAGINAS; i++) {
    const q = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      timeMin: instanteISO(p.de, 0),
      // O fim do último dia, inclusive. `timeMax` é exclusivo no Google, então usamos
      // a meia-noite do dia SEGUINTE em vez de 23:59 — senão um evento marcado para
      // 23:59 do último dia da janela sumiria sem deixar rastro.
      timeMax: instanteISO(proximoDia(p.ate), 0),
      // Sem isto o Google devolve os horários no fuso padrão da AGENDA, que não é
      // necessariamente o nosso. `civilSP` corrige de qualquer forma, mas pedir o fuso
      // certo evita depender disso.
      timeZone: TZ,
      ...(pagina ? { pageToken: pagina } : {}),
    });

    const r = await chamar(p.token, `/calendars/${CALENDARIO}/events?${q}`);
    if (!r.ok) throw await erroDe(r, "Não foi possível ler a agenda");
    const d = await r.json();

    for (const ev of d.items ?? []) {
      const lido = traduzir(ev);
      if (lido) out.push(lido);
    }

    pagina = d.nextPageToken;
    if (!pagina) break;
  }

  return out;
}

const proximoDia = (data: string) =>
  new Date(new Date(`${data}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);

/**
 * Um item da resposta vira `EventoDeAgenda` — ou `null`, e cada `null` tem um motivo.
 *
 * `cancelled`: com `singleEvents` o Google inclui ocorrências canceladas de séries
 * recorrentes. Pintá-las seria mostrar compromisso que não existe mais.
 *
 * `workingLocation`: o marcador "trabalhando de casa". É um evento de dia inteiro que a
 * própria UI do Google não desenha na grade; aqui viraria um bloqueio falso todo dia útil.
 *
 * Recusado por você: se você respondeu "não vou", o horário está livre — bloquear a
 * agenda por causa dele faria a MAISA recusar um cliente por um compromisso declinado.
 *
 * Dia inteiro: fica de fora da GRADE nesta fatia, e é a omissão mais visível. Um "Férias"
 * mapeado para hora 0 renderizaria com `top` negativo e altura de 24h, cobrindo a coluna
 * inteira e cascateando o escalonamento de todos os outros blocos. Uma faixa própria no
 * topo é o lugar certo, e é trabalho de outra fatia.
 */
function traduzir(ev: any): EventoDeAgenda | null {
  if (ev?.status === "cancelled") return null;
  if (ev?.eventType === "workingLocation") return null;
  if (!ev?.start?.dateTime || !ev?.end?.dateTime) return null;
  if ((ev.attendees ?? []).some((a: any) => a?.self && a?.responseStatus === "declined")) return null;

  const ini = civilSP(ev.start.dateTime);
  const fim = civilSP(ev.end.dateTime);
  if (!ini || !fim) return null;

  // Um evento que atravessa a meia-noite não cabe numa coluna de um dia. Cortamos no
  // fim do dia de início em vez de descartar: o horário está de fato ocupado, e sumir
  // com ele afirmaria que a noite está livre.
  const fimNoDia = fim.data === ini.data ? fim.hora : 24;

  const priv = (ev?.extendedProperties?.private ?? {}) as Record<string, string>;
  const texto = (k: string, padrao = "") => String(priv[k] ?? "").trim() || padrao;
  // Exige a marca E o uuid: um evento com `maisa:"1"` mas sem `maisaAg` não teria como ser
  // reconhecido numa retentativa, e é mais seguro tratá-lo como compromisso comum do que
  // como atendimento meio identificado.
  const maisa = priv[PROPS.marca] === "1" && priv[PROPS.ag]
    ? {
      ag: texto(PROPS.ag),
      profissionalId: texto(PROPS.pro),
      clienteId: texto(PROPS.cli),
      clienteNome: texto(PROPS.cliNome, "Cliente"),
      clienteTel: texto(PROPS.cliTel),
      servicoId: texto(PROPS.svc),
      servicoNome: texto(PROPS.svcNome, "Atendimento"),
      servicoValor: Number(priv[PROPS.svcVal]) || 0,
    }
    : undefined;

  return {
    eventoId: String(ev.id),
    data: ini.data,
    inicio: ini.hora,
    fim: fimNoDia,
    duracao: Math.max(Math.round((fimNoDia - ini.hora) * 60), 15),
    // Evento sem título existe e é comum. "(sem título)" é o que o próprio Google mostra.
    titulo: String(ev.summary ?? "").trim() || "(sem título)",
    meetLink: meetDe(ev),
    htmlLink: ev.htmlLink,
    recorrente: Boolean(ev.recurringEventId),
    maisa,
    // `!a.self`: a resposta que interessa é a de QUEM FOI CONVIDADO, não a sua. A sua já foi
    // usada lá em cima para descartar o que você recusou.
    aguardandoResposta: (ev.attendees ?? []).some(
      (a: any) => !a?.self && (a?.responseStatus === "needsAction" || a?.responseStatus === "tentative"),
    ),
  };
}

/**
 * O evento que carrega esta marca privada, se já existir.
 *
 * É a metade do servidor da criação idempotente. O `requestId` do Meet que já usávamos
 * dedupla a CONFERÊNCIA, nunca o evento: um POST que chegou ao Google, criou o evento e
 * perdeu a resposta na volta viraria um segundo evento na próxima tentativa — dois blocos
 * às 14h para o mesmo cliente, e nada na tela explicando de onde saiu o segundo.
 *
 * A janela de ±2 dias em torno do instante é só para o Google não varrer a agenda inteira.
 * Não há risco de errar por pouco: o instante é recalculado aqui a partir dos mesmos
 * `data`+`inicio` que a criação usaria.
 */
export async function buscarPorProp(p: {
  token: string; chave: string; valor: string; perto: string;
}): Promise<EventoDeAgenda | null> {
  const ms = Date.parse(p.perto);
  if (!Number.isFinite(ms)) return null;
  const desloca = (dias: number) => new Date(ms + dias * 86_400_000).toISOString();

  const q = new URLSearchParams({
    privateExtendedProperty: `${p.chave}=${p.valor}`,
    singleEvents: "true",
    showDeleted: "false",
    maxResults: "2",
    timeMin: desloca(-2),
    timeMax: desloca(2),
    timeZone: TZ,
  });

  const r = await chamar(p.token, `/calendars/${CALENDARIO}/events?${q}`);
  if (!r.ok) throw await erroDe(r, "Não foi possível conferir se o atendimento já existe");
  const d = await r.json();
  for (const ev of d.items ?? []) {
    const lido = traduzir(ev);
    if (lido) return lido;
  }
  return null;
}

/* ───────────────────────────── operações ───────────────────────────── */

export async function criar(p: Params): Promise<EventoCriado> {
  const corpo: Record<string, unknown> = {
    summary: p.titulo,
    // Mandamos o fuso junto do horário, em vez de converter tudo para UTC como o
    // BIP faz. Com "timeZone" o Google sabe que o evento é às 14:30 em São Paulo —
    // quem abrir a agenda em outro fuso vê o horário convertido corretamente, e um
    // eventual horário de verão passa a ser problema do Google, não nosso.
    start: { dateTime: p.inicio, timeZone: TZ },
    end: { dateTime: p.fim, timeZone: TZ },
  };
  if (p.descricao) corpo.description = p.descricao;
  // PRIVATE. Ver o comentário de PROPS: `shared` viajaria para a agenda dos convidados.
  if (p.props) corpo.extendedProperties = { private: p.props };

  const emails = convidados(p.emails);
  if (emails.length) corpo.attendees = emails.map((email) => ({ email }));

  if (p.comMeet) {
    corpo.conferenceData = {
      createRequest: {
        // Chave ESTÁVEL (derivada do agendamento), não um uuid novo a cada tentativa.
        // O Google trata createRequest.requestId como idempotente: se a mesma chamada
        // for repetida — retry de rede, duplo clique —, ele devolve a MESMA conferência
        // em vez de criar outra. O BIP sorteia um uuid4 aqui e perde essa proteção.
        requestId: p.chave,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const q = new URLSearchParams({
    // Obrigatório para o conferenceData valer alguma coisa. Sem isso o Google
    // ignora o bloco EM SILÊNCIO e o evento nasce sem Meet.
    ...(p.comMeet ? { conferenceDataVersion: "1" } : {}),
    // Só manda convite por e-mail se houver alguém para convidar.
    sendUpdates: emails.length ? "all" : "none",
  });

  const r = await chamar(p.token, `/calendars/${CALENDARIO}/events?${q}`, {
    method: "POST",
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw await erroDe(r, "Não foi possível criar o evento");

  let ev = await r.json();

  // Conferência ainda sendo criada: relemos uma vez antes de desistir do link. O BIP
  // não faz isso — se o link não veio na resposta do insert, ele grava NULL e segue.
  if (p.comMeet && !meetDe(ev) && meetPendente(ev)) {
    const r2 = await chamar(p.token, `/calendars/${CALENDARIO}/events/${encodeURIComponent(ev.id)}`);
    if (r2.ok) ev = await r2.json();
  }

  return { eventoId: ev.id, meetLink: meetDe(ev), htmlLink: ev.htmlLink };
}

/** Remarcar. `patch` (e não `update`) para preservar o Meet e os convidados. */
export async function remarcar(p: { token: string; eventId: string; inicio: string; fim: string }): Promise<void> {
  const r = await chamar(p.token, `/calendars/${CALENDARIO}/events/${encodeURIComponent(p.eventId)}?sendUpdates=all`, {
    method: "PATCH",
    body: JSON.stringify({
      start: { dateTime: p.inicio, timeZone: TZ },
      end: { dateTime: p.fim, timeZone: TZ },
    }),
  });
  if (!r.ok && r.status !== 404 && r.status !== 410) throw await erroDe(r, "Não foi possível remarcar no Google");
}

/**
 * Cancelar. 404/410 contam como sucesso: significa que o evento já não está lá
 * (apagado à mão na agenda), e o que queríamos era exatamente que ele não estivesse.
 */
export async function cancelar(p: { token: string; eventId: string }): Promise<void> {
  const r = await chamar(p.token, `/calendars/${CALENDARIO}/events/${encodeURIComponent(p.eventId)}?sendUpdates=all`, {
    method: "DELETE",
  });
  if (!r.ok && r.status !== 404 && r.status !== 410) throw await erroDe(r, "Não foi possível cancelar no Google");
}

/* ───────────────────────────── convidados ───────────────────────────── */

/**
 * Normaliza a lista de convidados. Só valida formato e tira repetidos —
 * deliberadamente NÃO tenta adivinhar quais endereços são "de mentira".
 *
 * Por que não adivinhar: a primeira versão desta função tinha uma blocklist de
 * domínios (exemplo.com, teste.com…) para não convidar os clientes fictícios do
 * protótipo. Ela estava errada — os clientes de adaptadores/saida/demo usavam `@email.com`,
 * que é um domínio REAL, de um provedor real. O filtro deixaria passar, e o Google
 * mandaria convite de verdade para a caixa de entrada de estranhos. (Os fixtures
 * hoje apontam para o e-mail do dono do projeto, mas isso é uma escolha do DADO —
 * não algo que esta função deva tentar inferir.)
 *
 * A lição é que "parece falso" não é decidível por regex. Então a decisão de
 * convidar alguém é EXPLÍCITA de quem chama (ver `convidarCliente` na rota), e o
 * padrão é não convidar ninguém. O cliente recebe o link pelo WhatsApp, que é o
 * ponto da funcionalidade; o convite por e-mail é o extra opcional.
 */
function convidados(lista?: string[]): string[] {
  return (lista ?? [])
    .map((e) => (e ?? "").trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    .filter((e, i, a) => a.indexOf(e) === i);
}

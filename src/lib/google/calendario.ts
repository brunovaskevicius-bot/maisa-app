// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar v3 — criar, remarcar e cancelar evento (com Google Meet).
// ⚠️ SÓ SERVIDOR.
// ─────────────────────────────────────────────────────────────────────────────

import { PrecisaReconectar } from "./oauth";
import { TZ } from "./datas";

const BASE = "https://www.googleapis.com/calendar/v3";

/** Sempre a agenda principal de quem autorizou. */
const CALENDARIO = "primary";

export type Evento = {
  eventId: string;
  /** URL do Meet. Ausente quando o Google ainda não terminou de criar a conferência. */
  meetLink?: string;
  htmlLink?: string;
};

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
};

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
  if (r.status === 403) return new Error(`Sem permissão no Google Calendar (${msg}).`);
  if (r.status === 429) return new Error("O Google está limitando as requisições. Tente de novo em instantes.");
  return new Error(`${quando}: ${msg}`);
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

/* ───────────────────────────── operações ───────────────────────────── */

export async function criar(p: Params): Promise<Evento> {
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

  return { eventId: ev.id, meetLink: meetDe(ev), htmlLink: ev.htmlLink };
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
 * protótipo. Ela estava errada — os clientes de src/lib/data.ts usavam `@email.com`,
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

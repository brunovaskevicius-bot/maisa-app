// ─────────────────────────────────────────────────────────────────────────────
// Do calendário do protótipo para uma data REAL.
//
// O problema: a Agenda é um julho/2026 fixo (D.MES_AGENDA), com hora em decimal
// (14.5 = 14:30). O Google Calendar quer um instante de verdade. E julho/2026 já
// passou — criar o evento na data literal o enterraria no passado da agenda de
// quem está testando, sem servir para demo nem para testar o Meet.
//
// A solução: deslocar por SEMANAS INTEIRAS até cair em hoje ou depois. Somar
// múltiplo de 7 preserva o dia da semana, e o dia da semana é estrutural aqui —
// a grade é seg–sáb, cada profissional tem folga em dias fixos (D.EXPEDIENTE) e
// domingo é fechado. Deslocar por dias corridos embaralharia tudo isso; deslocar
// por semanas mantém "sexta 17" como uma sexta.
//
// Este módulo é PURO e client-safe de propósito: a gaveta mostra a data real
// antes de criar o evento, então cliente e servidor precisam calcular igual.
// ─────────────────────────────────────────────────────────────────────────────

import * as D from "../data";

/** Brasil não usa mais horário de verão desde 2019, então o offset é fixo. */
const FUSO = "-03:00";
const OFFSET_MIN = -180;
const DIA_MS = 86_400_000;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Índice do mês do protótipo (0 = janeiro), derivado do nome em D.MES_AGENDA.
 *  Falha alto e cedo: com indexOf() devolvendo -1, todas as datas silenciosamente
 *  escorregariam um mês para trás, e o sintoma apareceria só no evento criado. */
const MES_INDICE = (() => {
  const i = MESES.indexOf(D.MES_AGENDA.nome);
  if (i < 0) throw new Error(`MES_AGENDA.nome ("${D.MES_AGENDA.nome}") não é um mês conhecido.`);
  return i;
})();

export const TZ = "America/Sao_Paulo";

/**
 * "Hoje" em São Paulo como {ano, mes, dia}, independente do fuso de quem roda o
 * código — o navegador está em BRT, a Vercel em UTC. Deslocamos o instante pelo
 * offset e lemos com os getters UTC: assim os dois chegam ao mesmo dia civil.
 */
function hojeSP(agora: number) {
  const t = new Date(agora + OFFSET_MIN * 60_000);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

/** Quantas semanas o calendário do protótipo precisa andar para não cair no passado. */
export function semanasDeslocadas(agora = Date.now()): number {
  // Ancora no primeiro dia do mês do protótipo: o deslocamento é do MÊS, não de cada
  // dia. Se fosse por dia, dias diferentes ganhariam deslocamentos diferentes e a
  // semana da tela deixaria de ser uma semana no Google.
  const primeiro = Date.UTC(D.MES_AGENDA.ano, MES_INDICE, 1);
  const hoje = hojeSP(agora);
  if (primeiro >= hoje) return 0;
  return Math.ceil((hoje - primeiro) / (7 * DIA_MS));
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** Data real (ano/mês/dia já deslocados) correspondente a um dia do protótipo. */
export function diaReal(dia: number, agora = Date.now()): Date {
  const base = Date.UTC(D.MES_AGENDA.ano, MES_INDICE, dia);
  return new Date(base + semanasDeslocadas(agora) * 7 * DIA_MS);
}

/**
 * Instante ISO com offset explícito de São Paulo — ex.: "2026-08-07T14:30:00-03:00".
 * Montado como string em vez de via Date.toISOString() de propósito: assim o horário
 * é exatamente o que está escrito na tela, sem depender do fuso do processo.
 */
export function instanteISO(dia: number, horaDecimal: number, agora = Date.now()): string {
  const d = diaReal(dia, agora);
  const h = Math.floor(horaDecimal);
  const m = Math.round((horaDecimal - h) * 60);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(h)}:${p2(m)}:00${FUSO}`;
}

/** "sexta, 7 de agosto" — PREVISÃO, para a gaveta mostrar antes de criar o evento. */
export function rotuloReal(dia: number, agora = Date.now()): string {
  return rotulo(diaReal(dia, agora));
}

/**
 * Rótulo a partir do instante que foi REALMENTE usado no evento.
 *
 * Existe porque `rotuloReal` é uma previsão que se move: `semanasDeslocadas` depende
 * de `Date.now()`, então uma vez por semana ela salta 7 dias. Um evento criado em 21
 * de agosto passaria a ser exibido — e anunciado ao cliente no WhatsApp — como 28 de
 * agosto, com um link do Meet que funciona e uma data que não. Depois de criado, a
 * verdade é o ISO gravado, nunca mais o cálculo.
 *
 * Lê os campos do próprio texto ("2026-08-21T14:30:00-03:00") em vez de usar
 * `new Date()`, para o rótulo não escorregar conforme o fuso de quem renderiza.
 */
export function rotuloDeISO(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "data indisponível";
  const [, a, mes, d] = m;
  return rotulo(new Date(Date.UTC(Number(a), Number(mes) - 1, Number(d))));
}

function rotulo(d: Date): string {
  // getUTCDay(): 0 = domingo. D.DOW_LONGO começa na segunda.
  const dow = D.DOW_LONGO[(d.getUTCDay() + 6) % 7];
  return `${dow}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** "14:30" a partir do ISO gravado — mesma razão de rotuloDeISO. */
export function horaDeISO(iso: string): string {
  return /T(\d{2}:\d{2})/.exec(iso ?? "")?.[1] ?? "--:--";
}

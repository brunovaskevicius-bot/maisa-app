// ─────────────────────────────────────────────────────────────────────────────
// A fronteira entre a DATA CIVIL do app e o INSTANTE do Google.
//
// O app fala em data civil ("2026-08-06") mais hora decimal (14.5). O Google fala
// em instante com fuso ("2026-08-06T14:30:00-03:00"). Este módulo traduz nos dois
// sentidos, e é o único lugar do código que precisa saber que existe fuso horário.
//
// Este arquivo já foi três vezes maior. Ele guardava um deslocamento por SEMANAS
// INTEIRAS que empurrava o julho/2026 fixo do protótipo para a frente até cair no
// futuro — e junto vinha `rotuloReal`, uma PREVISÃO que se movia sozinha: uma vez
// por semana ela saltava 7 dias, e um evento criado no dia 21 passava a ser
// anunciado ao cliente como dia 28, com um link do Meet que funcionava e uma data
// que não. Nada disso existe mais porque o app passou a usar datas reais.
//
// É PURO e client-safe de propósito: a gaveta mostra a data do evento antes de
// criá-lo, então cliente e servidor precisam calcular igual.
// ─────────────────────────────────────────────────────────────────────────────

import * as D from "../data";

export const TZ = "America/Sao_Paulo";

/** Brasil não usa mais horário de verão desde 2019, então o offset é fixo. */
const FUSO = "-03:00";

const p2 = (n: number) => String(n).padStart(2, "0");

/**
 * Data civil + hora decimal → instante ISO com offset explícito de São Paulo.
 * Ex.: ("2026-08-07", 14.5) → "2026-08-07T14:30:00-03:00".
 *
 * Montado como string, e não via `Date.toISOString()`: assim o horário é exatamente
 * o que está escrito na tela, sem depender do fuso do processo que gerou.
 */
export function instanteISO(data: string, horaDecimal: number): string {
  const h = Math.floor(horaDecimal);
  const m = Math.round((horaDecimal - h) * 60);
  return `${data}T${p2(h)}:${p2(m)}:00${FUSO}`;
}

/**
 * O caminho de volta: instante do Google → data civil e hora decimal de São Paulo.
 *
 * Via `Intl`, e não por regex no texto. O Google devolve o `dateTime` no fuso que
 * quiser — o da agenda, UTC (`…17:30:00Z`), o de quem criou o evento — e ler os
 * dígitos depois do "T" trataria 17:30Z como 17:30, três horas de deslocamento em
 * silêncio. Pedimos `timeZone=America/Sao_Paulo` na listagem, mas isso é um pedido;
 * esta função é a garantia.
 */
const RELOGIO = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

export function civilSP(iso: string): { data: string; hora: number } | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const p: Record<string, string> = {};
  for (const parte of RELOGIO.formatToParts(new Date(ms))) p[parte.type] = parte.value;
  // `% 24` porque com hour12:false o ICU escreve meia-noite como "24" em algumas
  // versões — e "24:00" viraria uma hora decimal fora do dia.
  const hora = (Number(p.hour) % 24) + Number(p.minute) / 60;
  return { data: `${p.year}-${p.month}-${p.day}`, hora };
}

/** "quinta, 6 de agosto" a partir do instante gravado. */
export function rotuloDeISO(iso: string): string {
  const c = civilSP(iso);
  return c ? D.rotuloLongo(c.data) : "data indisponível";
}

/** "14:30" a partir do instante gravado, já em horário de São Paulo. */
export function horaDeISO(iso: string): string {
  const c = civilSP(iso);
  return c ? D.hhmm(c.hora) : "--:--";
}

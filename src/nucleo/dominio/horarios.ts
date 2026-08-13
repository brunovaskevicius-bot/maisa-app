/* ─────────────────────────────────────────────────────────────────────────────
 * HORÁRIO ANUNCIADO — o que a MAISA responde a "que horas vocês atendem?".
 *
 * ⚠️ NÃO É O `Expediente`, e confundir os dois é o erro caro deste arquivo.
 *
 *   `Expediente` (expediente.ts) ... INTERNO, do PROFISSIONAL. Decide se cabe marcar às
 *                                    15h de terça. É o que a agenda consulta.
 *   `HorarioAnunciado` (aqui) ...... EXTERNO, do NEGÓCIO. É a frase que o cliente ouve.
 *                                    Ninguém marca nada com isto.
 *
 * Eles divergem na vida real e é legítimo: a barbearia anuncia "8h às 20h" e o barbeiro
 * que atende às terças entra ao meio-dia. Unificar obrigaria um dos dois a mentir. O
 * comentário de `002_multitenant.sql:848` já dizia isso antes de existir esta porta.
 *
 * ── A CONVENÇÃO DE DIA DA SEMANA ──
 *
 * 0 = segunda … 6 = domingo. É a de `expediente.ts` e a de `dow_maisa()` no banco, e ela
 * NÃO é a do Postgres (`extract(dow)` devolve 0 = domingo). Misturar as duas é o bug que
 * só aparece no domingo — quando o negócio está fechado e ninguém está olhando.
 * ────────────────────────────────────────────────────────────────────────────── */

import { DadoInvalido } from "./erros";

/** Os sete dias, na ordem da convenção. O índice É o `dow`. */
export const DIAS_DA_SEMANA = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
] as const;

export type NomeDeDia = (typeof DIAS_DA_SEMANA)[number];

/**
 * Um dia da semana anunciado.
 *
 * `de`/`ate` são `"HH:MM"` — texto, não hora decimal. O resto do domínio fala decimal
 * (`Expediente.de = 9.5`) porque faz conta com isso; aqui não se faz conta nenhuma, o
 * valor só é lido por uma pessoa e digitado num `<input type="time">`. Converter ida e
 * volta para decimal introduziria arredondamento num dado que nunca precisou dele.
 *
 * Fechado guarda `null` nos dois, e não `"—"`: `null` é o que a coluna aceita, e o traço
 * é decoração de tela. O adaptador de UI que quiser mostrar traço que o desenhe.
 */
export type HorarioAnunciado = {
  dow: number;
  aberto: boolean;
  de: string | null;
  ate: string | null;
};

/** A semana inteira, sempre com sete posições, sempre em ordem de `dow`. */
export type SemanaAnunciada = HorarioAnunciado[];

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `"09:30"` → 570. Só para comparar abertura com fechamento — não sai daqui. */
const emMinutos = (h: string): number => {
  const [hh, mm] = h.split(":");
  return Number(hh) * 60 + Number(mm);
};

export const ehHora = (v: unknown): v is string => typeof v === "string" && HORA.test(v);

/**
 * Valida UM dia e devolve a forma canônica.
 *
 * Fechado zera as horas em vez de preservá-las. É uma perda de informação consciente: a
 * alternativa é guardar "fechado, das 9 às 18", e a primeira pessoa a ler a linha crua
 * no banco não sabe dizer se o negócio abre. Ao reabrir pela tela, a UI repõe um padrão.
 */
export function normalizarDia(d: unknown, dow: number): HorarioAnunciado {
  const o = (d ?? {}) as Partial<HorarioAnunciado>;

  if (typeof o.aberto !== "boolean") {
    throw new DadoInvalido(`O dia ${DIAS_DA_SEMANA[dow]} precisa dizer se abre.`, "aberto");
  }
  if (!o.aberto) return { dow, aberto: false, de: null, ate: null };

  if (!ehHora(o.de) || !ehHora(o.ate)) {
    throw new DadoInvalido(`${DIAS_DA_SEMANA[dow]}: use o formato HH:MM, entre 00:00 e 23:59.`, "hora");
  }
  /* Fechar antes de abrir não é digitação criativa — é o dono tentando anunciar um
   * horário que atravessa a meia-noite. O produto não sabe representar isso hoje, e
   * aceitar em silêncio faria a MAISA anunciar "das 20h às 2h" como "das 20h às 2h do
   * mesmo dia", que é um negócio fechado. */
  if (emMinutos(o.ate) <= emMinutos(o.de)) {
    throw new DadoInvalido(`${DIAS_DA_SEMANA[dow]}: o fechamento tem que ser depois da abertura.`, "hora");
  }

  return { dow, aberto: true, de: o.de, ate: o.ate };
}

/**
 * A semana em UMA frase, para o prompt do agente.
 *
 * Agrupa dias seguidos com o mesmo horário: "Seg–Sex 08:00–20:00 · Sáb 09:00–13:00 ·
 * Dom fechado". Sete linhas soltas no prompt custam token toda mensagem e são mais
 * difíceis de o modelo resumir de volta em fala natural — que é exatamente o que ele
 * precisa fazer quando alguém pergunta "vocês abrem sábado?".
 */
export function semanaEmTexto(semana: SemanaAnunciada): string {
  if (!semana.length) return "horário não cadastrado";

  const chave = (d: HorarioAnunciado) => (d.aberto ? `${d.de}–${d.ate}` : "fechado");
  const curto = (dow: number) => DIAS_DA_SEMANA[dow].slice(0, 3);

  const blocos: { primeiro: number; ultimo: number; texto: string }[] = [];
  for (const dia of [...semana].sort((a, b) => a.dow - b.dow)) {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.texto === chave(dia) && ultimo.ultimo === dia.dow - 1) ultimo.ultimo = dia.dow;
    else blocos.push({ primeiro: dia.dow, ultimo: dia.dow, texto: chave(dia) });
  }

  return blocos
    .map((b) => {
      const dias = b.primeiro === b.ultimo ? curto(b.primeiro) : `${curto(b.primeiro)}–${curto(b.ultimo)}`;
      return `${dias} ${b.texto}`;
    })
    .join(" · ");
}

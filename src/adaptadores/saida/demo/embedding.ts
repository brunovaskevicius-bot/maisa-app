/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `GeradorDeEmbedding` sem provedor, sem rede, sem chave.
 *
 * Existe para que o modo demo continue inteiro: `curl` no `/laboratorio` afina a MAISA
 * numa máquina sem `GEMINI_API_KEY`, e uma porta que só o provedor real responde mataria
 * isso em silêncio — o sintoma seria a MAISA parando de responder dúvida, sem erro.
 *
 * ── O QUE ELE É, HONESTAMENTE ──
 *
 * Um saco de palavras projetado em `DIMENSOES_DO_VETOR` posições por hash. Duas frases que
 * compartilham palavras ficam próximas; duas que não, ficam longe. NÃO é semântica: aqui
 * "horário" e "que horas" NÃO se encontram, porque não dividem nenhuma palavra — e é
 * exatamente essa diferença que justifica o provedor de verdade em produção.
 *
 * Está escrito porque a tentação é ler o resultado do demo como se fosse o do Gemini. Se
 * uma busca funciona aqui e falha lá (ou o contrário), a causa provável é esta, não o
 * corte de similaridade.
 *
 * ── DETERMINÍSTICO DE PROPÓSITO ──
 * O mesmo texto dá sempre o mesmo vetor, sem estado e sem relógio. É o que torna o demo
 * testável: um teste que afirma "esta pergunta acha esta FAQ" continua valendo amanhã.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { GeradorDeEmbedding } from "@/nucleo/portas/saida/gerador-de-embedding";
import { DIMENSOES_DO_VETOR, normalizarVetor } from "@/nucleo/dominio/faq";

/** Minúsculas, sem acento, só palavra. `"Horários!"` e `"horarios"` viram a mesma coisa —
 *  sem isto o demo erraria por acento, que não é o tipo de erro que ele deve ensinar. */
function palavras(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2);
}

/** FNV-1a de 32 bits. Escolhido por ser curto e estável entre execuções — `String.hashCode`
 *  não existe em JS e `Math.random` mataria o determinismo que é o ponto deste arquivo. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const embeddingDemo: GeradorDeEmbedding = {
  async embutir(texto: string): Promise<number[]> {
    const v = new Array<number>(DIMENSOES_DO_VETOR).fill(0);
    for (const p of palavras(texto)) {
      const h = hash(p);
      /* Duas posições por palavra, uma com sinal invertido: reduz a chance de duas
       * palavras diferentes caírem exatamente uma sobre a outra e se cancelarem. */
      v[h % DIMENSOES_DO_VETOR] += 1;
      v[(h >>> 16) % DIMENSOES_DO_VETOR] -= 0.5;
    }
    return normalizarVetor(v);
  },
};

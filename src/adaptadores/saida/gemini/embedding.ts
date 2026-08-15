/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `GeradorDeEmbedding` pelo Gemini. ⚠️ SÓ SERVIDOR.
 *
 * Texto entra, vetor de 768 posições normalizado sai. Nada mais.
 *
 * ── AS TRÊS COISAS MEDIDAS QUE ESTE ARQUIVO CARREGA ──
 *
 * 1. `outputDimensionality: 768`. O padrão do modelo é 3072, e os índices do pgvector
 *    param em 2000 — com o padrão, o Postgres varre a tabela inteira a cada pergunta. O
 *    porquê completo está no cabeçalho de `supabase/012_faqs_vetorial.sql`.
 *
 * 2. ⚠️ `normalizarVetor` NÃO É PARANOIA. Medido em 15/08/2026 com este endpoint: o vetor
 *    de 3072 volta com norma 1.0000, mas os truncados NÃO — 768 volta com 0.5882. A
 *    similaridade de cosseno sobre vetores de normas diferentes ordena por tamanho junto
 *    com direção, e o resultado é um ranking plausível e errado. Nada quebra; a MAISA só
 *    passa a responder a FAQ errada.
 *
 * 3. `taskType`. O modelo gera vetores diferentes para "isto é uma pergunta de busca" e
 *    "isto é um documento a ser encontrado", e usar o mesmo tipo dos dois lados piora o
 *    casamento. Quem indexa manda `RETRIEVAL_DOCUMENT`; quem pergunta, `RETRIEVAL_QUERY`.
 *    É o único parâmetro deste arquivo que quem chama escolhe.
 *
 * ── O QUE ESTE ADAPTADOR NÃO FAZ ──
 * Não tenta de novo. Um embedding que falha na indexação deixa a FAQ com vetor nulo, e a
 * tela mostra "pendente" — recuperável, visível, sem custo. Um que falha na BUSCA vira
 * "não achei nada", e o agente já sabe responder isso. Retentativa aqui só transformaria
 * um erro barato numa espera cara no meio de uma conversa de WhatsApp.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { GeradorDeEmbedding } from "@/nucleo/portas/saida/gerador-de-embedding";
import { DIMENSOES_DO_VETOR, normalizarVetor } from "@/nucleo/dominio/faq";
import { FalhaDoProvedor, NaoConfigurado } from "@/nucleo/dominio/erros";
import { GEMINI, isGeminiConfigured } from "./config";

/** O modelo de embedding é OUTRO, e não segue `GEMINI.modelo` (que é o de conversa).
 *  Trocar o modelo de conversa não pode reindexar a base inteira sem aviso. */
const MODELO = (process.env.GEMINI_MODELO_EMBEDDING ?? "").trim() || "gemini-embedding-001";

export type TipoDeTarefa = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

async function embutirComTipo(texto: string, tipo: TipoDeTarefa): Promise<number[]> {
  if (!isGeminiConfigured) throw new NaoConfigurado(["GEMINI_API_KEY"]);

  const limpo = texto.replace(/\s+/g, " ").trim();
  /* Texto vazio não tem direção no espaço de sentido. Devolver um vetor de zeros faria a
   * busca "casar" com tudo igualmente mal; recusar aqui deixa o defeito na origem. */
  if (!limpo) throw new FalhaDoProvedor("Gemini", "Texto vazio não gera embedding.");

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), GEMINI.timeoutMs);

  try {
    const r = await fetch(
      `${GEMINI.base}/models/${MODELO}:embedContent?key=${encodeURIComponent(GEMINI.chave)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controle.signal,
        body: JSON.stringify({
          model: `models/${MODELO}`,
          content: { parts: [{ text: limpo }] },
          taskType: tipo,
          outputDimensionality: DIMENSOES_DO_VETOR,
        }),
      },
    );

    if (!r.ok) {
      const corpo = await r.text().catch(() => "");
      throw new FalhaDoProvedor("Gemini", `embedContent respondeu ${r.status}. ${corpo.slice(0, 200)}`);
    }

    const dados: unknown = await r.json();
    const cru = (dados as { embedding?: { values?: unknown } })?.embedding?.values;

    if (!Array.isArray(cru) || cru.length !== DIMENSOES_DO_VETOR) {
      /* Dimensão diferente da esperada é falha ALTA de propósito: o `insert` no Postgres
       * recusaria de qualquer jeito, e um erro aqui diz qual provedor mudou de contrato,
       * em vez de um erro de tipo do banco três camadas adiante. */
      throw new FalhaDoProvedor(
        "Gemini",
        `esperava ${DIMENSOES_DO_VETOR} dimensões e vieram ${Array.isArray(cru) ? cru.length : "nenhuma"}.`,
      );
    }

    return normalizarVetor(cru as number[]);
  } catch (e) {
    if (e instanceof FalhaDoProvedor || e instanceof NaoConfigurado) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new FalhaDoProvedor("Gemini", `embedContent passou de ${GEMINI.timeoutMs}ms.`);
    }
    throw new FalhaDoProvedor("Gemini", e instanceof Error ? e.message : "falha ao gerar embedding.");
  } finally {
    clearTimeout(relogio);
  }
}

/** O que indexa: a FAQ que o dono cadastrou, para ser ENCONTRADA depois. */
export const embeddingGemini: GeradorDeEmbedding = {
  embutir: (texto) => embutirComTipo(texto, "RETRIEVAL_DOCUMENT"),
};

/** O que pergunta: a frase do cliente, PROCURANDO alguma coisa. Os dois lados usam
 *  modelos de tarefa diferentes de propósito — ver o item 3 do cabeçalho. */
export const embeddingDePergunta: GeradorDeEmbedding = {
  embutir: (texto) => embutirComTipo(texto, "RETRIEVAL_QUERY"),
};

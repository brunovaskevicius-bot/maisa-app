/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTE TESTE PRENDE
 *
 * ★ QUE O FATURAMENTO NÃO PROMETA NOTA FISCAL A QUEM NÃO EMITE NOTA FISCAL.
 *
 * Bruno, 25/08/2026: *"O CTA lá em cima ainda esta escrito emitir 14 notas mesmo depois de eu ter
 * escolhido o modo de recibos"*. Quem atende como pessoa física emite Recibo Eletrônico de
 * Serviços de Saúde, dentro do e-CAC — nota fiscal, nunca. O hero, a topbar, a tabela e a gaveta
 * liam o estado das NOTAS (sempre `pendente`, para sempre) em vez do CAMINHO, e as quatro
 * superfícies falavam de um documento que não existe naquele negócio.
 *
 * ⚠️ O caso que quase ninguém escreve é o `carregando`, e é o que este arquivo mais protege:
 * enquanto `/api/fiscal` não responde, a tela não pode chutar "nota fiscal" e corrigir meio
 * segundo depois. Piscar a promessa errada é a mesma mentira, mais curta — e é exatamente o que
 * um `caminho !== "recibo_saude"` solto faria, porque `null !== "recibo_saude"` é `true`.
 *
 * ⚠️ Ambiente `node` importando um `.tsx` — mesma condição do `LoteReceitaSaude.test.ts`: a
 * função é pura e nada do módulo toca DOM na carga.
 * ───────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { vocabulario } from "./Grades";

describe("quem emite nota fiscal ganha os verbos de nota fiscal", () => {
  it("municipal emite nota", () => {
    expect(vocabulario({ status: "ok", caminho: "municipal" })).toEqual({ sabemos: true, emiteNota: true });
  });

  it("ambiente nacional também", () => {
    expect(vocabulario({ status: "ok", caminho: "nacional" }).emiteNota).toBe(true);
  });
});

describe("★ pessoa física não emite nota fiscal em hipótese nenhuma", () => {
  /* O TESTE QUE JUSTIFICA O ARQUIVO. Sem ele, o hero volta a anunciar "14 a emitir" e a topbar
   * volta a oferecer o botão dourado — para uma psicóloga que não tem nota fiscal para emitir. */
  it("recibo_saude não tem verbo de emitir", () => {
    expect(vocabulario({ status: "ok", caminho: "recibo_saude" })).toEqual({ sabemos: true, emiteNota: false });
  });
});

describe("⚠️ enquanto não sabemos, ninguém promete nada", () => {
  /* `null !== "recibo_saude"` é `true` — o jeito ingênuo de escrever isto acende o botão errado
   * durante o carregamento e o apaga depois. Meio segundo de promessa falsa continua sendo uma. */
  it("carregando não emite nota", () => {
    expect(vocabulario({ status: "carregando", caminho: null })).toEqual({ sabemos: false, emiteNota: false });
  });

  it("erro na leitura também não", () => {
    expect(vocabulario({ status: "erro", caminho: null }).emiteNota).toBe(false);
  });

  /* Resposta torta que trouxe status de erro E um caminho: manda o status. */
  it("o status manda sobre o caminho", () => {
    expect(vocabulario({ status: "erro", caminho: "municipal" }).emiteNota).toBe(false);
  });
});

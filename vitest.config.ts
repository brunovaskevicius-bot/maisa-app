/* ─────────────────────────────────────────────────────────────────────────────
 * VITEST — o corredor de testes.
 *
 * Entrou em 13/08/2026, depois de um dia em que duas correções foram provadas por
 * asserções escritas num arquivo temporário e rodadas uma vez com `npx tsx`. Elas
 * passavam. Ninguém as rodaria de novo, e a próxima mudança nas mesmas linhas não teria
 * como saber que existiam. Teste que não roda sozinho é comentário mais caro.
 *
 * ── POR QUE VITEST E NÃO JEST ──
 *
 * O projeto é TypeScript com `paths` (`@/*`) e ES modules. O Jest precisaria de
 * `ts-jest`/babel e de um mapeamento de módulo que repete o `tsconfig`. O Vitest lê o
 * alias daqui e roda `.ts` direto. Menos peça para desalinhar.
 *
 * ── AMBIENTE `node`, E NÃO `jsdom` ──
 *
 * O que precisa de prova aqui é o NÚCLEO: casos de uso e domínio, que não tocam DOM.
 * Foi essa a escolha da arquitetura desde o começo — as portas existem para que a regra
 * seja testável com um objeto literal no lugar do banco. Teste de componente React exige
 * `jsdom` e mais dependências; quando fizer falta, é uma linha aqui.
 * ────────────────────────────────────────────────────────────────────────────── */

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    /* Mesmo `@/*` do `tsconfig.json`. Se um dia divergirem, os imports quebram no teste e
     * passam no build (ou o contrário), que é o pior tipo de desalinho. */
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    /* Testes ficam AO LADO do arquivo que provam. Uma pasta `__tests__` espelhada é uma
     * segunda árvore para manter sincronizada, e a que fica velha é sempre a dos testes. */
  },
});

/* ─────────────────────────────────────────────────────────────────────────────
 * TODO MOTIVO QUE O CALLBACK EMITE TEM QUE TER FRASE NA TELA DE LOGIN.
 *
 * ── O INCIDENTE QUE ESTE ARQUIVO CONGELA (17/08/2026) ──
 *
 * Um cliente confirmou a conta pelo e-mail e caiu numa tela de login LIMPA — sem
 * mensagem, sem pista, com a impressão de ter perdido tudo o que já tinha feito. O
 * diagnóstico levou uma sessão inteira justamente porque não havia texto na tela: o
 * sintoma "login sem explicação" tem várias causas possíveis e nenhuma delas se
 * distingue das outras a olho nu.
 *
 * `/auth/callback` já fazia a parte dele — cada saída de erro carrega um motivo próprio,
 * e o comentário de lá explica que um `?error=auth` genérico custou duas rodadas de
 * depuração às cegas. O buraco é o outro lado: o motivo só vira frase se existir uma
 * entrada no mapa `MOTIVO` da tela de login. Motivo novo sem entrada cai no `?? MOTIVO.auth`
 * ("Não foi possível concluir o login") — que é exatamente a frase inútil que a rota
 * deixou de mandar, reintroduzida pela porta dos fundos.
 *
 * ── POR QUE LER O ARQUIVO EM VEZ DE IMPORTAR ──
 *
 * `route.ts` importa `next/server` e o cliente do Supabase; `page.tsx` é `"use client"` e
 * arrasta a árvore de UI. Importar qualquer um dos dois aqui trocaria um teste de 2ms por
 * um que precisa de ambiente de navegador para verificar a existência de chaves num
 * objeto literal. É a mesma escolha que `arquitetura.test.ts` faz, pelo mesmo motivo.
 * ────────────────────────────────────────────────────────────────────────────── */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const ROTA = readFileSync(join(SRC, "app/auth/callback/route.ts"), "utf8");
const LOGIN = readFileSync(join(SRC, "app/login/page.tsx"), "utf8");

/** Os motivos que a rota realmente emite: `erro("alguma_coisa")`. */
const emitidos = [...ROTA.matchAll(/\berro\("([a-z_]+)"\)/g)].map((m) => m[1]);

/** As chaves do mapa `MOTIVO`, do começo do literal até a chave que o fecha. */
const bloco = LOGIN.slice(LOGIN.indexOf("const MOTIVO"));
const mapeados = new Set(
  [...bloco.slice(0, bloco.indexOf("\n};")).matchAll(/^\s{2}([a-z_]+):/gm)].map((m) => m[1]),
);

describe("os motivos do callback chegam à tela como frase", () => {
  /* Guarda a guarda: se um dia a regex parar de casar (alguém troca `erro(...)` por outra
   * forma de devolver), o teste passaria a validar o vazio e diria "tudo certo" para
   * sempre. Esta linha é o que faz ele falhar alto em vez de emudecer. */
  it("a leitura do arquivo encontrou motivos — senão o teste não está guardando nada", () => {
    expect(emitidos.length).toBeGreaterThanOrEqual(5);
    expect(mapeados.size).toBeGreaterThanOrEqual(5);
  });

  it.each([...new Set(emitidos)])("`%s` tem frase no mapa MOTIVO do login", (motivo) => {
    expect(mapeados).toContain(motivo);
  });

  /* O contrário NÃO é erro: `troca_falhou` e `auth` continuam no mapa depois de a rota
   * parar de emiti-los, porque links já enviados por e-mail ainda chegam com eles. Link
   * enviado não se edita — a mesma razão pela qual as LPs mortas seguem redirecionando. */
  it("frase órfã é permitida, e o motivo está escrito no próprio mapa", () => {
    const orfas = [...mapeados].filter((k) => !emitidos.includes(k));
    for (const k of orfas) {
      const linha = bloco.split("\n").find((l) => l.trimStart().startsWith(`${k}:`)) ?? "";
      expect(
        /legado/i.test(linha),
        `"${k}" não é mais emitido pelo callback e não está marcado como legado. ` +
          `Se é link antigo circulando, escreva isso na linha; se morreu, apague.`,
      ).toBe(true);
    }
  });
});

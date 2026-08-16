/* ─────────────────────────────────────────────────────────────────────────────
 * QUEM CHAMA `/api/google/conectar` TEM QUE FALAR O NOME QUE A ROTA ESCUTA.
 *
 * A rota lê `searchParams.get("pid")`. Em 16/08/2026 a etapa 4 do wizard nasceu montando
 * o link com `?profissionalId=`, e o desfecho foi o pior tipo de falha que existe:
 *
 *   1. o clique NAVEGA — então não há erro no console, nem rede vermelha, nem exceção;
 *   2. a rota recebe `pid` vazio, não acha na allowlist de agendas e redireciona de volta
 *      para a mesma tela com `?google=erro&motivo=profissional_invalido`;
 *   3. da poltrona de quem usa, o botão simplesmente **não faz nada**.
 *
 * O erro era invisível de todos os lados: o TypeScript não tipa query string, o build
 * compila, os testes passam, e a tela volta pintada igual. Só apareceu com alguém preso na
 * etapa 4 dizendo "clico e não acontece nada".
 *
 * Este teste lê o código como texto porque é o único jeito de pegar isso: a ponta que
 * escreve e a ponta que lê não se falam por tipo nenhum — só por uma string na URL.
 *
 * ⚠️ Se um dia a rota aceitar outro nome, mude os DOIS lados e este teste junto. O que ele
 * proíbe não é o nome `profissionalId` — é os dois lados discordarem em silêncio.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", "..");

function arquivos(dir: string, ext = [".ts", ".tsx"]): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivos(caminho, ext));
    else if (ext.some((e) => nome.endsWith(e))) achados.push(caminho);
  }
  return achados;
}

/** Toda ocorrência de um link para a rota, com arquivo e linha para a falha ser acionável. */
function chamadas(): { arquivo: string; linha: number; texto: string }[] {
  const fora: { arquivo: string; linha: number; texto: string }[] = [];
  for (const f of arquivos(SRC)) {
    if (f.endsWith("link.test.ts")) continue; // este arquivo cita o nome errado para explicá-lo
    readFileSync(f, "utf8").split("\n").forEach((linha, i) => {
      /* `?` obrigatório: a menção sem query string aparece em comentário e em documentação,
       * e não é chamada nenhuma. O que interessa é quem monta parâmetro. */
      if (linha.includes("/api/google/conectar?")) {
        fora.push({ arquivo: f.slice(SRC.length + 1), linha: i + 1, texto: linha.trim() });
      }
    });
  }
  return fora;
}

describe("o link para conectar a agenda", () => {
  it("existe em algum lugar — senão este teste está guardando o vazio", () => {
    expect(chamadas().length).toBeGreaterThan(0);
  });

  it("usa `pid=`, que é o que a rota lê", () => {
    const erradas = chamadas().filter((c) => !c.texto.includes("pid="));
    expect(
      erradas.map((c) => `${c.arquivo}:${c.linha} — ${c.texto.slice(0, 120)}`),
      "link para /api/google/conectar sem `pid=`: a rota vai recusar com `profissional_invalido` e o botão não vai fazer nada",
    ).toEqual([]);
  });

  it("nunca manda `profissionalId=`, que é o nome que a rota IGNORA", () => {
    const erradas = chamadas().filter((c) => c.texto.includes("profissionalId="));
    expect(erradas.map((c) => `${c.arquivo}:${c.linha}`)).toEqual([]);
  });

  /* A prova do outro lado: a rota realmente lê `pid`. Sem esta asserção, os testes acima
   * garantiriam apenas que todo mundo concorda — inclusive em estar errado junto. */
  it("e a rota, do outro lado, lê exatamente `pid`", () => {
    const fonte = readFileSync(join(SRC, "app", "api", "google", "conectar", "route.ts"), "utf8");
    expect(fonte).toContain(`searchParams.get("pid")`);
  });
});

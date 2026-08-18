/* ─────────────────────────────────────────────────────────────────────────────
 * O 301 DE DOMÍNIO NÃO PODE EMUDECER A MAISA NEM MATAR UM LOGIN.
 *
 * Este arquivo prova sobretudo o que o redirect NÃO faz. A versão ingênua ("host diferente
 * do canônico ⇒ 301") passaria em qualquer teste que só verificasse o caminho felizo — e
 * quebraria, em silêncio, o webhook do WhatsApp de todo cliente já pareado, o link de
 * confirmação de conta, o preview de branch e o `localhost` de quem desenvolve.
 *
 * ⚠️ MANIPULA `process.env` E REIMPORTA O MÓDULO, pelo mesmo motivo de
 * `entrada/whatsapp/permitidos.test.ts`: config se lê UMA vez, na carga.
 * ────────────────────────────────────────────────────────────────────────────── */

import { afterEach, describe, expect, it, vi } from "vitest";

const CANONICO = "https://app.maisasecretary.com.br";
const HOST_CANONICO = "app.maisasecretary.com.br";
const HOST_ANTIGO = "maisa-app-sooty.vercel.app";
const PREVIEW = "maisa-app-git-alguma-branch-bruno.vercel.app";

const VARIAVEIS = ["MAISA_PUBLIC_URL", "MAISA_HOSTS_ANTIGOS", "VERCEL_PROJECT_PRODUCTION_URL"];

async function comEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const k of VARIAVEIS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
  return import("./endereco");
}

/** O caso normal: domínio próprio configurado, host antigo ainda no ar. */
const emProducao = () => comEnv({ MAISA_PUBLIC_URL: CANONICO });

const pedido = (p: { host?: string; caminho?: string; busca?: string; metodo?: string }) => ({
  host: p.host ?? HOST_ANTIGO,
  caminho: p.caminho ?? "/barbeiros",
  busca: p.busca ?? "",
  metodo: p.metodo ?? "GET",
});

afterEach(() => {
  for (const k of VARIAVEIS) delete process.env[k];
  vi.resetModules();
});

describe("a URL canônica", () => {
  it("sai de MAISA_PUBLIC_URL, sem barra no fim e sem aspas colada da Vercel", async () => {
    const { URL_CANONICA, HOST_CANONICO: host } = await comEnv({
      MAISA_PUBLIC_URL: `"${CANONICO}/"`,
    });

    expect(URL_CANONICA).toBe(CANONICO);
    expect(host).toBe(HOST_CANONICO);
  });

  it("cai para o domínio de produção do projeto quando a env própria falta", async () => {
    const { URL_CANONICA } = await comEnv({ VERCEL_PROJECT_PRODUCTION_URL: HOST_ANTIGO });

    expect(URL_CANONICA).toBe(`https://${HOST_ANTIGO}`);
  });

  /* `metadataBase` tem uma obrigação que a URL canônica não tem: sempre devolver algo. Sem
   * isso o Next resolve todo `canonical` relativo contra a máquina de quem compilou. */
  it("o metadataBase nunca é nulo — sem env, vale localhost", async () => {
    const { BASE_DE_METADATA } = await comEnv({});

    expect(BASE_DE_METADATA.origin).toBe("http://localhost:3000");
  });

  it("URL torta é o mesmo que URL ausente: inerte, nunca redireciona", async () => {
    const { HOST_CANONICO: host, destinoCanonico } = await comEnv({
      MAISA_PUBLIC_URL: "app.maisasecretary.com.br", // sem esquema
    });

    expect(host).toBe("");
    expect(destinoCanonico(pedido({}))).toBeNull();
  });
});

describe("o que o 301 redireciona", () => {
  it("página pública no host antigo vai para o canônico", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ caminho: "/barbeiros" }))).toBe(`${CANONICO}/barbeiros`);
  });

  it("preserva a query string inteira — utm de anúncio não se perde no caminho", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ caminho: "/lp/terapeutas", busca: "?utm_source=ig&v=2" }))).toBe(
      `${CANONICO}/lp/terapeutas?utm_source=ig&v=2`,
    );
  });

  it("host com porta e caixa alta ainda casa", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ host: `MAISA-APP-SOOTY.vercel.app:443` }))).toBe(
      `${CANONICO}/barbeiros`,
    );
  });

  it("HEAD redireciona junto com GET — é como o buscador confere o endereço", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ metodo: "HEAD" }))).toBe(`${CANONICO}/barbeiros`);
  });
});

describe("o que o 301 NUNCA toca", () => {
  /* ★ O TESTE QUE JUSTIFICA O ARQUIVO. A Evolution grava a URL do webhook dentro da
   * instância no momento do pareamento: todo cliente pareado antes da troca de domínio
   * entrega no host antigo, por POST. Redirecionar isso é a MAISA emudecer. */
  it("o webhook do WhatsApp fica onde está, em POST e em GET", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ caminho: "/api/whatsapp", metodo: "POST" }))).toBeNull();
    expect(destinoCanonico(pedido({ caminho: "/api/whatsapp", metodo: "GET" }))).toBeNull();
  });

  /* ★ O SEGUNDO. O `code_verifier` do Supabase e o cookie do PKCE do Google são presos à
   * ORIGEM: trocar de host preserva a query e perde o cookie, que é o erro
   * `outro_navegador` — o bug caçado em 17/08, reintroduzido pela porta de trás. */
  it("o callback de autenticação fica onde está", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ caminho: "/auth/callback", busca: "?code=abc" }))).toBeNull();
  });

  it("o callback do Google fica onde está — mesma origem que emitiu o cookie", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ caminho: "/api/google/callback", busca: "?code=x" }))).toBeNull();
  });

  it("a comparação de caminho é por segmento: /apiario não é /api", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ caminho: "/apiario" }))).toBe(`${CANONICO}/apiario`);
  });

  it("nenhum método que escreve é redirecionado", async () => {
    const { destinoCanonico } = await emProducao();

    for (const metodo of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(destinoCanonico(pedido({ metodo, caminho: "/comecar" }))).toBeNull();
    }
  });

  it("preview de branch não joga ninguém para produção", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ host: PREVIEW }))).toBeNull();
  });

  it("localhost não é expulso da própria máquina", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ host: "localhost:3000" }))).toBeNull();
  });

  it("domínio de cliente não é cuspido para o nosso", async () => {
    const { destinoCanonico } = await emProducao();

    expect(destinoCanonico(pedido({ host: "agenda.barbeariadoze.com.br" }))).toBeNull();
  });

  /* Sem isto haveria laço infinito no dia em que o host antigo AINDA fosse o canônico —
   * que é exatamente o estado do projeto entre publicar este código e trocar a env. */
  it("não há laço quando o host antigo é o próprio canônico", async () => {
    const { destinoCanonico } = await comEnv({ MAISA_PUBLIC_URL: `https://${HOST_ANTIGO}` });

    expect(destinoCanonico(pedido({ host: HOST_ANTIGO }))).toBeNull();
  });

  it("sem domínio configurado, nada acontece", async () => {
    const { destinoCanonico } = await comEnv({});

    expect(destinoCanonico(pedido({}))).toBeNull();
  });
});

describe("a lista de hosts antigos", () => {
  it("ausente cai no padrão, e o padrão é o host que existe de verdade", async () => {
    const { HOSTS_ANTIGOS } = await comEnv({ MAISA_PUBLIC_URL: CANONICO });

    expect(HOSTS_ANTIGOS).toEqual([HOST_ANTIGO]);
  });

  /* Ausente e vazia são coisas diferentes: sem essa distinção não haveria como DESLIGAR
   * o 301, só como trocar o host de origem. */
  it("vazia desliga o 301", async () => {
    const { destinoCanonico } = await comEnv({ MAISA_PUBLIC_URL: CANONICO, MAISA_HOSTS_ANTIGOS: "" });

    expect(destinoCanonico(pedido({}))).toBeNull();
  });

  it("aceita lista, com ou sem esquema e com espaço sobrando", async () => {
    const { destinoCanonico } = await comEnv({
      MAISA_PUBLIC_URL: CANONICO,
      MAISA_HOSTS_ANTIGOS: " https://velho.exemplo.com , outro.exemplo.com ",
    });

    expect(destinoCanonico(pedido({ host: "velho.exemplo.com" }))).toBe(`${CANONICO}/barbeiros`);
    expect(destinoCanonico(pedido({ host: "outro.exemplo.com" }))).toBe(`${CANONICO}/barbeiros`);
    expect(destinoCanonico(pedido({ host: HOST_ANTIGO }))).toBeNull();
  });
});

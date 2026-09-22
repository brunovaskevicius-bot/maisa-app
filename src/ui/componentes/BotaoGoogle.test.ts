/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * ★ **A DIREÇÃO DO NONCE.** É a armadilha nº 1 do `signInWithIdToken`, e ela não avisa:
 * errar o lado faz **100% dos logins** falharem na verificação, com uma mensagem que fala
 * de token e não de nonce. O tipo do SDK instalado é explícito — *"the **hash of this
 * value** is compared to the value in the ID token"* —, ou seja, quem hasheia deste lado é
 * o Supabase. Logo: **cru** para o `signInWithIdToken`, **SHA-256** para o Google.
 * Um vetor conhecido prende isso; `nonceParaOGoogle` virar identidade reprova aqui.
 *
 * ★ **O CAMINHO DE FUGA NÃO PODE SER "LIMPO".** Três coisas fora do nosso alcance
 * derrubam o GIS: a env var não publicada na Vercel, o script do Google bloqueado por
 * extensão, e o nonce recusado. Nos três o componente volta para o `signInWithOAuth` de
 * redirect. Esse ramo parece código morto para quem olha de fora — e apagá-lo é trocar
 * "login feio" por "login nenhum" justamente para quem só entra pelo Google.
 *
 * ★ **UM LUGAR SÓ FALA COM O GOOGLE.** As duas telas tinham o mesmo botão, a mesma
 * checagem de provedor e o mesmo `signInWithOAuth` copiados. Dois lugares divergem: foi
 * assim que `/login` e `/cadastro` passaram a mandar para destinos diferentes sem ninguém
 * decidir isso. O teste reprova quem reintroduzir a chamada direta numa tela.
 *
 * ★ **O DESTINO É SANEADO.** O sucesso termina em `window.location.replace(...)`, e o
 * `/login` recebe o destino de `?next=` — texto de terceiro. Sem `caminhoDeVolta`,
 * `?next=//site-de-fora` manda o navegador para fora do site no instante em que a sessão
 * acabou de nascer.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gerarNonce, nonceParaOGoogle } from "./BotaoGoogle";
import { caminhoDeVolta } from "@/nucleo/dominio/caminho-de-volta";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const ler = (p: string) => readFileSync(join(SRC, p), "utf8");

describe("o nonce vai hasheado para um lado e cru para o outro", () => {
  it("nonceParaOGoogle é o SHA-256 em hex, conferido contra um vetor conhecido", async () => {
    /* sha256("abc") — o vetor do FIPS 180-4. Se a implementação mudar de algoritmo ou de
     * codificação (base64, base64url), este valor deixa de bater. */
    expect(await nonceParaOGoogle("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("o valor que vai para o Google NÃO é o que vai para o Supabase", async () => {
    const cru = gerarNonce();
    expect(await nonceParaOGoogle(cru)).not.toBe(cru);
  });

  it("hashear duas vezes dá outro valor — é exatamente o erro que derruba o login", async () => {
    const cru = gerarNonce();
    const umaVez = await nonceParaOGoogle(cru);
    expect(await nonceParaOGoogle(umaVez)).not.toBe(umaVez);
  });

  it("gerarNonce devolve 32 bytes em hex, e nunca o mesmo", () => {
    const a = gerarNonce();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(gerarNonce());
  });
});

describe("o componente do Google se defende do mundo", () => {
  const fonte = ler("ui/componentes/BotaoGoogle.tsx");

  it("o ramo de redirect continua existindo", () => {
    expect(fonte).toContain("signInWithOAuth");
    expect(fonte).toContain('setCaminho("redirect")');
  });

  it("o token vai com o nonce CRU", () => {
    /* `nonceCru` é o nome do ref de propósito: quem for trocar isso lê o nome antes. */
    expect(fonte).toMatch(/signInWithIdToken\([\s\S]{0,400}nonce: nonceCru\.current/);
  });

  it("o destino passa pelo saneamento antes de virar navegação", () => {
    expect(fonte).toContain("window.location.replace(caminhoDeVolta(destino))");
    expect(fonte).not.toMatch(/location\.replace\(destino\)/);
  });
});

describe("só um arquivo fala com o Google", () => {
  for (const tela of ["app/login/page.tsx", "app/cadastro/page.tsx"]) {
    it(`${tela} delega em vez de chamar o provedor`, () => {
      const fonte = ler(tela);
      expect(fonte).not.toContain("signInWithOAuth");
      expect(fonte).not.toContain("signInWithIdToken");
      expect(fonte).toContain("<BotaoGoogle");
    });
  }
});

describe("caminhoDeVolta só deixa passar caminho de dentro", () => {
  it("aceita caminho relativo à raiz", () => {
    expect(caminhoDeVolta("/comecar")).toBe("/comecar");
    expect(caminhoDeVolta("/?tela=mais")).toBe("/?tela=mais");
  });

  it("recusa o protocol-relative, que o navegador obedece", () => {
    expect(caminhoDeVolta("//site-de-fora.com")).toBe("/");
    expect(caminhoDeVolta("/\\site-de-fora.com")).toBe("/");
  });

  it("recusa endereço absoluto, vazio e nulo", () => {
    expect(caminhoDeVolta("https://site-de-fora.com")).toBe("/");
    expect(caminhoDeVolta("")).toBe("/");
    expect(caminhoDeVolta(null)).toBe("/");
    expect(caminhoDeVolta(undefined)).toBe("/");
  });
});

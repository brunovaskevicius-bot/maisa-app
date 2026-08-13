/* ─────────────────────────────────────────────────────────────────────────────
 * As duas traduções do vocabulário do provedor. Nenhuma delas tem rede, banco ou tela —
 * é por isso que moram no domínio, e é por isso que o teste é assim tão barato.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { numeroDeJid, statusDeEstadoEvolution } from "./canal";

describe("numeroDeJid", () => {
  it("tira o domínio do JID", () => {
    expect(numeroDeJid("5511994294906@s.whatsapp.net")).toBe("5511994294906");
  });

  /* O sufixo de device aparece quando o WhatsApp está pareado em mais de um aparelho.
   * Sem cortá-lo, a coluna guardaria "5511994294906:12" e a tela mostraria isso. */
  it("tira o sufixo de device", () => {
    expect(numeroDeJid("5511994294906:12@s.whatsapp.net")).toBe("5511994294906");
  });

  it("aceita @lid, que é a forma nova da Evolution", () => {
    expect(numeroDeJid("5511994294906@lid")).toBe("5511994294906");
  });

  it("é idempotente sobre um número já limpo", () => {
    expect(numeroDeJid("5511994294906")).toBe("5511994294906");
  });

  it("descarta máscara de digitação", () => {
    expect(numeroDeJid("+55 (11) 99429-4906@s.whatsapp.net")).toBe("5511994294906");
  });

  it.each([null, undefined, "", "@s.whatsapp.net"])("vira null para %j", (entrada) => {
    expect(numeroDeJid(entrada)).toBeNull();
  });

  /* O caso que justifica o piso de 8 dígitos: a Evolution devolve identificadores
   * internos curtos em alguns estados. Devolver o lixo faria o dono ler um "número" que
   * não é dele e desconfiar do produto inteiro. */
  it("recusa o que é curto demais para ser telefone", () => {
    expect(numeroDeJid("1234567@s.whatsapp.net")).toBeNull();
  });
});

describe("statusDeEstadoEvolution", () => {
  it("só 'open' é conectado", () => {
    expect(statusDeEstadoEvolution("open")).toBe("conectado");
    expect(statusDeEstadoEvolution("OPEN")).toBe("conectado");
  });

  it("'connecting' é o QR na tela", () => {
    expect(statusDeEstadoEvolution("connecting")).toBe("pareando");
  });

  /* A invariante que importa: o PADRÃO É DESCONECTADO. Uma versão futura da Evolution que
   * invente um estado novo tem que cair em "não está no ar" — o erro contrário faz o dono
   * ir embora achando que terminou o onboarding. */
  it.each(["close", "desconhecido", "algum-estado-novo", "", null, undefined])(
    "trata %j como desconectado",
    (entrada) => {
      expect(statusDeEstadoEvolution(entrada)).toBe("desconectado");
    },
  );
});

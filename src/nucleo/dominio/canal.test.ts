/* ─────────────────────────────────────────────────────────────────────────────
 * As duas traduções do vocabulário do provedor. Nenhuma delas tem rede, banco ou tela —
 * é por isso que moram no domínio, e é por isso que o teste é assim tão barato.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { numeroDeJid, numeroParaPareamento, statusDeEstadoEvolution } from "./canal";

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

/* ─────────────────────────────────────────────────────────────────────────────
 * O TELEFONE DIGITADO — a entrada do pareamento por código.
 *
 * É a única coisa que o dono digita no fluxo de conexão, e existe porque quem abre a
 * MAISA no próprio celular não consegue ler o QR: a câmera não fotografa a própria tela.
 * O que ele escreve vira o `number` que o WhatsApp usa para emitir o código — e nada além
 * disso: a coluna `numero` continua vindo do `ownerJid`.
 * ────────────────────────────────────────────────────────────────────────────── */
describe("numeroParaPareamento", () => {
  /* Como o dono realmente digita: com máscara, sem DDI, porque ele nunca escreve o +55. */
  it.each([
    ["(11) 99429-4906", "5511994294906"],
    ["11994294906", "5511994294906"],
    ["11 9429-4906", "551194294906"],
    ["+55 (11) 99429-4906", "5511994294906"],
    ["5511994294906", "5511994294906"],
  ])("aceita %j e devolve E.164 sem +", (entrada, esperado) => {
    expect(numeroParaPareamento(entrada)).toBe(esperado);
  });

  /* `null` = não gasta chamada ao provedor. Pedir código para um número inválido consome
   * uma tentativa do WhatsApp e devolve um código que não chega em lugar nenhum — e no
   * caso de uso isso acontece DEPOIS de apagar a instância. */
  it.each(["", "   ", "99999", "9429-4906", "abcdefgh", null, undefined])(
    "recusa %j",
    (entrada) => {
      expect(numeroParaPareamento(entrada)).toBeNull();
    },
  );

  /* Não inventa o nono dígito. Quem sabe se a linha o tem é a operadora, e acrescentá-lo
   * faria pedir código para um número que pode não existir. */
  it("mantém o celular antigo de 8 dígitos como veio", () => {
    expect(numeroParaPareamento("551194294906")).toBe("551194294906");
  });

  /* O viés brasileiro é assumido: 10 e 11 dígitos ganham 55. Quem tem número de fora
   * digita com o DDI, e o ramo de 12–15 o aceita. */
  it("aceita estrangeiro com DDI", () => {
    expect(numeroParaPareamento("+351 912 345 678")).toBe("351912345678");
  });

  /* ⚠️ O PREÇO DO VIÉS, ESCRITO. Um +1 americano tem 11 dígitos, exatamente como um
   * celular brasileiro com DDD — e o ramo brasileiro vem primeiro, então ele ganha um 55
   * indevido. Está aqui como teste, e não como bug em aberto, porque é a troca certa para
   * um produto que vende no Brasil: o caso comum (o dono digitando "(11) 99429-4906", sem
   * DDI) funciona sem instrução, e o caso raro tem saída — digitar o 001 ou o + na frente,
   * que joga o número para 12 dígitos e cai no ramo de cima. Se um dia houver cliente
   * fora do Brasil, é ESTE teste que muda primeiro. */
  it("lê um +1 de 11 dígitos como brasileiro — o preço do viés", () => {
    expect(numeroParaPareamento("14155550132")).toBe("5514155550132");
  });

  it("recusa o que passa do teto do E.164", () => {
    expect(numeroParaPareamento("1234567890123456")).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * O CAMINHO DA NOTA, E O QUE FALTA PARA ELA SAIR.
 *
 * Estes testes existem por um modo de falha específico e caro: **mandar a nota de um MEI
 * pelo caminho municipal não dá erro.** A Focus aceita, devolve 202 "processando", e a
 * recusa chega minutos depois no status assíncrono, com o vocabulário da Receita. Quem
 * estiver olhando a tela vê "processando" e conclui que está lento.
 *
 *   "Para MEI a emissão via Ambiente Nacional é obrigatória, independente do município,
 *    desde setembro de 2023."   — guia dos municípios da NFS-e Nacional, Focus NFe
 *
 * Nenhum teste de integração pega isso sem emitir de verdade e esperar. Função pura,
 * interrogada aqui.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import {
  VIRADA_SIMPLES_NACIONAL, caminhoDaNota, fiscalFaltando, type ConfigFiscal,
} from "./fiscal";

const HOJE = "2026-08-17";

/** Um MEI de barbearia pronto para emitir: é o caso do nosso ICP. */
const meiPronto: ConfigFiscal = {
  ambiente: "homologacao",
  cnpj: "12345678000123",
  razaoSocial: "BARBEARIA TESTE MEI",
  codigoMunicipio: "3550308",
  optanteMei: true,
  optanteSimples: false,
  empresaId: 9001,
  certificadoValidoAte: "2027-08-17",
  codigoTributacaoNacional: "060101",
  prestadorCpf: null,
  ocupacaoSaude: null,
  registroProfissional: null,
  inscricaoMunicipal: null,
  itemListaServico: null,
  aliquotaIss: null,
  codigoTributarioMunicipio: null,
};

/** Uma clínica ME, caminho municipal — o desenho original de `config_fiscal`. */
const mePronto: ConfigFiscal = {
  ...meiPronto,
  optanteMei: false,
  optanteSimples: true,
  codigoTributacaoNacional: null,
  inscricaoMunicipal: "46532",
  itemListaServico: "03115",
};

describe("por onde a nota sai", () => {
  const so = (c: Partial<ConfigFiscal>) =>
    caminhoDaNota({ prestadorCpf: null, optanteMei: false, optanteSimples: false, ...c }, HOJE);

  /* ⚠️ O teste que dá nome ao arquivo. */
  it("MEI vai pelo Ambiente Nacional, sempre — independente do município", () => {
    expect(so({ optanteMei: true })).toBe("nacional");
  });

  it("quem não é MEI segue pela prefeitura", () => {
    expect(so({})).toBe("municipal");
  });

  /* ── a virada da Resolução CGSN 191/2026 ── */

  it("ME do Simples ainda vai pela prefeitura antes de 01/11/2026", () => {
    expect(so({ optanteSimples: true })).toBe("municipal");
  });

  it("ME do Simples vai para o nacional a partir de 01/11/2026", () => {
    expect(caminhoDaNota(
      { prestadorCpf: null, optanteMei: false, optanteSimples: true },
      VIRADA_SIMPLES_NACIONAL,
    )).toBe("nacional");
  });

  /* ── o caminho de quem não tem CNPJ ── */

  it("quem atende como pessoa física emite recibo, não nota", () => {
    expect(so({ prestadorCpf: "12345678909" })).toBe("recibo_saude");
  });

  /* ⚠️ O erro que a ordem das perguntas evita: inquilino no meio do onboarding tem os dois
   * campos nulos, e não é pessoa física — é alguém que não terminou de preencher. */
  it("sem CNPJ e sem CPF ainda é caminho fiscal, não recibo", () => {
    expect(so({})).toBe("municipal");
  });
});

describe("o que falta no caminho do recibo", () => {
  const carla: ConfigFiscal = {
    ...meiPronto,
    cnpj: null,
    razaoSocial: null,
    codigoMunicipio: null,
    optanteMei: false,
    empresaId: null,
    /* ★ O ponto do caminho: NULO, e mesmo assim nada falta. */
    certificadoValidoAte: null,
    codigoTributacaoNacional: null,
    prestadorCpf: "12345678909",
    ocupacaoSaude: "psicologo",
    registroProfissional: "CRP 06/123456",
  };

  it("nada, e em particular NÃO pede certificado digital", () => {
    expect(fiscalFaltando(carla, HOJE)).toEqual([]);
  });

  it("pede o CPF quando ele tem menos de 11 dígitos", () => {
    expect(fiscalFaltando({ ...carla, prestadorCpf: "1234" }, HOJE)).toEqual(["o CPF de quem atende"]);
  });

  it("pede a profissão, que é o código da ocupação no Carnê-Leão", () => {
    expect(fiscalFaltando({ ...carla, ocupacaoSaude: null }, HOJE))
      .toEqual(["a profissão registrada no conselho"]);
  });

  /* O conselho aceita vazio quando há um registro só. Bloquear seria inventar regra — a
   * tela pede, o domínio não impede. Ver o comentário do campo em `ConfigFiscal`. */
  it("não bloqueia por falta de registro profissional", () => {
    expect(fiscalFaltando({ ...carla, registroProfissional: null }, HOJE)).toEqual([]);
  });
});

describe("o que falta para emitir", () => {
  it("nada, quando o MEI está completo", () => {
    expect(fiscalFaltando(meiPronto, HOJE)).toEqual([]);
  });

  it("nada, quando a empresa municipal está completa", () => {
    expect(fiscalFaltando(mePronto, HOJE)).toEqual([]);
  });

  /* ⚠️ ESTE É O TESTE QUE JUSTIFICA A BIFURCAÇÃO. A `fiscal_configurado()` do 002 exigia
   * inscrição municipal de todo mundo. Aplicada a um MEI, ela mandaria o dono buscar um
   * número que o caminho dele NÃO USA — e o DPS nacional não tem nem o campo. */
  it("NÃO pede inscrição municipal de um MEI", () => {
    const falta = fiscalFaltando(meiPronto, HOJE);
    expect(falta.join(" ")).not.toContain("inscrição municipal");
  });

  it("pede o código nacional do MEI, e o municipal de quem não é", () => {
    expect(fiscalFaltando({ ...meiPronto, codigoTributacaoNacional: null }, HOJE))
      .toContain("o código do serviço");
    expect(fiscalFaltando({ ...mePronto, inscricaoMunicipal: null }, HOJE))
      .toContain("a inscrição municipal");
  });

  it("pede o CNPJ e o município antes de qualquer coisa", () => {
    const falta = fiscalFaltando({ ...meiPronto, cnpj: null, codigoMunicipio: null }, HOJE);
    expect(falta).toContain("o CNPJ de quem emite");
    expect(falta).toContain("o município do CNPJ");
  });

  it("pede o cadastro no emissor quando a empresa não existe na Focus", () => {
    expect(fiscalFaltando({ ...meiPronto, empresaId: null }, HOJE))
      .toContain("cadastrar o CNPJ no emissor");
  });

  describe("o certificado", () => {
    it("falta quando nunca subiu", () => {
      expect(fiscalFaltando({ ...meiPronto, certificadoValidoAte: null }, HOJE))
        .toContain("o certificado digital da empresa");
    });

    /* ⚠️ Vencido conta como ausente, e a frase diz "venceu". Sem isso o dono vê "está
     * tudo configurado", a assinatura falha, e a mensagem que chega fala de assinatura
     * inválida — que manda procurar no lugar errado por horas. */
    it("vencido não é 'configurado', e a frase diz que venceu", () => {
      const falta = fiscalFaltando({ ...meiPronto, certificadoValidoAte: "2026-08-16" }, HOJE);
      expect(falta.join(" ")).toContain("venceu");
      expect(falta).not.toEqual([]);
    });

    /* O limite é hoje INCLUSIVE: um certificado que vale até hoje ainda assina hoje. */
    it("que vence hoje ainda vale hoje", () => {
      expect(fiscalFaltando({ ...meiPronto, certificadoValidoAte: HOJE }, HOJE)).toEqual([]);
    });
  });
});

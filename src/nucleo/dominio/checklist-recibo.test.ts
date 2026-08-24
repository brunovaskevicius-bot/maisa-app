/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTES TESTES PRENDEM
 *
 * ★ QUE A GENTE NÃO PINTA DE VERDE O QUE NÃO SABE. O cadastro no Carnê-Leão e a base que o
 * conselho manda para a Receita estão do outro lado do muro — nenhuma configuração nossa muda
 * o estado deles, e nenhuma leitura nossa os alcança.
 *
 * Um selo verde ali seria mentira caríssima: ela sairia da tela achando que está tudo certo e
 * descobriria no e-CAC, sozinha, em vocabulário de Receita. Por isso `nao_da_para_saber` é
 * inatingível por configuração — e há teste que tenta e falha de propósito.
 *
 * E que o CRP NÃO bloqueia. O campo 16 do arquivo aceita vazio; o que trava é o cadastro dela.
 * Tratar como obrigatório impediria de fechar o mês por um dado que a Receita nem exige.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import {
  EMAIL_RECEITA_SAUDE, LINK_CARNE_LEAO, LINK_ECAC_SERVICO,
  checklistDoRecibo, faltaNoChecklist, seAindaRecusar,
} from "./checklist-recibo";
import type { ConfigFiscal } from "./fiscal";

const HOJE = "2026-08-24";

const carla = (over: Partial<ConfigFiscal> = {}): ConfigFiscal => ({
  ambiente: "producao",
  cnpj: null, razaoSocial: null, codigoMunicipio: null,
  optanteMei: false, optanteSimples: false, empresaId: null,
  certificadoValidoAte: null, codigoTributacaoNacional: null,
  prestadorCpf: "12345678909",
  ocupacaoSaude: "psicologo",
  registroProfissional: "CRP 06/123456",
  inscricaoMunicipal: null, itemListaServico: null,
  aliquotaIss: null, codigoTributarioMunicipio: null,
  ...over,
});

const item = (c: ConfigFiscal, id: string) =>
  checklistDoRecibo(c, HOJE).find((i) => i.id === id)!;

describe("o que a gente consegue conferir", () => {
  it("tudo preenchido: CPF, profissão e registro ficam prontos", async () => {
    const itens = checklistDoRecibo(carla(), HOJE);
    const nossos = itens.filter((i) => ["cpf", "profissao", "registro"].includes(i.id));

    expect(nossos.map((i) => i.estado)).toEqual(["pronto", "pronto", "pronto"]);
    expect(faltaNoChecklist(itens)).toBe(0);
  });

  it("CPF torto vira `falta`", () => {
    expect(item(carla({ prestadorCpf: "123" }), "cpf").estado).toBe("falta");
  });

  it("sem profissão, `falta` — e o código só aparece quando há profissão", () => {
    expect(item(carla({ ocupacaoSaude: null }), "profissao").estado).toBe("falta");
    expect(item(carla(), "profissao").detalhe).toContain("255");
  });

  /* ★ NÃO BLOQUEIA, e a frase na tela diz isso. Sem essa palavra ela para o fechamento do mês
   * achando que precisa resolver antes — e não precisa. */
  it("sem registro é `falta`, mas a frase avisa que não bloqueia", () => {
    const i = item(carla({ registroProfissional: null }), "registro");
    expect(i.estado).toBe("falta");
    expect(i.detalhe).toContain("Não bloqueia gerar");
  });
});

describe("★ o que está do outro lado do muro", () => {
  /* O TESTE QUE JUSTIFICA O ARQUIVO. */
  it("Carnê-Leão e ensaio NUNCA ficam prontos, por mais que se configure", () => {
    const completa = carla({ registroProfissional: "CRP 06/123456" });
    const doOutroLado = checklistDoRecibo(completa, HOJE)
      .filter((i) => ["carne_leao", "ensaio"].includes(i.id));

    expect(doOutroLado.map((i) => i.estado)).toEqual(["nao_da_para_saber", "nao_da_para_saber"]);
  });

  /* Aviso que nunca apaga é aviso que ninguém lê: o contador de pendências ignora o que é
   * impossível saber. */
  it("`nao_da_para_saber` não conta como pendência", () => {
    expect(faltaNoChecklist(checklistDoRecibo(carla(), HOJE))).toBe(0);
  });

  /* O cadastro é por ano-calendário, e é a causa nº 1 dos dois erros. A frase tem que dizer o
   * ano — "renove o cadastro" sem número faz a pessoa achar que já fez. */
  it("o item do Carnê-Leão nomeia o ano e o ano anterior", () => {
    const i = item(carla(), "carne_leao");
    expect(i.titulo).toContain("2026");
    expect(i.detalhe).toContain("2025");
    expect(i.detalhe).toContain("por ano");
  });

  /* Os dois erros do e-CAC citados com as palavras dele: é assim que ela liga o que leu lá com
   * o que a MAISA disse aqui. */
  it("cita os dois erros do e-CAC com as palavras da Receita", () => {
    const d = item(carla(), "carne_leao").detalhe;
    expect(d).toContain("Ocupação não cadastrada");
    expect(d).toContain("Registro profissional não informado pelo conselho");
  });

  /* ⚠️ Instrução que não usa as palavras dos botões do site é instrução que faz desistir no
   * meio. Estes são os nomes que aparecem na tela dela. */
  it("os passos usam os nomes dos botões do e-CAC", () => {
    const passos = (item(carla(), "carne_leao").passos ?? []).join(" | ");
    expect(passos).toContain("trabalhador autônomo");
    expect(passos).toContain("Ocupações");
    expect(passos).toContain("Salvar Identificação");
    expect(passos).toContain("Psicólogo");
    expect(passos).toContain("CRP");
  });

  /* ★ O PASSO DE NAVEGAÇÃO SAIU EM 24/08/2026, e a ausência é a mudança. O link passou a cair
   * DENTRO do Carnê-Leão — repetir "Declarações e Demonstrativos → Acessar Carnê-Leão" mandaria
   * ela procurar um menu que já não está na frente dela, e duvidar de que chegou no lugar certo. */
  it("não manda navegar até o Carnê-Leão, porque o link já entra lá", () => {
    const passos = (item(carla(), "carne_leao").passos ?? []).join(" | ");
    expect(passos).not.toContain("Acessar Carnê-Leão");
    expect(passos).not.toContain("Declarações e Demonstrativos");
  });

  /* O ensaio cai na própria escrituração: o primeiro passo é o botão que já está na tela. */
  it("o ensaio começa no botão que já está na tela", () => {
    const passos = (item(carla(), "ensaio").passos ?? []);
    expect(passos[0]).toBe("Clique em Importar Escrituração");
  });

  /* ⚠️ Deep link tem quebra silenciosa: deslogada, o e-CAC devolve para o login e pode não
   * voltar. Sem a saída alternativa, "não abriu" vira "não funciona". */
  it("todo deep link tem uma saída pela página de serviço", () => {
    for (const id of ["carne_leao", "ensaio"]) {
      const i = item(carla(), id);
      expect(i.link?.url).toBe(LINK_CARNE_LEAO);
      expect(i.linkAlternativo?.url).toBe(LINK_ECAC_SERVICO);
      expect(i.linkAlternativo?.rotulo).toContain("Não abriu");
    }
  });

  /* Só a URL que alguém abriu e viu funcionar. Todas as rotas de `/carneleao/` respondem 302
   * para o login quando deslogado, então caminho de dentro não se verifica sem sessão — e
   * inventar `/identificacao` daria um link que quebra calado. */
  it("o deep link é a escrituração, e nenhuma rota adivinhada", () => {
    expect(LINK_CARNE_LEAO).toBe("https://www3.cav.receita.fazenda.gov.br/carneleao/escrituracao");
    expect(LINK_CARNE_LEAO).not.toMatch(/identificacao|configuracoes/);
  });

  it("o ensaio explica que não emite nada", () => {
    const i = item(carla(), "ensaio");
    expect(i.detalhe).toContain("sem emitir recibo nenhum");
    expect((i.passos ?? []).join(" | ")).toContain("Analisar Arquivo");
  });
});

describe("a profissão muda o vocabulário", () => {
  it("fisioterapeuta fala CREFITO, não CRP", () => {
    const i = item(carla({ ocupacaoSaude: "fisioterapeuta" }), "registro");
    expect(i.titulo).toBe("Seu CREFITO");
    expect(item(carla({ ocupacaoSaude: "fisioterapeuta" }), "profissao").detalhe).toContain("231");
  });

  it("fonoaudióloga fala CRFa", () => {
    expect(item(carla({ ocupacaoSaude: "fonoaudiologo" }), "registro").titulo).toBe("Seu CRFa");
  });

  /* Sem profissão escolhida, a frase não pode inventar um conselho. */
  it("sem profissão, o título não chuta conselho", () => {
    expect(item(carla({ ocupacaoSaude: null }), "registro").titulo).toBe("Seu conselho");
  });
});

describe("a escada de quando recusa mesmo com tudo certo", () => {
  /* O último degrau é real e quase ninguém sabe dele. Sem isso, a profissional com registro
   * ativo e recusa persistente conclui que o produto está quebrado. */
  it("termina no e-mail da Cofis", () => {
    const passos = seAindaRecusar("psicologo");
    expect(passos).toHaveLength(3);
    expect(passos[2]).toContain(EMAIL_RECEITA_SAUDE);
    expect(passos[1]).toContain("CRP");
    expect(passos[0]).toContain("deste ano");
  });

  it("fala do conselho certo por profissão", () => {
    expect(seAindaRecusar("terapeuta_ocupacional")[1]).toContain("CREFITO");
    expect(seAindaRecusar(null)[1]).toContain("seu conselho");
  });
});

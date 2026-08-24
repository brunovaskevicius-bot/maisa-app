/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — a configuração fiscal, em memória.
 *
 * Existe para a tela fiscal poder ser aberta e clicada sem conta na Focus e sem banco. E,
 * mais importante, para o caminho do MEI ser EXERCITÁVEL: o estado inicial aqui é um MEI
 * com o CNPJ ligado e **sem certificado**, que é o passo em que todo cliente real vai
 * parar. Quem abrir o `/laboratorio` vê exatamente a tela que o cliente vê.
 *
 * ⚠️ MUTÁVEL, DE PROPÓSITO E COM LIMITE. `salvar` grava num objeto de módulo, que na Vercel
 * vive enquanto a instância viver. Serve para o clique surtir efeito na mesma sessão; não
 * serve para nada mais, e é por isso que este arquivo nunca é montado com Supabase
 * configurado (ver `composicao.ts`).
 * ────────────────────────────────────────────────────────────────────────────── */

import type { RemendoFiscal, RepositorioFiscal } from "@/nucleo/portas/saida/repositorio-fiscal";
import type {
  CadastroDeEmissor, EmpresaDoEmissor,
} from "@/nucleo/portas/saida/cadastro-de-emissor";
import type { CadastroDoCnpj, ConfigFiscal } from "@/nucleo/dominio/fiscal";

/** CNPJ de exemplo da Receita ("Banco do Brasil"), o mesmo que a doc da Focus usa. */
const CNPJ_DEMO = "00000000000191";

let estado: ConfigFiscal = {
  ambiente: "homologacao",
  cnpj: CNPJ_DEMO,
  razaoSocial: "BARBEARIA DEMONSTRAÇÃO MEI",
  codigoMunicipio: "3550308",
  /* ★ MEI, porque é o ICP. Com isto o `/laboratorio` roda o caminho nacional. */
  optanteMei: true,
  optanteSimples: false,
  empresaId: 9001,
  /* ⚠️ NULO DE PROPÓSITO — é o passo que falta na vida real. */
  certificadoValidoAte: null,
  codigoTributacaoNacional: "060101",
  /* Nulos: este demo é o do MEI. O caminho do recibo tem demo próprio — ver `recibos.ts`,
   * que monta um lote de verdade a partir dos mesmos fixtures de clientes. */
  prestadorCpf: null,
  ocupacaoSaude: null,
  registroProfissional: null,
  inscricaoMunicipal: null,
  itemListaServico: null,
  aliquotaIss: null,
  codigoTributarioMunicipio: null,
};

export const fiscalDemo: RepositorioFiscal = {
  async ler(): Promise<ConfigFiscal> {
    return { ...estado };
  },
  async salvar(_t, remendo: RemendoFiscal): Promise<ConfigFiscal> {
    estado = { ...estado, ...remendo };
    return { ...estado };
  },
};

/**
 * O cadastro de emissor de mentira.
 *
 * `consultarCnpj` responde MEI para qualquer CNPJ de 14 dígitos: na demonstração o
 * interessante é ver o caminho do ICP, não cobrir os regimes todos.
 */
export const cadastroDemo: CadastroDeEmissor = {
  async consultarCnpj(cnpj): Promise<CadastroDoCnpj | null> {
    const d = cnpj.replace(/\D/g, "");
    if (d.length !== 14) return null;
    return {
      cnpj: d,
      razaoSocial: "EMPRESA DE DEMONSTRAÇÃO MEI",
      situacao: "ativa",
      cnae: "9602501",
      optanteMei: true,
      optanteSimples: false,
      codigoMunicipio: "3550308",
      municipio: "São Paulo",
      uf: "SP",
    };
  },

  async criarEmpresa(): Promise<EmpresaDoEmissor> {
    return { id: 9001, certificadoValidoAte: null, certificadoCnpj: null };
  },

  async estadoDaEmpresa(_t, empresaId): Promise<EmpresaDoEmissor | null> {
    return { id: empresaId, certificadoValidoAte: estado.certificadoValidoAte, certificadoCnpj: estado.cnpj };
  },

  /**
   * Aceita qualquer arquivo e devolve um vencimento de um ano.
   *
   * ⚠️ Não valida NADA, e é assim porque validar certificado de mentira ensinaria o
   * contrário do que acontece: na Focus os erros comuns (senha errada, e-CPF no lugar do
   * e-CNPJ) vêm com mensagem dela, e a tela mostra literalmente o que ela disse.
   */
  async enviarCertificado(_t, empresaId): Promise<EmpresaDoEmissor> {
    const daquiUmAno = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
    return { id: empresaId, certificadoValidoAte: daquiUmAno, certificadoCnpj: estado.cnpj };
  },

  faltando: () => [],
};

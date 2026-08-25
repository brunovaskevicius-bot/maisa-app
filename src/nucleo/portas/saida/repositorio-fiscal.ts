/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — a configuração fiscal do inquilino, do nosso lado.
 *
 * Uma linha por negócio (`config_fiscal`, PK = `tenant_id`). É o que faz o produto ter um
 * segundo cliente: enquanto o CNPJ vinha de variável de ambiente, o app inteiro sabia
 * emitir nota de UM prestador — e isso não é limitação de escala, é limitação de um.
 *
 * ── POR QUE NÃO É MÉTODO DO `RepositorioNegocio` ──
 *
 * Porque tem um leitor que o cadastro não tem, e é o único que importa: **a emissão**. E
 * porque `config_fiscal` guarda o id da empresa no provedor — se ela morasse junto do
 * cadastro, o adaptador de demonstração (que responde negócio com quatro arrays) teria que
 * fingir ter conta em emissor fiscal.
 *
 * ── ⚠️ O QUE ESTA PORTA NUNCA VAI TER ──
 *
 * Token de emissão e arquivo de certificado. Os dois existem, os dois são do cliente, e
 * nenhum dos dois fica no nosso banco:
 *
 *   token       → o provedor devolve por API quando perguntamos com o token da conta.
 *                 Gravar seria duplicar um segredo que já tem dono, e herdar de graça a
 *                 chave de criptografia, a rotação e o vazamento.
 *   certificado → atravessa a requisição e vai embora. Um e-CNPJ assina contrato e abre o
 *                 e-CAC da empresa; guardá-lo é assumir uma responsabilidade que o produto
 *                 não precisa ter para funcionar.
 *
 * O que fica do certificado é `certificadoValidoAte` — porque sem o vencimento a nota
 * falha em silêncio no dia em que ele expira, e a mensagem que chega fala de assinatura
 * inválida, que manda procurar no lugar errado.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { ConfigFiscal } from "../../dominio/fiscal";

/**
 * O que se grava. Parcial de propósito: o fluxo é incremental — primeiro o CNPJ e o que a
 * Receita respondeu, depois o id da empresa, depois o vencimento do certificado, e só
 * então o ambiente vira produção.
 *
 * ⚠️ Chave AUSENTE e chave com `null` são coisas diferentes: ausente não mexe, `null`
 * apaga. Sem essa distinção, gravar "o certificado subiu" zeraria o CNPJ.
 */
export type RemendoFiscal = Partial<
  Pick<
    ConfigFiscal,
    | "ambiente"
    | "cnpj"
    | "razaoSocial"
    | "codigoMunicipio"
    | "optanteMei"
    | "optanteSimples"
    | "empresaId"
    | "certificadoValidoAte"
    | "codigoTributacaoNacional"
    | "prestadorCpf"
    | "ocupacaoSaude"
    | "registroProfissional"
    | "procuradorDocumento"
    | "procuracaoValidaAte"
    | "procuracaoAceitaEm"
    | "inscricaoMunicipal"
    | "itemListaServico"
    | "aliquotaIss"
    | "codigoTributarioMunicipio"
  >
>;

export interface RepositorioFiscal {
  /**
   * A configuração daquele negócio.
   *
   * ⚠️ SEMPRE DEVOLVE UM OBJETO, nunca `null`. Um inquilino sem linha em `config_fiscal`
   * é um inquilino que ainda não ligou a nota fiscal — e "ainda não ligou" se descreve com
   * campos nulos e `ambiente: "homologacao"`, não com a ausência do objeto. Devolver `null`
   * espalharia um `?.` por cada tela que pergunta o que falta.
   */
  ler(t: ContextoTenant): Promise<ConfigFiscal>;

  /**
   * Grava o que mudou, criando a linha se ela não existir.
   *
   * ⚠️ Quem implementa em Postgres com RLS tem que tratar ZERO LINHAS como recusa. Um
   * `update` barrado pela RLS volta **sem erro e sem linha** — e o sintoma é a tela dizer
   * "salvo" e reverter no reload. O padrão está no `renomear` de `saida/supabase`.
   */
  salvar(t: ContextoTenant, remendo: RemendoFiscal): Promise<ConfigFiscal>;
}

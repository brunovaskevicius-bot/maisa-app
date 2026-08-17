/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o cadastro de quem emite, no provedor.
 *
 * Quatro capacidades, e as quatro existem para o cliente responder MENOS pergunta:
 *
 *   consultarCnpj      14 dígitos → razão social, município, CNAE e `optanteMei`
 *   criarEmpresa       cadastra aquele CNPJ e devolve o id dele lá
 *   estadoDaEmpresa    o que o provedor sabe hoje (o certificado subiu? vence quando?)
 *   enviarCertificado  o A1 do cliente atravessa e vai embora
 *
 * ── POR QUE É PORTA SEPARADA DE `EmissorFiscal` ──
 *
 * Pela mesma razão que `ContatosDoCanal` é separada de `RepositorioContatos`: **as duas
 * falham por motivos independentes.** Cadastrar empresa é uma operação de administração,
 * feita uma vez, na conta da MAISA. Emitir é operação do cliente, na empresa dele, muitas
 * vezes por dia. O provedor pode recusar um cadastro (certificado inválido) com a emissão
 * funcionando perfeitamente para todos os outros — e vice-versa.
 *
 * Juntar as duas faria a tela de faturamento carregar um objeto que sabe subir certificado.
 *
 * ── ⚠️ O QUE ESTA PORTA DELIBERADAMENTE NÃO TEM ──
 *
 * **Um método que devolva o token da empresa.** O provedor devolve, e o adaptador usa —
 * mas não passa por aqui. Se `tokenDaEmpresa()` estivesse nesta interface, a credencial de
 * um cliente viraria valor de retorno dentro do núcleo: apareceria em argumento de caso de
 * uso, em objeto de teste, e no primeiro `console.log` de depuração que alguém esquecesse.
 *
 * O núcleo conhece o `empresaId`. Quem sabe pedir o token é o adaptador, e ele descarta.
 *
 * ── ⚠️ O CERTIFICADO TAMBÉM NÃO FICA ──
 *
 * `enviarCertificado` recebe o `.pfx` e a senha, repassa, e devolve só o vencimento. Um
 * e-CNPJ assina contrato e abre o e-CAC da empresa: é a identidade jurídica do cliente,
 * não uma credencial de API. Nada neste sistema deve poder tocá-lo depois do repasse.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
/* `CadastroDoCnpj` mora no domínio, e não aqui: o cadastro público de uma empresa
 * brasileira não é vocabulário de provedor — qualquer emissor devolveria o mesmo, porque
 * a fonte é a mesma Receita. Ver o comentário do tipo em `dominio/fiscal.ts`. */
import type { CadastroDoCnpj } from "../../dominio/fiscal";

export type { CadastroDoCnpj };

/** Como o provedor vê a empresa agora. */
export type EmpresaDoEmissor = {
  id: number;
  /** Vencimento do certificado A1. `null` = nenhum certificado subiu ainda. */
  certificadoValidoAte: string | null;
  /** O CNPJ que o certificado cobre. Diverge do da empresa quando subiram o e-CPF. */
  certificadoCnpj: string | null;
};

export interface CadastroDeEmissor {
  /**
   * O cadastro daquele CNPJ na Receita. `null` quando não existe — que é o erro de
   * digitação mais comum, e merece "não achei esse CNPJ" em vez de "erro no provedor".
   */
  consultarCnpj(cnpj: string): Promise<CadastroDoCnpj | null>;

  /**
   * Cadastra a empresa e devolve o id dela no provedor.
   *
   * ⚠️ NÃO É IDEMPOTENTE, e o provedor não deduplica por CNPJ. Quem chama grava o id
   * ANTES de qualquer outra coisa poder falhar — CNPJ cadastrado duas vezes só se resolve
   * à mão no painel do provedor.
   *
   * `nacional` decide quais documentos ficam habilitados. Produção nasce SEMPRE desligada:
   * virar é decisão deliberada depois de uma emissão de teste que deu certo.
   */
  criarEmpresa(
    t: ContextoTenant,
    p: { cnpj: string; nome: string; nacional: boolean; optanteMei: boolean; optanteSimples: boolean; email?: string | null; municipio?: string | null; uf?: string | null },
  ): Promise<EmpresaDoEmissor>;

  /** O estado atual. `null` quando a empresa não existe mais lá. */
  estadoDaEmpresa(t: ContextoTenant, empresaId: number): Promise<EmpresaDoEmissor | null>;

  /**
   * Repassa o certificado A1. Devolve o vencimento que o provedor leu do arquivo.
   *
   * Lança com a mensagem do provedor intacta — os três erros comuns (senha errada,
   * certificado vencido, e-CPF no lugar do e-CNPJ) são coisas que só o texto original
   * explica, e reescrever viraria "certificado inválido", que não ajuda ninguém.
   */
  enviarCertificado(
    t: ContextoTenant,
    empresaId: number,
    p: { pfxBase64: string; senha: string },
  ): Promise<EmpresaDoEmissor>;

  /** O que falta no ambiente para isto funcionar. Vazio = dá para chamar. Nunca lança. */
  faltando(): string[];
}

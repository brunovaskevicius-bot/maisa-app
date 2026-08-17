/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o emissor de nota fiscal de serviço.
 *
 * Quem implementa hoje é `adaptadores/saida/focus`. O núcleo não sabe o que é
 * "item_lista_servico", "codigo_tributacao_nacional_iss" nem "DPS": isso é vocabulário de
 * Receita e de prefeitura, e mora inteiro dentro do adaptador.
 *
 * ── ⚠️ ESTA PORTA ENCOLHEU EM 17/08/2026, E O QUE SAIU É A PARTE INTERESSANTE ──
 *
 * Ela tinha quatro membros GLOBAIS: `configurado`, `faltando()`, `simulado` e `ambiente`.
 * Nenhum recebia inquilino. Numa porta de um produto multi-inquilino isso é uma resposta
 * só para todo mundo — e já era falso antes de existir o segundo cliente, porque o
 * ambiente é escolha de cada negócio: um testa em homologação enquanto o outro fatura.
 *
 * O modo de falha era o pior possível numa tela fiscal: `/api/nf/emitir` respondia
 * `ambiente: servicos.emissor.ambiente` — o do env — para uma nota que podia ter saído em
 * PRODUÇÃO. O dono leria "isto é teste" sobre um documento com validade fiscal.
 *
 * Onde cada coisa foi:
 *   `ambiente` · `simulado` → `ResultadoDeNota`, descrevendo a emissão que aconteceu
 *   `configurado` · `faltando()` → `dominio/fiscal.fiscalFaltando(config, hoje)`, função
 *      pura sobre a `ConfigFiscal` do inquilino, com frase em português para a tela
 *
 * Sobraram três verbos, todos recebendo o inquilino E a configuração dele.
 *
 * ── POR QUE A `ConfigFiscal` VEM COMO ARGUMENTO ──
 *
 * Porque quem lê o banco é o caso de uso, não o adaptador de saída. Se este emissor
 * buscasse a própria configuração, ele precisaria do repositório — e adaptador que
 * importa adaptador é a regra que `arquitetura.test.ts` prende. A alternativa (injetar o
 * repositório aqui) inverteria o hexágono: um adaptador de saída orquestrando outra porta.
 *
 * ── ⚠️ O TOKEN NÃO ESTÁ AQUI, E É DE PROPÓSITO ──
 *
 * `ConfigFiscal` carrega o `empresaId`, nunca a credencial. O adaptador pede o token ao
 * provedor na hora de emitir (com o token da conta) e o descarta. Consequência: **nenhuma
 * credencial de cliente atravessa o núcleo** — não aparece em argumento, não entra em log
 * de caso de uso, não vaza num `console.log` de depuração escrito às três da manhã.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { ConfigFiscal, PedidoDeNota, ResultadoDeNota } from "../../dominio/fiscal";

export interface EmissorFiscal {
  /**
   * Manda a nota. Assíncrono por natureza: o normal é voltar `processando` e o número
   * sair depois — ver `consultar`.
   *
   * Lança `NaoConfigurado` quando falta dado fiscal, em vez de tentar e errar: emissão
   * com dado incompleto pode virar documento fiscal torto, que só se conserta cancelando
   * na prefeitura.
   */
  emitir(t: ContextoTenant, config: ConfigFiscal, p: PedidoDeNota): Promise<ResultadoDeNota>;

  /**
   * Onde a nota está.
   *
   * ⚠️ É AQUI QUE A RECUSA APARECE. A prefeitura (ou a Receita, no caminho nacional)
   * rejeita no status assíncrono, nunca na resposta da emissão. Quem só olha o retorno de
   * `emitir` vê 202 e conclui que deu certo.
   */
  consultar(t: ContextoTenant, config: ConfigFiscal, ref: string): Promise<ResultadoDeNota>;

  /** Cancela. Síncrono. `justificativa` tem mínimo de 15 caracteres no provedor. */
  cancelar(
    t: ContextoTenant,
    config: ConfigFiscal,
    ref: string,
    justificativa?: string,
  ): Promise<ResultadoDeNota>;
}

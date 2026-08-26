/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — quem emite o Recibo Eletrônico de Serviços de Saúde, um por um.
 *
 * ★ O CONTRATO É O DA REBOTS, DE PROPÓSITO, E ISSO FOI DECISÃO DE ARQUITETURA.
 *
 * Não existe API oficial (verificado na lista de serviços do Integra Contador: 11 soluções,
 * nenhuma de Carnê-Leão ou Receita Saúde). Os canais possíveis são todos automação em cima do
 * canal oficial — nossa, sob procuração e-CAC, ou de terceiro. A Rebots publicou a forma dessa
 * automação, e adotá-la como o NOSSO port faz trocar de fornecedor virar trocar de adaptador.
 *
 * O custo de escolher assim é zero: a forma deles é a forma que o problema tem.
 *   `cadastrarEmissor` ← POST /issuers        `emitir` ← POST /receipts
 *   `cancelar`         ← POST /receipts       o callback ← POST no endpoint que registramos
 *
 * ── ⚠️ TRÊS VERBOS, E NENHUM DELES DIZ SE O RECIBO EXISTE ──
 *
 * `emitir` devolve `ReciboAceito`, não "emitido". Em todo canal conhecido a emissão é
 * assíncrona: a chamada volta "registrado" e o desfecho chega por callback. Quem lê o retorno
 * de `emitir` como sucesso escreve o bug que este produto não pode ter — ver
 * `podeTentarOutroCanal` no domínio.
 *
 * `consultar` existe para quando o callback se perde. É o caminho de LEITURA, e ele não é
 * luxo: sem ele, a cascata cai de `pendente` para o próximo canal e emite o mesmo documento
 * duas vezes.
 *
 * ── ⚠️ CREDENCIAL NENHUMA APARECE AQUI ──
 *
 * Nem certificado, nem senha de PFX, nem `master_key`. Mesma regra de `EmissorFiscal`: o
 * adaptador pega o que precisa do ambiente e descarta. Consequência concreta — nenhuma
 * credencial atravessa o núcleo, então nenhuma entra em argumento de caso de uso, em log, ou
 * num `console.log` de depuração escrito às três da manhã. `arquitetura.test.ts` prende isso.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type {
  DesfechoDeRecibo, EmissorCredenciado, PedidoDeRecibo, ReciboAceito,
} from "../../dominio/recibo-unitario";

export interface EmissorDeReciboSaude {
  /** Qual canal é este. Vai gravado na linha do livro-razão — ver `CanalDeEmissao`. */
  readonly canal: "automacao" | "rebots";

  /**
   * ★ O PROTOCOLO DESTE CANAL É A REFERÊNCIA QUE MANDAMOS — logo, é conhecido ANTES da chamada.
   *
   * Quando é `true`, o caso de uso grava o protocolo na linha **antes** de falar com o canal. Isso
   * fecha uma corrida real: o callback pode chegar durante a própria chamada de emissão, e a rota
   * de callback encontra a linha pelo protocolo. Sem isso ela responde 404 e o desfecho se perde —
   * medido em 26/08/2026, no sandbox da Rebots, que dispara o callback de forma **síncrona** dentro
   * do `POST /receipts`. Em produção a janela é menor, não inexistente.
   *
   * `false` = o canal cunha o protocolo e só o revela na resposta (nada a fazer antes). Nesse caso
   * a linha fica um instante como `pendente` sem protocolo, e é a reconciliação que a resgata.
   */
  readonly protocoloEhNossaReferencia: boolean;

  /**
   * Habilita a profissional no canal.
   *
   * Idempotente por contrato: chamar duas vezes com o mesmo CPF não pode criar dois emissores
   * nem falhar. O onboarding roda isto sempre que ela salva a configuração fiscal, e ninguém
   * vai lembrar de conferir antes.
   */
  cadastrarEmissor(t: ContextoTenant, e: EmissorCredenciado): Promise<void>;

  /**
   * Manda o recibo.
   *
   * ⚠️ QUEM CHAMA JÁ TEM QUE TER PRENDIDO O PAGAMENTO. Esta porta não sabe o que é atendimento
   * nem lote; ela emite o que lhe derem, quantas vezes lhe pedirem. A garantia de "uma vez só"
   * é do caso de uso e do banco, como em `abrirLote`.
   *
   * Lança quando o canal recusa o PEDIDO (dado inválido, emissor não habilitado). Recusa da
   * RECEITA não vem por aqui — vem no callback, minutos depois, e é `recusado`.
   */
  emitir(t: ContextoTenant, e: EmissorCredenciado, p: PedidoDeRecibo): Promise<ReciboAceito>;

  /**
   * Onde o recibo está, segundo o canal. **O caminho de leitura da cascata.**
   *
   * Devolve `null` quando o canal não conhece o protocolo — o que é resposta útil: significa
   * que o pedido nunca chegou, e aí tentar de novo é seguro.
   */
  consultar(t: ContextoTenant, protocolo: string): Promise<DesfechoDeRecibo | null>;

  /**
   * Cancela um recibo emitido.
   *
   * ⚠️ DEZ DIAS, contados da emissão (art. 7º da IN RFB 2.240/2024). Depois disso não há
   * cancelamento, e o conserto é problema de contador. A porta não valida o prazo — o domínio
   * valida, porque prazo é regra e não detalhe de fornecedor.
   *
   * ── ⚠️ POR QUE OS TRÊS CAMPOS, E POR QUE ANTES ERAM DOIS ERRADOS ──
   *
   * A assinatura era `{ chave, motivo }`, e as duas metades estavam furadas. Medido no sandbox
   * da Rebots em 25/08/2026:
   *
   *   · `protocolo` E NÃO `chave`. O cancelamento se identifica pelo `receipt_id` — o número que
   *     NÓS cunhamos — e não pela chave que a Receita devolveu. Mandar a chave é falar de um
   *     documento com um nome que o canal não usa para achá-lo.
   *   · `emissor` PORQUE FALTAVA. Sem ele não há `issuer_code`, e a API responde
   *     `RECEIPT_ERROR_005 Missing field: issuer_code`. **Nenhum cancelamento passava.**
   *
   * O emissor entra inteiro, e não só o CPF, pelo mesmo motivo de `emitir`: quem decide qual
   * campo do profissional o canal quer é o adaptador do canal.
   */
  cancelar(t: ContextoTenant, p: {
    emissor: EmissorCredenciado;
    protocolo: string;
    motivo: string;
  }): Promise<void>;
}

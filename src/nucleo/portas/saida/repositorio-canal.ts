/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — a linha de `integracoes_whatsapp` do inquilino.
 *
 * O provedor sabe se a instância está pareada; só o NOSSO banco sabe de quem ela é. Essa
 * é a divisão: `ProvisionamentoDeCanal` fala com a Evolution, esta porta responde "qual
 * instância pertence a este negócio" — a pergunta que o webhook faz ao contrário
 * (`entrada/whatsapp/contexto.ts` resolve o inquilino pelo nome da instância que chegou).
 *
 * ⚠️ `instancia` é UNIQUE global na DDL (`002_multitenant.sql:740`), e é o que sustenta
 * essa resolução reversa: se dois inquilinos pudessem ter o mesmo nome de instância, uma
 * mensagem que chega não teria dono definido — e o desempate seria entregar a conversa de
 * um cliente para o painel de outro.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { Canal, StatusDoCanal } from "../../dominio/canal";

export interface RepositorioCanal {
  /** `null` quando o negócio nunca conectou nada. É o estado do cliente novo. */
  ler(t: ContextoTenant): Promise<Canal | null>;

  /**
   * Cria ou atualiza a linha do inquilino.
   *
   * Upsert e não insert: reconectar é o caminho comum (trocou de celular, caiu o
   * pareamento, mudou de número), e nele a linha já existe. Um insert obrigaria todo
   * chamador a saber de antemão se é a primeira vez — informação que ele não tem sem uma
   * leitura a mais, e que o banco já tem.
   */
  salvar(t: ContextoTenant, p: {
    instancia: string;
    status: StatusDoCanal;
    numero?: string | null;
  }): Promise<Canal>;

  /**
   * Quem recebe a escalação deste canal. `null` apaga (volta a "ninguém é avisado").
   *
   * ── POR QUE NÃO É UM CAMPO DE `salvar` ──
   *
   * Porque `salvar` é chamado no caminho de CONECTAR e DESCONECTAR, com os campos daquele
   * momento. Um `telefoneDono` opcional ali seria apagado toda vez que alguém reconectasse
   * o WhatsApp sem passar o valor — e o sintoma seria a escalação parar de chegar dias
   * depois, sem ninguém relacionar as duas coisas.
   *
   * Método próprio torna impossível apagar por omissão: só apaga quem passar `null` de
   * propósito.
   */
  definirDono(t: ContextoTenant, telefone: string | null): Promise<void>;
}

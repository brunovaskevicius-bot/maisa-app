/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — a fila de lembretes a enviar.
 *
 * ⚠️ A ÚNICA PORTA DO SISTEMA QUE NÃO RECEBE `ContextoTenant`, junto com
 * `ProvisionadorDeNegocio` — e pelo motivo OPOSTO ao dele. Aquele não recebe porque
 * PRODUZ o inquilino; esta não recebe porque a pergunta que ela faz é sobre TODOS eles:
 * "quem tem lembrete para mandar na próxima hora?".
 *
 * Uma rotina agendada não tem sessão, não tem dono, e não pode ter um inquilino escolhido
 * de fora — se tivesse, alguém precisaria decidir qual, e essa decisão seria um parâmetro
 * por onde disparar a rotina de outra pessoa.
 *
 * ── O LIMITE DA EXCEÇÃO, ESCRITO ──
 *
 * Ela devolve `tenantId` em cada item, e TUDO que acontece depois é por inquilino: o caso
 * de uso monta um `ContextoTenant` com ator `sistema` para cada linha e envia por ele. A
 * porta que atravessa inquilinos é esta, e só ela. Se um segundo método cross-tenant
 * aparecer aqui, ou se alguma outra porta perder o `ContextoTenant`, é regressão — e é
 * por isso que `arquitetura.test.ts` mantém a lista de exceções e falha quando ela muda.
 *
 * ── RESERVAR NÃO É LER ──
 *
 * `reservar` marca a linha como enviada NO MESMO PASSO em que a devolve. Ler e marcar
 * depois é o bug clássico da rotina agendada: duas execuções sobrepostas leem a mesma
 * lista e mandam o mesmo lembrete duas vezes. O nome do método diz isso — quem escrever
 * um `listar()` ao lado está reabrindo o problema.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { LembretePendente } from "../../dominio/lembretes";

export interface FilaDeLembretes {
  /**
   * Reserva os atendimentos que começam até `ate` e ainda não receberam lembrete.
   *
   * Devolve só o que ESTA chamada conseguiu reservar. Uma execução concorrente que peça a
   * mesma janela recebe uma lista disjunta — nunca a mesma linha duas vezes.
   */
  reservar(ate: Date, limite: number): Promise<LembretePendente[]>;

  /**
   * Devolve a reserva de um atendimento cujo envio falhou, para a próxima rodada tentar.
   *
   * Não lança: é chamado dentro do tratamento de um erro que já vai ser reportado, e um
   * segundo erro aqui só trocaria a mensagem certa por outra.
   */
  devolver(id: string): Promise<void>;

  /** O que falta no ambiente para esta porta funcionar. Vazio = pronta. */
  faltando(): string[];
}

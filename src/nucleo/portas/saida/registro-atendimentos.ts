/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o ESPELHO do que a MAISA marcou.
 *
 * ⚠️ Leia isto antes de usar, porque a tentação de usar errado é grande.
 *
 * A verdade dos horários é a AGENDA EXTERNA, não esta porta. `supabase/LEIA-ME.md` §3.1
 * escreveu a invariante em voz alta: **não desenhe tela de agenda a partir daqui.** Um
 * evento criado direto no Google não passa por esta porta, então uma grade montada a
 * partir do espelho mentiria — e mentiria justamente no caso que mais acontece, o dono
 * marcando um encaixe no celular.
 *
 * Então por que ela existe? Porque três perguntas não têm resposta no Google:
 *
 *   1. IDEMPOTÊNCIA sem ida ao provedor — `unique (tenant_id, maisa_ag)`. Hoje o caso de
 *      uso procura a marca VARRENDO dias de agenda. O painel faz isso uma vez por clique;
 *      um modelo de linguagem que não recebeu a resposta retenta sozinho, e não pode
 *      pagar uma varredura de agenda por tentativa.
 *   2. FATURAMENTO — `Cliente.atendimentos` e `Cliente.valor` são a base da nota do mês.
 *      Não há como somar a competência a partir do Google sem reler a agenda inteira a
 *      cada abertura de tela.
 *   3. AUDITORIA DO ATOR — `dominio/tenant.ts` pede que um atendimento criado pela IA
 *      seja distinguível de um criado à mão. O Google guarda o texto da descrição, não
 *      quem escreveu. É o que vai responder "quantos horários a MAISA marcou sozinha?".
 *
 * ⚠️ GRAVAR AQUI NUNCA PODE DERRUBAR UM AGENDAMENTO. O espelho é escrito DEPOIS de o
 * provedor confirmar, e se a escrita falhar o atendimento continua existindo — porque
 * ele existe no Google, que é a verdade. Lançar daqui produziria o pior resultado
 * possível: o evento criado na agenda do dono e o cliente ouvindo "não deu certo".
 * Quem implementa esta porta registra a falha em log e devolve normalmente.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";

/**
 * Uma linha do espelho. Desnormalizada de propósito, igual a `AtendimentoMarcado`: o
 * valor cobrado é fato fiscal (mudar o preço da tabela não reescreve o passado) e o
 * serviço pode não existir no cadastro (criado pelo usuário na tela).
 */
export type LinhaDeAtendimento = {
  /** A chave de idempotência que quem pediu cunhou. É o `unique` da tabela. */
  maisaAg: string;
  /** Qual agenda — hoje o id do profissional. Precisa existir no cadastro (FK composta). */
  agendaId: string;

  /** `null` quando quem marcou não está no cadastro. O snapshot abaixo preserva o dado. */
  clienteId: string | null;
  clienteNome: string;
  clienteTel: string;
  /** `null` quando o serviço não é do catálogo. A coluna não tem FK justamente por isso. */
  servicoId: string | null;
  servicoNome: string;
  servicoValor: number;

  /** Instante absoluto — é a verdade, e o que se compara. */
  inicioISO: string;
  fimISO: string;
  duracaoMin: number;
  /**
   * A PROJEÇÃO CIVIL no fuso do negócio: "2026-08-14" e 14.5.
   *
   * Calculada por quem escreve, e não por coluna gerada, porque coluna gerada no
   * Postgres não consegue ler o fuso da outra tabela. É o que a tela e o fechamento
   * fiscal pensam ("06/08", "14:30"), e não UTC.
   */
  dataLocal: string;
  horaInicio: number;

  /** O evento lá fora. `null` num provedor que não devolva id. */
  eventoId: string | null;
  meetLink: string | null;
  htmlLink: string | null;
};

export interface RegistroDeAtendimentos {
  /**
   * Grava (ou reconhece) a linha do espelho. **Idempotente por `maisaAg`**: chamar duas
   * vezes com a mesma chave não cria duas linhas — é a mesma proteção que o caso de uso
   * já tem contra o modelo que retenta.
   *
   * Não lança. Ver o ⚠️ do cabeçalho.
   */
  registrar(t: ContextoTenant, a: LinhaDeAtendimento): Promise<void>;

  /**
   * Marca como cancelado. **Não apaga**: o histórico de quem desmarca é informação do
   * negócio, e é isso que a coluna `situacao` existe para guardar.
   *
   * Não lança, pela mesma razão do `registrar`.
   */
  cancelar(t: ContextoTenant, p: { eventoId: string }): Promise<void>;
}

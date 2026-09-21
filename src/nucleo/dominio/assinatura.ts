/* ─────────────────────────────────────────────────────────────────────────────
 * ASSINATURA — o que a MAISA cobra, em linguagem de domínio.
 *
 * ⚠️ PREÇO NÃO MORA AQUI, E ISSO É A DECISÃO CENTRAL DESTE ARQUIVO.
 *
 * O produto já tem uma fonte única de preço — `app/(marketing)/_lib/planos.ts` — e ela
 * nasceu exatamente para matar seis preços digitados em quatro arquivos. Copiar `R$ 197`
 * para cá seria reabrir o buraco pelo lado do núcleo, com o agravante de que o valor
 * REALMENTE cobrado passa a ser um terceiro número: o do objeto Price no provedor.
 *
 * Então a divisão é:
 *   · a CHAVE do plano ....... aqui (é conceito de domínio: existe sem provedor nenhum)
 *   · o preço EXIBIDO ........ `_lib/planos.ts` (é copy de landing page)
 *   · o preço COBRADO ........ o provedor, e o webhook grava o que ele disser
 *
 * O núcleo nunca afirma quanto custa. Ele registra quanto foi cobrado.
 *
 * O núcleo também não importa `_lib/planos.ts`: aquilo vive em `app/`, e a seta
 * apontaria para fora do hexágono. A ponte é `assinatura.test.ts`, que lê os dois e
 * reprova se as chaves divergirem — garantia por teste, não por boa vontade.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Os três planos. Mesma chave usada em `_lib/planos.ts` e no `metadata.plano` do provedor. */
export type ChaveDePlano = "essencial" | "profissional" | "escala";

export const PLANOS: readonly ChaveDePlano[] = ["essencial", "profissional", "escala"] as const;

export function ehChaveDePlano(x: unknown): x is ChaveDePlano {
  return typeof x === "string" && (PLANOS as readonly string[]).includes(x);
}

/**
 * Os quatro estados que a tela sabe desenhar. São os mesmos do `check` da coluna
 * `assinaturas.status` (`002_multitenant.sql`) — um quinto valor aqui viraria erro de
 * constraint no INSERT, horas depois, dentro do webhook, onde ninguém está olhando.
 */
export type StatusAssinatura = "trial" | "ativa" | "inadimplente" | "cancelada";

/**
 * Quem está cobrando. Espelha o `check` da coluna `assinaturas.provedor` (028).
 *
 * `null` é o estado de quem nunca pagou: o inquilino nasce em `trial`
 * (`005_provisionar.sql`) sem conta em gateway nenhum.
 */
export type Provedor = "stripe" | "abacatepay";

/**
 * Como esta pessoa paga. Espelha o `check` de `assinaturas.metodo` (028).
 *
 * ⚠️ EXISTE PORQUE A TELA ESTAVA MENTINDO. `cartaoMarca`/`cartaoFinal4` eram as duas
 * únicas pistas de forma de pagamento, e quem paga por Pix não tem nenhuma das duas —
 * ficava indistinguível de um cartão que o provedor não informou, e a tela escrevia
 * "Cartão final ····" para quem nunca usou cartão.
 *
 * Sem cedilha de propósito: é valor que atravessa driver, JSON e comparação de string.
 * O rótulo com acento é da UI.
 */
export type MetodoDePagamento = "pix" | "cartao";

/** O que a MAISA sabe sobre a cobrança de um inquilino. Espelha a tabela `assinaturas`. */
export type Assinatura = {
  plano: string;
  /** Em reais, como o provedor cobrou. `null` enquanto ninguém pagou nada. */
  preco: number | null;
  moeda: string;
  status: StatusAssinatura;
  /** Qual gateway carrega esta linha. `null` = ninguém pagou ainda. */
  provedor: Provedor | null;
  /** Ids do provedor. Guardados para reconciliar, nunca para exibir. */
  clienteId: string | null;
  assinaturaId: string | null;
  /**
   * Vira o "próxima cobrança" da tela. ISO `YYYY-MM-DD`.
   *
   * ⚠️ NA ABACATEPAY ESTE CAMPO É CALCULADO POR NÓS, não informado. O objeto de
   * assinatura deles não tem campo de fim de período nenhum — medido em 21/09/2026, a
   * busca por `nextBilling`/`periodEnd`/`currentPeriod` na documentação inteira não
   * retorna nada. `entrada/abacatepay/eventos.ts` deriva de `frequency` + a data do
   * último pagamento. Na Stripe o valor é dela, e vem do ITEM da assinatura.
   */
  periodoFim: string | null;
  trialFim: string | null;
  /** Pix ou cartão. `null` enquanto ninguém pagou. */
  metodo: MetodoDePagamento | null;
  /** O "Cartão final 4417". Nunca o número. Sempre `null` quando `metodo` é `pix`. */
  cartaoMarca: string | null;
  cartaoFinal4: string | null;
};

/**
 * Status da Stripe → o nosso.
 *
 * ⚠️ O DESCONHECIDO CAI EM `inadimplente`, NÃO EM `ativa`. É a única escolha segura:
 * a Stripe acrescenta status novo sem avisar (`paused` apareceu assim), e um `default`
 * permissivo entregaria o produto de graça a um estado que ninguém leu ainda. Errar para
 * o lado restritivo gera um chamado de suporte; errar para o outro gera um vazamento de
 * receita que só aparece no fechamento do mês.
 *
 * `incomplete` é o caso brasileiro que mais vai acontecer: boleto emitido e ainda não
 * pago. Não é inadimplência moral, mas é ausência de pagamento — e para efeito de acesso
 * as duas coisas são a mesma.
 *
 * Chamava-se `statusDoProvedor` até a AbacatePay entrar. O nome genérico prometia servir
 * para qualquer gateway, e `statusDaAbacatePay` logo abaixo é a prova de que não serve:
 * os dois vocabulários não têm nem o mesmo formato de entrada.
 */
export function statusDaStripe(bruto: string): StatusAssinatura {
  switch (bruto) {
    case "trialing":
      return "trial";
    case "active":
      return "ativa";
    case "canceled":
    case "incomplete_expired":
      return "cancelada";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
      return "inadimplente";
    default:
      return "inadimplente";
  }
}

/**
 * Status da AbacatePay → o nosso.
 *
 * ── ⚠️ POR QUE ESTA FUNÇÃO RECEBE O EVENTO, E A DA STRIPE NÃO ──
 *
 * Porque na AbacatePay **o status da assinatura não conta a inadimplência.** Medido nos
 * payloads documentados em 21/09/2026: o objeto `subscription` tem exatamente dois
 * estados de vida — `ACTIVE` e `CANCELLED` — e no evento `subscription.payment_failed`
 * ele continua vindo `ACTIVE`. A cobrança do ciclo falhou, o dinheiro não entrou, e o
 * campo que deveria dizer isso diz "ativa".
 *
 * Quem traduzir só o campo `status` vai liberar o produto para quem parou de pagar, e vai
 * fazer isso sem erro em lugar nenhum — o mesmo modo de falha que o `default` permissivo
 * da Stripe teria, por um caminho diferente. Então a notícia está no TIPO DO EVENTO, e é
 * por isso que ele entra como parâmetro.
 *
 * A retentativa deles é automática (`retryPolicy`, 3 tentativas por padrão). Enquanto ela
 * corre, a assinatura fica `inadimplente` aqui: é ausência de pagamento, e para efeito de
 * acesso ausência de pagamento é uma só. Se uma tentativa passar, chega
 * `subscription.renewed` e a linha volta para `ativa` sozinha.
 *
 * ⚠️ `CANCELLED` NA ABACATEPAY É IMEDIATO. Não existe "cancela ao fim do período pago"
 * como na Stripe — a documentação é explícita ("o cliente perde o acesso imediatamente",
 * `cancelPolicy: NOW`). Por isso `cancelada` aqui significa acesso encerrado agora, e não
 * acesso até `periodoFim`.
 */
export function statusDaAbacatePay(e: {
  /** `subscription.status` do payload: `ACTIVE` ou `CANCELLED`. */
  status: string;
  /** O evento que trouxe a notícia — `subscription.renewed`, `…payment_failed`, etc. */
  evento: string;
  /** `trialEndsAt` ainda no futuro. A AbacatePay não tem status de trial. */
  emTrial?: boolean;
}): StatusAssinatura {
  /* ★ PRIMEIRO O EVENTO, DEPOIS O CAMPO. A ordem é a decisão: `payment_failed` chega com
   * `status: "ACTIVE"`, então conferir o campo antes devolveria `ativa` e a função
   * inteira perderia o propósito. */
  if (e.evento === "subscription.payment_failed") return "inadimplente";

  switch (e.status) {
    case "CANCELLED":
      return "cancelada";
    case "ACTIVE":
      /* Trial é derivado, não informado: a assinatura com trial nasce `ACTIVE` e o que a
       * distingue é `trialEndsAt` no futuro. Ver `subscription.trial_started`. */
      return e.emTrial ? "trial" : "ativa";
    default:
      /* Mesma regra da Stripe, e pela mesma razão: status que ninguém leu ainda não
       * libera o produto. `PENDING`, `EXPIRED` e `REFUNDED` existem no vocabulário de
       * CHECKOUT deles e podem vazar para cá numa mudança de payload — e os três
       * significam "não há pagamento vigente". */
      return "inadimplente";
  }
}

/** Esta assinatura dá direito a usar o produto hoje? */
export function liberada(a: Pick<Assinatura, "status">): boolean {
  return a.status === "trial" || a.status === "ativa";
}

/**
 * `frequency` da AbacatePay → dias, para calcular o `periodoFim` que eles não informam.
 *
 * ⚠️ MÊS APROXIMADO POR 30 DIAS, E ISSO É ERRO ACEITO. A alternativa honesta seria somar
 * um mês de calendário, mas o campo alimenta o "próxima cobrança" da tela — informação de
 * orientação, não de cobrança. Quem cobra é a AbacatePay, no dia que ela decidir. Errar
 * em um ou dois dias num texto de tela é barato; parecer preciso e estar errado é que
 * custa, e é por isso que este comentário existe em vez de um `date-fns`.
 */
export function diasDoCiclo(frequency: string): number | null {
  switch (frequency) {
    case "WEEKLY":
      return 7;
    case "MONTHLY":
      return 30;
    case "QUARTERLY":
      return 90;
    case "SEMIANNUALLY":
      return 182;
    case "ANNUALLY":
      return 365;
    default:
      /* `null` e não um palpite: sem ciclo conhecido, a tela mostra "—", que é verdade.
       * Um default de 30 dias inventaria uma data de cobrança para um ciclo que ninguém
       * leu ainda. */
      return null;
  }
}

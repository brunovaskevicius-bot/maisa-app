/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTE ADAPTADOR LÊ DO AMBIENTE. ⚠️ SÓ SERVIDOR — nada de `NEXT_PUBLIC_`.
 *
 * Duas variáveis e um mapa, pelo mesmo desenho de `saida/stripe/config.ts`. Vale a pena
 * ler o cabeçalho de lá: a decisão de NÃO pôr id de produto em variável de ambiente é a
 * mesma aqui, e o modo de falha também.
 *
 * ── ⚠️ O AMBIENTE VEM DA CHAVE, NÃO DA URL ──
 *
 * A AbacatePay tem UM endpoint (`api.abacatepay.com/v2`) para teste e produção. Quem
 * decide é o prefixo da chave: `dev_` simula, `prod_` cobra de verdade.
 *
 * Isso é pior do que parece, e é a razão de `ehProducao` existir logo abaixo. Na Stripe
 * uma chave de sandbox colada na produção falha alto — `No such price`, e o `sk_test_`
 * nem consegue ler o catálogo live. Aqui os dois mundos atendem no mesmo lugar, com o
 * mesmo formato de resposta: uma chave `dev_` em produção **funciona**, devolve 200,
 * mostra um QR Code de Pix bonito na tela, e não cobra ninguém. O produto parece vendido
 * e não entrou dinheiro. Ninguém descobre até o fechamento do mês.
 *
 * Por isso o prefixo é lido e exposto: o painel e o log dizem em que mundo estamos, em
 * vez de a gente descobrir pelo extrato.
 *
 * ── ⚠️ O SEGREDO DO WEBHOOK NÃO É UM HMAC SECRET ──
 *
 * `ABACATEPAY_WEBHOOK_SECRET` é o valor que NÓS escolhemos ao cadastrar o webhook no
 * painel deles, e a AbacatePay o devolve **na query string** de cada POST
 * (`?webhookSecret=…`). Ele é a única coisa que autentica a chamada. Ver o cabeçalho de
 * `entrada/abacatepay/eventos.ts` para o porquê de o HMAC não servir para isso.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ChaveDePlano } from "@/nucleo/dominio/assinatura";

/** A Vercel guarda o valor cru: colar com aspas ou espaço é comum, e quebra silencioso. */
const limpa = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "");

/**
 * A chave de API. `dev_…` ou `prod_…`, e é ela que escolhe o ambiente.
 *
 * ⚠️ DÊ A ELA SÓ AS PERMISSÕES QUE ESTA INTEGRAÇÃO USA. O painel deles permite escopo por
 * recurso, e a lista completa está no `LEIA-ME.md` ao lado. A permissão que NÃO deve
 * entrar é `WITHDRAW:CREATE`: saque manda dinheiro para fora da conta, e nada neste
 * código saca. Uma chave que não saca é uma chave que não esvazia a conta se vazar.
 */
export const CHAVE = limpa(process.env.ABACATEPAY_API_KEY);

/**
 * O segredo que volta na query string do webhook. **Outro segredo**, escolhido por nós no
 * cadastro do endpoint — não é a chave de API e não é derivado dela.
 *
 * Use valor longo e aleatório (`openssl rand -hex 32`). Ele viaja na URL, e URL aparece em
 * log de acesso: um segredo curto ou adivinhável aqui é a porta do webhook aberta. Ver o
 * `LEIA-ME.md` de `entrada/abacatepay/`.
 */
export const SEGREDO_WEBHOOK = limpa(process.env.ABACATEPAY_WEBHOOK_SECRET);

/** Um endpoint só para os dois mundos. Quem separa é a chave. */
export const BASE = "https://api.abacatepay.com/v2";

export const estaConfigurado = Boolean(CHAVE);

/**
 * Esta chave cobra dinheiro de verdade?
 *
 * Existe porque o mesmo endpoint atende teste e produção: sem olhar o prefixo, não há
 * como o log dizer em que mundo o pagamento aconteceu. É a diferença entre "o cliente
 * pagou" e "o cliente clicou num QR Code de mentira".
 */
export const ehProducao = CHAVE.startsWith("prod_");

export function faltando(): string[] {
  return CHAVE ? [] : ["ABACATEPAY_API_KEY"];
}

export function faltandoWebhook(): string[] {
  const faltam = faltando();
  if (!SEGREDO_WEBHOOK) faltam.push("ABACATEPAY_WEBHOOK_SECRET");
  return faltam;
}

/**
 * Plano → `externalId` do produto no catálogo da AbacatePay.
 *
 * ── POR QUE `externalId` E NÃO O `prod_…` ──
 *
 * É a mesma decisão que a `lookup_key` da Stripe resolve, pelo mesmo motivo escrito lá:
 * `prod_…` é um valor opaco que precisaria ser digitado à mão em três ambientes (local,
 * preview, produção), não quebra build quando está errado, e tem um modo de falha
 * silencioso — `prod_…` de um produto ANTIGO da mesma conta responde 200 e cobra o preço
 * velho, com o cartão na mão do cliente.
 *
 * `externalId` é um nome que NÓS escolhemos. A AbacatePay o trata como "identificador
 * único do produto no seu sistema", e `GET /products/list` devolve o campo — então dá
 * para resolver `externalId → prod_…` em runtime, exatamente como `idDoPreco` faz na
 * Stripe, com cache de processo. A mesma linha de código acha o produto de teste com a
 * chave `dev_` e o de produção com a `prod_`.
 *
 * ⚠️ ESTES TRÊS PRODUTOS TÊM QUE EXISTIR NA CONTA, com `cycle: "MONTHLY"` e o preço em
 * centavos batendo com `_lib/planos.ts`. Quem cria é `npm run abacate:catalogo`; o que
 * cobra que os preços batam é `planos.test.ts`.
 */
export const CATALOGO: Record<ChaveDePlano, string> = {
  essencial: "maisa-essencial-mensal",
  profissional: "maisa-profissional-mensal",
  escala: "maisa-escala-mensal",
};

/**
 * Os métodos que o checkout de assinatura oferece.
 *
 * ── ⚠️ PIX EM ASSINATURA DEPENDE DE A CONTA TER O RECURSO LIGADO ──
 *
 * Medido na documentação em 21/09/2026, e ela se contradiz — o que é o motivo deste
 * comentário existir em vez de um `["PIX"]` solto:
 *
 *   · o changelog de 15/05/2026 diz que lojas com **PIX Automático habilitado** podem
 *     criar assinaturas com `methods: ["PIX"]`, e que antes só havia cartão;
 *   · o OpenAPI de `/subscriptions/create`, na MESMA documentação, ainda descreve o campo
 *     como "Assinaturas suportam apenas CARD".
 *
 * Uma das duas frases está velha. Enquanto não houver medição contra a conta real, a
 * lista manda os DOIS: se o Pix recorrente estiver ligado, a pessoa escolhe no checkout;
 * se não estiver, sobra o cartão e a venda acontece. A ordem importa — Pix primeiro é o
 * que o cliente brasileiro procura, e é onde a taxa é centavos em vez de percentual.
 *
 * ⚠️ MANDAR SÓ `["PIX"]` numa conta sem o recurso é a falha que fecha a loja: o
 * `create` recusa, o botão "assinar" devolve erro, e ninguém compra. Os dois juntos
 * degradam para cartão em vez de quebrar. Pedir a habilitação ao suporte deles está no
 * `LEIA-ME.md`, e é um item de operação, não de código.
 */
export const METODOS = ["PIX", "CARD"] as const;

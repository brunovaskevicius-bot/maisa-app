# `saida/abacatepay/` — AbacatePay (checkout de assinatura com Pix)

Cumpre `Cobranca`. **⚠️ Só servidor** — nenhuma chave chega ao navegador.

O lado que RECEBE (webhook) é [`adaptadores/entrada/abacatepay/`](../../entrada/abacatepay/).
Os dois compartilham `config.ts` de propósito: duplicar o segredo criaria duas
configurações capazes de divergir, e o sintoma seria o webhook recusando 100% dos eventos
enquanto o checkout cobra normalmente.

## Por que ela existe, se já havia Stripe

Porque **a Stripe não faz Pix recorrente em conta brasileira.** Está medido e escrito em
[`saida/stripe/LEIA-ME.md`](../stripe/LEIA-ME.md): assinatura em conta BR é cartão
(Visa/Mastercard — Elo, Hipercard e Amex ficam de fora) ou boleto.

Num produto de R$ 127/mês vendido no Brasil isso custa duas vezes:

| | Stripe (cartão) | AbacatePay (Pix) |
|---|---|---|
| Taxa por cobrança | percentual + fixo | **R$ 0,80 por parcela** |
| Em R$ 127 | ~R$ 5,4 | R$ 0,80 |
| Em R$ 197 | ~R$ 8,2 | R$ 0,80 |
| Elo / Hipercard | não | cartão: 3,5% + R$ 0,60 |

E custa na conversão, que é o lado que não aparece em planilha: Pix é como o país paga.

> Os números de taxa vêm da página comercial deles e **não estão medidos contra a conta
> real**. Confirmar no extrato da primeira cobrança antes de usar em proposta.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `config.ts` | As duas env vars, o `CATALOGO` (plano → `externalId`) e `METODOS`. ⚠️ **Id de produto não é env var** — leia o cabeçalho antes de "simplificar" |
| `cliente.ts` | `fetch` à mão, com retry, teto de 8s e o desembrulho do envelope. ⚠️ **erro vem com HTTP 200** |
| `cobranca-abacatepay.ts` | `abrirCheckout`, `cancelar`, `capacidades`. Resolve `externalId → prod_…` com cache de processo |

## ⚠️ As cinco armadilhas desta API

Nenhuma é hipótese — todas saem da documentação lida em 21/09/2026.

1. **Erro chega com HTTP 200.** Toda resposta é `{ data, error, success }`. Dá para
   receber 200 com `{ data: null, error: "…" }`. Quem escrever `const { data } =
   await r.json()` e seguir recebe `undefined`, a tela manda o navegador para
   `about:blank#undefined`, e quem ia pagar R$ 197 vê uma página branca. Sem log.
   → resolvido em `chamar()`, que lança em vez de devolver algo ignorável.

2. **⚠️ `dev_` e `prod_` atendem no MESMO endpoint.** Não há URL de sandbox. Uma chave
   `dev_` em produção **funciona**: responde 200, desenha um QR Code bonito e não cobra
   ninguém. O produto parece vendido e não entrou dinheiro.
   → `ehProducao` existe por isso, e `composicao.ts` grita no boot.

3. **Valores em centavos.** `10000` = R$ 100,00. Mandar reais cobra 100× menos.

4. **Cliente é único por CPF/CNPJ, não por e-mail.** A documentação promete deduplicação
   por `taxId` — e nós **não temos** o CPF/CNPJ neste ponto do funil (`/assinar/<plano>`
   pede três campos, e documento não é um deles). Sem `taxId`, dois cliques criam duas
   fichas. → o que impede é a nossa tabela: o `cust_…` é gravado na ida.

5. **Não há chave de idempotência.** A Stripe aceita `idempotencyKey`; aqui não há nada
   equivalente documentado. Dois cliques criam dois checkouts. O dano fica contido porque
   `assinaturas` tem `tenant_id` como PK — o que sobra é alguém pagar duas vezes de
   verdade, e isso é reembolso pelo painel.

## O catálogo — o contrato com a conta da AbacatePay

O código procura o produto por `externalId`, pelo mesmo desenho da `lookup_key` da Stripe.
Estes três têm que existir na conta da chave que está sendo usada, **`ACTIVE`**, com
`cycle: "MONTHLY"` e `currency: "BRL"`:

| Plano | `externalId` | Preço (centavos) |
|---|---|---|
| Essencial | `maisa-essencial-mensal` | `12700` |
| Profissional | `maisa-profissional-mensal` | `19700` |
| Escala | `maisa-escala-mensal` | `39700` |

Quem cria é `npm run abacate:catalogo` — idempotente, roda quantas vezes quiser.

**O valor exibido continua sendo o de [`_lib/planos.ts`](../../../app/\(marketing\)/_lib/planos.ts).**
Os dois têm que bater, e é `planos.test.ts` que cobra — a AbacatePay não sabe o que a
landing page promete.

⚠️ **Produto sem `cycle` não serve para assinatura**, e o erro deles não diz isso com
clareza. `idDoProduto` confere e lança uma mensagem que diz.

## Permissões da chave de API

O painel deles permite escopo por recurso. Dê só o que esta integração usa:

`CHECKOUT:CREATE` · `CHECKOUT:READ` · `CUSTOMER:CREATE` · `CUSTOMER:READ` ·
`PRODUCT:CREATE` · `PRODUCT:READ` · `SUBSCRIPTION:CREATE` · `SUBSCRIPTION:DELETE`

⚠️ **NÃO dê `WITHDRAW:CREATE`.** Saque manda dinheiro para fora da conta e nada neste
código saca. Uma chave que não saca é uma chave que não esvazia a conta se vazar.

Falta de permissão chega como **403**, não 401 — e confundir os dois começa com alguém
rotacionando a chave à toa. `erroDeHttp` separa os dois na mensagem.

## O que a AbacatePay NÃO faz

- **Não tem Billing Portal.** Nenhuma página hospedada onde a pessoa troque método, baixe
  fatura ou cancele sozinha. `abrirPortal` lança `NaoSuportado`; quem cumpre o "cancele
  quando quiser" da LP é `cancelar()`, e a tela pergunta `capacidades().portal` antes de
  desenhar o botão.
- **Cancelamento é imediato e irreversível.** `cancelPolicy: NOW`, sem carência — o
  cliente perde o acesso na hora. Diferente da Stripe, onde o portal cancela ao fim do
  período já pago. **A tela tem que confirmar antes.**
- **Não tem `GET` por id de assinatura.** Existe `/subscriptions/list`, que devolve
  *checkouts*. Isso derruba o padrão "releia na fonte" que o webhook da Stripe usa — ver
  o `LEIA-ME.md` de `entrada/abacatepay/`.
- **Não informa fim de período.** Nenhum campo de próxima cobrança no objeto de
  assinatura. Calculamos de `frequency` + data do último pagamento.

## ⚠️ Pix em assinatura depende de a conta ter o recurso ligado

A documentação se contradiz, e é por isso que `METODOS` manda **os dois**:

- o changelog de 15/05/2026 diz que lojas com **PIX Automático habilitado** podem criar
  assinaturas com `methods: ["PIX"]`;
- o OpenAPI de `/subscriptions/create`, na mesma documentação, ainda diz "Assinaturas
  suportam apenas CARD".

Mandar só `["PIX"]` numa conta sem o recurso **fecha a loja**: o `create` recusa e ninguém
compra. Os dois juntos degradam para cartão em vez de quebrar.

→ **Item de operação, não de código:** pedir a habilitação de Pix Automático ao suporte
(`ajuda@abacatepay.com`) e depois **medir** que o checkout mostra Pix.

## Os dois modos

| Situação | Resultado |
|---|---|
| sem `ABACATEPAY_API_KEY` | `composicao.ts` cai na Stripe, ou em `cobrancaDemo` se ela também faltar |
| com chave `dev_` | checkout real, pagamento **simulado**. O boot avisa |
| com chave `prod_` | cobra de verdade |

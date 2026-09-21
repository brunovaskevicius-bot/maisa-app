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
| `config.ts` | As env vars, o `CATALOGO` (plano → `externalId`), `METODOS` e `mundo`. ⚠️ **Id de produto não é env var** — leia o cabeçalho antes de "simplificar" |
| `cliente.ts` | `fetch` à mão, com retry, teto de 8s e o desembrulho do envelope. ⚠️ **erro vem com HTTP 200** |
| `cobranca-abacatepay.ts` | `abrirCheckout`, `cancelar`, `capacidades`. Resolve `externalId → prod_…` com cache de processo |

## ⚠️ As cinco armadilhas desta API

Nenhuma é hipótese — todas saem da documentação lida em 21/09/2026.

1. **Erro chega com HTTP 200.** Toda resposta é `{ data, error, success }`. Dá para
   receber 200 com `{ data: null, error: "…" }`. Quem escrever `const { data } =
   await r.json()` e seguir recebe `undefined`, a tela manda o navegador para
   `about:blank#undefined`, e quem ia pagar R$ 197 vê uma página branca. Sem log.
   → resolvido em `chamar()`, que lança em vez de devolver algo ignorável.

2. **⚠️ Teste e produção atendem no MESMO endpoint.** Não há URL de sandbox; quem separa
   é o prefixo da chave. Uma chave de teste em produção **funciona**: responde 200, desenha
   um QR Code bonito e não cobra ninguém. O produto parece vendido e não entrou dinheiro.
   → `mundo` existe por isso, e `composicao.ts` grita no boot. ⚠️ O prefixo real é
   `abc_dev_` / `abc_prod_`, **não** o `dev_`/`prod_` que a documentação descreve.

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

| Plano | `externalId` | Preço (centavos) | `prod_…` no sandbox |
|---|---|---|---|
| Essencial | `maisa-essencial-mensal` | `12700` | `prod_qFUThL3xAF6nFuxYSC0mbCs0` |
| Profissional | `maisa-profissional-mensal` | `19700` | `prod_uKa33aw6FSeJLxBqJ6bwqCQa` |
| Escala | `maisa-escala-mensal` | `39700` | `prod_Z6433z52fHE6Wq2rY41CUPHn` |

Os três foram criados em 21/09/2026 e conferidos com `cycle: MONTHLY` e `status: ACTIVE`.
Os ids acima são **do sandbox** e não valem em produção — o código nunca os digita, procura
por `externalId`.

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

## ★ O que foi MEDIDO na conta (21/09/2026)

Loja de sandbox `store_rcqED0KYAxkmcp4Aqn4cH6Wf` ("Maisa"), chave `abc_dev_…`:

| Chamada | Resultado |
|---|---|
| `subscriptions/create` `methods:["PIX","CARD"]` | ❌ `PIX Automático is not available for this store` |
| `subscriptions/create` `methods:["PIX"]` | ❌ mesma recusa |
| `subscriptions/create` `methods:["CARD"]` | ❌ `CARD is not available for this store` |
| `transparents/create` PIX (QR direto) | ✅ devolveu `brCode`, `devMode: true` |
| `checkouts/create` PIX em produto **sem** `cycle` | ✅ abriu a página de pagamento |

**Leitura:** Pix **avulso** funciona. **Recorrência está bloqueada nos dois trilhos** — nem
Pix Automático nem cartão. É capacidade de CONTA, não defeito de código, e só o suporte
deles liga.

### ⚠️ `methods` é CONJUNÇÃO, não preferência

Foi a suposição errada que este documento carregava até ser medido. A versão anterior
dizia "mandar os dois degrada para cartão se o Pix não estiver ligado". **É falso:** a API
recusa o pedido inteiro se QUALQUER método da lista faltar na loja. Mandar os dois não é a
opção segura — é falhar por dois motivos em vez de um.

Por isso `METODOS` virou `ABACATEPAY_METODOS`, padrão `PIX`. Só acrescente `CARD` depois
que o cartão estiver habilitado, senão o checkout inteiro para.

O erro tem classe própria (`NaoSuportado` → HTTP 501) com a mensagem dizendo o que fazer —
um 502 genérico mandaria quem investiga procurar rede, chave e timeout por horas.

→ **Item de operação:** pedir a habilitação de **Pix Automático** (e de cartão, se quiser
os dois) em `ajuda@abacatepay.com`, e depois **medir** de novo.

## ⚠️ Outras coisas medidas no mesmo dia

- **O prefixo real da chave é `abc_dev_`**, não `dev_` como a documentação diz. O código
  procura o segmento `_dev_`/`_prod_` e tem um terceiro estado (`desconhecido`) que grita
  no boot — adivinhar foi o que errou da primeira vez.
- **Eles validam dígito verificador de CPF.** `taxId: "12345678909"` volta
  `Invalid taxId`; `11144477735` passa.
- **`products/delete` quer o id na QUERY STRING**, não no corpo — com `id` no corpo devolve
  `Expected property 'id' to be string but found: undefined`. E exige `PRODUCT:DELETE`, que
  não está no escopo mínimo desta integração de propósito.
- **O erro vem mesmo com HTTP 200.** Confirmado na prática, não só na documentação.

## Os dois modos

| Situação | Resultado |
|---|---|
| sem `ABACATEPAY_API_KEY` | `composicao.ts` cai na Stripe, ou em `cobrancaDemo` se ela também faltar |
| com chave `dev_` | checkout real, pagamento **simulado**. O boot avisa |
| com chave `prod_` | cobra de verdade |

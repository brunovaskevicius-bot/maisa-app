# `saida/stripe/` — Stripe (Checkout + Billing Portal)

Cumpre `Cobranca`. **⚠️ Só servidor** — nenhuma chave chega ao navegador.

O lado que RECEBE (webhook) é `adaptadores/entrada/stripe/`. Os dois compartilham
`cliente.ts` e `config.ts` de propósito: duplicar o segredo criaria duas configurações
capazes de divergir, e o sintoma seria o webhook autenticando contra uma conta enquanto o
checkout cobra de outra.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `config.ts` | As duas env vars e o mapa `plano → lookup_key`. ⚠️ **Id de preço não é env var** — leia o cabeçalho antes de "simplificar". |
| `cliente.ts` | O `StripeClient`, um por processo. Sem `apiVersion` à mão: quem fixa é o SDK. |
| `cobranca-stripe.ts` | `abrirCheckout` e `abrirPortal`. Resolve `lookup_key → price` com cache de processo. |

## ⚠️ O que a Stripe NÃO faz no Brasil (medido em 21/09/2026)

Três coisas que parecem incluídas e não são. Cada uma já custou projeto para alguém:

- **Stripe Tax não existe para o Brasil.** BR não está na tabela de países aceitos — nem
  como localização da empresa, nem como localização do cliente. Ligar `automatic_tax` numa
  conta brasileira **não dá erro**: calcula zero e segue. Por isso nenhuma chamada deste
  adaptador passa `automatic_tax`, e nenhum produto tem `tax_code`. Colocar um daria a
  impressão de que imposto está tratado.
- **Nota fiscal é nossa.** A "Invoice" da Stripe é um documento de cobrança, não NFS-e.
  Quem vende o SaaS emite a própria nota pelo emissor de sempre. É por isso que o checkout
  liga `tax_id_collection`: sem CPF/CNPJ do tomador a nota não sai, e pedir depois é caçar
  cliente por WhatsApp no fechamento do mês.
- **Pix recorrente não existe em conta brasileira.** Pix Automático está disponível em
  outros países, e a linha do BR na documentação diz o contrário do resto da tabela:
  pagamento único, liquidação em BRL, **e por convite**. Assinatura em conta BR é cartão
  (Visa/Mastercard — Elo, Hipercard e Amex ficam de fora) ou boleto.

## Catálogo — o contrato com a conta da Stripe

O código procura o preço por `lookup_key`. Estas três têm que existir na conta de quem
cobra, ativas, recorrentes mensais em BRL:

| Plano | `lookup_key` |
|---|---|
| Essencial | `maisa_essencial_mensal_brl` |
| Profissional | `maisa_profissional_mensal_brl` |
| Escala | `maisa_escala_mensal_brl` |

Trocar um preço é criar o novo com `--transfer-lookup-key`, não editar o antigo: quem já
assinou continua no preço que contratou, e o código não precisa saber que houve mudança.

**O valor exibido continua sendo o de `app/(marketing)/_lib/planos.ts`.** Os dois têm que
bater, e é `planos.test.ts` que cobra — o Stripe não sabe o que a landing page promete.

## Os dois modos

| Situação | Resultado |
|---|---|
| sem `STRIPE_SECRET_KEY` | `composicao.ts` monta `cobrancaDemo`: o checkout "paga" na hora, em memória. É como se afina a tela sem conta. |
| com a chave | checkout real, na conta a que a chave pertence — teste ou produção, o código é o mesmo. |

## Coisas da vida real que estão codificadas aqui

- **`clean()` na config.** A Vercel guarda o valor cru, e colar com aspas é comum.
- **Chave restrita (`rk_`) em vez de `sk_`.** Esta integração precisa de Checkout, Billing
  Portal, Prices e Subscriptions. Uma chave que não pode transferir dinheiro é uma chave
  que não esvazia a conta se vazar.
- **`idempotencyKey` no checkout.** A rede cai entre o POST e a resposta, a pessoa clica de
  novo, e sem ela são duas sessões — logo, duas assinaturas possíveis para o mesmo negócio.
- **Nunca `payment_method_types`.** Omitir liga os métodos dinâmicos: o que aparece passa a
  ser decidido no painel. Fixar a lista congela o checkout em "cartão" e exige deploy para
  ligar boleto.
- **`customer` quando já existe, `customer_email` quando não.** Os dois juntos a Stripe
  recusa. Só `customer_email` cria ficha nova a cada clique, e duas fichas do mesmo negócio
  podem carregar duas assinaturas ativas.

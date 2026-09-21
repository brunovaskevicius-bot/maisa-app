# `entrada/stripe/` — o webhook da Stripe

Adaptador de **entrada**: o provedor de pagamento fala, isto vira vocabulário da MAISA.
Irmão de `entrada/whatsapp/` — mesmo problema (um POST sem cookie), mesma resposta (o
inquilino nasce de dado durável nosso, nunca de campo que o remetente escolhe).

A rota é `app/api/stripe/webhook/route.ts`, e ela é fina: confere, resolve, chama. Tudo
que decide alguma coisa está em `eventos.ts`.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `eventos.ts` | `verificar` (HMAC), `ehRelevante`, `assinaturaDoEvento`, `lerAssinaturaNaStripe`. |

## ⚠️ As quatro armadilhas, todas silenciosas

1. **`req.text()`, nunca `req.json()`.** O HMAC é sobre os bytes exatos. Reserializar
   reordena chaves e a conferência falha em 100% dos eventos — com uma mensagem
   (`No signatures found matching the expected signature`) que lê como segredo errado.

2. **`current_period_end` está no ITEM, não na assinatura.** Medido na API
   `2026-08-26.dahlia` em 21/09/2026: o objeto Subscription só tem `cancel_at_period_end`
   no topo. Quem escreve `sub.current_period_end` de memória recebe `undefined`, grava
   `periodo_fim = null`, e a tela mostra "próxima cobrança: —" para assinatura ativa.
   Sem erro em lugar nenhum.

3. **A fatura aponta para a assinatura em `parent.subscription_details.subscription`.**
   O campo `subscription` de topo saiu. Ler o antigo descarta o evento em silêncio — e
   os eventos de fatura são justamente os de inadimplência.

4. **Releitura, não mapeamento do evento.** A Stripe não garante ordem de entrega e
   reentrega quando o 200 demora. Mapear `event.data.object` grava estado velho por cima
   de estado novo, sob carga, sem reproduzir. Reler a assinatura na API faz qualquer
   ordem convergir e torna a reentrega inofensiva — ao custo de uma chamada por evento.

## De quem é o pagamento

Duas fontes, nessa ordem:

1. **`metadata.tenant_id`**, que `saida/stripe/cobranca-stripe.ts` carimbou na criação.
   Vai na assinatura *e* na sessão: a sessão some do horizonte, a assinatura fica.
2. **Reverso por `stripe_customer_id`** na nossa tabela. Cobre a assinatura criada à mão
   no painel da Stripe — que vai acontecer.

Sem nenhuma das duas, responde 200 e ignora, com log. Pagamento de quem não é nosso
acontece de verdade em conta compartilhada, e reentregar isso só enche o painel de
vermelho.

## Segredo

`STRIPE_WEBHOOK_SECRET` (`whsec_…`) é **outro segredo**, do cadastro do endpoint — não é
a chave de API. Cada endpoint tem o seu: o do `stripe listen` da CLI não é o da Vercel, e
trocá-los dá falha de assinatura num lado e silêncio no outro.

Sem ele no ambiente, a rota recusa tudo. Falha fechada porque a escrita roda com
service_role: um webhook que aceita qualquer POST deixa qualquer pessoa se dar plano
ilimitado escrevendo um JSON, e a RLS não salva ninguém.

## Testar localmente

```
stripe listen --forward-to localhost:3100/api/stripe/webhook
stripe trigger customer.subscription.updated
```

O `listen` imprime o `whsec_…` daquela sessão — é ele que vai no `.env.local`, e ele muda
a cada vez que você reinicia o comando.

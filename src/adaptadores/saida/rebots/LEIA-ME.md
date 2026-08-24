# `saida/rebots` — a Rebots como canal de emissão do Receita Saúde

⚠️ **SÓ SERVIDOR.** A `master_key` emite documento fiscal no CPF das nossas clientes. Nenhuma
variável desta pasta tem prefixo `NEXT_PUBLIC_`, e nenhum arquivo daqui pode ser importado de
componente `"use client"`.

## O que é

Terceiro que automatiza a emissão do Recibo Eletrônico de Serviços de Saúde. **Não é API
oficial** — não existe uma: verificado na lista de serviços do Integra Contador, que tem 11
soluções e nenhuma de Carnê-Leão, IRPF ou Receita Saúde. É automação em cima do canal oficial,
assinando com certificado, sob procuração e-CAC.

Doc: <https://rebots.com.br/documentacao-api>

| O que | Onde |
|---|---|
| `config.ts` | env vars, `isRebotsConfigured`, `rebotsFaltando()`, `rebotsAvisos()` |
| `cliente.ts` | JWT com `master_key`, POST com segunda chance em 401 |
| `emissor-recibo.ts` | o adaptador de `EmissorDeReciboSaude` + `desfechoDoCallbackRebots` |

## Pode importar

`@/nucleo/portas/**`, `@/nucleo/dominio/**`, e os arquivos desta pasta. **Não pode** importar
outro adaptador — eles se encontram em `src/composicao.ts`.

## Variáveis de ambiente

| Variável | Obrigatória | O que é |
|---|---|---|
| `REBOTS_IDENTIFICADOR` | sim | o nome da conta. Viaja no corpo de toda chamada. **Não é segredo** |
| `REBOTS_MASTER_KEY` | sim | ⚠️ **o segredo.** Só aparece no `POST /auth/token` |
| `REBOTS_BASE_URL` | não | padrão `https://api.rebots.com.br` |
| `REBOTS_PRODUCAO` | não | ⚠️ **sem ela, toda emissão sai com `test: true`** |
| `REBOTS_TIMEOUT_MS` | não | padrão 20s |

⚠️ **`REBOTS_PRODUCAO` é a única flag do repo cujo padrão é "não valendo", e isso é desenho.** O
desfecho de errar não é simétrico: nascer em teste custa uma variável esquecida; nascer em
produção custa um documento fiscal no CPF de uma paciente, que se cancela um por um, em dez dias
(art. 7º da IN RFB 2.240/2024). Mesma lógica do `ambiente` da config fiscal.

## ★ `receipt_id` é nosso, e isso melhora o desenho

O `POST /receipts` aceita `receipt_id` **de entrada**, e o callback o devolve. Então o protocolo
é a nossa chave, conhecida antes da chamada.

Consequência concreta: **para este canal, o estado `pendente` sem protocolo não nasce.** Aquele
estado vem do intervalo entre "o canal aceitou" e "gravei o protocolo" — aqui não há intervalo.
Ver `precisaDeOlhoHumano` em `nucleo/dominio/recibo-unitario.ts`.

## ⚠️ A dívida que é DELES: não existe consulta

Cinco endpoints, todos `POST`. **Nenhum jeito de perguntar "o que aconteceu com o protocolo X".**

Então `consultar` devolve sempre `null`, e no nosso desenho `null` significa "o canal não me
disse": a linha fica `pendente`, nunca vira recusa, nunca libera a cascata. Seguro — e inútil,
porque a reconciliação deste canal **não converge**. Ela pergunta para sempre e nunca ouve.

Pior: a doc deles diz que o dado é descartado depois do nosso 200 — *"will be discarded and
cannot be recovered"*. Daí a regra da rota de callback:

> **Gravar ANTES de responder 200.** Se a gravação falhar, responder erro para eles reentregarem.
> Um 200 sem gravação apaga a única cópia do desfecho que existe no mundo.

Um `pendente` da Rebots com callback perdido só se resolve **olhando o e-CAC**. É a limitação que
mais pesa a favor de construirmos a automação própria: ela pode ler.

## ⚠️ Formatos por confirmar

A doc lista os nomes dos campos, mas não dá exemplo com valores. Duas escolhas estão marcadas no
código com `⚠️ FORMATO A CONFIRMAR`, num lugar só cada:

| Campo | Nossa escolha | O risco de estar errado |
|---|---|---|
| `amount` | número decimal (`250.00`) | se eles esperam centavos inteiros, `250` vira **R$ 2,50** — recibo de valor errado |
| `date` | ISO `YYYY-MM-DD` | o CSV do Carnê-Leão usa `DD/MM/AAAA`, e eles falam com a Receita |

Por isso a primeira emissão de verdade sai com `test: true` e **alguém confere o valor no PDF**.

## Estado

**Nunca rodou contra a API real.** Não temos conta nem chave — o preço deles só sai por WhatsApp.
Os testes exercitam o adaptador com `fetch` dublado: o que está verificado é a forma das
requisições e a tradução das respostas, não que a Rebots as aceite.

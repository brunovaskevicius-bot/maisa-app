# `saida/evolution/` — WhatsApp pela Evolution API

Cumpre a porta `CanalDeMensagens`. **⚠️ Só servidor.**

É por onde a MAISA **fala**. O lado que **ouve** é [`entrada/whatsapp/`](../../entrada/whatsapp/LEIA-ME.md);
os dois juntos fecham o ciclo da conversa, e nenhum dos dois conhece o outro — eles se
encontram em `composicao.ts`.

Doc oficial: <https://doc.evolution-api.com/v2/> · Auth: header `apikey: <token>`

## Arquivos

| Arquivo | Assunto | Detalhe que não é óbvio |
|---|---|---|
| `canal-evolution.ts` | **A fachada.** Implementa `CanalDeMensagens`: bolhas com ritmo + escalação para o dono. | `escalar()` **nunca lança** — ele é chamado justamente nos caminhos de falha do agente, e uma exceção aqui trocaria o problema original por um erro de notificação. |
| `cliente.ts` | HTTP: `sendText`, `sendPresence`, `connectionState`, `webhook/set` | Todo o mapeamento de erro vive aqui. `LimiteDoProvedor` só para status que provam que a Evolution **não** processou. |
| `config.ts` | Env vars, `isEvolutionConfigured`, avisos | Sem configuração o app **não quebra**: cai no `canalDemo` e a MAISA continua respondendo no log. |

## Fluxo de operação

```
agente responde  →  canal.enviar(t, telefone, ["bolha 1", "bolha 2"])
                    └─ paraNumeroWhats()      "(11) 98888-7777" → "5511988887777"
                       └─ POST /message/sendText/{instancia}   (uma por bolha, em ordem)

agente desiste   →  canal.escalar(t, { telefone, motivo })
                    └─ POST /message/sendText/{instancia}  → número do DONO, com link wa.me
```

## Dois tokens existem, e misturá-los é o erro de estreia

| Token | Onde nasce | Para quê |
|---|---|---|
| **global** | `AUTHENTICATION_API_KEY` do servidor | criar/apagar instância |
| **da instância** | o `hash` que volta do `POST /instance/create` | **mandar mensagem — é o que vai em `EVOLUTION_API_KEY`** |

O global também mandaria mensagem, e é por isso que ele não deve ser usado: um vazamento
passaria de "mandaram mensagem pelo número do negócio" para "apagaram todas as instâncias
do servidor".

## Decisões que não são óbvias

- **Sequencial, nunca `Promise.all`.** Em paralelo a bolha curta chega antes da longa, e
  resposta fora de ordem no WhatsApp lê como bot quebrado — exatamente o que as bolhas
  existem para evitar.
- **O ritmo vem do `delay` do `sendText`**, executado dentro da Evolution, e não de um
  `sleep` nosso: dormir aqui é tempo de função serverless comprado para não fazer nada.
  `sinalizarDigitando()` (`/chat/sendPresence`) existe no cliente para quem quiser o
  "digitando…" explícito — o corpo dela é **plano**, não aninhado em `options` (a doc
  antiga mostrava aninhado e devolve 400: evolution-api#1107).
- **A primeira bolha sai sem pausa.** O cliente já esperou o modelo pensar; pausa "para
  parecer humano" antes da primeira resposta só soma em cima de uma espera que já houve.
- **Retentativa só em `LimiteDoProvedor`, uma vez.** Aquele erro significa que a Evolution
  disse que não processou (429/502/503/504). Timeout e 500 passam direto: podem ter sido
  entregues, e mensagem duplicada no WhatsApp do cliente é um erro que ele **vê**.
- **Timeout não é transitório.** Ele é ambíguo (a mensagem pode ter saído), então vira
  `FalhaDoProvedor`. Classificá-lo como transitório faria o agente reenviar — ver
  `comoFrase` em `entrada/whatsapp/ferramentas.ts`, que chama a ferramenta de novo.
- **`linkPreview: false` sempre.** A prévia obriga a Evolution a baixar a URL (atraso) e
  a única URL que aparece num agendamento é o Meet, cuja prévia é uma caixa cinza.
- **Só o evento `MESSAGES_UPSERT` é assinado.** Assinar tudo traria recibo de entrega,
  presença e "digitando" do cliente — dezenas de POST por conversa, todos descartados,
  cada um uma invocação paga.

## Ligar isso na prática

Precisa de uma URL pública: a Evolution roda em outro servidor e não alcança
`localhost`. Em desenvolvimento, um túnel (`cloudflared tunnel --url http://localhost:3100`)
resolve.

```bash
# 1. o que está configurado, e a instância está pareada?
curl -H "apikey: $WHATSAPP_WEBHOOK_SECRET" https://SEU-APP/api/whatsapp/conexao

# 2. apontar o webhook da instância para o app (idempotente)
curl -X POST -H "apikey: $WHATSAPP_WEBHOOK_SECRET" https://SEU-APP/api/whatsapp/conexao

# 3. conversar sem WhatsApp nenhum, para afinar o tom
curl -X POST https://SEU-APP/api/whatsapp \
  -H "apikey: $WHATSAPP_WEBHOOK_SECRET" -H "Content-Type: application/json" \
  -d '{"de":"5511988887777","texto":"tem horário amanhã de tarde?"}'
```

`conexao` responde `conectado: true` só quando o estado é `open`. `connecting` e `close`
significam QR Code para ler — e isso é um humano com o celular na mão, não código.

## Env vars

Ver [`.env.local.example`](../../../../.env.local.example), seção do WhatsApp. As três
obrigatórias são `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCIA`;
`MAISA_WHATSAPP_DONO` é opcional e é quem recebe a escalação.

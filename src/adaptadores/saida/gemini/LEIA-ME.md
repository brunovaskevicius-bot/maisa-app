# `saida/gemini/` — o modelo que responde hoje

Cumpre a porta [`ModeloDeConversa`](../../../nucleo/portas/saida/modelo-conversa.ts).
**⚠️ Só servidor.**

É o adaptador **em uso**: `composicao.ts` escolhe este quando há `GEMINI_API_KEY`, e cai no
[`anthropic/`](../anthropic/LEIA-ME.md) quando só há `ANTHROPIC_API_KEY`.

> ⚠️ **A chave em uso é de TESTE e será revogada na ida para produção.** Voltar para a
> Anthropic é apagar `GEMINI_API_KEY` do ambiente — nenhuma linha de código. A porta existe
> por causa disso: antes, `agente.ts` importava o SDK da Anthropic e falava `tool_use`,
> `stop_reason`, `TextBlock`, e trocar de provedor era reescrever o loop.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `config.ts` | `GEMINI_API_KEY`, `GEMINI_MODELO`, `GEMINI_BASE_URL`, `GEMINI_TIMEOUT_MS` e `isGeminiConfigured` |
| `modelo-gemini.ts` | o adaptador: monta o `contents`, chama a REST, traduz a volta |

## REST com `fetch`, sem SDK

Duas razões, e as duas continuam valendo: uma dependência a menos num app que já carrega
Next, Supabase e o SDK da Anthropic — e o que precisamos aqui é **um** endpoint. Além disso,
assinatura de SDK é coisa que se adivinha errado; o formato do wire está documentado e foi
verificado contra a API de verdade antes de o arquivo existir.

**Todo o vocabulário do Gemini morre neste arquivo.** `contents`, `parts`, `functionCall`,
`finishReason`, `SAFETY` não aparecem em lugar nenhum fora daqui. Quem chama recebe
`RespostaDoModelo`.

## O que não é óbvio

**`thoughtSignature` — o estado cifrado de raciocínio.** Vem junto da chamada de ferramenta e
**tem que voltar intacto** no turno seguinte. Sem ele a API responde **400** (*"Function call
is missing a thought_signature"*) e o agente morre na primeira consulta de agenda. Ele viaja
como `ChamadaDeFerramenta.estadoOpaco` — nome genérico de propósito, porque a Anthropic tem o
equivalente dela. **Nunca inspecione nem reconstrua esse valor: só carregue.**

Descoberto testando contra a API, não lendo documentação.

**Pensamento LIGADO, sempre.** Com raciocínio desabilitado o modelo às vezes escreve a chamada
de ferramenta como **texto visível**: o turno "dá certo", a ferramenta nunca roda, e o cliente
recebe a intenção em vez do agendamento. Num canal onde ninguém vê que algo falhou, é o pior
modo de falha possível — e a economia não paga isso.

**Modelo por env, não fixo no código.** Ao contrário do adaptador da Anthropic: aqui o degrau
de qualidade é `GEMINI_MODELO=gemini-3.6-flash`, sem deploy. Hoje roda
`gemini-3.5-flash-lite` — ~US$ 0,001 por mensagem.

**A ordem do prompt é dinheiro.** O bloco estável (persona + catálogo + FAQ) vem primeiro; a
data de hoje fica no volátil, **depois**. Cache de prompt é casamento de prefixo: com a data no
topo, o prefixo mudaria à meia-noite e o catálogo inteiro seria reprocessado a preço cheio a
cada mensagem.

## Erros que ele traduz

| Do provedor | Vira |
|---|---|
| sem chave | `NaoConfigurado` |
| 429 / cota | `LimiteDoProvedor` — transitório, quem chama espera e tenta de novo |
| resto | `FalhaDoProvedor` |

Os três são de `nucleo/dominio/erros.ts`. Nenhum erro do Gemini vaza com o nome dele.

## O que NÃO fazer aqui

- ❌ Importar outro adaptador. Se precisa de algo de fora, é porta.
- ❌ Deixar `contents`/`parts` escaparem no tipo de retorno.
- ❌ Ler estado do `thoughtSignature`. Ele é opaco por contrato.

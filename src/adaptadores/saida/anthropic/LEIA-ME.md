# `saida/anthropic/` — o modelo de produção

Cumpre a porta [`ModeloDeConversa`](../../../nucleo/portas/saida/modelo-conversa.ts).
**⚠️ Só servidor.**

Era o corpo do `agente.ts` até o Gemini entrar. **Não foi apagado de propósito:** a chave do
Gemini em uso é de teste e será revogada na ida para produção. Manter os dois adaptadores faz
a decisão "quem responde em produção" ser uma linha em `composicao.ts`, e não uma reescrita do
loop sob pressão de prazo.

`composicao.ts` escolhe este quando **não** há `GEMINI_API_KEY` e há `ANTHROPIC_API_KEY`.

## O que não é óbvio

**É fábrica, não constante exportada.** `new Anthropic()` estoura sem credencial, e
`composicao.ts` é importado por **toda** rota de API — uma constante no topo faria a agenda e
a nota fiscal pararem de funcionar num ambiente sem chave de modelo. Só quem escolhe este
adaptador paga por construí-lo.

**Modelo fixo no código (`claude-opus-5`), e de propósito.** Cache de prompt é **por modelo**:
trocar o modelo invalida o cache, então ele não pode variar por requisição sem jogar fora o
desconto do prefixo estável. Mudança de modelo aqui é deploy, não configuração — diferente do
[`gemini/`](../gemini/LEIA-ME.md), que lê `GEMINI_MODELO` do ambiente.

**`effort: "low"` é decisão de produto embutida numa string.** Cada segundo é o cliente olhando
"digitando..." no WhatsApp, e a parte difícil aqui não é raciocínio: é seguir instrução e
chamar a ferramenta certa. Se a MAISA se perder, o degrau é `medium`.

**O breakpoint de cache fica no bloco estável.** Ele cacheia o bloco **e as ferramentas**, que
são renderizadas antes dele na ordem do wire. A data de hoje vai no bloco volátil, depois —
senão o prefixo mudaria à meia-noite e o catálogo inteiro seria reprocessado a preço cheio a
cada mensagem.

**Pensamento LIGADO.** Mesmo motivo do Gemini: com raciocínio desabilitado o modelo às vezes
escreve a chamada de ferramenta como texto visível — o turno "dá certo", a ferramenta nunca
roda, e o cliente recebe a intenção em vez do agendamento.

**Estado opaco.** A Anthropic também exige que o estado de raciocínio volte intacto no turno
seguinte. Viaja como `ChamadaDeFerramenta.estadoOpaco`, o mesmo campo que carrega o
`thoughtSignature` do Gemini. O nome é genérico porque os dois provedores têm a coisa, com
nomes diferentes.

## O que NÃO fazer aqui

- ❌ Deixar `tool_use`, `stop_reason` ou `TextBlock` escaparem no tipo de retorno. Todo o
  vocabulário da Anthropic morre neste arquivo — foi para isso que a porta nasceu.
- ❌ Importar outro adaptador.
- ❌ Construir o cliente no topo do módulo. Ver "é fábrica, não constante".

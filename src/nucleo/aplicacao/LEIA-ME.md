# `nucleo/aplicacao/` — os casos de uso

Aqui mora a **regra**. Cada arquivo implementa uma ou mais portas de entrada usando as
portas de saída que recebe por parâmetro.

## Arquivos

| Arquivo | Casos de uso | Depende das portas |
|---|---|---|
| `agendar-atendimento.ts` | `AgendarAtendimento` | `AgendaExterna`, `RepositorioNegocio` |
| `agenda.ts` | `LerAgenda`, `CancelarAtendimento`, `ListarConexoes`, `DesconectarAgenda` | `AgendaExterna`, `ConexoesDeAgenda`, `RepositorioNegocio` |
| `notas.ts` | `EmitirNota`, `ConsultarNota`, `CancelarNota` | `EmissorFiscal` |

## `agendar-atendimento.ts` — o arquivo mais importante do repositório

Toda esta lógica morava dentro de `app/api/google/evento/route.ts`. Enquanto morou lá,
"marcar um atendimento" só existia para quem falasse HTTP com um corpo JSON específico.

Ele faz, nesta ordem:

1. **Valida o pedido** — uuid de idempotência, data que existe de verdade
   (`2026-02-31` passa em regex e não é um dia), hora dentro do dia em passos de meia
   hora, duração entre 5 min e 8 h, data a menos de um ano daqui.
2. **Confere a allowlist** do inquilino — `agendaId` chega de fora, então nunca é
   escrita livre.
3. **Resolve serviço e cliente** — do catálogo, com o pedido tendo prioridade: serviço
   criado pelo usuário vive só no navegador dele.
4. **Pergunta antes de criar** (idempotência) — procura um evento com a mesma marca.
   Isso cobre o pedido que CHEGOU ao provedor, criou o evento e perdeu a resposta na
   volta. Sem isso, a tentativa seguinte cria um segundo atendimento às 14h para o mesmo
   cliente e nada explica de onde saiu o segundo.
5. **Cria** — monta título, descrição e as marcas que fazem o evento voltar da leitura
   como atendimento, e não como compromisso pessoal.

**Por que a validação está aqui e não na rota:** o agente de WhatsApp vai preencher
estes campos com o que um modelo de linguagem entendeu de uma frase solta. É exatamente
o tipo de entrada que precisa de guarda — e que não passaria por guarda nenhuma se ela
morasse no adaptador HTTP.

## Convenções

- **Fábrica, não classe.** `criarX(deps): X`. As dependências entram por parâmetro, o
  que torna teste sem rede trivial.
- **Marcar no passado é permitido.** Registrar às 15h o encaixe que entrou às 14h é uso
  normal de agenda. O que se recusa é o absurdo (1998, 2200).
- **Erro é `throw`, não valor de retorno.** Sempre um erro de
  [`dominio/erros.ts`](../dominio/erros.ts) — nunca um `Error` cru, porque quem chama
  precisa distinguir "dado ruim" de "reconecte" de "espere e tente de novo".
- **Nada de `console.log` de negócio.** Log é do adaptador, que sabe onde ele aparece.

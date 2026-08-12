# `nucleo/dominio/` — o que a MAISA é

Tipos e funções **puras**. Sem `fetch`, sem `process.env`, sem React, sem banco. Roda
igual no servidor, no navegador e dentro do futuro agente de WhatsApp.

Quase tudo aqui saiu do antigo `src/lib/data.ts`, que misturava três coisas: os tipos
do negócio, as regras de calendário e os dados de mentira. Os dados foram para
[`adaptadores/saida/demo`](../../adaptadores/saida/demo/LEIA-ME.md); o resto ficou aqui.

## Arquivos

| Arquivo | O que tem dentro | Por que importa |
|---|---|---|
| `tenant.ts` | `ContextoTenant`, `ContextoAgenda`, `Ator` | A costura multi‑inquilino. Todo caso de uso e toda porta de saída recebem isto. `ator` é o que vai distinguir "o Bruno marcou" de "a IA marcou". |
| `tempo.ts` | Data civil, hora decimal, semana/mês, `instanteISO`, `civilSP`, `HOJE` | O maior e o mais importante. É o único lugar que sabe que existe fuso horário. Antes metade dele morava dentro do adaptador do Google — lugar errado, porque a tela precisa da mesma conta antes de criar o evento. |
| `agenda.ts` | `Agendamento`, `RascunhoAgendamento`, `EventoDeAgenda`, `AtendimentoMarcado`, `Etapa` + invariantes (`horaValida`, `duracaoValida`, `ehUuid`) | O vocabulário da agenda. `AtendimentoMarcado` é o que se grava no evento externo para reconhecê‑lo na volta. |
| `expediente.ts` | `Expediente`, `atendeNoDia`, `podeComecarEm`, `fechado` | Quando o negócio abre, em dado estruturado — o número, não a frase. É o que o agente vai consultar antes de oferecer horário. |
| `catalogo.ts` | `Profissional`, `Servico`, `CategoriaServico`, `primeiroNome` | Quem atende e o que se vende. |
| `clientes.ts` | `Cliente`, `soDigitos` | Quem é atendido. O `telefone` vai virar a chave de identificação no WhatsApp. |
| `negocio.ts` | `Negocio`, `Prestador` | O assinante visto por dentro. Genérico: o mesmo tipo serve terapeuta e barbeiro. |
| `fiscal.ts` | `Nota`, `StatusNota`, `Tomador`, `PedidoDeNota`, `ResultadoDeNota` | Os estados são NOSSOS, não da Focus. É o que permite trocar de emissor sem nenhuma tela perceber. |
| `conversas.ts` | `Conversa`, `Msg`, `EstadoConversa`, `estadoDaConversa`, `ItemFila`, `Faq` | O WhatsApp de verdade. A identidade de uma conversa é o TELEFONE (não um id sorteado), e `estadoDaConversa` é a única definição de "quem está com a bola" no app. |
| `assistente.ts` | `Tom`, `Assistente`, `Dia`, `ChaveCfg`, `Toggle` | Os ajustes da MAISA. Deixa de ser tela de config e vira o PROMPT do agente — por isso é dado estruturado, não texto pronto. |
| `erros.ts` | `DadoInvalido`, `NaoEncontrado`, `NaoConfigurado`, `PrecisaReconectar`, `LimiteDoProvedor`, `FalhaDoProvedor` | O núcleo não devolve 400; ele lança. Quem traduz para status é o adaptador de entrada. |
| `index.ts` | Barrel | Conveniência para quem precisa de vários tipos de uma vez. |

## Regras deste diretório

- **Nada de apresentação.** Cor, label de badge, texto de UI: é da tela. Um tipo daqui
  não conhece nem `--primary` nem "Confirmado".
- **Data civil, não `Date`.** `new Date("2026-08-06")` é meia‑noite UTC, que em São
  Paulo é dia 5 às 21h — o clássico erro de um dia. String ISO compara com `<`, serve
  de chave de Map e de `key` de React.
- **Função pura recebe o dado, não busca.** `podeComecarEm(expediente, …)` e não
  `podeComecar(profissionalId, …)`: quem sabe achar o expediente é o repositório.

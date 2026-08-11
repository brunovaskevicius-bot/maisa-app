# `src/nucleo/` — o hexágono

O que a MAISA é, sem saber que existe Next.js, React, Google, Supabase ou HTTP.

**Teste de sanidade:** procure por `import` de fora daqui. Se aparecer qualquer coisa
que não seja `@/nucleo/…`, a arquitetura foi violada — o que falta, nesse caso, é uma
porta nova.

```bash
grep -rn 'from "@/\(adaptadores\|ui\|app\)' src/nucleo/   # tem que voltar vazio
grep -rn 'from "next\|from "react' src/nucleo/            # idem
```

## As três camadas

| Pasta | O que é | Depende de |
|---|---|---|
| `dominio/` | Tipos e regras puras: o que é um atendimento, quando o negócio abre, o que é uma data válida. Nenhum efeito colateral. | nada |
| `portas/` | Interfaces. `entrada/` = o que se pode pedir ao app. `saida/` = o que o app precisa do mundo. | `dominio/` |
| `aplicacao/` | Os casos de uso: orquestram as portas de saída para cumprir uma porta de entrada. | `dominio/`, `portas/` |

## Como se lê um caso de uso

Todo caso de uso é uma **fábrica** que recebe as portas e devolve a função:

```ts
export function criarAgendarAtendimento(deps: { agenda, negocio }): AgendarAtendimento
```

Isso é o que torna o núcleo testável sem rede: em teste, `deps.agenda` é um objeto de
mentira que grava o que recebeu. Em produção, quem escolhe é `src/composicao.ts`.

## Vocabulário

| Termo | Significa |
|---|---|
| **tenant / inquilino** | Um negócio assinante. Hoje 1 login = 1 negócio. |
| **ator** | Quem disparou a ação: usuário no painel, agente de IA, rotina automática. |
| **agenda** | O calendário de um profissional (`agendaId` = `pr1` hoje). |
| **atendimento** | O evento que representa um cliente marcado. |
| **bloqueio** | Compromisso pessoal na mesma agenda — ocupa horário, não é cliente. |
| **data civil** | `"2026-08-06"`. Não é instante, não tem fuso. |
| **hora decimal** | `14.5` = 14:30. A língua da grade. |
| **instante** | `"2026-08-06T14:30:00-03:00"`. A língua do Google. |

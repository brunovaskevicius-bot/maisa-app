# `src/ui/` — o painel

O adaptador de entrada **humano**: React, `"use client"`, tudo que o Bruno e o dono do
negócio veem. Mora fora de `adaptadores/entrada/` por tamanho e porque o Next espera os
componentes perto do `app/`. Conceitualmente é irmão do `http/` e do futuro `whatsapp/`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `estado/store.tsx` | **O coração do painel.** Uma fonte de verdade para tudo que o usuário muda: etapa do kanban, dia visível na agenda, quem conduz cada conversa, toggles, catálogo vivo, ciclo de vida das notas. Persiste em `localStorage` (`maisa.app.v3`) só o que é DECISÃO — navegação é volátil de propósito. É também quem fala com `/api/**`. |
| `detalhe.tsx` | Um id → o conteúdo da Gaveta. O prefixo do id diz a entidade (`cl…` cliente, `pr…` profissional, `sv…` serviço, `cv…` conversa, `ag…` atendimento). |
| `primitivos.tsx` | `s()` (string CSS → objeto de estilo), `Icon`, `Btn`, `Badge`, `Monogram`, `toast`, `fmt`… A base visual, usada também pelas landing pages. |
| `useIsMobile.ts` | Um breakpoint, um hook. |

## `componentes/` — a casca

| Componente | Papel |
|---|---|
| `AppShell.tsx` | Rail + conteúdo + gaveta. Decide qual tela renderizar. |
| `Gaveta.tsx` | O painel lateral de detalhe. Todo cartão é curto; o detalhe vive aqui. |
| `Paleta.tsx` | Busca/comando (⌘K). |
| `Cartao.tsx` | O cartão genérico das grades. |
| `UserMenu.tsx` | Conta e sair. |

## `telas/` — as cinco telas

| Tela | O que mostra |
|---|---|
| `FluxoHoje.tsx` | O kanban do dia: chegando → atendendo → feito. |
| `Agenda.tsx` | A grade (dia/semana/mês) com a agenda REAL do Google. Também define a janela desenhada (`AGENDA_INICIO`/`AGENDA_HORAS` — geometria de tela, não expediente). |
| `Conversas.tsx` | As conversas de WhatsApp (demonstração). |
| `Grades.tsx` | Clientes, equipe, catálogo, faturamento, "Mais". |
| `AMaisa.tsx` | Os ajustes da assistente + preview de WhatsApp. |

## A dívida conhecida

As telas fazem `import * as D from "@/adaptadores/saida/demo"` — ou seja, leem fixture
**direto**, sem passar por um caso de uso. Isso é o que resta da arquitetura antiga.

O caminho longo do import é proposital: ele denuncia a dívida em toda tela que a tem.
Consertar = fazer o `store.tsx` conversar com o núcleo em vez de com o array. Enquanto
não acontece, vale a regra:

- ✅ a UI pode importar `@/nucleo/dominio/*` (tipos e funções puras) à vontade;
- ⚠️ `@/adaptadores/saida/demo` é tolerado, e cada uso é dívida;
- ❌ a UI **nunca** importa `@/composicao`, `saida/google`, `saida/focus` — são
  segredos de servidor. A ponte é `fetch` para `/api/**`.

## Contrato com as rotas

O store casa **string por string** com o `status` das respostas (ver `RESPOSTA_GOOGLE`,
`MOTIVO_GOOGLE` e o tratamento de `reconectar`/`limite`). Se você mudar um nome em
[`adaptadores/entrada/http/respostas.ts`](../adaptadores/entrada/http/LEIA-ME.md),
procure o nome aqui antes — o TypeScript não pega, porque JSON é `any`.

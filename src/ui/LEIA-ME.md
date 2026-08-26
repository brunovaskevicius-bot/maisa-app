# `src/ui/` — o painel

O adaptador de entrada **humano**: React, `"use client"`, tudo que o Bruno e o dono do
negócio veem. Mora fora de `adaptadores/entrada/` por tamanho e porque o Next espera os
componentes perto do `app/`. Conceitualmente é irmão do `http/` e do futuro `whatsapp/`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `estado/store.tsx` | **O coração do painel.** Uma fonte de verdade para tudo que o usuário muda: etapa do kanban, dia visível na agenda, quem conduz cada conversa, toggles, catálogo vivo, ciclo de vida das notas e — desde 25/08/2026 — **qual documento o negócio emite** (`st.fiscal`, ver `EstadoFiscalUI`). Persiste em `localStorage` (`maisa.app.v3`) só o que é DECISÃO — navegação é volátil de propósito. É também quem fala com `/api/**`. |
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
| `CampoSenha.tsx` | O campo de senha com o olho, usado nas cinco entradas de senha do produto (`/cadastro` ×2, `/login`, `/nova-senha` ×2). |
| `Pareamento.tsx` | As peças do "Conectar com número de telefone": o código de 8 caracteres, a conferência do número antes de enviar e a etiqueta que mantém o número na tela. Compartilhado entre o wizard e o painel porque o conteúdo de valor é a INSTRUÇÃO — os nomes exatos do menu do WhatsApp. |

## `telas/` — as cinco telas

| Tela | O que mostra |
|---|---|
| `FluxoHoje.tsx` | O kanban do dia: chegando → atendendo → feito. |
| `Agenda.tsx` | A grade (dia/semana/mês) com a agenda REAL do Google. Também define a janela desenhada (`AGENDA_INICIO`/`AGENDA_HORAS` — geometria de tela, não expediente). |
| `Conversas.tsx` | As conversas de WhatsApp, do servidor (`st.conversas` / `st.threadDe`). Responder aqui manda mensagem de verdade. |
| `Grades.tsx` | Clientes, equipe, catálogo, faturamento, "Mais". ⚠️ O **Faturamento tem dois vocabulários**, e quem escolhe é `st.fiscal.caminho`, nunca o estado das notas: quem atende como pessoa física não emite nota fiscal, e para ela o hero, a tabela e a gaveta de nota simplesmente não existem. Ver `vocabulario` e o teste ao lado. |
| `AMaisa.tsx` | Os ajustes da assistente + preview de WhatsApp. |

## A dívida conhecida

As telas ainda fazem `import * as D from "@/adaptadores/saida/demo"`, mas **o que vem daí
mudou** — e essa distinção é o ponto:

O barrel do demo faz `export * from "@/nucleo/dominio"`, então a maioria dos `D.` **não é
fixture**: `D.hhmm`, `D.HOJE`, `D.rotuloDia`, `D.CATEGORIAS`, `D.TONS`, `D.primeiroNome` e
os tipos são domínio puro, e importá-los é legítimo (só está no caminho errado). Em
`Agenda.tsx`, por exemplo, a esmagadora maioria das referências é dessas.

**Quatro entidades saíram do fixture** e vêm de `GET /api/cadastro`, pelo store:

| Não use mais | Use |
|---|---|
| `D.NEGOCIO` | `st.cadastro.negocio` |
| `D.EQUIPE` | `st.cadastro.profissionais` |
| `D.CLIENTES` | `st.cadastro.clientes` |
| `D.SERVICOS` | `st.servicos` — desde 15/08/2026 é o MESMO array de `st.cadastro.servicos`, sem camada-sombra por cima |
| `D.COLUNAS_AGENDA` | `st.cadastro.agendas` |
| `D.profissional(id)` | `st.profissionalDe(id)` |
| `D.cliente(id)` | `st.clienteDe(id)` |
| `D.servico(id)` | `st.servicoDe(id)` |
| `D.nomeProfissional(id)` | `st.nomeDoProfissional(id)` |
| `D.nomeCliente(id)` | `st.nomeDoCliente(id)` |
| `D.atende(pid, data)` | `st.atendeNoDia(pid, data)` |
| `D.podeComecar(…)` | `st.podeComecarEm(…)` |

Continuam fixture de verdade, e cada uso é dívida: `FAQS`, `NUMEROS_MES`, `FATURAS`,
`PERIODO`, `PRESTADOR`, `DIAS_PADRAO`, `CFG_PADRAO`.

`CONVERSAS`, `THREADS` e `SUGESTOES` saíram desta lista porque saíram do repositório. O que
as substitui:

| Era | Virou |
|---|---|
| `D.CONVERSAS` | `st.conversas` (do servidor, mais recente primeiro) |
| `D.conversa(id)` | `st.conversaDe(id)` |
| `D.THREADS[id]` | `st.threadDe(id)` — buscada ao abrir a conversa |
| `D.SUGESTOES[id]` | nada. Sugestão de verdade é uma feature, não um fixture — a barra saiu da tela |
| `c.hora` | `D.horaDeISO(c.atualizadaEm)` |
| `c.estado` do fixture | `c.estado`, derivado no servidor por `estadoDaConversa` |

⚠️ `st.enviar(id, txt)` **manda mensagem no WhatsApp da pessoa** e não se desfaz. `st.assumir`
e `st.devolver` escrevem no banco: é o que faz a MAISA calar (ou voltar a falar) naquela
conversa. Nenhum dos três é otimista à toa — ver o comentário de `mudarPosse` no store.

**Editar cliente é do store, não da tela** (desde 24/08/2026). `st.editarCliente(id, patch)`
grava otimista, coalesce por 500 ms e manda **um** `PUT /api/clientes` com o cliente inteiro;
`st.alternarCli` passa por ele. A gaveta não tem botão "Salvar" — ela só chama `editarCliente`
a cada tecla, como já fazia com `editarServico`.

⚠️ **`st.cliAtivo` não lê mais `localStorage`.** `db.cliAtivo` saiu do `Persistido`: era um mapa
que ficava POR CIMA de `clientes.ativo`, então quem desativasse alguém num aparelho veria o
cliente ativo no outro para sempre. Quem manda agora é o banco.

⚠️ **`editarCliente` recarrega o faturamento depois de gravar**, e isso é contrato, não zelo:
`st.fechamento` monta `cpf`, `nome` e `semCpf` a partir de `/api/faturamento`, não do cadastro.
Sem o recarregar, corrigir um CPF preenchia o campo e a tabela continuava dizendo "sem CPF —
não entra no lote".

Duas coisas que o store passou a exigir:

- **`st.pidAgenda` pode ser `""`** na primeira passada — o cadastro é assíncrono. Guarde
  antes de mandar numa URL ou num `conectarGoogle`.
- **`st.cadastroErro`** não-nulo significa que o que está na tela é **placeholder de
  fixture**, não o negócio de verdade. Tela que mostra plano, preço ou contagem tem que
  dizer isso — senão o app mente com cara de dado real.

Regras de import que continuam valendo:

- ✅ a UI pode importar `@/nucleo/dominio/*` (tipos e funções puras) à vontade;
- ⚠️ `@/adaptadores/saida/demo` é tolerado para o que ainda é fixture;
- ❌ a UI **nunca** importa `@/composicao`, `saida/google`, `saida/focus` — são
  segredos de servidor. A ponte é `fetch` para `/api/**`.

## Contrato com as rotas

O store casa **string por string** com o `status` das respostas (ver `RESPOSTA_GOOGLE`,
`MOTIVO_GOOGLE` e o tratamento de `reconectar`/`limite`). Se você mudar um nome em
[`adaptadores/entrada/http/respostas.ts`](../adaptadores/entrada/http/LEIA-ME.md),
procure o nome aqui antes — o TypeScript não pega, porque JSON é `any`.

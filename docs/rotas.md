# Rotas HTTP

Toda rota do app, o que ela faz e quem pode chamar. **Mantido honesto por guarda de CI**
(`npm run guardas`): rota no código que não aparece aqui reprova o build, e rota citada aqui
que não existe no código também.

As rotas são **finas de propósito**. Elas autenticam, traduzem JSON e chamam um caso de uso —
a regra mora em `src/nucleo/`. Rota com `if` de negócio dentro é bug de camada.

## Como ler a coluna "porteiro"

Definidos em [`src/adaptadores/entrada/http/contexto.ts`](../src/adaptadores/entrada/http/LEIA-ME.md).

| Porteiro | Barra quem | Usado por |
|---|---|---|
| `exigirSessao()` | não logado → 401 | ação que precisa de login |
| `exigirSessaoComGoogle()` | não logado → 401; sem credencial Google → 400 `nao_configurado` | ação de agenda |
| `sessaoOuDemo()` | ninguém — sem Supabase devolve `TENANT_DEMO` | rotas que a UI de demonstração precisa exercitar |
| `SEGREDO` | header/query sem `WHATSAPP_WEBHOOK_SECRET` | o que é chamado por máquina, não por navegador |

> **A regra que não se negocia:** `tenantId` nasce do cookie de sessão, **nunca** da query
> string nem do corpo. Foi esse descuido que abriu o pior furo da integração de onde este
> código veio — bastava conhecer o id da vítima para escrever na agenda dela.

## Painel — o dono operando o negócio

| Rota | Métodos | Porteiro | Caso de uso |
|---|---|---|---|
| `/api/cadastro` | GET | `exigirSessao` | `LerCadastro` — negócio, profissionais, serviços, clientes |
| `/api/negocio` | POST · PATCH | `exigirUsuario` (POST) · `exigirSessao` (PATCH) | `ProvisionarNegocio` — cria `negocios` + `membros` no primeiro acesso · `AjustarNegocio` — troca o nome |
| `/api/ativacao` | GET | `sessaoOuDemo` | `LerAtivacao` — quantos dos 5 passos estão feitos. **Derivado do banco a cada leitura**, nunca de uma flag de progresso |
| `/api/servicos` | PUT · DELETE | `sessaoOuDemo` | `AjustarServico` — cria ou edita pelo `id` · `RemoverServico` |
| `/api/equipe` | PUT | `sessaoOuDemo` | `AjustarProfissional` — cria ou edita quem atende. **Não mexe em expediente**: aquilo manda na grade inteira e pede caso de uso próprio |

⚠️ **Serviço tem DELETE e profissional não**, e a assimetria vem do esquema, não de gosto:
`atendimentos.servico_id` é snapshot **sem FK** (ao lado de `servico_nome` e `servico_valor`),
então apagar um serviço não toca faturamento fechado — enquanto `atendimentos.profissional_id`
tem **`on delete cascade`**, e apagar a pessoa levaria os atendimentos dela junto. Quem sai da
equipe vira `ativo: false`.
| `/api/assistente` | GET · PATCH | `sessaoOuDemo` | `LerAssistente` · `AjustarAssistente` — nome, tom, o que não falar |
| `/api/horarios` | GET · PUT | `sessaoOuDemo` | `LerHorarios` · `AjustarHorarios` — o expediente que a MAISA anuncia |
| `/api/faqs` | GET · PUT · DELETE | `sessaoOuDemo` | `LerFaqs` · `AjustarFaq` · `RemoverFaq` — as respostas prontas. Não há rota de BUSCA: quem busca é o agente, pelo caso de uso `ResponderDuvida`, no mesmo processo |
| `/api/conversas` | GET · POST | `sessaoOuDemo` | `ListarConversas` · `LerConversa` · `ResponderConversa` · `MudarPosseConversa` |

`MudarPosseConversa` é o "Assumir": enquanto o dono tem a posse, o agente **cala**. A posse é
lida no banco antes do primeiro token — quando morava no `localStorage`, o botão prometia
silêncio e o webhook nunca ficava sabendo.

## Agenda — Google Calendar

| Rota | Métodos | Porteiro | Caso de uso |
|---|---|---|---|
| `/api/google/conectar` | GET · DELETE | `exigirSessao` | inicia o OAuth (PKCE + `state` assinado) · `DesconectarAgenda` |
| `/api/google/callback` | GET | `state` assinado + PKCE | fim do OAuth: troca o código e grava o token **cifrado** |
| `/api/google/status` | GET | própria (ver abaixo) | `ListarConexoes` — quem já conectou. Nunca devolve token |
| `/api/google/agenda` | GET | `exigirSessaoComGoogle` | `LerAgenda` — eventos de uma janela |
| `/api/google/evento` | POST · DELETE | `exigirSessaoComGoogle` | `AgendarAtendimento` · `CancelarAtendimento` |

`/api/google/status` é a **única** rota que não usa o porteiro, e é de propósito: ela existe
para *relatar* o estado da sessão e da configuração. Responder 401 esconderia justamente a
resposta que a pergunta pede, então tudo sai **200 com um `status` dentro**
(`nao_configurado` · `login_necessario` · `nao_autenticado` · `sem_negocio` · `ok`). Ela
autentica por conta própria e deriva o inquilino de `membros`.

⚠️ Os nomes de `status` do JSON são **contrato** com `src/ui/estado/store.tsx`. Mudar um deles
muda o comportamento da tela — procure o nome no store antes.

## Nota fiscal — Focus NFe

| Rota | Métodos | Porteiro | Caso de uso |
|---|---|---|---|
| `/api/nf/emitir` | POST | `sessaoOuDemo` | `EmitirNota` |
| `/api/nf/status` | GET | `sessaoOuDemo` | `ConsultarNota` |
| `/api/nf/cancelar` | POST | `sessaoOuDemo` | `CancelarNota` |

Formato de erro **diferente** do resto do app: `erros: [{ mensagem }]`, herdado da Focus e já
entranhado na tela de Faturamento. E `config_incompleta` sai com **HTTP 200** — não é falha de
requisição, é o app dizendo ao dono quais variáveis fiscais faltam. Ver
[`entrada/http/fiscal.ts`](../src/adaptadores/entrada/http/LEIA-ME.md).

## WhatsApp — chamado por máquina

| Rota | Métodos | Porteiro | O que faz |
|---|---|---|---|
| `/api/whatsapp` | GET · POST | `SEGREDO` | **o webhook.** Recebe a mensagem do cliente e roda o agente |
| `/api/whatsapp/conexao` | GET · POST | `SEGREDO` | pareamento da instância |
| `/api/canal` | GET · POST · DELETE | `sessaoOuDemo` | `LerCanal` · `ConectarCanal` · `DesconectarCanal` — a visão do painel do mesmo canal |
| `/api/rotinas/lembretes` | POST | `SEGREDO` | `EnviarLembretes` — disparado por `pg_cron` a cada 15 min |

O webhook responde **200 mesmo quando descarta** a mensagem. Para o provedor, resposta de erro
significa "tente de novo", e ele reentrega o mesmo evento em loop. O fluxo inteiro, com o que
é descartado e por quê, está em [`fluxos/mensagem-whatsapp.md`](fluxos/mensagem-whatsapp.md).

## Conversar com a MAISA fora do WhatsApp

| Rota | Métodos | Porteiro | O que faz |
|---|---|---|---|
| `/api/laboratorio` | GET · POST · DELETE | `exigirSessao` (ou `MAISA_LABORATORIO=1` sem login) | conversa com a MAISA sem número de WhatsApp |

Você é o cliente. Roda o **agente real**: mesmas ferramentas, mesma agenda, mesmo modelo — o
horário que sair daqui existe. Existe porque no texto da resposta *"consultei a agenda e tenho
quinta às 15h"* e *"inventei quinta às 15h"* são indistinguíveis, e a segunda é o pior bug
deste produto; a trilha devolvida diz qual dos dois aconteceu.

⚠️ **Deixou de ser dev-only em 15/08/2026.** Ela é a etapa 4 do `/comecar` (o "ver
funcionando"), então o inquilino passou a vir da **sessão** e a resposta sem login é 401, não
404. `MAISA_LABORATORIO=1` sobrou só como caminho de desenvolvimento sem login, com um
inquilino de fixture. Consequência que vale dizer em voz alta: a rota **gasta token de modelo
e escreve na agenda de quem chama** — com o porteiro, isso é a mesma exposição que o WhatsApp
do próprio inquilino já tem; sem ele, era a chave de IA aberta para quem achasse a URL.

A **página** `/laboratorio` continua fechada em produção: ela é a versão de depuração, com a
trilha crua em JSON ao lado. O que o cliente vê é a etapa 4 do wizard.

## O que NÃO fazer numa rota

- ❌ Ler `tenantId` do corpo ou da query. Ele vem do cookie, sempre.
- ❌ Chamar adaptador direto. A rota chama `app.<casoDeUso>` de `src/composicao.ts`.
- ❌ Regra de negócio no handler. Se precisa decidir algo, decide em `src/nucleo/aplicacao/`.
- ❌ Rota nova sem linha nesta tabela. A guarda reprova o build — de propósito.

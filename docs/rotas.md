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
| `/api/contatos` | GET · POST · PATCH | `exigirSessao` | `LerContatos` · `ImportarContatos` (lê a agenda do provedor) · `MarcarContato` · `DefinirModoDoNumero` |

⚠️ **O `/api/contatos` decide QUEM A MAISA VAI IGNORAR**, e por isso é `exigirSessao` e não
`sessaoOuDemo`: um inquilino de demonstração recebendo essa escrita significaria configurar o
silêncio de um negócio que não existe. O `PATCH` tem duas formas de corpo — `{ modo }` troca de
quem é o número, `{ telefone, cliente }` marca uma pessoa. São a mesma decisão de produto vista
de dois ângulos; separá-las por URL seria fronteira sem conteúdo.

O motivo de tudo isso existir: **o número pareado quase sempre é o celular pessoal do dono** —
barbearia pequena não tem linha corporativa. Sem o modo, a MAISA oferece horário para o pai
dele. A regra mora em [`nucleo/dominio/contatos.ts`](../src/nucleo/dominio/contatos.ts), é
função pura, e explica por que **não** é uma lista de permissão (lista de permissão ignora
justamente o cliente novo, que não está em contato nenhum).

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
| `/api/fiscal` | GET · POST · PUT · PATCH | `exigirSessao` | `LerEstadoFiscal` · `ConsultarCnpj` (`?cnpj=`) · `LigarNotaFiscal` · `EnviarCertificado` · `LiberarProducaoFiscal` |
| `/api/faturamento` | GET | `exigirSessao` | `LerFaturamento` — o que falta emitir, o que já saiu, e o que impede |
| `/api/nf/emitir` | POST | `sessaoOuDemo` | `EmitirNota` |
| `/api/nf/status` | GET | `sessaoOuDemo` | `ConsultarNota` |
| `/api/nf/cancelar` | POST | `sessaoOuDemo` | `CancelarNota` |

**O `/api/fiscal` é o onboarding fiscal, e ele faz UMA pergunta: o CNPJ.** Razão social,
município, CNAE e — o que decide o caminho de emissão — `optante_mei` vêm da Receita a partir
dos 14 dígitos. `POST` consulta e cadastra a empresa no emissor; `PUT` instala o certificado
A1; `PATCH` vira a chave para produção e **recusa enquanto faltar qualquer coisa**.

⚠️ Ele é `exigirSessao` e os `/api/nf/*` são `sessaoOuDemo`, e a diferença é o custo: aqui se
cria uma **empresa cobrada** numa conta de emissor fiscal, e a Focus não deduplica por CNPJ.

⚠️ **MEI vai pelo Ambiente Nacional, obrigatoriamente.** O `caminho` do GET diz por onde a
nota sai (`nacional` | `municipal`) — e o modo de falha de errar isso é traiçoeiro: a emissão
devolve 202 "processando" e a recusa chega minutos depois no status assíncrono. A regra está em
[`nucleo/dominio/fiscal.ts`](../src/nucleo/dominio/fiscal.ts) e tem teste.

⚠️ **Nem o token do emissor nem o `.pfx` do certificado ficam no nosso banco.** O token é
pedido ao provedor na hora de emitir e não chega ao núcleo; o certificado atravessa o `PUT` e
vai embora, sobrando só `certificadoValidoAte`. Ver
[`portas/saida/cadastro-de-emissor.ts`](../src/nucleo/portas/saida/cadastro-de-emissor.ts).

⚠️ **`POST /api/nf/emitir` aceita UM campo: `clienteId`.** Ele recebia `valor`, `discriminacao`
e `tomador` do corpo até 17/08/2026 — ou seja, um POST forjado emitia documento fiscal de
qualquer valor, para qualquer CPF, sob o CNPJ do dono. Agora tudo isso sai do banco, na
transação que prende os atendimentos.

⚠️ **Emitir duas vezes o mesmo cliente devolve `status: "ja_faturado"`, e isso não é erro.** A
claim (`abrir_nota()`, `supabase/015`) é atômica e usa `for update skip locked`: o segundo
clique — ou a segunda aba — não encontra o que prender. Nota fiscal duplicada não se apaga, e
é o modo de falha que essa função existe para tornar impossível.

Formato de erro dos `/api/nf/*` **diferente** do resto do app: `erros: [{ mensagem }]`, herdado
da Focus e já entranhado na tela de Faturamento. E `config_incompleta` sai com **HTTP 200** —
não é falha de requisição, é o app dizendo ao dono o que falta. Ver
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

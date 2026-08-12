# Marcar no Google Calendar — FUNCIONANDO em produção (12/08/2026)

A MAISA marcou um **evento real na agenda do Bruno a partir de uma mensagem de WhatsApp,
em produção**, e espelhou no Supabase. Verificado contra o Google e contra o Postgres.

```
evento_id  bglppgomp9ihi3681uc58chnds        ← id real do Google, não "demo-1"
html_link  …eid=…IGJydW5vLnZhc2tldmljaXVzQHBvbGlqdW5pb3IuY29tLmJy
                                              ← decodifica para bruno.vaskevicius@polijunior.com.br
inicio     2026-08-13T13:30:00+00:00         ← 10:30 BRT
espelho    atendimentos: "Atendimento rápido" · ator_tipo agente · competencia 2026-08-01
```

## As causas que estavam matando a feature (todas consertadas)

1. **DOIS PROJETOS NA VERCEL.** O webhook da Evolution apontava para
   `code-ten-blue.vercel.app` — projeto `code`, criado 22h antes por um `vercel` rodado de
   dentro da pasta `code/` (a Vercel nomeia pela pasta). Esse projeto tem **10 env vars e
   nenhuma do Supabase nem do Google**: a MAISA em produção rodava em modo demonstração
   puro, com fixture como cadastro e agenda em memória que morre a cada lambda. Nunca ia
   tocar no calendar — não por bug, por ambiente.
   → webhook repontado para `https://maisa-app-sooty.vercel.app/api/whatsapp`.
   → **o projeto de produção é `maisa-app`.** Não deploye no `code`.
2. **`MAISA_TENANT_ID` guardava o `user_id`, não o `tenant_id`.** Resíduo de quando
   `tenantId == usuarioId` (ver `dominio/tenant.ts`); no multi-inquilino divergiram e o env
   ficou atrás. Toda consulta por tenant voltava vazia → `NaoEncontrado("Negócio")`.
   - errado `5d132450-054e-4212-8001-cf2a27e992d7` (é `membros.user_id`)
   - **certo `a652c37d-25c9-40b5-937f-4a95fbfa5631`** (é `negocios.id`)
3. **`NEXT_PUBLIC_SUPABASE_URL` era a URL do dashboard**, não da API. `isSupabaseConfigured`
   só checa se a variável existe, então o app trocava fixture por Supabase e toda consulta
   batia num 308. → `https://gsurucxllwpxcldljgur.supabase.co`
4. **`SUPABASE_SERVICE_ROLE_KEY` não existia.** O agente não tem cookie, então
   `contexto-cliente.ts` exige service role. → adicionada em `maisa-app` (produção só).
5. **`integracoes_whatsapp` estava vazia.** Com a service role presente,
   `whatsapp/contexto.ts` resolve o inquilino pelo banco e **falha fechada**. Sem a linha, a
   chave nova deixaria a MAISA muda em vez de melhor. → linha criada (`FAQ`,
   `5511994294906`, conectado).
6. **Bug meu: `conversa_id` é `uuid`** e o laboratório passa `"laboratorio"`. O Postgres
   recusava a linha inteira com `22P02`, e como o adaptador do espelho não lança de
   propósito, o sintoma era o pior possível — agendamento OK, MAISA confirmando, espelho
   vazio, nada na tela dizendo. → `uuidOuNulo` aplicado em `saida/supabase/atendimentos.ts`.

## O que foi construído nesta passada

- `nucleo/portas/saida/registro-atendimentos.ts` — porta do espelho. **Não lança**: quando
  ela roda, o evento já existe no Google, e abortar deixaria o horário bloqueado com o
  cliente ouvindo "não deu".
- `saida/supabase/atendimentos.ts` + `saida/demo/atendimentos.ts`
- `RepositorioNegocio.garantirCliente()` — o lead do WhatsApp entra no cadastro. Sem isso
  `atendimentos.cliente_id` ficava nulo e `v_clientes.valor` somava zero.
- `agendar-atendimento.ts` grava o espelho nos dois caminhos (`criado` e `ja_existia`);
  `cancelarAtendimento` marca `situacao='cancelado'`.
- Provado: `v_clientes` passou a calcular `atendimentos: 1 · valor: 180.00`.

## 7. `MAISA_RESPONDER_A_SI_MESMO` não migrou junto

Existia no `code` e não no `maisa-app`. Como o número da instância `FAQ` **é o número do
Bruno**, toda mensagem que ele manda para si mesmo chega `fromMe: true` e
`contexto.ts:444` descartava — a MAISA ficava **muda**. Os testes por `curl` não pegaram
isso porque o corpo cru `{de, texto}` pula a normalização do envelope.

→ adicionada em `maisa-app` (produção e preview) + redeploy. Confirmado em
`/api/whatsapp/conexao`: `respondeASiMesmo: true`, `tenant.fonte: integracoes_whatsapp`.

⚠️ **Testar pelo APLICATIVO DO CELULAR, não pelo WhatsApp Web.** `APARELHOS` só aceita
`source` ∈ {`ios`, `android`, `desktop`}, e o comentário do código diz que envio de API sai
como `web` — do navegador há boa chance de cair no descarte e parecer que voltou a quebrar.

⚠️ **DESLIGAR no lançamento.** Com a flag ligada, a proteção contra loop passa a depender do
campo `source` da Evolution em vez da regra absoluta `fromMe = ignora`. Ela só existe porque
o número de teste é o pessoal do dono; com número de negócio de verdade, não deve ficar.

## 8. "Não funciona no meu zap" — era o WhatsApp WEB

**Causa encontrada e provada.** Testado no webhook real de produção:

```
source=web      → {"ok":true,"ignorado":true}   ← descartado em silêncio
source=android  → respondeu normalmente
```

O código já documenta a limitação em `contexto.ts` (~linha 440): mensagem digitada no
WhatsApp **Web** sai com `source: "web"`, idêntica ao eco da própria MAISA (Baileys se
apresenta como dispositivo web), e no empate o código escolhe o silêncio — errar para o
outro lado é loop infinito pago.

**→ Para testar, use o APP DO CELULAR.** Confirmado nos registros da Evolution: as 30
mensagens recentes do chat são todas `fromMe:true, source:"web"` (saídas da MAISA).

### O conserto de verdade (não feito)

Rastrear os ids das mensagens que NÓS enviamos e tratar como eco só o que está na lista;
qualquer outro `fromMe` é humano — funciona inclusive no WhatsApp Web e deixa de depender
do campo `source`. `canalEvolution.enviar` teria que devolver o `key.id` que a Evolution
retorna, e a lista precisa sobreviver entre lambdas. **A DDL já tem o lugar:**
`mensagens_agente.provedor_id` com índice único (`007_memoria_agente.sql`), criado para
deduplicação. Isso também mataria a dívida de "sem deduplicação de reentrega".

Com esse conserto, `MAISA_RESPONDER_A_SI_MESMO` deixa de ser necessária.

## ✅ OS DOIS BUGS DO TESTE — CONSERTADOS (aguardando deploy)

**1. Escalação espúria depois de marcar com sucesso.** `agendar`, antes de recusar por
"horário não ofertado", agora lê a agenda e verifica se aquele horário **já está marcado
para este cliente** (`jaMarcadoPara` em `ferramentas.ts` — filtra por marca da MAISA **e**
por telefone, o mesmo par de condições de privacidade do `meus_horarios`). Se está, devolve
sucesso e liga `estado.jaEstavaMarcado`, que o guardrail de `agente.ts` passa a respeitar.

Sinal **estrutural**, não heurística de texto — o comentário do guardrail proíbe
explicitamente a versão textual, e o caminho "o modelo inventou um horário que ninguém
ofereceu nem marcou" continua escalando. Custa uma leitura de agenda só no caminho de
recusa, que é raro. Falha de leitura responde `false`: na dúvida vale o guardrail original.

**2. `cliente_nome` gravado como "Cliente".** `agendar` agora recusa marcar para um LEAD
sem nome e manda o modelo perguntar. Só para lead: quem está no cadastro tem nome digitado
pelo dono, e perguntar de novo faria a MAISA parecer não lembrar de cliente antigo.

⚠️ **A checagem fica ANTES de `estado.tentouAgendar = true`, e a ordem é o conserto.** Se
ficasse depois, parar para perguntar o nome seria lido como "tentou marcar e não conseguiu"
e escalaria para o dono justamente quando o modelo fez a coisa certa. Há comentário no
código dizendo para não mover.

Virou guardrail de código (camada 2) porque em prompt já estava e não bastou: a
`persona.ts` pede "peça o primeiro nome antes de confirmar" e o modelo marcou antes.

## ⏸️ BLOQUEADO PARA DEPLOY — refactor de Conversas em andamento

Em 12/08 ~15h50 havia **19 erros de `tsc`, nenhum nos arquivos desta passada**, todos do
refactor de Conversas em curso (porta `RepositorioConversas` nova, `Conversa.hora` removido):
`demo/conversas.ts`, `ui/estado/store.tsx`, `ui/detalhe.tsx`, `ui/telas/Conversas.tsx`.

`next.config.mjs` **não** tem `typescript.ignoreBuildErrors`, então o build falha e o deploy
não sobe. Quando `npx tsc --noEmit` voltar a zero:

```sh
npx vercel --prod --yes        # projeto maisa-app; NÃO deploye no "code"
```

## ⚠️ ANTIGA seção de bugs (mantida para histórico)

**1. Escalação espúria depois de marcar com sucesso.** Sequência real:

```
turno 2  "10:30 pode ser, marca pra mim"  → MARCOU (evento criado) + "qual seu primeiro nome?"
turno 3  "Bruno"                          → escalou: "confirmação sem agendamento"
```

`EstadoDoTurno` é por turno. No turno 3 o modelo chamou `agendar` de novo, a allowlist de
ofertas recusou (não houve `oferecer_horarios` naquele turno), então `tentouAgendar=true` e
`marcou=null` → o guardrail de `agente.ts:269` descartou a resposta e chamou o dono. Está
fail-safe, mas o dono é incomodado num atendimento que deu certo, e o cliente recebe
silêncio depois de dizer o nome. O guardrail precisa saber que aquele `maisa_ag` já está
marcado — provavelmente olhando `ja_existia` em vez de só `marcou`.

**2. `cliente_nome` gravado como "Cliente".** O modelo marcou ANTES de pedir o nome, então
o snapshot e o cliente novo no cadastro ficaram com "Cliente". A `persona.ts` pede "peça o
primeiro nome antes de confirmar" e `nome_cliente` é opcional no schema do `agendar` — é
camada 3 (prompt), a mais fraca. Se o nome importa no cadastro, ou vira obrigatório no
schema, ou o agente atualiza o cliente depois do `anotar_nome`.

## Lixo de teste em PRODUÇÃO — deixado de propósito

O evento de **13/08 10:30** está na agenda do Bruno para ele poder ver que funcionou.
⚠️ Os R$ 60 entram na competência de agosto, e há um cliente "Cliente" com o número dele.

```sql
delete from public.atendimentos where cliente_tel = '5511994294906';
delete from public.clientes    where telefone     = '5511994294906';
-- e apagar o evento de 13/08 10:30 na mão no Google Calendar
```

## Dívida que segue aberta

- **`GOOGLE_*` vazio no `.env.local`** — as vars são *Sensitive* na Vercel e não dá para
  baixar. Teste local usa agenda em memória; para iterar no calendar é em produção.
- **`assistente`, `faqs` e `cfg` ainda vêm de fixture** em `composicao.ts`. As tabelas
  existem; nenhuma tela grava nelas (a "A MAISA" vive no `localStorage`).
- **`sm-agent-app` não foi lido.** Repo privado da org `smillerAlinhadores`; o `gh` desta
  máquina é `brunovaskevicius-bot`, que não é membro. Bruno pediu comparação lado a lado
  e considerar substituir o agente inteiro.
- **Nada commitado.** O deploy foi pelo CLI, direto dos arquivos locais.

# Dossiê — sessão "fazer a MAISA marcar no Google Calendar" (12/08/2026)

> **Para a outra sessão.** Você mexeu em Conversas/histórico; eu mexi em agendamento,
> espelho no Supabase e infraestrutura de produção. Nossos trabalhos já se encontraram
> (você fiou meu `registro` em `composicao.ts`). Este documento é o que eu fiz e **por quê**,
> para você decidir o que mantém. Nada aqui é sagrado — mas o §5 tem coisas que foram
> MEDIDAS em produção, e revertê-las sem substituto reabre bugs que custaram achar.

---

## 1. O pedido e o resultado

Bruno: *"a MAISA ainda não marca os agendamentos no meu calendar; a IA tem que ter uma tool
de marcar sincronizando com o calendar e o supabase."*

**Resultado: funciona em produção.** Verificado com evento real:

```
evento_id  bglppgomp9ihi3681uc58chnds        ← id do Google, não "demo-1"
html_link  …eid=…IGJydW5vLnZhc2tldmljaXVzQHBvbGlqdW5pb3IuY29tLmJy
                                              ← bruno.vaskevicius@polijunior.com.br
inicio     2026-08-13T13:30:00+00:00         ← 10:30 BRT
espelho    atendimentos: "Atendimento rápido" · ator_tipo agente · competencia 2026-08-01
v_clientes atendimentos 1 · valor 180.00     ← o faturamento por cliente amarrou
```

**Descoberta central: a tool de marcar já existia e estava correta.** O que impedia era
ambiente, não lógica. Ver §4.

---

## 2. Código que eu CRIEI

| Arquivo | O que é |
|---|---|
| `nucleo/portas/saida/registro-atendimentos.ts` | Porta do ESPELHO (`RegistroDeAtendimentos`) |
| `adaptadores/saida/supabase/atendimentos.ts` | Implementação real (`registroSupabase`) |
| `adaptadores/saida/demo/atendimentos.ts` | Par em memória (`registroDemo`) + `espelhoDemo()` / `zerarEspelhoDemo()` |
| `.claude/CONTINUAR-AQUI.md` | Estado, checklist de produção, dívida |

### A invariante da porta, que NÃO pode ser afrouxada

**Nenhum método do adaptador do espelho lança.** É o oposto de
`saida/supabase/repositorio.ts`, onde `exigirSemErro` transforma falha em `FalhaDoProvedor`.
O motivo é a ORDEM: quando o espelho roda, **o evento já existe no Google**. Lançar abortaria
o caso de uso depois do efeito irreversível — horário bloqueado na agenda do dono e o cliente
ouvindo "não deu certo". Falha aqui é `console.error` e segue.

Custo aceito, escrito no cabeçalho: o espelho pode ficar com buraco (faturamento a menos,
atendimento sem auditoria de ator). A idempotência não sofre — quem protege contra marcar
duas vezes continua sendo a varredura de agenda em `agendar-atendimento.ts`.

E a invariante de leitura, herdada de `supabase/LEIA-ME.md` §3.1: **não desenhe grade de
agenda a partir de `atendimentos`.** Evento criado direto no Google não passa pelo espelho.

---

## 3. Código que eu MODIFIQUEI (arquivos compartilhados com você)

### 3.1 `nucleo/portas/saida/repositorio-negocio.ts` — `garantirCliente()`

Único método de ESCRITA numa porta que era toda leitura. A quebra de simetria está
justificada no docstring. Sem ele, quem marca pelo WhatsApp **nunca entra no cadastro**: o
agente identificava desconhecido como `lead:<telefone>`, string que o `PARECE_UUID` do
adaptador Supabase recusa de propósito. Efeito duplo e invisível — a tela de Clientes não
crescia pelo canal que mais traz gente, e `atendimentos.cliente_id` ficava nulo, então
`v_clientes.valor` somava zero.

Contrato: `telefone` é a chave de deduplicação e é obrigatório. **Nunca sobrescreve nome de
cliente existente** — se o dono digitou "Maria Silva" e o modelo ouviu "Mary", manda o dono.

Implementado nos dois adaptadores. No demo ele **muta o fixture** `CLIENTES`, contrariando de
propósito a nota "cópias rasas" do arquivo: ali o fixture É o banco.

### 3.2 `nucleo/aplicacao/agendar-atendimento.ts`

- nova dependência `registro: RegistroDeAtendimentos`;
- passo **3b**: se o `clienteId` não resolve e há telefone, chama `garantirCliente`. Vale para
  o painel também, de propósito — "todo atendimento tem cliente no cadastro" é regra de
  negócio, e uma regra que só valesse para um dos chamadores seria a segunda cópia da regra
  que esta arquitetura existe para não ter. Na prática o painel manda id que resolve e o bloco
  não faz nada;
- `fimISO` hoisted (o espelho precisa dele);
- helper `finalizar(situacao, evento)` grava o espelho e monta o retorno. **Os dois caminhos
  passam por ele, inclusive `ja_existia`** — se o evento existe no Google e a linha não existe
  no banco (estado de todo atendimento anterior a este código), a retentativa é a única chance
  de o espelho se corrigir. `registrar` é idempotente por `maisaAg`;
- o `await` em `registro.registrar` é deliberado: na Vercel a função pode ser congelada quando
  a resposta HTTP sai, e promessa não aguardada morre no meio da escrita;
- a marca gravada no evento agora usa `cliente?.id ?? p.clienteId` em vez de `p.clienteId`, para
  não gravar `lead:<telefone>` no Google. **Nada quebra em quem lê:** `meus_horarios` reencontra
  o atendimento pelo TELEFONE da marca, não por esse id.

### 3.3 `nucleo/aplicacao/agenda.ts` — `criarCancelarAtendimento`

Ganhou `registro` e chama `registro.cancelar` **depois** do provedor (mesma ordem e mesmo
motivo do agendar). Sem isso, cada cancelamento deixaria linha `marcado` para sempre e o
faturamento cobraria atendimento que ninguém fez.

### 3.4 `adaptadores/entrada/whatsapp/ferramentas.ts` — ⚠️ TOCA NO SEU TERRITÓRIO

Três mudanças, todas no `case "agendar"`:

**(a) `EstadoDoTurno.jaEstavaMarcado`** + helper `jaMarcadoPara(agendaId, data, inicio)`.
Antes de recusar por "horário não ofertado", lê a agenda e verifica se aquele horário já está
marcado para este cliente. Filtra por marca da MAISA **E** por telefone — as duas condições
são de privacidade, iguais às do `meus_horarios`: sem `e.maisa` responderia "sim" a um
compromisso pessoal do dono; sem o telefone confirmaria para a pessoa errada o horário de
outro cliente. Falha de leitura devolve `false` (na dúvida, vale o guardrail original).

**(b) Guardrail de nome para LEAD.** Recusa marcar quando `!perfil.clienteId` e não há nome, e
manda o modelo perguntar.

> ⚠️ **A ORDEM É O CONSERTO.** Este `return` fica **ANTES** de `estado.tentouAgendar = true`.
> Se ficasse depois, o guardrail do fim do turno veria "tentou e não marcou" e escalaria para
> o dono justamente quando o modelo fez a coisa certa (parou para perguntar). Há comentário
> no código pedindo para não mover. **Se você reordenar este bloco, leia isto primeiro.**

**(c)** nada mais. Eu **não** mexi em `oferecer_horarios`, `meus_horarios`, `cancelar`,
`anotar_nome` nem `chamar_humano`.

### 3.5 `adaptadores/entrada/whatsapp/agente.ts` — ⚠️ TOCA NO SEU TERRITÓRIO

**Uma linha:**

```diff
- if (estado.tentouAgendar && !estado.marcou) {
+ if (estado.tentouAgendar && !estado.marcou && !estado.jaEstavaMarcado) {
```

Mais o comentário acima explicando. Não toquei em mais nada do loop.

---

## 4. As SETE causas reais (nenhuma era lógica de agendamento)

Isto é o núcleo do dossiê. A tool estava certa desde o começo.

1. **DOIS PROJETOS NA VERCEL.** O webhook da Evolution apontava para `code-ten-blue.vercel.app`
   — projeto `code`, criado por um `vercel` rodado de dentro da pasta `code/`. Ele tem 10 env
   vars e **nenhuma do Supabase nem do Google**: a MAISA em produção rodava em modo
   demonstração puro, fixture como cadastro e agenda em memória que morre a cada lambda.
   → webhook repontado para `maisa-app-sooty.vercel.app`. **Produção é `maisa-app`.**
2. **`MAISA_TENANT_ID` guardava o `user_id`.** Resíduo de quando `tenantId == usuarioId`
   (`dominio/tenant.ts` diz isso); no multi-inquilino divergiram e o env ficou atrás.
   - errado `5d132450-054e-4212-8001-cf2a27e992d7` = `membros.user_id`
   - **certo `a652c37d-25c9-40b5-937f-4a95fbfa5631`** = `negocios.id`
3. **`NEXT_PUBLIC_SUPABASE_URL` era a URL do dashboard**, não da API. `isSupabaseConfigured` só
   checa se a variável existe → o app trocava fixture por Supabase e toda consulta batia num
   308. Certo: `https://gsurucxllwpxcldljgur.supabase.co`
4. **`SUPABASE_SERVICE_ROLE_KEY` não existia em produção.** Agente não tem cookie →
   `contexto-cliente.ts` exige service role → `NaoConfigurado` antes de ler qualquer coisa.
5. **`integracoes_whatsapp` estava vazia.** Com a service role presente, `whatsapp/contexto.ts`
   resolve o inquilino pelo banco e **falha fechada**. A chave sozinha deixaria a MAISA MUDA
   em vez de melhor. → linha criada (`FAQ`, `5511994294906`).
6. **Bug meu: `conversa_id` é `uuid`** e o laboratório passa `atorAgente("laboratorio")`. O
   Postgres recusava a linha inteira com `22P02`; como o adaptador não lança, o sintoma era o
   pior possível — agendamento OK, MAISA confirmando, espelho vazio, nada denunciando.
   → `uuidOuNulo` aplicado em `auditoria()`.
7. **`MAISA_RESPONDER_A_SI_MESMO` não migrou para o `maisa-app`.** Ver §5.

---

## 5. MEDIDO em produção — não reverta sem substituto

### 5.1 O WhatsApp Web é indistinguível do eco da MAISA

Testado no webhook real:

```
source=web      → {"ok":true,"ignorado":true}   ← descartado em silêncio
source=android  → responde normalmente
```

`contexto.ts` (~440) já documentava. Como o número da instância `FAQ` **é o número do Bruno**,
ele testa mandando mensagem para si mesmo; do WhatsApp Web isso sai `source: "web"`, igual ao
que o Baileys envia. **Bruno tem que testar pelo app do celular.**

**O conserto de verdade (não feito, e é seu território):** rastrear os `key.id` das mensagens
que NÓS enviamos e tratar como eco só o que está na lista. Funciona no Web e dispensa a flag.
`canalEvolution.enviar` teria que devolver o id, e a lista precisa sobreviver entre lambdas —
**`mensagens_agente.provedor_id` com índice único já existe no `007`**, criado para
deduplicação. Isso mataria a dívida de "sem deduplicação de reentrega" também.

### 5.2 A escalação espúria (o que §3.4a e §3.5 consertam)

Sequência real, em produção:

```
turno 2  "10:30 pode ser, marca pra mim"  → MARCOU + "qual seu primeiro nome?"
turno 3  "Bruno"                          → escalou: "confirmação sem agendamento"
```

`EstadoDoTurno` é POR TURNO, então no turno 3 `ofertas` nasce vazio. O modelo chamou `agendar`
de novo (razoável: estava fechando), a allowlist recusou, e o loop concluiu "tentou e não
conseguiu, logo mentiu". Não mentiu — o atendimento existia. Custo: o dono é chamado no meio
de um atendimento que deu certo, e o cliente recebe **silêncio** depois de dizer o nome.

O comentário do guardrail em `agente.ts` proíbe explicitamente resolver isso lendo o texto
("`Pronto, agendado!`" e "`confirma?`" são a mesma frase para qualquer heurística). Por isso o
sinal é **estrutural**: uma leitura da agenda real. O caminho "o modelo inventou um horário que
ninguém ofereceu nem marcou" **continua escalando**.

### 5.3 `cliente_nome` gravado como "Cliente"

O primeiro atendimento real ficou assim porque o modelo marcou antes de perguntar o nome. Isso
agora tem consequência de banco: `garantirCliente` CRIA a linha, e ela nasceria "Cliente" para
sempre (o adaptador não sobrescreve nome existente, de propósito). A `persona.ts` já pedia
"peça o primeiro nome antes de confirmar" e o modelo ignorou — prompt é camada 3, a que não
vale como garantia. Virou código (camada 2), que é onde o `LEIA-ME` da pasta manda morar.

---

## 6. Mudanças de INFRA (não estão em código, não aparecem no diff)

| Onde | O que |
|---|---|
| Vercel `maisa-app` prod | `SUPABASE_SERVICE_ROLE_KEY` adicionada |
| Vercel `maisa-app` prod+preview | `MAISA_TENANT_ID` corrigido, `NEXT_PUBLIC_SUPABASE_URL` corrigida, `MAISA_RESPONDER_A_SI_MESMO=1` |
| Evolution, instância `FAQ` | webhook: `code-ten-blue` → `maisa-app-sooty.vercel.app/api/whatsapp` |
| Supabase produção | linha em `integracoes_whatsapp` criada |
| `.env.local` | URL e tenant corrigidos (backup em `.env.local.bak-url`). `GOOGLE_*` segue VAZIO |
| Deploys | dois `vercel --prod` no `maisa-app` (o segundo para a flag valer) |

⚠️ **`GOOGLE_*` está vazio no `.env.local`** — as vars são *Sensitive* na Vercel e não dá para
baixar. Teste local usa agenda em memória; iterar no calendar é em produção.

---

## 7. Lixo de teste em PRODUÇÃO — precisa sair

Deixado de propósito para o Bruno ver que funcionou. **Os R$ 60 estão inflando agosto.**

```sql
delete from public.atendimentos where cliente_tel = '5511994294906';
delete from public.clientes    where telefone     = '5511994294906';
-- e apagar o evento de 13/08 10:30 na mão no Google Calendar
```

---

## 8. Onde nossos trabalhos se cruzam

- **`ferramentas.ts` e `agente.ts`** — os únicos arquivos onde mexemos nos dois. Minhas
  mudanças estão listadas em §3.4 e §3.5 e são cirúrgicas. O ponto de atenção é a ORDEM do
  guardrail de nome (§3.4b).
- **`composicao.ts`** — você já fiou meu `registro` (linhas 41, 42, 97, 132, 133). Nada a fazer.
- **`RepositorioHistorico`** — eu não toquei. A `009_conversas_painel.sql` e a porta
  `RepositorioConversas` são inteiramente suas.
- **`atendimentos` vs `v_conversas`** — sem conflito: espelho de agendamento e thread de
  conversa são tabelas diferentes. Mas note que sua `v_conversas` faz `coalesce(mem.nome,
  cl.nome)`, e meu `garantirCliente` passou a CRIAR `clientes` a partir do WhatsApp — então
  `cl.nome` agora existe para leads que marcaram, onde antes era sempre null. Isso melhora a
  sua view; só não te surprenda.
- **Build.** Em 12/08 ~15h50 havia 19 erros de `tsc`, **nenhum nos meus arquivos**, todos do
  refactor de Conversas (`demo/conversas.ts`, `ui/estado/store.tsx`, `ui/detalhe.tsx`,
  `ui/telas/Conversas.tsx`). `next.config.mjs` não tem `ignoreBuildErrors`, então **o deploy
  está travado até isso zerar.** Meus dois consertos de §5.2 e §5.3 estão no disco esperando.

---

## 9. Não feito, e por quê

- **`sm-agent-app` não foi lido.** Repo privado da org `smillerAlinhadores`; o `gh` da máquina
  é `brunovaskevicius-bot`, que não é membro. Bruno pediu comparação lado a lado e considerar
  substituir o agente inteiro por ele.
- **`assistente`, `faqs` e `cfg` ainda vêm de fixture** em `composicao.ts`. As tabelas existem;
  nenhuma tela grava nelas (a tela "A MAISA" vive no `localStorage`).
- **Nada commitado.** Os deploys foram pelo CLI, direto dos arquivos locais.

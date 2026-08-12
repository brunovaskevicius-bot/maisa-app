# `supabase/` — o schema é o arquivo, não a prosa

Aqui mora a DDL versionada da MAISA. A regra do repo vale inteira nesta pasta: **o
arquivo é a verdade**. No projeto de onde a integração do Google veio (BIP), a tabela
equivalente só existia descrita em texto na documentação — subir um ambiente novo
dependia de alguém lembrar do schema. Aqui não depende.

> **Leia junto:** [`../ARQUITETURA.md`](../ARQUITETURA.md) para o mapa do hexágono, e
> `src/nucleo/dominio/` para os tipos que estas tabelas espelham.

---

## 1. Ordem de execução

Supabase → Dashboard → **SQL Editor** → cole o arquivo inteiro → **Run**. Um por vez,
nesta ordem. Todos são reexecutáveis (`if not exists`, `create or replace`,
`drop policy if exists`), então rodar de novo não estraga nada.

| # | Arquivo | O que faz |
|---|---|---|
| 001 | `001_google_integracoes.sql` | **legado.** Tokens do Google por `user_id`. Ainda em uso pelo app em produção — ver §6 |
| 002 | `002_multitenant.sql` | Tabelas, índices, constraints, triggers |
| 003 | `003_rls.sql` | Os helpers de RLS e todas as políticas |
| 004 | `004_visoes.sql` | As views do que é derivado (contadores, fila) |
| 005 | `005_provisionar.sql` | `criar_negocio()` — um inquilino inteiro numa transação |
| 006 | `006_migrar_google.sql` | Copia as conexões do 001 para o modelo novo |
| 007 | `007_memoria_agente.sql` | Memória do cliente e a thread do WhatsApp (`mensagens_agente`) |
| 008 | `008_seed_bruno.sql` | O negócio do Bruno, para o app abrir com dado de verdade |
| 009 | `009_conversas_painel.sql` | O que faltava para o **painel** mostrar e responder a conversa: número completo em `mensagens_agente`, `conversas_estado` (quem conduz) e a view `v_conversas` |
| 099 | `099_auditoria.sql` | **Falha se o isolamento estiver aberto.** Rode a cada mudança de schema |

⚠️ O 001–008 já rodou contra o Supabase do Bruno (o app lê `negocios` e `clientes` de lá).
O **009 é o único pendente** enquanto isto está escrito, e sem ele a tela de Conversas
responde erro: o adaptador consulta uma view que ainda não existe. Rode em ordem e leia os
`notice` — o 007 é a prova de que eles importam: um `create policy` abortado deixou duas
tabelas com RLS ligada e política nenhuma, e o sintoma foi "o painel não lê, o agente lê".

---

## 2. O desenho em cinco linhas

```
negocios ──┬── membros ──────────── auth.users        ← quem pode operar o quê
           ├── profissionais ─┬─ integracoes_google   ← quem atende, e a agenda dele
           │                  └─ servicos_profissionais ─ servicos
           ├── clientes ─────── atendimentos ← ESPELHO (a verdade é o Google)
           ├── notas · config_fiscal · assinaturas    ← dinheiro e prefeitura
           └── conversas ─ mensagens · faqs · assistente · horarios_anunciados
```

`tenant_id` em **toda** tabela. Isolamento imposto pelo Postgres (RLS), nunca pelo
`where` do código.

---

## 3. As cinco decisões que valem discussão

### 3.1 `atendimentos` é espelho, não verdade

O domínio é explícito: a fonte da verdade dos horários é a agenda externa conectada, e
o app **não mantém uma segunda lista** — quando mantinha, nenhuma tela conseguia dizer
qual das duas era a real. Esta tabela não revoga aquilo. Ela existe porque três
perguntas não têm resposta no Google:

1. **Idempotência** sem ida ao provedor — `unique (tenant_id, maisa_ag)`. Hoje o
   servidor procura a marca varrendo dias de agenda; o agente de WhatsApp vai retentar
   muito mais e não pode pagar uma varredura por tentativa.
2. **Faturamento** — `Cliente.atendimentos` e `Cliente.valor` são a base da nota do mês
   e hoje são constante em fixture. Não há como somar a competência a partir do Google
   sem reler a agenda inteira a cada abertura de tela.
3. **Ator** — `dominio/tenant.ts` pede em voz alta que um atendimento criado pela IA
   seja distinguível de um criado à mão. O Google guarda a descrição, não quem escreveu.

**A invariante:** a grade (`LerAgenda`) continua vindo do provedor. **Não desenhe tela
de agenda a partir desta tabela** — um evento criado direto no Google não passa por
aqui, e a grade ficaria mentindo. Se um dia você precisar dela para render, o problema
mudou de tamanho e a decisão precisa ser retomada de propósito, não por conveniência.

Sem constraint de sobreposição de horário, também de propósito: o dono **pode** querer
encaixe, e um evento nascido fora da MAISA não estaria na tabela — a constraint daria
confiança falsa e recusaria linha legítima.

### 3.2 A config fiscal sai do `.env` — é isto que destrava o segundo cliente

Hoje `adaptadores/saida/focus/config.ts` lê `NF_PRESTADOR_CNPJ`, `NF_ITEM_LISTA_SERVICO`
e companhia de variável de ambiente. Variável de ambiente é **global**: com ela, o app
inteiro só sabe emitir nota de um CNPJ. Não é limitação de escala — é limitação de um.

`config_fiscal` põe uma linha por inquilino. O trabalho no código é `focus/config.ts`
deixar de ler `process.env` e passar a receber a config do inquilino que o contexto já
carrega. O env continua servindo de fallback durante a transição e para a demo aberta.

### 3.3 Segredo cifrado no banco, chave no servidor

Tokens do Google, token da Focus e token do WhatsApp ficam cifrados com AES-256-GCM
pela aplicação (`src/adaptadores/saida/google/cripto.ts`). O banco guarda texto cifrado;
a chave mora só em env de servidor.

**O limite, escrito:** a sessão de um `dono` comprometida consegue ler o *ciphertext*,
porque o app lê o banco com a sessão do usuário. Ela não consegue a credencial. Endurecer
mais significaria ler segredo com **service key** — e o custo disso é conhecido: foi a
service key ignorando RLS que transformou cinco filtros esquecidos em cinco IDORs no
projeto anterior. Fica como está. O caminho de endurecimento, se um dia valer o risco:
mover os segredos para tabela sem privilégio de `authenticated` e lê-los por RPC.

### 3.4 Nada de contador guardado

`Cliente.atendimentos`, `Cliente.valor`, `Profissional.atendimentosMes` e a fila
"Precisa de você" **não são colunas** — são views no arquivo 004. O fixture guardava
`atendimentosMes: 168` em cada profissional *e* a soma dos quatro dava 407 numa tela e
168 na outra: dois números para a mesma coisa, discordando na mesma sessão. Contador que
ninguém recalcula sempre vira isso.

### 3.5 Convenção de dia da semana: 0 = segunda

`expediente_folga` e `horarios_anunciados.dow` usam **0 = segunda … 6 = domingo**, que é
a convenção de `dominio/expediente.ts`. O Postgres não usa essa: `extract(dow)` devolve
**0 = domingo**. Use sempre `public.dow_maisa(data)`. Misturar as duas é o tipo de erro
que só aparece no domingo — quando o negócio está fechado e ninguém está olhando.

---

## 4. Como as FKs se comportam ao apagar

Escolhido para não haver **nenhum** conflito de cascade: apagar um `negocio` funciona
com um `delete` só, sem ordem manual.

| Relação | FK | `on delete` | Por quê |
|---|---|---|---|
| tudo → `negocios(id)` | simples | `cascade` | apagar o inquilino apaga o inquilino inteiro |
| `servicos_profissionais` → serviço/profissional | **composta** `(tenant_id, id)` | `cascade` | é a própria relação; sem as pontas ela não existe |
| `integracoes_google` → `profissionais` | **composta** | `cascade` | conexão sem agenda não faz sentido |
| `atendimentos` → `profissionais` | **composta** | `cascade` | idem |
| `mensagens` → `conversas` | **composta** | `cascade` | mensagem fora de thread é lixo |
| `clientes.servico_id` → `servicos(id)` | simples | `set null` | aposentar um serviço não pode apagar cliente |
| `atendimentos.cliente_id` → `clientes(id)` | simples | `set null` | LGPD: apagar o cliente não apaga o histórico do negócio; o snapshot preserva nome, telefone e valor |
| `conversas.cliente_id` → `clientes(id)` | simples | `set null` | lead sem cadastro é caso normal, não borda |
| `atendimentos.servico_id` | **sem FK** | — | o domínio **já assume** que esse id pode não resolver (serviço criado no navegador do usuário); nome e valor vêm no snapshot |
| `notas.cliente_id` | **sem FK** | — | nota autorizada é documento imutável e autossuficiente: não pode mudar nem desaparecer porque alguém editou um cadastro |

**Composta vs. simples:** a FK composta `(tenant_id, id)` é o que impede amarrar o
serviço de um inquilino ao profissional de outro — o banco recusa. Onde a FK é simples,
essa garantia não existe: se um membro colar o uuid de outro inquilino, o `join`
filtrado por `tenant_id` simplesmente não resolve. Nada vaza; só fica nulo.

**Remoção normal é `ativo = false`**, não `delete` — o domínio já tem o campo em
`Cliente`, `Servico` e `Profissional`. `delete` é o caminho de LGPD.

---

## 5. O que o código precisa ganhar para usar isto

Nada disto está feito — é a lista de trabalho que este schema habilita:

1. **`adaptadores/entrada/http/contexto.ts`** — `tenantDoUsuario()` hoje devolve
   `tenantId = usuarioId`. Passa a chamar `public.meus_negocios()` (ou a ler
   `membros` com `padrao`). O comentário no arquivo já promete que mais nada muda.
2. **`adaptadores/saida/supabase/repositorio.ts`** (não existe) — implementa
   `RepositorioNegocio` sobre `v_clientes`, `v_profissionais`, `v_servicos`,
   `v_negocio`. Depois é **uma linha** em `src/composicao.ts` trocando `repositorioDemo`.
   `agendasPermitidas()` deixa de ser a constante `COLUNAS_AGENDA` e vira
   `select id from profissionais where tenant_id = … and ativo`.
3. **`saida/google/conexoes.ts`** — trocar `google_integracoes` por
   `integracoes_google`, e `user_id` por `tenant_id`. O `onConflict` passa a ser
   `"tenant_id,profissional_id"`.
4. **`saida/focus/config.ts`** — parar de ler `process.env` e receber a linha de
   `config_fiscal` do inquilino.
5. ~~**Gravar em `atendimentos`**~~ — **FEITO.** `aplicacao/agendar-atendimento.ts` grava
   pela porta `RegistroDeAtendimentos` depois de o provedor confirmar; o adaptador é
   `saida/supabase/atendimentos.ts` (e `saida/demo/atendimentos.ts` no modo sem banco).
   `criarCancelarAtendimento` marca `situacao = 'cancelado'` pelo mesmo caminho — sem isso
   o mês cobraria por atendimento desmarcado.
   Dois detalhes que valem saber antes de mexer: **nada ali lança** (o evento já existe no
   Google quando a gravação roda, então falhar alto criaria horário bloqueado + cliente
   ouvindo "não deu"), e `hora_inicio` é arredondada para o meio mais próximo porque o
   `check` da coluna só aceita múltiplos de 0,5 — um serviço de 20 min produziria `14.333`
   e o Postgres recusaria a linha.
   Junto entrou `RepositorioNegocio.garantirCliente`: quem marca pelo WhatsApp passa a
   existir em `clientes`, senão `atendimentos.cliente_id` ficava nulo e `v_clientes.valor`
   somava zero para quem veio do canal que mais traz gente.
6. **Tela de criação de conta** chamando `supabase.rpc('criar_negocio', …)` logo depois
   do signup.

### Uma decisão que ainda é sua: como o agente de WhatsApp autentica

O agente **não tem cookie**. `integracoes_whatsapp.instancia` é `unique` global
justamente para o webhook poder responder "esta mensagem é de qual inquilino?" sem
sessão. Mas ler e escrever ele precisa, e há dois caminhos:

- **(a) service key confinada** ao adaptador do webhook, com o `tenant_id` vindo
  *sempre* do lookup por `instancia` e de nenhum outro lugar. Simples; o risco é o
  conhecido (RLS desligada nesse caminho), contido a um arquivo.
- **(b) um JWT por inquilino**, assinado no servidor com `sub` de um usuário-robô membro
  do negócio. A RLS continua valendo para o agente. Mais peça para manter.

Recomendação: **(a)**, com o lookup por `instancia` isolado numa função só e uma linha
no `LEIA-ME` do adaptador dizendo que aquele é o único lugar do app onde a service key
aparece. O que não pode é o `tenant_id` chegar por argumento — é literalmente o furo de
`dominio/tenant.ts`.

---

## 6. A ordem do deploy (não inverta)

A tabela `google_integracoes` do arquivo 001 **está em uso em produção agora** — é de lá
que sai o token que desenha a agenda real. O arquivo 006 **copia** e não apaga.

```
1. rodar 002 → 006 no Supabase      (banco novo de pé, dados copiados, app intacto)
2. conferir a query de conferência no fim do 006: nenhuma linha sem par
3. subir o código que lê `integracoes_google`
4. conectar/abrir a agenda em produção e ver que funciona
5. só então: drop table public.google_integracoes  ← numa migration 007
```

Derrubar a tabela antes do passo 3 desconecta a agenda no instante do `Run`, antes de
qualquer deploy.

---

## 7. Ao criar tabela nova

1. `tenant_id uuid not null references public.negocios (id) on delete cascade`
2. Se ela for "dado do dia" (todo membro lê e escreve): acrescente o nome ao array
   `uniformes` no **003**, seção 2. Se tiver segredo ou dinheiro, escreva a política à
   mão e diga qual papel manda.
3. View nova: **`with (security_invoker = true)`**, sempre. É o único objeto do Postgres
   cujo default é o inseguro.
4. Rode o **099**. Ele falha se você esqueceu qualquer um dos três.

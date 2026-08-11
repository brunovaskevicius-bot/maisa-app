-- ═════════════════════════════════════════════════════════════════════════════
-- MAISA — 002 · O ESQUELETO MULTI-INQUILINO
--
-- Rode uma vez no Supabase: Dashboard → SQL Editor → cole → Run.
-- Ordem obrigatória: 002 → 003 → 004 → 005 → 006 → 099.
--
-- O QUE ESTE ARQUIVO É
-- Ele é o espelho de `src/nucleo/dominio/`. Cada tabela aqui existe porque existe um
-- tipo lá, e os nomes das colunas são os nomes dos campos. Isso não é preciosismo: é
-- o que permite ao adaptador `saida/supabase` ser um tradutor bobo (linha → tipo) em
-- vez de uma segunda camada de regra de negócio.
--
-- Se você for adicionar coisa aqui que não tem par no domínio, pare: ou o domínio
-- ganha o tipo primeiro, ou a coluna não deveria existir.
--
-- A REGRA QUE SUSTENTA TUDO
-- `tenant_id` em TODA tabela, e RLS por membro do negócio (arquivo 003). O isolamento
-- é imposto pelo Postgres, nunca pelo `where` do código — foi exatamente um `where`
-- esquecido (com a service key ignorando RLS por cima) que abriu IDOR entre inquilinos
-- em cinco rotas no projeto de onde esta integração veio.
--
-- O QUE NÃO ESTÁ AQUI, DE PROPÓSITO
--   • A GRADE DA AGENDA. A fonte da verdade dos horários continua sendo a agenda
--     externa conectada (Google). `atendimentos` é ESPELHO, não verdade — leia o
--     comentário da tabela antes de usá-la para desenhar tela.
--   • `Profissional.atendimentosMes`, `Cliente.atendimentos`, `Cliente.valor`. São
--     derivados; viram VIEW no arquivo 004. Guardar contador que ninguém recalcula é
--     como o app terminou com dois números para "atendimentos do mês" discordando na
--     mesma sessão.
--   • `ItemFila`. Metade vem de conversa, metade de atendimento de hoje. É consulta.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 0 · Utilidades
-- ─────────────────────────────────────────────────────────────────────────────

/* Mantém `atualizado_em` honesto sem depender de o app lembrar de mandar. */
create or replace function public.toca_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

/* Dia da semana NA CONVENÇÃO DA MAISA: 0 = segunda … 6 = domingo.
 *
 * ⚠️ Não é a do Postgres. `extract(dow)` devolve 0 = DOMINGO, e usar uma num lugar e
 * outra noutro é o tipo de erro que só aparece no domingo — quando o negócio está
 * fechado e ninguém está olhando. Toda comparação com `expediente_folga` e com
 * `horarios_anunciados.dow` passa por aqui.
 *
 * A convenção é a de `src/nucleo/dominio/expediente.ts`. Ela manda. */
create or replace function public.dow_maisa(d date)
returns smallint
language sql
immutable
as $$ select (extract(isodow from d) - 1)::smallint $$;

/* Hora decimal (9.5 = 09:30) → `time`. É a moeda de hora do domínio: a grade, o
 * expediente e `Agendamento.inicio` todos falam em decimal.
 *
 * `24` vira 23:59 porque o expediente aceita fechar à meia-noite e `make_time(24,…)`
 * é erro — meia-noite é hora 0 do dia seguinte, o que não é o que "fecha às 24h"
 * significa para quem escreveu o horário. */
create or replace function public.hora_decimal_para_time(h numeric)
returns time
language sql
immutable
as $$
  select case
    when h is null then null
    when h >= 24   then time '23:59'
    else make_time(floor(h)::int, (round((h - floor(h)) * 60))::int, 0::double precision)
  end
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · NEGÓCIOS — o inquilino
--
-- Um `negocio` é uma assinatura da MAISA: uma terapeuta, uma barbearia. É a raiz de
-- tudo — apagar esta linha apaga o inquilino inteiro por cascade.
--
-- Hoje o app resolve `tenantId = usuarioId` (ver adaptadores/entrada/http/contexto.ts).
-- Com esta tabela de pé, aquele arquivo passa a fazer o lookup em `membros` e mais
-- NADA no app inteiro muda. Era o combinado.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.negocios (
  id            uuid primary key default gen_random_uuid(),

  nome          text not null check (length(btrim(nome)) between 2 and 120),

  /* Só para atribuição e para escolher o catálogo de partida no provisionamento
   * (arquivo 005). O núcleo NÃO conhece vertical: a diferença entre terapeuta e
   * barbeiro vive nas landing pages e no catálogo de serviços, nunca na regra. */
  vertical      text not null default 'generico'
                  check (vertical in ('terapeutas', 'barbeiros', 'generico')),

  /* Identificador curto e estável para link público / futuro subdomínio. */
  slug          text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),

  /* ⚠️ AINDA NÃO CONSUMIDO pelo app — hoje `src/nucleo/dominio/tempo.ts` fixa
   * America/Sao_Paulo. Nasce aqui porque é o dado que falta para o primeiro cliente
   * fora do fuso de SP, e adicionar coluna depois é fácil; achar as contas de hora
   * espalhadas pelo código não é. */
  fuso          text not null default 'America/Sao_Paulo',

  /* Situação comercial. NÃO é usada em nenhuma política de RLS, e isso é decisão:
   * inquilino inadimplente continua LENDO os dados dele. Trancar o banco por
   * cobrança transforma um problema de financeiro em ticket de suporte "sumiu tudo".
   * Quem barra o uso é o app, com tela que explica o motivo. */
  status        text not null default 'ativo'
                  check (status in ('ativo', 'suspenso', 'cancelado')),

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.negocios is
  'O inquilino: uma assinatura da MAISA. Raiz do cascade de tudo.';

drop trigger if exists tg_negocios_atualizado_em on public.negocios;
create trigger tg_negocios_atualizado_em before update on public.negocios
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · MEMBROS — quem pode operar qual negócio
--
-- É a tabela que faz a RLS funcionar: toda política do arquivo 003 pergunta a ela.
--
-- N:N de propósito. Duas razões concretas: (a) uma barbearia tem dono e recepção;
-- (b) o próprio Bruno precisa operar a conta de um cliente durante o onboarding sem
-- pedir a senha dele — hoje isso só é possível compartilhando login.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.membros (
  tenant_id  uuid not null references public.negocios (id) on delete cascade,
  user_id    uuid not null references auth.users (id)      on delete cascade,

  /* dono     — manda em cobrança, credencial fiscal e em quem entra
   * gestor   — opera tudo do dia e conecta integrações; não mexe em cobrança
   * atendente— agenda, conversa, atende; não vê credencial nem cobrança          */
  papel      text not null default 'atendente'
               check (papel in ('dono', 'gestor', 'atendente')),

  /* Qual negócio abre quando esta pessoa loga. Sem isto, quem é membro de dois
   * negócios cai num deles por sorte de `order by`. */
  padrao     boolean not null default false,

  criado_em  timestamptz not null default now(),

  primary key (tenant_id, user_id)
);

comment on table public.membros is
  'Ponte usuário ↔ negócio. É a fonte de toda política de RLS (ver 003_rls.sql).';

create index if not exists ix_membros_user on public.membros (user_id);

/* Um negócio padrão por pessoa, no máximo. */
create unique index if not exists ux_membros_padrao
  on public.membros (user_id) where padrao;

/* Um negócio sem dono é um negócio que ninguém consegue mais administrar: não dá para
 * trocar credencial fiscal, nem convidar alguém, nem cancelar a assinatura. Não existe
 * tela de suporte para isso, então o banco impede. */
create or replace function public.exige_um_dono()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  /* Apagar o NEGÓCIO cascateia para cá, e aí remover o dono é justamente o certo. O que
   * distingue os dois casos é a profundidade: delete direto do usuário roda em
   * profundidade 1; delete disparado pelo cascade de `negocios`, em 2. Verificar isso é
   * determinístico — bem melhor que perguntar se a linha de `negocios` ainda existe, que
   * depende de em que ponto do comando o cascade nos chamou. */
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  if old.papel = 'dono'
     and not exists (
       select 1 from public.membros
       where tenant_id = old.tenant_id and papel = 'dono' and user_id <> old.user_id
     )
  then
    raise exception 'Este é o último dono de %. Promova outro membro antes.', old.tenant_id
      using errcode = 'restrict_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists tg_membros_ultimo_dono on public.membros;
create trigger tg_membros_ultimo_dono before delete on public.membros
  for each row execute function public.exige_um_dono();

/* Rebaixar o último dono tem o mesmo efeito que apagá-lo. */
create or replace function public.exige_um_dono_no_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.papel = 'dono' and new.papel <> 'dono'
     and not exists (
       select 1 from public.membros
       where tenant_id = old.tenant_id and papel = 'dono' and user_id <> old.user_id
     )
  then
    raise exception 'Este é o último dono de %. Promova outro membro antes de rebaixar.',
      old.tenant_id using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists tg_membros_ultimo_dono_upd on public.membros;
create trigger tg_membros_ultimo_dono_upd before update of papel on public.membros
  for each row execute function public.exige_um_dono_no_update();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · PROFISSIONAIS — quem atende
--   Espelha `Profissional` (dominio/catalogo.ts) + `Expediente` (dominio/expediente.ts).
--
-- Os dois tipos moram na MESMA tabela porque a relação é estritamente 1:1 — e porque o
-- domínio avisa que o par tem de andar junto: `horario`/`folga` são a FRASE que o dono
-- lê ("Seg–Sáb 09–19"), `expediente_*` é o NÚMERO que o calendário usa. Quando os dois
-- divergirem, quem manda é o número. Deixá-los em tabelas separadas era convidar a
-- divergência que a Agenda e a tela de Equipe já tiveram uma vez.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profissionais (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.negocios (id) on delete cascade,

  nome              text not null check (length(btrim(nome)) between 2 and 120),
  papel             text not null default 'Atendimento geral',

  /* Quando o profissional também tem login (atendente que vê a própria agenda). */
  usuario_id        uuid references auth.users (id) on delete set null,

  avaliacao         numeric(2,1) check (avaliacao between 0 and 5),
  comissao          numeric(5,2) check (comissao between 0 and 100),
  desde             date,
  ativo             boolean not null default true,

  /* ── a frase (apresentação) ── */
  horario           text,
  folga             text,

  /* ── o número (regra) ── Ver dominio/expediente.ts.
   * `expediente_folga`: dias em que NÃO se atende, convenção MAISA (0=segunda…6=domingo).
   * `de`/`ate`: hora decimal — 9.5 = 09:30. Passo de meia hora, como a grade. */
  expediente_folga  smallint[] not null default array[6]::smallint[]
                      check (expediente_folga <@ array[0,1,2,3,4,5,6]::smallint[]),
  expediente_de     numeric(4,2) not null default 9
                      check (expediente_de >= 0 and expediente_de < 24
                             and expediente_de * 2 = round(expediente_de * 2)),
  expediente_ate    numeric(4,2) not null default 19
                      check (expediente_ate > 0 and expediente_ate <= 24
                             and expediente_ate * 2 = round(expediente_ate * 2)),
  check (expediente_ate > expediente_de),

  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),

  /* Alvo das FKs compostas dos filhos — é o que impede um serviço de um inquilino
   * ser amarrado ao profissional de outro. */
  unique (tenant_id, id)
);

comment on column public.profissionais.expediente_folga is
  'Dias sem atendimento na convenção MAISA: 0=segunda … 6=domingo. Use public.dow_maisa().';

create index if not exists ix_profissionais_tenant on public.profissionais (tenant_id) where ativo;

drop trigger if exists tg_profissionais_atualizado_em on public.profissionais;
create trigger tg_profissionais_atualizado_em before update on public.profissionais
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · SERVIÇOS — o que se vende
--   Espelha `Servico` (dominio/catalogo.ts).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.servicos (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.negocios (id) on delete cascade,

  nome          text not null check (length(btrim(nome)) between 1 and 120),
  categoria     text not null default 'Recorrente'
                  check (categoria in ('Recorrente', 'Pacote', 'Extra')),
  preco         numeric(10,2) not null check (preco >= 0),

  /* Minutos. Os limites são os de `duracaoValida` em dominio/agenda.ts: menos de 5 min
   * ou mais de 8 h é dado corrompido, não caso de uso. */
  duracao       integer not null check (duracao between 5 and 480),

  ativo         boolean not null default true,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (tenant_id, id)
);

create index if not exists ix_servicos_tenant on public.servicos (tenant_id) where ativo;

drop trigger if exists tg_servicos_atualizado_em on public.servicos;
create trigger tg_servicos_atualizado_em before update on public.servicos
  for each row execute function public.toca_atualizado_em();

/* `Servico.profissionalIds` e `Profissional.servicoIds` são duas leituras da MESMA
 * relação. No fixture eram dois arrays que precisavam concordar — e não concordavam:
 * sv4, sv5 e sv6 apontavam para profissionais que não existiam mais, e abrir a gaveta
 * do serviço dava tela branca. Aqui a relação tem um lugar só. */
create table if not exists public.servicos_profissionais (
  tenant_id       uuid not null references public.negocios (id) on delete cascade,
  servico_id      uuid not null,
  profissional_id uuid not null,

  primary key (tenant_id, servico_id, profissional_id),

  foreign key (tenant_id, servico_id)
    references public.servicos (tenant_id, id) on delete cascade,
  foreign key (tenant_id, profissional_id)
    references public.profissionais (tenant_id, id) on delete cascade
);

create index if not exists ix_servprof_profissional
  on public.servicos_profissionais (tenant_id, profissional_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · CLIENTES — quem é atendido
--   Espelha `Cliente` (dominio/clientes.ts), menos `atendimentos`/`valor` (derivados,
--   ver a view em 004).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.negocios (id) on delete cascade,

  nome          text not null check (length(btrim(nome)) between 1 and 160),

  /* Como a pessoa escreveu ("(11) 98123-4567"). A busca não usa esta coluna. */
  telefone      text not null check (length(btrim(telefone)) >= 8),

  /* ── A busca quente do agente de WhatsApp ──
   * `RepositorioNegocio.clientePorTelefone` existe na porta antes de ter chamador com
   * um pedido explícito: "que o banco nasça com índice no telefone". Aqui está ele.
   *
   * Compara só os 8 últimos dígitos porque é exatamente aí que as duas grafias do
   * mesmo número coincidem: o cadastro guarda "(11) 98123-4567" e o WhatsApp manda
   * "5511981234567" — DDI e nono dígito são o que varia. É coluna GERADA para a regra
   * viver num lugar só; o `soDigitos(...).slice(-8)` do adaptador demo era a mesma
   * conta escrita em TypeScript, e as duas iam divergir no primeiro caso estranho. */
  telefone_chave text generated always as
                  (right(regexp_replace(telefone, '[^0-9]', '', 'g'), 8)) stored,

  email         text,
  cpf           text,
  canal         text not null default 'Online' check (canal in ('Online', 'Presencial')),

  /* Remoção normal é AQUI, com false. Ver a nota sobre cascades no LEIA-ME:
   * apagar a linha de verdade (LGPD) desamarra o histórico, mas não o apaga. */
  ativo         boolean not null default true,
  desde         date,

  /* Serviço habitual. FK simples e `set null` de propósito: aposentar um serviço não
   * pode apagar cliente nenhum. */
  servico_id    uuid references public.servicos (id) on delete set null,

  /* Cliente que existe só para validar a integração fiscal em produção — a NFS-e só
   * autoriza de verdade em produção, então testar exige emitir nota real, e nota real
   * de teste não pode ficar de pé. Ver dominio/clientes.ts. */
  teste         boolean not null default false,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (tenant_id, id)
);

create index if not exists ix_clientes_telefone
  on public.clientes (tenant_id, telefone_chave);

create index if not exists ix_clientes_tenant on public.clientes (tenant_id) where ativo;

drop trigger if exists tg_clientes_atualizado_em on public.clientes;
create trigger tg_clientes_atualizado_em before update on public.clientes
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · ATENDIMENTOS — o ESPELHO, não a verdade
--
-- ⚠️ LEIA ISTO ANTES DE USAR A TABELA.
--
-- A fonte da verdade dos horários é a AGENDA EXTERNA conectada (hoje o Google). O app
-- não mantém uma segunda lista de eventos: quando mantinha, nenhuma tela conseguia
-- dizer qual das duas era a real. Esta tabela NÃO revoga aquela decisão.
--
--   • A GRADE (`LerAgenda`) continua vindo do provedor. Não desenhe tela de agenda a
--     partir daqui — um evento criado direto no Google não passa por esta tabela, e a
--     grade ficaria mentindo.
--   • O que é dela: o que a MAISA SABE sobre o atendimento — para quem, quanto, quem
--     marcou. E três coisas que o Google não sabe responder:
--
--   1. IDEMPOTÊNCIA sem ida ao provedor. `unique (tenant_id, maisa_ag)`. Hoje o
--      servidor procura a marca varrendo dias da agenda; o agente de WhatsApp vai
--      retentar muito mais e não pode pagar uma varredura por tentativa.
--   2. FATURAMENTO. `Cliente.atendimentos` e `Cliente.valor` são a base da nota do mês
--      e hoje são constante em fixture. Não há como somar a competência a partir do
--      Google sem reler a agenda inteira a cada abertura de tela.
--   3. AUDITORIA DO ATOR. `dominio/tenant.ts` pede em voz alta: "um atendimento criado
--      pela IA precisa ser distinguível de um criado à mão — para auditar, para
--      desfazer e para medir". O Google guarda o texto da descrição, não o ator.
--
-- Não há constraint de sobreposição de horário aqui, e é decisão: o dono PODE querer
-- encaixe, e um evento nascido fora da MAISA não estaria na tabela — a constraint daria
-- confiança falsa e recusaria linha legítima. Choque de horário é regra de aplicação.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.atendimentos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.negocios (id) on delete cascade,

  /* A chave de idempotência cunhada por QUEM PEDE, antes de pedir (RascunhoAgendamento
   * .maisaAg). Repetir o mesmo pedido não cria um segundo atendimento — vale igual para
   * o "Tentar de novo" da tela e para a retentativa do modelo de linguagem. */
  maisa_ag        uuid not null,

  /* Qual agenda. Hoje uma pessoa = uma agenda, então é o profissional; o conceito é
   * separado no domínio (`ContextoAgenda.agendaId`) para o dia em que cadeira ou sala
   * virar agenda e "de quem é a agenda" deixar de ser "quem atende". */
  profissional_id uuid not null,

  /* ── snapshot: o que era verdade no momento da marcação ──
   * Desnormalizado de propósito, igual a `AtendimentoMarcado`. Dois motivos: o valor
   * cobrado é fato fiscal (mudar o preço da tabela não reescreve o passado), e um
   * serviço criado pelo usuário pode não existir no cadastro — daí `servico_id` não
   * ter FK: o domínio JÁ assume que esse id pode não resolver. */
  cliente_id      uuid references public.clientes (id) on delete set null,
  cliente_nome    text not null,
  cliente_tel     text,
  servico_id      uuid,
  servico_nome    text not null,
  servico_valor   numeric(10,2) not null default 0 check (servico_valor >= 0),

  /* ── quando ──
   * `inicio`/`fim` são o instante absoluto: é a verdade, e o que se compara.
   * `data_local`/`hora_inicio` são a PROJEÇÃO CIVIL no fuso do negócio, calculada por
   * quem escreve. Existem porque a tela e o fechamento fiscal pensam em "06/08" e
   * "14:30", não em UTC — e porque coluna gerada não pode ler o fuso da outra tabela. */
  inicio          timestamptz not null,
  fim             timestamptz not null,
  duracao_min     integer not null check (duracao_min between 5 and 480),
  data_local      date not null,
  hora_inicio     numeric(4,2) not null
                    check (hora_inicio >= 0 and hora_inicio < 24
                           and hora_inicio * 2 = round(hora_inicio * 2)),

  /* Competência do fechamento — o "Junho de 2026" da tela de Faturamento. */
  competencia     date generated always as
                    (date_trunc('month', data_local::timestamp)::date) stored,

  /* ── o evento lá fora ── */
  provedor        text not null default 'google',
  evento_id       text,
  meet_link       text,
  html_link       text,

  /* ── estado ── */
  etapa           text not null default 'chegando'
                    check (etapa in ('chegando', 'atendendo', 'feito')),
  /* Confirmou pelo WhatsApp? false ⇒ a MAISA ainda está cobrando. */
  confirmado      boolean not null default false,
  /* Cancelado NÃO apaga: o histórico de quem desmarca é informação do negócio. */
  situacao        text not null default 'marcado'
                    check (situacao in ('marcado', 'cancelado')),
  cancelado_em    timestamptz,

  /* ── o ator (dominio/tenant.ts) ── quem disparou isto. */
  ator_tipo       text not null default 'usuario'
                    check (ator_tipo in ('usuario', 'agente', 'sistema')),
  /* user_id, nome da rotina, ou canal do agente. Texto porque as três coisas cabem. */
  ator_id         text,
  conversa_id     uuid,

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  check (fim > inicio),
  /* O coração da idempotência. */
  unique (tenant_id, maisa_ag),

  foreign key (tenant_id, profissional_id)
    references public.profissionais (tenant_id, id) on delete cascade
);

comment on table public.atendimentos is
  'ESPELHO do que a MAISA marcou. A verdade dos horários é a agenda externa — não '
  'desenhe a grade a partir daqui. Serve a idempotência, o faturamento e a auditoria.';

/* A leitura por janela (janela de agenda, fechamento do mês). */
create index if not exists ix_atendimentos_agenda
  on public.atendimentos (tenant_id, profissional_id, inicio)
  where situacao = 'marcado';

/* O fechamento fiscal: soma por cliente na competência. */
create index if not exists ix_atendimentos_competencia
  on public.atendimentos (tenant_id, competencia, cliente_id)
  where situacao = 'marcado';

/* "Quem eu preciso cobrar confirmação hoje" — a fila. */
create index if not exists ix_atendimentos_confirmacao
  on public.atendimentos (tenant_id, data_local)
  where situacao = 'marcado' and not confirmado;

drop trigger if exists tg_atendimentos_atualizado_em on public.atendimentos;
create trigger tg_atendimentos_atualizado_em before update on public.atendimentos
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · NOTAS — o documento fiscal
--   Espelha `Nota` + `Tomador` (dominio/fiscal.ts). Os status são NOSSOS, não da
--   Focus: o adaptador traduz "processando_autorizacao" → "processando".
--
-- Nenhuma FK para `clientes`, de propósito. Nota fiscal autorizada é documento
-- imutável e autossuficiente: ela não pode mudar nem desaparecer porque alguém
-- editou ou apagou um cadastro. O `cliente_id` fica como pista; o que importa
-- juridicamente está no snapshot do tomador, abaixo.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.notas (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.negocios (id) on delete cascade,

  /* A chave da emissão no provedor, cunhada pelo caso de uso ("maisa-cl1-a1b2c3d4").
   * A Focus recusa ref repetida — e é por ela que se consulta status e se cancela. */
  ref              text not null,

  status           text not null default 'pendente'
                     check (status in ('pendente','processando','emitida','cancelada','erro')),

  numero           text,
  emitida_em       date,
  pdf_url          text,
  xml_url          text,
  erro             text,

  /* Nota que saiu sem token do emissor (número gerado localmente). */
  simulada         boolean not null default false,
  ambiente         text check (ambiente in ('homologacao', 'producao')),

  valor            numeric(10,2) not null check (valor >= 0),
  discriminacao    text not null,
  competencia      date,

  /* Pista, sem FK — ver o cabeçalho desta seção. */
  cliente_id       uuid,

  /* ── snapshot do tomador ── quem recebeu a nota, como estava na emissão. */
  tomador_nome     text,
  tomador_cpf      text,
  tomador_cnpj     text,
  tomador_email    text,
  tomador_telefone text,

  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),

  unique (tenant_id, ref)
);

create index if not exists ix_notas_competencia
  on public.notas (tenant_id, competencia, cliente_id);

/* As que ainda estão em voo — a tela fica consultando até virar autorizada. */
create index if not exists ix_notas_em_voo
  on public.notas (tenant_id, atualizado_em)
  where status in ('pendente', 'processando');

drop trigger if exists tg_notas_atualizado_em on public.notas;
create trigger tg_notas_atualizado_em before update on public.notas
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8 · CONFIG FISCAL — a credencial da prefeitura, por inquilino
--
-- ★ É ESTA TABELA QUE DESTRAVA O "PLUG AND PLAY".
--
-- Hoje os dados do prestador vivem em variáveis de ambiente da Vercel
-- (adaptadores/saida/focus/config.ts: NF_PRESTADOR_CNPJ, NF_ITEM_LISTA_SERVICO…).
-- Variável de ambiente é GLOBAL: com ela, o app inteiro só sabe emitir nota de UM
-- CNPJ. Não existe segundo cliente enquanto o CNPJ estiver no env — não é limitação
-- de escala, é limitação de um.
--
-- Com esta tabela, `focus/config.ts` deixa de ler `process.env` e passa a receber a
-- config do inquilino que o contexto já carrega. O env continua servindo de fallback
-- durante a transição (e para a demo aberta).
--
-- Uma linha por negócio: PK é o próprio tenant_id.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.config_fiscal (
  tenant_id                     uuid primary key
                                  references public.negocios (id) on delete cascade,

  provedor                      text not null default 'focus'
                                  check (provedor in ('focus')),

  /* Default homologação: ninguém emite nota real por acidente no primeiro dia. */
  ambiente                      text not null default 'homologacao'
                                  check (ambiente in ('homologacao', 'producao')),

  /* Token da Focus, CIFRADO com AES-256-GCM pela aplicação (o mesmo esquema de
   * src/adaptadores/saida/google/cripto.ts). O banco guarda texto cifrado; a chave
   * mora só no servidor. Sem ela, isto aqui não vale nada.
   * Ausente ⇒ emissão roda em modo simulado: fluxo inteiro, nada real. */
  token_cifrado                 text,

  /* ── prestador ── */
  prestador_nome                text,
  prestador_cnpj                text check (prestador_cnpj ~ '^[0-9]{14}$'),
  inscricao_municipal           text,
  /* IBGE, 7 dígitos. São Paulo = 3550308. */
  codigo_municipio              text check (codigo_municipio ~ '^[0-9]{7}$'),

  /* ── parâmetros do serviço ── vocabulário de prefeitura, mora só aqui e no adaptador. */
  item_lista_servico            text,
  aliquota_iss                  numeric(5,2) check (aliquota_iss between 0 and 100),
  codigo_tributario_municipio   text,
  optante_simples               boolean not null default true,
  natureza_operacao             text not null default '1',

  criado_em                     timestamptz not null default now(),
  atualizado_em                 timestamptz not null default now()
);

comment on table public.config_fiscal is
  'Credencial e parâmetros fiscais POR INQUILINO. Substitui as env vars NF_* — que, '
  'sendo globais, limitavam o produto a um único CNPJ.';

/* Espelha `isFocusConfigured`: só emite de verdade com token + os quatro obrigatórios.
 * A regra fica no banco também para a UI poder dizer o que falta sem chamar o servidor. */
create or replace function public.fiscal_configurado(c public.config_fiscal)
returns boolean
language sql
immutable
as $$
  select c.token_cifrado is not null
     and c.prestador_cnpj is not null
     and c.inscricao_municipal is not null
     and c.codigo_municipio is not null
     and c.item_lista_servico is not null
$$;

drop trigger if exists tg_config_fiscal_atualizado_em on public.config_fiscal;
create trigger tg_config_fiscal_atualizado_em before update on public.config_fiscal
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 9 · INTEGRAÇÃO GOOGLE — a evolução de `google_integracoes`
--
-- A tabela do arquivo 001 é chaveada por (user_id, profissional_id) com o profissional
-- em TEXTO ("pr1"), porque a equipe morava no código. Agora ela mora no banco.
--
-- ⚠️ A antiga NÃO é apagada aqui. O app em produção lê `google_integracoes` neste exato
-- momento; derrubar a tabela antes de o código novo subir desconecta a agenda do Bruno.
-- O arquivo 006 copia os dados; o `drop` fica para uma migration depois do deploy.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.integracoes_google (
  tenant_id       uuid not null references public.negocios (id) on delete cascade,
  profissional_id uuid not null,

  /* Conta Google que autorizou. Só para a UI dizer "conectado como fulano@". */
  google_email    text not null,

  /* Qual calendário dessa conta. A barbearia costuma ter o calendário da loja separado
   * do pessoal, e sem esta coluna a MAISA escreve no pessoal — que é o default. */
  calendar_id     text not null default 'primary',

  /* CIFRADOS com AES-256-GCM (src/adaptadores/saida/google/cripto.ts). Mesmo com
   * acesso ao banco, sem a GOOGLE_TOKEN_KEY eles não valem nada. */
  access_token    text not null,
  refresh_token   text not null,

  expira_em       timestamptz not null,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  /* Uma conexão por agenda, por negócio. É também o alvo do upsert:
   * onConflict "tenant_id,profissional_id" — reconectar atualiza, não duplica. */
  primary key (tenant_id, profissional_id),

  foreign key (tenant_id, profissional_id)
    references public.profissionais (tenant_id, id) on delete cascade
);

drop trigger if exists tg_integracoes_google_atualizado_em on public.integracoes_google;
create trigger tg_integracoes_google_atualizado_em before update on public.integracoes_google
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 10 · INTEGRAÇÃO WHATSAPP — o canal, por inquilino
--
-- Ainda não existe adaptador (src/adaptadores/entrada/whatsapp/ é planejado). A tabela
-- nasce agora porque `instancia` é a única coisa capaz de responder a pergunta que o
-- webhook faz primeiro: "esta mensagem é de qual inquilino?". O agente não tem cookie,
-- então não pode derivar tenant de sessão — ele deriva DAQUI. Por isso `instancia` é
-- UNIQUE global, e não por tenant: duas instâncias iguais tornariam a pergunta
-- ambígua, e mensagem de um cliente cairia na conversa de outro negócio.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.integracoes_whatsapp (
  tenant_id       uuid primary key references public.negocios (id) on delete cascade,

  provedor        text not null default 'evolution'
                    check (provedor in ('evolution', 'cloud_api')),

  /* Nome da instância na Evolution API, ou o phone_number_id da Cloud API. */
  instancia       text not null unique,
  /* O número que o cliente vê, em E.164 (5511999990000). */
  numero          text check (numero ~ '^[0-9]{10,15}$'),

  /* Cifrado, igual aos demais. */
  token_cifrado   text,
  /* Segredo com que o webhook assina — o servidor confere antes de acreditar. */
  webhook_secret  text,

  status          text not null default 'desconectado'
                    check (status in ('desconectado', 'pareando', 'conectado')),
  conectado_em    timestamptz,

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

drop trigger if exists tg_integracoes_whatsapp_atualizado_em on public.integracoes_whatsapp;
create trigger tg_integracoes_whatsapp_atualizado_em before update on public.integracoes_whatsapp
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 11 · ASSINATURA — a cobrança (Stripe), por inquilino
--   Alimenta `Negocio` (dominio/negocio.ts): plano, precoPlano, proximaCobranca,
--   cartao, conversasPlano. Ver a view `v_negocio` em 004 — ela monta o tipo inteiro.
--
-- ⚠️ Escrita SÓ pelo webhook do Stripe (service_role). Não há política de INSERT/UPDATE
--   para usuário logado no arquivo 003, e é de propósito: dono nenhum se dá desconto.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.assinaturas (
  tenant_id              uuid primary key references public.negocios (id) on delete cascade,

  stripe_customer_id     text unique,
  stripe_subscription_id text unique,

  plano                  text not null default 'Profissional',
  preco                  numeric(10,2) check (preco >= 0),
  moeda                  text not null default 'BRL',

  status                 text not null default 'trial'
                           check (status in ('trial','ativa','inadimplente','cancelada')),

  /* Vira o "proximaCobranca" da tela. */
  periodo_fim            date,
  trial_fim              date,
  cancelada_em           timestamptz,

  /* Vira o "Cartão final 4417". Nunca o número: só o que a tela mostra. */
  cartao_marca           text,
  cartao_final4          text check (cartao_final4 ~ '^[0-9]{4}$'),

  /* null = ilimitado (o "Ilimitadas" de `conversasPlano`). */
  conversas_limite       integer check (conversas_limite > 0),

  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

drop trigger if exists tg_assinaturas_atualizado_em on public.assinaturas;
create trigger tg_assinaturas_atualizado_em before update on public.assinaturas
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 12 · ASSISTENTE — como a MAISA se comporta neste negócio
--   Espelha `Assistente` + `ChaveCfg` (dominio/assistente.ts).
--
-- Isto deixa de ser tela de configuração e vira o PROMPT do agente no dia em que o
-- WhatsApp entrar. Os toggles são COLUNAS e não um jsonb solto porque `ChaveCfg` é uma
-- união FECHADA no TypeScript: sete chaves, nem uma a mais. Coluna dá check, dá default
-- e dá erro na hora de escrever chave inventada; jsonb aceita `{"confimar": true}`
-- calado e o agente passa a ignorar a configuração sem ninguém notar.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.assistente (
  tenant_id       uuid primary key references public.negocios (id) on delete cascade,

  nome            text not null default 'MAISA',
  tom             text not null default 'amigável'
                    check (tom in ('amigável', 'profissional', 'descontraído')),
  saudacao        text,
  ativa           boolean not null default true,

  /* ── agendamentos: o que ela faz com os horários ── */
  confirmar       boolean not null default true,   -- confirma no WhatsApp ao marcar
  lembrete        boolean not null default true,   -- lembrete 3h antes
  remarcar        boolean not null default true,   -- cliente remarca sozinho
  encaixe         boolean not null default false,  -- pode oferecer horário de última hora

  /* ── comportamento: até onde ela vai sozinha ── */
  encaminhar      boolean not null default true,   -- chama você quando não souber
  preco_catalogo  boolean not null default true,   -- nunca inventar preço
  pix             boolean not null default false,  -- pedir Pix antecipado

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

drop trigger if exists tg_assistente_atualizado_em on public.assistente;
create trigger tg_assistente_atualizado_em before update on public.assistente
  for each row execute function public.toca_atualizado_em();

/* O horário ANUNCIADO ao cliente (`Dia` em dominio/assistente.ts) — sete linhas por
 * negócio. É irmão, e não igual, do `expediente_*` do profissional:
 *
 *   expediente_*  → interno, por PESSOA. Governa onde a grade deixa marcar.
 *   este          → externo, do NEGÓCIO. É o que a MAISA responde a "que horas vocês
 *                   atendem?", e é por dia, porque sábado quase nunca é igual.
 *
 * Se um dia eles precisarem concordar, quem manda é o expediente — ele é a regra. */
create table if not exists public.horarios_anunciados (
  tenant_id  uuid not null references public.negocios (id) on delete cascade,

  /* Convenção MAISA: 0 = segunda … 6 = domingo. Ver public.dow_maisa(). */
  dow        smallint not null check (dow between 0 and 6),

  aberto     boolean not null default true,
  de         time,
  ate        time,

  primary key (tenant_id, dow),

  check ((aberto and de is not null and ate is not null and ate > de)
         or (not aberto))
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13 · CONVERSAS e MENSAGENS — o WhatsApp
--   Espelham `Conversa` e `Msg` (dominio/conversas.ts). Hoje são fixture; os tipos já
--   estavam no domínio para a troca ser de FONTE, não de forma.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.conversas (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.negocios (id) on delete cascade,

  /* Pode não ser cliente cadastrado: lead, acompanhante, "mãe do Gustavo". É caso
   * NORMAL, não borda — daí nullable, e daí o nome vir junto. */
  cliente_id         uuid references public.clientes (id) on delete set null,
  nome               text not null,
  telefone           text not null,
  telefone_chave     text generated always as
                       (right(regexp_replace(telefone, '[^0-9]', '', 'g'), 8)) stored,

  /* maisa  — a MAISA está conduzindo sozinha
   * espera — precisa de decisão sua (encaixe, exceção)  ← é isto que enche a fila
   * voce   — você assumiu
   * ok     — resolvida                                                            */
  estado             text not null default 'maisa'
                       check (estado in ('maisa', 'espera', 'voce', 'ok')),

  ultima_mensagem_em timestamptz,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),

  unique (tenant_id, id)
);

/* A caixa de entrada, ordenada. */
create index if not exists ix_conversas_recentes
  on public.conversas (tenant_id, ultima_mensagem_em desc);

/* "Quem está esperando por mim" — a fila do dia. */
create index if not exists ix_conversas_espera
  on public.conversas (tenant_id, ultima_mensagem_em desc) where estado = 'espera';

/* O webhook chega com o telefone, não com o id da conversa. */
create index if not exists ix_conversas_telefone
  on public.conversas (tenant_id, telefone_chave);

drop trigger if exists tg_conversas_atualizado_em on public.conversas;
create trigger tg_conversas_atualizado_em before update on public.conversas
  for each row execute function public.toca_atualizado_em();

create table if not exists public.mensagens (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.negocios (id) on delete cascade,
  conversa_id  uuid not null,

  de           text not null check (de in ('cliente', 'bot', 'voce')),
  txt          text not null,

  /* O id da mensagem no provedor. UNIQUE por inquilino porque webhook de WhatsApp
   * REENTREGA: sem esta constraint, uma reentrega vira mensagem duplicada na tela e,
   * pior, o agente responde duas vezes ao mesmo "quero marcar". */
  provedor_msg_id text,

  criado_em    timestamptz not null default now(),

  foreign key (tenant_id, conversa_id)
    references public.conversas (tenant_id, id) on delete cascade
);

create unique index if not exists ux_mensagens_provedor
  on public.mensagens (tenant_id, provedor_msg_id) where provedor_msg_id is not null;

create index if not exists ix_mensagens_thread
  on public.mensagens (tenant_id, conversa_id, criado_em);


-- ─────────────────────────────────────────────────────────────────────────────
-- 14 · FAQS — o que a MAISA já sabe responder
--   Espelha `Faq` (dominio/conversas.ts). `usos` é contador de verdade (incrementado
--   quando ela usa a resposta), não derivado de nada.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.faqs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.negocios (id) on delete cascade,

  pergunta      text not null,
  resposta      text not null,
  usos          integer not null default 0 check (usos >= 0),
  ativo         boolean not null default true,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists ix_faqs_tenant on public.faqs (tenant_id, usos desc) where ativo;

drop trigger if exists tg_faqs_atualizado_em on public.faqs;
create trigger tg_faqs_atualizado_em before update on public.faqs
  for each row execute function public.toca_atualizado_em();


-- ─────────────────────────────────────────────────────────────────────────────
-- 15 · AUDITORIA — quem fez o quê
--
-- `dominio/tenant.ts` criou o tipo `Ator` para poder distinguir o que a IA fez do que
-- a pessoa fez. Esta é a tabela onde essa distinção fica registrada. APPEND-ONLY: o
-- arquivo 003 não dá política de UPDATE nem DELETE a ninguém. Log que se pode editar
-- não serve para nada.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.eventos_auditoria (
  id           bigint generated always as identity primary key,
  tenant_id    uuid not null references public.negocios (id) on delete cascade,

  ocorrido_em  timestamptz not null default now(),

  ator_tipo    text not null check (ator_tipo in ('usuario', 'agente', 'sistema')),
  ator_id      text,
  canal        text,

  /* "agendar_atendimento", "emitir_nota", "conectar_google"… */
  acao         text not null,
  alvo_tipo    text,
  alvo_id      text,
  dados        jsonb
);

create index if not exists ix_auditoria_tenant
  on public.eventos_auditoria (tenant_id, ocorrido_em desc);

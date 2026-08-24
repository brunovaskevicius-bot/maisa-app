-- ─────────────────────────────────────────────────────────────────────────────
-- 019 · PAGAMENTO AVULSO — o recibo que não nasceu de um atendimento da agenda
--
-- ★ A FRASE DO BRUNO QUE ORIGINOU ISTO (21/08/2026):
--   "nem tudo vai estar registrado automaticamente, a MAISA cobre a maioria dos casos, mas
--    não todos. Temos que ter um fluxo bem fácil para criar novas notas que às vezes não são
--    diretamente atreladas a um atendimento registrado na MAISA."
--
-- Está certo, e o 018 já estava preparado para isso sem saber: a unidade do arquivo do
-- Receita Saúde **sempre foi o PAGAMENTO** ("emitir na data do pagamento", diz o manual), e o
-- atendimento é só a fonte mais comum de um. Sessão marcada por fora, pacote pago adiantado,
-- paciente que voltou depois de meses — todos são pagamentos sem linha na agenda.
--
-- ── ⚠️ POR QUE NÃO É UM `atendimento` FANTASMA ──
--
-- A tentação óbvia é inserir em `atendimentos` com `situacao = 'marcado'` no passado, e assim
-- reaproveitar view, claim e tudo mais sem escrever uma linha de SQL. Seria mentira sobre o
-- calendário: apareceria na Agenda, na tela de Hoje, na contagem de atendimentos do cliente,
-- em `v_a_faturar` (ou seja, cobrando NOTA FISCAL do mesmo serviço) e nos relatórios. Um
-- lançamento financeiro entrando como compromisso de agenda contamina tudo que lê agenda.
--
-- Tabela própria, e a view vira UNION. O preço é a claim ter que trancar duas coisas.
--
-- ── O NOME É `pagamentos_avulsos`, E NÃO `recibos_avulsos` ──
--
-- Porque o que se lança é um pagamento recebido; o recibo é o que a Receita devolve depois.
-- E porque o mesmo lançamento serve, no dia em que alguém pedir, para a NOTA FISCAL de um
-- cliente que pagou sem passar pela agenda. Hoje só o caminho do recibo lê esta tabela — o
-- da nota continua olhando só `atendimentos`, e isso está escrito aqui para ninguém achar que
-- é bug.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · A TABELA
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pagamentos_avulsos (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.negocios (id) on delete cascade,

  /* Data do PAGAMENTO, e é ela que vai no recibo. Data civil, sem fuso: quem digita "13/08"
   * está falando do dia em que recebeu, não de um instante. */
  data           date    not null,
  valor          numeric not null check (valor > 0),

  /* Quem foi atendido. `cliente_id` é opcional de propósito: o caso comum é gente que ainda
   * não é cadastro nenhum, e obrigar a criar cliente antes de lançar um recibo transformaria
   * "fluxo bem fácil" em dois formulários. Quando vier preenchido, a tela puxa nome e CPF. */
  cliente_id     uuid references public.clientes (id) on delete set null,
  nome           text,
  cpf            text,

  /* Quem pagou, quando não é o próprio. Mãe que paga a terapia do filho — coluna do arquivo
   * oficial, ver 018. */
  pagador_cpf    text,

  /* O que a MAISA escreve na descrição é fixo e neutro (ver `aplicacao/recibos.ts`); isto é
   * o bilhete do DONO para ele mesmo, e nunca sai no documento. */
  observacao     text,

  lote_recibo_id uuid references public.lotes_recibo (id) on delete set null,
  criado_em      timestamptz not null default now()
);

create index if not exists ix_avulsos_sem_lote
  on public.pagamentos_avulsos (tenant_id, data)
  where lote_recibo_id is null;

comment on table public.pagamentos_avulsos is
  'Pagamento recebido que não veio de um atendimento da agenda. Entra no mesmo arquivo do '
  'Receita Saúde e é trancado pela mesma claim. NÃO é atendimento: não aparece na agenda, '
  'não conta como atendimento do cliente e não entra em v_a_faturar.';

alter table public.pagamentos_avulsos enable row level security;
revoke all on public.pagamentos_avulsos from anon;
grant select, insert, update, delete on public.pagamentos_avulsos to authenticated;

drop policy if exists "membro lê" on public.pagamentos_avulsos;
drop policy if exists "membro insere" on public.pagamentos_avulsos;
drop policy if exists "membro atualiza" on public.pagamentos_avulsos;
drop policy if exists "membro apaga" on public.pagamentos_avulsos;

create policy "membro lê" on public.pagamentos_avulsos
  for select to authenticated
  using (tenant_id in (select public.negocios_do_usuario()));

create policy "membro insere" on public.pagamentos_avulsos
  for insert to authenticated
  with check (tenant_id in (select public.negocios_do_usuario()));

create policy "membro atualiza" on public.pagamentos_avulsos
  for update to authenticated
  using (tenant_id in (select public.negocios_do_usuario()))
  with check (tenant_id in (select public.negocios_do_usuario()));

/* Apagar existe porque digitar errado existe. A garantia de que não se apaga histórico
 * fiscal está no WHERE do adaptador (`lote_recibo_id is null`) e na função do item 4. */
create policy "membro apaga" on public.pagamentos_avulsos
  for delete to authenticated
  using (tenant_id in (select public.negocios_do_usuario()));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · v_a_recibar — agora é UNION das duas fontes
--
-- ⚠️ `drop` e recria, e não `create or replace`: as colunas mudam de nome
-- (`atendimento_id` → `id` + `fonte`), e `replace` só aceita acrescentar coluna no fim.
--
-- `fonte` é o que a claim precisa para saber QUAL tabela trancar. Sem ela, o app teria dois
-- arrays e nenhuma forma de dizer de onde cada id veio — e um id de avulso mandado como
-- atendimento simplesmente não tranca nada, deixando a linha voltar no mês seguinte.
-- ─────────────────────────────────────────────────────────────────────────────

drop view if exists public.v_a_recibar;

create view public.v_a_recibar
with (security_invoker = true) as
  select
    a.id            as id,
    'atendimento'::text as fonte,
    a.tenant_id,
    a.cliente_id,
    (a.inicio at time zone 'America/Sao_Paulo')::date as data,
    coalesce(a.servico_valor, 0) as valor,
    a.servico_nome  as servico,
    c.nome,
    c.cpf,
    c.pagador_cpf,
    coalesce(c.teste, false) as teste
  from public.atendimentos a
  join public.clientes c
    on c.tenant_id = a.tenant_id and c.id = a.cliente_id
  where a.lote_recibo_id is null
    and a.situacao = 'marcado'
    and a.cliente_id is not null
    and a.inicio < now()
    and coalesce(c.ativo, true)

  union all

  select
    p.id            as id,
    'avulso'::text  as fonte,
    p.tenant_id,
    p.cliente_id,
    p.data,
    p.valor,
    /* Sem serviço: um avulso é um valor recebido, e o texto do documento é fixo mesmo. */
    null::text      as servico,
    /* Cadastro tem prioridade sobre o que foi digitado: se o lançamento aponta para um
     * cliente, o nome e o CPF certos são os dele — e é lá que alguém corrige um erro. */
    coalesce(c.nome, p.nome)              as nome,
    coalesce(c.cpf, p.cpf)                as cpf,
    coalesce(c.pagador_cpf, p.pagador_cpf) as pagador_cpf,
    coalesce(c.teste, false)              as teste
  from public.pagamentos_avulsos p
  left join public.clientes c
    on c.tenant_id = p.tenant_id and c.id = p.cliente_id
  where p.lote_recibo_id is null;

comment on view public.v_a_recibar is
  'Uma linha por PAGAMENTO ainda fora de um lote: atendimentos prestados + lançamentos '
  'avulsos. `fonte` diz qual tabela a claim tranca. Não agrega por cliente de propósito — o '
  'recibo é por pagamento, com data, que é o que o plano de saúde exige para reembolsar.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · abrir_lote_recibo() — a claim, agora com duas fontes
--
-- ⚠️ ASSINATURA NOVA, e a antiga é DERRUBADA em vez de conviver. Duas funções com o mesmo
-- nome e aridade diferente virariam sobrecarga, e o PostgREST resolve sobrecarga pelos NOMES
-- dos argumentos do corpo JSON: uma chamada antiga (sem `p_avulsos`) continuaria funcionando
-- e trancaria só metade do lote — o pior desfecho possível, porque o arquivo sai completo e
-- as linhas avulsas voltam a aparecer no mês seguinte.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.abrir_lote_recibo(uuid, uuid[], date);

create or replace function public.abrir_lote_recibo(
  p_tenant_id    uuid,
  p_atendimentos uuid[],
  p_avulsos      uuid[],
  p_competencia  date
)
returns table (
  lote_id      uuid,
  valor        numeric,
  linhas       int,
  atendimentos uuid[],
  avulsos      uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lote     uuid;
  v_at_ids   uuid[];
  v_av_ids   uuid[];
  v_at_valor numeric := 0;
  v_av_valor numeric := 0;
  v_linhas   int;
begin
  /* ── 1 · tranca os atendimentos ── */
  select array_agg(a.id), coalesce(sum(a.servico_valor), 0)
    into v_at_ids, v_at_valor
  from (
    select b.id, b.servico_valor
      from public.atendimentos b
     where b.tenant_id = p_tenant_id
       and b.id = any(coalesce(p_atendimentos, '{}'::uuid[]))
       and b.lote_recibo_id is null
       and b.situacao = 'marcado'
       and b.inicio < now()
     for update skip locked
  ) a;

  /* ── 2 · tranca os avulsos ──
   * Sem `inicio < now()`: a data de um avulso É a data do pagamento, e quem digita não
   * agenda o futuro. Lançar com data de amanhã é erro de digitação, e o lugar de barrar isso
   * é a entrada — não aqui, onde barrar em silêncio faria a linha desaparecer da lista sem
   * explicação. */
  select array_agg(p.id), coalesce(sum(p.valor), 0)
    into v_av_ids, v_av_valor
  from (
    select q.id, q.valor
      from public.pagamentos_avulsos q
     where q.tenant_id = p_tenant_id
       and q.id = any(coalesce(p_avulsos, '{}'::uuid[]))
       and q.lote_recibo_id is null
     for update skip locked
  ) p;

  v_linhas := coalesce(array_length(v_at_ids, 1), 0) + coalesce(array_length(v_av_ids, 1), 0);

  /* Nada sobrou para trancar: outra aba chegou primeiro. NÃO é erro. */
  if v_linhas = 0 then
    return;
  end if;

  insert into public.lotes_recibo (tenant_id, competencia, linhas, valor, situacao)
  values (p_tenant_id, p_competencia, v_linhas, v_at_valor + v_av_valor, 'gerado')
  returning id into v_lote;

  update public.atendimentos a
     set lote_recibo_id = v_lote
   where a.id = any(coalesce(v_at_ids, '{}'::uuid[]));

  update public.pagamentos_avulsos p
     set lote_recibo_id = v_lote
   where p.id = any(coalesce(v_av_ids, '{}'::uuid[]));

  return query select
    v_lote, v_at_valor + v_av_valor, v_linhas,
    coalesce(v_at_ids, '{}'::uuid[]), coalesce(v_av_ids, '{}'::uuid[]);
end;
$$;

comment on function public.abrir_lote_recibo(uuid, uuid[], uuid[], date) is
  'Claim atômica do lote: tranca atendimentos e pagamentos avulsos numa transação só e soma '
  'o valor aqui dentro. Zero linhas = outra aba chegou primeiro.';

revoke all on function public.abrir_lote_recibo(uuid, uuid[], uuid[], date) from public, anon;
grant execute on function public.abrir_lote_recibo(uuid, uuid[], uuid[], date) to service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · descartar_lote_recibo() — solta as DUAS fontes
--
-- A do 018 soltava só `atendimentos`. Com avulso no lote, ela deixaria as linhas digitadas
-- presas a um lote descartado — invisíveis para sempre, sem erro nenhum na tela.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.descartar_lote_recibo(
  p_tenant_id uuid,
  p_lote_id   uuid
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at int;
  v_av int;
begin
  /* Só age sobre lote `gerado`: descartar um importado devolveria as linhas para a lista e o
   * mês seguinte emitiria recibo em dobro para sessões já assinadas no e-CAC. */
  update public.lotes_recibo
     set situacao = 'descartado'
   where tenant_id = p_tenant_id and id = p_lote_id and situacao = 'gerado';

  if not found then
    return 0;
  end if;

  update public.atendimentos
     set lote_recibo_id = null
   where tenant_id = p_tenant_id and lote_recibo_id = p_lote_id;
  get diagnostics v_at = row_count;

  update public.pagamentos_avulsos
     set lote_recibo_id = null
   where tenant_id = p_tenant_id and lote_recibo_id = p_lote_id;
  get diagnostics v_av = row_count;

  return v_at + v_av;
end;
$$;

revoke all on function public.descartar_lote_recibo(uuid, uuid) from public, anon;
grant execute on function public.descartar_lote_recibo(uuid, uuid) to service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · CONFERÊNCIA
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  n_tab  int;
  n_view int;
  n_fonte int;
  n_func int;
begin
  select count(*) into n_tab
    from information_schema.tables
   where table_schema = 'public' and table_name = 'pagamentos_avulsos';

  select count(*) into n_view
    from information_schema.views where table_schema = 'public' and table_name = 'v_a_recibar';

  select count(*) into n_fonte
    from information_schema.columns
   where table_schema = 'public' and table_name = 'v_a_recibar' and column_name in ('id', 'fonte');

  select count(*) into n_func
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'abrir_lote_recibo';

  raise notice '019 · pagamentos_avulsos: % · v_a_recibar: % (id+fonte %/2) · abrir_lote_recibo: % (tem que ser 1)',
    case when n_tab = 1 then 'ok' else 'FALTANDO' end, n_view, n_fonte, n_func;

  if n_tab <> 1 or n_view <> 1 or n_fonte <> 2 or n_func <> 1 then
    raise exception '019 não aplicou tudo — confira os erros acima antes de seguir.';
  end if;
end $$;

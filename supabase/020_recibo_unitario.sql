-- ─────────────────────────────────────────────────────────────────────────────
-- 020 · EMISSÃO UNITÁRIA DO RECIBO — o livro-razão que impede a duplicata.
--
-- ★ POR QUE ESTA MIGRAÇÃO EXISTE ANTES DE QUALQUER AUTOMAÇÃO
--
-- O plano é uma cascata: nossa automação → CSV (e a Rebots no meio, se um dia). Cascata
-- significa mais de um caminho para o mesmo pagamento — e o risco não é ela quebrar, é ela
-- TER SUCESSO DUAS VEZES. Recibo duplicado se cancela um por um, em dez dias (art. 7º da IN
-- RFB 2.240/2024), e o paciente já viu os dois.
--
-- Então o lastro vem primeiro. Um pagamento fica preso por UM canal: ou um `lote_recibo`, ou
-- um `recibo_emitido`. Nunca os dois. A `v_a_recibar` passa a excluir os dois, e é isso que
-- faz a tela do lote e a emissão unitária não brigarem pela mesma sessão.
--
-- ⚠️ RODE O 019 ANTES. Esta migração altera a `v_a_recibar` que o 019 criou e a
-- `pagamentos_avulsos` que ele introduziu. Fora de ordem, falha com "relation does not exist".
--
-- Idempotente: pode rodar duas vezes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · recibos_emitidos — uma linha por recibo, com o estado que o canal reportou
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.recibos_emitidos (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.negocios (id) on delete cascade,

  /* Por onde saiu. Fica na linha, e não em log: quando um canal quebra, é por ele que se
   * encontra o que precisa ser reconciliado. */
  canal        text not null check (canal in ('automacao', 'rebots', 'lote_csv')),

  /* ⚠️ `pendente` NÃO É ESPERA, É IGNORÂNCIA — mandamos e não sabemos. É o único estado do
   * qual NÃO se pode cair para o próximo canal da cascata. Ver `podeTentarOutroCanal`.
   * E não existe `cancelado` como desfecho de falha: falha é `recusado`. `cancelado` é ato
   * deliberado sobre um recibo que existiu. */
  situacao     text not null default 'pendente'
               check (situacao in ('pendente', 'emitido', 'recusado', 'cancelado')),

  /* O que o canal devolveu ao aceitar o pedido. É a chave da reconciliação. */
  protocolo    text,
  /* A chave do recibo na Receita. Só existe quando `emitido`. */
  chave        text,

  /* ⚠️ URL, NUNCA O ARQUIVO. O PDF é recibo de sessão de psicoterapia com CPF de paciente —
   * gente que não é nossa cliente. Guardar o binário para economizar uma chamada seria virar
   * depositário de prontuário financeiro de terceiros. A URL é temporária de propósito. */
  pdf_url      text,
  pdf_expira_em timestamptz,

  /* A frase do canal quando recusou. Vai para a tela: tem que ser legível por humano. */
  erro         text,

  criado_em    timestamptz not null default now(),
  emitido_em   timestamptz
);

/* O protocolo é único por inquilino: o mesmo protocolo gravado duas vezes é exatamente a
 * duplicata que esta migração existe para impedir. `where protocolo is not null` porque a
 * linha nasce antes de o canal responder. */
create unique index if not exists recibos_emitidos_protocolo_unico
  on public.recibos_emitidos (tenant_id, canal, protocolo)
  where protocolo is not null;

/* A consulta da reconciliação: os pendentes mais velhos primeiro. */
create index if not exists recibos_emitidos_pendentes
  on public.recibos_emitidos (tenant_id, criado_em)
  where situacao = 'pendente';

comment on table public.recibos_emitidos is
  'Livro-razão da emissão unitária do Receita Saúde. Uma linha por recibo. `pendente` é '
  'estado de IGNORÂNCIA, não de espera: dele não se cai para o próximo canal da cascata, '
  'porque isso emitiria o mesmo documento duas vezes.';

alter table public.recibos_emitidos enable row level security;

/* Mesmo desenho de `lotes_recibo` no 018. O `with check` no insert é o que impede escrever
 * NO negócio de outro — sem ele a leitura fica protegida e a escrita não, que é o furo mais
 * silencioso que existe.
 *
 * ⚠️ NÃO HÁ POLÍTICA DE DELETE, e a ausência é a regra: linha do livro-razão não se apaga.
 * Apagar um `emitido` soltaria o pagamento (o `on delete set null`) e o mês seguinte o
 * faturaria de novo — recibo em dobro sobre um documento que existe na Receita. O caminho de
 * desfazer é `soltar_recibo_unitario`, e ele só aceita `recusado`. */
drop policy if exists "membro lê" on public.recibos_emitidos;
create policy "membro lê" on public.recibos_emitidos
  for select to authenticated
  using (tenant_id in (select public.negocios_do_usuario()));

drop policy if exists "membro insere" on public.recibos_emitidos;
create policy "membro insere" on public.recibos_emitidos
  for insert to authenticated
  with check (tenant_id in (select public.negocios_do_usuario()));

drop policy if exists "membro atualiza" on public.recibos_emitidos;
create policy "membro atualiza" on public.recibos_emitidos
  for update to authenticated
  using (tenant_id in (select public.negocios_do_usuario()))
  with check (tenant_id in (select public.negocios_do_usuario()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · recibo_id nas duas fontes — o espelho de `lote_recibo_id`
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.atendimentos
  add column if not exists recibo_id uuid references public.recibos_emitidos(id) on delete set null;

alter table public.pagamentos_avulsos
  add column if not exists recibo_id uuid references public.recibos_emitidos(id) on delete set null;

comment on column public.atendimentos.recibo_id is
  'Preso por um recibo unitário. Excludente com `lote_recibo_id`: um pagamento sai por UM '
  'canal. `on delete set null` porque apagar a linha do razão solta o pagamento de volta.';

create index if not exists atendimentos_recibo_id on public.atendimentos (recibo_id)
  where recibo_id is not null;
create index if not exists pagamentos_avulsos_recibo_id on public.pagamentos_avulsos (recibo_id)
  where recibo_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · v_a_recibar — agora exclui OS DOIS canais
--
-- ⚠️ É A MUDANÇA QUE FAZ O RESTO FUNCIONAR. Sem o `recibo_id is null` aqui, um pagamento
-- emitido pela automação continuaria aparecendo na lista do lote — e o CSV do mês levaria a
-- sessão de novo, para o e-CAC, onde ela viraria o segundo recibo.
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
    and a.recibo_id is null
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
    null::text      as servico,
    coalesce(c.nome, p.nome)               as nome,
    coalesce(c.cpf, p.cpf)                 as cpf,
    coalesce(c.pagador_cpf, p.pagador_cpf) as pagador_cpf,
    coalesce(c.teste, false)               as teste
  from public.pagamentos_avulsos p
  left join public.clientes c
    on c.tenant_id = p.tenant_id and c.id = p.cliente_id
  where p.lote_recibo_id is null
    and p.recibo_id is null;

comment on view public.v_a_recibar is
  'Uma linha por PAGAMENTO ainda fora de qualquer canal de recibo — nem lote CSV nem emissão '
  'unitária. `fonte` diz qual tabela a claim tranca.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · abrir_recibo_unitario() — a claim, uma linha por vez
--
-- Mesmo desenho de `abrir_lote_recibo`: tranca com `for update skip locked` e devolve nada
-- quando não sobrou o que trancar. A diferença é a granularidade — um pagamento, um recibo.
--
-- ⚠️ A LINHA DO RAZÃO NASCE AQUI, ANTES DE QUALQUER CHAMADA AO CANAL. Criar depois seria
-- deixar uma janela em que o pagamento está livre e a emissão já saiu: dois cliques nessa
-- janela emitem dois recibos, e nenhum dos dois aparece como duplicata no banco.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.abrir_recibo_unitario(
  p_tenant_id uuid,
  p_fonte     text,
  p_id        uuid,
  p_canal     text
)
returns table (
  recibo_id uuid,
  valor     numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recibo uuid;
  v_valor  numeric;
  v_achou  boolean := false;
begin
  if p_fonte not in ('atendimento', 'avulso') then
    raise exception 'fonte desconhecida: %', p_fonte;
  end if;

  /* Antes do insert, para a mensagem ser legível. Sem isto o erro que sobe é violação de
   * CHECK constraint, que na tela do dono não quer dizer nada. */
  if p_canal not in ('automacao', 'rebots', 'lote_csv') then
    raise exception 'canal desconhecido: %', p_canal;
  end if;

  /* ── tranca a fonte ──
   * O valor sai do BANCO, nunca de quem chama: tela aberta há dez minutos manda total velho,
   * e aqui o total velho viraria um recibo de valor errado — documento fiscal torto que só se
   * conserta cancelando. Mesma regra de `abrir_nota`. */
  if p_fonte = 'atendimento' then
    select a.servico_valor into v_valor
      from public.atendimentos a
     where a.tenant_id = p_tenant_id
       and a.id = p_id
       and a.lote_recibo_id is null
       and a.recibo_id is null
       and a.situacao = 'marcado'
       and a.inicio < now()
       for update skip locked;
    v_achou := found;
  else
    select q.valor into v_valor
      from public.pagamentos_avulsos q
     where q.tenant_id = p_tenant_id
       and q.id = p_id
       and q.lote_recibo_id is null
       and q.recibo_id is null
       for update skip locked;
    v_achou := found;
  end if;

  /* Já preso por outro canal, ou segunda aba. NÃO é erro — quem chama responde "já foi". */
  if not v_achou then
    return;
  end if;

  insert into public.recibos_emitidos (tenant_id, canal, situacao)
  values (p_tenant_id, p_canal, 'pendente')
  returning id into v_recibo;

  if p_fonte = 'atendimento' then
    update public.atendimentos set recibo_id = v_recibo
     where tenant_id = p_tenant_id and id = p_id;
  else
    update public.pagamentos_avulsos set recibo_id = v_recibo
     where tenant_id = p_tenant_id and id = p_id;
  end if;

  return query select v_recibo, coalesce(v_valor, 0);
end;
$$;

comment on function public.abrir_recibo_unitario is
  'Tranca um pagamento e cria a linha do livro-razão, na mesma transação. Devolve zero linhas '
  'quando o pagamento já está preso por outro canal — o que não é erro.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · soltar_recibo_unitario() — a volta, e ela só existe para `recusado`
--
-- ⚠️ NUNCA CHAME ISTO A PARTIR DE `pendente`. Soltar um pagamento cujo recibo pode ter sido
-- emitido é o caminho exato para o segundo recibo: o pagamento volta para a lista, a cascata
-- (ou o lote do mês) o pega, e o paciente recebe dois documentos.
-- A saída de `pendente` é a reconciliação, não esta função.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.soltar_recibo_unitario(
  p_tenant_id uuid,
  p_recibo_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  /* ⚠️ A GUARDA MORA NO WHERE, e não num `select` antes seguido de `if`: entre os dois cabe o
   * callback que muda a situação para `emitido`. Trancar a linha aqui é o que faz a checagem e
   * a soltura serem a mesma decisão.
   *
   * `perform` com `for update` em vez de update: não há nada para mudar na linha do razão — ela
   * já é `recusado`. O que muda é o pagamento, abaixo. */
  perform 1 from public.recibos_emitidos
   where tenant_id = p_tenant_id
     and id = p_recibo_id
     and situacao = 'recusado'
     for update;

  if not found then
    return false;
  end if;

  update public.atendimentos set recibo_id = null
   where tenant_id = p_tenant_id and recibo_id = p_recibo_id;
  update public.pagamentos_avulsos set recibo_id = null
   where tenant_id = p_tenant_id and recibo_id = p_recibo_id;

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · conferência
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_tabela int;
  v_colunas int;
  v_view int;
  v_funcs int;
begin
  select count(*) into v_tabela
    from information_schema.tables
   where table_schema = 'public' and table_name = 'recibos_emitidos';

  select count(*) into v_colunas
    from information_schema.columns
   where table_schema = 'public' and column_name = 'recibo_id'
     and table_name in ('atendimentos', 'pagamentos_avulsos');

  /* `pg_get_viewdef` lê a definição REAL da view. `view_column_usage` foi a primeira
   * tentativa e é enganosa: ela só lista tabelas do dono, e devolveria 0 sem o problema
   * existir — uma conferência que grita falso alarme é pior que não conferir. */
  select count(*) into v_view
    from pg_views
   where schemaname = 'public' and viewname = 'v_a_recibar'
     and definition like '%recibo_id IS NULL%';

  select count(*) into v_funcs
    from information_schema.routines
   where routine_schema = 'public'
     and routine_name in ('abrir_recibo_unitario', 'soltar_recibo_unitario');

  raise notice '020 · recibos_emitidos: % (1) · recibo_id: %/2 · v_a_recibar filtra recibo_id: % · funções: %/2',
    v_tabela, v_colunas, case when v_view > 0 then 'sim' else 'NÃO' end, v_funcs;
end $$;

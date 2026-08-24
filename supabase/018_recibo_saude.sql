-- ─────────────────────────────────────────────────────────────────────────────
-- 018 · RECEITA SAÚDE — o documento de quem atende como PESSOA FÍSICA
--
-- ★ ESTE ARQUIVO EXISTE PORQUE O 014 ASSUMIU QUE TODO CLIENTE TEM CNPJ.
--
-- `config_fiscal` bifurca por `optante_mei`, e as duas pontas da bifurcação pedem CNPJ. Só
-- que metade do ICP "terapeutas" não tem CNPJ nenhum — e, no caso da psicóloga, **não pode
-- ter MEI**: psicologia é profissão regulamentada pelo CRP, e a LC 123/2006 veda MEI para
-- profissão regulamentada. Ela atende como pessoa física, com CPF e CRP.
--
-- E o documento dela não é nota fiscal:
--
--   "O profissional de saúde que não emitir o Receita Saúde ou emiti-lo com erros estará
--    sujeito à multa de R$ 100 por mês-calendário ou fração"
--                              — art. 4º da IN RFB nº 2.240, de 11/12/2024
--
-- Recibo Eletrônico de Serviços de Saúde, obrigatório desde 01/01/2025 para médico,
-- odontólogo, fonoaudiólogo, fisioterapeuta, terapeuta ocupacional e psicólogo pessoa
-- física. Recibo em papel perdeu validade fiscal. Emitir nota fiscal **não desobriga** de
-- emitir o Receita Saúde (pergunta 18 do manual v2.1) — não são caminhos alternativos.
--
-- ── ⚠️ NÃO EXISTE API, E ISSO MUDA O QUE O BANCO GUARDA ──
--
-- A automação possível é **importação em lote por CSV** no Carnê-Leão do e-CAC: nós montamos
-- o arquivo, a profissional importa e assina. Ou seja, o banco NÃO pode registrar "emitido":
-- ele registra "arquivo gerado" e espera ela dizer o que aconteceu. É por isso que
-- `lotes_recibo.situacao` tem `gerado`, `importado` e `descartado`, e nenhum deles se chama
-- `emitido` — nós não sabemos, e quem sabe é o e-CAC.
--
-- ── ADITIVO ──
--
-- Só `add column if not exists`, `create table if not exists` e `create or replace`. Roda
-- com o app no ar: as colunas nascem nulas e o caminho do recibo só liga quando
-- `prestador_cpf` for preenchido.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · CONFIG FISCAL — quem emite, quando não há CNPJ
--
-- Os três campos do caminho fiscal saem dos 14 dígitos do CNPJ consultados na Receita.
-- Aqui não há CNPJ para consultar — é o próprio caso — então estes três são perguntados. Em
-- troca, este caminho **não pede certificado digital**, que era o único passo do onboarding
-- fiscal dependendo de o cliente comprar e trazer um arquivo de fora.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.config_fiscal
  /* 11 dígitos. **É a presença dele que escolhe o caminho** (ver `caminhoDaNota`), e não a
   * ausência de CNPJ: inquilino no meio do onboarding tem os dois nulos e não é pessoa
   * física — é alguém que não terminou de preencher. */
  add column if not exists prestador_cpf         text
                                                   check (prestador_cpf ~ '^[0-9]{11}$'),

  /* A ocupação como o Carnê-Leão a enumera. O `check` fecha o domínio porque a lista é
   * FECHADA no arquivo da Receita — e a ausência importa: **nutricionista não está nela**, e
   * terapeuta holístico/massoterapeuta não são profissionais de saúde para a IN 2.240.
   * Ocupação fora da lista não é "outro código": é cliente que este caminho não atende. */
  add column if not exists ocupacao_saude        text
                                                   check (ocupacao_saude in (
                                                     'medico', 'odontologo', 'fonoaudiologo',
                                                     'fisioterapeuta', 'terapeuta_ocupacional',
                                                     'psicologo')),

  /* CRP, CREFITO, CRFa… A Receita aceita vazio quando há um registro ativo só, e por isso
   * não entra em `fiscal_configurado()`. Mas **recibo sem registro é o motivo nº 1 de recusa
   * de reembolso pelo plano de saúde**: opcional para a Receita, decisivo para o paciente. */
  add column if not exists registro_profissional text
                                                   check (char_length(registro_profissional) <= 15);

comment on column public.config_fiscal.prestador_cpf is
  'CPF de quem atende como pessoa física. Presente = o documento deste negócio é o Receita '
  'Saúde, não nota fiscal. Tem que ser o mesmo CPF que acessa o Carnê-Leão no e-CAC.';

comment on column public.config_fiscal.ocupacao_saude is
  'Ocupação do Carnê-Leão (225 médico · 226 odontólogo · 230 fonoaudiólogo · 231 '
  'fisioterapeuta · 232 TO · 255 psicólogo). Lista fechada pela Receita: nutricionista e '
  'terapeuta holístico não emitem Receita Saúde.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · CLIENTES — quem paga pode não ser quem é atendido
--
-- ★ DEIXOU DE SER REFINAMENTO E VIROU CAMPO OBRIGATÓRIO DO ARQUIVO OFICIAL. O CSV do lote
-- tem "CPF do pagador" e "CPF do beneficiário" como colunas separadas, e o caso real é
-- banal: mãe que paga a terapia do filho precisa do recibo no CPF dela — é ela que deduz no
-- IRPF e pede reembolso ao plano.
--
-- Nulo = paga por si, e o CSV repete o CPF do beneficiário nas duas colunas.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.clientes
  add column if not exists pagador_cpf  text,
  add column if not exists pagador_nome text;

comment on column public.clientes.pagador_cpf is
  'CPF de quem paga, quando não é o paciente. NULL = paga por si. Coluna do arquivo do '
  'Receita Saúde, não invenção nossa.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · LOTES — o arquivo que saiu, e o que aconteceu com ele
--
-- ⚠️ NÃO EXISTE `emitido` NA LISTA DE SITUAÇÕES, e a ausência é o ponto. A emissão acontece
-- fora daqui, no e-CAC, pela mão dela. Chamar `gerado` de `emitido` seria a tela afirmando um
-- fato fiscal que ninguém verificou.
--
--   gerado      → arquivo na mão dela, atendimentos presos, ninguém importou ainda
--   importado   → ela confirmou que passou no e-CAC. Fim da linha
--   descartado  → desistiu; os atendimentos voltaram para a lista
--
-- O `descartado` é obrigatório aqui e não existe em `notas`, e a assimetria é deliberada:
-- nota autorizada não se apaga, mas arquivo baixado por engano congelaria o faturamento do
-- mês inteiro se não houvesse volta.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.lotes_recibo (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.negocios (id) on delete cascade,
  competencia date,
  linhas      int     not null default 0,
  valor       numeric not null default 0,
  situacao    text    not null default 'gerado'
                        check (situacao in ('gerado', 'importado', 'descartado')),
  criado_em   timestamptz not null default now()
);

create index if not exists ix_lotes_recibo_tenant
  on public.lotes_recibo (tenant_id, criado_em desc);

comment on table public.lotes_recibo is
  'Um arquivo CSV do Receita Saúde gerado para o dono importar no e-CAC. Situação nunca é '
  '"emitido" — a emissão é dele, no portal da Receita, e nós não temos como saber.';

/* RLS no mesmo formato do grupo A do 003: quem é membro do negócio lê e escreve, anônimo
 * não toca. Escrito à mão porque o 003 já rodou — a lista dele não é reexecutada. */
alter table public.lotes_recibo enable row level security;
revoke all on public.lotes_recibo from anon;
grant select, insert, update, delete on public.lotes_recibo to authenticated;

drop policy if exists "membro lê" on public.lotes_recibo;
drop policy if exists "membro insere" on public.lotes_recibo;
drop policy if exists "membro atualiza" on public.lotes_recibo;

create policy "membro lê" on public.lotes_recibo
  for select to authenticated
  using (tenant_id in (select public.negocios_do_usuario()));

/* WITH CHECK no insert é o que impede escrever NO negócio de outro — sem ele a leitura
 * estaria protegida e a escrita não, que é o furo mais silencioso que existe. */
create policy "membro insere" on public.lotes_recibo
  for insert to authenticated
  with check (tenant_id in (select public.negocios_do_usuario()));

create policy "membro atualiza" on public.lotes_recibo
  for update to authenticated
  using (tenant_id in (select public.negocios_do_usuario()))
  with check (tenant_id in (select public.negocios_do_usuario()));


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · ATENDIMENTO ↔ LOTE
--
-- Coluna própria, e não reúso de `nota_id`: quem é PF e tem inscrição municipal emite os
-- DOIS documentos pela mesma sessão (pergunta 18 do manual). Uma coluna só faria o recibo
-- "consumir" o atendimento e a nota nunca sair — ou o contrário.
--
-- `on delete set null`, como no 014: apagar um lote não pode levar o atendimento embora, que
-- é o registro de que o serviço aconteceu.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.atendimentos
  add column if not exists lote_recibo_id uuid references public.lotes_recibo (id) on delete set null;

create index if not exists ix_atendimentos_sem_lote
  on public.atendimentos (tenant_id, inicio)
  where lote_recibo_id is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · v_a_recibar — uma linha POR SESSÃO, e é aqui que ela difere de `v_a_faturar`
--
-- `v_a_faturar` agrupa por cliente: uma nota fecha o mês de alguém. O lote do Receita Saúde
-- é o oposto — o manual manda emitir **na data do pagamento**, e o plano de saúde pede a
-- data da sessão para reembolsar. Agregar aqui destruiria exatamente o dado pelo qual o
-- paciente quer o recibo.
--
-- Os filtros são os mesmos do 015, pelos mesmos motivos: `inicio < now()` (não se emite
-- recibo de sessão que ainda não aconteceu), `situacao = 'marcado'` e `cliente_id not null`
-- (sem paciente não há beneficiário).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_a_recibar
with (security_invoker = true) as
  select
    a.id            as atendimento_id,
    a.tenant_id,
    a.cliente_id,
    a.inicio,
    /* Data civil em São Paulo. `inicio` é timestamptz, e uma sessão das 21h em UTC cairia no
     * dia seguinte — o recibo sairia com a data errada, e é a data que o plano confere. */
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
    and coalesce(c.ativo, true);

comment on view public.v_a_recibar is
  'Uma linha por sessão prestada e ainda fora de um lote do Receita Saúde. Não agrega por '
  'cliente de propósito: o recibo é por pagamento, com data — que é o que o plano de saúde '
  'exige para reembolsar.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · abrir_lote_recibo() — a CLAIM, mesma forma de `abrir_nota()`
--
-- ★ E PELO MESMO MOTIVO, com um custo diferente: aqui a duplicata não é nota fiscal, é
-- recibo em dobro no CPF de um paciente — que se cancela em dez dias, um por um, e que ele
-- já viu na conta do plano.
--
-- ⚠️ O VALOR É SOMADO AQUI DENTRO, nunca recebido. Tela aberta há dez minutos manda total
-- velho, e um POST forjado mandaria qualquer coisa. Mesma regra do 015.
--
-- Recebe os ids porque o CSV já foi validado do lado do app (CPF presente, valor maior que
-- zero, ano único) e só o que entrou no arquivo pode ser prendido. Prender antes faria a
-- sessão sem CPF do paciente sair da lista sem estar em recibo nenhum — desaparecendo do
-- radar exatamente no caso em que alguém precisa agir.
--
-- Zero linhas = outra aba chegou primeiro. Quem chama trata como "já foi", não como erro.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.abrir_lote_recibo(
  p_tenant_id      uuid,
  p_atendimentos   uuid[],
  p_competencia    date
)
returns table (
  lote_id      uuid,
  valor        numeric,
  linhas       int,
  atendimentos uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lote  uuid;
  v_ids   uuid[];
  v_valor numeric;
begin
  /* `for update skip locked`: se outra transação já está montando lote com estas sessões,
   * esta enxerga zero e desiste — em vez de esperar e gerar o segundo arquivo com as
   * mesmas linhas. */
  select array_agg(a.id), coalesce(sum(a.servico_valor), 0)
    into v_ids, v_valor
  from (
    select b.id, b.servico_valor
      from public.atendimentos b
     where b.tenant_id = p_tenant_id
       and b.id = any(p_atendimentos)
       and b.lote_recibo_id is null
       and b.situacao = 'marcado'
       and b.inicio < now()
     for update skip locked
  ) a;

  if v_ids is null or array_length(v_ids, 1) is null then
    return;
  end if;

  insert into public.lotes_recibo (tenant_id, competencia, linhas, valor, situacao)
  values (p_tenant_id, p_competencia, array_length(v_ids, 1), v_valor, 'gerado')
  returning id into v_lote;

  update public.atendimentos a
     set lote_recibo_id = v_lote
   where a.id = any(v_ids);

  return query select v_lote, v_valor, array_length(v_ids, 1), v_ids;
end;
$$;

comment on function public.abrir_lote_recibo(uuid, uuid[], date) is
  'Claim atômica do lote do Receita Saúde: cria o lote e prende nele as sessões pedidas, '
  'numa transação só. Zero linhas = outra aba chegou primeiro. O valor é somado aqui, '
  'nunca recebido de fora.';

revoke all on function public.abrir_lote_recibo(uuid, uuid[], date) from public, anon;
grant execute on function public.abrir_lote_recibo(uuid, uuid[], date) to service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · descartar_lote_recibo() — o caminho de volta
--
-- Ela baixou o arquivo e desistiu. Sem isto, as sessões ficam presas a um lote que nunca
-- foi importado e o mês inteiro congela — o pior tipo de bug fiscal, porque não dá erro:
-- a tela simplesmente diz "nada a faturar".
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
  v_soltos int;
begin
  /* ⚠️ SÓ SOLTA O QUE AINDA ESTÁ `gerado`. Descartar um lote já importado devolveria as
   * sessões para a lista, e o arquivo do mês seguinte emitiria recibo em dobro para elas —
   * com os primeiros já assinados no e-CAC. */
  update public.lotes_recibo
     set situacao = 'descartado'
   where tenant_id = p_tenant_id and id = p_lote_id and situacao = 'gerado';

  if not found then
    return 0;
  end if;

  update public.atendimentos
     set lote_recibo_id = null
   where tenant_id = p_tenant_id and lote_recibo_id = p_lote_id;

  get diagnostics v_soltos = row_count;
  return v_soltos;
end;
$$;

comment on function public.descartar_lote_recibo(uuid, uuid) is
  'Solta as sessões de um lote que o dono baixou e não importou. Só age sobre lote `gerado` '
  '— descartar um importado geraria recibo em dobro no mês seguinte.';

revoke all on function public.descartar_lote_recibo(uuid, uuid) from public, anon;
grant execute on function public.descartar_lote_recibo(uuid, uuid) to service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8 · `fiscal_configurado()` — agora com três caminhos
--
-- ★ O CAMINHO DO RECIBO NÃO PEDE NADA DO QUE OS OUTROS DOIS PEDEM. Sem CNPJ, sem município,
-- sem empresa no emissor e — o que importa — **sem certificado digital**. Duas colunas
-- preenchidas e o negócio está pronto para gerar arquivo.
--
-- ⚠️ ESPELHA `fiscalFaltando` do `dominio/fiscal.ts`, e a duplicação continua deliberada: o
-- banco responde para a view `v_negocio` (que a tela lê de uma vez) e a função em TypeScript
-- responde a frase. O que não pode divergir é o conjunto de condições, e há teste dos dois
-- lados prendendo isso.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fiscal_configurado(c public.config_fiscal)
returns boolean
language sql
stable
as $$
  select case
    /* Caminho do recibo (pessoa física). Vem PRIMEIRO porque não é regime tributário, é
     * outro documento — e porque as checagens abaixo pediriam o CNPJ de quem, por
     * definição, não tem um. */
    when c.prestador_cpf is not null then
      c.ocupacao_saude is not null

    else
      c.focus_empresa_id is not null
      and c.prestador_cnpj   is not null
      and c.codigo_municipio is not null
      and c.certificado_valido_ate is not null
      and c.certificado_valido_ate >= current_date
      and (
        case
          when c.optante_mei then c.codigo_tributacao_nacional is not null
          else c.inscricao_municipal is not null
           and c.item_lista_servico  is not null
        end
      )
  end
$$;

comment on function public.fiscal_configurado(public.config_fiscal) is
  'Pronto para emitir de verdade. Três caminhos: pessoa física (Receita Saúde — só CPF e '
  'ocupação, sem certificado), MEI (DPS nacional) e o municipal. Bifurca por prestador_cpf '
  'primeiro, porque recibo não é nota fiscal.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9 · CONFERÊNCIA — o que esperar no output
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  n_config int;
  n_cli    int;
  n_lote   int;
  n_view   int;
  n_func   int;
begin
  select count(*) into n_config
    from information_schema.columns
   where table_schema = 'public' and table_name = 'config_fiscal'
     and column_name in ('prestador_cpf', 'ocupacao_saude', 'registro_profissional');

  select count(*) into n_cli
    from information_schema.columns
   where table_schema = 'public' and table_name = 'clientes'
     and column_name in ('pagador_cpf', 'pagador_nome');

  select count(*) into n_lote
    from information_schema.columns
   where table_schema = 'public' and table_name = 'atendimentos' and column_name = 'lote_recibo_id';

  select count(*) into n_view
    from information_schema.views where table_schema = 'public' and table_name = 'v_a_recibar';

  select count(*) into n_func
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('abrir_lote_recibo', 'descartar_lote_recibo');

  raise notice '018 · config_fiscal %/3 · clientes %/2 · atendimentos.lote_recibo_id % · v_a_recibar % · funções %/2',
    n_config, n_cli, case when n_lote = 1 then 'ok' else 'FALTANDO' end, n_view, n_func;

  if n_config <> 3 or n_cli <> 2 or n_lote <> 1 or n_view <> 1 or n_func <> 2 then
    raise exception '018 não aplicou tudo — confira os erros acima antes de seguir.';
  end if;
end $$;

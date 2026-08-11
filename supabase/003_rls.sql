-- ═════════════════════════════════════════════════════════════════════════════
-- MAISA — 003 · RLS: O ISOLAMENTO ENTRE INQUILINOS
--
-- Rode DEPOIS do 002.
--
-- POR QUE ISTO E NÃO UM `where` NO CÓDIGO
-- O app usa a anon key + a sessão do usuário, nunca a service key. Essas políticas são
-- a única porta, e é de propósito: a auditoria do projeto de onde esta integração veio
-- encontrou IDOR entre inquilinos em CINCO rotas, todas pelo mesmo motivo — um filtro
-- esquecido no código enquanto a service key ignorava a RLS por cima. Aqui, filtro
-- esquecido não vaza nada: a linha do vizinho simplesmente não existe para você.
--
-- O DESENHO EM UMA FRASE
-- Você vê e mexe no que pertence a um negócio do qual você é MEMBRO. Papel só entra
-- onde o estrago é grande: credencial, cobrança e quem entra no negócio.
--
-- OS TRÊS GRUPOS
--   A · uniformes  — dado do dia. Todo membro lê e escreve. (loop, mais abaixo)
--   B · sensíveis  — credencial e cobrança. Papel manda.
--   C · estruturais— negócios e membros. Regra própria.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · As duas perguntas que toda política faz
--
-- SECURITY DEFINER é obrigatório aqui, não é atalho: a política de `membros` pergunta
-- a `membros`. Sem DEFINER isso é recursão infinita e o Postgres aborta a consulta.
-- Rodando como dono, a função não passa por RLS e a recursão não acontece.
--
-- `set search_path = ''` + nomes qualificados: sem isso, alguém que consiga criar um
-- schema no caminho pode plantar uma função homônima e a política passa a consultar a
-- tabela dele. É a falha clássica de SECURITY DEFINER.
--
-- Nenhuma das duas revela nada além do que quem chama já sabe: elas só respondem sobre
-- o próprio `auth.uid()`.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.negocios_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id from public.membros m where m.user_id = auth.uid()
$$;

comment on function public.negocios_do_usuario() is
  'Os negócios de quem está logado. Use SEMPRE como `tenant_id in (select ...)`: nessa '
  'forma o Postgres avalia uma vez por consulta (InitPlan) em vez de uma vez por linha.';

create or replace function public.tem_papel(p_tenant uuid, p_papeis text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.tenant_id = p_tenant
      and m.user_id = auth.uid()
      and m.papel = any (p_papeis)
  )
$$;

revoke all on function public.negocios_do_usuario()          from public, anon;
revoke all on function public.tem_papel(uuid, text[])         from public, anon;
grant execute on function public.negocios_do_usuario()        to authenticated;
grant execute on function public.tem_papel(uuid, text[])      to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · GRUPO A — as tabelas uniformes
--
-- Todas seguem a MESMA regra: membro do negócio lê e escreve. Estão num loop e não
-- copiadas onze vezes porque a repetição é o vetor: onze blocos quase iguais é onde
-- alguém troca um nome de coluna no décimo e ninguém percebe na revisão.
--
-- Ao criar tabela nova de dado do inquilino, o trabalho é acrescentar o nome nesta
-- lista. O arquivo 099 falha se você esquecer.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
  uniformes text[] := array[
    'profissionais',
    'servicos',
    'servicos_profissionais',
    'clientes',
    'atendimentos',
    'notas',
    'conversas',
    'mensagens',
    'faqs',
    'horarios_anunciados',
    'assistente'
  ];
begin
  foreach t in array uniformes loop
    execute format('alter table public.%I enable row level security', t);

    -- Ninguém anônimo toca em dado de inquilino. Login é pré-requisito.
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop policy if exists "membro lê" on public.%I', t);
    execute format('drop policy if exists "membro insere" on public.%I', t);
    execute format('drop policy if exists "membro atualiza" on public.%I', t);
    execute format('drop policy if exists "membro apaga" on public.%I', t);

    execute format($f$
      create policy "membro lê" on public.%I
        for select to authenticated
        using (tenant_id in (select public.negocios_do_usuario()))
    $f$, t);

    -- WITH CHECK no insert é o que impede escrever NO negócio de outro. Sem ele, a
    -- leitura estaria protegida e a escrita não — o furo mais silencioso que existe.
    execute format($f$
      create policy "membro insere" on public.%I
        for insert to authenticated
        with check (tenant_id in (select public.negocios_do_usuario()))
    $f$, t);

    -- USING diz quais linhas você pode alterar; WITH CHECK, em que estado elas podem
    -- ficar. Os dois: sem o segundo, dava para mover a própria linha para outro tenant.
    execute format($f$
      create policy "membro atualiza" on public.%I
        for update to authenticated
        using (tenant_id in (select public.negocios_do_usuario()))
        with check (tenant_id in (select public.negocios_do_usuario()))
    $f$, t);

    execute format($f$
      create policy "membro apaga" on public.%I
        for delete to authenticated
        using (tenant_id in (select public.negocios_do_usuario()))
    $f$, t);
  end loop;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · GRUPO B — credencial e cobrança
-- ─────────────────────────────────────────────────────────────────────────────

/* ── 3.1 · config_fiscal ─────────────────────────────────────────────────────
 * Só dono e gestor, inclusive na LEITURA. Emitir nota é ato de quem responde pelo
 * CNPJ, e o token da Focus não tem por que passar perto da sessão de uma recepção.
 *
 * O token está cifrado (AES-256-GCM, chave no servidor), então o pior caso — sessão de
 * um dono comprometida — vaza texto cifrado, não credencial. Endurecer mais que isso
 * significaria ler o segredo com service key, e o custo já é conhecido: foi a service
 * key ignorando RLS que transformou cinco filtros esquecidos em cinco IDORs. Fica como
 * está, com o limite escrito. */
alter table public.config_fiscal enable row level security;
revoke all on public.config_fiscal from anon;
grant select, insert, update, delete on public.config_fiscal to authenticated;

drop policy if exists "gestao lê"      on public.config_fiscal;
drop policy if exists "gestao insere"  on public.config_fiscal;
drop policy if exists "gestao atualiza" on public.config_fiscal;
drop policy if exists "dono apaga"     on public.config_fiscal;

create policy "gestao lê" on public.config_fiscal
  for select to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']));

create policy "gestao insere" on public.config_fiscal
  for insert to authenticated
  with check (public.tem_papel(tenant_id, array['dono','gestor']));

create policy "gestao atualiza" on public.config_fiscal
  for update to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']))
  with check (public.tem_papel(tenant_id, array['dono','gestor']));

create policy "dono apaga" on public.config_fiscal
  for delete to authenticated
  using (public.tem_papel(tenant_id, array['dono']));


/* ── 3.2 · integracoes_google ────────────────────────────────────────────────
 * Aqui a leitura é de TODO MEMBRO, e é uma escolha consciente com um custo.
 *
 * `acessoValido()` roda com a sessão de quem está usando o app (nunca service key), e
 * é ela que renova o token antes de qualquer chamada ao Google. Se só dono lesse esta
 * tabela, um atendente não conseguiria abrir a própria agenda. Então todo membro lê o
 * token CIFRADO — a GOOGLE_TOKEN_KEY não está no banco, e sem ela a linha é ruído.
 *
 * CONECTAR e DESCONECTAR, sim, são de gestão: mexer na conexão de outra pessoa é o tipo
 * de coisa que precisa de responsável. */
alter table public.integracoes_google enable row level security;
revoke all on public.integracoes_google from anon;
grant select, insert, update, delete on public.integracoes_google to authenticated;

drop policy if exists "membro lê"         on public.integracoes_google;
drop policy if exists "gestao conecta"    on public.integracoes_google;
drop policy if exists "gestao renova"     on public.integracoes_google;  -- nome antigo
drop policy if exists "membro renova"     on public.integracoes_google;
drop policy if exists "gestao desconecta" on public.integracoes_google;

create policy "membro lê" on public.integracoes_google
  for select to authenticated
  using (tenant_id in (select public.negocios_do_usuario()));

create policy "gestao conecta" on public.integracoes_google
  for insert to authenticated
  with check (public.tem_papel(tenant_id, array['dono','gestor']));

/* UPDATE é de todo membro, não só da gestão: `acessoValido()` REGRAVA o access token
 * renovado, e quem dispara isso é quem está usando o app. Barrar aqui não protegeria
 * nada (o token já foi lido na linha acima) e faria toda renovação de atendente falhar
 * calada — o app segue funcionando por 1h e depois quebra sem explicação. */
create policy "membro renova" on public.integracoes_google
  for update to authenticated
  using (tenant_id in (select public.negocios_do_usuario()))
  with check (tenant_id in (select public.negocios_do_usuario()));

/* Desconectar aceita qualquer linha do inquilino de propósito — inclusive de agenda que
 * já não aparece na tela. Sem isso, uma conexão órfã fica segurando um refresh token
 * vivo e invisível, impossível de apagar pela interface. */
create policy "gestao desconecta" on public.integracoes_google
  for delete to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']));


/* ── 3.3 · integracoes_whatsapp ──────────────────────────────────────────────
 * Só gestão, inclusive leitura. O agente de WhatsApp NÃO lê daqui com sessão de
 * usuário — ele não tem sessão (ver o comentário da tabela no 002 e a nota no LEIA-ME
 * sobre o adaptador do webhook). Esta tabela é a tela de configuração do canal. */
alter table public.integracoes_whatsapp enable row level security;
revoke all on public.integracoes_whatsapp from anon;
grant select, insert, update, delete on public.integracoes_whatsapp to authenticated;

drop policy if exists "gestao lê"       on public.integracoes_whatsapp;
drop policy if exists "gestao insere"   on public.integracoes_whatsapp;
drop policy if exists "gestao atualiza" on public.integracoes_whatsapp;
drop policy if exists "dono apaga"      on public.integracoes_whatsapp;

create policy "gestao lê" on public.integracoes_whatsapp
  for select to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']));

create policy "gestao insere" on public.integracoes_whatsapp
  for insert to authenticated
  with check (public.tem_papel(tenant_id, array['dono','gestor']));

create policy "gestao atualiza" on public.integracoes_whatsapp
  for update to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']))
  with check (public.tem_papel(tenant_id, array['dono','gestor']));

create policy "dono apaga" on public.integracoes_whatsapp
  for delete to authenticated
  using (public.tem_papel(tenant_id, array['dono']));


/* ── 3.4 · assinaturas ───────────────────────────────────────────────────────
 * Leitura para dono e gestor; escrita para NINGUÉM logado.
 *
 * A ausência de política de INSERT/UPDATE/DELETE aqui é a regra, não esquecimento: quem
 * escreve é o webhook do Stripe, com service_role, que passa por cima da RLS. Se um dono
 * pudesse escrever, ele poderia se dar plano ilimitado com um PATCH — e a única defesa
 * seria o app nunca oferecer o botão, o que não é defesa. */
alter table public.assinaturas enable row level security;
revoke all on public.assinaturas from anon;
revoke all on public.assinaturas from authenticated;
grant select on public.assinaturas to authenticated;

drop policy if exists "gestao lê" on public.assinaturas;

create policy "gestao lê" on public.assinaturas
  for select to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']));


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · GRUPO C — as tabelas estruturais
-- ─────────────────────────────────────────────────────────────────────────────

/* ── 4.1 · negocios ──────────────────────────────────────────────────────────
 * Sem política de INSERT: negócio nasce SÓ por `public.criar_negocio()` (arquivo 005).
 * É o funil do plug-and-play — a função cria o negócio, o membro dono, a assinatura em
 * trial, o assistente, os horários e o catálogo da vertical numa transação. Deixar
 * INSERT solto aqui produziria negócio pela metade: sem dono, portanto invisível para
 * quem o criou, e sem nada configurado.
 *
 * Sem política de DELETE: apagar inquilino cascateia para tudo e é operação de suporte
 * (pedido de LGPD, fim de contrato), feita com service_role e com alguém olhando. */
alter table public.negocios enable row level security;
revoke all on public.negocios from anon;
revoke all on public.negocios from authenticated;
grant select, update on public.negocios to authenticated;

drop policy if exists "membro lê"       on public.negocios;
drop policy if exists "gestao atualiza" on public.negocios;

create policy "membro lê" on public.negocios
  for select to authenticated
  using (id in (select public.negocios_do_usuario()));

/* `status` fica escrito por aqui também, e não tem como impedir sem privilégio de
 * coluna. Não é risco: `status` não aparece em política nenhuma, então mudá-lo não
 * abre porta — só desalinha a tela do estado real da cobrança, que o próximo evento
 * do Stripe corrige. */
create policy "gestao atualiza" on public.negocios
  for update to authenticated
  using (public.tem_papel(id, array['dono','gestor']))
  with check (public.tem_papel(id, array['dono','gestor']));


/* ── 4.2 · membros ───────────────────────────────────────────────────────────
 * A tabela que a RLS de todas as outras consulta. Regra própria e cuidadosa. */
alter table public.membros enable row level security;
revoke all on public.membros from anon;
grant select, insert, update, delete on public.membros to authenticated;

drop policy if exists "colegas se veem"  on public.membros;
drop policy if exists "dono convida"     on public.membros;
drop policy if exists "dono muda papel"  on public.membros;
drop policy if exists "eu escolho padrao" on public.membros;
drop policy if exists "dono remove ou eu saio" on public.membros;

/* Ver os colegas do mesmo negócio — é o que a tela de Equipe mostra. */
create policy "colegas se veem" on public.membros
  for select to authenticated
  using (tenant_id in (select public.negocios_do_usuario()));

create policy "dono convida" on public.membros
  for insert to authenticated
  with check (public.tem_papel(tenant_id, array['dono']));

/* Duas coisas diferentes cabem num UPDATE aqui, e elas têm donos diferentes:
 *   • trocar o PAPEL de alguém — só dono;
 *   • marcar qual negócio abre no login (`padrao`) — cada um no seu.
 * Como política não sabe qual coluna mudou, as duas convivem: o USING de uma OU de
 * outra libera a linha, e o trigger `exige_um_dono_no_update` (002) cobre o caso em
 * que a mudança deixaria o negócio sem dono. */
create policy "dono muda papel" on public.membros
  for update to authenticated
  using (public.tem_papel(tenant_id, array['dono']))
  with check (public.tem_papel(tenant_id, array['dono']));

create policy "eu escolho padrao" on public.membros
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

/* Dono remove quem quiser; qualquer um pode sair sozinho. O trigger do 002 impede que
 * a saída deixe o negócio sem dono. */
create policy "dono remove ou eu saio" on public.membros
  for delete to authenticated
  using (public.tem_papel(tenant_id, array['dono']) or user_id = (select auth.uid()));


/* ── 4.3 · eventos_auditoria ─────────────────────────────────────────────────
 * APPEND-ONLY. Sem política de UPDATE e sem política de DELETE — log que se pode
 * reescrever não serve de log. O privilégio também é retirado, não só a política:
 * assim a tentativa falha por permissão, com erro claro, em vez de "0 linhas
 * afetadas" — que é indistinguível de sucesso. */
alter table public.eventos_auditoria enable row level security;
revoke all on public.eventos_auditoria from anon;
revoke all on public.eventos_auditoria from authenticated;
grant select, insert on public.eventos_auditoria to authenticated;

drop policy if exists "gestao lê"    on public.eventos_auditoria;
drop policy if exists "membro grava" on public.eventos_auditoria;

create policy "gestao lê" on public.eventos_auditoria
  for select to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']));

create policy "membro grava" on public.eventos_auditoria
  for insert to authenticated
  with check (tenant_id in (select public.negocios_do_usuario()));


-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · A tabela legada
--
-- `google_integracoes` (arquivo 001) já tem RLS e as quatro políticas por `user_id`, mas
-- nasceu antes desta faxina e ficou com o GRANT que o Supabase dá a `anon` por padrão.
-- A RLS a protege — `auth.uid()` é nulo para anônimo, então nenhuma política casa e a
-- tabela responde vazia. Ainda assim o privilégio sai: o arquivo 099 exige acesso
-- anônimo zero em `public`, e "está protegido por outra camada" é exatamente a frase que
-- antecede o dia em que a outra camada muda.
--
-- Enquanto a tabela existir (ver a ordem de deploy no LEIA-ME, §6), esta linha fica.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.google_integracoes') is not null then
    revoke all on public.google_integracoes from anon;
    grant select, insert, update, delete on public.google_integracoes to authenticated;
  end if;
end;
$$;

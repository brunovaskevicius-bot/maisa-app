-- ═════════════════════════════════════════════════════════════════════════════
-- MAISA — 099 · AUDITORIA DO ISOLAMENTO
--
-- Rode por último, e rode DE NOVO toda vez que criar tabela ou view. Ele não muda nada:
-- só falha, alto, quando o banco está aberto.
--
-- POR QUE UM ARQUIVO SÓ PARA ISSO
-- Porque o modo de falhar de RLS é o pior que existe: silencioso e para cima. Tabela
-- nova sem `enable row level security` FUNCIONA — o app lê, o app escreve, os testes
-- passam, a tela abre. Ela só está lendo o inquilino de todo mundo, e ninguém descobre
-- isso olhando a tela. Foi assim que cinco rotas viraram cinco IDORs no projeto anterior.
--
-- Este arquivo é o teste que essa classe de erro nunca teve. Rode antes de cada deploy
-- que mexeu em schema — dez segundos, e ele acusa o que a revisão de código não vê.
--
-- O QUE ELE CONFERE
--   1. toda tabela de `public` tem RLS ligada
--   2. toda tabela com RLS tem ao menos uma política (RLS sem política = tabela vazia)
--   3. toda tabela com `tenant_id` tem política para as quatro operações — menos as
--      exceções DECLARADAS aqui embaixo, com o motivo
--   4. toda view tem `security_invoker = true` (senão ela ignora a RLS de quem consulta)
--   5. `anon` não tem privilégio nenhum em tabela de inquilino
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  problemas text[] := array[]::text[];
  r         record;

  /* q─ exceções declaradas ──
   * Ausência de política aqui é DESENHO, e o motivo fica escrito. Uma lista curta de
   * exceções conscientes vale mais que um aviso genérico que todo mundo aprende a
   * ignorar. Se você precisar acrescentar um nome, escreva o porquê na mesma linha. */
  sem_insert text[] := array[
    'negocios',        -- nasce só por public.criar_negocio() — evita inquilino sem dono
    'assinaturas'      -- escrita só pelo webhook do Stripe (service_role)
  ];
  sem_update text[] := array[
    'assinaturas',     -- idem
    'eventos_auditoria' -- append-only: log que se reescreve não é log
  ];
  sem_delete text[] := array[
    'negocios',        -- apagar inquilino é operação de suporte (LGPD), com gente olhando
    'assinaturas',
    'eventos_auditoria'
  ];
begin

  -- ── 1 · RLS ligada em tudo ───────────────────────────────────────────────
  for r in
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind = 'r'
      and not c.relrowsecurity
    order by c.relname
  loop
    problemas := problemas || format(
      'TABELA ABERTA: public.%s sem RLS. Qualquer usuário logado lê o inquilino de todos.',
      r.relname);
  end loop;

  -- ── 2 · RLS sem política nenhuma ─────────────────────────────────────────
  -- Não é falha de segurança (nega tudo), é falha de funcionamento: a tabela responde
  -- "0 linhas" para todo mundo e parece bug de código pelo resto da semana.
  for r in
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind = 'r'
      and c.relrowsecurity
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
    order by c.relname
  loop
    problemas := problemas || format(
      'TABELA MUDA: public.%s tem RLS e nenhuma política — nega tudo, para todos.',
      r.relname);
  end loop;

  -- ── 3 · cobertura das quatro operações ───────────────────────────────────
  -- Toda tabela com RLS, e não só as que têm coluna `tenant_id`: `negocios` se
  -- identifica por `id` e escaparia da checagem justamente por ser a raiz de tudo.
  for r in
    -- coalesce porque `bool_or` de zero linhas devolve NULL, e `if not null` não entra
    -- em ramo nenhum: sem isso, tabela com ZERO política passaria calada justamente
    -- pela auditoria que existe para pegá-la.
    select c.relname,
           coalesce(bool_or(p.polcmd in ('r', '*')), false) as tem_select,
           coalesce(bool_or(p.polcmd in ('a', '*')), false) as tem_insert,
           coalesce(bool_or(p.polcmd in ('w', '*')), false) as tem_update,
           coalesce(bool_or(p.polcmd in ('d', '*')), false) as tem_delete
    from pg_class c
    left join pg_policy p on p.polrelid = c.oid
    where c.relnamespace = 'public'::regnamespace
      and c.relkind = 'r'
      and c.relrowsecurity
    group by c.relname
    order by c.relname
  loop
    if not r.tem_select then
      problemas := problemas || format('SEM LEITURA: public.%s não tem política de SELECT.', r.relname);
    end if;
    if not r.tem_insert and not (r.relname = any (sem_insert)) then
      problemas := problemas || format('SEM INSERT: public.%s — se é de propósito, declare em `sem_insert`.', r.relname);
    end if;
    if not r.tem_update and not (r.relname = any (sem_update)) then
      problemas := problemas || format('SEM UPDATE: public.%s — se é de propósito, declare em `sem_update`.', r.relname);
    end if;
    if not r.tem_delete and not (r.relname = any (sem_delete)) then
      problemas := problemas || format('SEM DELETE: public.%s — se é de propósito, declare em `sem_delete`.', r.relname);
    end if;
  end loop;

  -- ── 4 · views precisam de security_invoker ───────────────────────────────
  -- Sem a opção, a view roda com os privilégios de quem a CRIOU (o dono do banco, que
  -- ignora RLS) e vira uma porta lateral para o inquilino do vizinho. A view é o único
  -- objeto do Postgres em que o default é o inseguro.
  for r in
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind = 'v'
      and not ('security_invoker=true' = any (coalesce(c.reloptions, array[]::text[])))
    order by c.relname
  loop
    problemas := problemas || format(
      'VIEW VAZADA: public.%s sem security_invoker=true — ela ignora a RLS de quem consulta.',
      r.relname);
  end loop;

  -- ── 5 · anon não toca em NADA ────────────────────────────────────────────
  -- O app inteiro exige login: as landing pages são estáticas e não consultam o banco.
  -- Então a régua é zero acesso anônimo em `public`, tabela ou view. Se um dia existir
  -- algo genuinamente público (uma página de agendamento por link, por exemplo), o nome
  -- entra numa allowlist declarada aqui — e não fica de fora da checagem por acidente.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    for r in
      select c.relname
      from pg_class c
      where c.relnamespace = 'public'::regnamespace
        and c.relkind in ('r', 'v')
        and (has_table_privilege('anon', c.oid, 'select')
             or has_table_privilege('anon', c.oid, 'insert')
             or has_table_privilege('anon', c.oid, 'update')
             or has_table_privilege('anon', c.oid, 'delete'))
      order by c.relname
    loop
      problemas := problemas || format(
        'ANON COM ACESSO: public.%s — dado de inquilino exige login. Falta um REVOKE.',
        r.relname);
    end loop;
  end if;

  -- ── veredito ─────────────────────────────────────────────────────────────
  if array_length(problemas, 1) > 0 then
    raise exception E'A auditoria de isolamento falhou em % ponto(s):\n\n  • %',
      array_length(problemas, 1),
      array_to_string(problemas, E'\n  • ');
  end if;

  raise notice '[099] Isolamento auditado: sem problemas.';
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- O mapa, para conferir com os olhos o que o bloco acima conferiu com pg_policy.
-- ─────────────────────────────────────────────────────────────────────────────

select
  c.relname                                                as tabela,
  c.relrowsecurity                                         as rls,
  count(p.oid)                                             as politicas,
  string_agg(
    case p.polcmd when 'r' then 'select' when 'a' then 'insert'
                  when 'w' then 'update' when 'd' then 'delete'
                  else 'all' end,
    ', ' order by p.polcmd
  )                                                        as operacoes
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;

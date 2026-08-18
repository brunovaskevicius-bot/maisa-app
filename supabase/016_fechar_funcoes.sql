-- ─────────────────────────────────────────────────────────────────────────────
-- 016 · FECHAR AS FUNÇÕES QUE O MUNDO PODIA CHAMAR
--
-- ── O QUE ESTAVA ABERTO, E POR QUÊ ──
--
-- No Postgres, uma função nasce com **EXECUTE concedido a PUBLIC**. É o único objeto do
-- banco cujo default é o permissivo — tabela nasce fechada, função nasce aberta. Junte
-- isso a `security definer` (que roda com os privilégios de quem criou, ignorando RLS) e o
-- resultado é uma porta sem tranca com a chave por dentro.
--
-- Duas escaparam da auditoria de 099, e o motivo é o mesmo nos dois casos: a seção 5 do
-- `099_auditoria.sql` confere privilégio de **tabela e view**, e nunca olhou para função.
-- O furo não estava no raciocínio, estava no alcance da régua.
--
--   1. `limpar_mensagens_antigas(dias)` — `007_memoria_agente.sql:164`. `security definer`,
--      **sem um único revoke**. Qualquer pessoa com a chave anônima (que está no bundle
--      JavaScript de /login, porque tem que estar) podia chamar:
--
--          POST /rest/v1/rpc/limpar_mensagens_antigas   { "dias": 0 }
--
--      `dias = 0` faz o `delete` casar TODAS as linhas de `mensagens_agente`, de todos os
--      inquilinos de uma vez — a função não filtra por tenant porque nunca foi feita para
--      ser chamada de fora. O estrago: a tela de Conversas fica vazia para todo mundo, o
--      agente perde o histórico das conversas em andamento (ele lê dessa tabela para saber
--      o que já foi dito) e o passo `primeira_conversa` apaga do checklist de ativação de
--      todos os clientes.
--
--   2. `abrir_nota(...)` — `015_faturamento.sql:190`. Revoga de `public, anon` e **esquece
--      `authenticated`**. Qualquer conta criada em /cadastro — que é grátis e aberta —
--      podia carimbar atendimentos de OUTRO inquilino com uma nota, fazendo-os sumir da
--      lista "a faturar" do dono legítimo. Ele emitiria a nota do mês sem eles, e a
--      diferença só apareceria no fechamento contábil.
--
-- ── A RÉGUA CERTA JÁ EXISTIA NO REPOSITÓRIO ──
--
-- `reservar_lembretes` (`010_lembretes.sql:127`) revoga de `public, anon, authenticated` e
-- concede só a `service_role`. É o padrão para toda função que o SERVIDOR chama e o
-- navegador não: as três primeiras são quem pode chegar pelo PostgREST, a última é a chave
-- que só existe no ambiente da Vercel.
--
-- ⚠️ REVOGAR DE `public` NÃO BASTA, e é o erro que produziu o caso 2: `anon` e
-- `authenticated` são papéis próprios do Supabase e podem ter recebido o privilégio por
-- outro caminho. Revogar dos três é o que fecha.
--
-- ⚠️ NENHUMA DESTAS FUNÇÕES PERDE USO. As duas são chamadas com `service_role`: a limpeza
-- roda por rotina de manutenção, e `abrir_nota` é chamada por `saida/supabase/notas.ts`,
-- que usa o cliente de service role no caminho do agente/sistema. O app não sente.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1 · a limpeza de mensagens ───────────────────────────────────────────────
revoke all on function public.limpar_mensagens_antigas(integer) from public, anon, authenticated;
grant execute on function public.limpar_mensagens_antigas(integer) to service_role;

comment on function public.limpar_mensagens_antigas(integer) is
  'Apaga mensagens do agente mais antigas que N dias. security definer e SEM filtro de '
  'inquilino — por isso só service_role executa (016). Chamar com dias=0 esvazia a tabela '
  'inteira, de todos os inquilinos.';

-- ── 2 · a claim atômica da nota ──────────────────────────────────────────────
-- `public` e `anon` já haviam sido revogados em 015; `authenticated` é o que faltava.
revoke all on function public.abrir_nota(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.abrir_nota(uuid, uuid, text, text, text) to service_role;

-- ── 3 · a régua, para não acontecer de novo ──────────────────────────────────
-- Vale para funções que EXISTEM hoje e para as que nascerem: qualquer `security definer`
-- em `public` que não esteja na lista de exceções e que `anon` ou `authenticated` consigam
-- executar faz a auditoria falhar. Ver a seção 6 acrescentada em `099_auditoria.sql`.
do $$
declare
  r record;
  abertas text[] := array[]::text[];
  -- Chamáveis pelo NAVEGADOR de propósito: são as que o app usa logado, e todas filtram
  -- por `auth.uid()` internamente. Estão aqui por decisão, não por esquecimento.
  permitidas text[] := array[
    'negocios_do_usuario', 'tem_papel', 'competencia_atual', 'hoje_local',
    'criar_negocio', 'trocar_negocio', 'meus_negocios', 'slugificar'
  ];
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.oid
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef                      -- só security definer: as outras respeitam RLS
      and not (p.proname = any (permitidas))
    order by p.proname
  loop
    if (exists (select 1 from pg_roles where rolname = 'anon')
        and has_function_privilege('anon', r.oid, 'execute'))
       or (exists (select 1 from pg_roles where rolname = 'authenticated')
           and has_function_privilege('authenticated', r.oid, 'execute'))
    then
      abertas := abertas || format('public.%s(%s)', r.proname, r.args);
    end if;
  end loop;

  if array_length(abertas, 1) > 0 then
    raise exception E'016 · Função security definer chamável pelo navegador:\n  • %\n\n'
      'Se é de propósito, declare em `permitidas`. Senão: revoke all ... from public, anon, '
      'authenticated; grant execute ... to service_role;',
      array_to_string(abertas, E'\n  • ');
  end if;

  raise notice '016 · Funções fechadas: nenhuma security definer exposta a anon/authenticated.';
end $$;

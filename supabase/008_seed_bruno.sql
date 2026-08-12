-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — a conta do Bruno como se fosse a de um cliente que comprou a MAISA.
--
-- Não é DDL: é DADO. Rode depois de 001–007, uma vez. É reexecutável (o resto do
-- diretório também é) — rodar duas vezes não duplica nem sobrescreve o que você já
-- ajustou à mão.
--
-- O QUE ESTE ARQUIVO FAZ:
--   1. acha o usuário do Bruno em `auth.users` (pelo e-mail);
--   2. provisiona o negócio dele, se ainda não existir, com **Rafael Antunes** como o
--      único profissional — e é esse profissional que recebe a agenda do Google;
--   3. cadastra a instância da Evolution em `integracoes_whatsapp`, que é o que faz o
--      webhook saber de quem é a mensagem;
--   4. semeia a carteira de clientes, só se o negócio ainda não tiver nenhum.
--
-- O QUE ELE **NÃO** FAZ, de propósito:
--   • Não cria a conexão com o Google. Token de OAuth não se semeia: ele nasce do consent
--     e é cifrado pela APLICAÇÃO com a GOOGLE_TOKEN_KEY (o banco nunca soube decifrar).
--     Depois de rodar isto, entre no painel e clique em "Conectar agenda do Google" no
--     Rafael — é ali que a agenda do bruno.vaskevicius vira a agenda dele.
--   • Não mexe em `config_fiscal` além do que o provisionamento já cria. Os dados fiscais
--     de verdade estão em env (`NF_PRESTADOR_*`) e a migração deles para o banco é outra
--     conversa (ver supabase/LEIA-ME.md §3.2).
--
-- ⚠️ PRÉ-REQUISITO QUE NÃO DÁ PARA CONTORNAR: o Bruno precisa ter feito login no app ao
-- menos uma vez, para existir a linha em `auth.users`. `provisionar_negocio` valida isso e
-- recusa dono inexistente — não há como criar o negócio "adiantado".
-- ─────────────────────────────────────────────────────────────────────────────


-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ AJUSTE ESTES DOIS VALORES ANTES DE RODAR                                  │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- `instancia` tem de ser IDÊNTICA ao EVOLUTION_INSTANCIA do ambiente. É a chave que o
-- webhook usa para descobrir o inquilino (`entrada/whatsapp/contexto.ts`), e a comparação
-- é insensível à caixa mas não perdoa espaço nem sufixo: "maisa" e "maisa-prod" são dois
-- negócios diferentes. Errar aqui faz TODA mensagem ser descartada com
-- "instância X não está em integracoes_whatsapp" — que ao menos diz o nome que chegou.

do $$
declare
  -- ⇩⇩⇩ OS DOIS QUE VOCÊ AJUSTA ⇩⇩⇩
  c_email      constant text := 'bruno.vaskevicius@polijunior.com.br';
  c_instancia  constant text := 'COLE_AQUI_O_EVOLUTION_INSTANCIA';
  -- ⇧⇧⇧ ------------------------- ⇧⇧⇧

  c_negocio    constant text := 'MAISA — Consultório do Bruno';
  c_vertical   constant text := 'generico';
  c_prof_nome  constant text := 'Rafael Antunes';

  v_user       uuid;
  v_tenant     uuid;
  v_prof       uuid;
  v_dono_da_instancia uuid;
  v_svcs       uuid[];
  v_n          int;
begin
  -- ── 1 · quem é o Bruno ──
  select u.id into v_user
  from auth.users u
  where lower(u.email) = lower(c_email)
  limit 1;

  if v_user is null then
    raise exception
      'Não há usuário com e-mail % em auth.users. Faça login no app uma vez e rode este seed de novo.', c_email
      using errcode = 'no_data_found';
  end if;
  raise notice '1 · usuário: %', v_user;

  -- ── 2 · o negócio ──
  -- Reaproveita o que existir em vez de criar um segundo: `provisionar_negocio` não é
  -- idempotente sozinha (cada chamada faz um inquilino novo), então a idempotência deste
  -- arquivo é esta consulta. Sem ela, rodar duas vezes daria dois negócios e o app abriria
  -- no `padrao`, deixando o outro invisível — com metade dos dados dentro.
  select m.tenant_id into v_tenant
  from public.membros m
  where m.user_id = v_user and m.papel = 'dono'
  order by m.padrao desc, m.criado_em
  limit 1;

  if v_tenant is null then
    -- O 4º argumento é o nome do profissional. É por ele que o Rafael nasce ligado ao
    -- `usuario_id` do Bruno — o que faz "a agenda do Rafael" e "a agenda do Bruno" serem
    -- a mesma coisa sem nenhum remendo depois.
    v_tenant := public.provisionar_negocio(v_user, c_negocio, c_vertical, c_prof_nome);
    raise notice '2 · negócio CRIADO: %', v_tenant;
  else
    raise notice '2 · negócio já existia, reaproveitando: %', v_tenant;
  end if;

  -- ── 3 · o profissional é o Rafael ──
  -- O provisionamento nomeia o profissional a partir do argumento; mas se o negócio já
  -- existia (criado pela migração 006, por exemplo, que usa o full_name ou o prefixo do
  -- e-mail), o nome pode ser outro. Renomear é o que o pedido diz: a agenda do Bruno é a
  -- agenda do Rafael.
  select p.id into v_prof
  from public.profissionais p
  where p.tenant_id = v_tenant and p.usuario_id = v_user
  order by p.criado_em
  limit 1;

  if v_prof is null then
    -- Negócio sem profissional ligado ao dono não deveria acontecer (o provisionamento
    -- sempre cria um), mas se acontecer o app fica sem coluna na Agenda e sem allowlist —
    -- então cria em vez de seguir em frente quieto.
    insert into public.profissionais (tenant_id, nome, papel, usuario_id, desde, ativo)
    values (v_tenant, c_prof_nome, 'Atendimento geral', v_user, current_date, true)
    returning id into v_prof;
    raise notice '3 · profissional CRIADO (não havia nenhum ligado ao dono): %', v_prof;
  else
    update public.profissionais
       set nome = c_prof_nome
     where id = v_prof and tenant_id = v_tenant and nome <> c_prof_nome;
    raise notice '3 · profissional: % (%)', v_prof, c_prof_nome;
  end if;

  -- ── 4 · a instância do WhatsApp ──
  if c_instancia = 'COLE_AQUI_O_EVOLUTION_INSTANCIA' then
    -- Aviso, não erro: o resto do seed é útil mesmo sem WhatsApp configurado, e abortar
    -- aqui obrigaria a rodar tudo de novo só por causa de uma linha.
    raise warning '4 · c_instancia não foi ajustada — PULANDO integracoes_whatsapp. O webhook do WhatsApp não vai identificar o inquilino até você cadastrar essa linha.';
  else
    -- `instancia` tem unique GLOBAL (é assim que o webhook deriva o tenant sem ambiguidade
    -- no mundo inteiro). Então há dois conflitos possíveis, e eles pedem coisas diferentes:
    --   • mesma instância JÁ neste negócio  → nada a fazer;
    --   • mesma instância em OUTRO negócio  → erro, e erro alto: seguir em frente
    --     apontaria duas contas para o mesmo número de WhatsApp, e as mensagens de um
    --     cliente entrariam na agenda do outro.
    select w.tenant_id into v_dono_da_instancia
    from public.integracoes_whatsapp w
    where lower(w.instancia) = lower(c_instancia)
    limit 1;

    if v_dono_da_instancia is not null and v_dono_da_instancia <> v_tenant then
      raise exception
        'A instância "%" já pertence ao negócio %. Duas contas no mesmo número de WhatsApp fariam a mensagem de um cliente cair na agenda do outro.',
        c_instancia, v_dono_da_instancia
        using errcode = 'unique_violation';
    end if;

    insert into public.integracoes_whatsapp (tenant_id, provedor, instancia, status, conectado_em)
    values (v_tenant, 'evolution', c_instancia, 'conectado', now())
    on conflict (tenant_id) do update
      set provedor     = excluded.provedor,
          instancia    = excluded.instancia,
          status       = excluded.status,
          -- A linha existente se referencia pelo NOME DA TABELA, sem schema: dentro de
          -- ON CONFLICT DO UPDATE o `public.` não é aceito como qualificador.
          -- `coalesce` preserva a data da primeira conexão em vez de reescrevê-la a cada
          -- reexecução do seed.
          conectado_em = coalesce(integracoes_whatsapp.conectado_em, excluded.conectado_em);
    raise notice '4 · instância "%" ligada ao negócio', c_instancia;

    -- `webhook_secret` e `token_cifrado` ficam NULOS de propósito: hoje a aplicação lê o
    -- segredo de WHATSAPP_WEBHOOK_SECRET e a chave da Evolution de EVOLUTION_API_KEY.
    -- Duplicar segredo no banco criaria duas fontes de verdade e a pergunta "qual vale?".
  end if;

  -- ── 5 · a carteira de clientes ──
  -- Só quando estiver vazia. É o mesmo raciocínio do passo 2: sem esta guarda, cada
  -- execução empilharia 17 clientes novos (não há chave natural única em `clientes` —
  -- número repetido acontece em família, e o schema aceita de propósito).
  select count(*) into v_n from public.clientes where tenant_id = v_tenant;

  if v_n > 0 then
    raise notice '5 · já há % cliente(s), não semeando', v_n;
  else
    -- Os serviços vêm do catálogo de partida que o provisionamento criou (a vertical
    -- `generico` traz 4). Cada cliente aponta para um deles, em rodízio, para o catálogo
    -- aparecer usado em vez de todo mundo no mesmo serviço.
    select array_agg(s.id order by s.nome) into v_svcs
    from public.servicos s where s.tenant_id = v_tenant;

    if v_svcs is null or array_length(v_svcs, 1) = 0 then
      raise warning '5 · o negócio não tem serviço nenhum — os clientes vão nascer sem serviço habitual.';
      v_svcs := array[]::uuid[];
    end if;

    insert into public.clientes (tenant_id, nome, telefone, email, cpf, canal, ativo, desde, servico_id, teste)
    select
      v_tenant,
      d.nome,
      d.telefone,
      c_email,   -- todos com o e-mail do Bruno, igual ao fixture: é conta de teste, e
                 -- assim qualquer notificação cai na caixa dele. Não há unique em email.
      d.cpf,
      d.canal,
      d.ativo,
      d.desde,
      case when array_length(v_svcs, 1) > 0
           then v_svcs[1 + (d.ord % array_length(v_svcs, 1))]
           else null end,
      d.teste
    from (values
      -- ord, nome,                telefone,            cpf,               canal,        ativo, desde,        teste
      (0,  'Mariana Alves',     '(11) 98123-4567', '312.456.789-01', 'Online',     true,  date '2024-03-01', false),
      (1,  'Rafael Costa',      '(11) 99876-1234', '408.221.334-90', 'Presencial', true,  date '2024-01-01', false),
      (2,  'Beatriz Lima',      '(11) 97654-3210', '199.873.221-44', 'Online',     true,  date '2024-09-01', false),
      (3,  'Camila e Rodrigo',  '(11) 99654-0099', '221.667.880-12', 'Presencial', true,  date '2024-11-01', false),
      (4,  'Lucas Martins',     '(11) 98112-9087', '389.220.115-67', 'Online',     true,  date '2025-04-01', false),
      (5,  'Fernanda Rocha',    '(11) 99003-2211', '470.118.226-05', 'Presencial', true,  date '2024-06-01', false),
      (6,  'Pedro Henrique',    '(11) 98890-5544', '612.334.778-21', 'Online',     true,  date '2024-10-01', false),
      (7,  'Juliana Dias',      '(11) 97221-8866', '298.554.110-78', 'Presencial', true,  date '2024-12-01', false),
      (8,  'Gustavo Nunes',     '(11) 99445-1100', '334.876.220-09', 'Online',     true,  date '2026-06-01', false),
      (9,  'Larissa Gomes',     '(11) 98667-3322', '145.998.667-30', 'Online',     true,  date '2025-05-01', false),
      (10, 'Thiago Barros',     '(11) 99778-4455', '502.117.889-64', 'Presencial', true,  date '2024-08-01', false),
      (11, 'Vinícius Carvalho', '(11) 98223-6677', '677.443.221-18', 'Online',     true,  date '2025-01-01', false),
      (12, 'Anderson Reis',     '(11) 99771-0342', '556.221.998-73', 'Presencial', true,  date '2025-02-01', false),
      -- Os três inativos vêm junto de propósito: `ativo=false` é como a remoção normal
      -- acontece no schema, e sem nenhum deles a tela de Clientes nunca exercita o filtro.
      (13, 'Sofia Ribeiro',     '(11) 97334-9988', '811.225.443-50', 'Online',     false, date '2023-03-01', false),
      (14, 'Marcelo Tavares',   '(11) 99110-2200', '723.889.110-42', 'Presencial', false, date '2023-07-01', false),
      (15, 'Patrícia Mendes',   '(11) 98556-7711', '455.667.889-23', 'Online',     false, date '2023-02-01', false),
      -- O tomador de teste fiscal. CPF real e existente de propósito: a prefeitura valida
      -- a existência do documento, e CPF inventado é recusado ANTES de a integração ser
      -- exercitada. `teste = true` é o que faz o app cancelar a nota logo após autorizar,
      -- para nunca sobrar NFS-e real de teste de pé.
      (16, 'Bruno Vaskevicius', '(11) 99999-0000', '545.739.088-89', 'Online',     true,  date '2026-07-01', true)
    ) as d(ord, nome, telefone, cpf, canal, ativo, desde, teste);

    raise notice '5 · 17 clientes semeados';
  end if;

  raise notice '';
  raise notice '── PRONTO ──';
  raise notice 'negócio ....... %', v_tenant;
  raise notice 'profissional .. % (%)', v_prof, c_prof_nome;
  raise notice '';
  raise notice 'PRÓXIMO PASSO, e é no navegador: abra o painel, vá no Rafael e clique em';
  raise notice '"Conectar agenda do Google". Autorize com %. Só depois disso a agenda', c_email;
  raise notice 'aparece na grade e dá para marcar PELO PAINEL.';
  raise notice '';
  raise notice '⚠️ O AGENTE DE WHATSAPP AINDA NÃO MARCA com o Supabase ligado. Ele conversa e';
  raise notice 'escala para humano em toda tentativa: a config dele ainda vem dos fixtures';
  raise notice '(ids "sv1"/"pr1") enquanto as consultas já são por uuid. O diagnóstico completo';
  raise notice 'está no bloco BLOQUEIO CONHECIDO em src/composicao.ts. Não é este seed.';
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- CONFERÊNCIA — rode isto depois e leia o resultado. Não é DDL.
--
-- `atendimentos` e `valor` vindo 0 para todo mundo é o ESPERADO num negócio novo, e não é
-- bug do seed: as duas colunas são derivadas da tabela `atendimentos` (view
-- `v_cliente_competencia`), que só ganha linha quando alguém marca de verdade. A carteira
-- do fixture tinha esses números embutidos porque eram constantes inventadas.
-- ─────────────────────────────────────────────────────────────────────────────

select
  n.nome                                as negocio,
  n.id                                  as tenant_id,
  (select count(*) from public.profissionais p where p.tenant_id = n.id)          as profissionais,
  (select count(*) from public.servicos     s where s.tenant_id = n.id)           as servicos,
  (select count(*) from public.clientes     c where c.tenant_id = n.id)           as clientes,
  (select count(*) from public.integracoes_google g where g.tenant_id = n.id)     as agendas_google,
  (select w.instancia from public.integracoes_whatsapp w where w.tenant_id = n.id) as instancia_whatsapp
from public.negocios n
join public.membros m on m.tenant_id = n.id and m.papel = 'dono'
join auth.users u     on u.id = m.user_id
where lower(u.email) = lower('bruno.vaskevicius@polijunior.com.br');

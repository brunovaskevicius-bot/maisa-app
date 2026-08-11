-- ═════════════════════════════════════════════════════════════════════════════
-- MAISA — 006 · MIGRAÇÃO: `google_integracoes` → o modelo multi-inquilino
--
-- Rode DEPOIS do 005. É IDEMPOTENTE: rodar duas vezes não duplica nada.
--
-- O QUE MUDA
-- A tabela do arquivo 001 é chaveada por `(user_id, profissional_id)`, com o
-- profissional em TEXTO ("pr1") porque a equipe morava em `src/lib/data.ts`. Agora a
-- equipe mora no banco, então a chave passa a ser `(tenant_id, profissional_id uuid)`.
--
-- ⚠️ A TABELA ANTIGA NÃO É APAGADA AQUI, E ISSO É A PARTE IMPORTANTE.
-- O app em produção está lendo `google_integracoes` neste exato momento — é de lá que
-- sai o token que desenha a agenda real do Bruno. Se este arquivo derrubasse a tabela,
-- a agenda cairia no instante do `Run`, antes de qualquer deploy. A ordem é:
--
--     1. rodar 002–006            (banco novo de pé, dados copiados, app intacto)
--     2. subir o código que lê `integracoes_google`
--     3. conferir que a agenda abre em produção
--     4. só então `drop table public.google_integracoes` — numa migration 007
--
-- Enquanto os dois existirem, a antiga é cópia morta: ninguém escreve nela depois do
-- passo 2. Reconectar a agenda depois do deploy grava só na nova.
--
-- COMO O `pr1` VIRA UM UUID
-- A primeira conexão de cada usuário (a mais antiga) é casada com o profissional que o
-- provisionamento criou para ele — é a mesma pessoa, só ganhou id de verdade. Conexões
-- seguintes ("pr2", "pr3") viram profissionais novos chamados "Agenda pr2": não há como
-- adivinhar o nome de alguém que só existia como coluna na grade, e inventar um nome
-- errado é pior que declarar o que aquilo é.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  r            record;
  v_tenant     uuid;
  v_prof       uuid;
  v_nome       text;
  v_primeira   boolean;
  v_migradas   int := 0;
  v_negocios   int := 0;
begin
  /* Banco novo, sem passado: nada a migrar e nada a reclamar. */
  if to_regclass('public.google_integracoes') is null then
    raise notice '[006] `google_integracoes` não existe — nada a migrar.';
    return;
  end if;

  /* ── 1 · um negócio para cada usuário que já tinha conexão ── */
  for r in
    select distinct g.user_id
    from public.google_integracoes g
    where not exists (select 1 from public.membros m where m.user_id = g.user_id)
      and exists (select 1 from auth.users u where u.id = g.user_id)
  loop
    v_nome := coalesce(
      (select nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
         from auth.users u where u.id = r.user_id),
      (select split_part(u.email, '@', 1) from auth.users u where u.id = r.user_id),
      'Meu negócio'
    );

    /* `generico` de propósito: o banco não sabe se este usuário é terapeuta ou barbeiro,
     * e chutar a vertical erra o catálogo de partida. O dono troca na tela. */
    perform public.provisionar_negocio(r.user_id, v_nome, 'generico');
    v_negocios := v_negocios + 1;
  end loop;

  /* ── 2 · as conexões, uma a uma, da mais antiga para a mais nova ── */
  for r in
    select g.user_id, g.profissional_id, g.google_email,
           g.access_token, g.refresh_token, g.expira_em, g.criado_em,
           row_number() over (partition by g.user_id order by g.criado_em, g.profissional_id) as ordem
    from public.google_integracoes g
    where exists (select 1 from public.membros m where m.user_id = g.user_id)
    order by g.user_id, g.criado_em, g.profissional_id
  loop
    /* O negócio desta pessoa. `padrao` primeiro; se nenhum estiver marcado, o mais
     * antigo — determinístico, para reexecutar não escolher outro. */
    select m.tenant_id into v_tenant
    from public.membros m
    where m.user_id = r.user_id
    order by m.padrao desc, m.criado_em
    limit 1;

    if v_tenant is null then
      raise notice '[006] usuário % sem negócio — conexão % ignorada.',
        r.user_id, r.profissional_id;
      continue;
    end if;

    v_primeira := (r.ordem = 1);
    v_prof := null;

    /* A primeira conexão é a da pessoa que provisionou o negócio. */
    if v_primeira then
      select p.id into v_prof
      from public.profissionais p
      where p.tenant_id = v_tenant and p.usuario_id = r.user_id
      order by p.criado_em
      limit 1;
    end if;

    /* Reexecução: se já migramos esta agenda antes, o profissional "Agenda prN" existe. */
    if v_prof is null then
      select p.id into v_prof
      from public.profissionais p
      where p.tenant_id = v_tenant and p.nome = 'Agenda ' || r.profissional_id
      limit 1;
    end if;

    if v_prof is null then
      insert into public.profissionais (tenant_id, nome, papel, desde)
      values (v_tenant, 'Agenda ' || r.profissional_id, 'Importado do Google', current_date)
      returning id into v_prof;
    end if;

    /* Os tokens vão CIFRADOS e intactos: eles já foram escritos com AES-256-GCM pela
     * aplicação (google/cripto.ts) e o banco nunca soube decifrá-los. Copiar o texto é
     * exatamente o certo — e é por isso que a migração não precisa da GOOGLE_TOKEN_KEY. */
    insert into public.integracoes_google
      (tenant_id, profissional_id, google_email, access_token, refresh_token,
       expira_em, criado_em)
    values
      (v_tenant, v_prof, r.google_email, r.access_token, r.refresh_token,
       r.expira_em, r.criado_em)
    on conflict (tenant_id, profissional_id) do nothing;

    v_migradas := v_migradas + 1;
  end loop;

  raise notice '[006] negócios criados: % · conexões processadas: %', v_negocios, v_migradas;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Conferência — rode e leia antes de seguir para o passo 2 (o deploy).
--
-- Cada linha da antiga deve ter par na nova. Se sobrar linha aqui, NÃO faça o deploy:
-- a agenda daquela pessoa vai abrir vazia.
--
-- Num ambiente que nunca teve o arquivo 001 esta consulta erra com "relation does not
-- exist" — é esperado, e é a mesma coisa que o `notice` do bloco acima já disse. Pule.
-- ─────────────────────────────────────────────────────────────────────────────

select
  g.user_id,
  g.profissional_id                                     as antigo,
  m.tenant_id,
  (select count(*) from public.integracoes_google i
    where i.tenant_id = m.tenant_id)                    as conexoes_no_novo,
  g.google_email
from public.google_integracoes g
left join public.membros m on m.user_id = g.user_id and m.padrao
order by g.user_id, g.criado_em;

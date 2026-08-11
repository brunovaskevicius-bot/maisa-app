-- ═════════════════════════════════════════════════════════════════════════════
-- MAISA — 004 · VISÕES: o que é DERIVADO
--
-- Rode DEPOIS do 003.
--
-- O QUE ESTÁ AQUI
-- Todo campo do domínio que é CONTA, não fato. `Cliente.atendimentos`, `Cliente.valor`,
-- `Profissional.atendimentosMes`, a fila do dia: nada disso é coluna no 002, e a razão
-- é concreta. O fixture guardava `atendimentosMes: 168` em cada profissional E a soma
-- dos quatro dava 407 numa tela e 168 na outra — dois números para a mesma coisa,
-- discordando na mesma sessão. Contador que ninguém recalcula sempre vira isso.
--
-- ⚠️ `security_invoker = true` EM TODAS. Sem essa opção a view roda com os privilégios
-- de quem a criou (o dono do banco, que ignora RLS) e passa a ser um buraco por onde se
-- lê o inquilino do vizinho — a view vira exatamente o `select` sem `where` que a RLS
-- existe para tornar impossível. Com ela, a view obedece à política de quem consulta.
-- É a pegadinha nº 1 de multi-tenant no Supabase; leia antes de criar a próxima view.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · A COMPETÊNCIA — o mês fiscal aberto, no fuso do negócio
--
-- `now()` no fuso errado erra o mês por até 3 horas por virada — e a virada é
-- justamente quando o fechamento roda. `negocios.fuso` existe para isto.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.competencia_atual(p_tenant uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select date_trunc('month', (now() at time zone n.fuso))::date
  from public.negocios n
  where n.id = p_tenant
$$;

revoke all on function public.competencia_atual(uuid) from public, anon;
grant execute on function public.competencia_atual(uuid) to authenticated;

/* "Hoje" também é pergunta de fuso, e não de servidor. Às 22h de São Paulo o servidor
 * do Supabase já está em amanhã (UTC): sem esta função, a fila do dia esvazia sozinha
 * três horas antes da meia-noite e o dono acha que confirmou tudo. */
create or replace function public.hoje_local(p_tenant uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone n.fuso)::date
  from public.negocios n
  where n.id = p_tenant
$$;

revoke all on function public.hoje_local(uuid) from public, anon;
grant execute on function public.hoje_local(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · v_cliente_competencia — quanto cada cliente fechou, mês a mês
--
-- É a base da nota fiscal: `PedidoDeEmissao.valor` sai daqui. Só conta atendimento
-- `marcado` — desmarcado não se cobra, e a linha continua na tabela justamente para
-- esta soma poder ignorá-la sem perder o histórico de quem desmarca.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_cliente_competencia
with (security_invoker = true) as
  select
    a.tenant_id,
    a.cliente_id,
    a.competencia,
    count(*)::int                     as atendimentos,
    coalesce(sum(a.servico_valor), 0) as valor
  from public.atendimentos a
  where a.situacao = 'marcado'
    and a.cliente_id is not null
  group by a.tenant_id, a.cliente_id, a.competencia;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · v_clientes — o tipo `Cliente` inteiro, pronto para o adaptador
--
-- Isto é o que `RepositorioNegocio.cliente()` e `.clientePorTelefone()` devem
-- consultar: a tabela `clientes` sozinha não responde `atendimentos` nem `valor`.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_clientes
with (security_invoker = true) as
  select
    c.id,
    c.tenant_id,
    c.nome,
    c.telefone,
    c.telefone_chave,
    c.email,
    c.cpf,
    c.canal,
    c.ativo,
    c.desde,
    c.servico_id,
    c.teste,
    coalesce(cc.atendimentos, 0) as atendimentos,
    coalesce(cc.valor, 0)        as valor
  from public.clientes c
  left join public.v_cliente_competencia cc
    on  cc.tenant_id   = c.tenant_id
    and cc.cliente_id  = c.id
    and cc.competencia = public.competencia_atual(c.tenant_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · v_profissionais — o tipo `Profissional`, com o contador do mês calculado
--
-- `servico_ids` volta como array para o adaptador não precisar de uma segunda consulta
-- só para montar `Profissional.servicoIds`.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_profissionais
with (security_invoker = true) as
  select
    p.id,
    p.tenant_id,
    p.nome,
    p.papel,
    p.usuario_id,
    p.avaliacao,
    p.comissao,
    p.desde,
    p.ativo,
    p.horario,
    p.folga,
    p.expediente_folga,
    p.expediente_de,
    p.expediente_ate,
    coalesce(sp.servico_ids, array[]::uuid[]) as servico_ids,
    coalesce(m.atendimentos, 0)               as atendimentos_mes
  from public.profissionais p
  left join lateral (
    select array_agg(x.servico_id) as servico_ids
    from public.servicos_profissionais x
    where x.tenant_id = p.tenant_id and x.profissional_id = p.id
  ) sp on true
  left join lateral (
    select count(*)::int as atendimentos
    from public.atendimentos a
    where a.tenant_id = p.tenant_id
      and a.profissional_id = p.id
      and a.situacao = 'marcado'
      and a.competencia = public.competencia_atual(p.tenant_id)
  ) m on true;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · v_servicos — o tipo `Servico`, com `profissionalIds`
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_servicos
with (security_invoker = true) as
  select
    s.id,
    s.tenant_id,
    s.nome,
    s.categoria,
    s.preco,
    s.duracao,
    s.ativo,
    coalesce(
      (select array_agg(x.profissional_id)
       from public.servicos_profissionais x
       where x.tenant_id = s.tenant_id and x.servico_id = s.id),
      array[]::uuid[]
    ) as profissional_ids
  from public.servicos s;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · v_negocio — os INGREDIENTES do tipo `Negocio`
--
-- De propósito não devolve as strings prontas ("Cartão final 4417", "05/08/2026"):
-- essas são apresentação, e apresentação é da tela. O adaptador compõe. A regra vem de
-- `dominio/catalogo.ts` e vale aqui igual — DADO, nunca apresentação.
--
-- LEFT JOIN em `assinaturas` porque a RLS dela é mais estreita que a deste inquilino:
-- para um `atendente`, as colunas de cobrança voltam nulas em vez de a linha desaparecer.
-- Uma recepção não precisa saber quanto o dono paga; precisa que a tela abra.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_negocio
with (security_invoker = true) as
  select
    n.id as tenant_id,
    n.nome,
    n.vertical,
    n.slug,
    n.fuso,
    n.status,
    a.plano,
    a.preco             as preco_plano,
    a.status            as assinatura_status,
    a.periodo_fim       as proxima_cobranca,
    a.cartao_marca,
    a.cartao_final4,
    a.conversas_limite,          -- null = ilimitado ("conversasPlano")
    /* Espelha `EmissorFiscal.configurado`: a tela precisa saber se dá para emitir de
     * verdade antes de oferecer o botão. `false` quando quem consulta não é gestão —
     * a RLS de config_fiscal esconde a linha, e uma linha ausente é honestamente
     * "não configurado" do ponto de vista de quem não pode configurar. */
    coalesce(public.fiscal_configurado(f), false) as fiscal_pronto,
    f.ambiente                                    as fiscal_ambiente
  from public.negocios n
  left join public.assinaturas  a on a.tenant_id = n.id
  left join public.config_fiscal f on f.tenant_id = n.id;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · v_fila — "Precisa de você", montada em vez de guardada
--
-- `ItemFila` nunca foi entidade: metade nasce de CONVERSA parada esperando decisão, e
-- metade de ATENDIMENTO de hoje que ninguém confirmou. Duas origens, uma tela. Guardar
-- isso em tabela seria manter sincronizado à mão um dado que já existe em dois lugares.
--
-- `alvo` é o id que a Gaveta abre — e é por isso que `tipo` vem junto: sem ele, a tela
-- não sabe se abre uma conversa ou um atendimento.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_fila
with (security_invoker = true) as
  select
    c.tenant_id,
    'conversa'::text            as tipo,
    c.id::text                  as alvo,
    c.nome                      as titulo,
    'espera'::text              as tag,
    coalesce(
      (select m.txt from public.mensagens m
       where m.tenant_id = c.tenant_id and m.conversa_id = c.id
       order by m.criado_em desc limit 1),
      ''
    )                           as msg,
    c.ultima_mensagem_em        as quando
  from public.conversas c
  where c.estado = 'espera'

  union all

  select
    a.tenant_id,
    'atendimento'::text         as tipo,
    a.id::text                  as alvo,
    a.cliente_nome              as titulo,
    'confirmar'::text           as tag,
    a.servico_nome              as msg,
    a.inicio                    as quando
  from public.atendimentos a
  where a.situacao = 'marcado'
    and not a.confirmado
    /* Só o dia corrente, no fuso do negócio. Cobrar confirmação de semana que vem não
     * é "precisa de você" — é ruído que faz a fila parar de ser lida. */
    and a.data_local = public.hoje_local(a.tenant_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8 · Privilégios das visões
--
-- View não herda GRANT das tabelas — só a RLS (por causa do security_invoker). Sem
-- estas linhas, `authenticated` recebe erro de permissão e não "0 linhas".
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v text;
  visoes text[] := array[
    'v_cliente_competencia',
    'v_clientes',
    'v_profissionais',
    'v_servicos',
    'v_negocio',
    'v_fila'
  ];
begin
  foreach v in array visoes loop
    execute format('revoke all on public.%I from anon', v);
    execute format('grant select on public.%I to authenticated', v);
  end loop;
end;
$$;

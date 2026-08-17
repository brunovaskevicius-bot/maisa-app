-- ─────────────────────────────────────────────────────────────────────────────
-- 015 · O FATURAMENTO SAI DO NAVEGADOR E VAI PARA O BANCO
--
-- ★ A RECLAMAÇÃO QUE ORIGINOU ISTO, na palavra do Bruno (14/08/2026):
--
--   "a lógica da página de faturamento está errada. ela deve ser diretamente atrelada
--    à tela de agendamentos, e deve ser totalmente calculada com base no tanto de
--    agendamentos que foram feitos desde a última emissão de notas. além disso, ela
--    deve contabilizar os casos em que uma única pessoa teve a nota emitida, e tirar
--    essa pessoa da emissão em massa."
--
-- Ele está certo, e o defeito é pior do que parece. Hoje:
--
--   • o "já emitiu" vive no `localStorage`, na chave `maisa.app.v3`, mapeado POR CLIENTE.
--     Trocar de navegador ressuscita o botão. Limpar o cache ressuscita o botão. E o
--     celular do dono e o computador dele discordam entre si;
--   • sendo por cliente e não por período, quem teve nota em agosto nunca mais aparece
--     como pendente — setembro nasce fechado;
--   • e a soma vem de `v_clientes.valor`, que é o total da COMPETÊNCIA — não "desde a
--     última emissão". Emitir duas vezes no mesmo mês cobra o mês inteiro nas duas.
--
-- ⚠️ ATÉ ONTEM ISSO ERA TEÓRICO, porque `config_fiscal` não era lida por ninguém e nenhum
-- inquilino conseguia emitir de verdade. O 014 destravou a emissão por CNPJ do cliente —
-- e destravou junto a possibilidade de gerar DOCUMENTO FISCAL DUPLICADO, que não se apaga:
-- cancela-se na prefeitura, com justificativa, e há cidade que não aceita cancelamento por
-- webservice nenhum.
--
-- ── A PEÇA QUE FALTAVA JÁ ESTÁ NO BANCO ──
--
-- `atendimentos.nota_id` entrou no 014. Com ela, "falta emitir" é `nota_id is null` — uma
-- pergunta que o Postgres responde, igual para todo aparelho, e que **já significa "desde a
-- última emissão"** sem precisar guardar data nenhuma. As duas metades da reclamação caem
-- da mesma coluna.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · v_a_faturar — o que falta emitir, por cliente
--
-- ⚠️ SÓ ATENDIMENTO QUE JÁ ACONTECEU (`inicio < now()`), E ISSO É UMA CORREÇÃO.
--
-- `v_cliente_competencia`, que a tela usa hoje, soma tudo que está `marcado` — inclusive o
-- horário de amanhã. Ou seja: dá para emitir nota de um serviço que ainda não foi prestado.
-- Ninguém reclamou porque ninguém conseguia emitir; agora consegue.
--
-- O corte é por TEMPO e não por `etapa = 'feito'`, de propósito. `etapa` é o kanban da tela
-- (chegando → atendendo → feito), e é o dono que arrasta o cartão. Amarrar faturamento a
-- isso significaria que quem não arrasta nunca fatura — e o mais provável é que ninguém
-- arraste na correria. Já "o horário começou e ninguém cancelou" é sinal que existe sozinho.
--
-- `cliente_id is null` fica fora: sem cliente não há tomador, e nota de serviço precisa de
-- um. É o mesmo filtro de `v_cliente_competencia`.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_a_faturar
with (security_invoker = true) as
  select
    a.tenant_id,
    a.cliente_id,
    count(*)::int                     as atendimentos,
    coalesce(sum(a.servico_valor), 0) as valor,
    min(a.inicio)                     as desde,
    max(a.inicio)                     as ate,
    /* O serviço MAIS FREQUENTE do período, e é ele que vai na discriminação da nota — o
     * texto que a prefeitura imprime no documento.
     *
     * ⚠️ Vem do snapshot `atendimentos.servico_nome`, e não de um join com `servicos`. É
     * de propósito: o dono pode renomear ou desativar um serviço depois, e a nota tem que
     * dizer o que foi prestado NAQUELE dia, não o nome de hoje. `servico_id` sequer tem FK
     * por essa razão. */
    mode() within group (order by a.servico_nome) as servico,
    /* A competência do mais recente — é a que vai na nota. Um lote que atravessa a virada
     * do mês sai na competência do último atendimento, que é o que a prefeitura espera. */
    max(a.competencia)                as competencia
  from public.atendimentos a
  where a.nota_id is null
    and a.situacao = 'marcado'
    and a.cliente_id is not null
    and a.inicio < now()
  group by a.tenant_id, a.cliente_id;

comment on view public.v_a_faturar is
  'O que falta emitir, por cliente: atendimentos já prestados e ainda sem nota. Substitui o '
  'localStorage `maisa.app.v3.notas`, que era por cliente (nunca por período), morria ao '
  'trocar de navegador e permitia emitir a mesma nota duas vezes.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · abrir_nota() — a CLAIM ATÔMICA, e é ela que impede a nota duplicada
--
-- ★ MESMA FORMA DE `reservar_lembretes()` (010), pelo mesmo motivo. Lá a claim impede a
-- rotina de mandar o mesmo lembrete duas vezes; aqui impede duas abas — ou dois cliques —
-- de emitirem dois documentos fiscais para o mesmo atendimento.
--
-- A ordem é: MARCAR PRIMEIRO, EMITIR DEPOIS. Parece invertido e não é. Se emitíssemos antes
-- de marcar, uma falha entre as duas coisas deixaria uma nota autorizada na prefeitura com
-- os atendimentos ainda "a faturar" — e a próxima tentativa emitiria a segunda. Marcando
-- primeiro, a falha deixa uma nota `erro` com os atendimentos presos a ela: visível, e
-- retentável **sem** reabrir a porta da duplicação.
--
-- ⚠️ O VALOR É CALCULADO AQUI DENTRO, e nunca recebido de fora. Uma tela aberta há dez
-- minutos tem um total velho; recebê-la como argumento emitiria nota com valor que não
-- corresponde ao que foi marcado. Aqui o que se soma é exatamente o que se prendeu.
--
-- Devolve zero linhas quando não havia nada a faturar — que é o que acontece quando outra
-- aba chegou primeiro. Quem chama trata como "já foi", não como erro.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.abrir_nota(
  p_tenant_id   uuid,
  p_cliente_id  uuid,
  p_ref         text,
  p_ambiente    text,
  p_discriminacao text
)
returns table (
  nota_id       uuid,
  valor         numeric,
  atendimentos  int,
  competencia   date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota   uuid;
  v_ids    uuid[];
  v_valor  numeric;
  v_comp   date;
  v_cli    record;
begin
  /* ── 1 · reserva as linhas ──
   * `for update skip locked`: se outra transação já está emitindo para este cliente, esta
   * enxerga zero e desiste — em vez de esperar e emitir a segunda nota logo em seguida. */
  select array_agg(a.id), coalesce(sum(a.servico_valor), 0), max(a.competencia)
    into v_ids, v_valor, v_comp
  from (
    select b.id, b.servico_valor, b.competencia
      from public.atendimentos b
     where b.tenant_id  = p_tenant_id
       and b.cliente_id = p_cliente_id
       and b.nota_id is null
       and b.situacao = 'marcado'
       and b.inicio < now()
     for update skip locked
  ) a;

  /* Nada a faturar. NÃO é erro: é a segunda aba chegando depois da primeira. */
  if v_ids is null or array_length(v_ids, 1) is null then
    return;
  end if;

  /* ── 2 · o snapshot do tomador ──
   * Copiado para dentro da nota porque nota fiscal autorizada é documento imutável: ela não
   * pode mudar porque alguém editou o cadastro do cliente depois. É a mesma razão de
   * `notas` não ter FK para `clientes` (ver o comentário do 002). */
  select c.nome, c.cpf, c.email, c.telefone
    into v_cli
  from public.clientes c
  where c.tenant_id = p_tenant_id and c.id = p_cliente_id;

  insert into public.notas (
    tenant_id, ref, status, valor, discriminacao, competencia, cliente_id, ambiente,
    tomador_nome, tomador_cpf, tomador_email, tomador_telefone
  ) values (
    p_tenant_id, p_ref, 'pendente', v_valor, p_discriminacao, v_comp, p_cliente_id, p_ambiente,
    v_cli.nome, v_cli.cpf, v_cli.email, v_cli.telefone
  )
  returning id into v_nota;

  /* ── 3 · prende os atendimentos ──
   * Dentro da mesma transação do insert: ou as duas coisas acontecem, ou nenhuma. */
  update public.atendimentos a
     set nota_id = v_nota
   where a.id = any(v_ids);

  return query select v_nota, v_valor, array_length(v_ids, 1), v_comp;
end;
$$;

comment on function public.abrir_nota(uuid, uuid, text, text, text) is
  'Claim atômica: cria a nota e prende nela os atendimentos já prestados e sem nota, numa '
  'transação só. Zero linhas = não havia o que faturar (outra aba chegou primeiro). O valor '
  'é somado aqui dentro, nunca recebido — tela velha mandaria total errado.';

/* `security definer` exige revogar do público e liberar só para quem deve chamar — é o
 * mesmo cuidado de `criar_negocio()` e `reservar_lembretes()`. A checagem de inquilino não
 * pode ficar só no argumento: quem chama é o servidor, com service role. */
revoke all on function public.abrir_nota(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.abrir_nota(uuid, uuid, text, text, text) to service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · RLS de `notas` — a tabela existia desde o 002 e nunca foi escrita
--
-- Ela tem política? O 003 criou. Isto aqui só CONFERE, porque uma tabela com RLS ligada e
-- política nenhuma é o modo de falha que o 007 já produziu uma vez: "o painel não lê, o
-- agente lê". Se o notice abaixo disser 0, rode o 003 antes de seguir.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  n_politicas int;
  n_view      int;
  n_func      int;
begin
  select count(*) into n_politicas
    from pg_policies where schemaname = 'public' and tablename = 'notas';

  select count(*) into n_view
    from information_schema.views where table_schema = 'public' and table_name = 'v_a_faturar';

  select count(*) into n_func
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'abrir_nota';

  raise notice '015 · v_a_faturar: % · abrir_nota: % · políticas em notas: %',
    n_view, n_func, n_politicas;

  if n_view <> 1 or n_func <> 1 then
    raise exception '015 não aplicou tudo — confira os erros acima.';
  end if;

  if n_politicas = 0 then
    raise warning '⚠️ `notas` está com RLS e SEM política. O painel não vai ler nota nenhuma. Rode o 003_rls.sql.';
  end if;
end $$;

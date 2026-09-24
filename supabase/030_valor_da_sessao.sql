/* ─────────────────────────────────────────────────────────────────────────────
 * 030 — O PREÇO DA SESSÃO MORA NA FICHA DO CLIENTE.
 *
 * Na terapia o valor muda de pessoa para pessoa (tabela social, convênio, pacote), e o
 * catálogo guarda um preço por serviço. Desde 24/09/2026 o atendimento aceita preço
 * próprio; esta coluna é o que faz a próxima sessão da mesma pessoa já nascer com ele —
 * pela tela e pelo WhatsApp (`agendarAtendimento` usa: pedido → ficha → catálogo).
 *
 * Nulo = sem preço próprio, vale o do serviço. Aditivo e reexecutável. O código lê a view
 * com `*`, então funciona antes desta migração (sem o campo) e depois.
 * ────────────────────────────────────────────────────────────────────────────── */

alter table public.clientes add column if not exists valor_sessao numeric(10, 2);

alter table public.clientes drop constraint if exists clientes_valor_sessao_check;
alter table public.clientes add constraint clientes_valor_sessao_check
  check (valor_sessao is null or valor_sessao between 0 and 100000);

/* A coluna nova vai no FIM: `create or replace view` só aceita acrescentar. */
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
    coalesce(cc.valor, 0)        as valor,
    c.valor_sessao
  from public.clientes c
  left join public.v_cliente_competencia cc
    on  cc.tenant_id   = c.tenant_id
    and cc.cliente_id  = c.id
    and cc.competencia = public.competencia_atual(c.tenant_id);

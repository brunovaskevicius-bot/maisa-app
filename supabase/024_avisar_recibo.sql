-- ─────────────────────────────────────────────────────────────────────────────
-- 024 · AVISAR O PACIENTE QUANDO O RECIBO SAIR
--
-- Um interruptor por inquilino: quando o callback do canal confirma `emitido`, a MAISA manda
-- uma mensagem para quem foi atendido dizendo que o recibo já está no Receita Saúde.
--
-- ── ★ POR QUE O PADRÃO É `false` ──
--
-- Porque a mensagem vai para o WhatsApp de TERCEIRO, e sai do número pessoal de quem usa a
-- MAISA. Ligar isso por padrão significaria que, no primeiro fechamento de mês depois de um
-- deploy, trinta pacientes recebem mensagem que ninguém pediu — do número pessoal da
-- profissional, sobre um assunto fiscal.
--
-- É a mesma direção do `pix` e do `encaixe` nesta tabela, e a mesma do `avisar` do lote (que é
-- opt-in a cada envio, porque lá tem um humano no clique). Aqui não há clique: o disparo é o
-- callback de um servidor. Um interruptor default ligado seria o dono descobrindo depois.
--
-- ── ⚠️ O CAMINHO DO LOTE (CSV) NÃO USA ESTA COLUNA ──
--
-- Lá o aviso é decidido por envio, na tela, e continua assim: quem clica está olhando. Esta
-- coluna governa só a emissão automática, que acontece sem ninguém por perto.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.assistente
  add column if not exists avisar_recibo boolean not null default false;

comment on column public.assistente.avisar_recibo is
  'Avisar o paciente pelo WhatsApp quando o callback confirmar o recibo como emitido. '
  'Padrão false: a mensagem vai para terceiro, a partir do número pessoal do dono, e o '
  'disparo não tem humano no meio. Ver 024_avisar_recibo.sql.';

-- ── conferência ──
do $$
declare
  tem boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assistente' and column_name = 'avisar_recibo'
  ) into tem;

  raise notice '024 · assistente.avisar_recibo %', case when tem then 'ok' else 'FALTANDO' end;
end $$;

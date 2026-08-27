-- ─────────────────────────────────────────────────────────────────────────────
-- 025 · O DESFECHO DO AVISO FICA NA LINHA DO RECIBO
--
-- ── ★ POR QUE ESTA COLUNA EXISTE (26/08/2026) ──
--
-- Bruno emitiu 20 recibos e recebeu UMA mensagem. Estava certo — só um daqueles pacientes tinha
-- telefone de verdade, e os outros 19 eram números de semente que o WhatsApp recusa com
-- `exists: false`. Mas ele só descobriu isso porque CONTOU e perguntou.
--
-- É esse o buraco: o aviso engole o erro de propósito (o recibo já saiu, e uma mensagem que não
-- sai não pode desfazer documento fiscal), e o que ele engolia não aparecia em lugar nenhum.
-- Amanhã, com pacientes de verdade, "o número dela mudou" seria silêncio idêntico ao sucesso.
--
-- O caminho do LOTE não tem esse problema: ele devolve um placar (`avisados`, `semTelefone`,
-- `falhas`) porque há um fim de lote para reportar. Na emissão automática cada recibo é um evento
-- solto de servidor — não existe "fim". Então o desfecho tem que morar onde o evento mora: na
-- linha do recibo.
--
-- ── OS QUATRO ESTADOS, E POR QUE NENHUM DELES É `null` ──
--
--   `enviado`      · a mensagem saiu
--   `sem_telefone` · não havia para onde mandar (avulso sem cadastro, ficha sem telefone)
--   `falhou`       · o canal recusou — número que não existe, WhatsApp fora do ar
--   `desligado`    · o dono não pediu aviso nenhum
--
-- ⚠️ `desligado` É UM ESTADO, e não a ausência dele. Sem essa distinção, `null` significaria ao
-- mesmo tempo "ele não quis" e "tentamos e não deu" — e a tela teria que escolher uma das duas
-- para mostrar, errando metade das vezes.
--
-- `null` sobra para o que ainda não aconteceu: recibo pendente, recusado ou cancelado. Aviso só
-- existe para recibo emitido.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.recibos_emitidos
  add column if not exists aviso text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'recibos_emitidos_aviso_check'
  ) then
    alter table public.recibos_emitidos
      add constraint recibos_emitidos_aviso_check
      check (aviso is null or aviso in ('enviado', 'sem_telefone', 'falhou', 'desligado'));
  end if;
end $$;

comment on column public.recibos_emitidos.aviso is
  'O que aconteceu com a mensagem ao paciente: enviado | sem_telefone | falhou | desligado. '
  'null = ainda não se aplica (recibo que não está emitido). Ver 025_desfecho_do_aviso.sql.';

-- ── conferência ──
do $$
declare
  tem_coluna boolean;
  tem_check  boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recibos_emitidos' and column_name = 'aviso'
  ) into tem_coluna;

  select exists (
    select 1 from pg_constraint where conname = 'recibos_emitidos_aviso_check'
  ) into tem_check;

  raise notice '025 · recibos_emitidos.aviso % · check %',
    case when tem_coluna then 'ok' else 'FALTANDO' end,
    case when tem_check  then 'ok' else 'FALTANDO' end;
end $$;

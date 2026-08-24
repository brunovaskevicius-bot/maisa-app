-- ─────────────────────────────────────────────────────────────────────────────
-- 021 · PROCURAÇÃO — quem entra no e-CAC pela profissional
--
-- ★ É O QUE TRANSFORMA O RECEITA SAÚDE EM UM BOTÃO. A procuração eletrônica do e-CAC, com a
-- permissão "IRPF – Carnê Leão Web", autoriza um terceiro a emitir, consultar, cancelar e
-- alterar os recibos dela. Ela outorga com gov.br prata/ouro; o certificado é NOSSO.
--
-- ⚠️ DUAS COLUNAS, E NENHUM SEGREDO. O certificado que usa a procuração não mora aqui e não vai
-- morar: `.pfx` em banco é credencial em backup, em réplica e em dump. Aqui fica só QUEM
-- representa e ATÉ QUANDO — o suficiente para a tela avisar antes de parar.
--
-- ⚠️ REVOGAÇÃO NÃO DÁ PARA GUARDAR. O e-CAC não avisa quando uma procuração é cancelada e não há
-- o que consultar de fora; a gente descobre quando a emissão falha. Por isso o vencimento, que é
-- a parte previsível, existe como coluna: é o único aviso possível antes do prejuízo.
--
-- Idempotente: pode rodar duas vezes.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.config_fiscal
  add column if not exists procurador_documento text,
  add column if not exists procuracao_valida_ate date;

comment on column public.config_fiscal.procurador_documento is
  'CPF (11) ou CNPJ (14) de quem emite pela profissional, só dígitos. NULL = ela mesma emite.';
comment on column public.config_fiscal.procuracao_valida_ate is
  'Fim da procuração, data civil. NULL = outorgada sem prazo — o e-CAC permite até 5 anos ou '
  'indeterminado. Vencida NÃO equivale a ausente: ver dominio/fiscal.ts, `Representacao`.';

/* Só dígitos, e só nos dois tamanhos que existem. Documento com máscara aqui faria a comparação
 * com o que a Receita devolve falhar por causa de ponto e barra — e o erro apareceria lá, no
 * meio da emissão, em vocabulário de portal. */
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'config_fiscal_procurador_documento_ck'
  ) then
    alter table public.config_fiscal
      add constraint config_fiscal_procurador_documento_ck
      check (procurador_documento is null or procurador_documento ~ '^[0-9]{11}$'
                                          or procurador_documento ~ '^[0-9]{14}$');
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CONFERÊNCIA
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'config_fiscal'
     and column_name in ('procurador_documento', 'procuracao_valida_ate');
  if n <> 2 then
    raise exception '021: esperava 2 colunas novas em config_fiscal, achei %', n;
  end if;
  raise notice '021 ok — config_fiscal tem procurador_documento e procuracao_valida_ate';
end $$;

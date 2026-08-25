-- ─────────────────────────────────────────────────────────────────────────────
-- 022 · O ACEITE DA AUTORIZAÇÃO
--
-- ★ A RECEITA MUDOU A REGRA, E A GENTE DESCOBRIU NA TELA. A autorização de acesso (o nome novo
-- da procuração eletrônica) nasce "Em Análise" e **só passa a valer depois que o procurador
-- confirma que assume a função**, na aba *Recebidas* de "Minhas Autorizações de Acesso".
--
-- Enquanto isso não acontece, o e-CAC recusa a troca de perfil com uma mensagem enganosa —
-- "pendente de aprovação por unidade de atendimento" — que manda procurar um posto da Receita
-- quando o botão que falta está do NOSSO lado. Visto em 24/08/2026.
--
-- ⚠️ SEM ESTA COLUNA, `procurador_documento` PREENCHIDO SIGNIFICARIA "PODE EMITIR" — e a tela
-- prometeria um botão que falha, com o cliente esperando uma emissão que nunca começou.
--
-- ⚠️ RODE A 021 ANTES. Idempotente: pode rodar duas vezes.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.config_fiscal
  add column if not exists procuracao_aceita_em date;

comment on column public.config_fiscal.procuracao_aceita_em is
  'Quando NÓS confirmamos a autorização na aba Recebidas do e-CAC. NULL com '
  'procurador_documento preenchido = ela outorgou e a bola está com a gente. Ver '
  'dominio/fiscal.ts, `Representacao.aguardando_aceite`.';

-- ─────────────────────────────────────────────────────────────────────────────
-- CONFERÊNCIA
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'config_fiscal'
     and column_name in ('procurador_documento', 'procuracao_valida_ate', 'procuracao_aceita_em');
  if n <> 3 then
    raise exception '022: esperava as 3 colunas de autorização em config_fiscal, achei %', n;
  end if;
  raise notice '022 ok — config_fiscal tem as tres colunas de autorizacao';
end $$;

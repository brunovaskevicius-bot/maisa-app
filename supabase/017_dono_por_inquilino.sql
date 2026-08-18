-- ─────────────────────────────────────────────────────────────────────────────
-- 017 · O TELEFONE DO DONO SAI DA ENV E VIRA COLUNA DO INQUILINO
--
-- ── O QUE ESTAVA ERRADO ──
--
-- Quando a MAISA não dá conta de uma conversa, ela ESCALA: manda um WhatsApp para o dono
-- dizendo "preciso de você", com o telefone do cliente e um link `wa.me` para ele assumir.
--
-- O destino desse aviso era `MAISA_WHATSAPP_DONO`, uma variável de ambiente — ou seja, UM
-- número para todos os inquilinos. Duas consequências, e as duas são graves:
--
--   1. VAZAMENTO ENTRE INQUILINOS POR CONFIGURAÇÃO. O aviso carrega o telefone do cliente
--      final. Com uma env global, o cliente da barbearia do Zé tem o número dele entregue
--      no WhatsApp de outra pessoa. Não é bug de consulta — nenhuma auditoria de RLS pega
--      isso, porque o dado nunca passou pelo banco.
--
--   2. O DONO CERTO NUNCA É AVISADO. Toda conversa que a MAISA não resolve morre: o
--      cliente esperando resposta, e o dono sem saber que havia alguém esperando. É o
--      cenário que o produto inteiro existe para evitar.
--
-- ── ONDE A COLUNA MORA, E POR QUÊ ──
--
-- Em `integracoes_whatsapp` e não em `negocios`: ela descreve o CANAL (quem atende neste
-- WhatsApp), não a empresa. O dia em que um negócio tiver dois canais — o número da loja e
-- o do delivery — cada um vai querer chamar uma pessoa diferente. Em `negocios` isso
-- exigiria mover a coluna; aqui já nasce certo.
--
-- Ao lado de `modo`, que é a outra decisão "de quem é este número" e já mora aqui.
--
-- ⚠️ SEM `not null` E SEM DEFAULT. `null` é estado legítimo: o dono ainda não preencheu, e
-- a escalação fica só no log. Obrigar o campo faria o pareamento do WhatsApp — que é o
-- passo 3 do onboarding — depender de um dado que ninguém pediu ainda. Canal que atende
-- vale mais que canal que não sobe por falta de campo opcional.
--
-- Aditivo e reexecutável.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.integracoes_whatsapp
  add column if not exists telefone_dono text;

comment on column public.integracoes_whatsapp.telefone_dono is
  'Para quem a MAISA manda "preciso de você nessa conversa", em E.164 sem +. null = '
  'escalação só no log. Era a env global MAISA_WHATSAPP_DONO até 017 — que entregava o '
  'telefone do cliente de um inquilino no WhatsApp de outro.';

-- A RLS de `integracoes_whatsapp` já está declarada em 003 e cobre a tabela inteira, então
-- a coluna nova nasce protegida. Este bloco existe para FALHAR ALTO se isso deixar de ser
-- verdade — uma coluna com telefone pessoal não pode depender de ninguém lembrar.
do $$
begin
  if not exists (
    select 1 from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relname = 'integracoes_whatsapp'
      and c.relrowsecurity
  ) then
    raise exception '017 · integracoes_whatsapp está sem RLS — telefone_dono ficaria exposto.';
  end if;

  raise notice '017 · telefone_dono criado em integracoes_whatsapp (RLS confirmada).';
end $$;

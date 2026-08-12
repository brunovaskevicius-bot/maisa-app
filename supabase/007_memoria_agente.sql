-- ─────────────────────────────────────────────────────────────────────────────
-- MAISA — memória do agente de WhatsApp.
--
-- Rode DEPOIS de 002_multitenant.sql (depende de `negocios` e `clientes`).
-- Dashboard → SQL Editor → cole → Run. Leia os `notice`.
--
-- Hoje quem serve estas tabelas é `adaptadores/saida/demo/memoria.ts` — um `Map` de
-- processo, que morre no redeploy e não é compartilhado entre instâncias da Vercel.
-- Isso é aceitável para exercitar o agente e inaceitável em produção: duas mensagens
-- seguidas podem cair em lambdas diferentes, e a segunda não lembra da primeira. A
-- tabela existe versionada antes do adaptador de propósito — é ela que define o
-- formato, não o contrário.
--
-- O QUE FALTA DO LADO DO TYPESCRIPT:
--   • `saida/supabase/memoria.ts` implementando RepositorioMemoria + RepositorioHistorico
--   • duas linhas em `src/composicao.ts` (`const memoria = ...`, `const historico = ...`)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Perfil que atravessa conversas ───────────────────────────────────────────
--
-- Chave é (tenant_id, telefone_chave) e NÃO cliente_id: a memória nasce antes do
-- cadastro. Quem manda a primeira mensagem é um lead, ganha nome na segunda e só vira
-- cliente quando marca. Com chave em cliente_id, tudo que ele disse antes de fechar
-- seria perdido — justamente a parte da conversa em que ele decide.
create table if not exists public.memoria_cliente (
  tenant_id      uuid not null references public.negocios (id) on delete cascade,

  -- Só dígitos, os 8 últimos. Mesma normalização de `clientes.telefone_chave` e de
  -- `soDigitos().slice(-8)` no TypeScript: o WhatsApp manda "5511981234567" e o
  -- cadastro guarda "(11) 98123-4567". DDI e nono dígito são o que varia entre as
  -- duas grafias do MESMO número, e comparar a string crua nunca casaria.
  telefone_chave text not null check (telefone_chave ~ '^[0-9]{8}$'),

  -- Preenchido quando o telefone casa com o cadastro. Nullable: lead não tem.
  cliente_id     uuid references public.clientes (id) on delete set null,

  nome           text check (nome is null or length(btrim(nome)) between 1 and 80),

  -- ⚠️ DERIVADOS. Escritos só pelo domínio (`dominio/memoria.ts` → `comFato`), nunca
  -- pelo agente. São cache do que `historico` já diz: existem como coluna para o
  -- prompt não precisar recalcular a moda a cada mensagem recebida.
  --
  -- Sem FK para profissionais/servicos de propósito: um serviço desativado não deve
  -- fazer a gravação da memória FALHAR. Preferimos um favorito que não resolve mais
  -- (o prompt simplesmente não o menciona) a um erro no meio do atendimento.
  profissional_favorito_id uuid,
  servico_favorito_id      uuid,
  -- Hora decimal, igual ao resto do app: 14.5 = 14:30.
  horario_favorito         numeric(4,2) check (horario_favorito is null or (horario_favorito >= 0 and horario_favorito < 24)),

  -- As últimas escolhas (`Escolha[]` do domínio), mais antiga primeiro. A janela é
  -- cortada em 12 no TypeScript; o check aqui é rede de segurança contra escrita
  -- fora do caminho — preferência muda, e histórico infinito faz a MAISA lembrar de
  -- quem o cliente era em 2024 em vez de quem ele é agora.
  historico      jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(historico) = 'array' and jsonb_array_length(historico) <= 12),

  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  primary key (tenant_id, telefone_chave)
);

-- A busca quente do agente: telefone → perfil, uma vez por mensagem recebida. A PK já
-- cobre; este índice serve ao caminho inverso (achar a memória de um cliente conhecido
-- a partir da tela dele).
create index if not exists memoria_cliente_por_cliente
  on public.memoria_cliente (tenant_id, cliente_id)
  where cliente_id is not null;

-- ── Histórico da conversa ────────────────────────────────────────────────────
--
-- Tabela SEPARADA da memória, e não uma coluna nela, porque os ciclos de vida são
-- opostos: o perfil dura anos e é minúsculo, a thread dura horas e cresce a cada
-- mensagem. Vão terminar com políticas de retenção diferentes — a LGPD pede que a
-- thread expire, e o perfil o cliente pode querer que fique.
--
-- Guarda TEXTO (`Msg` do domínio), nunca blocos de tool_use do provedor. Duas razões:
-- resultado de ferramenta sobre agenda azeda em segundos (replayar "quinta 15h está
-- livre" dez minutos depois faz a MAISA reafirmar um horário já tomado), e guardar o
-- formato da Anthropic faria trocar de modelo virar migração de banco.
create table if not exists public.mensagens_agente (
  id             bigint generated always as identity primary key,
  tenant_id      uuid not null references public.negocios (id) on delete cascade,
  telefone_chave text not null check (telefone_chave ~ '^[0-9]{8}$'),

  -- Espelha `Msg.de` em `dominio/conversas.ts`:
  --   cliente — quem escreveu do outro lado
  --   bot     — a MAISA
  --   voce    — o dono assumiu a conversa no painel
  autor          text not null check (autor in ('cliente', 'bot', 'voce')),
  texto          text not null check (length(texto) between 1 and 4000),

  -- Id da mensagem no provedor. UNIQUE parcial: o webhook do WhatsApp REENTREGA o
  -- mesmo evento quando não recebe 200 a tempo, e sem isto a MAISA responderia duas
  -- vezes à mesma mensagem — cobrando token duas vezes e parecendo confusa.
  provedor_id    text,

  criado_em      timestamptz not null default now()
);

-- A leitura do agente: as N últimas desta conversa, mais recente primeiro.
create index if not exists mensagens_agente_thread
  on public.mensagens_agente (tenant_id, telefone_chave, criado_em desc);

create unique index if not exists mensagens_agente_sem_duplicata
  on public.mensagens_agente (tenant_id, provedor_id)
  where provedor_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
--
-- Mesmo padrão de 003_rls.sql: só membro do negócio vê o que é do negócio.
--
-- ⚠️ O AGENTE NÃO PASSA POR AQUI. Ele roda no servidor, sem `auth.uid()`, então usa a
-- service role — que ignora RLS por definição. Estas políticas protegem o PAINEL (e um
-- vazamento de anon key); a proteção do lado do agente é o `tenantId` vir do número que
-- recebeu a mensagem, nunca do corpo do request (ver `entrada/whatsapp/contexto.ts`).
-- Confundir as duas coisas é o jeito mais fácil de achar que está protegido e não estar.
alter table public.memoria_cliente   enable row level security;
alter table public.mensagens_agente  enable row level security;

-- ⚠️ CORRIGIDO: estas quatro expressões diziam `m.usuario_id`, e essa coluna NÃO EXISTE —
-- em `002_multitenant.sql` a coluna de `membros` chama-se `user_id`. O erro não é sutil no
-- efeito: `create policy` valida a expressão na hora, então este bloco abortava com
-- 'column m.usuario_id does not exist' e as DUAS tabelas ficavam com
-- `enable row level security` (linhas acima, que rodam antes) e POLÍTICA NENHUMA.
--
-- Tabela com RLS ligada e zero políticas nega tudo para `authenticated`. Ou seja: o painel
-- não lia nem escrevia memória, e o agente continuava funcionando (service role ignora RLS)
-- — a combinação que faz o problema passar despercebido. Quem rodou o arquivo e não leu o
-- erro no SQL Editor ficou com o schema pela metade.
--
-- Passa a usar `public.negocios_do_usuario()`, o helper de `003_rls.sql`, pelos dois motivos
-- que o 003 documenta: é o mesmo vocabulário do resto do schema, e nesta forma
-- (`tenant_id in (select ...)`) o Postgres avalia UMA vez por consulta em vez de por linha.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'memoria_cliente' and policyname = 'membro_ve_memoria') then
    create policy membro_ve_memoria on public.memoria_cliente
      for all
      using (tenant_id in (select public.negocios_do_usuario()))
      with check (tenant_id in (select public.negocios_do_usuario()));
    raise notice 'policy membro_ve_memoria criada';
  end if;

  if not exists (select 1 from pg_policies where tablename = 'mensagens_agente' and policyname = 'membro_ve_mensagens') then
    create policy membro_ve_mensagens on public.mensagens_agente
      for all
      using (tenant_id in (select public.negocios_do_usuario()))
      with check (tenant_id in (select public.negocios_do_usuario()));
    raise notice 'policy membro_ve_mensagens criada';
  end if;
end $$;

-- ── Retenção ─────────────────────────────────────────────────────────────────
--
-- O histórico não precisa durar para sempre e não deveria: é conversa de cliente, e
-- conversa guardada sem prazo é passivo de LGPD, não ativo de produto. 180 dias cobre
-- qualquer disputa de "eu marquei e vocês não anotaram".
--
-- Não há job agendado aqui de propósito — agendamento é decisão de operação (pg_cron
-- no Supabase, ou uma rotina no app). A função existe para que essa decisão seja uma
-- linha, e não um script que alguém escreve com pressa no dia do incidente.
create or replace function public.limpar_mensagens_antigas(dias integer default 180)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare apagadas bigint;
begin
  delete from public.mensagens_agente where criado_em < now() - (dias || ' days')::interval;
  get diagnostics apagadas = row_count;
  raise notice 'mensagens_agente: % linhas apagadas (mais de % dias)', apagadas, dias;
  return apagadas;
end $$;

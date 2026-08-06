-- ─────────────────────────────────────────────────────────────────────────────
-- MAISA — tokens do Google Calendar, um por profissional.
--
-- Rode uma vez no Supabase: Dashboard → SQL Editor → cole → Run.
--
-- Esta DDL é versionada de propósito. No projeto de onde a integração veio (BIP),
-- a tabela equivalente só existe descrita em prosa na documentação — não há
-- migration nenhuma, então subir um ambiente novo depende de alguém lembrar do
-- schema. Aqui o arquivo é a verdade.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.google_integracoes (
  -- Dono da conexão: o usuário logado na MAISA.
  user_id        uuid        not null references auth.users (id) on delete cascade,

  -- Profissional cuja agenda foi conectada (pr1, pr2, pr3… de src/lib/data.ts).
  -- É texto e não FK porque a equipe do protótipo mora no código, não no banco.
  profissional_id text       not null,

  -- Conta Google que autorizou. Só para a UI dizer "conectado como fulano@".
  google_email   text        not null,

  -- Tokens CIFRADOS com AES-256-GCM (ver src/lib/google/cripto.ts). Mesmo com
  -- acesso ao banco, sem a GOOGLE_TOKEN_KEY eles não valem nada.
  access_token   text        not null,
  refresh_token  text        not null,

  expira_em      timestamptz not null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  -- Uma conexão por profissional, por usuário. É também o alvo do upsert
  -- (onConflict "user_id,profissional_id"): reconectar atualiza, não duplica.
  primary key (user_id, profissional_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: o isolamento é imposto pelo Postgres, não pelo código da aplicação.
--
-- O app usa a anon key + sessão do usuário (nunca a service key), então estas
-- políticas são a única porta. É de propósito: a auditoria do BIP encontrou IDOR
-- entre inquilinos em cinco rotas, todas por esquecer um filtro no código enquanto
-- a service key ignorava a RLS. Um filtro esquecido aqui não vaza nada.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.google_integracoes enable row level security;

drop policy if exists "dono lê"      on public.google_integracoes;
drop policy if exists "dono insere"  on public.google_integracoes;
drop policy if exists "dono atualiza" on public.google_integracoes;
drop policy if exists "dono apaga"   on public.google_integracoes;

create policy "dono lê"       on public.google_integracoes for select using (auth.uid() = user_id);
create policy "dono insere"   on public.google_integracoes for insert with check (auth.uid() = user_id);
create policy "dono atualiza" on public.google_integracoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono apaga"    on public.google_integracoes for delete using (auth.uid() = user_id);

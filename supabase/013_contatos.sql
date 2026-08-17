-- ─────────────────────────────────────────────────────────────────────────────
-- 013 · O CADERNO DE NOMES, E DE QUEM É O NÚMERO PAREADO
--
-- Duas coisas, uma decisão. O caderno é a agenda de contatos do WhatsApp do dono, lida do
-- provedor; o modo diz se aquele número é a linha do negócio ou também o celular dele.
--
-- ⚠️ POR QUE NÃO É `clientes`. Aquela tabela alimenta `v_clientes.valor`, que é a base da
-- nota fiscal e da tela de Clientes. Medido em 16/08/2026: a agenda do Bruno tem 1.840
-- entradas, 374 com telefone real. Despejar 374 pessoas que nunca marcaram nada em
-- `clientes` faria o faturamento somar zero para quase todo mundo e a tela de Clientes
-- virar a lista de contatos do celular. Cliente continua sendo quem MARCOU.
--
-- ⚠️ POR QUE O MODO TEM DEFAULT `pessoal`. Fail-safe. Errar para "negócio" faz a MAISA
-- oferecer horário para a mãe do dono — custa a confiança e não tem desfazer. Errar para
-- "pessoal" faz ela deixar de responder um contato salvo: chato, VISÍVEL (a mensagem do
-- cliente é gravada mesmo quando ela cala — ver o passo 1b de `whatsapp/agente.ts`) e
-- corrigível com um toque. O raciocínio inteiro está em `nucleo/dominio/contatos.ts`.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1 · de quem é o número ────────────────────────────────────────────────────

alter table public.integracoes_whatsapp
  add column if not exists modo text not null default 'pessoal'
    check (modo in ('negocio', 'pessoal'));

comment on column public.integracoes_whatsapp.modo is
  'negocio = a MAISA responde todo mundo. pessoal = responde desconhecido (o lead) e quem o '
  'dono marcou como cliente; cala para o resto da agenda de contatos dele. Default pessoal '
  'porque é o erro barato — ver nucleo/dominio/contatos.ts.';


-- ── 2 · o caderno ─────────────────────────────────────────────────────────────

create table if not exists public.contatos (
  tenant_id      uuid not null references public.negocios (id) on delete cascade,

  /* Os 8 ÚLTIMOS DÍGITOS, e é a chave primária junto com o inquilino.
   *
   * ⚠️ A mesma normalização de `clientes.telefone_chave` e `mensagens_agente.telefone_chave`.
   * O mesmo telefone chega escrito de três formas (com e sem DDI, com e sem o nono dígito),
   * e divergir aqui faria o caderno nunca casar com quem escreve. O `nucleo/dominio/contatos.ts`
   * tem a função (`chaveDe`) e o teste. */
  telefone_chave text not null check (telefone_chave ~ '^[0-9]{8}$'),

  /* Como o dono salvou a pessoa no celular. É isto que a MAISA usa para chamar pelo nome —
   * o maior pedaço do valor deste caderno, e ele vale nos DOIS modos. */
  nome           text,

  /* O telefone como veio, para exibir. Não é chave: `telefone_chave` é. */
  telefone       text,

  /**
   * O dono disse que esta pessoa é cliente.
   *
   * ⚠️ NULO É TERCEIRO ESTADO, não "false". `null` = ele nunca disse; `false` = ele disse que
   * NÃO é. No modo pessoal os dois calam, mas quem foi marcado explicitamente como não-cliente
   * nunca deve voltar a ser sugerido. Um boolean not null default false misturaria as duas.
   */
  cliente        boolean,

  /* De onde a linha veio. `importado` = lido da agenda do provedor; `manual` = alguém tocou
   * na tela. Serve para a reimportação não pisar no que foi decidido à mão. */
  origem         text not null default 'importado'
                   check (origem in ('importado', 'manual')),

  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  primary key (tenant_id, telefone_chave)
);

comment on table public.contatos is
  'A agenda de contatos do WhatsApp do dono. Empresta NOME em qualquer modo, e no modo pessoal '
  'diz quem NÃO atender. Não é clientes: aquela tabela é faturamento (v_clientes.valor).';

/* "Quem eu marquei como cliente" é a única varredura que a tela faz. Parcial porque o
 * interessante é a minoria: numa agenda de 374, um punhado é cliente. */
create index if not exists ix_contatos_cliente
  on public.contatos (tenant_id) where cliente is true;

drop trigger if exists tg_contatos_atualizado_em on public.contatos;
create trigger tg_contatos_atualizado_em before update on public.contatos
  for each row execute function public.toca_atualizado_em();


-- ── 3 · RLS ───────────────────────────────────────────────────────────────────
--
-- ⚠️ O AGENTE LÊ ESTA TABELA SEM SESSÃO. O webhook do WhatsApp não tem cookie, então
-- `auth.uid()` é NULL e nenhuma política de `authenticated` se aplica: quem lê ali é a
-- service role, por `clienteDoContexto(t)` (ver saida/supabase/contexto-cliente.ts). É a
-- mesma história de `integracoes_google` — e a consequência é a mesma: **o `.eq("tenant_id")`
-- do adaptador deixa de ser redundante com a RLS e passa a ser o cinto único.** Nenhuma
-- consulta a `contatos` pode perder o filtro por inquilino.

alter table public.contatos enable row level security;

drop policy if exists "membro lê contatos"      on public.contatos;
drop policy if exists "gestao escreve contatos" on public.contatos;

create policy "membro lê contatos" on public.contatos
  for select to authenticated
  using (tenant_id in (select public.negocios_do_usuario()));

/* Importar e marcar são gestão: decidir quem a MAISA atende é decisão de dono, não de
 * atendente. `for all` cobre insert e update — a importação faz upsert. */
create policy "gestao escreve contatos" on public.contatos
  for all to authenticated
  using (public.tem_papel(tenant_id, array['dono','gestor']))
  with check (public.tem_papel(tenant_id, array['dono','gestor']));

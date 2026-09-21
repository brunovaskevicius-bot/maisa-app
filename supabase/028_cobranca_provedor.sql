/* ─────────────────────────────────────────────────────────────────────────────
 * 028 — A COBRANÇA DEIXA DE SER "A STRIPE".
 *
 * A tabela `assinaturas` nasceu com o nome do fornecedor dentro dela:
 * `stripe_customer_id` e `stripe_subscription_id`. Enquanto havia um fornecedor só, era
 * apenas feio. Deixou de ser em 21/09/2026, quando a medição da conta live registrou que
 * **a Stripe não faz Pix recorrente em conta brasileira** (está escrito em
 * `src/adaptadores/saida/stripe/LEIA-ME.md`): assinatura em conta BR é cartão ou boleto.
 *
 * Num produto de R$ 127/mês vendido no Brasil isso é caro duas vezes. Na taxa — cartão
 * custa percentual, Pix custa centavos — e na conversão, porque Pix é como o país paga.
 * A AbacatePay entra por isso, e a partir dela a coluna `stripe_customer_id` guardaria um
 * `cust_…` que não é da Stripe. O nome mentiria, e nome de coluna que mente é a pior
 * espécie de documentação: ninguém o lê duas vezes.
 *
 * ── O QUE ESTE ARQUIVO FAZ ──
 *
 *   1. renomeia as duas colunas de id para vocabulário de PORTA (`provedor_*`)
 *   2. acrescenta `provedor` — qual gateway carrega esta linha
 *   3. acrescenta `metodo` — Pix ou cartão, porque a tela precisa parar de dizer
 *      "Cartão final ····" para quem pagou por Pix
 *   4. cria `cobranca_eventos`, a memória de idempotência que a AbacatePay exige
 *
 * ── ★ POR QUE O ITEM 4 EXISTE, E É O MOTIVO MAIS IMPORTANTE DAQUI ──
 *
 * O webhook da Stripe é idempotente **de graça**: `entrada/stripe/eventos.ts` ignora o
 * corpo do evento e relê a assinatura na API, então qualquer ordem de chegada converge e
 * reentrega não faz mal. Esse desenho depende de existir um `GET` por id.
 *
 * ⚠️ A ABACATEPAY NÃO TEM ESSE `GET`. Medido na documentação em 21/09/2026: existe
 * `GET /subscriptions/list`, que devolve **checkouts** de assinatura, e a referência cita
 * um `GET /subscriptions/get` que não está documentado em endpoint nenhum. Sem releitura
 * por id, o corpo do evento passa a ser a única fonte — e aí reentrega e entrega fora de
 * ordem voltam a ser problema nosso.
 *
 * A documentação deles diz o mesmo com outras palavras: "Idempotência é obrigatória.
 * Armazene o campo `id` de cada evento recebido" — até 7 tentativas ao longo de ~18h,
 * todas com o mesmo `id`. Esta tabela é esse armazém.
 *
 * Aditivo e reexecutável. Depende do 002.
 * ────────────────────────────────────────────────────────────────────────────── */


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · OS IDs PERDEM O SOBRENOME
--
-- `alter table ... rename column` não tem `if exists` para a coluna, então a troca vai
-- dentro de um bloco que confere antes. É o que torna o arquivo reexecutável: na segunda
-- passada as colunas novas já existem e nada acontece.
--
-- Os índices UNIQUE acompanham o rename sozinhos (o Postgres os reescreve), e é bom que
-- acompanhem: `provedor_cliente_id` continua UNIQUE porque é por ele que o webhook
-- descobre de quem é um pagamento. Dois inquilinos com o mesmo `cust_…` seria um
-- pagamento atribuído a quem não pagou.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'assinaturas'
       and column_name = 'stripe_customer_id'
  ) then
    alter table public.assinaturas rename column stripe_customer_id to provedor_cliente_id;
    raise notice '028: assinaturas.stripe_customer_id → provedor_cliente_id';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'assinaturas'
       and column_name = 'stripe_subscription_id'
  ) then
    alter table public.assinaturas rename column stripe_subscription_id to provedor_assinatura_id;
    raise notice '028: assinaturas.stripe_subscription_id → provedor_assinatura_id';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · QUAL GATEWAY CARREGA ESTA LINHA
--
-- `null` é o estado legítimo de quem nunca pagou nada — o inquilino nasce em `trial`
-- (`005_provisionar.sql`) e não tem provedor até o primeiro checkout. Por isso a coluna é
-- nullable e SEM default: um default 'abacatepay' afirmaria que 17 linhas de semente têm
-- conta num gateway onde elas não existem.
--
-- O `check` é lista fechada de propósito. O dia em que um terceiro gateway entrar, alguém
-- vai ter de mexer aqui — e é exatamente nesse momento que a pergunta "o que acontece com
-- quem está no antigo?" precisa ser feita. Coluna de texto livre não faz essa pergunta.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.assinaturas
  add column if not exists provedor text
    check (provedor in ('stripe', 'abacatepay'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · PIX OU CARTÃO
--
-- ⚠️ A TELA JÁ MOSTRAVA "Cartão final 4417" E NÃO TINHA COMO SABER QUE ESTAVA ERRADA.
-- `cartao_marca`/`cartao_final4` existem desde o 002 e são as duas únicas pistas de forma
-- de pagamento na tabela. Quem paga por Pix não tem nenhuma das duas, então a linha fica
-- com os dois campos nulos — indistinguível de um cartão que o provedor não informou.
--
-- Com `metodo` a tela decide o que escrever: "Pix" quando é Pix, "Cartão final 4417"
-- quando é cartão, e "—" quando ninguém pagou ainda. Três estados, três textos.
--
-- 'cartao' sem cedilha de propósito: é valor de enum lido por código TypeScript
-- (`MetodoDePagamento` em `nucleo/dominio/assinatura.ts`), e acento em literal que
-- atravessa driver, JSON e comparação de string é uma classe de bug que não paga o preço
-- da grafia correta. O rótulo com cedilha é da UI.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.assinaturas
  add column if not exists metodo text
    check (metodo in ('pix', 'cartao'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · ★ A MEMÓRIA DE EVENTOS — o que substitui a releitura na API
--
-- Uma linha por evento de webhook JÁ PROCESSADO. O webhook consulta antes de escrever e
-- sai calado se o `id` já estiver aqui.
--
-- ── por que a chave primária é o id DELES, e não um uuid nosso ──
--
-- Porque é o `id` do provedor que se repete nas reentregas (`log_abc123…`, igual nas 7
-- tentativas). Um uuid nosso geraria linha nova a cada tentativa e a tabela não
-- responderia à única pergunta que ela existe para responder. A PK ser o id externo é o
-- que faz o INSERT ser a própria trava: a segunda tentativa viola a PK, e violar a PK é
-- a resposta "já processei".
--
-- `provedor` entra na linha mas NÃO na chave: `log_…` da AbacatePay e `evt_…` da Stripe
-- não colidem, e uma PK composta permitiria a mesma reentrega passar duas vezes se o
-- provedor viesse errado num dos lados.
--
-- ── `tenant_id` é nullable, e isso é sobre pagamento de quem não é nosso ──
--
-- Conta compartilhada recebe evento de terceiro — é fato medido na conta live da Stripe
-- (`acct_1SgtGgKYvspChjeQ` tem 14 assinaturas sem inquilino atribuível). Esses eventos
-- também precisam ser marcados como vistos, senão a reentrega os traz de volta por 18h.
-- Então a linha nasce sem inquilino e o `null` significa "reconhecido, não era nosso".
--
-- ── sem RLS policy nenhuma, de propósito ──
--
-- RLS ligada e zero políticas = só `service_role` entra. É o mesmo arranjo que
-- `003_rls.sql` §3.4 usa para a escrita de `assinaturas`, e pelo mesmo motivo: quem
-- escreve aqui é webhook, nunca navegador. Não há tela que leia esta tabela.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.cobranca_eventos (
  /* O `id` do provedor. `log_…` na AbacatePay, `evt_…` na Stripe. */
  id           text primary key,

  provedor     text not null check (provedor in ('stripe', 'abacatepay')),

  /* `checkout.completed`, `subscription.renewed`… Guardado para a investigação de
   * "por que este inquilino está inadimplente?" caber numa query em vez de num chamado. */
  tipo         text not null,

  /* `null` = evento reconhecido que não era de nenhum inquilino nosso. Ver o cabeçalho.
   * Sem `references negocios(id)`: o inquilino pode ser apagado e o registro do evento
   * tem de sobreviver a isso — é histórico financeiro, não um vínculo vivo. */
  tenant_id    uuid,

  recebido_em  timestamptz not null default now()
);

alter table public.cobranca_eventos enable row level security;

/* A varredura de limpeza é por data, então o índice é por data. Sem ele, o dia em que
 * alguém for apagar os eventos de seis meses atrás vai varrer a tabela inteira. */
create index if not exists cobranca_eventos_recebido_em
  on public.cobranca_eventos (recebido_em desc);

/* De quem foram os eventos deste inquilino — a pergunta da investigação de cobrança.
 * Parcial porque a maioria esmagadora das linhas tem `tenant_id` preenchido e as nulas
 * não interessam a esta busca. */
create index if not exists cobranca_eventos_tenant
  on public.cobranca_eventos (tenant_id, recebido_em desc)
  where tenant_id is not null;

comment on table public.cobranca_eventos is
  'Eventos de webhook de cobrança já processados. Existe porque a AbacatePay não tem GET '
  'por id de assinatura: sem releitura na fonte, a idempotência tem de ser nossa. '
  'Reentrega chega com o mesmo id por até 18h. Só service_role escreve.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · CONFERÊNCIA — o arquivo diz se funcionou
--
-- Migração que roda calada exige que alguém abra o painel e confira à mão, e ninguém
-- confere. Estes `notice` são o recibo.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  faltando text[] := array[]::text[];
  col text;
begin
  foreach col in array array['provedor_cliente_id', 'provedor_assinatura_id', 'provedor', 'metodo']
  loop
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'assinaturas' and column_name = col
    ) then
      faltando := faltando || col;
    end if;
  end loop;

  if array_length(faltando, 1) > 0 then
    raise exception '028 NÃO completou: assinaturas está sem %', array_to_string(faltando, ', ');
  end if;

  raise notice '028 OK: assinaturas tem provedor_cliente_id, provedor_assinatura_id, provedor e metodo';
  raise notice '028 OK: cobranca_eventos criada com RLS ligada e nenhuma política (só service_role)';
end $$;

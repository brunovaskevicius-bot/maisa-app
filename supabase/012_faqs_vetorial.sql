-- ─────────────────────────────────────────────────────────────────────────────
-- FAQ VETORIAL — a base de conhecimento que a MAISA consulta antes de responder.
--
-- A tabela `faqs` existe desde `002_multitenant.sql` e nunca foi lida por ninguém: o
-- agente respondia dúvida com uma FIXTURE de demonstração (`composicao.ts`), igual para
-- todo inquilino. Quatro linhas reais dormiam no banco deste negócio com `usos = 0` —
-- e uma delas contradizia o horário que o dono tinha configurado pela tela.
--
-- Esta migração dá a ela o que faltava para ser consultável por SENTIDO, e não por
-- palavra exata: quem pergunta "vocês abrem sábado?" não escreve "quais os horários de
-- atendimento?", e um `ilike` não liga as duas.
--
-- ── POR QUE 768 DIMENSÕES, E NÃO AS 3072 DO PADRÃO ──
--
-- O `gemini-embedding-001` devolve 3072 por padrão. Duas medições de 15/08/2026 decidiram
-- o número:
--
--   1. `hnsw` e `ivfflat` do pgvector NÃO INDEXAM acima de 2000 dimensões. Com 3072 o
--      Postgres varre a tabela inteira a cada pergunta. Hoje, com 4 linhas, é irrelevante;
--      com 100 clientes × 50 perguntas é uma varredura de 5.000 vetores por mensagem de
--      WhatsApp — e a conta de armazenamento sai 4× maior (12 KB por linha contra 3 KB).
--   2. O modelo suporta truncagem (MRL) via `outputDimensionality`, e 768 é o corte que o
--      Google documenta como o de melhor relação custo/qualidade.
--
-- ⚠️ E A PEGADINHA QUE VEM COM ELA, TAMBÉM MEDIDA: o vetor de 3072 vem NORMALIZADO
-- (norma = 1.0000), mas os truncados NÃO (768 → 0.5882; 1536 → 0.6949). Similaridade de
-- cosseno sobre vetor não normalizado devolve número que parece resposta e não é. Quem
-- normaliza é o adaptador, em `saida/gemini/embedding.ts`, e há teste para isso. Se algum
-- dia os vetores entrarem sem normalizar, o sintoma é a MAISA respondendo a FAQ errada
-- com confiança — não é erro, é ranking silenciosamente embaralhado.
--
-- ── ISOLAMENTO ──
-- `security invoker` (o padrão) DE PROPÓSITO. Com `security definer` a função passaria por
-- cima da RLS e o `p_tenant` viraria a única proteção — a mesma decisão que deixou o
-- Smiller com busca de FAQ global por padrão (`faq_filter_by_instancia` desligada). Aqui
-- as duas proteções valem juntas: a RLS filtra quem tem sessão, e o `p_tenant` filtra o
-- agente, que fala com service role e para quem o filtro no código é a única barreira
-- (ver o cabeçalho de `saida/supabase/contexto-cliente.ts`).
-- ─────────────────────────────────────────────────────────────────────────────

/* ⚠️ `search_path` EXPLÍCITO NESTE ARQUIVO, e o motivo é o operador `<=>`.
 *
 * O Supabase instala a `vector` no schema `extensions` (projetos antigos podem tê-la em
 * `public`). O tipo `vector(768)` e o operador de distância `<=>` moram lá — e as funções
 * abaixo, se usassem o `set search_path = ''` que este repositório usa nas `security
 * definer`, criariam sem erro e QUEBRARIAM NA PRIMEIRA BUSCA, com "operator does not
 * exist". A falha viria em runtime, no meio de uma conversa de WhatsApp, e não aqui.
 *
 * Por isso elas declaram `search_path = public, extensions`: cobre as duas instalações
 * possíveis. É seguro porque os dois schemas são do projeto, e porque toda tabela continua
 * escrita qualificada (`public.faqs`) — a lista não é o que resolve os nomes, é rede de
 * segurança. O endurecimento com `''` continua valendo para as `security definer`, que é
 * onde ele importa: lá a função roda com o poder do dono. */
set search_path = public, extensions;

create extension if not exists vector with schema extensions;

-- ── 1 · a coluna ────────────────────────────────────────────────────────────
alter table public.faqs
  add column if not exists embedding vector(768);

comment on column public.faqs.embedding is
  'gemini-embedding-001 truncado em 768 e RENORMALIZADO pelo adaptador. Nulo = ainda não indexada; a busca ignora, a tela mostra como pendente.';

/* Índice de cosseno. `where embedding is not null` porque linha sem vetor nunca é
 * candidata — e sem essa cláusula o índice carregaria as pendentes de graça.
 *
 * ⚠️ hnsw e não ivfflat: o ivfflat precisa de dados existentes para treinar as listas, e
 * criar um índice ivfflat numa tabela quase vazia (é o caso agora) produz um índice ruim
 * que só melhora se alguém lembrar de recriá-lo depois. O hnsw não tem esse passo. */
create index if not exists ix_faqs_embedding
  on public.faqs using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

-- ── 2 · a busca ─────────────────────────────────────────────────────────────
/* Devolve as FAQs mais próximas do vetor da pergunta, do mais parecido para o menos.
 *
 * ⚠️ `p_min` NÃO DECIDE SE A FAQ RESPONDE A PERGUNTA, e este comentário já disse o
 * contrário. A versão anterior afirmava que o corte era o que permitia dizer "não sei". A
 * medição de 15/08/2026, contra as FAQs reais deste banco, desmentiu:
 *
 *     "aceita pix?"             → 0.705  (acerto)
 *     "vocês atendem cachorro?" → 0.725  (ruído)
 *
 * O ruído acima do acerto. Não existe corte que aceite um e recuse o outro, e não é culpa
 * da truncagem para 768: com 3072 nativo a separação continua negativa. Embedding mede
 * ASSUNTO, não resposta.
 *
 * O que `p_min` faz de fato é cortar o que não tem relação nenhuma — "qual a capital da
 * França?" pontua 0.574. Quem JULGA relevância é o modelo de conversa, com as candidatas e
 * as notas na frente (ver a ferramenta `responder_duvidas`).
 *
 * O padrão aqui é rede para quem chamar a RPC à mão; o valor que o app usa vive em
 * `dominio/faq.ts`, junto da medição — e é passado explicitamente em toda chamada.
 *
 * `1 - (a <=> b)` porque `<=>` é DISTÂNCIA de cosseno (0 = idêntico). Devolver distância
 * para quem chama convidaria a comparação invertida — e o erro seria ordenar do pior
 * para o melhor sem nada quebrar visivelmente. */
create or replace function public.buscar_faqs(
  p_tenant uuid,
  p_vetor  vector(768),
  p_k      int     default 3,
  p_min    real    default 0.65
)
returns table (id uuid, pergunta text, resposta text, similaridade real)
language sql
stable
set search_path = public, extensions
as $$
  select f.id,
         f.pergunta,
         f.resposta,
         (1 - (f.embedding <=> p_vetor))::real as similaridade
    from public.faqs f
   where f.tenant_id = p_tenant
     and f.ativo
     and f.embedding is not null
     and (1 - (f.embedding <=> p_vetor)) >= p_min
   order by f.embedding <=> p_vetor
   limit greatest(1, least(p_k, 10));
$$;

comment on function public.buscar_faqs is
  'Busca por sentido nas FAQs do inquilino. security INVOKER: a RLS vale para quem tem sessão, e o p_tenant é a barreira do agente (service role). Nunca trocar para definer.';

revoke all on function public.buscar_faqs(uuid, vector, int, real) from public, anon;
grant execute on function public.buscar_faqs(uuid, vector, int, real) to authenticated, service_role;

-- ── 3 · o contador de uso ───────────────────────────────────────────────────
/* `faqs.usos` existe desde a criação da tabela e nunca saiu de zero, porque nada lia as
 * FAQs. Ele é o que responde ao dono "qual pergunta meus clientes mais fazem" — e é a
 * entrada natural para ele decidir o que vira serviço, preço ou horário novo.
 *
 * Incrementa SÓ a primeira colocada, e não as `p_k` devolvidas: as outras foram contexto,
 * não resposta. Contar todas inflaria o número justamente das FAQs genéricas, que são as
 * que mais aparecem em qualquer busca — e o dono leria isso como "essa é a dúvida
 * principal" quando é só ruído de vizinhança. */
create or replace function public.registrar_uso_faq(p_tenant uuid, p_faq uuid)
returns void
language sql
volatile
set search_path = public, extensions
as $$
  update public.faqs
     set usos = usos + 1
   where id = p_faq and tenant_id = p_tenant;
$$;

revoke all on function public.registrar_uso_faq(uuid, uuid) from public, anon;
grant execute on function public.registrar_uso_faq(uuid, uuid) to authenticated, service_role;

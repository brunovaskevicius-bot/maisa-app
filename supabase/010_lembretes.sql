/* ═══════════════════════════════════════════════════════════════════════════════
 * 010 — LEMBRETES DE ATENDIMENTO
 *
 * O toggle "Lembrete 3h antes" existe na tela desde sempre, é gravado em
 * `assistente.lembrete`, entra no prompt do agente — e nunca mandou lembrete nenhum. As
 * três landing pages vendem a função ("os lembretes chegam sozinhos aos seus pacientes").
 * Esta migração é a metade de banco de fazê-la existir.
 *
 * ── O QUE ELA ACRESCENTA ──
 *
 *   1. `atendimentos.lembrete_em` — quando o lembrete SAIU. É a idempotência inteira.
 *   2. índice parcial para a varredura não ler a tabela toda a cada rodada.
 *   3. `reservar_lembretes()` — a claim atômica. É o coração, e o §2 explica por quê.
 *
 * Reexecutável, como todos os outros desta pasta.
 * ═══════════════════════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────────────────────
 * 1. A COLUNA
 *
 * `null` = nunca mandou. Um `boolean` bastaria para a lógica e seria pior para operar:
 * quando alguém reclamar "meu cliente recebeu duas vezes" ou "não recebeu", a pergunta é
 * QUANDO saiu, e um booleano não responde.
 * ────────────────────────────────────────────────────────────────────────────── */

alter table public.atendimentos
  add column if not exists lembrete_em timestamptz;

comment on column public.atendimentos.lembrete_em is
  'Quando o lembrete automático foi enviado. null = ainda não saiu. Ver reservar_lembretes().';


/* ───────────────────────────────────────────────────────────────────────────────
 * 2. O ÍNDICE
 *
 * PARCIAL, e é o que o torna barato: só interessam os atendimentos marcados que ainda não
 * receberam lembrete. Um atendimento fica nesse estado por horas e sai dele para sempre,
 * então o índice cobre uma fatia minúscula e permanente da tabela — enquanto um índice
 * comum em `inicio` cresceria com todo o histórico, que a varredura nunca lê.
 * ────────────────────────────────────────────────────────────────────────────── */

create index if not exists atendimentos_lembrete_pendente
  on public.atendimentos (inicio)
  where situacao = 'marcado' and lembrete_em is null;


/* ───────────────────────────────────────────────────────────────────────────────
 * 3. A RESERVA ATÔMICA
 *
 * ⚠️ ESTA FUNÇÃO É A RAZÃO DE EXISTIR DA MIGRAÇÃO. Ler e depois marcar, em duas
 * chamadas, é o bug clássico da rotina agendada: duas execuções que se sobrepõem (o tique
 * anterior demorou, um redeploy disparou outro, alguém clicou em "rodar agora") leem a
 * MESMA lista e mandam o MESMO lembrete duas vezes. Para o cliente do negócio isso é a
 * MAISA parecendo quebrada — e num produto que se vende como "some com a bagunça", é o
 * pior defeito possível.
 *
 * `update … returning` resolve num passo só: quem conseguiu escrever a linha é dono dela.
 * O `where lembrete_em is null` dentro do update é a condição da corrida, avaliada pelo
 * Postgres sob o lock da linha.
 *
 * `skip locked` completa: se outra execução já está segurando a linha, esta passa adiante
 * em vez de esperar. Rotina que espera vira rotina que estoura o tempo da função.
 *
 * ── POR QUE UM `security definer` E NÃO UM UPDATE DO ADAPTADOR ──
 *
 * A varredura é CROSS-TENANT por natureza — ela existe justamente para achar quem tem
 * lembrete a mandar, em todos os inquilinos. É a única operação do sistema assim, e
 * escondê-la atrás de uma função nomeada é melhor que espalhar um update sem
 * `tenant_id` no código: aqui ela tem nome, comentário e um só lugar para auditar.
 *
 * `search_path = ''` pela mesma razão dos outros `security definer` desta pasta: sem
 * isso, quem controla o `search_path` da sessão escolhe qual `atendimentos` a função
 * enxerga.
 * ────────────────────────────────────────────────────────────────────────────── */

create or replace function public.reservar_lembretes(
  p_ate       timestamptz,
  p_limite    int default 100
)
returns table (
  id            uuid,
  tenant_id     uuid,
  cliente_nome  text,
  cliente_tel   text,
  servico_nome  text,
  inicio        timestamptz
)
language sql
security definer
set search_path = ''
as $$
  update public.atendimentos a
     set lembrete_em = now()
   where a.id in (
     select b.id
       from public.atendimentos b
       join public.assistente s on s.tenant_id = b.tenant_id
      where b.situacao = 'marcado'
        and b.lembrete_em is null
        /* Só quem LIGOU o toggle. A checagem é aqui, e não no código, para que a linha
         * de um inquilino com lembrete desligado nunca chegue a ser reservada — se
         * fosse reservada e descartada depois, ela ficaria marcada como enviada e o
         * cliente jamais receberia lembrete se o dono ligasse o toggle amanhã. */
        and s.lembrete
        /* A janela: já está dentro do prazo, e ainda não começou. Mandar lembrete de
         * atendimento que já passou é pior que não mandar. */
        and b.inicio <= p_ate
        and b.inicio > now()
        /* Sem telefone não há para onde mandar, e reservar sem poder enviar queimaria a
         * linha em silêncio. */
        and b.cliente_tel is not null
        and b.cliente_tel <> ''
      order by b.inicio
      limit p_limite
      for update skip locked
   )
  returning a.id, a.tenant_id, a.cliente_nome, a.cliente_tel, a.servico_nome, a.inicio;
$$;

comment on function public.reservar_lembretes(timestamptz, int) is
  'Reserva e devolve os atendimentos que precisam de lembrete, marcando-os no MESMO passo. '
  'Cross-tenant de propósito — é a varredura da rotina. Ver o §3 de 010_lembretes.sql.';

/* Só o servidor. `authenticated` não chama isto: um usuário logado não tem por que
 * disparar a rotina de ninguém, muito menos ler atendimento de outro inquilino. */
revoke all on function public.reservar_lembretes(timestamptz, int) from public, anon, authenticated;


/* ───────────────────────────────────────────────────────────────────────────────
 * 4. DEVOLVER A RESERVA
 *
 * O envio falha (WhatsApp desconectado, Evolution fora do ar). Sem isto, a linha ficaria
 * marcada como enviada para sempre e o lembrete estaria perdido — o cliente não recebe e
 * ninguém fica sabendo.
 *
 * Devolver para `null` faz a próxima rodada tentar de novo. O risco assumido é o oposto,
 * e é menor: se o envio DEU certo e a devolução rodar por engano (rede caindo entre uma
 * coisa e outra), o cliente recebe dois lembretes. Preferimos duplicar a sumir.
 * ────────────────────────────────────────────────────────────────────────────── */

create or replace function public.devolver_lembrete(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.atendimentos set lembrete_em = null where id = p_id;
$$;

comment on function public.devolver_lembrete(uuid) is
  'Desfaz a reserva quando o envio falhou, para a próxima rodada tentar de novo.';

revoke all on function public.devolver_lembrete(uuid) from public, anon, authenticated;

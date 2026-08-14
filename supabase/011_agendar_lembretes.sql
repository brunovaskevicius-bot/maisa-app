/* ═══════════════════════════════════════════════════════════════════════════════
 * 011 — O AGENDADOR DOS LEMBRETES
 *
 * A `010` deu ao banco a capacidade de reservar lembretes. Esta faz alguém CHAMAR a
 * rotina. Sem ela, `POST /api/rotinas/lembretes` funciona e ninguém aperta o botão.
 *
 * ── POR QUE O POSTGRES, E NÃO A VERCEL ──
 *
 * O projeto está no plano Hobby da Vercel, onde cron roda UMA VEZ POR DIA. Um lembrete de
 * "3h antes" precisa de granularidade de minutos, então o cron nativo não serve — e a
 * alternativa de subir de plano custa US$ 20/mês para agendar uma requisição.
 *
 * `pg_cron` roda dentro do banco que já paga esse aluguel, e `pg_net` faz a chamada HTTP
 * sem bloquear a transação. O dado dos lembretes já mora aqui: o agendador ficar do lado
 * do dado é a arrumação mais simples, não um contorno.
 *
 * ⚠️ ESTE ARQUIVO É ESPECÍFICO DE AMBIENTE. Ele carrega a URL do deploy. Ao subir a MAISA
 * para outro cliente ou outro ambiente, é o único da pasta que precisa ser editado antes
 * de rodar — os outros dez são iguais em qualquer lugar.
 * ═══════════════════════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────────────────────
 * 1. AS EXTENSÕES
 *
 * As duas vêm com o Supabase e só precisam ser habilitadas. `pg_cron` cria o schema
 * `cron`; `pg_net` mora em `extensions`.
 *
 * Se estas linhas falharem por permissão, habilite pelo Dashboard em
 * Database → Extensions (procure por "pg_cron" e "pg_net") e rode o resto do arquivo.
 * ────────────────────────────────────────────────────────────────────────────── */

create extension if not exists pg_cron;
create extension if not exists pg_net;


/* ───────────────────────────────────────────────────────────────────────────────
 * 2. O SEGREDO — NO VAULT, NUNCA NESTE ARQUIVO
 *
 * ⚠️ A tentação aqui é colar o token direto no comando do cron. Não faça: este arquivo é
 * versionado, e segredo em arquivo versionado não se apaga — fica no histórico do git
 * para sempre, e a única saída passa a ser rotacionar a chave.
 *
 * O Vault do Supabase guarda cifrado e devolve por nome. Rode a linha abaixo UMA VEZ,
 * trocando o valor pelo segredo de verdade, e depois apague o valor da sua tela:
 *
 *     select vault.create_secret(
 *       'COLE-AQUI-O-SEGREDO',
 *       'maisa_rotinas_secret',
 *       'Autentica POST /api/rotinas/lembretes'
 *     );
 *
 * O segredo tem que ser o mesmo que o servidor espera — `ROTINAS_SECRET` na Vercel, ou,
 * na ausência dele, `WHATSAPP_WEBHOOK_SECRET` (a rota aceita os dois, nessa ordem).
 *
 * Preferir um `ROTINAS_SECRET` próprio: o segredo do webhook está cadastrado no servidor
 * da Evolution, que é de terceiros. Reusá-lo aqui daria a quem administra aquele servidor
 * o poder de disparar esta rotina. O estrago seria pequeno (a rotina é idempotente e só
 * manda o que já estava para sair), mas é poder que não precisa ser dado.
 *
 * Para trocar depois: `select vault.update_secret(id, 'novo') from vault.secrets where name = 'maisa_rotinas_secret';`
 * ────────────────────────────────────────────────────────────────────────────── */


/* ───────────────────────────────────────────────────────────────────────────────
 * 3. A CHAMADA
 *
 * Encapsulada numa função em vez de escrita dentro do `cron.schedule` por dois motivos:
 * o comando do cron vira uma string no catálogo (difícil de ler e de versionar), e assim
 * dá para testar o disparo à mão — `select public.disparar_lembretes();` — sem esperar o
 * próximo tique nem mexer no agendamento.
 *
 * `net.http_post` é ASSÍNCRONO: ele enfileira e devolve um id na hora. A resposta aparece
 * depois em `net._http_response`, e é lá que se olha quando o lembrete não sair:
 *
 *     select id, status_code, content, created
 *       from net._http_response
 *      order by created desc limit 20;
 *
 * Um 401 ali significa que o segredo do Vault e o do servidor divergiram.
 * ────────────────────────────────────────────────────────────────────────────── */

create or replace function public.disparar_lembretes()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segredo text;
  v_id      bigint;
begin
  select decrypted_secret into v_segredo
    from vault.decrypted_secrets
   where name = 'maisa_rotinas_secret';

  /* Falha ALTO e não silenciosamente: sem segredo, toda chamada tomaria 401 e a rotina
   * ficaria "rodando" sem mandar nada. Um erro no log do cron é achável; um 401 a cada
   * 15 minutos, ninguém procura. */
  if v_segredo is null or v_segredo = '' then
    raise exception 'segredo "maisa_rotinas_secret" não existe no Vault — ver o §2 de 011_agendar_lembretes.sql';
  end if;

  select net.http_post(
    url     := 'https://maisa-app-sooty.vercel.app/api/rotinas/lembretes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_segredo),
    body    := '{}'::jsonb,
    /* 55s: a rota declara `maxDuration = 60`. Desistir antes dela terminar deixaria
     * lembretes reservados sem resposta registrada — eles saem, mas o log daqui diz que
     * falhou, e a próxima pessoa a investigar procura um problema que não existe. */
    timeout_milliseconds := 55000
  ) into v_id;

  return v_id;
end;
$$;

comment on function public.disparar_lembretes() is
  'Chama POST /api/rotinas/lembretes com o segredo do Vault. Agendada por pg_cron a cada 15 min.';

revoke all on function public.disparar_lembretes() from public, anon, authenticated;


/* ───────────────────────────────────────────────────────────────────────────────
 * 4. O AGENDAMENTO
 *
 * ── POR QUE 15 MINUTOS ──
 *
 * A janela do lembrete é de 3 horas e a reserva é atômica, então a frequência NÃO precisa
 * ser precisa: ela decide só quanto antes, dentro dessas 3 horas, a mensagem sai. De 15
 * em 15 minutos, o lembrete chega entre 2h45 e 3h antes — variação que ninguém percebe.
 *
 * Mais frequente seria pagar invocação da Vercel para não achar nada. Menos frequente
 * (de hora em hora) também funciona, e um tique perdido é recuperado no seguinte — a
 * linha só sai da fila quando alguém consegue reservá-la.
 *
 * `cron.schedule` com nome faz upsert: rodar este arquivo de novo reagenda em vez de
 * duplicar. O `unschedule` antes existe para o caso de um nome antigo ter ficado.
 * ────────────────────────────────────────────────────────────────────────────── */

do $$
begin
  perform cron.unschedule('maisa-lembretes');
exception when others then
  null;  -- não existia; é o caso normal na primeira execução
end;
$$;

select cron.schedule(
  'maisa-lembretes',
  '*/15 * * * *',
  $$ select public.disparar_lembretes(); $$
);


/* ───────────────────────────────────────────────────────────────────────────────
 * 5. CONFERIR
 *
 *   -- está agendado?
 *   select jobid, schedule, jobname, active from cron.job where jobname = 'maisa-lembretes';
 *
 *   -- as últimas execuções do cron (não confundir com a resposta HTTP)
 *   select status, return_message, start_time
 *     from cron.job_run_details
 *    where jobid = (select jobid from cron.job where jobname = 'maisa-lembretes')
 *    order by start_time desc limit 10;
 *
 *   -- o que o servidor respondeu
 *   select status_code, content, created from net._http_response order by created desc limit 10;
 *
 *   -- disparar agora, sem esperar
 *   select public.disparar_lembretes();
 *
 * Para PAUSAR sem apagar (útil ao mexer no texto do lembrete):
 *   update cron.job set active = false where jobname = 'maisa-lembretes';
 * ────────────────────────────────────────────────────────────────────────────── */

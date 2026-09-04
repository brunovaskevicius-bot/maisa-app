/* ─────────────────────────────────────────────────────────────────────────────
 * 026 — QUANTO ANTES O LEMBRETE SAI, POR INQUILINO.
 *
 * O prazo era a constante `HORAS_ANTES = 3` em `dominio/lembretes.ts`, e três horas é um
 * número de barbearia: dá tempo de o cliente se organizar para um corte. Para uma sessão
 * de terapia é tarde demais — quem avisa três horas antes já perdeu o horário, porque
 * ninguém remarca uma consulta em cima da hora. O mesmo produto atende os dois, então o
 * prazo deixa de ser constante e vira coluna.
 *
 * ── ★ POR QUE A JANELA DESCE PARA O SQL ──
 *
 * `reservar_lembretes()` é CROSS-TENANT por natureza: uma varredura só, de 15 em 15
 * minutos, para todos os inquilinos (ver o §3 da 010). Enquanto o prazo era um número só,
 * a app calculava `agora + 3h` e mandava pronto em `p_ate`.
 *
 * Com prazo por inquilino isso deixa de funcionar: **um `p_ate` não consegue expressar N
 * janelas diferentes**. Quem tem 24h e quem tem 1h precisam ser avaliados com réguas
 * distintas na mesma passada — e só o SQL, que tem a linha do `assistente` ao lado, sabe
 * qual régua usar em cada uma.
 *
 * ⚠️ `p_ate` NÃO SOME, E MUDA DE SIGNIFICADO. Ele deixa de ser a janela e passa a ser o
 * TETO da varredura: "nem olhe atendimento depois disto". Continua útil — é ele que
 * mantém o scan preso ao índice parcial `atendimentos_lembrete_pendente` em vez de varrer
 * a agenda inteira do futuro. Quem chama passa `agora + MAX_HORAS_ANTES`, o teto do
 * `check` abaixo; o filtro que decide de verdade é o `make_interval` por linha.
 *
 * A assinatura fica intacta de propósito: mudar a porta `FilaDeLembretes` mudaria todos os
 * adaptadores dela de uma vez, e o `CLAUDE.md` manda perguntar antes. Não é preciso — o
 * parâmetro que já existe serve, com outro papel e este comentário explicando qual.
 *
 * Aditivo e reexecutável. Depende da 010.
 * ────────────────────────────────────────────────────────────────────────────── */

/* ── a coluna ──
 *
 * `smallint` porque o teto é 168 (sete dias) e não há uso para mais: lembrete de duas
 * semanas antes não é lembrete, é agenda. O piso é 1 porque o `pg_cron` da 011 roda de 15
 * em 15 minutos — prometer "30 minutos antes" seria prometer precisão que o disparador não
 * tem, e o lembrete cairia em qualquer ponto de uma faixa de 15 min.
 *
 * `default 3` mantém de pé o que já estava no ar: quem existe hoje não muda de
 * comportamento por causa desta migração. O padrão por vertical (24h para consultório) é
 * decidido na criação, em `005_provisionar.sql`. */
alter table public.assistente
  add column if not exists lembrete_horas smallint not null default 3;

do $$
begin
  alter table public.assistente
    add constraint assistente_lembrete_horas_check check (lembrete_horas between 1 and 168);
exception
  when duplicate_object then null;   -- reexecução
end $$;

comment on column public.assistente.lembrete_horas is
  'Quantas horas antes do atendimento o lembrete sai. 1..168. Ver reservar_lembretes().';

/* ── a varredura, com a régua de cada inquilino ──
 *
 * Idêntica à da 010 exceto por UMA linha — a do `make_interval`. O resto (a claim atômica
 * no mesmo `update`, o `for update skip locked`, o `s.lembrete`, a exigência de telefone)
 * está explicado no cabeçalho daquele arquivo e não se repete aqui. */
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
        and s.lembrete
        /* ★ A JANELA DE ESTE INQUILINO. É a linha que esta migração existe para trocar. */
        and b.inicio <= now() + make_interval(hours => s.lembrete_horas)
        /* O teto da varredura — ver o cabeçalho. Não é a janela; é o que segura o scan. */
        and b.inicio <= p_ate
        and b.inicio > now()
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
  'A janela é POR INQUILINO (assistente.lembrete_horas); p_ate é só o teto da varredura. '
  'Cross-tenant de propósito — ver o §3 de 010_lembretes.sql e o cabeçalho de 026.';

revoke all on function public.reservar_lembretes(timestamptz, int) from public, anon, authenticated;

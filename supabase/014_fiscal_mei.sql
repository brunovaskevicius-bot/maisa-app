-- ─────────────────────────────────────────────────────────────────────────────
-- 014 · NOTA FISCAL POR INQUILINO — e o caminho do MEI, que é o do nosso ICP
--
-- ★ ESTE ARQUIVO EXISTE PORQUE O 002 ACERTOU A TABELA E ERROU O CAMINHO.
--
-- `config_fiscal` foi criada em `002_multitenant.sql` §8 com os campos da NFS-e
-- MUNICIPAL: `inscricao_municipal`, `item_lista_servico`, `codigo_tributario_municipio`.
-- Ela nunca foi lida por ninguém — o adaptador continua em `process.env`, e por isso
-- todo inquilino emitiria sob o MESMO CNPJ (o do deploy).
--
-- Medido em 17/08/2026 na documentação da Focus NFe e no guia da NFS-e Nacional:
--
--   "empresas MEI são sempre obrigadas a emitir no ambiente da NFSe Nacional,
--    independente do município"                    — guia da Reforma Tributária
--   "Para MEI a emissão via Ambiente Nacional é obrigatória, independente do
--    município, desde setembro de 2023"            — guia dos municípios da NFSe Nacional
--
-- Nosso ICP (barbeiros, terapeutas autônomos) é quase todo MEI. Ou seja: o caminho
-- municipal, para o qual esta tabela foi desenhada, **não vale para a maioria dos
-- clientes**. E o modo de falha é traiçoeiro — a recusa não vem na resposta da emissão,
-- vem no status assíncrono da prefeitura, minutos depois.
--
-- ── O QUE MUDA NO VOCABULÁRIO ──
--
-- O DPS nacional (`POST /v2/nfsen`) pede MENOS coisa que a NFS-e municipal:
--
--   nacional  → cnpj_prestador · codigo_municipio_* · codigo_tributacao_nacional_iss
--   municipal → cnpj + inscricao_municipal + item_lista_servico + codigo_tributario
--
-- Não há `inscricao_municipal` no DPS (o guia manda até SUPRIMIR o campo quando a
-- prefeitura não cadastrou a IM no ambiente nacional), e o código de serviço é o
-- NACIONAL, de 6 dígitos, de uma tabela única — não o formato próprio de cada cidade.
--
-- ⚠️ É por isso que `fiscal_configurado()` é reescrita aqui: exigir `inscricao_municipal`
-- de um MEI faria a função dizer "falta dado" para uma empresa que está pronta.
--
-- ── ADITIVO ──
--
-- Só `add column if not exists` e `create or replace`. Dá para rodar com o app no ar:
-- todas as colunas nascem nulas e o adaptador cai no env enquanto elas estiverem assim.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · CONFIG FISCAL — o que faltava para o caminho nacional
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.config_fiscal
  /* Vem da consulta de CNPJ da Focus (`GET /v2/cnpjs/{cnpj}`), campo `optante_mei`.
   * NÃO é pergunta de tela: o dono digita o CNPJ e a Receita responde o resto. */
  add column if not exists optante_mei                 boolean not null default false,

  /* O regime como a Focus enumera em `POST /v2/empresas`:
   *   1 = Simples Nacional · 2 = excesso de sublimite · 3 = regime normal · 4 = MEI
   * Guardado como veio para o adaptador não ter que reconstruir a partir de dois
   * booleanos — e porque é ele que a Focus quer de volta num `PUT`. */
  add column if not exists regime_tributario            smallint
                                                          check (regime_tributario between 1 and 4),

  /* `codigo_tributacao_nacional_iss` do DPS. Seis dígitos: os do subitem da LC 116
   * mais dois de desdobro. Ex.: item 6.01 da LC 116 ("Barbearia, cabeleireiros,
   * manicuros, pedicuros e congêneres") → 060101.
   *
   * ⚠️ Fica em COLUNA, e não numa constante por vertical no código, porque errar aqui
   * é rejeição da Receita com a nota já enviada. Sendo dado, o valor certo entra sem
   * deploy — e a verificação é uma emissão em homologação, que não custa nada. */
  add column if not exists codigo_tributacao_nacional   text
                                                          check (codigo_tributacao_nacional ~ '^[0-9]{6}$'),

  /* O `id` que `POST /v2/empresas` devolve.
   *
   * ★ É A ÚNICA COISA QUE GUARDAMOS DA CREDENCIAL — E É DE PROPÓSITO.
   *
   * A Focus devolve `token_producao` e `token_homologacao` por empresa, e a tentação é
   * gravar os dois aqui (cifrados, como os tokens do Google). Não gravamos: o mesmo
   * `GET /v2/empresas/{id}`, autenticado com o token da CONTA, devolve os tokens da
   * empresa a qualquer momento. Guardar seria duplicar um segredo que já tem dono.
   *
   * O que isso compra:
   *   • nenhum segredo de cliente em repouso no nosso banco — nem cifrado;
   *   • nenhuma chave de criptografia nova para administrar, perder ou rotacionar;
   *   • token revogado ou trocado no painel da Focus passa a valer na emissão seguinte,
   *     sem migração e sem linha velha mentindo.
   *
   * O que custa: uma chamada HTTP a mais por emissão. Emissão já é assíncrona e rara —
   * não é caminho quente, ao contrário do `contatos.ler` do agente. */
  add column if not exists focus_empresa_id             bigint,

  /* Do certificado A1 do cliente guardamos SÓ o vencimento e o CNPJ que ele cobre —
   * o .pfx e a senha atravessam o servidor e vão embora para a Focus.
   *
   * ⚠️ Não é economia de espaço, é redução de dano. Um e-CNPJ assina contrato e abre o
   * e-CAC da empresa; guardar o arquivo é assumir uma responsabilidade que não é nossa
   * e que não precisamos ter. O vencimento fica porque sem ele a nota falha em silêncio
   * no dia em que o certificado expira, e ninguém sabe por quê. */
  add column if not exists certificado_valido_ate       date,
  add column if not exists certificado_cnpj             text;

comment on column public.config_fiscal.token_cifrado is
  'MORTO desde o 014, e nunca foi escrito (config_fiscal não era lida por ninguém). O '
  'token da empresa não mora aqui: pede-se à Focus por focus_empresa_id na hora de '
  'emitir. Segredo de cliente em repouso é risco sem contrapartida quando quem o emitiu '
  'devolve por API.';

comment on column public.config_fiscal.codigo_tributacao_nacional is
  'codigo_tributacao_nacional_iss do DPS nacional. LC 116 + 2 dígitos de desdobro '
  '(6.01 barbearia → 060101). Verificar por emissão em homologação antes de produção.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · `fiscal_configurado()` — agora sabe que MEI não tem inscrição municipal
--
-- A do 002 exigia os quatro campos municipais. Aplicada a um MEI, ela responderia
-- "falta inscrição municipal" para sempre — e a tela mandaria o dono buscar um número
-- que o caminho dele não usa.
-- ─────────────────────────────────────────────────────────────────────────────

-- ⚠️ VIRA `stable`, ERA `immutable` — porque agora ela olha o calendário. Um certificado
-- A1 vale 12 meses, e "configurado" que ignora o vencimento é o pior tipo de verdade
-- parcial: a tela oferece o botão, a assinatura falha, e a mensagem que chega da Receita
-- não diz "seu certificado venceu ontem". A view `v_negocio` continua funcionando —
-- `create or replace` aceita a troca de volatilidade.
create or replace function public.fiscal_configurado(c public.config_fiscal)
returns boolean
language sql
stable
as $$
  select
    /* A empresa existe na Focus. O token dela NÃO está aqui de propósito (ver o
     * comentário de focus_empresa_id) — pede-se na hora de emitir. */
    c.focus_empresa_id is not null
    and c.prestador_cnpj   is not null
    and c.codigo_municipio is not null

    /* O certificado é o que assina. Sem ele a empresa está cadastrada e muda,
     * e é justamente o passo que depende do cliente. */
    and c.certificado_valido_ate is not null
    and c.certificado_valido_ate >= current_date

    and (
      case
        /* Caminho nacional (MEI hoje; Simples a partir de 11/2026): o código de serviço
         * é o nacional e a inscrição municipal não entra no DPS. */
        when c.optante_mei then c.codigo_tributacao_nacional is not null

        /* Caminho municipal: o de antes, intacto. */
        else c.inscricao_municipal is not null
         and c.item_lista_servico  is not null
      end
    )
$$;

comment on function public.fiscal_configurado(public.config_fiscal) is
  'Pronto para emitir de verdade: empresa criada na Focus + certificado dentro da '
  'validade + o código de serviço do caminho certo. Bifurca por optante_mei — MEI vai '
  'pelo DPS nacional e não tem inscrição municipal.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · ATENDIMENTO ↔ NOTA — o que faz a tela de faturamento parar de mentir
--
-- ★ A RECLAMAÇÃO QUE ORIGINOU ISTO, na palavra do Bruno (14/08/2026):
--
--   "a lógica da página de faturamento está errada. ela deve ser diretamente atrelada
--    à tela de agendamentos, e deve ser totalmente calculada com base no tanto de
--    agendamentos que foram feitos desde a última emissão de notas. além disso, ela
--    deve contabilizar os casos em que uma única pessoa teve a nota emitida, e tirar
--    essa pessoa da emissão em massa."
--
-- Hoje a tela soma `v_clientes.valor` — o total histórico do cliente — e o "já emitiu"
-- vive no `localStorage` do navegador. Duas consequências medidas: trocar de navegador
-- ressuscita o botão de emitir, e a emissão em massa pode gerar documento fiscal
-- DUPLICADO para quem já tem nota.
--
-- Esta coluna é o que faltava: com ela, "falta emitir" é
-- `atendimentos where nota_id is null`, uma pergunta que o banco responde e que não
-- depende de nada guardado na máquina de quem olha.
--
-- `on delete set null` e não `cascade`: apagar uma nota (que só acontece em teste) não
-- pode levar o atendimento embora — ele é o registro de que o serviço aconteceu.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.atendimentos
  add column if not exists nota_id uuid references public.notas (id) on delete set null;

comment on column public.atendimentos.nota_id is
  'A nota que cobriu este atendimento. NULL = falta emitir, e é assim que a tela de '
  'faturamento conta — em vez do localStorage, que ressuscitava o botão em outro '
  'navegador e permitia emitir a mesma nota duas vezes.';

/* O índice que a tela de faturamento vai usar: "o que falta emitir neste inquilino".
 * Parcial, porque a pergunta é sempre sobre os que ainda não têm nota — e essa é a
 * minoria depois de alguns meses de uso. */
create index if not exists ix_atendimentos_sem_nota
  on public.atendimentos (tenant_id, inicio)
  where nota_id is null;

/* O caminho inverso: "que atendimentos esta nota cobre" (uma nota pode cobrir vários,
 * quando o dono fecha o mês de um cliente numa só). */
create index if not exists ix_atendimentos_por_nota
  on public.atendimentos (nota_id)
  where nota_id is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · CONFERÊNCIA — o que esperar no output
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  n_colunas int;
  n_mei     int;
begin
  select count(*) into n_colunas
    from information_schema.columns
   where table_schema = 'public' and table_name = 'config_fiscal'
     and column_name in ('optante_mei', 'regime_tributario', 'codigo_tributacao_nacional',
                         'focus_empresa_id', 'certificado_valido_ate', 'certificado_cnpj');

  select count(*) into n_mei
    from information_schema.columns
   where table_schema = 'public' and table_name = 'atendimentos' and column_name = 'nota_id';

  raise notice '014 · config_fiscal ganhou %/6 colunas · atendimentos.nota_id: %',
    n_colunas, case when n_mei = 1 then 'ok' else 'FALTANDO' end;

  if n_colunas <> 6 or n_mei <> 1 then
    raise exception '014 não aplicou tudo — confira os erros acima antes de seguir.';
  end if;
end $$;

/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — o livro-razão da emissão unitária, no Postgres. ⚠️ SÓ SERVIDOR.
 *
 * DDL em `supabase/020_recibo_unitario.sql` — o arquivo é a verdade, não esta prosa.
 *
 * ── ⚠️ O QUE ESTE ADAPTADOR NÃO GUARDA, E NÃO É ESQUECIMENTO ──
 *
 * Não guarda o PDF, só a URL. O arquivo é recibo de sessão de psicoterapia com CPF de paciente
 * — gente que não é nossa cliente. Assumir a guarda do binário para economizar uma chamada seria
 * virar depositário de prontuário financeiro de terceiro. A URL é temporária de propósito, e
 * `pdfDisponivel` esconde o botão quando ela vence.
 *
 * ── ⚠️ AS TRÊS ESCRITAS QUE NÃO SÃO UMA TRANSAÇÃO SÓ, E POR QUE ISSO ESTÁ OK ──
 *
 * `descartar` marca `recusado` e depois chama `soltar_recibo_unitario`. São dois round-trips, e
 * o processo pode morrer no meio — sobrando um `recusado` que ainda segura o pagamento.
 *
 * Isso é recuperável e a recuperação é trivial: `soltar` a partir de `recusado` é idempotente,
 * então qualquer chamada futura conserta. A alternativa — uma função nova no banco só para isso
 * — trocaria um estado transitório inofensivo por mais DDL. O que **não** seria aceitável é a
 * ordem inversa: soltar antes de marcar deixaria o pagamento livre com a linha ainda `pendente`,
 * e aí o lote do mês o pegaria enquanto o recibo talvez existisse.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { LivroDeRecibos, ReciboAberto } from "@/nucleo/portas/saida/livro-de-recibos";
import type {
  CanalDeEmissao, DesfechoDeRecibo, ReciboEmitido, SituacaoDoRecibo,
} from "@/nucleo/dominio/recibo-unitario";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { clienteDoContexto } from "./contexto-cliente";

const COLUNAS = "id, canal, situacao, protocolo, chave, pdf_url, pdf_expira_em, erro, criado_em, emitido_em";

const AVISO_020 =
  "O livro-razão do recibo unitário ainda não existe neste banco. Rode "
  + "`supabase/020_recibo_unitario.sql` no SQL Editor do Supabase — até lá a emissão automática "
  + "não roda, e o caminho do lote CSV continua funcionando normalmente.";

/**
 * A migração ainda não rodou?
 *
 * Mesma lista do adaptador do lote, e pelo mesmo motivo concreto: entre o deploy e o `Run` no
 * SQL Editor — que é um humano abrindo o painel — o `select` pede coluna que não existe e o
 * Postgres responde `42703`. Sem isto, a dona vê erro cru de banco no lugar de "rode a migração".
 */
function faltaMigracao(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (["42P01", "PGRST202", "42703", "PGRST204"].includes(error.code ?? "")) return true;
  return /relation .* does not exist|could not find the (function|.* column)|column .* does not exist/i
    .test(error.message ?? "");
}

function estourar(error: { code?: string; message?: string } | null): void {
  if (faltaMigracao(error)) throw new Error(AVISO_020);
  if (error) throw new Error(error.message);
}

type LinhaRazao = {
  id: string;
  canal: string | null;
  situacao: string | null;
  protocolo: string | null;
  chave: string | null;
  pdf_url: string | null;
  pdf_expira_em: string | null;
  erro: string | null;
  criado_em: string;
  emitido_em: string | null;
};

/**
 * Do vocabulário do banco para o do domínio.
 *
 * ⚠️ `canal` e `situacao` SÃO CONFERIDOS em vez de convertidos com `as`. O `check` da coluna já
 * garante o conjunto, mas ler texto do banco como união de tipos sem olhar é como `"producao"`
 * com aspas chegou na Vercel. Desconhecido cai no valor mais conservador: `pendente` (que não
 * libera a cascata) e `automacao`.
 */
const doBanco = (l: LinhaRazao): ReciboEmitido => {
  const canais: CanalDeEmissao[] = ["automacao", "rebots", "lote_csv"];
  const situacoes: SituacaoDoRecibo[] = ["pendente", "emitido", "recusado", "cancelado"];
  return {
    id: String(l.id),
    canal: canais.includes(l.canal as CanalDeEmissao) ? (l.canal as CanalDeEmissao) : "automacao",
    situacao: situacoes.includes(l.situacao as SituacaoDoRecibo)
      ? (l.situacao as SituacaoDoRecibo)
      : "pendente",
    protocolo: l.protocolo,
    chave: l.chave,
    pdfUrl: l.pdf_url,
    pdfExpiraEm: l.pdf_expira_em,
    erro: l.erro,
    criadoEm: l.criado_em,
    emitidoEm: l.emitido_em,
  };
};

export const livroDeRecibosSupabase: LivroDeRecibos = {
  async abrir(t: ContextoTenant, p): Promise<ReciboAberto | null> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase.rpc("abrir_recibo_unitario", {
      p_tenant_id: t.tenantId,
      p_fonte: p.fonte,
      p_id: p.id,
      p_canal: p.canal,
    });
    estourar(error);

    /* Zero linhas = já preso por outro canal, ou segundo clique. NÃO é erro — ver a porta. */
    const linha = Array.isArray(data) ? data[0] : data;
    if (!linha?.recibo_id) return null;

    return {
      id: String(linha.recibo_id),
      /* Somado pelo banco na mesma transação em que prendeu. Nunca vem de quem chama. */
      valor: linha.valor == null ? 0 : Number(linha.valor),
    };
  },

  async registrarProtocolo(t: ContextoTenant, p): Promise<void> {
    const supabase = clienteDoContexto(t);
    /* `is("protocolo", null)` no WHERE: gravar protocolo em cima de um já gravado significaria
     * que duas chamadas ao canal aconteceram para a mesma linha — e a segunda sobrescreveria a
     * referência da primeira, deixando um recibo órfão que nenhum callback consegue casar. */
    const { error } = await supabase
      .from("recibos_emitidos")
      .update({ protocolo: p.protocolo })
      .eq("tenant_id", t.tenantId)
      .eq("id", p.reciboId)
      .is("protocolo", null);

    estourar(error);
  },

  async fechar(t: ContextoTenant, d: DesfechoDeRecibo): Promise<ReciboEmitido | null> {
    const supabase = clienteDoContexto(t);
    /* ⚠️ `eq("situacao", "pendente")` É A IDEMPOTÊNCIA. O mesmo callback entregue duas vezes é
     * rotina em webhook, e a reconciliação pode estar perguntando a mesma coisa no mesmo
     * instante. Zero linhas = não havia o que mudar, e quem chama não dispara o que vem depois. */
    const { data, error } = await supabase
      .from("recibos_emitidos")
      .update({
        situacao: d.situacao,
        chave: d.chave,
        pdf_url: d.pdfUrl,
        pdf_expira_em: d.pdfExpiraEm,
        erro: d.erro,
        emitido_em: d.situacao === "emitido" ? new Date().toISOString() : null,
      })
      .eq("tenant_id", t.tenantId)
      .eq("protocolo", d.protocolo)
      .eq("situacao", "pendente")
      .select(COLUNAS);

    estourar(error);

    const linha = (data ?? [])[0] as LinhaRazao | undefined;
    return linha ? doBanco(linha) : null;
  },

  async descartar(t: ContextoTenant, p): Promise<void> {
    const supabase = clienteDoContexto(t);
    /* Marca primeiro. A ordem inversa deixaria o pagamento livre com a linha ainda `pendente` —
     * e aí o lote do mês o pegaria enquanto o recibo talvez existisse. Ver o cabeçalho. */
    const { error } = await supabase
      .from("recibos_emitidos")
      .update({ situacao: "recusado", erro: p.erro })
      .eq("tenant_id", t.tenantId)
      .eq("id", p.reciboId)
      .eq("situacao", "pendente");

    estourar(error);

    /* Solta em seguida. Se o processo morrer aqui, sobra um `recusado` segurando o pagamento —
     * recuperável, porque `soltar` a partir de `recusado` é idempotente. */
    const { error: erroSoltar } = await supabase.rpc("soltar_recibo_unitario", {
      p_tenant_id: t.tenantId,
      p_recibo_id: p.reciboId,
    });
    estourar(erroSoltar);
  },

  async soltar(t: ContextoTenant, reciboId): Promise<boolean> {
    const supabase = clienteDoContexto(t);
    /* Função e não `update`: soltar o pagamento e conferir a situação têm que ser a mesma
     * decisão. Um `select` seguido de `update` deixaria caber, no meio, o callback que muda a
     * linha para `emitido` — e aí soltaríamos um pagamento cujo recibo existe. */
    const { data, error } = await supabase.rpc("soltar_recibo_unitario", {
      p_tenant_id: t.tenantId,
      p_recibo_id: reciboId,
    });
    estourar(error);
    return data === true;
  },

  async porProtocolo(t: ContextoTenant, p): Promise<ReciboEmitido | null> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("recibos_emitidos")
      .select(COLUNAS)
      .eq("tenant_id", t.tenantId)
      .eq("canal", p.canal)
      .eq("protocolo", p.protocolo)
      .maybeSingle<LinhaRazao>();

    estourar(error);
    return data ? doBanco(data) : null;
  },

  async pendentes(t: ContextoTenant, p): Promise<ReciboEmitido[]> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("recibos_emitidos")
      .select(COLUNAS)
      .eq("tenant_id", t.tenantId)
      .eq("situacao", "pendente")
      .lt("criado_em", p.antesDe)
      /* Mais velhos primeiro: são os que mais precisam de resposta, e se a rodada for cortada
       * por timeout é melhor que o corte caia nos recentes. */
      .order("criado_em", { ascending: true });

    estourar(error);
    return (data ?? []).map((l) => doBanco(l as LinhaRazao));
  },

  async listar(t: ContextoTenant, p): Promise<ReciboEmitido[]> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("recibos_emitidos")
      .select(COLUNAS)
      .eq("tenant_id", t.tenantId)
      .order("criado_em", { ascending: false })
      .limit(p?.limite ?? 50);

    estourar(error);
    return (data ?? []).map((l) => doBanco(l as LinhaRazao));
  },
};

/**
 * De quem é este recibo? — o RESOLVEDOR DE INQUILINO do callback.
 *
 * ★ É A ÚNICA CONSULTA DESTE ARQUIVO SEM `.eq("tenant_id", …)`, e a exceção é a mesma de
 * `integracoes_whatsapp.instancia` no webhook do WhatsApp: **a finalidade dela é PRODUZIR o
 * inquilino**, então não pode filtrar por ele.
 *
 * A regra não negociável do `dominio/tenant.ts` continua respeitada: o `tenantId` **não vem do
 * corpo do request**. Vem daqui, de dado durável nosso. O que vem de fora é o `receipt_id`, e ele
 * é um uuid v4 que nós cunhamos — não é adivinhável, e não escolhe inquilino: se o protocolo não
 * existir, a resposta é `null` e a rota devolve 404.
 *
 * ⚠️ O `canal` FAZ PARTE DA CHAVE. Sem ele, um POST no callback da Rebots poderia fechar uma
 * linha da nossa automação, e vice-versa — os protocolos vivem na mesma coluna.
 */
export async function tenantDoProtocolo(
  p: { canal: CanalDeEmissao; protocolo: string },
): Promise<string | null> {
  const { createAdminClient, isAdminConfigured } = await import("./admin");
  if (!isAdminConfigured || !p.protocolo.trim()) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("recibos_emitidos")
    .select("tenant_id")
    .eq("canal", p.canal)
    .eq("protocolo", p.protocolo)
    .maybeSingle<{ tenant_id: string }>();

  /* Falha de banco NÃO cai para chute nenhum: devolver `null` faz a rota responder erro e o
   * canal reentregar, que é reversível. Adivinhar o inquilino escreveria no razão de outra
   * pessoa — e escreveria "recibo emitido" sobre um pagamento que não é dela. */
  if (error) return null;
  return data?.tenant_id ?? null;
}

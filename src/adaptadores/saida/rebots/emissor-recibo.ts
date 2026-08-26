/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a Rebots como canal de emissão do Receita Saúde. ⚠️ SÓ SERVIDOR.
 *
 * Contrato deles: **o OpenAPI é a fonte da verdade**, não a página comercial —
 * <https://api.rebots.com.br/static/openapi.yaml>. A doc de marketing lista cinco endpoints; o
 * OpenAPI tem nove, e descreve formatos que ela não descreve. Este arquivo foi conferido contra
 * o sandbox em 25/08/2026, chamada por chamada.
 *
 * ── ★ `receipt_id` É NOSSO, E ISSO MUDA O DESENHO PARA MELHOR ──
 *
 * O `POST /receipts` aceita `receipt_id` como campo de entrada, e o callback o devolve. Ou seja:
 * o protocolo é **a nossa chave**, conhecida antes da chamada. Consequência concreta — não
 * existe o intervalo entre "o canal aceitou" e "gravei o protocolo", que é o intervalo que
 * produz o `pendente` sem protocolo (ver `precisaDeOlhoHumano`). Para este canal, esse estado
 * simplesmente não nasce.
 *
 * ⚠️ MAS ELE É INTEIRO, e isso não estava na doc pública. Até 25/08/2026 mandávamos o `id` da
 * linha do razão, que é `uuid`, e a API respondia `RECEIPT_ERROR_024 invalid literal for int()`:
 * **nenhuma emissão passava**. Hoje o número vem do `numero` da linha, cunhado pelo banco na
 * mesma transação da claim — ver `023_recibo_numero_e_comprovante.sql`.
 *
 * ⚠️ E ELE NÃO É REPLAY. Repetir um `receipt_id` devolve **409** (`RECEIPT_ERROR_023`), não o
 * resultado da primeira chamada. É unicidade, não idempotência: serve para impedir a duplicata,
 * não para reenviar com segurança. Ver a retentativa em `cliente.ts`, que só existe para 401.
 *
 * ── ⚠️ E O QUE ELES NÃO TÊM: CONSULTA ──
 *
 * Nove endpoints, nenhum GET. **Nenhum jeito de perguntar "o que aconteceu com o protocolo X".**
 * (`/expenses/list` existe, mas lê despesa do Carnê-Leão, não recibo.) Então `consultar` devolve
 * sempre `null`, e `null` no nosso desenho significa "o canal não me disse" — a linha fica
 * `pendente` e a reconciliação tenta na próxima rodada. Correto, e inútil: ela vai tentar para
 * sempre.
 *
 * É a limitação que mais pesa a favor da automação própria: ela pode LER o e-CAC.
 *
 * ── ✅ OS DOIS FORMATOS QUE ERAM PALPITE, E DERAM CERTO ──
 *
 * `amount` e `date` estavam marcados `⚠️ FORMATO A CONFIRMAR`. Confirmados no sandbox, e as duas
 * escolhas estavam certas. As provas estão em cada função, porque "eu testei" sem o teste ao
 * lado envelhece em uma semana.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { EmissorDeReciboSaude } from "@/nucleo/portas/saida/emissor-recibo";
import type {
  DesfechoDeRecibo, EmissorCredenciado, PedidoDeRecibo, ReciboAceito,
} from "@/nucleo/dominio/recibo-unitario";
import { CODIGO_OCUPACAO } from "@/nucleo/dominio/recibo-saude";
import { DadoInvalido } from "@/nucleo/dominio/erros";
import { REBOTS } from "./config";
import { ErroRebots, chamar } from "./cliente";

/**
 * ✅ O VALOR É EM REAIS DECIMAIS. Confirmado no sandbox, e a prova não é a doc dizer "em reais":
 * é o **teto**. `99999999.99` é aceito e `100000000` devolve `RECEIPT_ERROR_016 Amount exceeds
 * maximum allowed value of 99,999,999.99`. Se o campo fosse em centavos, o teto bateria dez mil
 * vezes mais alto. Então `250.00` é R$ 250,00 — e não R$ 2,50, que era o risco.
 */
const valorParaApi = (v: number) => Number(v.toFixed(2));

/**
 * ✅ A DATA É ISO, E SÓ-DATA BASTA. O campo é `format: date-time` no OpenAPI e o exemplo deles
 * leva hora (`2026-03-15T10:00:00`), mas `2026-08-20` é aceito — testado. Fica só-data de
 * propósito: a hora de um pagamento não é dado que a gente tenha, e inventar `T00:00:00` seria
 * afirmar uma coisa a mais no documento fiscal.
 *
 * ⚠️ Data futura é recusada (`RECEIPT_ERROR_017`). Quem manda a data é o banco, então isso só
 * apareceria com relógio de servidor adiantado — e aí a mensagem deles é a certa para a tela.
 */
const dataParaApi = (iso: string) => iso.slice(0, 10);

/**
 * ⚠️ INTEIRO, OU NÃO CHAMA. `receipt_id` é `type: integer` no OpenAPI, e o que a API faz com
 * texto não numérico é `int()` em cima dele — `RECEIPT_ERROR_024`.
 *
 * Recusar aqui, antes da rede, não é preciosismo: o 400 deles chegaria como `DadoInvalido` com a
 * frase `invalid literal for int() with base 10` na tela da dona, que não quer dizer nada para
 * ela. E a chamada gasta uma ida ao canal para descobrir algo que se sabia antes de sair.
 */
function receiptIdParaApi(referencia: string): number {
  const n = Number(String(referencia).trim());
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new DadoInvalido(
      "Este canal exige um número inteiro como referência do recibo, e a linha do livro-razão "
      + "não trouxe um. Rode `supabase/023_recibo_numero_e_comprovante.sql`.",
      "referencia",
    );
  }
  return n;
}

const digitos = (v: string | null | undefined) => String(v ?? "").replace(/\D/g, "");

/**
 * O `issuer_code` do emissor no lado deles.
 *
 * Usamos o CPF: é o único identificador estável que os dois lados conhecem, e evita guardar um id
 * de fornecedor no nosso banco só para poder falar com esse fornecedor.
 */
const issuerCode = (e: EmissorCredenciado) => digitos(e.cpf);

/**
 * ⚠️ `occupation_code` É INTEIRO na API deles, e `CODIGO_OCUPACAO` é string de 3 dígitos porque o
 * CSV do Carnê-Leão é texto. A conversão mora aqui, no adaptador — o núcleo não deve saber que um
 * fornecedor prefere número.
 *
 * ✅ **A DOC DELES ESTÁ ERRADA AQUI, E A NOSSA TABELA ESTÁ CERTA.** O enum deles é
 * `[225, 226, 230, 231, 232, 255]` — exatamente os seis números do nosso `CODIGO_OCUPACAO` — mas
 * com três rótulos trocados. Conferido na tabela oficial da Receita
 * (<https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao/manual/ocupacoes>)
 * em 25/08/2026:
 *
 *   | código | Receita Federal (oficial)                   | Rebots diz    |
 *   |--------|---------------------------------------------|---------------|
 *   | 230    | Fonoaudiólogo (a partir de 2024)            | Psicólogo ❌  |
 *   | 232    | Terapeuta ocupacional (a partir de 2024)    | Fonoaudiólogo ❌ |
 *   | 255    | **Psicólogo**                               | Nutricionista ❌ |
 *
 * Nutricionista nem é 255: é 227 ("Enfermeiro de nível superior, nutricionista, farmacêutico e
 * afins"), que não está no enum deles. E o 230/231/232 nasceu do desdobramento do antigo 229,
 * pela IN de março/2024 — provavelmente foi aí que eles se perderam.
 *
 * ⚠️ **O QUE ISSO DEIXA EM ABERTO, E NÃO DÁ PARA VERIFICAR DE FORA:** o número que mandamos é o
 * certo, e o enum deles o aceita. Mas se o robô deles, em vez de repassar o inteiro, procurar o
 * RÓTULO na tabela interna errada, o recibo de uma psicóloga sai preenchido como nutricionista.
 * Isso é pergunta para o suporte deles — e é a última coisa a confirmar antes de emitir em
 * produção por este canal.
 */
const occupationCode = (e: EmissorCredenciado) => Number(CODIGO_OCUPACAO[e.ocupacao]);

/** Erro do canal traduzido para o vocabulário da tela. */
function comoDadoInvalido(e: unknown): never {
  if (e instanceof ErroRebots) {
    /* 4xx é problema do PEDIDO — dado torto, emissor não habilitado — e a frase deles é o que
     * a dona precisa ler. 5xx é problema deles, e aí a frase certa não é sobre o dado. */
    if (e.status >= 400 && e.status < 500) {
      throw new DadoInvalido(e.message, e.codigo ?? "rebots");
    }
    throw new Error(`O canal de emissão está fora do ar (${e.status}). ${e.message}`);
  }
  throw e;
}

export const emissorReciboRebots: EmissorDeReciboSaude = {
  canal: "rebots",

  /* ★ `true`: o `receipt_id` que a Rebots devolve no callback é o mesmo inteiro que mandamos — o
   * `numero` da linha do razão. Ver a porta: é isso que deixa o caso de uso gravar o protocolo
   * antes da chamada, e é obrigatório aqui porque o sandbox dispara o callback DENTRO do
   * `POST /receipts`. */
  protocoloEhNossaReferencia: true,

  async cadastrarEmissor(_t, e: EmissorCredenciado): Promise<void> {
    try {
      await chamar("/receita-saude/v2/issuers", {
        action: "enable",
        issuer_code: issuerCode(e),
        cpf: digitos(e.cpf),
        occupation_code: occupationCode(e),
        registration: (e.registroProfissional ?? "").trim(),
      });
    } catch (err) {
      comoDadoInvalido(err);
    }
  },

  async emitir(_t, e: EmissorCredenciado, p: PedidoDeRecibo): Promise<ReciboAceito> {
    /* Fora do `try`: é recusa nossa, não do canal, e `comoDadoInvalido` não deve reembalá-la. */
    const receiptId = receiptIdParaApi(p.referencia);

    try {
      await chamar("/receita-saude/v2/receipts", {
        action: "issue",
        /* ★ A NOSSA CHAVE. Ver o cabeçalho: é ela que faz o protocolo existir antes da chamada. */
        receipt_id: receiptId,
        issuer_code: issuerCode(e),
        payer: digitos(p.cpfPagador),
        /* ⚠️ OMITIDO QUANDO VAZIO, e não mandado como `""`. O campo é opcional — "beneficiário,
         * se diferente do pagador" — e string vazia num campo de CPF é pedir para um dia cair na
         * validação de CPF deles (`RECEIPT_ERROR_014`). Hoje o sandbox aceita; não é motivo para
         * mandar. */
        ...(digitos(p.cpfBeneficiario) ? { beneficiary: digitos(p.cpfBeneficiario) } : {}),
        amount: valorParaApi(p.valor),
        date: dataParaApi(p.dataPagamento),
        description: p.descricao,
        occupation_code: occupationCode(e),
        registration: (e.registroProfissional ?? "").trim(),
        /* ⚠️ NASCE `true` E SÓ VIRA `false` COM VARIÁVEL EXPLÍCITA. Ver `REBOTS.producao`. */
        test: !REBOTS.producao,
      });
    } catch (err) {
      comoDadoInvalido(err);
    }

    /* ⚠️ SEMPRE `pendente`, mesmo com 200 na mão. O 200 deles quer dizer "registrei o pedido",
     * não "emiti" — a doc é explícita: o resultado chega por callback. Ler o 200 como sucesso é
     * a tela prometer um documento que talvez não exista. */
    return { protocolo: p.referencia, situacao: "pendente", chave: null };
  },

  async consultar(): Promise<DesfechoDeRecibo | null> {
    /* ⚠️ NÃO EXISTE CONSULTA NESTA API, e devolver `null` é a resposta honesta: "o canal não me
     * disse". O nosso desenho já trata `null` como "continua pendente", que é o comportamento
     * seguro — nunca vira recusa, nunca libera a cascata.
     *
     * O efeito prático é que a reconciliação deste canal não converge: ela vai perguntar para
     * sempre e nunca receber resposta. Um `pendente` da Rebots sem callback só se resolve
     * olhando o e-CAC. Está no LEIA-ME desta pasta como dívida do FORNECEDOR, não nossa. */
    return null;
  },

  async cancelar(_t, p): Promise<void> {
    /* ⚠️ `receipt_id` É O NOSSO PROTOCOLO, NÃO A CHAVE DA RECEITA. A versão anterior mandava a
     * `chave` — o identificador que a Receita devolveu — e o canal não acha nada por ela. E
     * mandava sem `issuer_code`, o que sozinho já respondia `RECEIPT_ERROR_005 Missing field:
     * issuer_code`: nenhum cancelamento passava. Ver a porta. */
    const receiptId = receiptIdParaApi(p.protocolo);

    try {
      await chamar("/receita-saude/v2/receipts", {
        action: "cancel",
        receipt_id: receiptId,
        issuer_code: issuerCode(p.emissor),
        reason: p.motivo,
        test: !REBOTS.producao,
      });
    } catch (err) {
      comoDadoInvalido(err);
    }
  },
};

/**
 * ⚠️ QUANTO TEMPO A `file_url` VIVE. Cinco minutos, e o número não é chute: o OpenAPI diz
 * "presigned do S3 ... válida por 5 minutos" e a própria URL de exemplo carrega
 * `X-Amz-Expires=300`.
 *
 * A versão anterior assumia 48h — número que vinha da retenção do *resultado*, não do link — e
 * com isso a tela ofereceria por dois dias um botão que morreu em cinco minutos.
 */
const SEGUNDOS_DA_URL_DELES = 300;

/** O que o callback deles quer dizer, no nosso vocabulário. */
export type LeituraDoCallbackRebots =
  /** Há desfecho para gravar. */
  | { tipo: "desfecho"; desfecho: DesfechoDeRecibo }
  /**
   * ⚠️ AINDA NA FILA. `status_message: "pending"` é estado documentado do callback, e não há o
   * que gravar: a linha já está `pendente`. Existe como caso próprio porque as duas alternativas
   * são erradas — tratar como recusa liberaria a cascata (segundo recibo), e tratar como corpo
   * inválido faria a rota pedir reentrega de algo que chegou bem.
   */
  | { tipo: "pendente"; protocolo: string }
  /** Corpo que não é um callback de recibo. A rota responde 400 e ninguém reentrega. */
  | { tipo: "ilegivel" };

/**
 * Traduz o callback deles para o nosso desfecho.
 *
 * Vive aqui, e não na rota, porque é vocabulário de fornecedor: `success`, `key`, `file_url`,
 * `status_message`. A rota não deve conhecer nenhum desses nomes.
 *
 * ── ⚠️ O CORPO VEM DENTRO DE `data`, E ISSO CUSTOU CARO ──
 *
 * O `CallbackPayload` do OpenAPI tem um campo só, `data`, e é lá dentro que estão `receipt_id`,
 * `success`, `key`. Nós líamos `corpo.receipt_id` direto — que é `undefined` — então **todo
 * callback real seria respondido com 400 `sem_receipt_id`**. Com a linha travada em `pendente` e
 * sem consulta na API, cada um desses seria um recibo resolvível só olhando o e-CAC à mão.
 *
 * Aceita os dois formatos: os callbacks de DESPESA deles, por contraste, não são envelopados —
 * o OpenAPI é explícito nisso. Um fornecedor que envelopa em alguns lugares e não em outros vai
 * mudar de ideia, e desembrulhar defensivamente custa uma linha.
 */
export function lerCallbackRebots(
  corpo: any,
  agora: Date = new Date(),
): LeituraDoCallbackRebots {
  const d = corpo?.data && typeof corpo.data === "object" ? corpo.data : corpo;

  const protocolo = d?.receipt_id ? String(d.receipt_id) : "";
  if (!protocolo) return { tipo: "ilegivel" };

  const status = String(d?.status_message ?? "").toLowerCase();

  /* Antes de olhar `success`: um `pending` com `success: true` não é emissão, e um `pending` com
   * `success: false` não é recusa. Em nenhum dos dois há o que fechar. */
  if (status === "pending") return { tipo: "pendente", protocolo };

  const deuCerto = d?.success === true;

  /* ⚠️ CANCELAMENTO CHEGA COM `success: true`, e ler isso como emissão era o pior dos cinco
   * defeitos deste arquivo: a linha do razão passava de `emitido` para... `emitido`, gravando
   * como sucesso de emissão a confirmação de que o documento deixou de existir.
   *
   * Confere os dois campos porque eles dizem a mesma coisa por caminhos diferentes, e um dos
   * dois pode vir vazio numa reentrega. */
  const cancelou = deuCerto
    && (status === "cancelled" || String(d?.original_action ?? "") === "cancel");

  const situacao = cancelou ? "cancelado" : deuCerto ? "emitido" : "recusado";

  /* Só emissão tem arquivo. No cancelamento a `key` é a do recibo original — o OpenAPI diz — e
   * um PDF ali seria o documento que acabou de ser cancelado. */
  const temArquivo = situacao === "emitido" && Boolean(d?.file_url);

  return {
    tipo: "desfecho",
    desfecho: {
      protocolo,
      situacao,
      chave: deuCerto && d?.key ? String(d.key) : null,
      pdfUrl: temArquivo ? String(d.file_url) : null,
      pdfExpiraEm: temArquivo
        ? new Date(agora.getTime() + SEGUNDOS_DA_URL_DELES * 1000).toISOString()
        : null,
      /* Quem arquiva é o caso de uso, que tem a porta da guarda. O adaptador do canal só sabe
       * dizer onde o arquivo está, e por quanto tempo. */
      comprovanteCaminho: null,
      /* ⚠️ NUNCA `status_message` COMO MENSAGEM DE ERRO. O enum é `pending|issued|cancelled` —
       * escrever "issued" no campo `erro` da tela não explica nada a ninguém. O payload de recibo
       * não tem campo de erro (o de despesa tem), então quando `success` é `false` o que sabemos
       * é só isso: não emitiu. A frase diz o que fazer com essa ignorância. */
      erro: deuCerto ? null : String(
        d?.error ?? d?.error_message
        ?? "O canal não emitiu o recibo, e não disse por quê. Confira no e-CAC antes de tentar de novo.",
      ),
    },
  };
}

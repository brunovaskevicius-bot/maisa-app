/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a Rebots como canal de emissão do Receita Saúde. ⚠️ SÓ SERVIDOR.
 *
 * Contrato deles em <https://rebots.com.br/documentacao-api>. O nosso port foi desenhado com a
 * forma deles de propósito, então este adaptador é quase tradução de nomes — e é isso que faz
 * trocar de canal ser trocar de adaptador.
 *
 * ── ★ `receipt_id` É NOSSO, E ISSO MUDA O DESENHO PARA MELHOR ──
 *
 * O `POST /receipts` aceita `receipt_id` como campo de entrada, e o callback o devolve. Ou seja:
 * o protocolo é **a nossa chave**, conhecida antes da chamada. Consequência concreta — não
 * existe o intervalo entre "o canal aceitou" e "gravei o protocolo", que é o intervalo que
 * produz o `pendente` sem protocolo (ver `precisaDeOlhoHumano`). Para este canal, esse estado
 * simplesmente não nasce.
 *
 * ── ⚠️ E O QUE ELES NÃO TÊM: CONSULTA ──
 *
 * Cinco endpoints, todos POST. **Nenhum jeito de perguntar "o que aconteceu com o protocolo X".**
 * Então `consultar` devolve sempre `null`, e `null` no nosso desenho significa "o canal não me
 * disse" — a linha fica `pendente` e a reconciliação tenta na próxima rodada. Correto, e inútil:
 * ela vai tentar para sempre.
 *
 * Isso é uma limitação real do canal, não do nosso código, e vale registrada: **callback perdido
 * na Rebots é irrecuperável por API.** Pior, a doc deles diz que o dado é descartado depois do
 * nosso 200 — "will be discarded and cannot be recovered". Daí a regra da rota de callback:
 * **gravar ANTES de responder 200**, e responder erro se a gravação falhar, para eles reentregarem.
 *
 * É também o argumento mais forte a favor da nossa própria automação: ela pode LER o e-CAC.
 *
 * ── ⚠️ ALGUNS NOMES DE CAMPO SÃO INFERÊNCIA ──
 *
 * A doc pública lista os nomes de campo do `/receipts` (`payer`, `beneficiary`, `amount`, `date`,
 * `description`, `occupation_code`, `registration`, `test`) mas não dá exemplo com valores nem
 * diz o formato de `amount` e `date`. As escolhas abaixo estão marcadas com `⚠️ FORMATO A
 * CONFIRMAR` e ficam num lugar só — quando a primeira chamada real responder, o conserto é uma
 * linha. Mesmo desenho do `CAMPOS_DO_LOTE`, e pela mesma razão: o custo de errar é uma ida ao
 * fornecedor, não uma refatoração.
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
 * ⚠️ FORMATO A CONFIRMAR — o valor.
 *
 * `amount` como número decimal, porque JSON tem número e mandar `"250,00"` num campo chamado
 * `amount` seria estranho. O risco real é o oposto do que parece: se eles esperarem centavos
 * inteiros, `250` viraria **R$ 2,50** — recibo de valor errado, que é documento fiscal torto.
 * Por isso a primeira emissão de verdade sai com `test: true` e alguém confere o valor no PDF.
 */
const valorParaApi = (v: number) => Number(v.toFixed(2));

/**
 * ⚠️ FORMATO A CONFIRMAR — a data.
 *
 * ISO `YYYY-MM-DD`, que é o que uma API REST brasileira moderna quase sempre quer. O CSV do
 * Carnê-Leão usa `DD/MM/AAAA`, e é justamente por isso que a dúvida existe: eles falam com a
 * Receita, e podem ter herdado o formato dela.
 */
const dataParaApi = (iso: string) => iso.slice(0, 10);

const digitos = (v: string | null | undefined) => String(v ?? "").replace(/\D/g, "");

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

  async cadastrarEmissor(_t, e: EmissorCredenciado): Promise<void> {
    try {
      await chamar("/receita-saude/v2/issuers", {
        action: "enable",
        /* `issuer_code` é o identificador do emissor no lado deles. Usamos o CPF: é o único
         * identificador estável que os dois lados conhecem, e evita guardar um id de fornecedor
         * no nosso banco só para poder falar com esse fornecedor. */
        issuer_code: digitos(e.cpf),
        cpf: digitos(e.cpf),
        /* `occupation_code` é INTEIRO na doc deles, e `CODIGO_OCUPACAO` é string de 3 dígitos
         * porque o CSV do Carnê-Leão é texto. A conversão mora aqui, no adaptador — o núcleo não
         * deve saber que um fornecedor prefere número. */
        occupation_code: Number(CODIGO_OCUPACAO[e.ocupacao]),
        registration: (e.registroProfissional ?? "").trim(),
      });
    } catch (err) {
      comoDadoInvalido(err);
    }
  },

  async emitir(_t, e: EmissorCredenciado, p: PedidoDeRecibo): Promise<ReciboAceito> {
    try {
      await chamar("/receita-saude/v2/receipts", {
        action: "issue",
        /* ★ A NOSSA CHAVE. Ver o cabeçalho: é ela que faz o protocolo existir antes da chamada. */
        receipt_id: p.referencia,
        issuer_code: digitos(e.cpf),
        payer: digitos(p.cpfPagador),
        beneficiary: digitos(p.cpfBeneficiario),
        amount: valorParaApi(p.valor),
        date: dataParaApi(p.dataPagamento),
        description: p.descricao,
        occupation_code: Number(CODIGO_OCUPACAO[e.ocupacao]),
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
    try {
      await chamar("/receita-saude/v2/receipts", {
        action: "cancel",
        /* A doc manda `receipt_id` também no cancelamento — é a nossa chave, não a `key` da
         * Receita. Guardamos as duas na linha do razão justamente por isso. */
        receipt_id: p.chave,
        reason: p.motivo,
        test: !REBOTS.producao,
      });
    } catch (err) {
      comoDadoInvalido(err);
    }
  },
};

/**
 * Traduz o callback deles para o nosso desfecho.
 *
 * Vive aqui, e não na rota, porque é vocabulário de fornecedor: `success`, `key`, `file_url`,
 * `status_message`. A rota não deve conhecer nenhum desses nomes — ela autentica, chama isto, e
 * entrega o resultado ao caso de uso.
 *
 * ⚠️ `pdfExpiraEm` VEM DE CÁLCULO NOSSO, não deles. A doc diz que o dado é descartado em 48h;
 * não há campo de validade na resposta. Assumir 48h a partir de agora é a leitura mais segura:
 * errar para menos esconde um link que ainda funcionaria, errar para mais mostra um link morto —
 * e link morto numa tela fiscal faz a dona achar que perdeu o documento.
 */
export function desfechoDoCallbackRebots(
  corpo: any,
  agora: Date = new Date(),
): DesfechoDeRecibo | null {
  const protocolo = corpo?.receipt_id ? String(corpo.receipt_id) : "";
  if (!protocolo) return null;

  const deuCerto = corpo?.success === true;
  const expira = new Date(agora.getTime() + 48 * 60 * 60 * 1000).toISOString();

  return {
    protocolo,
    situacao: deuCerto ? "emitido" : "recusado",
    chave: deuCerto && corpo?.key ? String(corpo.key) : null,
    pdfUrl: deuCerto && corpo?.file_url ? String(corpo.file_url) : null,
    pdfExpiraEm: deuCerto && corpo?.file_url ? expira : null,
    erro: deuCerto ? null : (corpo?.status_message ? String(corpo.status_message) : "Recusado pelo canal."),
  };
}

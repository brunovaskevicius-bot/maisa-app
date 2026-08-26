/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — a emissão unitária do recibo, em memória.
 *
 * ★ ELE EXISTE PARA A CASCATA SER EXERCITÁVEL SEM CERTIFICADO, SEM CONTA E SEM CUSTO.
 *
 * A emissão real é assíncrona: a chamada volta `pendente` e o desfecho chega por callback,
 * minutos depois. É *nesse intervalo* que vive o único bug caro deste produto — cair para o
 * próximo canal e emitir o mesmo recibo duas vezes. Um adaptador que respondesse `emitido` na
 * hora esconderia exatamente o estado que precisa ser testado.
 *
 * Então este demo é **deliberadamente assíncrono**: `emitir` devolve `pendente`, e o desfecho
 * só existe depois de alguém chamar `resolver()` ou `consultar()`. Quem escreve teste controla
 * o tempo; quem clica na tela vê o mesmo `pendente` que a Rebots devolveria.
 *
 * ⚠️ MUTÁVEL, com o limite dos outros demos: vive enquanto o processo viver.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { EmissorDeReciboSaude } from "@/nucleo/portas/saida/emissor-recibo";
import type {
  DesfechoDeRecibo, EmissorCredenciado, PedidoDeRecibo, ReciboAceito,
} from "@/nucleo/dominio/recibo-unitario";
import { DadoInvalido } from "@/nucleo/dominio/erros";
import { cpfValido } from "@/nucleo/dominio/clientes";

type Registro = {
  pedido: PedidoDeRecibo;
  emissor: EmissorCredenciado;
  desfecho: DesfechoDeRecibo | null;
};

const emitidos = new Map<string, Registro>();
const credenciados = new Set<string>();
let sequencia = 0;

/**
 * ⚠️ A ÚNICA SAÍDA DO `pendente` NESTE DEMO, e é ela que faz o laboratório valer.
 *
 * Chame de um teste para simular o callback chegando. Sem isto, todo recibo do demo fica
 * pendente para sempre — que é, de propósito, o comportamento mais próximo do real: canal que
 * não responde deixa a linha pendurada, e é a reconciliação que resolve, não o tempo.
 */
export function resolverReciboDemo(
  protocolo: string,
  p: { situacao: "emitido" | "recusado" | "cancelado"; erro?: string },
): DesfechoDeRecibo {
  const reg = emitidos.get(protocolo);
  if (!reg) throw new DadoInvalido(`Protocolo ${protocolo} não existe no demo.`, "protocolo");

  const comArquivo = p.situacao === "emitido";
  reg.desfecho = {
    protocolo,
    situacao: p.situacao,
    chave: p.situacao === "recusado" ? null : `DEMO-${protocolo}`,
    /* ⚠️ VALIDADE CURTA, E O NÚMERO IMPORTA. A `file_url` da Rebots vale CINCO MINUTOS
     * (medido no sandbox em 25/08/2026) — o "48h" que estava escrito aqui era a retenção do
     * resultado, não do link. Cinco minutos é curto o bastante para que "guardar a URL" e
     * "perder o documento" sejam a mesma coisa: por isso existe a `GuardaDeComprovante`. */
    pdfUrl: comArquivo ? `https://demo.local/recibos/${protocolo}.pdf` : null,
    pdfExpiraEm: comArquivo ? "2099-12-31T00:00:00-03:00" : null,
    /* O demo não tem bucket. Quem preenche isto é o caso de uso, com a porta da guarda. */
    comprovanteCaminho: null,
    erro: p.situacao === "recusado" ? (p.erro ?? "Recusado pelo canal de demonstração.") : null,
  };
  return reg.desfecho;
}

/** Zera o estado. Só para teste — cada arquivo começa do zero sem herdar o anterior. */
export function limparEmissorDemo(): void {
  emitidos.clear();
  credenciados.clear();
  sequencia = 0;
}

export const emissorReciboDemo: EmissorDeReciboSaude = {
  /* Ele se apresenta como `automacao` porque é o lugar dela na cascata: o demo é o canal que
   * roda quando não há credencial, que é exatamente a posição da nossa automação hoje. */
  canal: "automacao",

  /* O demo devolve um protocolo próprio (ver `emitir`), então não há o que gravar antes. Mantém o
   * outro caminho do caso de uso coberto pela demo. */
  protocoloEhNossaReferencia: false,

  async cadastrarEmissor(_t, e: EmissorCredenciado): Promise<void> {
    /* Idempotente por contrato — o `Set` é a prova de que chamar duas vezes não cria dois. */
    credenciados.add(e.cpf);
  },

  async emitir(_t, e: EmissorCredenciado, p: PedidoDeRecibo): Promise<ReciboAceito> {
    /* ⚠️ RECUSA O PEDIDO, não o recibo. O canal real distingue as duas coisas: dado torto volta
     * na hora, recusa da Receita volta no callback. Um demo que aceitasse tudo faria a tela
     * parecer mais confiável do que é. */
    if (!credenciados.has(e.cpf)) {
      throw new DadoInvalido(
        "Este CPF não está habilitado no canal. Rode o cadastro do emissor antes de emitir.",
        "emissor",
      );
    }
    if (!cpfValido(p.cpfBeneficiario)) {
      throw new DadoInvalido("CPF do beneficiário não é válido.", "cpfBeneficiario");
    }
    if (!cpfValido(p.cpfPagador)) {
      throw new DadoInvalido("CPF do pagador não é válido.", "cpfPagador");
    }
    if (!(p.valor > 0)) throw new DadoInvalido("O valor precisa ser maior que zero.", "valor");

    const protocolo = `demo-prot-${++sequencia}`;
    emitidos.set(protocolo, { pedido: p, emissor: e, desfecho: null });

    /* ★ SEMPRE `pendente`. É o ponto do adaptador. */
    return { protocolo, situacao: "pendente", chave: null };
  },

  async consultar(_t, protocolo): Promise<DesfechoDeRecibo | null> {
    const reg = emitidos.get(protocolo);
    /* ⚠️ `null` = o canal nunca viu este protocolo, e essa resposta é ÚTIL: significa que o
     * pedido não chegou, e aí tentar de novo é seguro. Devolver um desfecho falso aqui é o que
     * transformaria a reconciliação em geradora de duplicata. */
    if (!reg) return null;
    return reg.desfecho;
  },

  async cancelar(_t, p): Promise<void> {
    /* ⚠️ ACHA PELO PROTOCOLO, e antes achava pela `chave`. A porta mudou porque a Rebots cancela
     * pelo `receipt_id` — o número que nós cunhamos — e não pela chave que a Receita devolveu. */
    const reg = emitidos.get(p.protocolo);
    if (!reg?.desfecho) {
      throw new DadoInvalido(`Recibo ${p.protocolo} não existe no demo.`, "protocolo");
    }
    /* ⚠️ `cancelado`, NÃO `recusado`, e a diferença aqui é a mesma do domínio: `recusado` é o
     * único estado do qual a cascata pode tentar outro canal (ver `podeTentarOutroCanal`).
     * Marcar um cancelamento como recusa devolveria o pagamento para a lista e emitiria o
     * segundo recibo — em cima de um documento que existiu e foi cancelado de propósito. */
    reg.desfecho = { ...reg.desfecho, situacao: "cancelado", erro: `Cancelado: ${p.motivo}` };
  },
};

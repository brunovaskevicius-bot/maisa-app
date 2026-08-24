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
  p: { situacao: "emitido" | "recusado"; erro?: string },
): DesfechoDeRecibo {
  const reg = emitidos.get(protocolo);
  if (!reg) throw new DadoInvalido(`Protocolo ${protocolo} não existe no demo.`, "protocolo");

  reg.desfecho = {
    protocolo,
    situacao: p.situacao,
    chave: p.situacao === "emitido" ? `DEMO-${protocolo}` : null,
    /* Validade curta de propósito: a Rebots descarta em 48h, e a tela tem que saber esconder o
     * botão quando vence. Ver `pdfDisponivel`. */
    pdfUrl: p.situacao === "emitido" ? `https://demo.local/recibos/${protocolo}.pdf` : null,
    pdfExpiraEm: p.situacao === "emitido" ? "2099-12-31T00:00:00-03:00" : null,
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
    const alvo = [...emitidos.values()].find((r) => r.desfecho?.chave === p.chave);
    if (!alvo?.desfecho) throw new DadoInvalido(`Recibo ${p.chave} não existe no demo.`, "chave");
    alvo.desfecho = { ...alvo.desfecho, situacao: "recusado", erro: `Cancelado: ${p.motivo}` };
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — provisionamento de canal na Evolution API.
 *
 * Traduz três verbos do produto (consultar, conectar, desconectar) na sequência de
 * chamadas que a Evolution exige, e o vocabulário dela (`open`/`connecting`/`close`) no
 * do domínio (`conectado`/`pareando`/`desconectado`).
 *
 * ── A SEQUÊNCIA DE `conectar`, E POR QUE ELA APAGA ANTES DE CRIAR ──
 *
 * A Evolution só emite QR novo para instância recém-criada. Uma instância em `connecting`
 * tem um QR que já foi mostrado e provavelmente expirou; uma em `close` perdeu a sessão.
 * Nos dois casos, pedir o QR de novo devolve o velho, e o cliente aponta a câmera para um
 * código morto — o pior sintoma possível, porque parece que O CLIENTE errou.
 *
 * Então: `open` devolve conectado e não toca em nada. Qualquer outro estado é apagado e
 * recriado. É destrutivo de propósito, e é seguro porque só destrói pareamento que já
 * não estava funcionando.
 *
 * ⚠️ A ESPERA ENTRE APAGAR E CRIAR não é superstição. A Evolution devolve 200 no DELETE
 * antes de terminar de liberar o nome, e criar imediatamente falha com "instância já
 * existe" de forma intermitente — o tipo de bug que só aparece em produção e some quando
 * alguém vai investigar.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { EstadoDoCanal, Pareamento } from "@/nucleo/dominio/canal";
import type { ProvisionamentoDeCanal } from "@/nucleo/portas/saida/provisionamento-canal";
import { numeroDeJid, statusDeEstadoEvolution } from "@/nucleo/dominio/canal";
import { apagarInstancia, criarInstancia, instanciaPorNome } from "./cliente";
import { evolutionFaltando } from "./config";

/** Espera entre o DELETE e o CREATE. Ver o ⚠️ do cabeçalho. */
const ESPERA_RECRIAR_MS = 3000;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const provisionamentoEvolution: ProvisionamentoDeCanal = {
  faltando() {
    /* Reusa a lista da config, MENOS `EVOLUTION_INSTANCIA`: esta porta recebe o nome da
     * instância por argumento, então a env global não é requisito dela. Ela continua
     * sendo requisito do ENVIO (v1 monoinquilino), e é por isso que a lista original
     * ainda a inclui — a diferença entre as duas listas é a dívida, escrita. */
    return evolutionFaltando().filter((v) => !v.startsWith("EVOLUTION_INSTANCIA"));
  },

  async estado(instancia: string): Promise<EstadoDoCanal> {
    const { estado, ownerJid } = await instanciaPorNome(instancia);
    /* Devolve o número SEMPRE que o provedor souber dele, inclusive com a sessão caída —
     * o `ownerJid` sobrevive ao `close` e diz qual número era. Quem decide não exibi-lo
     * ao lado de "desconectado" é a tela; o adaptador só relata o que o provedor sabe.
     *
     * Instância recém-criada não tem dono, então "trocar número" zera isto sozinho: o
     * número antigo sai no mesmo instante em que deixa de ser verdade. */
    return { status: statusDeEstadoEvolution(estado), numero: numeroDeJid(ownerJid) };
  },

  async conectar(p): Promise<Pareamento> {
    const atual = statusDeEstadoEvolution((await instanciaPorNome(p.instancia)).estado);

    /* Já pareado: NÃO recria. Recriar aqui seria derrubar o WhatsApp de um cliente que
     * está atendendo, porque ele clicou num botão que dizia "conectar". */
    if (atual === "conectado") {
      return { qrcode: null, status: "conectado", instancia: p.instancia };
    }

    await apagarInstancia(p.instancia);
    await dormir(ESPERA_RECRIAR_MS);

    const qrcode = await criarInstancia({
      instancia: p.instancia,
      urlWebhook: p.urlWebhook,
      segredo: p.segredo,
    });

    /* Sem QR e sem erro é um caso real: a Evolution às vezes cria a instância e devolve o
     * corpo sem o código. Reportar `pareando` sem `qrcode` deixa a tela dizer "gerando,
     * tente de novo" — melhor que um erro que sugere que a conexão falhou, porque a
     * instância existe e o próximo clique resolve. */
    return { qrcode, status: "pareando", instancia: p.instancia };
  },

  async desconectar(instancia: string): Promise<void> {
    await apagarInstancia(instancia);
  },
};

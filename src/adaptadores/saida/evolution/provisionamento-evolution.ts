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
 * Vale igual para o CÓDIGO de pareamento (o "Conectar com número de telefone" do
 * WhatsApp, pedido quando `conectar` recebe `numero`): ele também nasce da sessão nova do
 * Baileys e também vence. Um código velho é pior que um QR velho — o dono digita oito
 * caracteres à mão para o WhatsApp dizer que estão errados.
 *
 * ⚠️ A ESPERA ENTRE APAGAR E CRIAR não é superstição. A Evolution devolve 200 no DELETE
 * antes de terminar de liberar o nome, e criar imediatamente falha com "instância já
 * existe" de forma intermitente — o tipo de bug que só aparece em produção e some quando
 * alguém vai investigar.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { EstadoDoCanal, Pareamento } from "@/nucleo/dominio/canal";
import type { ProvisionamentoDeCanal } from "@/nucleo/portas/saida/provisionamento-canal";
import { numeroDeJid, statusDeEstadoEvolution } from "@/nucleo/dominio/canal";
import { apagarInstancia, criarInstancia, instanciaPorNome, pedirCodigoDePareamento } from "./cliente";
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
      return { qrcode: null, codigo: null, status: "conectado", instancia: p.instancia };
    }

    await apagarInstancia(p.instancia);
    await dormir(ESPERA_RECRIAR_MS);

    const emitido = await criarInstancia({
      instancia: p.instancia,
      urlWebhook: p.urlWebhook,
      segredo: p.segredo,
      numero: p.numero,
    });

    /* Pediram código e a criação não trouxe: tenta o endpoint dedicado antes de desistir.
     * Ver `pedirCodigoDePareamento` para por que são dois caminhos e não um.
     *
     * ⚠️ SÓ ENTRA AQUI COM `numero`. Sem ele não há código a pedir, e chamar
     * `/instance/connect` assim mesmo custaria uma ida à rede em TODO pareamento por QR —
     * dentro de uma função que já gasta 3s dormindo e roda com `maxDuration` contado. */
    const codigo =
      p.numero && !emitido.codigo
        ? await pedirCodigoDePareamento(p.instancia, p.numero)
        : emitido.codigo;

    /* Sem QR e sem código, e sem erro, é um caso real: a Evolution às vezes cria a
     * instância e devolve o corpo sem nada. Reportar `pareando` vazio deixa a tela dizer
     * "gerando, tente de novo" — melhor que um erro que sugere que a conexão falhou,
     * porque a instância existe e o próximo clique resolve.
     *
     * O QR volta MESMO quando o código veio, e é de propósito: é o que permite à tela
     * oferecer "prefiro ler o QR" sem uma segunda chamada, e é a rede de segurança para o
     * pairing code que falha depois de emitido — o WhatsApp recusa o código em algumas
     * versões, e nesse ponto o dono já está com a tela aberta esperando. */
    return { qrcode: emitido.qrcode, codigo, status: "pareando", instancia: p.instancia };
  },

  async renovarCodigo(p): Promise<string | null> {
    /* Sem apagar, sem esperar 3s, sem recriar: a instância segue em `connecting` e o
     * Baileys emite outro código na mesma sessão. Ver o porquê na porta. */
    return pedirCodigoDePareamento(p.instancia, p.numero);
  },

  async desconectar(instancia: string): Promise<void> {
    await apagarInstancia(instancia);
  },
};

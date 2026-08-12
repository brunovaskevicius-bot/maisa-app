/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — as conversas de WhatsApp, do lado do PAINEL.
 *
 * O agente já falava com a thread (`RepositorioHistorico`) direto, porque para ele a
 * conversa é uma coisa só: o telefone que acabou de escrever. O painel pergunta outra coisa
 * — "quem falou comigo hoje, e com quem está a bola?" — e é essa pergunta que mora aqui.
 *
 * ⚠️ ESTES CASOS DE USO SÃO A METADE QUE FALTAVA DA MESMA CONVERSA. Não existe "conversa do
 * painel" e "conversa do agente": é a mesma linha em `mensagens_agente`. Quando o dono
 * responde à mão, a fala dele entra na MESMA thread que o modelo replaya na próxima mensagem
 * — sem isso a MAISA contradiria o próprio dono ao retomar, que era a dívida declarada no
 * LEIA-ME do adaptador ("`voce` nunca é gravado").
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  ListarConversas, LerConversa, ResponderConversa, MudarPosseConversa,
} from "../portas/entrada/casos-de-uso";
import type {
  ConversaGravada, RepositorioConversas, RepositorioHistorico,
} from "../portas/saida/memoria-cliente";
import type { CanalDeMensagens } from "../portas/saida/canal-mensagens";
import type { Conversa } from "../dominio/conversas";
import { estadoDaConversa } from "../dominio/conversas";
import { soDigitos, telefoneBonito } from "../dominio/clientes";
import { DadoInvalido, NaoEncontrado } from "../dominio/erros";

export type Dependencias = {
  historico: RepositorioHistorico;
  conversas: RepositorioConversas;
  canal: CanalDeMensagens;
};

/**
 * Quantas conversas a lista carrega. 200 é o que uma tela de inbox tem como mostrar sem
 * paginação, e um negócio que passe disso num dia tem um problema melhor que este.
 */
const MAX_CONVERSAS = 200;

/**
 * Quantas mensagens a tela carrega ao abrir uma conversa.
 *
 * Bem mais que as 20 do agente, e a diferença não é descuido: ele paga TOKEN por mensagem
 * replayada a cada turno, a tela paga bytes uma vez. Quem abre uma conversa quer rolar para
 * cima e ver o que foi combinado — 20 mensagens não chegam ao começo de nenhum atendimento
 * discutido de verdade.
 */
const MAX_MENSAGENS = 300;

/** Teto do que o dono digita. O mesmo do banco (`mensagens_agente.texto`), recusado ANTES
 *  de mandar para o WhatsApp — errar essa ordem é entregar a mensagem e falhar ao gravá-la. */
const MAX_TEXTO = 4000;

/** `ConversaGravada` (banco) → `Conversa` (domínio). O estado é derivado aqui, num lugar só. */
function paraConversa(g: ConversaGravada): Conversa {
  return {
    id: g.telefoneChave,
    clienteId: g.clienteId,
    // A ordem é a da confiança: nome que a pessoa deu, nome do cadastro (o adaptador já
    // resolveu os dois), e por fim o número — nunca um rótulo inventado.
    nome: g.nome?.trim() || telefoneBonito(g.telefone || g.telefoneChave),
    telefone: g.telefone,
    atualizadaEm: g.atualizadaEm,
    ultima: g.ultima,
    estado: estadoDaConversa({
      ultimoAutor: g.ultima?.de,
      atualizadaEm: g.atualizadaEm,
      posse: g.posse,
    }),
  };
}

/** Um telefone com menos de 8 dígitos não identifica conversa nenhuma. Mesma guarda de
 *  `criarLembrarCliente` — e ela existe aqui de novo porque quem chama é outro adaptador. */
function exigirChave(telefone: string): string {
  const d = soDigitos(telefone);
  if (d.length < 8) throw new DadoInvalido("Telefone inválido.", "telefone");
  return d;
}

export function criarListarConversas({ historico }: Dependencias): ListarConversas {
  return async (t) => {
    const gravadas = await historico.conversas(t, MAX_CONVERSAS);
    return gravadas.map(paraConversa);
  };
}

export function criarLerConversa({ historico }: Dependencias): LerConversa {
  return async (t, telefone) => {
    const chave = exigirChave(telefone);

    /* As duas em paralelo: são tabelas diferentes e nenhuma depende da outra. Em série a
     * tela esperaria dois round-trips para desenhar uma coisa só. */
    const [gravada, msgs] = await Promise.all([
      historico.conversa(t, chave),
      historico.ler(t, chave, MAX_MENSAGENS),
    ]);

    /* `NaoEncontrado` e não uma conversa vazia: id de conversa que não existe é pedido
     * malformado, não thread sem mensagem. Devolver `{ msgs: [] }` faria a tela desenhar
     * uma conversa fantasma com nome de telefone — e ninguém descobriria o erro. */
    if (!gravada) throw new NaoEncontrado("conversa");

    return { conversa: paraConversa(gravada), msgs };
  };
}

/**
 * RESPONDER À MÃO — o dono escrevendo pelo painel.
 *
 * A ordem das três coisas que acontecem aqui é a decisão do arquivo:
 *
 *   1. ASSUMIR, se ainda não. Não é conveniência de UI: responder sem assumir deixaria a
 *      MAISA solta na mesma conversa, e a próxima mensagem do cliente receberia duas
 *      respostas. Escrever à mão É assumir — o gesto declara a intenção.
 *   2. ENVIAR. Antes de gravar, e essa ordem importa: se a Evolution recusar, nada foi
 *      gravado e a tela mostra a verdade ("não saiu"). Gravando primeiro, uma falha de envio
 *      deixaria no painel uma mensagem que o cliente nunca recebeu — e o dono seguiria a
 *      conversa achando que já respondeu. Mensagem entregue e não gravada é ruído; mensagem
 *      gravada e não entregue é uma mentira que ninguém detecta.
 *   3. GRAVAR na thread, com autor `voce`. É o que faz o modelo saber, no próximo turno, o
 *      que o dono já disse.
 */
export function criarResponderConversa({ historico, conversas, canal }: Dependencias): ResponderConversa {
  return async (t, p) => {
    const chave = exigirChave(p.telefone);

    const texto = p.texto.trim();
    if (!texto) throw new DadoInvalido("Mensagem vazia.", "texto");
    if (texto.length > MAX_TEXTO) throw new DadoInvalido(`Mensagem acima de ${MAX_TEXTO} caracteres.`, "texto");

    /* Para onde vai é decidido AQUI, pela thread — nunca pelo que o navegador mandou. Ver
     * `RepositorioHistorico.conversa`: é o que garante que o painel só responde a quem
     * escreveu, em vez de virar um jeito de mandar WhatsApp para qualquer número. */
    const gravada = await historico.conversa(t, chave);
    if (!gravada) throw new NaoEncontrado("conversa");

    /* Thread antiga, gravada antes de o número completo ser guardado. Recusa explícita em
     * vez de tentar: com 8 dígitos a Evolution aceitaria o pedido e a mensagem não chegaria
     * em ninguém — a falha mais chata desta integração é justamente a que "dá certo". */
    if (!gravada.telefone) {
      throw new DadoInvalido(
        "Esta conversa é anterior ao registro do número completo — responda pelo WhatsApp.",
        "telefone",
      );
    }

    if (!gravada.posse.assumidaEm) await conversas.marcar(t, chave, { assumida: true });

    await canal.enviar(t, gravada.telefone, [texto]);

    const msg = { de: "voce" as const, txt: texto };
    await historico.anexar(t, gravada.telefone, [msg]);

    return msg;
  };
}

/**
 * ASSUMIR / DEVOLVER / RESOLVER / REABRIR.
 *
 * Um caso de uso para os quatro porque são a mesma escrita — duas datas numa linha. Quatro
 * casos de uso seriam quatro rotas e quatro nomes para `update conversas_estado`.
 *
 * ⚠️ Devolver NÃO resolve, e resolver NÃO devolve. Eram o mesmo gesto no `localStorage` (o
 * store marcava `assumidas` e `resolvidos` juntos), e a consequência era ruim das duas
 * formas: devolver à MAISA sumia a conversa da fila mesmo com o cliente esperando resposta,
 * e marcar como resolvida largava a MAISA calada para sempre naquela conversa.
 */
export function criarMudarPosseConversa({ conversas }: Dependencias): MudarPosseConversa {
  return async (t, p) => {
    const chave = exigirChave(p.telefone);
    if (p.assumida === undefined && p.resolvida === undefined) {
      throw new DadoInvalido("Nada a mudar nesta conversa.", "acao");
    }
    await conversas.marcar(t, chave, { assumida: p.assumida, resolvida: p.resolvida });
  };
}

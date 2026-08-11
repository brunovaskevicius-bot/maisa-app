/* ─────────────────────────────────────────────────────────────────────────────
 * O AGENTE — o loop de conversa.
 *
 * Irmão do `entrada/http/`: a diferença é só quem começa. Lá é o navegador do Bruno,
 * aqui é uma mensagem do cliente. E como o `LEIA-ME.md` desta pasta prometeu, ele NÃO
 * faz `fetch("/api/google/evento")` — chama o caso de uso direto, no mesmo processo.
 *
 * ⚠️ NENHUM NOME DE PROVEDOR APARECE NESTE ARQUIVO. Ele fala `ModeloDeConversa`
 * (`portas/saida/modelo-conversa.ts`). Antes importava o SDK da Anthropic e falava
 * `tool_use`, `stop_reason`, `TextBlock` — e trocar para Gemini era reescrever o loop.
 * Como a chave de teste do Gemini vai ser revogada na ida para produção, "trocar de
 * provedor" não é hipótese: é o plano. Agora é uma linha em `composicao.ts`.
 *
 * ⚠️ O HISTÓRICO É SÓ TEXTO, e essa é a decisão de projeto mais consequente daqui.
 *
 * A cada mensagem recebida, o loop de ferramentas COMEÇA DE NOVO: replayamos as falas
 * (cliente e MAISA) e descartamos as chamadas de ferramenta dos turnos passados. Parece
 * desperdício e é o contrário:
 *
 *   • CORREÇÃO — resultado de ferramenta sobre agenda azeda em segundos. Um resultado
 *     de "quinta 15h está livre" replayado dez minutos depois faz o modelo reafirmar com
 *     convicção um horário que já foi tomado. Recontar é o que garante que a MAISA nunca
 *     fale de uma agenda velha.
 *   • FRONTEIRA — a porta `RepositorioHistorico` fala `Msg`, o tipo que a tela de
 *     Conversas já usa. Se ela guardasse blocos do provedor, trocar de modelo viraria
 *     migração de banco.
 *
 * O custo real é baixo: o histórico textual é curto, e o prefixo estável do prompt
 * (persona + catálogo) vai para o cache.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { LembrarCliente } from "@/nucleo/portas/entrada/casos-de-uso";
import type { RepositorioHistorico } from "@/nucleo/portas/saida/memoria-cliente";
import type { CanalDeMensagens } from "@/nucleo/portas/saida/canal-mensagens";
import type {
  ModeloDeConversa, ResultadoDeFerramenta, TurnoDeConversa,
} from "@/nucleo/portas/saida/modelo-conversa";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { Msg } from "@/nucleo/dominio/conversas";
import { hojeISO } from "@/nucleo/dominio/tempo";

import { bolhas, limparEntrada } from "./bolhas";
import { criarExecutor, FERRAMENTAS, novoEstado, type Dependencias as DepsFerramentas } from "./ferramentas";
import { parteDoCliente, parteEstavel, type ConfiguracaoDoAgente } from "./persona";

/** Voltas de ferramenta antes de desistir. Seis cobre o caminho mais longo real
 *  (oferecer → marcar) com folga; acima disso o modelo está girando, e girar custa
 *  dinheiro e silêncio para o cliente. */
const MAX_VOLTAS = 6;

/** Quantas mensagens de histórico replayar. 20 cobre a conversa de agendamento
 *  inteira; mais que isso é pagar token para lembrar de assunto encerrado. */
const HISTORICO = 20;

/**
 * Teto de saída por volta.
 *
 * Generoso para o que a MAISA fala (três bolhas de 320 caracteres cabem em ~250 tokens)
 * porque o pensamento sai do MESMO orçamento nos modelos atuais. Apertar isto não
 * economiza: faz o orçamento acabar dentro do raciocínio e a resposta voltar vazia, o
 * que o loop lê como "o modelo não teve nada a dizer" e escala para humano sem motivo.
 */
const MAX_TOKENS = 2000;

export type MensagemRecebida = { de: string; texto: string };

/** Um passo de ferramenta, para inspeção. Alimenta o laboratório de conversa: ver que a
 *  MAISA chamou `oferecer_horarios` ANTES de falar de agenda é a única forma de saber
 *  que o guardrail está de pé — no texto da resposta, os dois casos parecem iguais. */
export type PassoDaTrilha = {
  ferramenta: string;
  entrada: Record<string, unknown>;
  resultado: string;
  erro: boolean;
};

export type RespostaDoAgente = {
  bolhas: string[];
  escalou: boolean;
  motivo?: string;
  /** Sempre preenchida — é barata. Produção ignora; o laboratório desenha. */
  trilha: PassoDaTrilha[];
  /** Quem respondeu. Aparece na trilha para não haver dúvida de qual provedor rodou. */
  modelo: string;
  voltas: number;
};

export type Dependencias = Omit<DepsFerramentas, "config"> & {
  modelo: ModeloDeConversa;
  config: ConfiguracaoDoAgente;
  lembrarCliente: LembrarCliente;
  historico: RepositorioHistorico;
  canal: CanalDeMensagens;
};

/** `Msg` do domínio → turnos da porta. "voce" (o dono assumiu) entra como assistente:
 *  para o cliente foi a mesma voz, e fingir que aquilo não foi dito faria a MAISA
 *  contradizer o próprio dono. */
const paraTurnos = (msgs: Msg[]): TurnoDeConversa[] =>
  msgs.map((m) =>
    m.de === "cliente"
      ? { papel: "cliente", texto: m.txt }
      : { papel: "assistente", texto: m.txt },
  );

export function criarAgente(deps: Dependencias) {
  const executar = criarExecutor(deps);

  /* Montado UMA VEZ, na criação. Não é micro-otimização: é o que garante que a string
   * seja byte-a-byte idêntica entre requisições, que é a condição para o cache de
   * prompt pegar. Remontar por mensagem com o mesmo dado geraria a mesma string na
   * prática — e uma vírgula a mais em qualquer refatoração futura mataria o cache em
   * silêncio, sem nenhum sintoma além da fatura. */
  const sistemaEstavel = parteEstavel(deps.config);

  return async function responder(t: ContextoTenant, recebida: MensagemRecebida): Promise<RespostaDoAgente> {
    const vazia = (extra: Partial<RespostaDoAgente> = {}): RespostaDoAgente => ({
      bolhas: [], escalou: false, trilha: [], modelo: deps.modelo.nome, voltas: 0, ...extra,
    });

    /* ── 0. a MAISA está ligada? ──
     * Guardrail de produto, e o primeiro de todos: o dono pode desligar a assistente na
     * tela "A MAISA". Desligada significa desligada — nem uma mensagem de "estou fora do
     * ar", que já seria a MAISA falando com o cliente dele. */
    if (!deps.config.assistente.ativa) {
      return vazia({ escalou: true, motivo: "assistente desligada" });
    }

    const texto = limparEntrada(recebida.texto);
    if (!texto) return vazia();

    /* ── 1. quem está falando ──
     * Antes de qualquer token. O telefone vem do envelope da mensagem, nunca do conteúdo
     * dela: quem se identifica no corpo pode se identificar como outro. */
    const perfil = await deps.lembrarCliente(t, recebida.de);
    const anteriores = await deps.historico.ler(t, perfil.telefone, HISTORICO);

    const sistemaVolatil = parteDoCliente({ perfil, hojeISO: hojeISO() });
    const turnos: TurnoDeConversa[] = [...paraTurnos(anteriores), { papel: "cliente", texto }];

    const estado = novoEstado();
    const trilha: PassoDaTrilha[] = [];
    let ultimoTexto = "";
    let voltas = 0;

    /* ── 2. o loop ── */
    for (voltas = 1; voltas <= MAX_VOLTAS; voltas++) {
      const resposta = await deps.modelo.conversar({
        sistemaEstavel,
        sistemaVolatil,
        ferramentas: FERRAMENTAS,
        turnos,
        maxTokens: MAX_TOKENS,
      });

      /* Recusa do classificador de segurança do provedor. Não é erro de código e não se
       * resolve tentando de novo. O cliente não pode receber a recusa (ele mandou uma
       * mensagem de WhatsApp, não um jailbreak declarado) — então o dono assume. */
      if (resposta.recusou) {
        await deps.canal.escalar(t, { telefone: perfil.telefone, motivo: "conteúdo recusado pelo modelo" });
        return vazia({ escalou: true, motivo: "recusa do modelo", trilha, voltas });
      }

      if (resposta.texto) ultimoTexto = resposta.texto;

      // Sem chamada de ferramenta: o modelo já disse o que tinha a dizer.
      if (resposta.chamadas.length === 0) break;

      turnos.push({ papel: "assistente_ferramentas", texto: resposta.texto || undefined, chamadas: resposta.chamadas });

      const resultados: ResultadoDeFerramenta[] = [];
      for (const chamada of resposta.chamadas) {
        const r = await executar(t, perfil, estado, chamada.nome, chamada.argumentos);
        resultados.push({ id: chamada.id, nome: chamada.nome, texto: r.texto, erro: r.erro });
        trilha.push({ ferramenta: chamada.nome, entrada: chamada.argumentos, resultado: r.texto, erro: r.erro });
      }

      /* TODOS os resultados num único turno. Espalhar em vários ensina o modelo a parar
       * de pedir ferramentas em paralelo — e aí cada consulta de agenda vira uma volta
       * inteira do loop. */
      turnos.push({ papel: "resultados", resultados });
    }

    /* ── 3. o loop girou sem chegar a nada ──
     * Silêncio não é opção num canal onde o cliente está esperando, e insistir também
     * não: se seis voltas não resolveram, a sétima não resolve. O dono assume. */
    if (!ultimoTexto) {
      await deps.canal.escalar(t, { telefone: perfil.telefone, motivo: "agente não concluiu o atendimento" });
      return vazia({ escalou: true, motivo: "sem resposta do agente", trilha, voltas });
    }

    const saida = bolhas(ultimoTexto);

    /* ── 4. gravar o que aconteceu ──
     * Depois de responder, nunca antes: memória é registro de fato, e "o cliente marcou"
     * só é fato quando o provedor confirmou (ver `EstadoDoTurno.marcou`).
     *
     * `escolha` alimenta a inferência de favoritos — é ela que, na terceira visita, faz
     * a MAISA saber que essa pessoa gosta de quinta à tarde com o Rafael. */
    if (estado.marcou) {
      await deps.anotarFato(t, { telefone: perfil.telefone, escolha: estado.marcou });
    }

    const registro: Msg[] = [
      { de: "cliente", txt: texto },
      ...saida.map((txt) => ({ de: "bot" as const, txt })),
    ];
    await deps.historico.anexar(t, perfil.telefone, registro);

    await deps.canal.enviar(t, perfil.telefone, saida);

    return {
      bolhas: saida,
      escalou: !!estado.escalou,
      motivo: estado.escalou?.motivo,
      trilha,
      modelo: deps.modelo.nome,
      voltas,
    };
  };
}

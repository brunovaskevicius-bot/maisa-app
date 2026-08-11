/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a porta `CanalDeMensagens` cumprida pela Evolution API.
 *
 * É o irmão de saída do `entrada/whatsapp/`: um recebe a fala do cliente, este devolve.
 * Substitui o `canalDemo` (que escrevia no log) com uma linha em `composicao.ts`.
 *
 * A porta fala em LISTA de textos, não em texto (ver `portas/saida/canal-mensagens.ts`),
 * e este arquivo é onde essa decisão se paga: cada item vira uma bolha, com pausa entre
 * elas. Bolha é o que separa conversa de notificação.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { CanalDeMensagens } from "@/nucleo/portas/saida/canal-mensagens";
import { FalhaDoProvedor, LimiteDoProvedor } from "@/nucleo/dominio/erros";
import { soDigitos } from "@/nucleo/dominio/clientes";

import { EVOLUTION } from "./config";
import { enviarTexto } from "./cliente";

/* ───────────────────────────── o número ─────────────────────────────
 * A Evolution quer DDI+DDD+número em dígitos puros. O telefone chega aqui de duas
 * origens que não combinam: do webhook vem "5511988887777" (já limpo), e do cadastro
 * vem "(11) 98123-4567" — escrito por gente. Normalizar aqui, num lugar só, é o que
 * evita a classe de bug mais chata desta integração: a mensagem "envia com sucesso"
 * (a Evolution aceita) e nunca chega em ninguém. */

/**
 * Telefone em qualquer grafia → o formato que a Evolution aceita.
 *
 * O DDI é acrescentado por DEDUÇÃO quando o número tem cara de brasileiro (10 dígitos
 * com fixo, 11 com celular). É uma suposição, e ela está aqui em vez de espalhada: se um
 * dia a MAISA atender fora do Brasil, é esta função que muda.
 *
 * Devolve "" quando não dá para deduzir nada — e quem chama trata isso como falha, em
 * vez de mandar para um número inventado.
 */
export function paraNumeroWhats(v: string): string {
  // Aceita JID inteiro por conveniência ("5511...@s.whatsapp.net", com ou sem :device).
  const d = soDigitos(v.split("@")[0]?.split(":")[0] ?? "");

  if (d.length === 10 || d.length === 11) return `55${d}`;          // sem DDI
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d; // com DDI
  if (d.length >= 11 && d.length <= 15) return d;                   // outro país, respeita
  return "";
}

/* ───────────────────────────── o ritmo ─────────────────────────────
 * Quanto a MAISA "demora para digitar" cada bolha. Proporcional ao tamanho, com teto
 * curto: o cliente está olhando a tela esperando, e cada milissegundo aqui é latência
 * que a rota do webhook segura. Realismo perfeito seria ~5s por bolha — e ninguém
 * espera 5s por educação. */

const MS_POR_CHAR = 18;
const PAUSA_MIN = 400;
const PAUSA_MAX = 2000;

const pausaPara = (txt: string) => Math.min(PAUSA_MAX, Math.max(PAUSA_MIN, txt.length * MS_POR_CHAR));

/**
 * A PRIMEIRA bolha sai sem pausa nenhuma, e isso é deliberado: o cliente já esperou o
 * modelo pensar (alguns segundos), então uma pausa "para parecer humano" antes da
 * primeira resposta só soma em cima de uma espera que já existiu.
 */
const pausaDaBolha = (txt: string, indice: number) => (indice === 0 ? 0 : pausaPara(txt));

/* ───────────────────────────── uma segunda chance ─────────────────────────────
 * Só `LimiteDoProvedor`, e só uma vez.
 *
 * Aquele erro tem um significado preciso, montado em `cliente.ts`: a Evolution disse que
 * NÃO processou (429, 502, 503, 504). Nesses casos repetir é seguro e é a diferença
 * entre o cliente receber a resposta e ficar no vácuo por um soluço de rede.
 *
 * Tudo o mais (timeout, 500, número inexistente) é `FalhaDoProvedor` e passa direto: pode
 * ter sido entregue, e mensagem duplicada num WhatsApp de cliente é um erro que ele VÊ.
 * Uma tentativa só porque, se a segunda também falhar, a terceira não muda nada — só
 * aumenta o tempo que a rota do webhook fica pendurada. */

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const ESPERA_RETENTATIVA = 700;

async function comSegundaChance<T>(acao: () => Promise<T>): Promise<T> {
  try {
    return await acao();
  } catch (e) {
    if (!(e instanceof LimiteDoProvedor)) throw e;
    await dormir(ESPERA_RETENTATIVA);
    return acao();
  }
}

/* ───────────────────────────── o canal ─────────────────────────────
 * ⚠️ O `ContextoTenant` chega e não é usado (`_t`), igual ao `canalDemo`. Não é descuido:
 * hoje existe UMA instância, vinda de env. Quando `integracoes_whatsapp` estiver povoada
 * (já versionada em `supabase/002_multitenant.sql`), é dele que sairá qual instância
 * atende cada negócio — e a assinatura já pede o contexto para que essa mudança não
 * chegue até aqui como quebra. */

export const canalEvolution: CanalDeMensagens = {
  /**
   * Envia na ordem, uma bolha por chamada.
   *
   * SEQUENCIAL, nunca em paralelo: `Promise.all` entregaria as bolhas fora de ordem
   * (a segunda é mais curta, chega antes), e uma resposta fora de ordem no WhatsApp lê
   * como bot quebrado — que é exatamente o que as bolhas existem para evitar.
   *
   * O contrato da porta diz que uma falha no meio não desfaz as anteriores, então
   * lançamos e deixamos o que já foi entregue entregue. Não há transação em cima de
   * mensagem lida por um humano, e simulá-la seria pior que assumir isso.
   */
  async enviar(_t, para, textos) {
    if (textos.length === 0) return;

    const numero = paraNumeroWhats(para);
    if (!numero) {
      throw new FalhaDoProvedor(`Telefone "${para}" não virou número de WhatsApp válido — nada foi enviado.`);
    }

    for (let i = 0; i < textos.length; i++) {
      const texto = textos[i].trim();
      if (!texto) continue;

      /* O `delay` é executado DENTRO da Evolution: ela segura a requisição e só então
       * despacha. Preferido a dormir aqui porque a pausa acontece do lado que também
       * controla a presença — e porque um `sleep` nosso é tempo de função serverless
       * comprado para não fazer nada.
       *
       * Se o "digitando…" não aparecer na sua versão da Evolution, a peça que liga é
       * `sinalizarDigitando()` no cliente; o ritmo das bolhas já funciona sem ela. */
      await comSegundaChance(() => enviarTexto({ numero, texto, delayMs: pausaDaBolha(texto, i) }));
    }
  },

  /**
   * Chama o dono. Nunca lança — e essa é a regra mais importante deste arquivo.
   *
   * `escalar` é chamado justamente nos caminhos de FALHA do agente (modelo recusou, loop
   * girou sem resposta, ferramenta desistiu). Uma exceção aqui substituiria o problema
   * original por um erro de notificação, e o log mostraria a falha errada — enquanto o
   * cliente, do outro lado, continua sem ninguém.
   */
  async escalar(_t, p) {
    const cliente = paraNumeroWhats(p.telefone);
    const aviso =
      `🔔 *MAISA precisa de você*\n\n` +
      `Cliente: +${cliente || soDigitos(p.telefone)}\n` +
      `Motivo: ${p.motivo}\n\n` +
      // Link tocável: o dono abre a conversa e assume, sem procurar o contato na lista.
      `Assumir: https://wa.me/${cliente || soDigitos(p.telefone)}`;

    if (!EVOLUTION.dono) {
      console.warn(`[evolution/escalar ${p.telefone}] ${p.motivo} — MAISA_WHATSAPP_DONO não configurado, ninguém avisado.`);
      return;
    }

    const numeroDono = paraNumeroWhats(EVOLUTION.dono);
    if (!numeroDono) {
      console.warn(`[evolution/escalar] MAISA_WHATSAPP_DONO="${EVOLUTION.dono}" não é número válido. ${p.motivo}`);
      return;
    }

    try {
      await enviarTexto({ numero: numeroDono, texto: aviso });
    } catch (e) {
      console.error(`[evolution/escalar ${p.telefone}] não conseguiu avisar o dono: ${p.motivo}`, e);
    }
  },
};

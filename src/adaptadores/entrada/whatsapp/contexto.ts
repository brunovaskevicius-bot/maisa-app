/* ─────────────────────────────────────────────────────────────────────────────
 * CONTEXTO — de quem é a conversa que acabou de chegar.
 *
 * Irmão de `entrada/http/contexto.ts`, com um problema mais difícil. Lá o inquilino sai
 * de um cookie de sessão assinado: ninguém falsifica. Aqui não existe sessão — existe
 * um webhook público que qualquer um pode chamar.
 *
 * A REGRA NÃO NEGOCIÁVEL (`dominio/tenant.ts`): o `tenantId` nunca vem do corpo do
 * request. Nem do agente, nem do cliente, nem de um campo `tenant_id` que o provedor
 * mandou. Ele é resolvido a partir do DESTINO da mensagem — o lado do envelope que só o
 * provedor de WhatsApp preenche.
 *
 * Foi exatamente o descuido oposto — id de inquilino vindo por query param — que abriu
 * o pior furo da integração original, onde bastava conhecer o id da vítima para
 * sobrescrever a agenda dela. Um webhook aberto com tenant no corpo seria a mesma
 * falha, sem nem precisar de login.
 *
 * O QUE CONTA COMO "DESTINO" DEPENDE DO PROVEDOR, e é a diferença que mais custou aqui:
 *   • Cloud API (Meta) — `metadata.display_phone_number`, o número do negócio.
 *   • Evolution ....... — o NOME DA INSTÂNCIA (`instance`). A Evolution não manda o
 *     número do negócio de forma confiável no envelope de mensagem; o que ela sempre
 *     manda é qual instância recebeu. Uma instância é um negócio, então é identificador
 *     suficiente — e é preenchido pelo servidor da Evolution, não por quem escreveu a
 *     mensagem, que é a propriedade de que precisamos.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { atorAgente } from "@/nucleo/dominio/tenant";

/**
 * O segredo do webhook. **Sem ele, a rota não atende.**
 *
 * Não é sobre espionagem: sem verificação, qualquer um faz a MAISA marcar horário na
 * agenda real do dono mandando um POST — e cada POST gasta token. Falha fechada de
 * propósito; um webhook que atende sem segredo configurado é um webhook que ninguém
 * lembra de fechar depois.
 *
 * Na Evolution ele é cadastrado em `webhook.headers.apikey` (ver
 * `saida/evolution/cliente.ts` → `configurarWebhook`); na Cloud API é o "Verify token".
 */
export const SEGREDO = process.env.WHATSAPP_WEBHOOK_SECRET ?? "";

/**
 * ⚠️ DÍVIDA DECLARADA — um inquilino só.
 *
 * O `tenantId` do negócio de demonstração vem de env. Quando `integracoes_whatsapp`
 * (já versionada em `supabase/002_multitenant.sql`) estiver povoada, isto vira
 * `select tenant_id from integracoes_whatsapp where instancia = $1 or numero = $2` — e a
 * função continua com a mesma assinatura, porque ela já recebe os dois.
 */
const TENANT = process.env.MAISA_TENANT_ID ?? "";
const NUMERO = process.env.MAISA_WHATSAPP_NUMERO ?? "";
/** Lido aqui E em `saida/evolution/config.ts`, de propósito: adaptador não importa
 *  adaptador (`ARQUITETURA.md` §6). Variável de ambiente é ambiente, não dependência. */
const INSTANCIA = (process.env.EVOLUTION_INSTANCIA ?? "").trim();

const digitos = (v: string) => v.replace(/\D/g, "");

/** Comparação pelos 8 últimos dígitos: o provedor manda `5511988887777`, o env
 *  costuma ter `(11) 98888-7777`, e DDI/nono dígito são justamente o que varia
 *  entre as duas grafias do mesmo número. */
function mesmoNumero(a: string, b: string): boolean {
  const x = digitos(a).slice(-8);
  return x.length === 8 && x === digitos(b).slice(-8);
}

/* ───────────────────────────── quem pode falar com a MAISA ─────────────────────────────
 * Lista de números liberados. É um guardrail de LANÇAMENTO, não de segurança: o segredo do
 * webhook já barra quem não é o provedor. Isto barra quem é cliente de verdade.
 *
 * Existe porque o número de teste da MAISA é o número PESSOAL do dono. Sem a lista, a
 * primeira pessoa que mandar mensagem para ele em produção — um amigo, um cliente antigo,
 * alguém que achou o contato — cai numa IA que marca horário na agenda real e gasta token.
 * E o pior: essa pessoa não sabe que está falando com um robô em teste.
 *
 * VAZIA = LIBERADO PARA TODOS. Fail-open aqui, ao contrário do segredo do webhook (que
 * falha fechado), porque são coisas diferentes: o segredo protege de quem não deveria
 * chegar, e esta lista só ESTREITA um canal que já está autenticado. Vazia significa "sem
 * estreitamento", que é o único jeito de `curl` e demo continuarem funcionando sem
 * ninguém configurar nada.
 *
 * Para não virar fail-open silencioso, o modo aparece em `/api/whatsapp/conexao`
 * (`permitidos: "todos"` ou a lista) — dá para OLHAR e ver em que modo está.
 */
const PERMITIDOS = (process.env.MAISA_WHATSAPP_PERMITIDOS ?? "")
  .split(/[,;\s]+/)
  .map((n) => digitos(n).slice(-8))
  .filter((n) => n.length === 8);

/** Para o diagnóstico mostrar em que modo está, sem expor número inteiro. */
export const modoDaLista = () => (PERMITIDOS.length === 0 ? "todos" : PERMITIDOS.map((n) => `…${n.slice(-4)}`));

/**
 * Este número pode conversar? Compara pelos 8 últimos dígitos, igual a `mesmoNumero`:
 * o provedor manda `5511988887777` e no env costuma-se escrever `(11) 98888-7777`.
 */
export function numeroPermitido(telefone: string): boolean {
  if (PERMITIDOS.length === 0) return true;
  return PERMITIDOS.includes(digitos(telefone).slice(-8));
}

export type Resolucao = { ok: true; tenant: ContextoTenant } | { ok: false; motivo: string };

/**
 * Envelope da mensagem → contexto do inquilino, com o ator já marcado como agente.
 *
 * Aceita a instância OU o número, e basta um. Não é frouxidão: são dois provedores com
 * envelopes diferentes (ver o cabeçalho), e exigir os dois faria a Evolution — que não
 * manda número — nunca ser atendida. Sem nenhum dos dois configurados, recusa.
 *
 * `atorAgente()` é o que faz o evento nascer com "Origem: MAISA (WhatsApp)" na
 * descrição — na agenda do dono dá para ver, de relance, o que a IA marcou sozinha.
 * Sem isso, um atendimento criado pela IA seria indistinguível de um criado à mão, e
 * a primeira pergunta depois de um erro ("quem marcou isso?") não teria resposta.
 */
export function contextoDaMensagem(envelope: Envelope): Resolucao {
  if (!TENANT) return { ok: false, motivo: "MAISA_TENANT_ID não configurado" };
  if (!INSTANCIA && !NUMERO) {
    return { ok: false, motivo: "configure EVOLUTION_INSTANCIA (Evolution) ou MAISA_WHATSAPP_NUMERO (Cloud API)" };
  }

  const porInstancia =
    !!INSTANCIA && !!envelope.instancia && envelope.instancia.trim().toLowerCase() === INSTANCIA.toLowerCase();
  const porNumero = !!NUMERO && !!envelope.para && mesmoNumero(envelope.para, NUMERO);

  if (!porInstancia && !porNumero) {
    /* O motivo diz o que CHEGOU, porque o erro real quase sempre é uma diferença boba
     * (instância "maisa" vs "MAISA-prod") — e sem ver os dois lados a pessoa fica
     * trocando env no escuro. Nada aqui é segredo: nome de instância e número do
     * próprio negócio. */
    return {
      ok: false,
      motivo: `destino desconhecido — chegou instância "${envelope.instancia ?? "—"}" / número "${envelope.para || "—"}"`,
    };
  }

  return {
    ok: true,
    tenant: {
      tenantId: TENANT,
      // Não há usuário logado: quem age é o negócio. Igual ao `tenantId` porque hoje
      // é um login por negócio — a mesma simplificação declarada em `entrada/http`.
      usuarioId: TENANT,
      ator: atorAgente(envelope.conversaId),
    },
  };
}

/* ───────────────────────────── normalização do webhook ─────────────────────────────
 * Evolution API e a Cloud API da Meta mandam formatos diferentes, e nós queremos
 * depender de nenhum dos dois: o resto do adaptador fala `MensagemRecebida`. Ficar
 * tolerante aqui é o que permite trocar de provedor sem tocar no agente. */

/** O que não é texto. Não respondemos a isso hoje — mas o tipo VIAJA até a rota para
 *  que o descarte apareça no log com nome ("ignorado: audio") em vez de virar silêncio.
 *  Áudio é o caso que mais vai acontecer no Brasil; ver o LEIA-ME desta pasta. */
export type Midia = "audio" | "imagem" | "video" | "documento" | "figurinha" | "localizacao" | "contato" | "reacao";

export type Envelope = {
  /** Telefone do cliente, só dígitos. */
  de: string;
  /** Número do negócio, quando o provedor manda (Cloud API sempre; Evolution não). */
  para: string;
  /** Nome da instância que recebeu (Evolution). É o identificador de destino de lá. */
  instancia?: string;
  texto: string;
  conversaId?: string;
  /** Presente quando a mensagem não era (só) texto. */
  midia?: Midia;
};

const texto = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * A Evolution é inconsistente no nome do evento: a documentação e a configuração usam
 * `MESSAGES_UPSERT`, e o que chega no corpo é `messages.upsert` (bug conhecido,
 * evolution-api#1340). Comparamos numa forma canônica em vez de escolher um lado.
 */
const ehMensagemNova = (evento: string) => evento.trim().toLowerCase().replace(/[_-]/g, ".") === "messages.upsert";

/**
 * Extrai o telefone de um JID: `5511988887777@s.whatsapp.net` → `5511988887777`.
 * O sufixo `:12` que aparece em mensagens de aparelho secundário é o id do device,
 * não parte do número — deixá-lo passar faria o cliente virar um lead novo a cada
 * troca de celular.
 */
const telefoneDoJid = (jid: string) => digitos(jid.split("@")[0]?.split(":")[0] ?? "");

/**
 * O texto de dentro da mensagem do Baileys, que é uma cebola.
 *
 * Uma mensagem de texto simples é `conversation`. Mas a MESMA frase chega como
 * `extendedTextMessage` se for resposta a outra mensagem, dentro de `ephemeralMessage` se
 * o cliente usa mensagens temporárias (padrão em muitos aparelhos), e como
 * `imageMessage.caption` se ele mandou foto escrevendo em cima. Ler só `conversation`
 * funciona no teste e perde uma fatia grande da conversa real — sem erro nenhum no log.
 */
function conteudo(m: any, profundidade = 0): { texto: string; midia?: Midia } {
  if (!m || profundidade > 4) return { texto: "" };

  // Embrulhos: a mensagem real está uma camada abaixo.
  const dentro =
    m.ephemeralMessage?.message ??
    m.viewOnceMessage?.message ??
    m.viewOnceMessageV2?.message ??
    m.viewOnceMessageV2Extension?.message ??
    m.documentWithCaptionMessage?.message ??
    m.editedMessage?.message ??
    null;
  if (dentro) return conteudo(dentro, profundidade + 1);

  if (texto(m.conversation)) return { texto: m.conversation };
  if (texto(m.extendedTextMessage?.text)) return { texto: m.extendedTextMessage.text };

  /* Respostas de botão e de lista chegam como escolha, não como texto. Traduzimos para o
   * rótulo que o cliente VIU: para ele, tocar no botão "Amanhã" foi dizer "Amanhã". */
  if (m.buttonsResponseMessage) {
    return { texto: texto(m.buttonsResponseMessage.selectedDisplayText) || texto(m.buttonsResponseMessage.selectedButtonId) };
  }
  if (m.listResponseMessage) {
    return { texto: texto(m.listResponseMessage.title) || texto(m.listResponseMessage.singleSelectReply?.selectedRowId) };
  }
  if (m.templateButtonReplyMessage) {
    return { texto: texto(m.templateButtonReplyMessage.selectedDisplayText) };
  }

  // Mídia: a legenda conta como fala; o anexo em si a MAISA não lê.
  if (m.imageMessage) return { texto: texto(m.imageMessage.caption), midia: "imagem" };
  if (m.videoMessage) return { texto: texto(m.videoMessage.caption), midia: "video" };
  if (m.documentMessage) return { texto: texto(m.documentMessage.caption), midia: "documento" };
  if (m.audioMessage) return { texto: "", midia: "audio" };
  if (m.stickerMessage) return { texto: "", midia: "figurinha" };
  if (m.locationMessage || m.liveLocationMessage) return { texto: "", midia: "localizacao" };
  if (m.contactMessage || m.contactsArrayMessage) return { texto: "", midia: "contato" };
  if (m.reactionMessage) return { texto: "", midia: "reacao" };

  return { texto: "" };
}

/**
 * Extrai o que importa de qualquer um dos três formatos que já vimos, incluindo o
 * nosso: `{ de, texto }` cru, para conversar com a MAISA por `curl` antes de existir
 * número de WhatsApp. Afinar o tom sem depender de contrato de provedor é o que faz
 * essa parte ser iterável.
 *
 * `null` = não é conversa. A rota devolve 200 e ignora — ver o comentário dela sobre por
 * que 200 e não 4xx.
 */
export function normalizar(corpo: any): Envelope | null {
  // Formato de teste / interno.
  if (texto(corpo?.de) && texto(corpo?.texto)) {
    return {
      de: digitos(corpo.de) || corpo.de,
      para: texto(corpo.para) || NUMERO,
      instancia: texto(corpo.instancia) || INSTANCIA || undefined,
      texto: corpo.texto,
      conversaId: texto(corpo.conversaId) || undefined,
    };
  }

  // Cloud API (Meta): entry[].changes[].value.messages[]
  const valor = corpo?.entry?.[0]?.changes?.[0]?.value;
  const msgMeta = valor?.messages?.[0];
  if (msgMeta) {
    return {
      de: digitos(texto(msgMeta.from)),
      para: digitos(texto(valor?.metadata?.display_phone_number)),
      texto: texto(msgMeta.text?.body) || texto(msgMeta.button?.text) || texto(msgMeta.interactive?.list_reply?.title),
      conversaId: texto(msgMeta.id) || undefined,
    };
  }

  // Evolution API: { event, instance, sender, data: { key, message, ... } }
  const d = corpo?.data;
  if (d?.key?.remoteJid) {
    /* Só mensagem nova. `messages.update` (recibo de leitura) e `presence.update`
     * também têm `data.key`, e sem este filtro cada olhada do cliente na conversa
     * entraria aqui para ser descartada mais adiante, por acidente. */
    if (texto(corpo.event) && !ehMensagemNova(corpo.event)) return null;

    /* Eco da própria mensagem enviada. Sem este descarte, a MAISA responde a si mesma
     * — e um loop de bot conversando consigo é caro e visível para o cliente.
     * ⚠️ Não é hipótese: a Evolution entrega o que NÓS mandamos de volta como
     * `messages.upsert` com `fromMe: true`, no mesmo evento das mensagens recebidas. */
    if (d.key.fromMe) return null;

    const jid = texto(d.key.remoteJid);

    /* Grupo e status não são atendimento. A MAISA num grupo responderia a cada
     * mensagem de cada participante — e o dono descobre isso pelo grupo da família. */
    if (jid.endsWith("@g.us") || jid.includes("@broadcast") || jid.endsWith("@newsletter")) return null;

    /* ⚠️ O CASO `@lid`. Desde 2025 o WhatsApp entrega alguns contatos por um id opaco
     * (`69385314111689@lid`) em vez do telefone. Tratar esse id como número é o pior
     * resultado possível: entra no cadastro um "cliente" com telefone falso, e o
     * `sendText` de volta falha com `exists: false` — a MAISA processa a conversa
     * inteira, gasta token, e a resposta não chega em ninguém.
     * A Evolution manda o telefone verdadeiro à parte quando tem. Sem ele, desistimos:
     * um descarte com log é melhor que um cadastro envenenado. */
    let jidDoCliente = jid;
    if (jid.endsWith("@lid")) {
      const alternativo =
        texto(d.key.remoteJidAlt) || texto(d.key.senderPn) || texto(d.senderPn) || texto(d.key.participantPn);
      if (!alternativo) {
        console.warn(`[whatsapp/contexto] mensagem de ${jid} sem telefone (@lid) — não há como responder, descartada.`);
        return null;
      }
      jidDoCliente = alternativo;
    }

    const de = telefoneDoJid(jidDoCliente);
    if (!de) return null;

    const { texto: falado, midia } = conteudo(d.message);

    return {
      de,
      /* `sender` é o JID de quem RECEBEU (a instância). A Evolution nem sempre manda, e
       * a documentação dela se contradiz — então ele é um bônus, não a base: quem
       * identifica o negócio aqui é `instancia`. Ver o cabeçalho deste arquivo. */
      para: telefoneDoJid(texto(corpo.sender)),
      instancia: texto(corpo.instance) || undefined,
      texto: falado,
      conversaId: texto(d.key.id) || undefined,
      midia,
    };
  }

  return null;
}

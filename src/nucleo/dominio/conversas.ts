/* ─────────────────────────────────────────────────────────────────────────────
 * CONVERSAS — o WhatsApp, do ponto de vista do domínio.
 *
 * Hoje só existe como demonstração: o WhatsApp não está integrado, e as threads são
 * fixtures. O tipo mora aqui mesmo assim porque é o CONTRATO que o agente de IA vai
 * preencher — quando a integração entrar, o adaptador de entrada (webhook) traduz a
 * mensagem que chegou para `Msg` e o resto do app não muda de forma.
 *
 * `estado` é a situação de origem; assumir/devolver no app sobrepõe isso.
 *   maisa  — a MAISA está conduzindo sozinha
 *   espera — precisa de decisão sua (encaixe, exceção)
 *   voce   — você assumiu
 *   ok     — resolvida
 * ────────────────────────────────────────────────────────────────────────────── */

export type EstadoConversa = "maisa" | "espera" | "voce" | "ok";

export type Conversa = {
  id: string;
  clienteId?: string;
  /** Nome exibido — pode não ser um cliente cadastrado ainda (lead, acompanhante). */
  nome: string;
  telefone: string;
  hora: string;
  estado: EstadoConversa;
};

export type Msg = { de: "cliente" | "bot" | "voce"; txt: string };

/** O que o dia tem de decisão pendente. `alvo` é o id que a Gaveta abre. */
export type ItemFila = { id: string; alvo: string; titulo: string; tag: string; msg: string };

export type Faq = { id: string; pergunta: string; resposta: string; usos: number };

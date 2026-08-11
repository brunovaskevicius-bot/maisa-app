/* ─────────────────────────────────────────────────────────────────────────────
 * FISCAL — a nota do mês, no vocabulário do app.
 *
 * Estes estados são NOSSOS, não da Focus NFe. O adaptador traduz o vocabulário da
 * prefeitura ("processando_autorizacao", "erro_autorizacao") para cá — é o que
 * permite trocar de emissor sem que nenhuma tela perceba.
 *
 *   pendente     — fechado no mês, nota ainda não enviada
 *   processando  — enviada à prefeitura, aguardando número (assíncrono)
 *   emitida      — autorizada; tem número, e pdf quando a emissão foi real
 *   cancelada    — autorizada e depois cancelada
 *   erro         — a prefeitura ou o emissor rejeitou; `erro` traz o motivo
 * ────────────────────────────────────────────────────────────────────────────── */

export type StatusNota = "pendente" | "processando" | "emitida" | "cancelada" | "erro";

export type Nota = {
  status: StatusNota;
  numero?: string;
  data?: string;
  /** Chave da emissão no provedor — necessária para consultar status e cancelar. */
  ref?: string;
  pdf?: string;
  erro?: string;
  /** Nota que saiu sem token do emissor (número gerado localmente). */
  simulada?: boolean;
};

/** Quem recebe a nota. */
export type Tomador = {
  nome?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
};

export type PedidoDeNota = {
  /** Chave idempotente da emissão, cunhada por quem pede. */
  ref: string;
  valor: number;
  discriminacao: string;
  tomador: Tomador;
};

/** O que o emissor devolve, já no nosso vocabulário. */
export type ResultadoDeNota = {
  status: "processando" | "autorizado" | "cancelado" | "erro" | "simulado";
  ref: string;
  numero?: string;
  url?: string;
  pdf?: string;
  xml?: string;
  erros?: { mensagem: string }[];
};

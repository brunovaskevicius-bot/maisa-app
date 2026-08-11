/* ─────────────────────────────────────────────────────────────────────────────
 * NEGÓCIO — o assinante da MAISA, visto por dentro.
 *
 * Genérico de propósito: o MESMO app atende terapeutas e barbeiros, e a diferença
 * entre os dois vive nas landing pages e no catálogo de serviços, nunca aqui.
 * ────────────────────────────────────────────────────────────────────────────── */

export type Negocio = {
  nome: string;
  plano: string;
  precoPlano: number;
  proximaCobranca: string;
  cartao: string;
  conversasPlano: string;
};

/** Dados fiscais do prestador — cabeçalho do recibo de NFS-e. */
export type Prestador = {
  nome: string;
  doc: string;
};

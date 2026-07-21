// ─────────────────────────────────────────────────────────────────────────────
// Configuração fiscal do PRESTADOR — lida de variáveis de ambiente.
// ⚠️ SÓ SERVIDOR. Nenhuma destas variáveis tem prefixo NEXT_PUBLIC_, então
// nunca chegam ao navegador. Este módulo só pode ser importado no servidor
// (rotas /app/api/**), nunca em componentes "use client".
// ─────────────────────────────────────────────────────────────────────────────

const env = process.env;

export const NF_CONFIG = {
  /** Token da Focus NFe (secret). Sem ele, a emissão roda em modo "simulado". */
  token: env.FOCUS_NFE_TOKEN,

  /** Ambiente da Focus. Default = homologação (nada real é emitido). */
  ambiente: (env.FOCUS_NFE_AMBIENTE === "producao" ? "producao" : "homologacao") as
    | "producao"
    | "homologacao",

  /** Dados do prestador (identificam a empresa que emite a nota). */
  prestador: {
    cnpj: env.NF_PRESTADOR_CNPJ ?? "",
    inscricaoMunicipal: env.NF_PRESTADOR_IM ?? "",
    codigoMunicipio: env.NF_CODIGO_MUNICIPIO ?? "", // IBGE, 7 dígitos (São Paulo = 3550308)
  },

  /** Parâmetros fiscais do serviço. */
  servico: {
    itemListaServico: env.NF_ITEM_LISTA_SERVICO ?? "", // ex.: psicologia
    aliquota: env.NF_ALIQUOTA_ISS ? Number(env.NF_ALIQUOTA_ISS) : undefined, // % de ISS
    codigoTributarioMunicipio: env.NF_CODIGO_TRIBUTARIO_MUNICIPIO || undefined,
  },

  optanteSimplesNacional: env.NF_OPTANTE_SIMPLES !== "false", // default true
  naturezaOperacao: env.NF_NATUREZA_OPERACAO ?? "1", // 1 = tributação no município
};

/** Campos fiscais obrigatórios para emitir de verdade. */
const OBRIGATORIOS: [string, string][] = [
  ["NF_PRESTADOR_CNPJ", NF_CONFIG.prestador.cnpj],
  ["NF_PRESTADOR_IM", NF_CONFIG.prestador.inscricaoMunicipal],
  ["NF_CODIGO_MUNICIPIO", NF_CONFIG.prestador.codigoMunicipio],
  ["NF_ITEM_LISTA_SERVICO", NF_CONFIG.servico.itemListaServico],
];

/** true quando há token + todos os dados fiscais mínimos para emitir. */
export const isFocusConfigured = Boolean(NF_CONFIG.token) && OBRIGATORIOS.every(([, v]) => Boolean(v));

/** Lista dos nomes das variáveis fiscais que ainda faltam (para mensagem clara na UI). */
export function focusFaltando(): string[] {
  return OBRIGATORIOS.filter(([, v]) => !v).map(([nome]) => nome);
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuração fiscal do PRESTADOR — lida de variáveis de ambiente.
// ⚠️ SÓ SERVIDOR. Nenhuma destas variáveis tem prefixo NEXT_PUBLIC_, então
// nunca chegam ao navegador. Este módulo só pode ser importado no servidor
// (rotas /app/api/**), nunca em componentes "use client".
// ─────────────────────────────────────────────────────────────────────────────

const env = process.env;

// A Vercel guarda o valor CRU da variável. É comum colar entre aspas (ex.: "producao",
// "03115") ou com espaço — o que quebra comparações e é enviado à Focus como texto inválido.
// clean() remove aspas/apóstrofos ao redor e espaços das pontas, tornando a config robusta.
const clean = (v?: string): string => (v ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();

const ambienteRaw = clean(env.FOCUS_NFE_AMBIENTE).toLowerCase();

export const NF_CONFIG = {
  /** Token da Focus NFe (secret). Sem ele, a emissão roda em modo "simulado". */
  token: clean(env.FOCUS_NFE_TOKEN) || undefined,

  /** Ambiente da Focus. Default = homologação (nada real é emitido). */
  ambiente: (ambienteRaw === "producao" ? "producao" : "homologacao") as
    | "producao"
    | "homologacao",

  /** Dados do prestador (identificam a empresa que emite a nota). */
  prestador: {
    cnpj: clean(env.NF_PRESTADOR_CNPJ),
    inscricaoMunicipal: clean(env.NF_PRESTADOR_IM),
    codigoMunicipio: clean(env.NF_CODIGO_MUNICIPIO), // IBGE, 7 dígitos (São Paulo = 3550308)
  },

  /** Parâmetros fiscais do serviço. */
  servico: {
    itemListaServico: clean(env.NF_ITEM_LISTA_SERVICO), // código de serviço municipal (SP: ex. 03115)
    aliquota: clean(env.NF_ALIQUOTA_ISS) ? Number(clean(env.NF_ALIQUOTA_ISS)) : undefined, // % de ISS
    codigoTributarioMunicipio: clean(env.NF_CODIGO_TRIBUTARIO_MUNICIPIO) || undefined,
  },

  optanteSimplesNacional: clean(env.NF_OPTANTE_SIMPLES) !== "false", // default true
  naturezaOperacao: clean(env.NF_NATUREZA_OPERACAO) || "1", // 1 = tributação no município
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

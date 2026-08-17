/* ─────────────────────────────────────────────────────────────────────────────
 * O PRESTADOR — quem emite a nota, no vocabulário da Focus. ⚠️ SÓ SERVIDOR.
 *
 * Este tipo existe para que `focus.ts` (NFS-e municipal) e `nfsen.ts` (DPS nacional)
 * deixem de ler `process.env` e passem a receber os dados de quem está emitindo.
 *
 * ★ É A MUDANÇA QUE DESTRAVA O SEGUNDO CLIENTE. Enquanto o CNPJ vinha de variável de
 * ambiente, o app inteiro sabia emitir nota de UM prestador — e isso não é limitação de
 * escala, é limitação de um. Está escrito assim em `002_multitenant.sql` §8, desde antes
 * de existir cliente nenhum, e continuou verdade até aqui.
 *
 * ── OS DOIS CAMINHOS, E POR QUE SÃO DOIS ──
 *
 *   nacional  (optanteMei)  → DPS em `/v2/nfsen`. Obrigatório para MEI desde 09/2023,
 *                             independente do município. É o caminho do nosso ICP.
 *   municipal (o resto)     → NFS-e em `/v2/nfse`, no formato da prefeitura.
 *
 * O campo que decide é `optanteMei`, e ele **não é pergunta de tela**: vem do
 * `optante_mei` da consulta de CNPJ. Ver `conta.ts`.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Onde a nota vale. `homologacao` não tem efeito fiscal — é onde se erra de graça. */
export type AmbienteFiscal = "homologacao" | "producao";

export type Prestador = {
  /** Só dígitos, 14. */
  cnpj: string;
  /** IBGE de 7 dígitos. São Paulo = 3550308. */
  codigoMunicipio: string;
  ambiente: AmbienteFiscal;

  /** ⚠️ Escolhe o caminho de emissão. Vem da Receita, não do dono. */
  optanteMei: boolean;
  optanteSimples: boolean;

  /** O token de emissão daquela empresa. Pedido à Focus na hora — nunca guardado. */
  token: string;

  /* ── caminho nacional ── */
  /** `codigo_tributacao_nacional_iss`: LC 116 + 2 dígitos (6.01 barbearia → 060101). */
  codigoTributacaoNacional?: string | null;

  /* ── caminho municipal ── */
  inscricaoMunicipal?: string | null;
  itemListaServico?: string | null;
  aliquotaIss?: number | null;
  codigoTributarioMunicipio?: string | null;
  naturezaOperacao?: string | null;
};

/** Quem recebe a nota, já normalizado por quem chamou. */
export type TomadorDaNota = {
  cpf?: string | null;
  cnpj?: string | null;
  razaoSocial?: string | null;
  email?: string | null;
  telefone?: string | null;
};

export type EmissaoInput = {
  /** Chave idempotente cunhada pelo caso de uso. A Focus recusa `ref` repetida. */
  ref: string;
  valorServicos: number;
  discriminacao: string;
  tomador: TomadorDaNota;
  /** ISO 8601. Default = agora, em São Paulo. */
  dataEmissao?: string;
};

/** URL base por ambiente. A de Empresas NÃO usa isto — ver o ⚠️ de `conta.ts`. */
export function baseDoAmbiente(ambiente: AmbienteFiscal): string {
  return ambiente === "producao"
    ? "https://api.focusnfe.com.br/v2"
    : "https://homologacao.focusnfe.com.br/v2";
}

/** Basic com o token como usuário e senha vazia. Os dois pontos finais são o esquema. */
export function basic(token: string): string {
  return "Basic " + Buffer.from(token + ":").toString("base64");
}

/**
 * `opSimpNac` do layout nacional — a situação perante o Simples.
 *
 *   1 = não optante · 2 = optante MEI · 3 = optante ME/EPP
 *
 * ⚠️ MEI é 2, e não 3. Um MEI declarado como ME/EPP passa pela Focus e é recusado pela
 * Receita — o tipo de erro que só aparece no status assíncrono, minutos depois, com uma
 * mensagem que não aponta para esta linha. Confirmar por emissão em homologação antes
 * de virar produção: é para isso que a homologação existe.
 */
export function opcaoSimplesNacional(p: Pick<Prestador, "optanteMei" | "optanteSimples">): string {
  if (p.optanteMei) return "2";
  return p.optanteSimples ? "3" : "1";
}

/** `tribISSQN`: 1 = operação tributável. É o nosso caso — serviço prestado no município. */
export const ISS_TRIBUTAVEL = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Cliente da API Focus NFe (NFS-e municipal /v2/nfse). SÓ SERVIDOR.
// Doc: https://doc.focusnfe.com.br/reference/emitir_nfse.md
// Auth: HTTP Basic — usuário = token, senha em branco.
// ─────────────────────────────────────────────────────────────────────────────
import { NF_CONFIG } from "./config";

export type TomadorInput = {
  cpf?: string | null;
  cnpj?: string | null;
  razaoSocial?: string | null;
  email?: string | null;
  telefone?: string | null;
};

export type EmitirInput = {
  ref: string;
  valorServicos: number;
  discriminacao: string;
  tomador: TomadorInput;
  dataEmissao?: string; // ISO 8601; default = agora
};

export type FocusResult = { httpStatus: number; data: any };

const onlyDigits = (s?: string | null) => (s ?? "").replace(/\D/g, "");

function baseUrl(): string {
  return NF_CONFIG.ambiente === "producao"
    ? "https://api.focusnfe.com.br/v2"
    : "https://homologacao.focusnfe.com.br/v2";
}

function authHeader(): string {
  const token = NF_CONFIG.token ?? "";
  return "Basic " + Buffer.from(token + ":").toString("base64");
}

/** Monta o corpo da NFS-e a partir do input + configuração fiscal do prestador. */
function buildBody(input: EmitirInput) {
  const doc = onlyDigits(input.tomador.cnpj || input.tomador.cpf);
  const isCnpj = doc.length === 14;
  const codMun = NF_CONFIG.prestador.codigoMunicipio;

  return {
    data_emissao: input.dataEmissao ?? new Date().toISOString(),
    natureza_operacao: NF_CONFIG.naturezaOperacao,
    optante_simples_nacional: NF_CONFIG.optanteSimplesNacional,
    prestador: {
      cnpj: onlyDigits(NF_CONFIG.prestador.cnpj),
      inscricao_municipal: NF_CONFIG.prestador.inscricaoMunicipal,
      codigo_municipio: codMun,
    },
    tomador: {
      ...(isCnpj ? { cnpj: doc } : { cpf: doc }),
      ...(input.tomador.razaoSocial ? { razao_social: input.tomador.razaoSocial } : {}),
      ...(input.tomador.email ? { email: input.tomador.email } : {}),
      ...(onlyDigits(input.tomador.telefone) ? { telefone: onlyDigits(input.tomador.telefone) } : {}),
    },
    servico: {
      valor_servicos: input.valorServicos,
      iss_retido: false,
      item_lista_servico: NF_CONFIG.servico.itemListaServico,
      discriminacao: input.discriminacao,
      codigo_municipio: codMun,
      ...(NF_CONFIG.servico.aliquota != null ? { aliquota: NF_CONFIG.servico.aliquota } : {}),
      ...(NF_CONFIG.servico.codigoTributarioMunicipio
        ? { codigo_tributario_municipio: NF_CONFIG.servico.codigoTributarioMunicipio }
        : {}),
    },
  };
}

/** Emite a NFS-e. POST /nfse?ref=... (assíncrono → normalmente 202 processando). */
export async function emitirNfse(input: EmitirInput): Promise<FocusResult> {
  const res = await fetch(`${baseUrl()}/nfse?ref=${encodeURIComponent(input.ref)}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(buildBody(input)),
  });
  const data = await res.json().catch(() => ({}));
  return { httpStatus: res.status, data };
}

/** Consulta a NFS-e por referência. GET /nfse/{ref}. */
export async function consultarNfse(ref: string): Promise<FocusResult> {
  const res = await fetch(`${baseUrl()}/nfse/${encodeURIComponent(ref)}`, {
    method: "GET",
    headers: { Authorization: authHeader() },
  });
  const data = await res.json().catch(() => ({}));
  return { httpStatus: res.status, data };
}

/**
 * Cancela a NFS-e. DELETE /nfse/{ref} — síncrono.
 * justificativa: opcional, 15–255 caracteres. Retorna { status: "cancelado" }
 * ou { status: "erro_cancelamento", erros: [...] }.
 */
export async function cancelarNfse(ref: string, justificativa?: string): Promise<FocusResult> {
  const j = justificativa && justificativa.length >= 15 ? justificativa.slice(0, 255) : undefined;
  const res = await fetch(`${baseUrl()}/nfse/${encodeURIComponent(ref)}`, {
    method: "DELETE",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: j ? JSON.stringify({ justificativa: j }) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { httpStatus: res.status, data };
}

/** Normaliza o status bruto da Focus para o vocabulário da UI. */
export function normalizarStatus(raw?: string): "processando" | "autorizado" | "erro" | "cancelado" {
  switch (raw) {
    case "autorizado":
      return "autorizado";
    case "cancelado":
      return "cancelado";
    case "erro_autorizacao":
      return "erro";
    default:
      return "processando"; // processando_autorizacao e afins
  }
}

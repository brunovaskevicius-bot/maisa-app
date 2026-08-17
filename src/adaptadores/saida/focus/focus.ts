// ─────────────────────────────────────────────────────────────────────────────
// Cliente da API Focus NFe (NFS-e MUNICIPAL, /v2/nfse). SÓ SERVIDOR.
//
// ⚠️ NÃO É O CAMINHO DO NOSSO ICP. MEI emite pelo Ambiente Nacional obrigatoriamente
// desde 09/2023 — para esse caso o cliente é o `nfsen.ts` ao lado. Este arquivo serve
// quem NÃO é MEI: ME/EPP e regime normal, no formato da prefeitura.
//
// Doc: https://doc.focusnfe.com.br/reference/emitir_nfse.md
// Auth: HTTP Basic — usuário = token da EMPRESA, senha em branco.
//
// ── ⚠️ ELE NÃO LÊ MAIS `process.env` (17/08/2026) ──
//
// Antes o prestador vinha de `NF_CONFIG.prestador` — variável de ambiente, global. Com
// dois clientes no ar isso não é "configuração incompleta": é a nota de um saindo no CNPJ
// do outro. Agora o prestador é ARGUMENTO, e vem da `config_fiscal` do inquilino.
// ─────────────────────────────────────────────────────────────────────────────
import { agoraSP } from "@/nucleo/dominio/tempo";
import { soDigitos } from "@/nucleo/dominio/clientes";
import { basic, baseDoAmbiente, type EmissaoInput, type Prestador } from "./prestador";

/** Mantidos como apelido: `docs/fluxos/` e os testes citam estes nomes. */
export type TomadorInput = EmissaoInput["tomador"];
export type EmitirInput = EmissaoInput;

export type FocusResult = { httpStatus: number; data: any };

/** Monta o corpo da NFS-e a partir do input + o prestador daquele inquilino. */
function buildBody(p: Prestador, input: EmitirInput) {
  const doc = soDigitos(input.tomador.cnpj || input.tomador.cpf);
  const isCnpj = doc.length === 14;
  const codMun = soDigitos(p.codigoMunicipio);

  return {
    data_emissao: input.dataEmissao ?? agoraSP(),
    natureza_operacao: p.naturezaOperacao ?? "1",
    optante_simples_nacional: p.optanteSimples,
    prestador: {
      cnpj: soDigitos(p.cnpj),
      inscricao_municipal: p.inscricaoMunicipal,
      codigo_municipio: codMun,
    },
    tomador: {
      ...(isCnpj ? { cnpj: doc } : { cpf: doc }),
      ...(input.tomador.razaoSocial ? { razao_social: input.tomador.razaoSocial } : {}),
      ...(input.tomador.email ? { email: input.tomador.email } : {}),
      ...(soDigitos(input.tomador.telefone) ? { telefone: soDigitos(input.tomador.telefone) } : {}),
    },
    servico: {
      valor_servicos: input.valorServicos,
      iss_retido: false,
      item_lista_servico: p.itemListaServico,
      discriminacao: input.discriminacao,
      codigo_municipio: codMun,
      ...(p.aliquotaIss != null ? { aliquota: p.aliquotaIss } : {}),
      ...(p.codigoTributarioMunicipio
        ? { codigo_tributario_municipio: p.codigoTributarioMunicipio }
        : {}),
    },
  };
}

async function chamar(
  p: Prestador,
  caminho: string,
  opts: { metodo?: "GET" | "POST" | "DELETE"; corpo?: unknown } = {},
): Promise<FocusResult> {
  const res = await fetch(`${baseDoAmbiente(p.ambiente)}${caminho}`, {
    method: opts.metodo ?? "GET",
    headers: {
      Authorization: basic(p.token),
      ...(opts.corpo ? { "Content-Type": "application/json" } : {}),
    },
    ...(opts.corpo ? { body: JSON.stringify(opts.corpo) } : {}),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { httpStatus: res.status, data };
}

/** Emite a NFS-e. POST /nfse?ref=... (assíncrono → normalmente 202 processando). */
export async function emitirNfse(p: Prestador, input: EmitirInput): Promise<FocusResult> {
  return chamar(p, `/nfse?ref=${encodeURIComponent(input.ref)}`, {
    metodo: "POST",
    corpo: buildBody(p, input),
  });
}

/** Consulta a NFS-e por referência. GET /nfse/{ref}. */
export async function consultarNfse(p: Prestador, ref: string): Promise<FocusResult> {
  return chamar(p, `/nfse/${encodeURIComponent(ref)}`);
}

/**
 * Cancela a NFS-e. DELETE /nfse/{ref} — síncrono.
 * justificativa: opcional, 15–255 caracteres. Retorna { status: "cancelado" }
 * ou { status: "erro_cancelamento", erros: [...] }.
 *
 * ⚠️ Algumas prefeituras NÃO permitem cancelar por webservice — nessas, a nota só se
 * cancela no portal da cidade. É uma vantagem real do caminho nacional, onde todas as
 * cidades aderentes aceitam.
 */
export async function cancelarNfse(p: Prestador, ref: string, justificativa?: string): Promise<FocusResult> {
  const j = justificativa && justificativa.length >= 15 ? justificativa.slice(0, 255) : undefined;
  return chamar(p, `/nfse/${encodeURIComponent(ref)}`, {
    metodo: "DELETE",
    ...(j ? { corpo: { justificativa: j } } : {}),
  });
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

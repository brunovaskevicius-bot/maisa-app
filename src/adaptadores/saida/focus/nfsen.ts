/* ─────────────────────────────────────────────────────────────────────────────
 * NFS-e NACIONAL — o DPS em `/v2/nfsen`. ⚠️ SÓ SERVIDOR.
 *
 * ★ É ESTE O CAMINHO DO NOSSO ICP, e o `focus.ts` ao lado não é.
 *
 *   "Para MEI a emissão via Ambiente Nacional é obrigatória, independente do município,
 *    desde setembro de 2023."      — focusnfe.com.br/guides/nfse/.../municipios-da-nfse-nacional
 *
 * Barbeiro e terapeuta autônomo são MEI. O `focus.ts` fala com a prefeitura no formato
 * dela, o que é certo para uma clínica com CNPJ de ME — e errado para quase todo mundo
 * que a MAISA vende.
 *
 * ⚠️ O MODO DE FALHA DE USAR O CAMINHO ERRADO É TRAIÇOEIRO. A Focus aceita a emissão e
 * devolve 202 "processando". A recusa vem depois, no `GET`, com o vocabulário da Receita.
 * Quem estiver olhando a tela vê "processando" e conclui que está lento.
 *
 * ── O DPS PEDE MENOS COISA, E ISSO É O PONTO ──
 *
 *   nacional  → cnpj_prestador · codigo_municipio_* · codigo_tributacao_nacional_iss
 *   municipal → cnpj + inscricao_municipal + item_lista_servico + codigo_tributario
 *
 * Não existe `inscricao_municipal` no DPS — o guia manda até SUPRIMIR o campo quando a
 * prefeitura não cadastrou a IM no ambiente nacional. E o código de serviço é o nacional,
 * de tabela única, em vez do "formato próprio" de cada cidade. Duas perguntas que o
 * onboarding não faz.
 *
 * Doc: doc.focusnfe.com.br/reference/emitir_dps_nacional
 * Campos completos: campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html
 * ────────────────────────────────────────────────────────────────────────────── */

import { agoraSP, hojeISO } from "@/nucleo/dominio/tempo";
import { soDigitos } from "@/nucleo/dominio/clientes";
import {
  ISS_TRIBUTAVEL, basic, baseDoAmbiente, opcaoSimplesNacional,
  type EmissaoInput, type Prestador,
} from "./prestador";

export type RespostaFocus = { httpStatus: number; data: any };

async function chamar(
  p: Prestador,
  caminho: string,
  opts: { metodo?: "GET" | "POST" | "DELETE"; corpo?: unknown } = {},
): Promise<RespostaFocus> {
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

/**
 * Monta o DPS.
 *
 * `numero_dps` e `serie_dps` ficam FORA de propósito: a Focus calcula sozinha
 * (`proximo_numero_nfsen_*` no cadastro da empresa). Numerar do nosso lado significaria
 * manter um contador por inquilino em sincronia com o dela — e o primeiro furo nessa
 * sincronia é uma numeração repetida, que a Receita recusa e que ninguém consegue
 * consertar sem falar com a prefeitura.
 */
function corpoDoDps(p: Prestador, input: EmissaoInput) {
  const doc = soDigitos(input.tomador.cnpj || input.tomador.cpf);
  const municipio = soDigitos(p.codigoMunicipio);

  return {
    data_emissao: input.dataEmissao ?? agoraSP(),
    /* Competência é a data em que o serviço foi PRESTADO, não a da emissão. Para a MAISA
     * as duas coincidem — a nota sai do atendimento que acabou de acontecer. `hojeISO`
     * já responde no fuso de São Paulo, que é o que a Receita espera. */
    data_competencia: hojeISO(),

    cnpj_prestador: soDigitos(p.cnpj),
    codigo_municipio_emissora: municipio,
    codigo_municipio_prestacao: municipio,
    codigo_opcao_simples_nacional: opcaoSimplesNacional(p),

    /* ⚠️ Só um dos dois, nunca os dois. Mandar `cpf_tomador` vazio junto com
     * `cnpj_tomador` faz a validação do layout reclamar do campo vazio, não do cheio. */
    ...(doc.length === 14 ? { cnpj_tomador: doc } : doc ? { cpf_tomador: doc } : {}),

    codigo_tributacao_nacional_iss: p.codigoTributacaoNacional ?? "",
    descricao_servico: input.discriminacao,
    valor_servico: input.valorServicos,
    tributacao_iss: ISS_TRIBUTAVEL,
  };
}

/** Emite. `POST /nfsen?ref=` — assíncrono, normalmente 202 `processando_autorizacao`. */
export async function emitirDps(p: Prestador, input: EmissaoInput): Promise<RespostaFocus> {
  return chamar(p, `/nfsen?ref=${encodeURIComponent(input.ref)}`, {
    metodo: "POST",
    corpo: corpoDoDps(p, input),
  });
}

/** Consulta por referência. `GET /nfsen/{ref}`. É aqui que a recusa da Receita aparece. */
export async function consultarDps(p: Prestador, ref: string): Promise<RespostaFocus> {
  return chamar(p, `/nfsen/${encodeURIComponent(ref)}`);
}

/**
 * Cancela. `DELETE /nfsen/{ref}` — síncrono.
 *
 * "Todas as cidades aderentes aceitam cancelamento de NFS-e no modelo nacional" — ao
 * contrário do municipal, onde algumas prefeituras não permitem cancelar por webservice.
 * Uma vantagem real do caminho nacional, e vale registrar: no municipal existe nota que
 * só se cancela indo ao portal da cidade.
 */
export async function cancelarDps(
  p: Prestador,
  ref: string,
  justificativa?: string,
): Promise<RespostaFocus> {
  const j = justificativa && justificativa.length >= 15 ? justificativa.slice(0, 255) : undefined;
  return chamar(p, `/nfsen/${encodeURIComponent(ref)}`, {
    metodo: "DELETE",
    ...(j ? { corpo: { justificativa: j } } : {}),
  });
}

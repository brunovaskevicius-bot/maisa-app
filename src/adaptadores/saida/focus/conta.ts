/* ─────────────────────────────────────────────────────────────────────────────
 * A CONTA na Focus NFe — o que se faz com o token da CONTA, não com o da empresa.
 * ⚠️ SÓ SERVIDOR.
 *
 * Três capacidades, e todas as três existem para o cliente responder MENOS perguntas:
 *
 *   consultarCnpj      — o dono digita 14 dígitos e a Receita devolve razão social,
 *                        município, CNAE e, o que decide tudo, `optante_mei`
 *   criarEmpresa       — cadastra o CNPJ dele na nossa conta e devolve o `id`
 *   tokenDaEmpresa     — o token daquela empresa, pedido na hora de emitir
 *
 * ── POR QUE ESTE ARQUIVO É SEPARADO DE `focus.ts` ──
 *
 * Porque a IDENTIDADE é outra. `focus.ts` (NFS-e municipal) e `nfsen.ts` (DPS nacional)
 * se autenticam com o token DA EMPRESA — eles agem *como* o cliente. Aqui a autenticação
 * é o token da CONTA, e quem age é a MAISA *sobre* as empresas dela.
 *
 * Misturar as duas num cliente só é como misturar service role com sessão no Supabase: o
 * dia em que uma emissão sair autenticada pelo token da conta é o dia em que a nota de um
 * cliente sai no CNPJ de outro.
 *
 * ── ⚠️ A URL É SEMPRE PRODUÇÃO, E NÃO É BUG ──
 *
 * "esta API opera exclusivamente no ambiente de produção" — doc.focusnfe.com.br/reference/empresas
 *
 * Não existe `homologacao.focusnfe.com.br/v2/empresas`. Quem "consertar" esta constante
 * para respeitar `config_fiscal.ambiente` vai receber 404 e concluir que a rota mudou.
 * Para testar sem persistir existe `dry_run=1`, que é parâmetro daqui e não outro servidor.
 *
 * E não há perda: a empresa criada em produção já nasce com um `token_homologacao`. O
 * caminho é **cadastrar de verdade e emitir em teste** — que é mais seguro do que ter um
 * cadastro de mentira, porque o que se testa é o cadastro real.
 * ────────────────────────────────────────────────────────────────────────────── */

import { FalhaDoProvedor, NaoConfigurado } from "@/nucleo/dominio/erros";
import { soDigitos } from "@/nucleo/dominio/clientes";
import { NF_CONFIG } from "./config";

/** ⚠️ Sempre produção. Ver o cabeçalho — a API de Empresas não existe em homologação. */
const BASE = "https://api.focusnfe.com.br/v2";

/** A Receita é lenta em dia de pico, e a criação de empresa valida certificado. */
const TIMEOUT_MS = 30_000;

/* ─────────────────────────────── o transporte ─────────────────────────────── */

type Resposta = { httpStatus: number; data: any };

/**
 * Uma chamada autenticada com o token da CONTA.
 *
 * `AbortController` com `clearTimeout` no `finally`, e não `AbortSignal.timeout`: é o
 * mesmo motivo do `evolution/cliente.ts` — o timer pendurado mantém o processo acordado
 * numa função serverless que já respondeu.
 */
async function chamar(
  caminho: string,
  opts: { metodo?: "GET" | "POST" | "PUT" | "DELETE"; corpo?: unknown } = {},
): Promise<Resposta> {
  const token = NF_CONFIG.token;
  if (!token) throw new NaoConfigurado(["FOCUS_NFE_TOKEN"]);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${caminho}`, {
      method: opts.metodo ?? "GET",
      headers: {
        // Basic com o token como usuário e senha VAZIA — os dois pontos com nada
        // depois são parte do esquema, não um typo. Ver /reference/autenticacao.
        Authorization: "Basic " + Buffer.from(token + ":").toString("base64"),
        ...(opts.corpo ? { "Content-Type": "application/json" } : {}),
      },
      ...(opts.corpo ? { body: JSON.stringify(opts.corpo) } : {}),
      signal: ac.signal,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { httpStatus: res.status, data };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new FalhaDoProvedor(`A Focus não respondeu em ${TIMEOUT_MS}ms.`, e);
    }
    throw new FalhaDoProvedor("Erro de conexão com a Focus NFe.", e);
  } finally {
    clearTimeout(timer);
  }
}

/** A primeira mensagem de erro da Focus, ou o padrão. A UI mostra isto literalmente. */
function motivo(data: any, padrao: string): string {
  const e = data?.erros;
  if (Array.isArray(e) && e.length) {
    return e.map((x: any) => [x?.campo, x?.mensagem].filter(Boolean).join(": ")).join(" · ");
  }
  return data?.mensagem ?? padrao;
}

/* ─────────────────────────── 1 · consulta de CNPJ ─────────────────────────── */

/**
 * O que a Receita sabe sobre um CNPJ.
 *
 * ★ É ESTE ENDPOINT QUE TIRA SETE PERGUNTAS DO ONBOARDING. Razão social, município,
 * CNAE e regime vêm dos 14 dígitos — ninguém digita endereço.
 */
export type CadastroDoCnpj = {
  cnpj: string;
  razaoSocial: string | null;
  situacao: string | null;
  cnae: string | null;
  /** ⚠️ O campo que escolhe o caminho de emissão: MEI vai pelo DPS nacional, sempre. */
  optanteMei: boolean;
  optanteSimples: boolean;
  /** IBGE de 7 dígitos, já como a `config_fiscal.codigo_municipio` quer. */
  codigoMunicipio: string | null;
  municipio: string | null;
  uf: string | null;
};

export async function consultarCnpj(cnpj: string): Promise<CadastroDoCnpj | null> {
  const d = soDigitos(cnpj);
  if (d.length !== 14) throw new FalhaDoProvedor("CNPJ precisa ter 14 dígitos.");

  const { httpStatus, data } = await chamar(`/cnpjs/${d}`);

  /* 404 é resposta, não falha: CNPJ que não existe é o erro de digitação mais comum, e
   * quem chama transforma isso em "não achei esse CNPJ" em vez de "erro no provedor". */
  if (httpStatus === 404) return null;
  if (httpStatus >= 400) {
    throw new FalhaDoProvedor(motivo(data, `A Focus recusou a consulta de CNPJ (${httpStatus}).`));
  }

  const end = data?.endereco ?? {};
  return {
    cnpj: d,
    razaoSocial: data?.razao_social ?? null,
    situacao: data?.situacao_cadastral ?? null,
    cnae: data?.cnae_principal ?? null,
    optanteMei: data?.optante_mei === true,
    optanteSimples: data?.optante_simples_nacional === true,
    /* `codigo_ibge` é o de 7 dígitos. `codigo_municipio` no mesmo objeto é o código
     * do MUNICÍPIO NA TABELA DA FOCUS (4 dígitos no exemplo da doc) — pegar o errado
     * faz a prefeitura recusar com "município inválido", que não aponta para cá. */
    codigoMunicipio: end.codigo_ibge ? String(end.codigo_ibge) : null,
    municipio: end.nome_municipio ?? null,
    uf: end.uf ?? null,
  };
}

/* ────────────────────────── 2 · criação de empresa ────────────────────────── */

/** O mínimo para cadastrar quem vai emitir. Tudo isto sai da consulta de CNPJ. */
export type RascunhoDeEmpresa = {
  cnpj: string;
  nome: string;
  /** 1 Simples · 2 excesso de sublimite · 3 normal · 4 MEI. Ver `regimeDe`. */
  regimeTributario: number;
  email?: string | null;
  municipio?: string | null;
  uf?: string | null;
  /** true → habilita o caminho nacional; false → o municipal. */
  nacional: boolean;
};

export type EmpresaNaFocus = {
  id: number;
  cnpj: string | null;
  /** Vencimento do certificado A1. `null` = nenhum certificado subiu ainda. */
  certificadoValidoAte: string | null;
  certificadoCnpj: string | null;
  habilitaNfse: boolean;
  habilitaNfsenHomologacao: boolean;
  habilitaNfsenProducao: boolean;
};

/** O `regime_tributario` da Focus a partir do que a Receita respondeu. */
export function regimeDe(c: Pick<CadastroDoCnpj, "optanteMei" | "optanteSimples">): number {
  if (c.optanteMei) return 4;
  if (c.optanteSimples) return 1;
  return 3;
}

function corpoDaEmpresa(r: RascunhoDeEmpresa) {
  return {
    cnpj: soDigitos(r.cnpj),
    nome: r.nome,
    regime_tributario: r.regimeTributario,
    ...(r.email ? { email: r.email } : {}),
    ...(r.municipio ? { municipio: r.municipio } : {}),
    ...(r.uf ? { uf: r.uf } : {}),

    /* ⚠️ OS TRÊS FLAGS SÃO EXCLUDENTES DOIS A DOIS, e a Focus aceita a combinação
     * inválida sem reclamar — a recusa aparece depois, na validação da Receita.
     *
     *   "Não pode estar habilitado simultaneamente com NFSe Nacional em produção"
     *                                            — descrição de habilita_nfse na doc
     *
     * `habilita_nfsen_producao` fica FALSO aqui, sempre. Produção é uma virada
     * deliberada depois de uma emissão de teste que deu certo — nunca o estado em que
     * uma empresa nasce. Errar isso significa a primeira nota de teste do cliente
     * saindo com validade fiscal e precisando ser cancelada na prefeitura. */
    habilita_nfse: !r.nacional,
    habilita_nfsen_homologacao: r.nacional,
    habilita_nfsen_producao: false,

    /* Quem manda o e-mail com a nota é a MAISA, pelo WhatsApp e pelo painel. Deixar a
     * Focus mandar também faria o cliente receber a mesma nota duas vezes, por dois
     * remetentes, e um deles sem a nossa marca. */
    enviar_email_destinatario: false,
  };
}

function leEmpresa(data: any): EmpresaNaFocus {
  return {
    id: Number(data?.id),
    cnpj: data?.cnpj ?? null,
    certificadoValidoAte: data?.certificado_valido_ate ?? null,
    certificadoCnpj: data?.certificado_cnpj ?? null,
    habilitaNfse: data?.habilita_nfse === true,
    habilitaNfsenHomologacao: data?.habilita_nfsen_homologacao === true,
    habilitaNfsenProducao: data?.habilita_nfsen_producao === true,
  };
}

/**
 * Cadastra a empresa. `simular: true` manda `dry_run=1` — valida tudo e não persiste.
 *
 * ⚠️ NÃO É IDEMPOTENTE. Chamar duas vezes com o mesmo CNPJ cria (ou recusa) duas vezes,
 * e CNPJ duplicado na conta é confusão que só se resolve à mão no painel da Focus. Quem
 * chama grava o `id` ANTES de qualquer outra coisa poder falhar.
 */
export async function criarEmpresa(
  r: RascunhoDeEmpresa,
  opts: { simular?: boolean } = {},
): Promise<EmpresaNaFocus> {
  const q = opts.simular ? "?dry_run=1" : "";
  const { httpStatus, data } = await chamar(`/empresas${q}`, { metodo: "POST", corpo: corpoDaEmpresa(r) });

  if (httpStatus >= 400) {
    throw new FalhaDoProvedor(motivo(data, `A Focus recusou o cadastro da empresa (${httpStatus}).`));
  }
  return leEmpresa(data);
}

/** Estado atual da empresa — é como se descobre que o certificado subiu e até quando vale. */
export async function consultarEmpresa(id: number): Promise<EmpresaNaFocus | null> {
  const { httpStatus, data } = await chamar(`/empresas/${id}`);
  if (httpStatus === 404) return null;
  if (httpStatus >= 400) {
    throw new FalhaDoProvedor(motivo(data, `A Focus recusou a consulta da empresa (${httpStatus}).`));
  }
  return leEmpresa(data);
}

/**
 * Sobe o certificado A1 do cliente.
 *
 * ★ O ARQUIVO ATRAVESSA E VAI EMBORA. Chega na requisição, vira base64, sobe para a
 * Focus, e o que fica no nosso lado é o vencimento que a resposta devolve.
 *
 * ⚠️ Não é economia de banco. Um e-CNPJ assina contrato e abre o e-CAC da empresa: é a
 * identidade jurídica do cliente, não uma credencial de API. Guardar o `.pfx` seria
 * assumir a guarda de algo que não precisamos ter para o produto funcionar — e nada
 * neste código deve poder tocá-lo depois desta função retornar.
 */
export async function subirCertificado(
  id: number,
  p: { pfxBase64: string; senha: string },
): Promise<EmpresaNaFocus> {
  const { httpStatus, data } = await chamar(`/empresas/${id}`, {
    metodo: "PUT",
    corpo: { arquivo_certificado_base64: p.pfxBase64, senha_certificado: p.senha },
  });

  /* 422 é o caso comum e merece a mensagem da Focus intacta: senha errada, certificado
   * vencido, e o clássico "o CNPJ do certificado não é o da empresa" — que acontece
   * quando o cliente sobe o e-CPF dele em vez do e-CNPJ. */
  if (httpStatus >= 400) {
    throw new FalhaDoProvedor(motivo(data, `A Focus recusou o certificado (${httpStatus}).`));
  }
  return leEmpresa(data);
}

/* ──────────────────────── 3 · o token daquela empresa ──────────────────────── */

/**
 * O token de emissão daquela empresa, no ambiente pedido.
 *
 * ★ POR ISSO NÃO GUARDAMOS TOKEN NO NOSSO BANCO. A Focus devolve por API quando
 * perguntamos com o token da conta — gravar seria duplicar um segredo que já tem dono,
 * e assumir a chave de criptografia, a rotação e o vazamento de graça.
 *
 * Devolve `null` quando a empresa existe mas não tem token naquele ambiente (acontece
 * antes de o ambiente estar habilitado). Quem chama trata como "ainda não dá para
 * emitir aqui" — que é diferente de erro.
 */
export async function tokenDaEmpresa(
  id: number,
  ambiente: "homologacao" | "producao",
): Promise<string | null> {
  const { httpStatus, data } = await chamar(`/empresas/${id}`);
  if (httpStatus === 404) return null;
  if (httpStatus >= 400) {
    throw new FalhaDoProvedor(motivo(data, `A Focus recusou a consulta da empresa (${httpStatus}).`));
  }
  const t = ambiente === "producao" ? data?.token_producao : data?.token_homologacao;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

/** O que falta no ambiente para isto tudo funcionar. Vazio = dá para chamar. Nunca lança. */
export function contaFaltando(): string[] {
  return NF_CONFIG.token ? [] : ["FOCUS_NFE_TOKEN"];
}

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

  /* ── ⚠️ ESTES DOIS DESCEM PARA CÁ, e antes eram getters da porta `EmissorFiscal` ──
   *
   * `emissor.ambiente` e `emissor.simulado` eram propriedades do EMISSOR, sem inquilino:
   * uma resposta só, para todo mundo. Isso já era falso antes de existir o segundo
   * cliente, porque o ambiente é escolha de cada negócio — um pode estar testando em
   * homologação enquanto o outro fatura de verdade.
   *
   * O modo de falha era a mentira mais cara possível numa tela fiscal: a rota respondia
   * `ambiente: "homologacao"` (o do env) para uma nota que saiu em PRODUÇÃO, e o dono
   * lia "isto é teste" sobre um documento com validade fiscal.
   *
   * Aqui eles não podem divergir: descrevem a emissão que acabou de acontecer. */

  /** Onde esta nota saiu. `homologacao` não tem efeito fiscal. */
  ambiente?: AmbienteFiscal;
  /** Saiu sem emissor de verdade — fluxo inteiro exercitado, documento nenhum criado. */
  simulado?: boolean;
};

/* ─────────────────────────────────────────────────────────────────────────────
 * QUEM EMITE — a configuração fiscal de um inquilino.
 *
 * ★ O CAMINHO DE EMISSÃO É DECIDIDO POR `optanteMei`, E NÃO É PERGUNTA DE TELA.
 *
 *   "Para MEI a emissão via Ambiente Nacional é obrigatória, independente do município,
 *    desde setembro de 2023."   — guia dos municípios da NFS-e Nacional, Focus NFe (2026)
 *
 * O ICP da MAISA — barbeiro, terapeuta autônomo — é quase todo MEI. O caminho municipal,
 * para o qual `config_fiscal` foi desenhada em 002, **não vale para a maioria**. E errar
 * não dá erro na emissão: dá 202 "processando" e uma recusa da Receita minutos depois.
 *
 * `optanteMei` vem da consulta de CNPJ (Receita, via Focus). O dono digita 14 dígitos e
 * não responde mais nada — é a razão de este tipo existir em vez de um formulário.
 * ────────────────────────────────────────────────────────────────────────────── */

export type AmbienteFiscal = "homologacao" | "producao";

/**
 * O que a Receita sabe sobre um CNPJ.
 *
 * ★ É ESTE TIPO QUE TIRA SETE PERGUNTAS DO ONBOARDING. Razão social, município, CNAE e
 * regime vêm dos 14 dígitos — ninguém digita endereço, e ninguém é perguntado se é MEI.
 *
 * Mora no DOMÍNIO e não na porta do provedor porque não é vocabulário de provedor: é o
 * cadastro público de uma empresa brasileira. Qualquer emissor que trocássemos devolveria
 * as mesmas coisas, porque a fonte é a mesma Receita.
 */
export type CadastroDoCnpj = {
  cnpj: string;
  razaoSocial: string | null;
  /** "ativa", "baixada"… Nota não sai de CNPJ que não está ativo. */
  situacao: string | null;
  cnae: string | null;
  /** ⚠️ Escolhe o caminho de emissão — ver `caminhoDaNota`. */
  optanteMei: boolean;
  optanteSimples: boolean;
  /** IBGE, 7 dígitos. */
  codigoMunicipio: string | null;
  municipio: string | null;
  uf: string | null;
};

/** Por qual caminho a nota sai. Derivado, nunca escolhido à mão — ver `caminhoDaNota`. */
export type CaminhoFiscal =
  /** DPS no Ambiente Nacional. MEI hoje; Simples a partir de 11/2026. */
  | "nacional"
  /** NFS-e no formato da prefeitura. */
  | "municipal";

export type ConfigFiscal = {
  ambiente: AmbienteFiscal;
  /** Só dígitos, 14. `null` enquanto o dono não ligou a nota fiscal. */
  cnpj: string | null;
  razaoSocial: string | null;
  /** IBGE, 7 dígitos. */
  codigoMunicipio: string | null;
  optanteMei: boolean;
  optanteSimples: boolean;
  /** O `id` da empresa na Focus. `null` = ela ainda não foi cadastrada lá. */
  empresaId: number | null;
  /** Vencimento do certificado A1. `null` = nenhum certificado subiu. */
  certificadoValidoAte: string | null;

  /* ── caminho nacional ── */
  codigoTributacaoNacional: string | null;

  /* ── caminho municipal ── */
  inscricaoMunicipal: string | null;
  itemListaServico: string | null;
  aliquotaIss: number | null;
  codigoTributarioMunicipio: string | null;
};

/** Por onde esta nota tem que sair. */
export function caminhoDaNota(c: Pick<ConfigFiscal, "optanteMei">): CaminhoFiscal {
  return c.optanteMei ? "nacional" : "municipal";
}

/**
 * O que ainda falta para emitir de verdade — em português, para a tela.
 *
 * ⚠️ ESPELHA `fiscal_configurado()` do 014, e a duplicação é deliberada: o banco responde
 * para a view `v_negocio` (que a tela lê de uma vez) e esta função responde a frase. O que
 * NÃO pode divergir é o conjunto de condições, e é isso que o teste ao lado prende.
 *
 * Vazio = dá para emitir.
 */
export function fiscalFaltando(c: ConfigFiscal, hoje: string): string[] {
  const falta: string[] = [];

  if (!c.cnpj) falta.push("o CNPJ de quem emite");
  if (!c.codigoMunicipio) falta.push("o município do CNPJ");
  if (!c.empresaId) falta.push("cadastrar o CNPJ no emissor");

  /* O certificado é o que assina, e é o único passo que depende do cliente trazer algo.
   * Vencido conta como ausente: a assinatura falha e a mensagem da Receita não diz
   * "venceu ontem" — ela fala de assinatura inválida, que manda procurar no lugar errado. */
  if (!c.certificadoValidoAte) falta.push("o certificado digital da empresa");
  else if (c.certificadoValidoAte < hoje) falta.push("renovar o certificado digital (venceu)");

  if (caminhoDaNota(c) === "nacional") {
    if (!c.codigoTributacaoNacional) falta.push("o código do serviço");
  } else {
    if (!c.inscricaoMunicipal) falta.push("a inscrição municipal");
    if (!c.itemListaServico) falta.push("o código do serviço na prefeitura");
  }

  return falta;
}

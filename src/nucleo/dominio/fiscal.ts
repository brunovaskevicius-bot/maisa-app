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

/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE FALTA FATURAR — e por que a unidade é o ATENDIMENTO, não o cliente.
 *
 * ★ A RECLAMAÇÃO DO BRUNO (14/08/2026), que este tipo existe para resolver:
 *   "a lógica da página de faturamento está errada. ela deve ser diretamente atrelada à tela
 *    de agendamentos, e deve ser totalmente calculada com base no tanto de agendamentos que
 *    foram feitos desde a última emissão de notas. além disso, ela deve contabilizar os casos
 *    em que uma única pessoa teve a nota emitida, e tirar essa pessoa da emissão em massa."
 *
 * Antes o "já emitiu" morava no `localStorage`, mapeado POR CLIENTE — não por período. Três
 * consequências, todas medidas lendo o código: trocar de navegador ressuscitava o botão; quem
 * teve nota em agosto nunca mais aparecia como pendente; e a soma vinha do total da
 * competência, então emitir duas vezes no mês cobrava o mês inteiro nas duas.
 *
 * Agora a pergunta é `atendimentos.nota_id is null`, e ela responde as DUAS metades da
 * reclamação de uma vez: já significa "desde a última emissão", e já exclui quem tem nota.
 * ────────────────────────────────────────────────────────────────────────────── */

export type AFaturar = {
  clienteId: string;
  nome: string;
  /** Documento do tomador. Vazio bloqueia a emissão — a prefeitura exige. */
  cpf: string | null;
  /** Quantos atendimentos já prestados estão sem nota. Nunca zero. */
  atendimentos: number;
  valor: number;
  /** O serviço mais frequente do período — é o que vai na discriminação. */
  servico: string | null;
  /** Do primeiro ao último atendimento sem nota, em data civil. */
  desde: string;
  ate: string;
  competencia: string;
  /** Cliente de teste fiscal. Fica fora do lote — ver `RepositorioNotas.aFaturar`. */
  teste: boolean;
};

/** Uma nota como está no banco. */
export type NotaGravada = Nota & {
  id: string;
  clienteId: string | null;
  /**
   * O nome de quem recebeu, como estava NA EMISSÃO.
   *
   * ⚠️ Vem do snapshot da nota, e não de um join com `clientes`. Nota fiscal autorizada é
   * documento imutável: ela não pode passar a mostrar outro nome porque alguém corrigiu o
   * cadastro depois. É a mesma razão de `notas` não ter FK para `clientes`.
   */
  tomadorNome: string | null;
  valor: number;
  competencia: string | null;
  ambiente: AmbienteFiscal | null;
};

/**
 * O texto que a prefeitura IMPRIME no documento.
 *
 * Mora no núcleo, e não na tela, porque foi na tela que ele já saiu errado uma vez: o store
 * montava a frase com um nome de serviço do catálogo VIVO, e a nota saía com o nome que o
 * dono tinha acabado de trocar — descrevendo um serviço diferente do que foi prestado.
 *
 * Aqui a fonte é o snapshot do atendimento (`AFaturar.servico`), que não muda depois.
 */
export function discriminacaoDaNota(a: Pick<AFaturar, "servico" | "atendimentos" | "competencia">): string {
  const quantos = `${a.atendimentos} ${a.atendimentos === 1 ? "atendimento" : "atendimentos"}`;
  const mes = a.competencia ? a.competencia.slice(0, 7).split("-").reverse().join("/") : "";
  /* "Corte de cabelo — 3 atendimentos · 08/2026". Serviço separado por travessão, período
   * por ponto médio: é o formato que já estava saindo nas notas, e mudá-lo mudaria o texto
   * de documentos futuros sem motivo. */
  const cabeca = [a.servico?.trim() || "Prestação de serviço", quantos].join(" — ");
  return mes ? `${cabeca} · ${mes}` : cabeca;
}

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
  status:
    | "processando" | "autorizado" | "cancelado" | "erro" | "simulado"
    /**
     * ⚠️ NÃO É ERRO, e é por isso que tem nome próprio.
     *
     * A claim (`RepositorioNotas.abrir`) não encontrou atendimento sem nota: outra aba, ou o
     * segundo clique, chegou primeiro e já prendeu tudo. Tratar isso como `erro` faria o dono
     * clicar de novo procurando entender — e é justamente o clique que a claim existe para
     * tornar inofensivo. A tela mostra "já faturado" e recarrega a lista.
     */
    | "ja_faturado";
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

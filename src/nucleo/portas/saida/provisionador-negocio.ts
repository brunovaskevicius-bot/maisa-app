/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — criar o inquilino.
 *
 * É a porta que faltava para a MAISA se vender sozinha. Até hoje, entre "criei a
 * conta" e "tenho um negócio" havia um humano rodando SQL: o resolvedor de contexto
 * respondia, para o usuário final, `"Rode criar_negocio() no Supabase"`.
 *
 * ⚠️ ESTA É A ÚNICA PORTA DO APP QUE NÃO RECEBE `ContextoTenant` — e não é descuido.
 * Toda porta de dados recebe o inquilino porque age DENTRO de um. Esta PRODUZ o
 * inquilino: no instante da chamada ele ainda não existe. O que ela recebe é a
 * identidade da sessão, e é justamente por isso que o nome do argumento é `sessao` e
 * não `t` — para que nenhum leitor futuro "corrija" a assinatura por simetria.
 *
 * ── POR QUE UMA PORTA, SE NO FIM É UM `rpc()` DE UMA LINHA ──
 *
 * Porque provisionar é a operação mais consequente do produto: cria negócio, membro
 * dono, assinatura em trial, assistente, expediente, catálogo e FAQs — numa transação.
 * Quando ela for testada (e ela precisa ser: é o caminho de todo cliente novo), o teste
 * não pode depender de um Postgres de pé. Um fake que satisfaz esta interface responde
 * `limite_de_negocios` sem banco nenhum.
 *
 * E porque o adaptador de demonstração TAMBÉM tem que respondê-la. Sem isso, o fluxo de
 * cadastro seria a única parte do app que não abre sem Supabase — e é a parte que mais
 * precisa ser afinada por `curl`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { TenantId } from "../../dominio/tenant";
import type { Vertical } from "../../dominio/negocio";

/** Quem está criando. Vem do cookie de sessão, nunca do corpo do request. */
export type IdentidadeDaSessao = { usuarioId: string };

export type PedidoDeNegocio = {
  nome: string;
  vertical: Vertical;
  /**
   * Nome do primeiro profissional. Opcional: quando vem vazio, o banco usa o nome do
   * negócio. Existe porque o caso mais comum — o terapeuta ou barbeiro sozinho — é
   * exatamente aquele em que o nome do negócio e o da pessoa são coisas diferentes
   * ("Espaço Aurora" atendido pela "Carla"), e corrigir isso depois é edição em duas
   * telas.
   */
  profissional?: string;
};

/**
 * Resultado explícito em vez de exceção para o caso esperado.
 *
 * `limite_de_negocios` não é erro de programação nem falha de infraestrutura: é uma
 * regra do banco (teto de 10 por pessoa, `005_provisionar.sql:299`) que a tela precisa
 * mostrar como frase. Exceção seria transformar uma resposta prevista em acidente.
 *
 * O que continua sendo exceção: banco fora do ar, RPC ausente, sessão inválida. Isso
 * sobe como `FalhaDoProvedor`/`NaoConfigurado` e vira 4xx/5xx em `respostas.ts`.
 */
export type NegocioCriado =
  | { ok: true; tenantId: TenantId }
  | { ok: false; motivo: "limite_de_negocios" };

export interface ProvisionadorDeNegocio {
  criar(sessao: IdentidadeDaSessao, p: PedidoDeNegocio): Promise<NegocioCriado>;

  /** O que falta no ambiente para esta porta funcionar. Vazio = pronta. */
  faltando(): string[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * TENANT — de quem é o dado.
 *
 * A MAISA é um produto multi-inquilino por natureza: o MESMO app atende terapeutas
 * e barbeiros, e cada assinante é um negócio isolado dos outros. Hoje o app roda com
 * UM negócio só (os dados de demonstração), e é justamente por isso que este arquivo
 * existe agora: o contexto do inquilino atravessa TODA porta de saída desde já, então
 * plugar o banco multi-tenant depois é trocar um adaptador — não caçar `where` faltando
 * em vinte lugares.
 *
 * ⚠️ A regra que não se negocia: nenhuma função de aplicação recebe `tenantId` vindo
 * do corpo do request, da query string ou de um argumento do agente de IA. O contexto
 * nasce SEMPRE da sessão autenticada (ver adaptadores/entrada/http/contexto.ts). Foi
 * exatamente esse descuido — id de inquilino vindo por query param — que abriu o pior
 * furo da integração original, onde bastava conhecer o id da vítima para sobrescrever
 * a agenda dela.
 * ────────────────────────────────────────────────────────────────────────────── */

export type TenantId = string;

/**
 * Quem está pedindo, e em nome de qual negócio.
 *
 * `tenantId` — o negócio (a assinatura). Hoje é igual ao `usuarioId`: um login, um
 *   negócio. Quando existir a tabela de negócios e membros, ele passa a vir de lá e
 *   deixa de coincidir — nada além do resolvedor de contexto precisa mudar.
 * `usuarioId` — a pessoa logada. Serve para auditoria e para as políticas de RLS que
 *   hoje comparam com `auth.uid()`.
 * `ator` — QUEM disparou a ação. O agente de WhatsApp vai agir em nome do negócio sem
 *   ninguém logado na tela, e um atendimento criado pela IA precisa ser distinguível
 *   de um criado à mão — para auditar, para desfazer e para medir.
 */
export type ContextoTenant = {
  tenantId: TenantId;
  usuarioId: string;
  ator: Ator;
};

export type Ator =
  | { tipo: "usuario"; id: string }
  /** O agente de IA agindo sozinho. `canal` diz por onde a conversa entrou. */
  | { tipo: "agente"; canal: "whatsapp"; conversaId?: string }
  /** Rotina automática (lembrete, cobrança de confirmação, fechamento do mês). */
  | { tipo: "sistema"; rotina: string };

/**
 * O contexto de uma agenda específica dentro do inquilino.
 *
 * `agendaId` é hoje o id do profissional (`pr1`), porque uma pessoa = uma agenda. Ele
 * é um conceito à parte de propósito: quando um negócio tiver cadeira, sala ou dois
 * profissionais dividindo o mesmo Google, "de quem é a agenda" e "quem atende" deixam
 * de ser a mesma pergunta.
 */
export type ContextoAgenda = {
  tenant: ContextoTenant;
  agendaId: string;
};

export const atorUsuario = (id: string): Ator => ({ tipo: "usuario", id });
export const atorAgente = (conversaId?: string): Ator => ({ tipo: "agente", canal: "whatsapp", conversaId });

/** Rótulo curto do ator, para gravar em descrição de evento e em log. */
export function rotuloDoAtor(a: Ator): string {
  if (a.tipo === "agente") return "MAISA (WhatsApp)";
  if (a.tipo === "sistema") return `rotina ${a.rotina}`;
  return "painel";
}

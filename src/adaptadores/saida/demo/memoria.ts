/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — memória, histórico e canal, em MEMÓRIA DE PROCESSO.
 *
 * ⚠️ LIMITAÇÃO DECLARADA, NÃO ESQUECIMENTO. Um `Map` de módulo:
 *   • morre no redeploy — o cliente vira desconhecido de novo;
 *   • não é compartilhado entre instâncias — na Vercel, duas mensagens seguidas podem
 *     cair em lambdas diferentes e a segunda não lembra da primeira.
 *
 * Isso é aceitável para EXERCITAR o agente (é o que faz `npm run dev` responder hoje)
 * e inaceitável em produção. A tabela de verdade já está versionada em
 * `supabase/007_memoria_agente.sql`; o que falta é um `saida/supabase/memoria.ts` e
 * uma linha em `composicao.ts`.
 *
 * Escrevemos o adaptador falso em vez de deixar a porta sem implementação porque
 * porta sem adaptador não roda, e agente que não roda não recebe feedback — e o
 * feedback é a única coisa que ajusta o tom de um agente conversacional.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { RepositorioHistorico, RepositorioMemoria } from "@/nucleo/portas/saida/memoria-cliente";
import type { CanalDeMensagens } from "@/nucleo/portas/saida/canal-mensagens";
import type { MemoriaCliente } from "@/nucleo/dominio/memoria";
import type { Msg } from "@/nucleo/dominio/conversas";

/* A chave inclui o tenant mesmo havendo um negócio só. Não é cerimônia: é o que faz
 * este adaptador ter o MESMO comportamento observável que o do Supabase vai ter. Um
 * dublê que ignora o inquilino esconde exatamente o bug que o multi-tenant introduz. */
const chave = (tenantId: string, telefone: string) => `${tenantId}::${telefone}`;

const PERFIS = new Map<string, MemoriaCliente>();
const THREADS = new Map<string, Msg[]>();

/** Teto do log em memória. Sem ele, uma conversa longa segura RAM do processo
 *  indefinidamente — e ninguém repara, porque não aparece em lugar nenhum. */
const MAX_GUARDADO = 200;

export const memoriaDemo: RepositorioMemoria = {
  async ler(t, telefone) {
    // Cópia defensiva: o núcleo trata memória como imutável, e devolver a referência
    // do Map faria uma mutação acidental "funcionar" aqui e falhar contra o banco.
    const m = PERFIS.get(chave(t.tenantId, telefone));
    return m ? { ...m, historico: [...m.historico] } : null;
  },

  async gravar(t, m) {
    PERFIS.set(chave(t.tenantId, m.telefone), { ...m, historico: [...m.historico] });
  },
};

export const historicoDemo: RepositorioHistorico = {
  async ler(t, telefone, limite) {
    const todas = THREADS.get(chave(t.tenantId, telefone)) ?? [];
    return todas.slice(-limite);
  },

  async anexar(t, telefone, msgs) {
    const k = chave(t.tenantId, telefone);
    const todas = [...(THREADS.get(k) ?? []), ...msgs];
    THREADS.set(k, todas.slice(-MAX_GUARDADO));
  },
};

/**
 * Dev-only: esquece tudo. Não faz parte de nenhuma porta — é afordância deste
 * adaptador, e por isso não aparece em `RepositorioMemoria`.
 *
 * Serve ao laboratório de conversa, e o que ela destrava é específico: o caminho
 * "cliente que nunca falou com a MAISA" só é testável UMA vez por processo. Sem reset,
 * depois da primeira mensagem você nunca mais vê a saudação de desconhecido — e é
 * justamente ela que decide se a primeira impressão do produto presta.
 */
export function limparDemo() {
  PERFIS.clear();
  THREADS.clear();
}

/** Para o laboratório mostrar o que a MAISA lembra, sem passar por caso de uso. */
export function espiarMemoriaDemo(tenantId: string) {
  const prefixo = `${tenantId}::`;
  return Array.from(PERFIS.entries())
    .filter(([k]) => k.startsWith(prefixo))
    .map(([, m]) => m);
}

/**
 * O canal de saída de mentira: escreve no log do servidor.
 *
 * A rota devolve as bolhas no corpo da resposta, então dá para conversar com a MAISA
 * por `curl` sem ter Evolution API configurada — é assim que se afina o tom antes de
 * pagar por número. Quando o WhatsApp entrar, isto vira `saida/evolution/canal.ts` e
 * a troca é uma linha em `composicao.ts`.
 */
export const canalDemo: CanalDeMensagens = {
  async enviar(_t, para, textos) {
    for (const txt of textos) console.log(`[MAISA → ${para}] ${txt}`);
  },

  async escalar(_t, p) {
    // No app de verdade isto entra na fila "Precisa de você" (`dominio/conversas.ts`
    // → ItemFila) e notifica o dono. Enquanto a fila é fixture, um log honesto.
    console.warn(`[MAISA ⚠ escalou ${p.telefone}] ${p.motivo}`);
  },
};

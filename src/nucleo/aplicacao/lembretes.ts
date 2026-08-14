/* ─────────────────────────────────────────────────────────────────────────────
 * CASO DE USO — enviar os lembretes que estão na hora.
 *
 * A rotina. Não tem sessão, não tem tela e não tem inquilino de entrada: ela pergunta à
 * fila quem precisa de lembrete agora, e trata cada resposta como um inquilino próprio.
 *
 * ── ONDE O ISOLAMENTO É REFEITO ──
 *
 * A varredura é cross-tenant (ver `portas/saida/fila-de-lembretes.ts`), e é a única coisa
 * no sistema que é. A partir da linha `contextoDeSistema`, tudo volta ao normal: cada
 * envio carrega um `ContextoTenant` do inquilino DAQUELA linha, com ator `sistema` — que
 * é o terceiro ator previsto em `dominio/tenant.ts` desde o começo, com o comentário
 * "rotina automática (lembrete, cobrança de confirmação, fechamento do mês)".
 *
 * O `tenantId` vem do BANCO, junto do atendimento. Nunca de um parâmetro: um `tenantId`
 * de entrada aqui seria um jeito de fazer a rotina falar pelo WhatsApp de outra pessoa.
 *
 * ── UMA FALHA NÃO DERRUBA AS OUTRAS ──
 *
 * Cada lembrete é independente: um inquilino com o WhatsApp desconectado não pode impedir
 * que os outros recebam. O erro dele devolve a reserva e entra no relatório; a varredura
 * segue. Uma exceção que subisse daqui abortaria o lote inteiro e faria o primeiro
 * inquilino com problema silenciar todos os demais.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { EnviarLembretes, ResultadoDaRotina } from "../portas/entrada/casos-de-uso";
import type { CanalDeMensagens } from "../portas/saida/canal-mensagens";
import type { FilaDeLembretes } from "../portas/saida/fila-de-lembretes";
import type { RepositorioAssistente } from "../portas/saida/repositorio-assistente";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import type { ContextoTenant } from "../dominio/tenant";
import { janelaDeLembrete, textoDoLembrete } from "../dominio/lembretes";

/**
 * Teto de lembretes por rodada.
 *
 * Existe por causa do relógio da plataforma, não do banco: a função serverless tem tempo
 * máximo, e cada envio é uma chamada de rede ao provedor de WhatsApp. 100 cabem com
 * folga; o que passar disso fica para a rodada seguinte, que é minutos depois — e a
 * janela de 3h dá espaço de sobra para o atraso ser invisível.
 */
const POR_RODADA = 100;

/** O ator da rotina. Não é usuário nem agente: ninguém clicou, e a IA não escreveu. */
const contextoDeSistema = (tenantId: string): ContextoTenant => ({
  tenantId,
  /* `usuarioId` vazio de propósito: não houve pessoa. Pôr o dono aqui faria a auditoria
   * dizer que ele mandou a mensagem, e ele estava dormindo. */
  usuarioId: "",
  ator: { tipo: "sistema", rotina: "lembretes" },
});

export function criarEnviarLembretes(deps: {
  fila: FilaDeLembretes;
  canal: CanalDeMensagens;
  negocio: RepositorioNegocio;
  assistente: RepositorioAssistente;
}): EnviarLembretes {
  return async (agora: Date): Promise<ResultadoDaRotina> => {
    const pendentes = await deps.fila.reservar(janelaDeLembrete(agora), POR_RODADA);
    if (!pendentes.length) return { enviados: 0, falhas: [] };

    const falhas: ResultadoDaRotina["falhas"] = [];
    let enviados = 0;

    /* Cache por inquilino DENTRO da rodada. Um negócio com dez atendimentos na mesma
     * janela é o caso comum, e sem isto seriam vinte consultas para montar dez frases
     * idênticas no cabeçalho. Ele morre com a rodada — nada aqui sobrevive à função. */
    const identidade = new Map<string, { negocio: string; assistente: string }>();

    for (const p of pendentes) {
      const t = contextoDeSistema(p.tenantId);
      try {
        let quem = identidade.get(p.tenantId);
        if (!quem) {
          const [n, a] = await Promise.all([deps.negocio.negocio(t), deps.assistente.ler(t)]);
          quem = { negocio: n.nome, assistente: a?.assistente.nome ?? "MAISA" };
          identidade.set(p.tenantId, quem);
        }

        await deps.canal.enviar(t, p.clienteTel, [
          textoDoLembrete({
            pendente: p,
            nomeDoNegocio: quem.negocio,
            nomeDaAssistente: quem.assistente,
          }),
        ]);
        enviados++;
      } catch (e) {
        /* Devolve a reserva ANTES de registrar a falha: se a função morrer no meio do
         * relatório, o que precisa ter acontecido é a devolução — sem ela o lembrete some
         * para sempre, e um relatório perdido só custa uma linha de log. */
        await deps.fila.devolver(p.id).catch(() => {});
        falhas.push({
          atendimentoId: p.id,
          tenantId: p.tenantId,
          motivo: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { enviados, falhas };
  };
}

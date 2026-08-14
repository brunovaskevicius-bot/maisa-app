/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — ler e ajustar o horário ANUNCIADO.
 *
 * A terceira repetição do mesmo conserto (`assistente`, `canal`, agora este): um ajuste
 * que o dono fazia na tela, que morava no `localStorage` de um aparelho, e que o agente
 * nunca leu. Quem perguntasse "que horas vocês atendem?" no WhatsApp era respondido com o
 * expediente do PROFISSIONAL — outro dado, com outra finalidade.
 *
 * ── POR QUE `ajustar` RECEBE A SEMANA INTEIRA ──
 *
 * A tela edita um dia por vez, mas manda os sete. É deliberado, e é a diferença para
 * `ajustarAssistente`, que é patch por campo:
 *
 *   • O dado é uma GRADE. "Quando abrimos" só é verdade completa — sábado sozinho não
 *     responde a pergunta que a MAISA precisa responder.
 *   • Semana completa torna a escrita IDEMPOTENTE. Duas telas abertas convergem para a
 *     última que salvou, em vez de produzirem uma semana que nunca existiu em nenhuma
 *     das duas (segunda de uma, sábado da outra).
 *
 * O preço é o clássico last-write-wins entre abas. Para um dado editado pelo dono do
 * negócio, no painel dele, é o preço certo — e é menor que o de uma grade Frankenstein.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { AjustarHorarios, LerHorarios } from "../portas/entrada/casos-de-uso";
import type { RepositorioHorarios } from "../portas/saida/repositorio-horarios";
import type { SemanaAnunciada } from "../dominio/horarios";
import { DIAS_DA_SEMANA, normalizarDia } from "../dominio/horarios";
import { DadoInvalido, NaoEncontrado } from "../dominio/erros";

export function criarLerHorarios(deps: { horarios: RepositorioHorarios }): LerHorarios {
  return async (t): Promise<SemanaAnunciada> => {
    const semana = await deps.horarios.ler(t);
    /* 404 como em `lerAssistente`, e pela mesma razão: quem chama é a TELA. O caminho do
     * agente não passa por aqui — ele lê pela composição, que degrada para "horário não
     * cadastrado" em vez de morrer no meio de uma conversa. */
    if (!semana?.length) throw new NaoEncontrado("Horário anunciado");
    return semana;
  };
}

export function criarAjustarHorarios(deps: { horarios: RepositorioHorarios }): AjustarHorarios {
  return async (t, p): Promise<SemanaAnunciada> => {
    if (!Array.isArray(p)) {
      throw new DadoInvalido("Mande a semana inteira, como uma lista de sete dias.", "payload");
    }
    if (p.length !== DIAS_DA_SEMANA.length) {
      throw new DadoInvalido(
        `A semana tem ${DIAS_DA_SEMANA.length} dias — vieram ${p.length}.`,
        "payload",
      );
    }

    /* Ordena por `dow` ANTES de validar, e valida cada dia contra a posição que ele diz
     * ocupar. Confiar na ordem do array deixaria "terça" no índice 0 passar sem ninguém
     * notar, e a MAISA anunciaria o horário de terça como se fosse o de segunda. */
    const porDow = new Map<number, unknown>();
    for (const dia of p) {
      const dow = (dia as { dow?: unknown })?.dow;
      if (typeof dow !== "number" || !Number.isInteger(dow) || dow < 0 || dow > 6) {
        throw new DadoInvalido("Cada dia precisa de um 'dow' de 0 (segunda) a 6 (domingo).", "dow");
      }
      if (porDow.has(dow)) {
        throw new DadoInvalido(`${DIAS_DA_SEMANA[dow]} veio duas vezes.`, "dow");
      }
      porDow.set(dow, dia);
    }

    const semana: SemanaAnunciada = DIAS_DA_SEMANA.map((_, dow) => normalizarDia(porDow.get(dow), dow));

    return deps.horarios.salvar(t, semana);
  };
}

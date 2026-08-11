/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — o Google Calendar cumprindo as portas `AgendaExterna` e
 * `ConexoesDeAgenda`. ⚠️ SÓ SERVIDOR.
 *
 * É a ÚNICA peça que conhece as duas línguas: a do núcleo (ContextoAgenda, janela de
 * datas civis, EventoDeAgenda) e a do Google (token bearer, extendedProperties,
 * conferenceDataVersion). Toda a mecânica está nos vizinhos:
 *
 *   config.ts     — env vars e escopos
 *   oauth.ts      — consent, troca de código, refresh, revogação
 *   cripto.ts     — AES-256-GCM dos tokens + assinatura do `state` + PKCE
 *   conexoes.ts   — onde os tokens moram (Supabase) e como se renovam
 *   calendario.ts — HTTP da API v3, e a tradução de evento para a língua da grade
 *
 * Este arquivo só amarra: pega o token pela conexão do contexto e chama o calendário.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { AgendaExterna, Conexao, ConexoesDeAgenda } from "@/nucleo/portas/saida/agenda-externa";
import { acessoValido, apagar, listar as listarConexoes, refreshTokenDe } from "./conexoes";
import { revogar } from "./oauth";
import * as G from "./calendario";

export const agendaGoogle: AgendaExterna = {
  async listar(ctx, janela) {
    const { token } = await acessoValido(ctx);
    return G.listar({ token, de: janela.de, ate: janela.ate });
  },

  async buscarPorAtendimento(ctx, p) {
    const { token } = await acessoValido(ctx);
    return G.buscarPorProp({ token, chave: G.PROPS.ag, valor: p.ag, perto: p.perto });
  },

  async criar(ctx, ev) {
    const { token } = await acessoValido(ctx);
    const a = ev.atendimento;
    return G.criar({
      token,
      inicio: ev.inicio,
      fim: ev.fim,
      titulo: ev.titulo,
      descricao: ev.descricao,
      emails: ev.emails,
      comMeet: ev.comMeet,
      // Prefixo `maisa-` na chave do createRequest: o Google trata `requestId` como
      // idempotente, então a MESMA chave devolve a MESMA conferência num retry.
      chave: `maisa-${a.ag}`,
      // Aqui o domínio vira vocabulário do Google, e só aqui.
      props: {
        [G.PROPS.marca]: "1",
        [G.PROPS.ag]: a.ag,
        [G.PROPS.pro]: a.profissionalId,
        [G.PROPS.cli]: a.clienteId,
        [G.PROPS.cliNome]: a.clienteNome,
        ...(a.clienteTel ? { [G.PROPS.cliTel]: a.clienteTel } : {}),
        [G.PROPS.svc]: a.servicoId,
        [G.PROPS.svcNome]: a.servicoNome,
        [G.PROPS.svcDur]: String(ev.duracaoMin),
        [G.PROPS.svcVal]: String(a.servicoValor),
      },
    });
  },

  async remarcar(ctx, p) {
    const { token } = await acessoValido(ctx);
    await G.remarcar({ token, eventId: p.eventoId, inicio: p.inicio, fim: p.fim });
  },

  async cancelar(ctx, p) {
    const { token } = await acessoValido(ctx);
    await G.cancelar({ token, eventId: p.eventoId });
  },
};

/** Qual conta do Google está por trás desta agenda. Fora da porta: é informação de
 *  exibição ("conectado como fulano@"), e não algo de que o domínio precise. */
export async function contaDaAgenda(ctx: Parameters<AgendaExterna["listar"]>[0]): Promise<string> {
  const { email } = await acessoValido(ctx);
  return email;
}

export const conexoesGoogle: ConexoesDeAgenda = {
  async listar(t): Promise<Conexao[]> {
    return listarConexoes(t);
  },

  /**
   * Revoga no Google ANTES de apagar a linha: depois de apagar não haveria mais como.
   * Desconectar tem que desconectar de verdade — só apagar a linha deixaria o refresh
   * token válido no Google até alguém ir tirar na mão em myaccount.google.com.
   */
  async desconectar(ctx) {
    const refresh = await refreshTokenDe(ctx);
    const revogado = refresh ? await revogar(refresh) : false;
    await apagar(ctx);
    return { revogado };
  },
};

/** As marcas privadas que identificam um atendimento da MAISA dentro de um evento. */
export { PROPS } from "./calendario";

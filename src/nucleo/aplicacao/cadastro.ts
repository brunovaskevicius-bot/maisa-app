/* ─────────────────────────────────────────────────────────────────────────────
 * CASO DE USO — ler o cadastro do negócio.
 *
 * O que o painel precisa antes de desenhar a primeira tela: quem eu sou, quem atende, o
 * que eu vendo, quem são meus clientes, e quais agendas eu posso operar.
 *
 * Curto de propósito. Não há regra nova aqui — a regra é a `agendasPermitidas`, que já
 * mora no repositório porque é allowlist de autorização e não pode ser recalculada por
 * quem consome. O valor deste arquivo é OUTRO: ele é o lugar onde as telas param de
 * importar `adaptadores/saida/demo` e passam a pedir ao app. Enquanto a leitura era um
 * `import * as D`, cada tela carregava a decisão de onde o dado vem — e por isso trocar
 * fixture por banco era 166 pontos de mudança em 8 arquivos em vez de uma linha em
 * `composicao.ts`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { CadastroDoNegocio, LerCadastro } from "../portas/entrada/casos-de-uso";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";

export function criarLerCadastro(deps: { negocio: RepositorioNegocio }): LerCadastro {
  return async (t): Promise<CadastroDoNegocio> => {
    /* Em paralelo: cinco leituras independentes, nenhuma ordem entre elas e nenhuma
     * transação a respeitar. Em série a latência delas soma, e isto está no caminho da
     * primeira pintura do painel. */
    const [negocio, profissionais, servicos, clientes, agendas] = await Promise.all([
      deps.negocio.negocio(t),
      deps.negocio.profissionais(t),
      deps.negocio.servicos(t),
      deps.negocio.clientes(t),
      deps.negocio.agendasPermitidas(t),
    ]);

    return { negocio, profissionais, servicos, clientes, agendas };
  };
}

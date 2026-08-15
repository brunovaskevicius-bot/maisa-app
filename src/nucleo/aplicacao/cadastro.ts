/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — ler e ajustar o cadastro do negócio.
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

import type { AjustarNegocio, CadastroDoNegocio, LerCadastro } from "../portas/entrada/casos-de-uso";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import type { Negocio } from "../dominio/negocio";
import { NOME_NEGOCIO_MAX, NOME_NEGOCIO_MIN, normalizarNomeDoNegocio } from "../dominio/negocio";
import { DadoInvalido } from "../dominio/erros";

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

/* ─────────────────────────────────────────────────────────────────────────────
 * AJUSTAR O NEGÓCIO — hoje, só o nome.
 *
 * ⚠️ Este campo entra no PROMPT do agente a cada mensagem e no texto do lembrete. É por
 * isso que ele valida aqui em vez de deixar o banco reclamar: o `check` de
 * `provisionar_negocio` só cobre o mínimo de 2 caracteres, e não existe teto nenhum na
 * coluna. Sem esta função, `{"nome":"<mil caracteres>"}` seria aceito, gravado, e viraria
 * token pago em toda mensagem daquele inquilino — além de ser o lugar óbvio para escrever
 * instrução dentro de um campo de cadastro.
 *
 * O nome vazio tem tratamento PRÓPRIO, e não cai no mínimo de 2: quem apaga o campo
 * inteiro está tentando limpar, não digitando errado, e a frase precisa dizer isso.
 * Devolver "precisa de 2 caracteres" para um campo em branco manda procurar o problema
 * no que se digitou, quando o problema é o que não se digitou.
 * ────────────────────────────────────────────────────────────────────────────── */
export function criarAjustarNegocio(deps: { negocio: RepositorioNegocio }): AjustarNegocio {
  return async (t, p): Promise<Negocio> => {
    const nome = normalizarNomeDoNegocio(p?.nome ?? "");

    if (!nome) {
      throw new DadoInvalido("O negócio precisa de um nome — ele aparece no WhatsApp do cliente.", "nome");
    }
    if (nome.length < NOME_NEGOCIO_MIN) {
      throw new DadoInvalido(`O nome precisa de pelo menos ${NOME_NEGOCIO_MIN} caracteres.`, "nome");
    }
    if (nome.length > NOME_NEGOCIO_MAX) {
      throw new DadoInvalido(`O nome passa de ${NOME_NEGOCIO_MAX} caracteres.`, "nome");
    }

    return deps.negocio.renomear(t, nome);
  };
}

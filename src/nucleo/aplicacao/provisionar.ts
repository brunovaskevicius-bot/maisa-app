/* ─────────────────────────────────────────────────────────────────────────────
 * CASO DE USO — criar o negócio.
 *
 * O passo que faltava para a MAISA se vender sozinha. A RPC `criar_negocio()` já existia
 * e era boa (transação única: negócio, membro dono, assinatura em trial, assistente,
 * expediente, catálogo de partida e FAQs). Ninguém a chamava. Este arquivo é a chamada.
 *
 * ── O QUE ESTE CASO DE USO DECIDE, JÁ QUE O BANCO FAZ O TRABALHO ──
 *
 * Três coisas, e todas as três existem porque o banco não pode decidi-las bem:
 *
 * 1. VALIDA ANTES DE GASTAR UMA IDA. Nome vazio e vertical inventada são recusados aqui.
 *    O `check` do Postgres também recusa — mas devolve `raise exception`, que vira 500
 *    genérico, e a tela não consegue transformar isso em "digite o nome do seu negócio".
 * 2. NORMALIZA O NOME. `btrim` o banco faz; colapsar espaço interno e recusar nome só de
 *    pontuação, não. Nome de negócio vira slug, e slug vira URL.
 * 3. TRADUZ `limite_de_negocios` EM ERRO DE DOMÍNIO. O teto de 10 por pessoa é freio
 *    anti-abuso, não regra de produto — mas quem bateu nele precisa de uma frase, não de
 *    um 500.
 *
 * ⚠️ O que este caso de uso NÃO faz, de propósito: escolher o inquilino. O dono é sempre
 * `auth.uid()`, resolvido dentro da RPC, que é `security definer`. Nem o corpo do request
 * nem este arquivo têm como apontar para outra pessoa. É a mesma regra de
 * `dominio/tenant.ts`, valendo no único ponto do app onde um inquilino nasce.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { NegocioProvisionado, ProvisionarNegocio } from "../portas/entrada/casos-de-uso";
import type { ProvisionadorDeNegocio } from "../portas/saida/provisionador-negocio";
import { ehVertical } from "../dominio/negocio";
import { DadoInvalido } from "../dominio/erros";

/** Nome de negócio cabe numa tela e vira slug. Fora disso é engano ou abuso. */
const NOME_MIN = 2;
const NOME_MAX = 80;

/** Colapsa espaço repetido e apara as pontas. `"  Studio   Aurora "` → `"Studio Aurora"`. */
const normalizar = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Só espaço e pontuação ASCII — `"---"`, `"..."`, `"( )"`.
 *
 * Escrito com faixas de código, e não com `\p{L}`, porque o `target` do projeto é
 * anterior a ES6 e as classes de propriedade Unicode exigem a flag `u`. A consequência é
 * boa para nós: tudo fora do ASCII (á, ç, ã, ñ, 日) cai FORA da faixa e conta como
 * conteúdo — que é exatamente o que um nome de negócio brasileiro precisa.
 */
const SEM_CONTEUDO = /^[\s!-/:-@[-`{-~]*$/;

export function criarProvisionarNegocio(deps: {
  provisionador: ProvisionadorDeNegocio;
}): ProvisionarNegocio {
  return async (sessao, p): Promise<NegocioProvisionado> => {
    const nome = normalizar(p.nome ?? "");

    if (nome.length < NOME_MIN) {
      throw new DadoInvalido("Diga o nome do seu negócio.", "nome");
    }
    if (nome.length > NOME_MAX) {
      throw new DadoInvalido(`O nome precisa ter no máximo ${NOME_MAX} caracteres.`, "nome");
    }
    /* Precisa sobrar letra ou número: `"---"` passaria nos dois testes acima e viraria um
     * slug vazio no banco, que é onde o erro apareceria — longe daqui e sem explicação. */
    if (SEM_CONTEUDO.test(nome)) {
      throw new DadoInvalido("O nome precisa ter pelo menos uma letra ou número.", "nome");
    }

    if (!ehVertical(p.vertical)) {
      throw new DadoInvalido("Escolha se você atende como terapeuta ou barbearia.", "vertical");
    }

    const profissional = p.profissional ? normalizar(p.profissional) : undefined;

    const r = await deps.provisionador.criar(sessao, {
      nome,
      vertical: p.vertical,
      /* Vazio depois de normalizar é o mesmo que não ter mandado. Sem isto, um campo que
       * o usuário abriu e fechou viraria um profissional chamado "" no banco. */
      profissional: profissional || undefined,
    });

    if (!r.ok) {
      throw new DadoInvalido(
        "Esta conta já é dona de negócios demais. Fale com a gente para liberar mais.",
        "limite",
      );
    }

    return { tenantId: r.tenantId, proximoPasso: "abrir_painel" };
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — as respostas prontas do negócio.
 *
 * O quinto e último caso da família "o dono configura e o produto ignora". A tabela
 * `faqs` existia desde a criação do banco com quatro linhas semeadas por inquilino, e o
 * agente respondia dúvida com uma FIXTURE — a mesma para todo mundo. Uma das linhas reais
 * deste negócio dizia "posso te passar agora, me diz que dia você prefere"; a fixture
 * respondia um horário fixo, inventado, que contradizia o horário anunciado configurado
 * pela tela.
 *
 * ── O QUE ESTE ARQUIVO DECIDE, E O ADAPTADOR NÃO ──
 *
 * 1. QUE TEXTO VIRA VETOR. Indexa-se `pergunta`, não `pergunta + resposta`. Quem busca é
 *    o cliente perguntando, e a pergunta dele se parece com a pergunta cadastrada — não
 *    com a resposta. Misturar as duas empurra o vetor para o meio das duas e piora o
 *    casamento das duas pontas.
 *
 * 2. QUANDO REINDEXAR. Só quando a pergunta muda. Editar a resposta (o caso comum: o dono
 *    corrige um preço) não gasta uma chamada de embedding — e, mais importante, não muda
 *    onde a FAQ é encontrada, o que é o comportamento que ele espera.
 *
 * 3. QUE "NÃO SEI" É RESPOSTA. `responderDuvida` devolve lista vazia sem inventar nada. O
 *    corte de similaridade mora no banco; aqui a regra é não maquiar o vazio.
 *
 * ── ⚠️ O QUE ELE NÃO DECIDE: DE QUEM É A FAQ ──
 * Isso é do adaptador e da RLS. Um caso de uso que filtrasse por inquilino teria que
 * receber o inquilino como dado, e o dia em que alguém passasse o errado nada reclamaria.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  AjustarFaq,
  LerFaqs,
  RemoverFaq,
  ResponderDuvida,
} from "../portas/entrada/casos-de-uso";
import type { GeradorDeEmbedding } from "../portas/saida/gerador-de-embedding";
import type { RepositorioFaqs } from "../portas/saida/repositorio-faqs";
import type { Faq, FaqEncontrada } from "../dominio/faq";
import { PERGUNTA_MAX, RESPOSTA_MAX } from "../dominio/faq";
import { DadoInvalido } from "../dominio/erros";

const limpar = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

export function criarLerFaqs(deps: { faqs: RepositorioFaqs }): LerFaqs {
  return (t) => deps.faqs.listar(t);
}

export function criarAjustarFaq(deps: {
  faqs: RepositorioFaqs;
  embedding: GeradorDeEmbedding;
}): AjustarFaq {
  return async (t, p): Promise<Faq> => {
    const pergunta = limpar(p?.pergunta);
    const resposta = limpar(p?.resposta);

    if (!pergunta) throw new DadoInvalido("A pergunta não pode ficar em branco.", "pergunta");
    if (!resposta) throw new DadoInvalido("A resposta não pode ficar em branco.", "resposta");
    if (pergunta.length > PERGUNTA_MAX) {
      throw new DadoInvalido(`A pergunta passa de ${PERGUNTA_MAX} caracteres.`, "pergunta");
    }
    if (resposta.length > RESPOSTA_MAX) {
      throw new DadoInvalido(`A resposta passa de ${RESPOSTA_MAX} caracteres.`, "resposta");
    }

    /* Só a PERGUNTA vira vetor — ver a decisão 1 do cabeçalho.
     *
     * ⚠️ O embedding é gerado ANTES do `salvar`, e não depois, de propósito. Se o provedor
     * falhar, nada foi gravado e o dono tenta de novo; na ordem inversa a FAQ existiria na
     * tela com vetor nulo, parecendo pronta e nunca sendo encontrada — que é o pior dos
     * dois estados porque é invisível. */
    const vetor = await deps.embedding.embutir(pergunta);

    return deps.faqs.salvar(t, { id: p.id, pergunta, resposta, ativo: p.ativo }, vetor);
  };
}

export function criarRemoverFaq(deps: { faqs: RepositorioFaqs }): RemoverFaq {
  return async (t, id) => {
    if (!limpar(id)) throw new DadoInvalido("Falta dizer qual FAQ.", "id");
    await deps.faqs.remover(t, limpar(id));
  };
}

/**
 * A busca que o AGENTE faz no meio de uma conversa.
 *
 * ⚠️ Usa um gerador de embedding DIFERENTE do de indexação (`embeddingDePergunta` contra
 * `embeddingGemini`). Não é descuido de fiação: o modelo produz vetores distintos para
 * "isto é uma consulta" e "isto é um documento", e casar os dois tipos certos melhora o
 * resultado. Quem monta os dois lados é `composicao.ts`, e é lá que se vê o par.
 */
export function criarResponderDuvida(deps: {
  faqs: RepositorioFaqs;
  embeddingDePergunta: GeradorDeEmbedding;
}): ResponderDuvida {
  return async (t, pergunta): Promise<FaqEncontrada[]> => {
    const texto = limpar(pergunta);
    /* Pergunta vazia devolve vazio em vez de estourar: quem chama é o modelo de
     * linguagem, e uma exceção aqui aborta o turno inteiro do agente por causa de um
     * argumento mal formado. Lista vazia ele já sabe tratar. */
    if (!texto) return [];

    const vetor = await deps.embeddingDePergunta.embutir(texto);
    const achadas = await deps.faqs.buscar(t, vetor);

    /* Só a primeira colocada conta como "usada" — as outras foram contexto. O porquê
     * inteiro está no comentário de `registrar_uso_faq`, na migração 012.
     *
     * Sem `await`: contador não segura resposta de WhatsApp. O adaptador já engole o erro
     * e loga; o `catch` aqui é para o caso de a promessa rejeitar antes disso. */
    if (achadas.length) {
      void deps.faqs.registrarUso(t, achadas[0].id).catch(() => {});
    }

    return achadas;
  };
}

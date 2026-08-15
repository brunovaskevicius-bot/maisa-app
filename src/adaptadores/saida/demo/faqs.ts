/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `RepositorioFaqs` em memória, com cosseno em JavaScript.
 *
 * É a prova de que a porta está bem desenhada: `buscar` recebe um VETOR, não um texto,
 * então este arquivo faz busca por similaridade sem banco, sem pgvector e sem chamar
 * provedor nenhum. Se a porta recebesse texto, este adaptador precisaria de uma chave de
 * API para existir — e o modo demo teria morrido junto.
 *
 * ⚠️ IGNORA O `ContextoTenant`, como todo o `demo/`: existe um negócio só. A assinatura
 * pede o contexto para que a troca pelo adaptador Supabase seja uma linha em
 * `composicao.ts`. Ver o cabeçalho de `repositorio.ts` ao lado.
 *
 * O estado vive no módulo e reinicia com o processo. É o combinado do demo inteiro.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { Faq, FaqEncontrada } from "@/nucleo/dominio/faq";
import type { RascunhoDeFaq, RepositorioFaqs } from "@/nucleo/portas/saida/repositorio-faqs";
import { CORTE_DE_SIMILARIDADE } from "@/nucleo/dominio/faq";
import { NaoEncontrado } from "@/nucleo/dominio/erros";
import { FAQS } from "./conversas";

/** ⚠️ Cópia, não referência: `FAQS` é constante importada por outros módulos, e mutá-la
 *  faria uma edição no demo vazar para quem só quis LER o fixture. */
type Guardada = Faq & { ativo: boolean; vetor: number[] };
let guardadas: Guardada[] = FAQS.map((f) => ({ ...f, ativo: true, vetor: [] }));

let proximo = 1;

/** Cosseno cru. Os vetores já chegam normalizados (é contrato da porta de embedding),
 *  então o produto interno bastaria — a divisão fica por segurança e custa nada em 4
 *  linhas. Vetor vazio devolve 0: FAQ ainda não indexada nunca é candidata. */
function cosseno(a: readonly number[], b: readonly number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let ab = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    ab += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return ab / (Math.sqrt(na) * Math.sqrt(nb));
}

/* O MESMO corte do adaptador real, importado e não copiado. Um número repetido aqui
 * divergiria do de produção no primeiro ajuste, e o sintoma seria o pior possível: uma
 * busca que devolve vazio em produção devolvendo resposta no demo — o teste passaria e
 * mentiria. O que ele significa (e o que ele NÃO decide) está em `dominio/faq.ts`. */
const CORTE = CORTE_DE_SIMILARIDADE;

export const faqsDemo: RepositorioFaqs = {
  async listar(_t: ContextoTenant): Promise<Faq[]> {
    return [...guardadas]
      .sort((a, b) => b.usos - a.usos)
      .map(({ id, pergunta, resposta, usos }) => ({ id, pergunta, resposta, usos }));
  },

  async salvar(_t, rascunho: RascunhoDeFaq, vetor: number[]): Promise<Faq> {
    if (rascunho.id) {
      const i = guardadas.findIndex((f) => f.id === rascunho.id);
      if (i < 0) throw new NaoEncontrado("FAQ para editar");
      guardadas[i] = {
        ...guardadas[i],
        pergunta: rascunho.pergunta,
        resposta: rascunho.resposta,
        ativo: rascunho.ativo ?? guardadas[i].ativo,
        vetor,
      };
      const { id, pergunta, resposta, usos } = guardadas[i];
      return { id, pergunta, resposta, usos };
    }

    const nova: Guardada = {
      id: `fq-demo-${proximo++}`,
      pergunta: rascunho.pergunta,
      resposta: rascunho.resposta,
      usos: 0,
      ativo: rascunho.ativo ?? true,
      vetor,
    };
    guardadas.push(nova);
    const { id, pergunta, resposta, usos } = nova;
    return { id, pergunta, resposta, usos };
  },

  async remover(_t, id: string): Promise<void> {
    guardadas = guardadas.filter((f) => f.id !== id);
  },

  async buscar(_t, vetor: number[], k = 3): Promise<FaqEncontrada[]> {
    return guardadas
      .filter((f) => f.ativo && f.vetor.length > 0)
      .map((f) => ({
        id: f.id,
        pergunta: f.pergunta,
        resposta: f.resposta,
        similaridade: cosseno(f.vetor, vetor),
      }))
      .filter((f) => f.similaridade >= CORTE)
      .sort((a, b) => b.similaridade - a.similaridade)
      .slice(0, Math.max(1, Math.min(k, 10)));
  },

  async registrarUso(_t, id: string): Promise<void> {
    const f = guardadas.find((x) => x.id === id);
    if (f) f.usos += 1;
  },
};

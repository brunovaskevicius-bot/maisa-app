/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — o caderno de nomes, e quem a MAISA atende.
 *
 * Quatro de tela e um de caminho quente. O de caminho quente (`avaliarAtendimento`) é o que
 * impede a MAISA de oferecer horário para o pai do dono, e é chamado uma vez por mensagem
 * recebida, antes do primeiro token.
 *
 * A regra em si não está aqui — está em `dominio/contatos.ts`, pura e testada. Aqui é só a
 * costura: buscar o modo e o contato, e entregar a decisão pronta.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  AvaliarAtendimento, DefinirModoDoNumero, ImportarContatos, LerContatos, MarcarContato,
} from "../portas/entrada/casos-de-uso";
import type { RepositorioContatos } from "../portas/saida/repositorio-contatos";
import type { ContatosDoCanal } from "../portas/saida/contatos-do-canal";
import { MODO_PADRAO, chaveDe, ehModoDoNumero, motivoDoSilencio, podeResponder } from "../dominio/contatos";
import { colapsarEspaco, temConteudo } from "../dominio/texto";
import { DadoInvalido } from "../dominio/erros";

/**
 * A MAISA pode falar com quem acabou de escrever?
 *
 * ⚠️ FALHA ABERTA, E É DELIBERADO — ao contrário de quase tudo neste repositório.
 *
 * Se a consulta ao caderno ou ao modo estourar (banco fora, RLS estreita), esta função
 * responde **pode**. O raciocínio: o custo dos dois erros não é simétrico e não é próximo.
 * Falhar fechada silencia um cliente pagante no meio de uma tentativa de marcar horário, e
 * o dono só descobre quando o cliente reclama — ou não reclama, e vai embora. Falhar aberta,
 * no pior caso, faz a MAISA responder um contato pessoal uma vez, com a mensagem visível na
 * tela de Conversas e um `console.error` explicando o que aconteceu.
 *
 * A guarda que NUNCA falha aberta continua sendo outra: o `podeResponder` do domínio, que é
 * função pura e não tem como estourar. O que degrada aqui é a leitura dos dados dela.
 */
export function criarAvaliarAtendimento(deps: { contatos: RepositorioContatos }): AvaliarAtendimento {
  return async (t, telefone) => {
    const chave = chaveDe(telefone);

    /* Sem chave utilizável não há como consultar o caderno, e "não conheço" é a leitura
     * honesta: no modo pessoal isso significa atender, porque é o que um lead parece. */
    if (!chave) return { pode: true, motivo: null, nome: null };

    try {
      /* As duas juntas: tabelas diferentes, nenhuma depende da outra, e este é o caminho
       * quente — o cliente está com a tela aberta esperando. */
      const [modo, contato] = await Promise.all([deps.contatos.modo(t), deps.contatos.ler(t, chave)]);
      const p = { modo: modo ?? MODO_PADRAO, contato };
      return { pode: podeResponder(p), motivo: motivoDoSilencio(p), nome: contato?.nome ?? null };
    } catch (e) {
      console.error(
        `[aplicacao/contatos] não foi possível decidir se a MAISA atende ${chave} no inquilino ${t.tenantId} — `
        + `respondendo POR PADRÃO (ver o ⚠️ de criarAvaliarAtendimento): ${e instanceof Error ? e.message : String(e)}`,
      );
      return { pode: true, motivo: null, nome: null };
    }
  };
}

export function criarLerContatos(deps: { contatos: RepositorioContatos }): LerContatos {
  return async (t) => {
    const [contatos, modo] = await Promise.all([deps.contatos.listar(t), deps.contatos.modo(t)]);
    return { contatos, modo: modo ?? MODO_PADRAO };
  };
}

/**
 * Lê a agenda do provedor e grava o que serve.
 *
 * `lidos` volta junto com `novos` e `total` porque a diferença entre eles é a coisa mais
 * perguntável desta tela: a agenda do Bruno tem 1.840 entradas e 374 utilizáveis (o resto é
 * grupo ou `@lid` sem telefone — ver `ContatosDoCanal`). Mostrar só "374 importados" faria
 * alguém procurar os outros 1.466; mostrar os três números explica sozinho.
 *
 * ⚠️ Quem filtra é o adaptador, não este caso de uso. Está escrito na porta: espalhar a
 * regra do `@lid` significa que a primeira cópia esquecida anuncia 1.840 contatos para um
 * dono que ganhou 374.
 */
export function criarImportarContatos(deps: {
  contatos: RepositorioContatos;
  provedor: ContatosDoCanal;
}): ImportarContatos {
  return async (t) => {
    const faltando = deps.provedor.faltando();
    if (faltando.length) {
      throw new DadoInvalido(
        `Não dá para ler seus contatos: falta ${faltando.join(", ")}.`,
        "provedor",
      );
    }

    const lidos = await deps.provedor.listar(t);

    /* Normaliza AQUI, no núcleo, e não no adaptador: a chave é regra de domínio (`chaveDe`)
     * e um adaptador que a calculasse por conta própria poderia divergir dos outros — e o
     * sintoma seria o caderno nunca casar com quem escreve. */
    const rascunhos = lidos
      .map((c) => ({
        chave: chaveDe(c.telefone),
        nome: temConteudo(c.nome) ? colapsarEspaco(c.nome) : null,
        telefone: c.telefone,
      }))
      .filter((c) => c.chave !== "");

    /* Deduplica por chave antes de gravar. Dois registros do mesmo número com escritas
     * diferentes ("+55 11 …" e "11 …") viram a mesma chave, e um upsert em lote com chave
     * repetida é erro no Postgres — `ON CONFLICT DO UPDATE command cannot affect row a
     * second time`. Prefere quem TEM nome: entre duas linhas do mesmo número, a útil é a
     * que a MAISA pode usar para cumprimentar. */
    const porChave = new Map<string, (typeof rascunhos)[number]>();
    for (const r of rascunhos) {
      const antes = porChave.get(r.chave);
      if (!antes || (!antes.nome && r.nome)) porChave.set(r.chave, r);
    }

    const { novos, total } = await deps.contatos.salvarLote(t, [...porChave.values()]);
    return { novos, total, lidos: lidos.length };
  };
}

export function criarMarcarContato(deps: { contatos: RepositorioContatos }): MarcarContato {
  return async (t, p) => {
    const chave = chaveDe(p.telefone);
    if (!chave) throw new DadoInvalido("Telefone inválido.", "telefone");

    const nome = temConteudo(p.nome) ? colapsarEspaco(p.nome) : null;
    await deps.contatos.marcar(t, { chave, nome, telefone: p.telefone, cliente: p.cliente });
  };
}

export function criarDefinirModoDoNumero(deps: { contatos: RepositorioContatos }): DefinirModoDoNumero {
  return async (t, modo) => {
    /* Valida no núcleo e não confia no `check` do banco: aqui a recusa vira `DadoInvalido`
     * com frase, e lá viraria 500. É a mesma escolha do `criarAjustarServico`. */
    if (!ehModoDoNumero(modo)) {
      throw new DadoInvalido("Escolha se este número é só do negócio ou também seu.", "modo");
    }
    await deps.contatos.definirModo(t, modo);
  };
}

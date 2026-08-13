/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — ler e ajustar a assistente.
 *
 * Passo 2 do caminho crítico. Até aqui, a tela "A MAISA" editava `localStorage`: o dono
 * escrevia o tom, fechava o navegador e o WhatsApp continuava respondendo com a fixture
 * global — a MESMA para todo inquilino. Configurar não configurava nada.
 *
 * ── O QUE ESTES CASOS DE USO DECIDEM ──
 *
 * 1. VALIDAM O QUE VIRA PROMPT. `tom` tem `check` no banco, mas um valor fora da lista
 *    volta como erro do Postgres, e a tela não transforma isso em frase. Pior: `nome` e
 *    `saudacao` NÃO têm check nenhum — eles entram no prompt do agente literalmente, e
 *    texto longo demais ali é dinheiro em token e uma janela de contexto comida à toa.
 * 2. RECUSAM CHAVE DESCONHECIDA em `cfg`. O tipo `ChaveCfg` protege quem escreve
 *    TypeScript; não protege de um corpo JSON. Sem esta guarda, `{"cfg":{"pixx":true}}`
 *    seria aceito, gravado em lugar nenhum e o usuário veria o toggle voltar sozinho.
 * 3. RECUSAM O PATCH VAZIO. `{}` não é erro do usuário nem sucesso — é chamada perdida.
 *    Devolver 200 para ela esconderia um bug de tela que só aparece quando o cliente
 *    reclama que "não salva".
 *
 * ⚠️ O que NÃO validamos aqui: se a linha existe. Isso é do adaptador, porque a resposta
 * certa depende de quem pergunta — o agente no meio de uma conversa não pode morrer por
 * causa de uma linha faltando, e a tela precisa saber que faltou.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { AjustarAssistente, LerAssistente } from "../portas/entrada/casos-de-uso";
import type { AjustesDaAssistente, AjustesParciais, RepositorioAssistente } from "../portas/saida/repositorio-assistente";
import type { ChaveCfg } from "../dominio/assistente";
import { TONS } from "../dominio/assistente";
import { DadoInvalido, NaoEncontrado } from "../dominio/erros";

/** Cabe no cabeçalho de uma conversa de WhatsApp. */
const NOME_MAX = 40;
/** Uma saudação é uma frase, não um manifesto. Vai inteira no prompt, toda mensagem. */
const SAUDACAO_MAX = 280;

/** As sete chaves de `cfg`, em runtime. `ChaveCfg` só existe em tempo de compilação. */
const CHAVES: ChaveCfg[] = [
  "confirmar", "lembrete", "remarcar", "encaminhar", "precoCatalogo", "pix", "encaixe",
];

const normalizar = (s: string) => s.replace(/\s+/g, " ").trim();

export function criarLerAssistente(deps: { assistente: RepositorioAssistente }): LerAssistente {
  return async (t): Promise<AjustesDaAssistente> => {
    const r = await deps.assistente.ler(t);
    /* Aqui SIM é 404: quem chama é a tela de ajustes, e "não achei a linha" é uma
     * anomalia que precisa aparecer. O caminho do agente não passa por este caso de uso
     * — ele lê pela composição, que tem fallback próprio e comentado. */
    if (!r) throw new NaoEncontrado("Ajustes da assistente");
    return r;
  };
}

export function criarAjustarAssistente(deps: { assistente: RepositorioAssistente }): AjustarAssistente {
  return async (t, p): Promise<AjustesDaAssistente> => {
    const patch: AjustesParciais = {};

    if (p.assistente) {
      const a: NonNullable<AjustesParciais["assistente"]> = {};

      if (p.assistente.nome !== undefined) {
        const nome = normalizar(String(p.assistente.nome));
        if (!nome) throw new DadoInvalido("O nome da assistente não pode ficar vazio.", "nome");
        if (nome.length > NOME_MAX) {
          throw new DadoInvalido(`O nome precisa ter no máximo ${NOME_MAX} caracteres.`, "nome");
        }
        a.nome = nome;
      }

      if (p.assistente.tom !== undefined) {
        if (!TONS.includes(p.assistente.tom)) {
          throw new DadoInvalido(`Tom precisa ser um de: ${TONS.join(", ")}.`, "tom");
        }
        a.tom = p.assistente.tom;
      }

      if (p.assistente.saudacao !== undefined) {
        /* Saudação VAZIA é escolha legítima — quem não quer abertura automática apaga o
         * campo. Por isso só o teto é validado, e não a presença. */
        const saudacao = normalizar(String(p.assistente.saudacao));
        if (saudacao.length > SAUDACAO_MAX) {
          throw new DadoInvalido(`A saudação precisa ter no máximo ${SAUDACAO_MAX} caracteres.`, "saudacao");
        }
        a.saudacao = saudacao;
      }

      if (p.assistente.ativa !== undefined) {
        if (typeof p.assistente.ativa !== "boolean") {
          throw new DadoInvalido("O campo 'ativa' é verdadeiro ou falso.", "ativa");
        }
        a.ativa = p.assistente.ativa;
      }

      if (Object.keys(a).length) patch.assistente = a;
    }

    if (p.cfg) {
      const cfg: Partial<Record<ChaveCfg, boolean>> = {};
      for (const [chave, valor] of Object.entries(p.cfg)) {
        if (!CHAVES.includes(chave as ChaveCfg)) {
          throw new DadoInvalido(`Ajuste desconhecido: ${chave}.`, "cfg");
        }
        if (typeof valor !== "boolean") {
          throw new DadoInvalido(`O ajuste '${chave}' é verdadeiro ou falso.`, "cfg");
        }
        cfg[chave as ChaveCfg] = valor;
      }
      if (Object.keys(cfg).length) patch.cfg = cfg;
    }

    if (!patch.assistente && !patch.cfg) {
      throw new DadoInvalido("Nada para ajustar.", "payload");
    }

    return deps.assistente.salvar(t, patch);
  };
}

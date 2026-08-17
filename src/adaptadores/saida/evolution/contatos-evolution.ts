/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a agenda de contatos, lida da Evolution. ⚠️ SÓ SERVIDOR.
 *
 * `POST /chat/findContacts/{instancia}` com corpo `{}`. Só POST: **o GET responde 404**
 * nesta versão (medido em 16/08/2026), e descobrir isso pelo caminho errado custa uma tarde.
 *
 * ── ⚠️ O QUE A MEDIÇÃO DISSE, E POR QUE O FILTRO MORA AQUI ──
 *
 * Da instância do Bruno, 1.840 entradas:
 *
 *   374  `@s.whatsapp.net`  → telefone real, é isto que serve
 *   1113 `@lid`             → id opaco do WhatsApp, SEM telefone
 *   351  `@g.us`            → grupos
 *   2    `@broadcast`/`@bot`
 *
 * **20% aproveitável.** O `@lid` é o endereçamento que o WhatsApp adotou em 2025: sem
 * telefone não há como casar com quem escreve (a chave do caderno é o telefone) e não há como
 * responder — o próprio webhook descarta mensagem `@lid` sem telefone recuperável, por isso
 * mesmo (`entrada/whatsapp/contexto.ts`).
 *
 * O filtro fica AQUI, e não em quem chama, porque a porta manda (`ContatosDoCanal`): espalhar
 * a regra do `@lid` por telas e casos de uso faz a primeira cópia esquecida anunciar "1.840
 * contatos importados" para um dono que ganhou 374.
 *
 * `POST /chat/findChats` foi medido também — 137 conversas, só 3 com telefone real, o resto
 * `@lid` e grupo. Está escrito aqui para ninguém tentar de novo achando que "quem já
 * conversou comigo" é a fonte óbvia. Ela é a pior.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContatoDoProvedor, ContatosDoCanal } from "@/nucleo/portas/saida/contatos-do-canal";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { colapsarEspaco, temConteudo } from "@/nucleo/dominio/texto";
import { EVOLUTION, evolutionFaltando, isEvolutionConfigured } from "./config";
import { exigir } from "./cliente";

/** Como a Evolution devolve uma entrada da agenda. Só o que se usa está tipado. */
type EntradaCrua = {
  remoteJid?: string | null;
  pushName?: string | null;
  isGroup?: boolean | null;
};

/** `5511994294906@s.whatsapp.net` → `5511994294906`. Qualquer outro sufixo → `null`. */
function telefoneDoJid(jid: string | null | undefined): string | null {
  const cru = String(jid ?? "");
  if (!cru.endsWith("@s.whatsapp.net")) return null;
  const digitos = cru.slice(0, cru.indexOf("@")).replace(/\D/g, "");
  /* 10 dígitos é o mínimo de um fixo com DDD; abaixo disso não é telefone brasileiro, é
   * um id que por acaso só tem números. Deixar passar poria lixo no caderno. */
  return digitos.length >= 10 ? digitos : null;
}

export function criarContatosEvolution(deps: {
  /** A instância deste inquilino. É a MESMA função que `canal-evolution` recebe — a
   *  resolução por inquilino não pode ter duas fontes, ou a agenda de um negócio seria
   *  lida do WhatsApp de outro. */
  instanciaDe: (t: ContextoTenant) => Promise<string>;
}): ContatosDoCanal {
  return {
    faltando(): string[] {
      return isEvolutionConfigured ? [] : evolutionFaltando();
    },

    async listar(t: ContextoTenant): Promise<ContatoDoProvedor[]> {
      const instancia = await deps.instanciaDe(t);

      /* Chave GLOBAL, como as rotas de `/instance/*`: ler a agenda é administração da
       * instância, não envio de mensagem. Com a chave da instância a Evolution responde 401
       * em alguns servidores, e 401 aqui vira `NaoConfigurado` — uma mensagem sobre variável
       * de ambiente para um problema de escopo de credencial. */
      const cru = await exigir(`/chat/findContacts/${encodeURIComponent(instancia)}`, {
        metodo: "POST",
        corpo: {},
        chave: EVOLUTION.apiKeyGlobal || undefined,
        /* Agenda de 1.840 entradas num servidor de plano modesto: o timeout padrão de envio
         * de mensagem é curto demais para isto, e um abort no meio parece "sem contatos". */
        timeoutMs: 30_000,
      });

      const lista: EntradaCrua[] = Array.isArray(cru) ? cru : [];

      const achados: ContatoDoProvedor[] = [];
      for (const e of lista) {
        if (e?.isGroup) continue;
        const telefone = telefoneDoJid(e?.remoteJid);
        if (!telefone) continue;
        achados.push({
          telefone,
          nome: temConteudo(e?.pushName) ? colapsarEspaco(e?.pushName) : null,
        });
      }

      /* Log com os dois números porque a diferença é a pergunta que o suporte vai receber:
       * "importei 1.840 contatos e apareceram 374". Sem esta linha, a resposta exige medir
       * de novo o que já se sabia aqui. */
      console.info(
        `[evolution/contatos] instância ${instancia}: ${lista.length} entradas na agenda, `
        + `${achados.length} com telefone utilizável (o resto é grupo ou @lid sem número).`,
      );

      return achados;
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — conectar, consultar e desconectar o WhatsApp do negócio.
 *
 * Passo 3 do caminho crítico, e o de maior impacto segundo o estudo: é o que troca "o
 * Bruno cria a instância na mão e faz deploy" por "o cliente aponta a câmera".
 *
 * ── A DECISÃO QUE ESTE ARQUIVO CARREGA: O NOME DA INSTÂNCIA ──
 *
 * Instância nova chama-se como o inquilino (`tenantId`, um uuid). Não é estética:
 *   • `integracoes_whatsapp.instancia` é UNIQUE global, e uuid não colide;
 *   • o webhook resolve o inquilino PELO nome da instância que chega, então nome ==
 *     tenant torna essa resolução uma igualdade em vez de uma busca;
 *   • nome escolhido por humano ("barbearia-do-ze") colide no segundo Zé e vaza o nome
 *     comercial do cliente para dentro de um servidor compartilhado.
 *
 * ⚠️ MAS O NOME GRAVADO SEMPRE GANHA. O primeiro inquilino da MAISA tem `instancia =
 * "FAQ"`, de antes desta regra existir. Renomear seria destruir o pareamento vivo dele
 * para satisfazer uma convenção — então a convenção vale para quem nasce agora, e quem
 * já tem nome mantém o dele. É a mesma escolha que o resto do repo faz com id legado.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ConectarCanal, DesconectarCanal, LerCanal, RenovarCodigo } from "../portas/entrada/casos-de-uso";
import type { ProvisionamentoDeCanal } from "../portas/saida/provisionamento-canal";
import type { RepositorioCanal } from "../portas/saida/repositorio-canal";
import type { Canal } from "../dominio/canal";
import { numeroParaPareamento } from "../dominio/canal";
import { DadoInvalido, NaoEncontrado } from "../dominio/erros";

type Deps = {
  provisionamento: ProvisionamentoDeCanal;
  canal: RepositorioCanal;
  /** Para onde a Evolution deve mandar as mensagens, e com que segredo assinar. */
  webhook: () => { url: string; segredo: string };
};

/** O nome que uma instância NOVA recebe. Ver o cabeçalho para o porquê do uuid. */
const nomeNovo = (tenantId: string) => tenantId;

export function criarLerCanal(deps: Deps): LerCanal {
  return async (t): Promise<Canal> => {
    const linha = await deps.canal.ler(t);

    /* Nunca conectou: não pergunta nada ao provedor. Não é economia de rede — é evitar
     * inventar uma instância inexistente no path de uma chamada, que a Evolution
     * responde com 404 e o nosso cliente traduz para `PrecisaReconectar`. "Reconectar"
     * é a palavra errada para quem nunca conectou. */
    if (!linha) {
      return { status: "desconectado", instancia: "", numero: null, conectadoEm: null };
    }

    /* A VERDADE DO PAREAMENTO É DO PROVEDOR, não nossa. A coluna `status` é cache: o
     * cliente pode ter desligado o aparelho, trocado de chip ou deslogado o WhatsApp Web
     * sem que nada avise o nosso banco. Perguntar aqui é o que faz a tela parar de
     * mentir — e é barato, porque esta leitura acontece quando alguém ABRE a tela, não a
     * cada mensagem. */
    let estado;
    try {
      estado = await deps.provisionamento.estado(linha.instancia);
    } catch {
      /* Provedor fora do ar não pode derrubar a tela inteira: devolve o último status
       * conhecido. O sintoma de errar aqui é uma tela em branco no lugar de um aviso. */
      return linha;
    }

    /* Divergiu? Grava. É o auto-conserto: sem isto, o cache erraria para sempre e o
     * onboarding contaria como "WhatsApp conectado" um pareamento que caiu ontem.
     *
     * ⚠️ O NÚMERO ENTRA NA COMPARAÇÃO, e não é detalhe: até 13/08/2026 esta linha
     * gravava `numero: linha.numero` — o valor que já estava lá. Como ele nascia `null` e
     * nada mais o escrevia, ficava `null` para sempre, e a tela dizia "Número conectado"
     * sem saber qual. Um cache que só se compara consigo mesmo nunca se corrige. */
    if (estado.status !== linha.status || estado.numero !== linha.numero) {
      return deps.canal.salvar(t, {
        instancia: linha.instancia,
        status: estado.status,
        numero: estado.numero,
      });
    }
    return { ...linha, status: estado.status };
  };
}

export function criarConectarCanal(deps: Deps): ConectarCanal {
  return async (t, p) => {
    const linha = await deps.canal.ler(t);
    const instancia = linha?.instancia || nomeNovo(t.tenantId);

    /* ── O NÚMERO PARA O CÓDIGO DE PAREAMENTO ──
     *
     * Só chega aqui quando a tela pediu o caminho sem câmera (celular). Validar ANTES de
     * falar com o provedor não é preferência de estilo: o passo seguinte APAGA a
     * instância. Descobrir lá na frente que o telefone era inválido deixaria o cliente
     * sem canal por causa de um dígito a menos — a mesma classe de incidente que o teste
     * "falha de configuração acontece ANTES de tocar no provedor" congelou.
     *
     * String vazia é o mesmo que ausente: é o que um `<input>` em branco manda, e tratá-la
     * como erro faria a tela recusar um clique em "conectar por QR". */
    const cru = p?.numero?.trim() || null;
    /* `?? undefined` e não `| null`: a porta declara `numero?: string`, e passar `null`
     * explícito faria o adaptador testar `p.numero` contra um valor que o tipo diz não
     * existir. Ausente é ausente. */
    const numero = (cru ? numeroParaPareamento(cru) : null) ?? undefined;
    if (cru && !numero) {
      throw new DadoInvalido(
        "Esse telefone não parece um WhatsApp válido. Digite com DDD, como (11) 99999-9999.",
        "numero",
      );
    }

    const { url, segredo } = deps.webhook();
    const r = await deps.provisionamento.conectar({ instancia, urlWebhook: url, segredo, numero });

    /* Grava ANTES de devolver o QR, e grava mesmo quando o status é `pareando`.
     *
     * Se gravássemos só ao concluir, existiria uma janela em que a instância existe na
     * Evolution e o nosso banco não sabe o nome dela — e nessa janela toda mensagem que
     * chegasse cairia num webhook que não consegue resolver o inquilino. A linha órfã do
     * lado de lá é pior que a linha "pareando" do lado de cá. */
    await deps.canal.salvar(t, { instancia, status: r.status, numero: linha?.numero ?? null });

    return r;
  };
}

export function criarRenovarCodigo(deps: Deps): RenovarCodigo {
  return async (t, p) => {
    const linha = await deps.canal.ler(t);
    /* Sem linha não há pareamento em curso, e renovar código de instância inexistente
     * criaria uma no provedor pelo caminho errado — quem cria é `conectar`, que também
     * aponta o webhook. Falha fechada e com frase: a tela manda conectar. */
    if (!linha?.instancia) {
      throw new NaoEncontrado("pareamento em curso");
    }

    /* Revalida o telefone AQUI, e não confia no que a tela mandou. É o mesmo argumento de
     * `conectar`: este número vira chamada ao provedor, e a tela pode ter sido recarregada
     * com o campo em branco entre uma coisa e outra. */
    const numero = numeroParaPareamento(p.numero);
    if (!numero) {
      throw new DadoInvalido(
        "Esse telefone não parece um WhatsApp válido. Digite com DDD, como (11) 99999-9999.",
        "numero",
      );
    }

    /* NÃO grava nada. Renovar não muda status (segue `pareando`) nem número (esse continua
     * vindo do `ownerJid`, depois). Uma escrita aqui só teria como efeito reabrir a porta
     * para o digitado virar o gravado. */
    return deps.provisionamento.renovarCodigo({ instancia: linha.instancia, numero });
  };
}

export function criarDesconectarCanal(deps: Deps): DesconectarCanal {
  return async (t) => {
    const linha = await deps.canal.ler(t);
    if (!linha?.instancia) return;

    await deps.provisionamento.desconectar(linha.instancia);

    /* Mantém a LINHA e zera o estado, em vez de apagar. O nome da instância é o que
     * permite reconectar no mesmo lugar depois — e apagar aqui faria o próximo
     * `conectar` gerar um nome novo, deixando a instância antiga órfã no servidor com o
     * webhook ainda apontado para nós. */
    await deps.canal.salvar(t, { instancia: linha.instancia, status: "desconectado", numero: null });
  };
}

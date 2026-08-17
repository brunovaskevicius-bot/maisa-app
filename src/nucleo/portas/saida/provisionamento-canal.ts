/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — criar, parear e destruir o canal de um inquilino.
 *
 * É a peça que o estudo dos repositórios apontou como a de maior impacto: sem ela, pôr
 * um cliente novo no ar exige alguém abrir o painel da Evolution, criar a instância à
 * mão, copiar o nome para uma variável de ambiente e fazer deploy. Com ela, o cliente
 * aponta a câmera para um QR code e acabou.
 *
 * ── POR QUE SEPARADA DE `CanalDeMensagens` ──
 *
 * `CanalDeMensagens` ENVIA. Esta ADMINISTRA. São credenciais diferentes no mesmo
 * provedor — a Evolution tem um token por instância (mandar mensagem) e um token global
 * (criar e apagar instância), e o cabeçalho de `evolution/config.ts` explica por que
 * misturá-los é caro: quem vaza o de envio manda mensagem pelo número do negócio; quem
 * vaza o global apaga o servidor inteiro.
 *
 * Separar as portas é o que permite, amanhã, o envio rodar com o token fraco enquanto só
 * este caminho carrega o forte. Juntas, a distinção seria uma convenção — e convenção
 * não sobrevive ao terceiro programador.
 *
 * ⚠️ `instancia` é ARGUMENTO, não configuração. Toda a v1 da MAISA leu o nome da
 * instância de `EVOLUTION_INSTANCIA`, uma env global — o que significa, literalmente, um
 * WhatsApp para todos os inquilinos. Enquanto o nome vier do ambiente, não existe
 * multi-inquilino nenhum, por mais que o resto do sistema receba `ContextoTenant`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { EstadoDoCanal, Pareamento } from "../../dominio/canal";

export interface ProvisionamentoDeCanal {
  /**
   * Em que pé está o pareamento desta instância no provedor — e com QUAL número.
   *
   * ⚠️ Devolve os dois juntos porque são a mesma pergunta, e separá-los reabriria o bug
   * que criou este comentário: a coluna `numero` ficou `null` por dias porque o caso de
   * uso gravava o número que já tinha (nenhum) em vez de perguntar. A única fonte do
   * número é o PROVEDOR, então quem responde "está conectado?" tem que responder "com
   * quem?" no mesmo ato.
   *
   * ⚠️ Em 17/08/2026 este comentário dizia também *"o dono nunca digita o telefone — ele
   * aponta a câmera para um QR"*, e a segunda metade deixou de ser verdade: o pareamento
   * por código (ver `conectar`) obriga a perguntar o número. A primeira metade continua
   * valendo, e é a que importa — o digitado é insumo, o `ownerJid` é o fato. Quem gravar
   * o número digitado em `integracoes_whatsapp.numero` está reabrindo o mesmo bug pela
   * porta oposta: em vez de nunca escrever, escreve cedo demais e mente quando o dono
   * errar um dígito.
   */
  estado(instancia: string): Promise<EstadoDoCanal>;

  /**
   * Garante a instância no provedor e devolve o QR — ou o código — para parear.
   *
   * Idempotente por natureza, e é o que a torna segura de chamar de um botão: se a
   * instância existe e está `open`, devolve `conectado` sem QR e sem destruir nada; se
   * existe num estado intermediário (`connecting`/`close`), apaga e recria — que é o
   * único jeito de a Evolution emitir um QR novo.
   *
   * `urlWebhook` e `segredo` entram aqui porque o webhook precisa ser apontado no MESMO
   * ato da criação. Deixar para um segundo passo produz a falha mais difícil de
   * diagnosticar do produto: o cliente pareia, vê "conectado", manda "oi" e ninguém
   * responde — porque as mensagens estão indo para lugar nenhum.
   *
   * ── `numero`: O QUE ELE MUDA, E O QUE ELE NÃO MUDA ──
   *
   * Presente, pede ao WhatsApp um código de 8 caracteres para AQUELE telefone, e o
   * `Pareamento` volta com `codigo` em vez de `qrcode`. Ausente, é o caminho de sempre.
   * A escolha é da tela porque só ela sabe em que aparelho a pessoa está — no celular o
   * QR é impossível de ler, e no computador o código é trabalho a mais.
   *
   * ⚠️ ELE NÃO APONTA O CANAL PARA LUGAR NENHUM. É a pergunta que separa parâmetro
   * inofensivo de buraco de segurança, e vale respondê-la aqui: o `numero` não escolhe
   * instância (isso é `instancia`, derivada do inquilino), não escolhe destino de webhook
   * (isso é `urlWebhook`, do ambiente) e não escreve no banco. Ele só diz em qual celular
   * o WhatsApp deve mostrar a tela de confirmação — e quem confirma lá é o dono do
   * aparelho. Digitar o número de outra pessoa não conecta o WhatsApp dela: gera um
   * código que ela teria que digitar por vontade própria, dentro do app dela.
   *
   * Em E.164 sem `+` (`5511994294906`). Quem valida é `numeroParaPareamento`, no domínio.
   */
  conectar(p: {
    instancia: string;
    urlWebhook: string;
    segredo: string;
    /** Pedir código para este telefone em vez de QR. Ver o bloco acima. */
    numero?: string;
  }): Promise<Pareamento>;

  /** Apaga a instância no provedor. Silencioso se ela já não existe. */
  desconectar(instancia: string): Promise<void>;

  /** O que falta no ambiente para esta porta funcionar. Vazio = pronta. */
  faltando(): string[];
}

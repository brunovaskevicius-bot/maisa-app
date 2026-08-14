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
   * uso gravava o número que já tinha (nenhum) em vez de perguntar. O dono nunca digita
   * o telefone — ele aponta a câmera para um QR. A única fonte do número é o provedor,
   * então quem responde "está conectado?" tem que responder "com quem?" no mesmo ato.
   */
  estado(instancia: string): Promise<EstadoDoCanal>;

  /**
   * Garante a instância no provedor e devolve o QR para parear.
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
   */
  conectar(p: { instancia: string; urlWebhook: string; segredo: string }): Promise<Pareamento>;

  /** Apaga a instância no provedor. Silencioso se ela já não existe. */
  desconectar(instancia: string): Promise<void>;

  /** O que falta no ambiente para esta porta funcionar. Vazio = pronta. */
  faltando(): string[];
}

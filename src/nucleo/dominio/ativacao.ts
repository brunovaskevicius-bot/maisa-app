/* ─────────────────────────────────────────────────────────────────────────────
 * ATIVAÇÃO — o quanto deste negócio já está de pé.
 *
 * ⚠️ NÃO EXISTE COLUNA `onboarding_step`, E ISSO É A DECISÃO CENTRAL DESTE ARQUIVO.
 *
 * O progresso é DERIVADO do mundo: pergunta-se ao banco se há WhatsApp conectado, se há
 * agenda ligada, se alguém já mandou mensagem. Uma flag de passo seria mais barata de ler
 * e erraria de dois jeitos que a derivação não tem como errar:
 *
 *   • DESSINCRONIZA. O dono conecta o WhatsApp por outro caminho (a tela de ajustes, um
 *     suporte, o próprio wizard interrompido no meio) e a flag continua dizendo que não.
 *   • REPETE. Quem já cadastrou serviço antes de ver o wizard é obrigado a fazer de novo,
 *     porque a flag não sabe que ele fez.
 *
 * O preço é uma consulta por passo, e ele é pequeno perto de um checklist que mente.
 * Veio do `getOnboardingStatus` do Smiller (`onboardingService.ts:59`), que já tinha
 * chegado à mesma conclusão.
 *
 * ── O ÚLTIMO PASSO É USO, NÃO CONFIGURAÇÃO ──
 *
 * `primeira_conversa` não é "está tudo configurado", é "você viu funcionar". É a diferença
 * entre setup completo e ativação de verdade — e é o passo que decide se a pessoa fica.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * Os passos, na ordem em que fazem sentido para quem está começando.
 *
 * ⚠️ A ORDEM É CONTRATO: a tela desenha os cartões nesta sequência, e `porcentagem` conta
 * quantos dos cinco estão feitos. Acrescentar um passo muda a porcentagem de todo mundo —
 * é mudança de produto, não de tipo.
 */
export const PASSOS_DE_ATIVACAO = [
  /** Existe inquilino. Verdadeiro sempre que se consegue perguntar — quem não tem negócio
   *  não chega a esta rota, porque o porteiro barra antes com 409 `sem_negocio`. */
  "negocio_criado",
  /** O dono mexeu no catálogo semeado: preço, duração, nome ou o liga/desliga de algum
   *  serviço. Sem isso ele está vendendo os cinco chutes de `criar_negocio()`. */
  "catalogo_ajustado",
  /** Há instância pareada. É o passo que separa "configurei" de "a MAISA atende". */
  "whatsapp_conectado",
  /** Alguma agenda do Google ligada. Sem ela a MAISA marca no vazio. */
  "agenda_conectada",
  /** Alguém conversou com a MAISA — a prova de que o conjunto funciona. */
  "primeira_conversa",
] as const;

export type PassoDeAtivacao = (typeof PASSOS_DE_ATIVACAO)[number];

export type ProgressoDaAtivacao = {
  feitos: PassoDeAtivacao[];
  /** 0–100, inteiro. Quem arredonda é aqui, para tela e teste concordarem. */
  porcentagem: number;
  /** `true` quando não falta nada. A tela usa para esconder o cartão de vez. */
  completo: boolean;
};

/**
 * Monta o progresso a partir do que foi apurado.
 *
 * Existe como função de domínio, e não como três linhas dentro do adaptador, porque a
 * conta da porcentagem tem que ser a MESMA no Supabase e no demo. Duas cópias divergem no
 * dia em que um passo entrar na lista — e o sintoma seria a barra chegando a 100% com um
 * cartão ainda aberto.
 */
export function progressoDe(feitos: readonly PassoDeAtivacao[]): ProgressoDaAtivacao {
  /* Filtra pela lista canônica e deduplica: quem monta o array é um adaptador, e um passo
   * repetido passaria de 100%. Também garante a ORDEM, que é contrato com a tela. */
  const unicos = PASSOS_DE_ATIVACAO.filter((p) => feitos.includes(p));
  const porcentagem = Math.round((unicos.length / PASSOS_DE_ATIVACAO.length) * 100);
  return { feitos: unicos, porcentagem, completo: unicos.length === PASSOS_DE_ATIVACAO.length };
}

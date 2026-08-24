/* ─────────────────────────────────────────────────────────────────────────────
 * DOMÍNIO — o "pronto para emitir?", e a honestidade sobre o que a gente NÃO sabe.
 *
 * ★ ELE EXISTE PORQUE O e-CAC RECUSA EM VOCABULÁRIO DE RECEITA, DEPOIS DA VIAGEM.
 *
 * Os quatro erros que a análise devolveu em 21/08/2026 foram:
 *
 *   Código Ocupação ........ "Ocupação não cadastrada."
 *   Registro Profissional .. "Registro profissional não informado pelo conselho profissional."
 *   CPF Titular Pagamento .. "Titular do pagamento inválido."
 *   CPF Beneficiário ....... "Beneficiário do serviço inválido."
 *
 * Os dois últimos eram nossos — CPF que não fecha no dígito — e `cpfValido` resolveu. Os dois
 * primeiros **não são consertáveis daqui**: a Receita os lê do cadastro DELA no Carnê-Leão Web,
 * não do nosso arquivo. Mandar o CRP no campo 16 não muda: o cruzamento é CPF ↔ base do
 * conselho, não "o número foi digitado".
 *
 * ── ⚠️ TRÊS ESTADOS, E O TERCEIRO É O QUE FAZ ISTO VALER ──
 *
 * `pronto` e `falta` a gente calcula. `nao_da_para_saber` é o que está do outro lado do muro:
 * se ela configurou o Carnê-Leão deste ano, se o conselho mandou a base para a Receita.
 *
 * Um checkbox verde ali seria mentira — e mentira caríssima, porque ela sairia da tela achando
 * que está tudo certo e descobriria no e-CAC, sozinha, em vocabulário de Receita. Então o item
 * aparece como "só você sabe", com o link e as palavras exatas dos botões que ela vai ver.
 *
 * ── POR QUE O CRP NÃO BLOQUEIA ──
 *
 * Porque o campo 16 do arquivo **aceita vazio** (manual 2.1, pergunta 25), e o que trava a
 * emissão é o cadastro dela, não o nosso campo. Tratar como obrigatório impediria de gerar
 * arquivo por causa de um dado que a Receita nem exige — e o custo de errar para esse lado é
 * ela não conseguir fechar o mês por nada.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ConfigFiscal } from "./fiscal";
import { CODIGO_OCUPACAO, type OcupacaoSaude } from "./recibo-saude";
import { soDigitos } from "./clientes";

/**
 * O Carnê-Leão, direto na escrituração.
 *
 * ★ DEEP LINK, e a decisão foi revista em 24/08/2026. A primeira versão apontava para a página
 * de serviço do gov.br justamente para não depender de URL interna do e-CAC — mas o custo disso
 * é a pessoa cair numa página institucional e ter que achar sozinha o caminho dentro do portal
 * logado. Para quem tem pouca intimidade com computador, isso é onde ela desiste.
 *
 * ⚠️ O PREÇO DE ERRAR AQUI É QUEBRA SILENCIOSA: se a rota mudar, o e-CAC redireciona para o
 * login ou para a home logada, e ela conclui que clicou errado. Testado em 24/08/2026 — mas
 * todas as rotas do `/carneleao/` respondem 302 para o login quando deslogado, então **não dá
 * para verificar caminho de dentro sem sessão**. Por isso só esta URL está aqui: é a única que
 * alguém abriu e viu funcionar. Não inventar `/identificacao` nem `/configuracoes`.
 *
 * `LINK_ECAC_SERVICO` fica como saída para quem não está logada — ver `linkAlternativo`.
 */
export const LINK_CARNE_LEAO = "https://www3.cav.receita.fazenda.gov.br/carneleao/escrituracao";

/** A página de serviço do gov.br. Não é deep link, então não quebra — é a rede de segurança. */
export const LINK_ECAC_SERVICO = "https://www.gov.br/pt-br/servicos/apurar-carne-leao";

/** O e-mail da Receita para o caso em que tudo está certo e ainda recusa. Fonte: CRP-MG. */
export const EMAIL_RECEITA_SAUDE = "receitasaude.cofis@rfb.gov.br";

export type EstadoDoItem =
  /** A gente confere e está certo. */
  | "pronto"
  /** A gente confere e falta. Acionável aqui dentro. */
  | "falta"
  /**
   * ⚠️ ESTÁ DO OUTRO LADO DO MURO. Não é "não checamos ainda": é impossível checar daqui.
   * O item vira instrução, nunca selo verde.
   */
  | "nao_da_para_saber";

export type ItemDoChecklist = {
  id: "cpf" | "profissao" | "registro" | "carne_leao" | "ensaio";
  titulo: string;
  /** Uma frase em português de gente. Vai na tela como está. */
  detalhe: string;
  estado: EstadoDoItem;
  link?: { url: string; rotulo: string };
  /**
   * A saída quando o deep link não abre — porque ela não está logada, ou porque a Receita mudou
   * a rota. Sem isto, link quebrado numa tela fiscal vira "não funciona" em vez de "faça login".
   */
  linkAlternativo?: { url: string; rotulo: string };
  /** O que clicar do outro lado, com os nomes dos botões que ela VAI VER na tela. */
  passos?: string[];
};

/** Nome da profissão como ela aparece na lista do Carnê-Leão. */
const NOME_DA_OCUPACAO: Record<OcupacaoSaude, string> = {
  medico: "Médico",
  odontologo: "Cirurgião-dentista",
  fonoaudiologo: "Fonoaudiólogo",
  fisioterapeuta: "Fisioterapeuta",
  terapeuta_ocupacional: "Terapeuta ocupacional",
  psicologo: "Psicólogo",
};

/** Como o conselho da profissão se chama — para a frase falar a língua dela. */
const CONSELHO: Record<OcupacaoSaude, string> = {
  medico: "CRM",
  odontologo: "CRO",
  fonoaudiologo: "CRFa",
  fisioterapeuta: "CREFITO",
  terapeuta_ocupacional: "CREFITO",
  psicologo: "CRP",
};

export function checklistDoRecibo(c: ConfigFiscal, hoje: string): ItemDoChecklist[] {
  const ano = hoje.slice(0, 4);
  const ocupacao = c.ocupacaoSaude;
  const conselho = ocupacao ? CONSELHO[ocupacao] : "conselho";
  const profissao = ocupacao ? NOME_DA_OCUPACAO[ocupacao] : null;
  const codigo = ocupacao ? CODIGO_OCUPACAO[ocupacao] : null;
  const registro = (c.registroProfissional ?? "").trim();

  const itens: ItemDoChecklist[] = [];

  itens.push({
    id: "cpf",
    titulo: "Seu CPF",
    estado: soDigitos(c.prestadorCpf ?? "").length === 11 ? "pronto" : "falta",
    detalhe: soDigitos(c.prestadorCpf ?? "").length === 11
      /* O CPF do arquivo tem que ser o MESMO que acessa o Carnê-Leão. É o erro mais silencioso
       * possível: tudo passa, e a Receita recusa o arquivo inteiro sem dizer por quê. */
      ? "Tem que ser o mesmo CPF com que você entra no gov.br."
      : "Sem ele não há arquivo — é o CPF de quem emite o recibo.",
  });

  itens.push({
    id: "profissao",
    titulo: "Sua profissão",
    estado: ocupacao ? "pronto" : "falta",
    detalhe: ocupacao
      ? `${profissao} — código ${codigo} no arquivo da Receita.`
      : "A Receita só aceita recibo de saúde de seis profissões, e o código muda por profissão.",
  });

  itens.push({
    id: "registro",
    titulo: `Seu ${conselho}`,
    estado: registro ? "pronto" : "falta",
    detalhe: registro
      ? `${registro} — vai no arquivo, e é o que a Receita cruza com a base do ${conselho}.`
      /* ⚠️ "Não bloqueia" está na frase de propósito: sem isso ela para o fechamento do mês
       * achando que precisa resolver antes, e não precisa. */
      : `Preencha para o número ir no arquivo. Não bloqueia gerar, mas é o que a Receita confere contra o ${conselho}.`,
  });

  /* ── ★ O ITEM QUE A GENTE NÃO PODE FINGIR QUE SABE ── */
  itens.push({
    id: "carne_leao",
    titulo: `Cadastro no Carnê-Leão de ${ano}`,
    estado: "nao_da_para_saber",
    detalhe:
      `Isto fica no site da Receita, não aqui — só você consegue ver. **O cadastro é por ano**: `
      + `quem fez em ${Number(ano) - 1} e não refez está de fora. É daqui que vêm os dois erros `
      + `que mais aparecem, "Ocupação não cadastrada" e "Registro profissional não informado `
      + `pelo conselho".`,
    link: { url: LINK_CARNE_LEAO, rotulo: "Abrir meu Carnê-Leão" },
    linkAlternativo: { url: LINK_ECAC_SERVICO, rotulo: "Não abriu? Entre pelo e-CAC" },
    /* Os nomes dos botões são os que aparecem na tela dela. Instrução que não usa as mesmas
     * palavras do site é instrução que faz a pessoa desistir no meio.
     *
     * ⚠️ O "Declarações e Demonstrativos → Acessar Carnê-Leão" SAIU daqui em 24/08/2026: o link
     * agora cai dentro do Carnê-Leão, e repetir um passo que ela já pulou faz duvidar de que
     * está no lugar certo. */
    passos: [
      "No menu, abra Configurações e marque que você é trabalhador autônomo",
      `Em Identificação → Ocupações, escolha "${profissao ?? "sua profissão"}", digite o ${conselho} e clique em Adicionar`,
      "Salvar Identificação",
    ],
  });

  itens.push({
    id: "ensaio",
    titulo: "Testar sem emitir nada",
    estado: "nao_da_para_saber",
    detalhe:
      "O e-CAC tem uma conferência que **aponta os erros sem emitir recibo nenhum** — de graça e "
      + "quantas vezes você quiser. Vale sempre fazer antes: se voltar sem erro, aí sim importe.",
    /* O link cai NA escrituração, que é exatamente esta tela. Dois cliques até o resultado. */
    link: { url: LINK_CARNE_LEAO, rotulo: "Abrir a escrituração" },
    linkAlternativo: { url: LINK_ECAC_SERVICO, rotulo: "Não abriu? Entre pelo e-CAC" },
    passos: [
      "Clique em Importar Escrituração",
      "Escolha o arquivo e clique em Analisar Arquivo",
      "Voltou sem erro? Então importe de verdade",
    ],
  });

  return itens;
}

/**
 * Falta algo que a gente consegue consertar aqui dentro?
 *
 * Só conta `falta`. Os `nao_da_para_saber` nunca somam — senão o aviso ficaria aceso para
 * sempre, e aviso que nunca apaga é aviso que ninguém lê.
 */
export function faltaNoChecklist(itens: ItemDoChecklist[]): number {
  return itens.filter((i) => i.estado === "falta").length;
}

/**
 * O que fazer quando o e-CAC recusa mesmo com tudo em ordem.
 *
 * A escada existe porque o último degrau é real e quase ninguém sabe dele: há um e-mail da
 * Cofis para exatamente este caso. Sem isto, a profissional com registro ativo, cadastro em dia
 * e recusa persistente não tem para onde ir — e conclui que o produto está quebrado.
 */
export function seAindaRecusar(ocupacao: OcupacaoSaude | null): string[] {
  const conselho = ocupacao ? CONSELHO[ocupacao] : "seu conselho";
  return [
    `Confira se o cadastro no Carnê-Leão é deste ano — ele não se renova sozinho.`,
    `Se estiver, ligue no ${conselho}: pode ser que o registro não tenha ido na base que eles`
    + ` mandam para a Receita, que é atualizada uma vez por mês.`,
    `Registro ativo há mais de 30 dias, cadastro em dia e ainda recusando: escreva para`
    + ` ${EMAIL_RECEITA_SAUDE}. É o canal da Receita para este caso específico.`,
  ];
}

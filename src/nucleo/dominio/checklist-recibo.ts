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

import { procuracaoAVencer, representacao, type ConfigFiscal } from "./fiscal";
import { rotuloBR } from "./tempo";
import { CODIGO_OCUPACAO, type OcupacaoSaude } from "./recibo-saude";
import { soDigitos } from "./clientes";

/**
 * O Carnê-Leão — pelo login COM CÓDIGO DE SERVIÇO, que é o único formato que sobrevive à
 * autenticação.
 *
 * ★ QUATRO URLS FORAM MEDIDAS EM 24/08/2026, E O QUE AS SEPARA É UM PARÂMETRO. Hop a hop:
 *
 *   /carneleao/escrituracao          → 302 → /autenticacao/login                   ✗
 *   /carneleao/demonstrativo         → 302 → /autenticacao/login                   ✗
 *   /ecac/                           → 302 → /autenticacao/login                   ✗
 *   /autenticacao/login/index/10028  → 302 → servicos.receitafederal.gov.br/login
 *                                             ?redirectUrl=…/login.aspx?sistema=10028   ✓
 *
 * ⚠️ **AS TRÊS PRIMEIRAS CAEM NUM LOGIN SEM PARÂMETRO DE RETORNO.** O destino é descartado: ela
 * entra e chega na home do e-CAC, tendo que achar o caminho sozinha. Não adianta apontar para
 * uma tela "mais funda" — `/demonstrativo` e `/escrituracao` morrem no mesmo lugar que `/ecac/`.
 *
 * A quarta carrega `redirectUrl` **e** `sistema=10028` até o SSO de verdade
 * (`servicos.receitafederal.gov.br`, host diferente do portal), e o destino atravessa o login.
 *
 * ★ O `10028` É O SERVIÇO, NÃO ENFEITE — e não foi adivinhado: é o que o botão *Iniciar* da
 * página oficial do Carnê-Leão no gov.br usa. "Limpar" a URL tirando o código é exatamente o
 * que quebrou naquela manhã. O sintoma de tirar é ela cair na home logada e não achar nada; o
 * pior visto naquele dia foi terminar em `/autenticacao/Login/Logout` — a tela de SAIR — depois
 * de tentar entrar pelo login sem código.
 */
export const LINK_CARNE_LEAO = "https://cav.receita.fazenda.gov.br/autenticacao/login/index/10028";

/**
 * A mesma porta, pela página pública do gov.br — é dela que o código de serviço saiu. Não
 * pertence ao portal autenticado: não expira, não desloga e não redireciona. É a saída para
 * quando o login trava.
 */
export const LINK_ECAC_SERVICO = "https://www.gov.br/pt-br/servicos/apurar-carne-leao";

/**
 * As procurações do e-CAC — **serviço 51**, não 10028.
 *
 * Mesmo mecanismo do `LINK_CARNE_LEAO` e mesma verificação, em 24/08/2026:
 *
 *   /autenticacao/login/index/51 → 302 → servicos.receitafederal.gov.br/login
 *                                         ?redirectUrl=…/login.aspx?sistema=51   ✓
 *
 * ⚠️ NÃO REAPROVEITE O LINK DO CARNÊ-LEÃO AQUI. Outorgar procuração é outro serviço do portal;
 * mandar `sistema=10028` levaria ela para a escrituração e o passo a passo falaria de um menu
 * que não está na tela. O `51` saiu da página oficial `gov.br/pt-br/servicos/
 * cadastrar-ou-cancelar-procuracao-para-acesso-ao-e-cac`, não de tentativa.
 */
export const LINK_PROCURACAO = "https://cav.receita.fazenda.gov.br/autenticacao/login/index/51";

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
  id: "cpf" | "profissao" | "registro" | "procuracao" | "carne_leao" | "ensaio";
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

/**
 * Nome da profissão como ela aparece na lista do Carnê-Leão.
 *
 * ⚠️ EXPORTADO PARA A TELA ESCOLHER DAQUI, e não manter a sua própria lista. São seis, fechadas
 * pela Receita (IN 2.240/2024) — duas listas divergindo dariam um rótulo na tela e outro no
 * arquivo, para o mesmo código. Ver `CODIGO_OCUPACAO`.
 */
export const NOME_DA_OCUPACAO: Record<OcupacaoSaude, string> = {
  medico: "Médico",
  odontologo: "Cirurgião-dentista",
  fonoaudiologo: "Fonoaudiólogo",
  fisioterapeuta: "Fisioterapeuta",
  terapeuta_ocupacional: "Terapeuta ocupacional",
  psicologo: "Psicólogo",
};

/**
 * Como o conselho da profissão se chama — para a frase falar a língua dela.
 *
 * Exportado pelo mesmo motivo de `NOME_DA_OCUPACAO`: o rótulo do campo na tela muda enquanto
 * ela escolhe a profissão, e não dá para ler do checklist (que reflete o que está SALVO).
 */
export const CONSELHO: Record<OcupacaoSaude, string> = {
  medico: "CRM",
  odontologo: "CRO",
  fonoaudiologo: "CRFa",
  fisioterapeuta: "CREFITO",
  terapeuta_ocupacional: "CREFITO",
  psicologo: "CRP",
};

/** 000.000.000-00 ou 00.000.000/0000-00 — o documento como ela vai conferir na tela do e-CAC. */
function documentoFormatado(d: string): string {
  return d.length === 11
    ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Os seis cliques da outorga, com os nomes dos menus do e-CAC.
 *
 * ⚠️ A PERMISSÃO É "IRPF – Carnê Leão Web", E ELA É O PASSO QUE TODO MUNDO ERRA. A tela do e-CAC
 * lista dezenas de serviços; marcar o errado gera uma procuração válida que **não serve**, e a
 * descoberta acontece só na primeira emissão, dias depois.
 *
 * Exportado porque o onboarding pede a mesma coisa que a renovação — e duas listas divergindo
 * dariam instruções diferentes para o mesmo ato.
 */
export function passosDaProcuracao(procurador: string): string[] {
  return [
    "Entre com a conta gov.br — precisa ser nível prata ou ouro",
    "Não caiu em Procurações? Abra Senhas e Procurações → Cadastro, Consulta e Cancelamento · Procuração para e-CAC",
    "Clique em Cadastrar Procuração",
    `No CPF/CNPJ do procurador, informe ${documentoFormatado(procurador)}`,
    `Marque a permissão "IRPF – Carnê Leão Web"`,
    "Confirme clicando em Cadastrar Procuração",
  ];
}

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

  /* ── ★ A PROCURAÇÃO, QUANDO EXISTE ──
   *
   * Vem antes do Carnê-Leão de propósito: para quem outorgou, este é o item que descreve o
   * produto que ela comprou, e o de baixo vira "a MAISA cuida". Para quem não outorgou, ele
   * não existe e nada muda. */
  const rep = representacao(c, hoje);

  if (rep.modo === "vencida") {
    itens.push({
      id: "procuracao",
      titulo: "Sua procuração venceu",
      /* `falta`, não `nao_da_para_saber`: isto a gente sabe, é acionável, e sem ele a emissão
       * para. É a única pendência deste checklist que faz o botão deixar de funcionar. */
      estado: "falta",
      detalhe:
        `Venceu em ${rotuloBR(rep.ate)}. Enquanto não for renovada, a MAISA não consegue emitir `
        + `no seu nome e os recibos ficam parados. Renovar leva um minuto e é você quem faz — `
        + `a Receita exige que a autorização venha de você.`,
      link: { url: LINK_PROCURACAO, rotulo: "Renovar no e-CAC" },
      linkAlternativo: { url: LINK_ECAC_SERVICO, rotulo: "Travou no login? Entre pelo gov.br" },
      passos: passosDaProcuracao(rep.procurador),
    });
  } else if (rep.modo === "representada") {
    const aVencer = procuracaoAVencer(rep);
    itens.push({
      id: "procuracao",
      titulo: aVencer ? "Sua procuração está para vencer" : "Sua procuração",
      estado: aVencer ? "falta" : "pronto",
      detalhe: rep.ate
        ? (aVencer
          ? `Vale até ${rotuloBR(rep.ate)} — faltam ${rep.diasParaVencer} dias. Renove antes de `
            + `vencer: depois disso a emissão para até você autorizar de novo.`
          : `A MAISA emite seus recibos no seu nome, com a procuração que você deu no e-CAC. `
            + `Vale até ${rotuloBR(rep.ate)}.`)
        : "A MAISA emite seus recibos no seu nome, com a procuração que você deu no e-CAC. "
          + "Você não pôs prazo, então ela vale até você cancelar.",
      ...(aVencer
        ? {
            link: { url: LINK_PROCURACAO, rotulo: "Renovar no e-CAC" },
            passos: passosDaProcuracao(rep.procurador),
          }
        : {}),
    });
  }

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
    linkAlternativo: { url: LINK_ECAC_SERVICO, rotulo: "Travou no login? Entre pelo gov.br" },
    /* Os nomes dos botões são os que aparecem na tela dela. Instrução que não usa as mesmas
     * palavras do site é instrução que faz a pessoa desistir no meio.
     *
     * ★ O PASSO DE NAVEGAÇÃO É CONDICIONAL, e a condição é o que a gente não consegue verificar:
     * com `sistema=10028` ela DEVE cair dentro do Carnê-Leão, mas o que acontece depois do login
     * não se mede sem sessão. Afirmar que cai seria mentir se não cair; mandar navegar sempre
     * faria ela procurar um menu que já não está na frente dela. Então a frase cobre os dois. */
    passos: [
      "Entre com a conta gov.br — é a mesma do Meu INSS",
      "Não caiu direto no Carnê-Leão? Em Declarações e Demonstrativos, clique em Acessar Carnê-Leão",
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
    link: { url: LINK_CARNE_LEAO, rotulo: "Abrir meu Carnê-Leão" },
    linkAlternativo: { url: LINK_ECAC_SERVICO, rotulo: "Travou no login? Entre pelo gov.br" },
    passos: [
      "Entre com o gov.br — se não cair no Carnê-Leão, Declarações e Demonstrativos → Acessar Carnê-Leão",
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

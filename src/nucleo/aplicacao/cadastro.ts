/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — ler e ajustar o cadastro do negócio.
 *
 * O que o painel precisa antes de desenhar a primeira tela: quem eu sou, quem atende, o
 * que eu vendo, quem são meus clientes, e quais agendas eu posso operar.
 *
 * Curto de propósito. Não há regra nova aqui — a regra é a `agendasPermitidas`, que já
 * mora no repositório porque é allowlist de autorização e não pode ser recalculada por
 * quem consome. O valor deste arquivo é OUTRO: ele é o lugar onde as telas param de
 * importar `adaptadores/saida/demo` e passam a pedir ao app. Enquanto a leitura era um
 * `import * as D`, cada tela carregava a decisão de onde o dado vem — e por isso trocar
 * fixture por banco era 166 pontos de mudança em 8 arquivos em vez de uma linha em
 * `composicao.ts`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  AjustarNegocio,
  AjustarProfissional,
  AjustarServico,
  CadastroDoNegocio,
  LerCadastro,
  RemoverServico,
} from "../portas/entrada/casos-de-uso";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import type { Negocio } from "../dominio/negocio";
import type { Profissional, Servico } from "../dominio/catalogo";
import { NOME_NEGOCIO_MAX, NOME_NEGOCIO_MIN, normalizarNomeDoNegocio } from "../dominio/negocio";
import {
  DURACAO_MAX,
  DURACAO_MIN,
  NOME_PROFISSIONAL_MAX,
  NOME_PROFISSIONAL_MIN,
  NOME_SERVICO_MAX,
  PAPEL_MAX,
  PRECO_MAX,
  ehCategoria,
} from "../dominio/catalogo";
import { colapsarEspaco, temConteudo } from "../dominio/texto";
import { DadoInvalido } from "../dominio/erros";

export function criarLerCadastro(deps: { negocio: RepositorioNegocio }): LerCadastro {
  return async (t): Promise<CadastroDoNegocio> => {
    /* Em paralelo: cinco leituras independentes, nenhuma ordem entre elas e nenhuma
     * transação a respeitar. Em série a latência delas soma, e isto está no caminho da
     * primeira pintura do painel. */
    const [negocio, profissionais, servicos, clientes, agendas] = await Promise.all([
      deps.negocio.negocio(t),
      deps.negocio.profissionais(t),
      deps.negocio.servicos(t),
      deps.negocio.clientes(t),
      deps.negocio.agendasPermitidas(t),
    ]);

    return { negocio, profissionais, servicos, clientes, agendas };
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AJUSTAR O NEGÓCIO — hoje, só o nome.
 *
 * ⚠️ Este campo entra no PROMPT do agente a cada mensagem e no texto do lembrete. É por
 * isso que ele valida aqui em vez de deixar o banco reclamar: o `check` de
 * `provisionar_negocio` só cobre o mínimo de 2 caracteres, e não existe teto nenhum na
 * coluna. Sem esta função, `{"nome":"<mil caracteres>"}` seria aceito, gravado, e viraria
 * token pago em toda mensagem daquele inquilino — além de ser o lugar óbvio para escrever
 * instrução dentro de um campo de cadastro.
 *
 * O nome vazio tem tratamento PRÓPRIO, e não cai no mínimo de 2: quem apaga o campo
 * inteiro está tentando limpar, não digitando errado, e a frase precisa dizer isso.
 * Devolver "precisa de 2 caracteres" para um campo em branco manda procurar o problema
 * no que se digitou, quando o problema é o que não se digitou.
 * ────────────────────────────────────────────────────────────────────────────── */
export function criarAjustarNegocio(deps: { negocio: RepositorioNegocio }): AjustarNegocio {
  return async (t, p): Promise<Negocio> => {
    const nome = normalizarNomeDoNegocio(p?.nome ?? "");

    if (!nome) {
      throw new DadoInvalido("O negócio precisa de um nome — ele aparece no WhatsApp do cliente.", "nome");
    }
    if (nome.length < NOME_NEGOCIO_MIN) {
      throw new DadoInvalido(`O nome precisa de pelo menos ${NOME_NEGOCIO_MIN} caracteres.`, "nome");
    }
    if (nome.length > NOME_NEGOCIO_MAX) {
      throw new DadoInvalido(`O nome passa de ${NOME_NEGOCIO_MAX} caracteres.`, "nome");
    }

    return deps.negocio.renomear(t, nome);
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AJUSTAR O CATÁLOGO — serviço e quem atende.
 *
 * A validação mora aqui, e não na rota, por dois motivos concretos:
 *
 * 1. O WIZARD E A TELA DE SERVIÇOS SÃO O MESMO CAMINHO. Regra escrita na rota valeria só
 *    para quem entra por HTTP — e o onboarding, um script de venda assistida e um futuro
 *    import de planilha precisam da mesma recusa.
 * 2. O BANCO JÁ RECUSA, MAS RECUSA FEIO. `duracao between 5 and 480` levanta
 *    `check_violation`, que vira 500 genérico. "O atendimento precisa durar pelo menos 5
 *    minutos" é a mesma regra dita para quem pode consertá-la.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * Aceita número ou string, porque é isto que chega de um `<input type="number">`.
 *
 * ⚠️ NÃO USA `Number()` NEM `parseFloat` DIRETO. `Number("")` é 0 — então um campo de
 * preço apagado viraria serviço grátis, gravado, sem erro. E `parseFloat("12abc")` é 12,
 * o que aceita lixo colado. Aqui, o que não for número inteiro de verdade vira `null`, e
 * quem chama decide a frase.
 *
 * Vírgula decimal é convertida: quem digita preço no Brasil digita "59,90", e recusar
 * isso seria ensinar o dono a formatar número para o banco de dados.
 */
function numeroOuNulo(bruto: unknown): number | null {
  if (typeof bruto === "number") return Number.isFinite(bruto) ? bruto : null;
  if (typeof bruto !== "string") return null;
  const limpo = bruto.trim().replace(",", ".");
  if (limpo === "") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export function criarAjustarServico(deps: { negocio: RepositorioNegocio }): AjustarServico {
  return async (t, p): Promise<Servico> => {
    const nome = colapsarEspaco(p?.nome);

    if (!temConteudo(nome)) {
      throw new DadoInvalido("Diga o nome do serviço.", "nome");
    }
    if (nome.length > NOME_SERVICO_MAX) {
      throw new DadoInvalido(`O nome passa de ${NOME_SERVICO_MAX} caracteres.`, "nome");
    }

    if (!ehCategoria(p?.categoria)) {
      throw new DadoInvalido("Escolha se é Recorrente, Pacote ou Extra.", "categoria");
    }

    const preco = numeroOuNulo(p?.preco);
    if (preco === null) {
      throw new DadoInvalido("Diga quanto custa — use 0 se for gratuito.", "preco");
    }
    if (preco < 0) {
      throw new DadoInvalido("O preço não pode ser negativo.", "preco");
    }
    if (preco > PRECO_MAX) {
      /* O teto real da coluna é 99.999.999,99. Este é o de TECLADO: quem digita 20000
       * querendo R$ 200,00 precisa ouvir agora, não quando a MAISA anunciar o preço. */
      throw new DadoInvalido("Confira o preço — esse valor parece alto demais.", "preco");
    }

    const duracao = numeroOuNulo(p?.duracao);
    if (duracao === null) {
      throw new DadoInvalido("Diga quantos minutos dura o atendimento.", "duracao");
    }
    if (!Number.isInteger(duracao)) {
      /* A coluna é `integer`. Meia hora e meia (`45.5`) não existe na grade, que anda de
       * 30 em 30 — e um `numeric` mandado para `integer` é erro do Postgres, não
       * arredondamento. Arredondar aqui em silêncio gravaria uma duração que ninguém
       * pediu. */
      throw new DadoInvalido("A duração é em minutos inteiros.", "duracao");
    }
    if (duracao < DURACAO_MIN || duracao > DURACAO_MAX) {
      throw new DadoInvalido(
        `A duração precisa ficar entre ${DURACAO_MIN} minutos e ${DURACAO_MAX / 60} horas.`,
        "duracao",
      );
    }

    return deps.negocio.salvarServico(t, {
      ...(p.id ? { id: p.id } : {}),
      nome,
      categoria: p.categoria,
      preco,
      duracao,
      ...(p.ativo === undefined ? {} : { ativo: p.ativo }),
    });
  };
}

export function criarRemoverServico(deps: { negocio: RepositorioNegocio }): RemoverServico {
  return async (t, id): Promise<void> => {
    /* Recusa antes de tocar o banco, igual ao `RemoverFaq`. Um `delete` com id vazio é
     * pedido malformado, não "não achei" — e no PostgREST um filtro vazio é justamente o
     * tipo de coisa que se quer barrar antes, não depois. */
    if (!String(id ?? "").trim()) {
      throw new DadoInvalido("Diga qual serviço apagar.", "id");
    }
    return deps.negocio.removerServico(t, id.trim());
  };
}

export function criarAjustarProfissional(deps: {
  negocio: RepositorioNegocio;
}): AjustarProfissional {
  return async (t, p): Promise<Profissional> => {
    const nome = colapsarEspaco(p?.nome);

    /* ⚠️ O MÍNIMO É 2, E NÃO 1 COMO O DO SERVIÇO. É o `check` da coluna
     * (`length(btrim(nome)) between 2 and 120`), e existe porque profissional é PESSOA:
     * uma letra é digitação interrompida, enquanto um serviço pode legitimamente se
     * chamar "X". */
    if (!temConteudo(nome) || nome.length < NOME_PROFISSIONAL_MIN) {
      throw new DadoInvalido("Diga o nome de quem atende.", "nome");
    }
    if (nome.length > NOME_PROFISSIONAL_MAX) {
      throw new DadoInvalido(`O nome passa de ${NOME_PROFISSIONAL_MAX} caracteres.`, "nome");
    }

    const papel = p?.papel === undefined ? undefined : colapsarEspaco(p.papel);
    if (papel !== undefined && papel.length > PAPEL_MAX) {
      throw new DadoInvalido(`A função passa de ${PAPEL_MAX} caracteres.`, "papel");
    }

    return deps.negocio.salvarProfissional(t, {
      ...(p.id ? { id: p.id } : {}),
      nome,
      /* Vazio depois de colapsar é o mesmo que não ter mandado — senão um campo que o
       * dono abriu e fechou viraria uma função chamada "" na tela de Equipe. Mesma regra
       * do `profissional` em `provisionar.ts`. */
      ...(papel ? { papel } : {}),
      ...(p.ativo === undefined ? {} : { ativo: p.ativo }),
    });
  };
}

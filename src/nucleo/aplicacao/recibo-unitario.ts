/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — emitir um recibo, e reconciliar o que ficou sem resposta.
 *
 * ★ SÃO DOIS, E O SEGUNDO EXISTE PORQUE O PRIMEIRO NÃO PODE SABER SE DEU CERTO.
 *
 * A emissão é assíncrona em todo canal conhecido: a chamada volta "registrado" e o desfecho
 * chega depois, por callback. Então `emitirRecibo` termina em `pendente` — e `pendente` é
 * ignorância, não espera. Quem resolve a ignorância é `reconciliarRecibos`, perguntando ao
 * canal o que aconteceu.
 *
 * ── ⚠️ A ORDEM DENTRO DE `emitirRecibo` É A GARANTIA INTEIRA ──
 *
 *   1 · prende o pagamento e cria a linha do razão    ← ANTES de falar com o canal
 *   2 · chama o canal
 *   3 · grava o protocolo
 *
 * Inverter 1 e 2 abre uma janela em que o pagamento está livre e a emissão já saiu. Dois cliques
 * nessa janela emitem dois recibos, e **nenhum aparece como duplicata no banco** — cada um com
 * sua linha, cada um convencido de ser o primeiro. Recibo duplicado se cancela um por um, em
 * dez dias, e o paciente já viu os dois.
 *
 * O custo dessa ordem é o estado do meio: se o processo morrer entre 1 e 3, sobra um `pendente`
 * sem protocolo — irreconciliável, porque não há o que perguntar. Isso não é bug, é o preço, e
 * a resposta é `precisaDeOlhoHumano` mostrar a linha em vez de a gente adivinhar.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  EmitirRecibo, ReciboLancado, ReconciliarRecibos, ResultadoDaReconciliacao,
} from "../portas/entrada/casos-de-uso";
import type { LivroDeRecibos } from "../portas/saida/livro-de-recibos";
import type { EmissorDeReciboSaude } from "../portas/saida/emissor-recibo";
import type { RepositorioRecibos } from "../portas/saida/repositorio-recibos";
import type { RepositorioFiscal } from "../portas/saida/repositorio-fiscal";
import {
  precisaDeOlhoHumano, precisaReconciliar,
  type EmissorCredenciado, type PedidoDeRecibo,
} from "../dominio/recibo-unitario";
import { caminhoDaNota, fiscalFaltando } from "../dominio/fiscal";
import { DadoInvalido, NaoConfigurado } from "../dominio/erros";
import { cpfValido } from "../dominio/clientes";
import { hojeISO } from "../dominio/tempo";

export type DepsReciboUnitario = {
  livro: LivroDeRecibos;
  emissor: EmissorDeReciboSaude;
  recibos: RepositorioRecibos;
  fiscal: RepositorioFiscal;
};

/**
 * A descrição que sai no documento.
 *
 * ⚠️ TEXTO FIXO POR DATA, e a regra é a mesma do lote: **nunca o nome do serviço**. "Terapia de
 * casal" ou "Avaliação TDAH" num recibo é dado sensível saindo por um campo que ninguém pensou
 * como sigiloso. A única coisa variável é a data, que é justamente o que o plano de saúde pede
 * para reembolsar.
 */
function descricaoPadrao(data: string): string {
  const [a, m, d] = data.slice(0, 10).split("-");
  return `Atendimento realizado em ${d}/${m}/${a}`;
}

export function criarEmitirRecibo(deps: DepsReciboUnitario): EmitirRecibo {
  return async (t, p): Promise<ReciboLancado> => {
    const hoje = hojeISO();
    const config = await deps.fiscal.ler(t);

    /* Recusa antes de prender nada: descobrir no fim o que se sabia no começo deixaria o
     * pagamento trancado por um recibo que nunca foi tentado. */
    if (caminhoDaNota(config, hoje) !== "recibo_saude") {
      throw new DadoInvalido(
        "Este negócio emite nota fiscal, não recibo do Receita Saúde.",
        "caminho",
      );
    }
    const falta = fiscalFaltando(config, hoje);
    if (falta.length) throw new NaoConfigurado(falta);

    const emissor: EmissorCredenciado = {
      cpf: config.prestadorCpf!,
      ocupacao: config.ocupacaoSaude!,
      registroProfissional: config.registroProfissional,
    };

    /* Os dados do pagamento saem da lista de pendentes, não do corpo do request. É a mesma
     * regra de `/api/nf/emitir`, que aceitava `valor` e `tomador` de fora até 17/08/2026 — e
     * com isso um POST forjado emitia documento fiscal de qualquer valor para qualquer CPF. */
    const pendentes = await deps.recibos.pendentes(t, { ate: hoje });
    const alvo = pendentes.find((x) => x.id === p.id && x.fonte === p.fonte);
    if (!alvo) {
      throw new DadoInvalido(
        "Este pagamento não está na lista do que falta emitir. Ele já saiu, ou está num lote.",
        "id",
      );
    }
    if (alvo.teste) {
      throw new DadoInvalido(
        "Este é o cliente de demonstração. Recibo de verdade para cadastro de teste não.",
        "teste",
      );
    }

    const cpfBeneficiario = alvo.cpf ?? "";
    /* Dígito verificador aqui também: a Receita recusa com "Beneficiário do serviço inválido" e
     * só conta isso depois, no callback — quando o pagamento já está trancado. */
    if (!cpfValido(cpfBeneficiario)) {
      throw new DadoInvalido(
        `Falta o CPF de ${alvo.nome} — sem ele a Receita recusa o recibo.`,
        "cpf",
      );
    }
    const cpfPagador = alvo.cpfPagador ?? cpfBeneficiario;
    if (!cpfValido(cpfPagador)) {
      throw new DadoInvalido("O CPF de quem pagou não é válido.", "cpfPagador");
    }

    /* ── 1 · PRENDE ANTES DE FALAR COM O MUNDO ── */
    const aberto = await deps.livro.abrir(t, {
      fonte: alvo.fonte,
      id: alvo.id,
      canal: deps.emissor.canal,
    });
    /* `null` = outra aba prendeu primeiro, ou já saiu. NÃO é erro — ver a porta. */
    if (!aberto) {
      throw new DadoInvalido("Este pagamento já entrou num recibo ou num lote.", "id");
    }

    const pedido: PedidoDeRecibo = {
      /* O id da linha do razão vira a chave de idempotência do canal. Ver `referencia`. */
      referencia: aberto.id,
      dataPagamento: alvo.data,
      /* ⚠️ O VALOR É O DO BANCO (`aberto.valor`), não o da linha que a tela leu. A claim o
       * devolveu somado na mesma transação em que prendeu — tela velha manda total velho, e
       * total velho aqui vira documento fiscal de valor errado. */
      valor: aberto.valor,
      descricao: descricaoPadrao(alvo.data),
      cpfPagador,
      cpfBeneficiario,
    };

    /* ── 2 · chama o canal ── */
    let aceito;
    try {
      aceito = await deps.emissor.emitir(t, emissor, pedido);
    } catch (e) {
      /* ⚠️ RECUSA DO PEDIDO SOLTA O PAGAMENTO; recusa da RECEITA não passa por aqui — ela chega
       * no callback. A diferença importa: o canal dizer "dado inválido" significa que **nada foi
       * emitido**, e aí devolver a linha para a lista é seguro e é o certo. Deixá-la trancada
       * faria o pagamento desaparecer do faturamento por causa de um CPF digitado errado.
       *
       * ⚠️ `descartar` E NÃO `fechar`: aqui ainda não existe protocolo, e `fechar` busca por
       * protocolo. A primeira versão deste bloco passava `aberto.id` no lugar dele — não casava
       * com nada, a linha ficava `pendente` para sempre e o pagamento sumia do faturamento. */
      await deps.livro.descartar(t, {
        reciboId: aberto.id,
        erro: e instanceof Error ? e.message : String(e),
      }).catch(() => {});
      throw e;
    }

    /* ── 3 · grava o protocolo, o quanto antes ──
     * É ele que torna a linha reconciliável. Entre o passo 2 e este, a linha é um `pendente`
     * sem protocolo — e esse é o único estado deste domínio sem resposta automática. */
    await deps.livro.registrarProtocolo(t, {
      reciboId: aberto.id,
      protocolo: aceito.protocolo,
    });

    return {
      reciboId: aberto.id,
      canal: deps.emissor.canal,
      situacao: aceito.situacao,
      protocolo: aceito.protocolo,
      valor: aberto.valor,
      nome: alvo.nome,
      data: alvo.data,
    };
  };
}

/**
 * Pergunta ao canal o que aconteceu com os pendentes vencidos.
 *
 * ★ É O QUE TORNA A CASCATA SEGURA. Sem isto, um `pendente` velho só tem duas saídas, e as duas
 * são erradas: cair para o próximo canal (emite o segundo recibo) ou ficar pendurado para sempre
 * (o pagamento desaparece do faturamento).
 *
 * ⚠️ NÃO DECIDE NADA SOZINHA — só grava o que o canal respondeu. A decisão de tentar outro canal
 * é de quem lê o resultado, e ela só é permitida a partir de `recusado`. Ver
 * `podeTentarOutroCanal`.
 */
export function criarReconciliarRecibos(
  deps: Pick<DepsReciboUnitario, "livro" | "emissor">,
): ReconciliarRecibos {
  return async (t, agora = new Date()): Promise<ResultadoDaReconciliacao> => {
    const antesDe = new Date(agora.getTime() - 1).toISOString();
    const pendentes = await deps.livro.pendentes(t, { antesDe });

    const r: ResultadoDaReconciliacao = {
      olhados: 0, emitidos: 0, recusados: 0, aindaPendentes: 0, semProtocolo: 0,
    };

    for (const linha of pendentes) {
      /* ⚠️ IRRECONCILIÁVEL: sem protocolo não há o que perguntar. Conta e segue — quem mostra é
       * a tela, porque a verdade está no e-CAC e só uma pessoa pode ir olhar lá. */
      if (precisaDeOlhoHumano(linha)) {
        r.semProtocolo++;
        continue;
      }
      /* Novo demais: o callback ainda pode chegar. Perguntar aqui custa consulta paga e não
       * responde nada que o webhook não fosse responder de graça. */
      if (!precisaReconciliar(linha, agora)) {
        r.aindaPendentes++;
        continue;
      }

      r.olhados++;
      const desfecho = await deps.emissor.consultar(t, linha.protocolo!);

      /* `null` do canal é ambíguo de propósito e tem que continuar ambíguo aqui: pode ser "não
       * conheço esse protocolo" (o pedido não chegou) ou "ainda processando". Tratar como recusa
       * liberaria a cascata — e se era o primeiro caso, ótimo; se era o segundo, sai o segundo
       * recibo. Fica pendente, e a próxima rodada pergunta de novo. */
      if (!desfecho) {
        r.aindaPendentes++;
        continue;
      }

      const fechada = await deps.livro.fechar(t, desfecho);
      /* `null` = o callback chegou primeiro, no meio desta volta. Não é erro, é a corrida
       * normal entre webhook e reconciliação — e é justamente por ela que `fechar` é idempotente. */
      if (!fechada) continue;

      if (fechada.situacao === "emitido") r.emitidos++;
      else if (fechada.situacao === "recusado") {
        r.recusados++;
        /* Recusa confirmada pelo canal: aqui, e só aqui, é seguro devolver o pagamento para a
         * lista. É a única transição que reabre a porta da cascata. */
        await deps.livro.soltar(t, fechada.id).catch(() => {});
      }
    }

    return r;
  };
}

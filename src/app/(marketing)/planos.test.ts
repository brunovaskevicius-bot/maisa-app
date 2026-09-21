/* ─────────────────────────────────────────────────────────────────────────────
 * O PREÇO É UM SÓ, EM TODA LANDING PAGE — E O TESTE É O QUE SEGURA ISSO.
 *
 * ── O QUE ESTE ARQUIVO CONGELA (21/09/2026) ──
 *
 * O produto tinha SEIS preços no ar, com cinco valores distintos:
 *
 *   · `/lp/terapeutas`            R$ 79 / R$ 197 / R$ 349
 *   · `/barbeiros` e `/barbeiro`  R$ 97 / R$ 147 / R$ 197
 *
 * Mais um "R$ 147" redigitado numa terceira seção (o card da <Duelo>) e um "R$ 97" numa
 * quarta (o `OFERTA.precoDe`). Nenhum deles nasceu de descuido: os dois mundos não têm
 * como se importar. A LP de terapeutas é BUNDLE ESTÁTICO, servida de `public/lp`, fora do
 * Next — ela não consegue ler um módulo TypeScript nem que queira.
 *
 * A defesa que existia era um comentário em caixa alta pedindo para mudar nos dois
 * lugares. Ela falhou, como comentário falha: o preço mudou de um lado e não do outro, e
 * ninguém percebeu porque nada quebra. Página com dois preços não derruba build, não
 * aparece em tela e não gera erro — só perde a venda, em silêncio.
 *
 * ESTE ARQUIVO É A DEFESA QUE NÃO DEPENDE DE DISCIPLINA. Ele lê o HTML estático como
 * TEXTO (igual `juridico.test.ts` e `arquitetura.test.ts`: sem DOM, em milissegundos) e
 * confere contra `_lib/planos.ts`, que é a tabela única. Se alguém mudar um preço de um
 * lado só, a suíte reprova e diz qual valor está faltando onde.
 *
 * ── O SEGUNDO TRABALHO: NENHUM LINK DE PAGAMENTO COM PREÇO VELHO ──
 *
 * Havia UM link de Stripe no projeto, cru dentro do HTML, e ele ficou apontando para o
 * preço antigo depois da revisão da tabela. Link de pagamento errado é o pior defeito de
 * uma LP: não quebra build, não aparece em tela, e só falha com o cartão na mão. Enquanto
 * `CHECKOUT` estiver vazio, a regra é que NÃO EXISTE link de Stripe em LP nenhuma.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { CHECKOUT, COPIA, PLANOS, specsDoPlano } from "./_lib/planos";
import { WHATSAPP_NUMERO } from "./_lib/icp";

const MARKETING = fileURLToPath(new URL(".", import.meta.url));
const RAIZ = join(MARKETING, "..", "..", "..");

/* A LP DE ORIGEM, e não o espelho. `lp/` é onde se edita; `public/lp/` é destino,
 * reescrito pelo `espelha-lp` a cada `predev`/`prebuild`. Um teste sobre o espelho
 * aprovaria um `lp/` errado sempre que o espelho estivesse velho, e reprovaria um `lp/`
 * certo enquanto ninguém rodasse o script. */
const HTML_TERAPEUTAS = join(RAIZ, "lp", "terapeutas", "index.html");

/** O HTML SEM OS COMENTÁRIOS — é o que a pessoa de fato vê.
 *
 * ⚠️ TIRAR OS COMENTÁRIOS NÃO É CONVENIÊNCIA, É O QUE TORNA O TESTE CORRETO. O arquivo
 * explica por escrito de onde veio ("a tabela era R$ 79 / 197 / 349..."), e essa memória
 * é o que impede a próxima pessoa de refazer a bagunça. Um teste que proíbe o texto
 * "R$ 79" no arquivo inteiro obrigaria a apagar a explicação junto com o defeito. */
function visivel(caminho: string): string {
  return readFileSync(caminho, "utf8").replace(/<!--[\s\S]*?-->/g, "");
}

describe("a tabela de preços é uma só nos dois mundos", () => {
  const html = visivel(HTML_TERAPEUTAS);

  it.each(PLANOS.map((p) => [p.nome, p.preco] as const))(
    "a LP de terapeutas mostra o %s por %s",
    (_nome, preco) => {
      expect(html).toContain(preco);
    },
  );

  it.each(PLANOS.map((p) => [p.nome] as const))(
    "a LP de terapeutas chama o plano de %s",
    (nome) => {
      expect(html).toContain(nome);
    },
  );

  /* O EXCEDENTE ENTRA NA MESMA CONTA QUE O PREÇO. Ele é preço — o que a pessoa paga
     quando o mês passa do limite — e foi a linha mais fácil de esquecer na hora de
     sincronizar, justamente por parecer detalhe de cartão. */
  it("a LP de terapeutas mostra o excedente de cada plano", () => {
    for (const plano of PLANOS) {
      const excedente = plano.specs.find((s) => s.rotulo.startsWith("Excedente"));
      expect(excedente, `plano ${plano.nome} sem linha de excedente`).toBeDefined();
      expect(html).toContain(excedente!.valor);
    }
  });

  /* A LINHA QUE DIZ QUANTO CABE. Sem ela os três cartões viram três preços sem razão de
     existir, que era o estado até 21/09/2026: nenhuma das LPs escrevia quantos
     profissionais e quantos agendamentos o plano aguenta. */
  it("a LP de terapeutas mostra a capacidade de cada plano", () => {
    for (const plano of PLANOS) {
      for (const spec of specsDoPlano(plano, "terapeutas")) {
        expect(html, `${plano.nome} → ${spec.rotulo}`).toContain(spec.valor);
      }
    }
  });

  /* ⚠️ A METADE QUE FALTA DA CHECAGEM. Sem ela, trocar R$ 79 por R$ 127 e ESQUECER de
     apagar o R$ 79 passaria: os dois estariam no arquivo e o `toContain` acima ficaria
     feliz. É exatamente a forma que a divergência teve da última vez — nunca um preço
     ausente, sempre um preço a mais, sobrevivendo num canto. */
  it("nenhum preço morto sobrou na LP de terapeutas", () => {
    const vivos = new Set(PLANOS.map((p) => p.preco.replace(/\s+/g, " ")));
    const achados = (html.match(/R\$\s*\d{2,3}(?![\d,.])/g) ?? []).map((m) =>
      m.replace(/\s+/g, " "),
    );
    const mortos = [...new Set(achados)].filter((p) => !vivos.has(p));
    expect(mortos, `preços fora da tabela: ${mortos.join(", ")}`).toEqual([]);
  });
});

describe("todo CTA de plano leva ao WhatsApp da maisa", () => {
  const html = visivel(HTML_TERAPEUTAS);

  /* ENQUANTO `CHECKOUT` ESTIVER VAZIO, link de pagamento em LP é bug — aponta para um
     preço que a tabela não tem mais. Este teste é a única coisa que impede o link antigo
     de voltar por cópia de um commit velho. Quando o Stripe religar, o mapa deixa de
     estar vazio e este teste se desliga sozinho. */
  const stripeLigado = Object.values(CHECKOUT).some((url) => url !== "");

  it.runIf(!stripeLigado)("não há link de Stripe em LP enquanto CHECKOUT está vazio", () => {
    expect(readFileSync(HTML_TERAPEUTAS, "utf8").replace(/<!--[\s\S]*?-->/g, "")).not.toContain(
      "buy.stripe.com",
    );
  });

  it("todo wa.me da LP de terapeutas usa o número do icp.ts", () => {
    const numeros = [...new Set(html.match(/wa\.me\/(\d+)/g) ?? [])];
    expect(numeros.length, "a LP não tem nenhum link de WhatsApp").toBeGreaterThan(0);
    for (const n of numeros) expect(n).toBe(`wa.me/${WHATSAPP_NUMERO}`);
  });

  /* Um botão por plano, cada um abrindo a conversa com o nome do plano dentro. Três
     botões com a mesma mensagem genérica obrigariam a perguntar "qual plano?" logo na
     primeira resposta — e a pessoa já tinha respondido, clicando. */
  it("cada plano tem um CTA de WhatsApp que cita o próprio plano", () => {
    for (const plano of PLANOS) {
      const fragmento = `plano%20${encodeURIComponent(plano.nome)}`;
      expect(html, `sem CTA de WhatsApp para o ${plano.nome}`).toContain(fragmento);
    }
  });

  /* O RÓTULO DO BOTÃO TAMBÉM É A OFERTA. Dois cartões da LP de terapeutas diziam
     "Falar no WhatsApp" na mesma fileira: três caminhos com cara de iguais, e o leitor
     descobrindo só no WhatsApp qual plano tinha pedido. O rótulo é a última coisa que
     ele lê antes de clicar — ele tem de dizer QUAL plano está sendo ativado, e dizer a
     mesma coisa que o cartão equivalente do outro mundo. */
  it.each(PLANOS.map((p) => [p.nome, COPIA.terapeutas.planos[p.chave].cta] as const))(
    "o botão do %s diz %s",
    (_nome, rotulo) => {
      expect(html).toContain(rotulo);
    },
  );
});

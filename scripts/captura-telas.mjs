/* captura-telas — fotografa o app de produto para a seção 2 da LP /barbeiros/v3.
 *
 * POR QUE ISTO É UM SCRIPT E NÃO TRÊS PNGs SOLTOS NO public/.
 * As três imagens são o PRODUTO, não ilustração. No dia em que a Agenda mudar de
 * cartão ou a conversa mudar de bolha, a LP passa a mostrar uma versão do app que
 * não existe mais — e ninguém descobre isso olhando o código da LP, porque lá só
 * há um <img>. Com o script, refazer as fotos é um comando, e o que estava na foto
 * fica escrito aqui em vez de na memória de quem tirou.
 *
 * O QUE ELE NÃO FAZ: não toca em nada do produto. A barbearia que aparece nas fotos
 * é escrita no `localStorage` do perfil descartável do Chrome, pelos MESMOS campos
 * que a tela Serviços e a tela Agenda escreveriam se alguém as preenchesse à mão
 * (`svcNovos`, `novosAgendamentos` — ver `src/ui/estado/store.tsx`). O `src/adaptadores/saida/demo/`
 * continua genérico, que é como ele foi decidido (docs/BACKLOG-multiperfil.md).
 *
 * ⚠️ POR QUE `svcNovos` E NÃO `svcEdit`. O caminho natural seria RENOMEAR os serviços
 * do catálogo. Não funciona: `store.tsx:521` resolve o serviço de um atendimento em
 * `D.servico()` — o catálogo BASE — e ignora `db.svcEdit`, enquanto o memo de
 * `servicos` (`store.tsx:771`) aplica a edição. Renomear muda a tela Serviços e não
 * muda um cartão de atendimento sequer. Criar serviço passa porque `:521` consulta
 * `db.svcNovos` no fallback. Isso é um bug do app, registrado à parte; se ele for
 * corrigido, este script pode voltar a usar `svcEdit` e fica mais curto.
 *
 * ⚠️ NÃO USE `public/lp/` COMO DESTINO. `scripts/espelha-lp.mjs` apaga essa pasta
 * inteira a cada `predev`/`prebuild` (`rm -rf` na linha 31) e ela está no .gitignore.
 * As fotos moram em `public/telas/`, que é fonte.
 *
 * USO:  node scripts/captura-telas.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, "public/telas");
const ALVO = "http://localhost:3100/";
const PORTA_CDP = 9333;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* 390×844 é o iPhone 14/15 lógico, e `deviceScaleFactor: 2` é o que faz a foto sair
   com 780×1688 de pixel real — sem isso a captura fica com metade da resolução da
   moldura em que ela vai ser exibida e a interface aparece borrada na LP. */
const LARGURA = 390;
const ALTURA = 844;
const DPR = 2;

/* A barbearia das fotos. Nomes masculinos porque o ICP é barbearia, e o catálogo
   genérico do protótipo ("Atendimento padrão", "Pacote completo") denunciaria que
   é mock. Preços plausíveis de barbearia de bairro em SP, 2026. */
const FIXTURE = `(() => {
  const CHAVE = "maisa.app.v3";
  const HOJE = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const d = JSON.parse(localStorage.getItem(CHAVE) || "{}");
  d.__v = 3;
  d.etapas = {}; d.resolvidos = {}; d.assumidas = {}; d.enviadas = {}; d.notas = {};
  d.googleEventos = {}; d.cliAtivo = {}; d.profAtivo = {}; d.proximoNumero = 117;

  const sv = (id, nome, categoria, preco, duracao) =>
    ({ id, nome, categoria, preco, duracao, profissionalIds: ["pr1"], ativo: true });
  d.svcNovos = [
    sv("svb1", "Corte", "Recorrente", 55, 40),
    sv("svb2", "Barba", "Recorrente", 35, 30),
    sv("svb3", "Corte + barba", "Pacote", 80, 60),
    sv("svb4", "Corte + pigmenta\\u00e7\\u00e3o", "Pacote", 95, 45),
  ];
  d.svcEdit = {};
  d.svcAtivo = { sv1: false, sv2: false, sv3: false, sv4: false, sv5: false, sv6: false, sv7: false };

  const ag = (id, inicio, clienteId, servicoId, confirmado, etapaInicial) =>
    ({ id, data: HOJE, inicio, profissionalId: "pr1", servicoId, clienteId, confirmado, etapaInicial });
  d.novosAgendamentos = [
    ag("agx1",  9,   "cl11", "svb3", true,  "feito"),
    ag("agx2", 10.5, "cl2",  "svb1", true,  "atendendo"),
    ag("agx3", 11.5, "cl13", "svb1", true,  "chegando"),
    ag("agx4", 13.5, "cl5",  "svb2", false, "chegando"),
    ag("agx5", 14.5, "cl12", "svb3", true,  "chegando"),
    ag("agx6", 16,   "cl15", "svb4", true,  "chegando"),
  ];
  localStorage.setItem(CHAVE, JSON.stringify(d));
  return d.novosAgendamentos.length;
})()`;

/* Um clique é "achar o elemento pelo texto e disparar .click()", e não coordenada:
   coordenada quebra quando o layout muda um pixel, e o que interessa é a intenção
   ("abrir a conversa do Thiago"), que o texto expressa e o pixel não. */
const clicar = (seletor, texto) => `(() => {
  const alvos = [...document.querySelectorAll(${JSON.stringify(seletor)})];
  const achado = alvos.find((e) => (e.textContent || "").includes(${JSON.stringify(texto)}));
  if (!achado) throw new Error("não achei " + ${JSON.stringify(seletor + " ~ " + texto)});
  achado.click();
  return true;
})()`;

/** As três telas, na ordem em que aparecem na LP.
 *
 * ⚠️ POR QUE NÃO ESTÁ AQUI A TELA DE FATURAMENTO, que seria a escolha óbvia por ser a
 * funcionalidade mais real do repositório (NFS-e pela Focus NFe, `src/adaptadores/saida/focus/focus.ts`,
 * `src/app/api/nf/*`). Ela foi capturada em 07/08/2026 e REPROVADA na foto, por quatro
 * coisas que só aparecem quando se olha:
 *   · o cartão diz "JUNHO DE 2026" (`data.ts:32`, `PERIODO`, constante de módulo) logo
 *     abaixo do cabeçalho que diz "sexta, 7 de agosto" — a tela se contradiz sozinha;
 *   · R$ 11.081,00 em 14 clientes = ~R$ 100 por atendimento, com linhas de R$ 900 e
 *     R$ 1.800. Isso é ticket de consultório, não de barbearia (aqui um corte é R$ 55);
 *   · os nomes e os serviços da lista vêm de `D.CLIENTES` — campos `valor`,
 *     `atendimentos` e `servicoId` que NÃO são editáveis pelo app, então não há como
 *     semeá-los sem editar o produto;
 *   · pelo mesmo motivo a lista mostra "Atendimento padrão" truncado em vez de "Corte".
 * Só se salvam as telas cujo conteúdo o próprio app deixa escrever. Vale o mesmo para
 * a tela Clientes, reprovada pelos mesmos quatro motivos.
 */
const TELAS = [
  {
    arquivo: "v3-conversa.png",
    /* O CORE. É o único lugar do app em que se vê a MAISA AGINDO: bolha com ícone de
       bot, "esperando sua resposta" no topo, e o Assumir ao lado — o cliente pede para
       remarcar e ela já devolve horário. */
    passos: [
      [`nav button`, "Conversas"],
      [`button`, "Thiago Barros"],
    ],
  },
  {
    arquivo: "v3-faq.png",
    /* O FAQ, que foi pedido nominalmente e no app não é uma TELA — é um comportamento:
       "Vocês abrem no feriado?" → "Abrimos sim, das 9h às 14h. Quer marcar um horário?".
       Some da lista de telas de quem procura uma aba chamada FAQ. */
    passos: [
      [`nav button`, "Conversas"],
      [`button`, "Anderson Reis"],
    ],
  },
  {
    arquivo: "v3-agenda.png",
    /* O RESULTADO. Seis atendimentos, um em âmbar "a confirmar" — o único estado da
       tela que mostra a MAISA ainda trabalhando depois que o dia já está montado. */
    passos: [[`nav button`, "Agenda"]],
  },
];

/* ─────────────────────────── CDP no osso ─────────────────────────── */

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar(porta) {
  /* O Chrome leva alguns instantes para abrir a porta; tentar em laço é mais honesto
     que um sleep fixo, que ou é curto demais numa máquina ocupada ou é tempo jogado
     fora em todas as outras vezes. */
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch {
      await espera(250);
    }
  }
  throw new Error("o Chrome não abriu a porta de depuração");
}

function sessao(ws) {
  let id = 0;
  const pendentes = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, falha } = pendentes.get(m.id);
      pendentes.delete(m.id);
      m.error ? falha(new Error(m.error.message)) : ok(m.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((ok, falha) => {
      const meu = ++id;
      pendentes.set(meu, { ok, falha });
      ws.send(JSON.stringify({ id: meu, method, params, sessionId }));
    });
}

async function main() {
  const perfil = resolve(RAIZ, ".captura-perfil");
  await rm(perfil, { recursive: true, force: true });
  await mkdir(DESTINO, { recursive: true });

  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORTA_CDP}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    const url = await conectar(PORTA_CDP);
    const ws = new WebSocket(url);
    await new Promise((ok, falha) => {
      ws.addEventListener("open", ok, { once: true });
      ws.addEventListener("error", falha, { once: true });
    });
    const enviar = sessao(ws);

    const { targetId } = await enviar("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await enviar("Target.attachToTarget", { targetId, flatten: true });
    const cmd = (m, p) => enviar(m, p, sessionId);

    await cmd("Page.enable");
    await cmd("Runtime.enable");
    await cmd("Emulation.setDeviceMetricsOverride", {
      width: LARGURA, height: ALTURA, deviceScaleFactor: DPR, mobile: true,
    });

    const avaliar = async (expressao) => {
      const r = await cmd("Runtime.evaluate", { expression: expressao, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "erro no avaliar");
      return r.result.value;
    };

    const irPara = async (endereco) => {
      const carregou = new Promise((ok) => {
        const ouvir = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.method === "Page.loadEventFired" && m.sessionId === sessionId) {
            ws.removeEventListener("message", ouvir);
            ok();
          }
        };
        ws.addEventListener("message", ouvir);
      });
      await cmd("Page.navigate", { url: endereco });
      await carregou;
    };

    await irPara(ALVO);
    const quantos = await avaliar(FIXTURE);
    console.log(`captura-telas: fixture gravada (${quantos} atendimentos)`);

    for (const tela of TELAS) {
      await irPara(ALVO);
      await espera(700); // hidratação do React antes do primeiro clique
      for (const [seletor, texto] of tela.passos) {
        await avaliar(clicar(seletor, texto));
        await espera(450);
      }
      await espera(500); // transições do app terminarem antes do obturador
      const { data } = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const destino = resolve(DESTINO, tela.arquivo);
      await writeFile(destino, Buffer.from(data, "base64"));
      console.log(`captura-telas: ${tela.arquivo}`);
    }

    ws.close();
  } finally {
    /* ESPERAR O PROCESSO MORRER ANTES DE APAGAR O PERFIL. `kill()` só ENVIA o sinal;
       o Chrome ainda leva alguns instantes gravando o perfil, e apagar por baixo dele
       falha com ENOTEMPTY numa pasta que ele acabou de recriar. */
    const morreu = new Promise((ok) => chrome.once("exit", ok));
    chrome.kill();
    await Promise.race([morreu, espera(5000)]);
    await rm(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

await main();

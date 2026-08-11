/* prova-chamada — o hover da <Chamada> conferido na régua, não no olho.
 *
 * POR QUE ELE EXISTE. O desenho inteiro deste botão É o hover: a bolha cresce do
 * centro e preenche a caixa. A referência de onde ele veio cresce um círculo para
 * 220px FIXOS, o que cobre "Modern Button" e NÃO cobre "Quero isso no meu WhatsApp".
 * Aqui a bolha é 120% da largura, e 120% é uma conta (ver a nota no v3.css) — conta
 * que ou se prova ou vira um botão com as pontas vazadas no hover, defeito que só
 * aparece com o mouse em cima e por isso nunca apareceria numa foto do estado parado.
 *
 * O QUE ELE MEDE, e é geometria, não opinião: a bolha é um círculo de centro C e
 * raio R; o botão é um retângulo. O círculo cobre o retângulo quando os QUATRO
 * CANTOS estão dentro dele — ou seja, quando a maior distância de C a um canto é
 * ≤ R. É isso que a saída chama de `folga` (R menos essa distância): positiva, sobra;
 * negativa, o hover está quebrado e o número diz por quantos pixels.
 *
 * `CSS.forcePseudoState` é o que permite fotografar um :hover sem mouse — o mesmo
 * caminho CDP que o foto.mjs já usa para tudo o mais.
 *
 * uso: node .claude/prova-chamada.mjs [rolagem] [saida.png]
 * ex.: node .claude/prova-chamada.mjs 5300 .claude/chamada-hover.png
 */
import { spawn } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTA = 9334;

/* O SELETOR É ARGUMENTO PORQUE O PIOR CASO É O ROTULO MAIS LARGO, e ele não está no
   duelo: "Quero isso no meu WhatsApp" (telas) é ~35% mais largo que "Escolher meu
   plano". Como a bolha é proporcional, a folga deveria escalar junto — mas "deveria"
   é exatamente o que este arquivo existe para não aceitar. */
const [rolagem = "5300", saida = ".claude/chamada-hover.png", seletor = ".lp3-ch--duelo"] =
  process.argv.slice(2);
const ALVO = "http://localhost:3100/barbeiros/v3";
const ALVO_SELETOR = seletor;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar(porta) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await espera(250);
  }
  throw new Error("Chrome não abriu a porta de depuração");
}

function sessao(ws) {
  let n = 0;
  const pendentes = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, falha } = pendentes.get(m.id);
      pendentes.delete(m.id);
      m.error ? falha(new Error(m.error.message)) : ok(m.result);
    }
  });
  return (method, params, sessionId) =>
    new Promise((ok, falha) => {
      const meu = ++n;
      pendentes.set(meu, { ok, falha });
      ws.send(JSON.stringify({ id: meu, method, params, sessionId }));
    });
}

/* A medida, rodada DUAS vezes: uma parada e uma com o :hover forçado. O mesmo
   código nos dois estados é o que deixa a comparação valer alguma coisa. */
const MEDIDA = `JSON.stringify((() => {
  const b = document.querySelector('${ALVO_SELETOR}');
  if (!b) return { erro: 'chamada nao encontrada' };
  const bo = document.querySelector('${ALVO_SELETOR} .lp3-ch-bolha');
  const tx = document.querySelector('${ALVO_SELETOR} .lp3-ch-txt');
  const ent = document.querySelector('${ALVO_SELETOR} .lp3-ch-seta--entra');
  const sai = document.querySelector('${ALVO_SELETOR} .lp3-ch-seta--sai');
  const rb = b.getBoundingClientRect();
  const rBo = bo.getBoundingClientRect();
  const cs = getComputedStyle(b);
  const csBo = getComputedStyle(bo);

  /* centro e raio do círculo, já com o scale aplicado (o rect vem transformado) */
  const cx = rBo.left + rBo.width / 2, cy = rBo.top + rBo.height / 2;
  const R = rBo.width / 2;
  const cantos = [[rb.left, rb.top], [rb.right, rb.top], [rb.left, rb.bottom], [rb.right, rb.bottom]];
  const dMax = Math.max(...cantos.map(([x, y]) => Math.hypot(x - cx, y - cy)));

  const dentro = (el) => {
    const r = el.getBoundingClientRect();
    return r.left >= rb.left - 0.5 && r.right <= rb.right + 0.5;
  };

  return {
    botao: { w: +rb.width.toFixed(1), h: +rb.height.toFixed(1) },
    raio: cs.borderRadius,
    tinta: cs.color,
    aro: cs.boxShadow.replace(/\\s+/g, ' ').slice(0, 60),
    bolha: { w: +rBo.width.toFixed(1), opacidade: +csBo.opacity, fundo: csBo.backgroundColor },
    /* ⚠️ O NÚMERO QUE IMPORTA. R − maior distância do centro a um canto. */
    folga: +(R - dMax).toFixed(1),
    cobre: R >= dMax,
    texto: tx ? getComputedStyle(tx).transform : null,
    setaEntraDentro: ent ? dentro(ent) : null,
    setaSaiDentro: sai ? dentro(sai) : null,
    alturaMin: +rb.height.toFixed(1) >= 44,
    /* ⚠️ O RISCO DO \`white-space: nowrap\`: num rótulo longo o botão não quebra, ele
       ESTOURA. Comparado contra a caixa de conteúdo do pai (descontado o padding),
       que é o que de fato o contém — a viewport sozinha mentiria a favor. */
    transborda: (() => {
      const p = b.parentElement;
      if (!p) return null;
      const rp = p.getBoundingClientRect();
      const cp = getComputedStyle(p);
      const e = rp.left + parseFloat(cp.paddingLeft);
      const d = rp.right - parseFloat(cp.paddingRight);
      return { sobraEsq: +(rb.left - e).toFixed(1), sobraDir: +(d - rb.right).toFixed(1) };
    })(),
  };
})())`;

const perfil = resolve(RAIZ, ".prova-chamada-perfil");
await rm(perfil, { recursive: true, force: true });

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  const ws = new WebSocket(await conectar(PORTA));
  await new Promise((ok, falha) => {
    ws.addEventListener("open", ok, { once: true });
    ws.addEventListener("error", falha, { once: true });
  });
  /* O WebSocket devolvido pelo /json/version é o do BROWSER, e nele `Page.*` não
     existe — é preciso criar um alvo e anexar a sessão dele, como o foto.mjs faz.
     Sem isto o erro é "'Page.enable' wasn't found", que soa como CDP quebrado e é
     só endereço errado. */
  const enviar = sessao(ws);
  const { targetId } = await enviar("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await enviar("Target.attachToTarget", { targetId, flatten: true });
  const cmd = (m, p) => enviar(m, p, sessionId);

  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("DOM.enable");
  await cmd("CSS.enable");
  /* `LARG=390 node .claude/prova-chamada.mjs …` roda a mesma prova no celular, que é
     onde o `nowrap` de um rótulo longo estoura primeiro. */
  const LARG = Number(process.env.LARG || 1440);
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: LARG,
    height: Number(process.env.ALT || 900),
    deviceScaleFactor: 2,
    mobile: LARG < 700,
  });

  const carregou = new Promise((ok) => {
    const ouvir = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === "Page.loadEventFired") {
        ws.removeEventListener("message", ouvir);
        ok();
      }
    };
    ws.addEventListener("message", ouvir);
  });
  await cmd("Page.navigate", { url: ALVO });
  await carregou;
  await espera(3000);

  await cmd("Runtime.evaluate", { expression: `scrollTo(0, ${Number(rolagem)})` });
  await espera(800);

  const parado = await cmd("Runtime.evaluate", { expression: MEDIDA, returnByValue: true });
  console.log("prova: PARADO  " + parado.result.value);

  /* Força o :hover. O nodeId tem de ser pedido DEPOIS da rolagem — o documento é o
     mesmo, mas pedir cedo demais esbarra em nó ainda não anexado. */
  const doc = await cmd("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cmd("DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: ALVO_SELETOR,
  });
  if (!nodeId) throw new Error(`não achei ${ALVO_SELETOR} no DOM`);
  await cmd("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });

  /* 800ms é a transição mais longa da bolha; 1100 dá folga para ela assentar. */
  await espera(1100);

  const emHover = await cmd("Runtime.evaluate", { expression: MEDIDA, returnByValue: true });
  console.log("prova: HOVER   " + emHover.result.value);

  const { data } = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(resolve(RAIZ, saida), Buffer.from(data, "base64"));
  console.log(`prova: ${saida}`);
  ws.close();
} finally {
  const morreu = new Promise((ok) => chrome.once("exit", ok));
  chrome.kill();
  await morreu;
  await rm(perfil, { recursive: true, force: true });
}

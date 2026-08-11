/* audita-linha — mede a LINHA HORIZONTAL de fundo da seção <Duelo> (/barbeiros/v3).
 *
 * DESCARTÁVEL, igual ao audita-duelo.mjs de que herdou a plumbing de CDP. Existe
 * porque a linha de 07/08/2026 tem três afirmações que só o navegador confirma:
 *
 *   1. ela CORTA os cartões? (o centro da tinta tem de cair na meia-altura deles —
 *      é a única posição em que o efeito de passar-por-trás funciona)
 *   2. a espessura na tela ficou na faixa da seção das telas em TODA viewport?
 *      (é a aposta do `clamp(1200px, 118%, 1800px)`: fator entre 0,75 e 1,125)
 *   3. ela ainda se desenha? (`--d-p` de 0 a 1 por rolagem, sem JS)
 *
 * E uma que é regressão: a página ganhou rolagem horizontal? A linha tem 1200px de
 * mínimo numa tela que pode ter 390.
 *
 * USO:  node .claude/audita-linha.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9336;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* Quatro larguras, e as duas do meio são o ponto: 899 e 900 são os dois lados do
   breakpoint, onde a espessura da linha antiga estourava (23px contra 10px). */
const VISTAS = [
  { nome: "desktop-1440", largura: 1440, altura: 900, dpr: 2 },
  { nome: "limite-900", largura: 900, altura: 900, dpr: 2 },
  { nome: "limite-899", largura: 899, altura: 900, dpr: 2 },
  { nome: "celular-390", largura: 390, altura: 844, dpr: 2 },
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar(porta) {
  for (let i = 0; i < 80; i++) {
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

/* A sonda roda DENTRO da página. Devolve só números e strings — nada de nós. */
const SONDA = `(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: Math.round(b.x), dir: Math.round(b.right), topo: Math.round(b.top),
             base: Math.round(b.bottom), l: Math.round(b.width), a: Math.round(b.height),
             meio: Math.round(b.top + b.height / 2) }; };
  const st = (s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; };

  const de = document.documentElement;
  const svg = r(".lp3-d-risco");
  const traco = r(".lp3-d-traco");
  const hum = r('.lp3-d-cartao[data-lado="humano"]');
  const mai = r('.lp3-d-cartao[data-lado="maisa"]');
  const vs = r(".lp3-d-vs");

  /* A espessura NA TELA: stroke-width está em unidades do viewBox de 1600. */
  const sw = parseFloat(st(".lp3-d-traco", "strokeWidth"));
  const fator = svg ? svg.l / 1600 : null;

  /* Onde a linha aparece de verdade: o que não está coberto por cartão nem pela
     dobradiça. Só faz sentido com os dois cartões lado a lado. */
  const lado = hum && mai && hum.topo === mai.topo;
  const janelas = !lado ? null : [
    { onde: "margem esq", px: Math.max(0, hum.x) },
    { onde: "vao esq", px: Math.max(0, (vs ? vs.x : mai.x) - hum.dir) },
    { onde: "vao dir", px: Math.max(0, mai.x - (vs ? vs.dir : hum.dir)) },
    { onde: "margem dir", px: Math.max(0, de.clientWidth - mai.dir) },
  ];

  return {
    rolagemH: { scrollW: de.scrollWidth, clientW: de.clientWidth, estoura: de.scrollWidth > de.clientWidth },
    empilhado: !lado,
    svg, traco, arena: r(".lp3-d-arena"), hum, mai, vs,
    espessura: {
      strokeWidth: sw,
      larguraRenderizada: svg ? svg.l : null,
      fator: fator ? +fator.toFixed(3) : null,
      naTela: fator ? +(sw * fator).toFixed(2) : null,
    },
    corte: {
      /* A pergunta 1: a tinta cruza a meia-altura dos cartões? */
      meioDosCartoes: hum ? hum.meio : null,
      meioDaTinta: traco ? traco.meio : null,
      erro: hum && traco ? traco.meio - hum.meio : null,
      dentroDoCartaoHumano: hum && traco ? traco.meio > hum.topo && traco.meio < hum.base : null,
      dentroDoCartaoMaisa: mai && traco ? traco.meio > mai.topo && traco.meio < mai.base : null,
      /* No empilhado, o alvo é o VÃO entre os dois. */
      noVaoEmpilhado: !lado && hum && mai && traco ? traco.meio >= hum.base && traco.meio <= mai.topo : null,
      vaoEmpilhado: !lado && hum && mai ? { de: hum.base, ate: mai.topo } : null,
    },
    janelasVisiveis: janelas,
    janelasSoma: janelas ? janelas.reduce((s, j) => s + j.px, 0) : null,
    desenho: {
      /* A pergunta 3. dashoffset 1 = nada desenhado, 0 = inteiro. */
      dp: getComputedStyle(document.querySelector(".lp3-d-risco")).getPropertyValue("--d-p").trim(),
      tracoOffset: st(".lp3-d-traco", "strokeDashoffset"),
      tracoArray: st(".lp3-d-traco", "strokeDasharray"),
      pontaArray: st(".lp3-d-ponta", "strokeDasharray"),
      pontaOffset: st(".lp3-d-ponta", "strokeDashoffset"),
      pontaWidth: st(".lp3-d-ponta", "strokeWidth"),
      stroke: st(".lp3-d-traco", "stroke"),
      derivaAnim: st(".lp3-d-risco-g", "animationName"),
      derivaDur: st(".lp3-d-risco-g", "animationDuration"),
    },
    secaoAbsY: Math.round(document.querySelector(".lp3-d").getBoundingClientRect().top + window.scrollY),
    secaoAltura: Math.round(document.querySelector(".lp3-d").getBoundingClientRect().height),
  };
})()`;

/* Amostra o progresso do desenho em várias posições de rolagem. É o único jeito de
   provar que `animation-timeline: view()` está ligado: um valor só não distingue
   "animando" de "travado no fallback". */
const AMOSTRA = `((frac) => {
  const sec = document.querySelector(".lp3-d");
  const y = sec.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, Math.max(0, y - window.innerHeight * (1 - frac)));
  const p = getComputedStyle(document.querySelector(".lp3-d-risco")).getPropertyValue("--d-p").trim();
  const off = getComputedStyle(document.querySelector(".lp3-d-traco")).strokeDashoffset;
  const pa = getComputedStyle(document.querySelector(".lp3-d-ponta")).strokeDasharray;
  return { frac, dp: p, offset: off, pontaArray: pa };
})`;

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-linha");
  await rm(perfil, { recursive: true, force: true });
  await mkdir(DESTINO, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORTA_CDP}`,
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
    const url = await conectar(PORTA_CDP);
    const ws = new WebSocket(url);
    await new Promise((ok, falha) => {
      ws.addEventListener("open", ok, { once: true });
      ws.addEventListener("error", falha, { once: true });
    });
    const cmd = sessao(ws);

    const { targetId } = await cmd("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cmd("Target.attachToTarget", { targetId, flatten: true });
    const env = (m, p) => cmd(m, p, sessionId);

    await env("Page.enable");
    await env("Runtime.enable");

    const relatorio = {};

    for (const v of VISTAS) {
      await env("Emulation.setDeviceMetricsOverride", {
        width: v.largura,
        height: v.altura,
        deviceScaleFactor: v.dpr,
        mobile: v.largura < 700,
      });
      await env("Page.navigate", { url: ALVO });
      await espera(3800); // dev server compila na primeira visita

      await env("Runtime.evaluate", {
        expression: `document.querySelector(".lp3-d").scrollIntoView({block:"center"})`,
      });
      await espera(900);

      const sondado = await env("Runtime.evaluate", { expression: SONDA, returnByValue: true });
      /* Sem isto, uma sonda que estoura (seletor que sumiu, dev server ainda
         compilando) vira "Cannot set properties of undefined" trinta linhas depois,
         e o motivo real fica escondido no exceptionDetails que ninguém leu. */
      if (sondado.exceptionDetails || sondado.result.value == null) {
        throw new Error(
          `a sonda falhou em ${v.nome}: ` +
            (sondado.exceptionDetails?.exception?.description ??
              sondado.exceptionDetails?.text ??
              "devolveu null — a página carregou?"),
        );
      }
      const dados = sondado.result.value;

      /* O desenho, amostrado em 5 posições. */
      const curva = [];
      for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
        const { result: a } = await env("Runtime.evaluate", {
          expression: `(${AMOSTRA})(${frac})`,
          returnByValue: true,
          awaitPromise: false,
        });
        await espera(220);
        const { result: b } = await env("Runtime.evaluate", {
          expression: `({dp: getComputedStyle(document.querySelector(".lp3-d-risco")).getPropertyValue("--d-p").trim(), offset: getComputedStyle(document.querySelector(".lp3-d-traco")).strokeDashoffset, pontaArray: getComputedStyle(document.querySelector(".lp3-d-ponta")).strokeDasharray})`,
          returnByValue: true,
        });
        curva.push({ frac, ...b.value, bruto: a.value });
      }
      dados.curvaDoDesenho = curva;
      relatorio[v.nome] = dados;

      /* Foto da seção inteira, com o desenho já completo. */
      await env("Runtime.evaluate", {
        expression: `document.querySelector(".lp3-d").scrollIntoView({block:"center"})`,
      });
      await espera(700);
      const { data } = await env("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: dados.secaoAbsY,
          width: v.largura,
          height: Math.min(dados.secaoAltura, 6000),
          scale: v.largura < 700 ? 1 : 0.62,
        },
      });
      await writeFile(resolve(DESTINO, `linha-${v.nome}.png`), Buffer.from(data, "base64"));
    }

    console.log(JSON.stringify(relatorio, null, 2));
  } finally {
    chrome.kill();
    /* O perfil do Chrome pesa ~60MB POR EXECUÇÃO, então ele tem de sair — mas não dá
       para apagar logo depois do kill: o processo ainda está escrevendo e o rmdir
       estoura com ENOTEMPTY, derrubando a saída boa com um erro falso. Espera o
       processo morrer de verdade, tenta algumas vezes, e NUNCA deixa a limpeza
       quebrar o relatório (o try/catch vazio é de propósito: perfil sobrando é lixo,
       relatório perdido é a medição inteira). */
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) {
      try {
        await rm(perfil, { recursive: true, force: true });
        break;
      } catch {
        await espera(500);
      }
    }
  }
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});

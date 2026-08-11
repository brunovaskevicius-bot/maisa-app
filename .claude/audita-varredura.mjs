/* audita-varredura — prova as DUAS COISAS QUE SÃO ANIMAÇÃO na linha da <Duelo>.
 *
 * O audita-linha.mjs mede geometria (onde a linha está, quão grossa, se transborda).
 * Este mede COMPORTAMENTO, que é outra pergunta:
 *
 *   1. a linha VARRE? `--d-p` tem de subir de ~0 a 1 monotonicamente conforme rola.
 *      Uma amostra só não distingue "animando" de "travada num valor qualquer".
 *   2. o FALLBACK é o pôster? Com `prefers-reduced-motion: reduce`, `--d-p` tem de
 *      ficar em 1 (traço inteiro) E a ponta da caneta tem de ter tamanho 0 — senão
 *      sobra um borrão 1,5× mais grosso parado no fim da linha.
 *
 * A rolagem é feita com `Emulation.setScrollbarsHidden` + scrollTo e DUAS voltas de
 * requestAnimationFrame antes de ler: animação por rolagem é resolvida no commit do
 * quadro, então `getComputedStyle` logo depois do `scrollTo` devolve o valor velho —
 * foi o que sujou a primeira medição.
 *
 * USO:  node .claude/audita-varredura.mjs      (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9337;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

/* Rola para uma posição absoluta e só lê depois de dois quadros. */
const LER = (y) => `(async () => {
  window.scrollTo({ top: ${y}, behavior: "instant" });
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const svg = document.querySelector(".lp3-d-risco");
  const cs = getComputedStyle(svg);
  const tr = getComputedStyle(document.querySelector(".lp3-d-traco"));
  const pu = getComputedStyle(document.querySelector(".lp3-d-pulso"));
  const num = (v) => parseFloat(String(v).replace(/[^0-9.\\-]/g, ""));
  const L = num(String(pu.strokeDasharray).split(",")[0]);
  const off = num(pu.strokeDashoffset);
  return {
    scrollY: Math.round(window.scrollY),
    dp: +parseFloat(cs.getPropertyValue("--d-p")).toFixed(4),
    tracoOffset: tr.strokeDashoffset,
    /* quanto da linha está desenhado, em %, já resolvido pelo motor */
    desenhado: Math.round((1 - num(tr.strokeDashoffset)) * 100),
    /* o pulso: comprimento fixo, e a CABEÇA = L − offset (ver a nota no v3.css) */
    pulsoLen: +L.toFixed(4),
    pulsoCabeca: +(L - off).toFixed(4),
    pulsoLargura: pu.strokeWidth,
    pulsoAnim: pu.animationName,
    /* o pulso está inteiro fora do caminho? (invisível, sem borrão) */
    pulsoFora: L - off <= 0 || L - off >= 1 + L,
  };
})()`;

const GEO = `(() => {
  const s = document.querySelector(".lp3-d").getBoundingClientRect();
  return { absY: Math.round(s.top + window.scrollY), altura: Math.round(s.height), vh: window.innerHeight };
})()`;

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-varredura");
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
    await env("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await env("Page.navigate", { url: ALVO });
    await espera(4200);

    const { result: g } = await env("Runtime.evaluate", { expression: GEO, returnByValue: true });
    const { absY, altura, vh } = g.value;
    console.log(`seção: y=${absY} altura=${altura} viewport=${vh}\n`);

    /* 12 passos, de "seção logo abaixo da tela" até "seção já saindo por cima". */
    const inicio = absY - vh;
    const fim = absY + altura;
    const varredura = [];
    for (let i = 0; i <= 12; i++) {
      const y = Math.max(0, Math.round(inicio + ((fim - inicio) * i) / 12));
      const { result } = await env("Runtime.evaluate", {
        expression: LER(y),
        returnByValue: true,
        awaitPromise: true,
      });
      varredura.push(result.value);
    }

    console.log("── 1. A VARREDURA (prefers-reduced-motion: no-preference) ──");
    console.log("scrollY   --d-p   desenhado              cabeça do pulso");
    let anterior = -1;
    let monotonica = true;
    let pulsoContido = true;
    for (const p of varredura) {
      if (p.dp < anterior - 0.0001) monotonica = false;
      anterior = p.dp;
      /* ⚠️ ISTO NÃO É MAIS UMA INVARIANTE — é a MEDIÇÃO DE UM ARTEFATO ACEITO.
         Até 07/08/2026 a posição do pulso era multiplicada por `--d-p`, o que o
         confinava ao pedaço já desenhado. Esse confinamento saiu junto com a custom
         property animada, porque era ele que a exigia — e custom property animada é o
         arranjo em que o `stroke-dashoffset` pode mudar de valor sem repintar. Ver a
         nota longa no v3.css.
         Então esperar "SIM" aqui é esperar o bug de volta. O que se quer saber é
         QUANTAS amostras da ENTRADA (--d-p < 1) pegam o pulso adiante do traço, para o
         artefato ficar dimensionado em vez de esquecido. */
      if (p.dp < 0.999 && p.pulsoCabeca > p.dp + 0.01) pulsoContido = false;
      const barra = "█".repeat(Math.round(p.desenhado / 4)).padEnd(25, "·");
      console.log(
        `${String(p.scrollY).padStart(6)}  ${String(p.dp).padStart(6)}  ${barra} ${String(p.desenhado).padStart(3)}%  ${String(p.pulsoCabeca).padStart(7)}`,
      );
    }
    const dps = varredura.map((p) => p.dp);
    console.log(`\n  monotônica (nunca volta atrás) : ${monotonica ? "SIM" : "NÃO ❌"}`);
    console.log(`  faixa de --d-p                 : ${Math.min(...dps)} → ${Math.max(...dps)}`);
    console.log(`  chega em 1 (linha inteira)     : ${Math.max(...dps) >= 0.999 ? "SIM" : "NÃO ❌"}`);
    console.log(`  parte de 0 (nada desenhado)    : ${Math.min(...dps) <= 0.001 ? "SIM" : "NÃO ❌"}`);
    /* Dimensiona o artefato em vez de reprovar por ele — ver a nota no laço acima. */
    const naEntrada = varredura.filter((p) => p.dp < 0.999);
    const adiantados = naEntrada.filter((p) => p.pulsoCabeca > p.dp + 0.01);
    console.log(
      `  artefato de entrada (aceito)   : ${adiantados.length}/${naEntrada.length} amostras com o pulso adiante do traço` +
        `${adiantados.length ? " — só durante a entrada, e só à direita" : ""}`,
    );
    console.log(
      `  depois da entrada (--d-p = 1)  : ${
        varredura.filter((p) => p.dp >= 0.999).length
          ? "sem artefato possível, o traço está inteiro ✓"
          : "n/d"
      }`,
    );
    console.log(
      `  pulso: comprimento / espessura : ${varredura[0].pulsoLen} / ${varredura[0].pulsoLargura}  (anim ${varredura[0].pulsoAnim})`,
    );

    /* ── 1b. O PERCURSO: o pulso ANDA com o tempo, parado no mesmo scroll? ──
       É o teste do pedido "um percurso para percorrer". Sem ele, um pulso estático
       no lugar certo passaria por todos os outros testes. */
    await env("Runtime.evaluate", {
      expression: `document.querySelector(".lp3-d").scrollIntoView({block:"center"})`,
    });
    await espera(600);
    const trilho = [];
    for (let i = 0; i < 8; i++) {
      const { result: t } = await env("Runtime.evaluate", {
        expression: `(() => { const pu = getComputedStyle(document.querySelector(".lp3-d-pulso"));
          const num = (v) => parseFloat(String(v).replace(/[^0-9.\\-]/g, ""));
          const L = num(String(pu.strokeDasharray).split(",")[0]);
          return +(L - num(pu.strokeDashoffset)).toFixed(4); })()`,
        returnByValue: true,
      });
      trilho.push(t.value);
      await espera(700);
    }
    const andou = new Set(trilho).size >= 6;
    const dentro = trilho.every((c) => c >= -0.25 && c <= 1.25);
    console.log(`\n── 1b. O PERCURSO (8 amostras a cada 700ms, scroll parado) ──`);
    console.log(`  cabeça do pulso ao longo do tempo : ${trilho.join(" → ")}`);
    console.log(`  ANDA (não é pulso estático)       : ${andou ? "SIM" : "NÃO ❌"}`);
    console.log(`  sempre dentro de [-0,2 ; 1,2]     : ${dentro ? "SIM" : "NÃO ❌"}`);

    /* ── 2. O FALLBACK ── */
    await env("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await env("Page.navigate", { url: ALVO });
    await espera(3000);
    const reduzido = [];
    for (const frac of [0, 0.5, 1]) {
      const y = Math.max(0, Math.round(inicio + (fim - inicio) * frac));
      const { result } = await env("Runtime.evaluate", {
        expression: LER(y),
        returnByValue: true,
        awaitPromise: true,
      });
      reduzido.push(result.value);
    }
    console.log("\n── 2. O FALLBACK (prefers-reduced-motion: reduce) ──");
    for (const p of reduzido) {
      console.log(
        `  scrollY ${String(p.scrollY).padStart(6)}  --d-p=${p.dp}  desenhado=${p.desenhado}%  cabeça=${p.pulsoCabeca}  fora=${p.pulsoFora}  anim=${p.pulsoAnim}`,
      );
    }
    console.log(
      `\n  traço INTEIRO e parado         : ${reduzido.every((p) => p.dp === 1 && p.desenhado === 100) ? "SIM" : "NÃO ❌"}`,
    );
    console.log(
      `  percurso desligado             : ${reduzido.every((p) => p.pulsoAnim === "none") ? "SIM" : "NÃO ❌"}`,
    );
    console.log(
      `  pulso FORA do caminho          : ${reduzido.every((p) => p.pulsoFora) ? "SIM" : "NÃO ❌ (borrão parado em cima do traço)"}`,
    );

    await writeFile(
      resolve(DESTINO, "varredura.json"),
      JSON.stringify({ varredura, trilhoDoPulso: trilho, reduzido }, null, 2),
    );
  } finally {
    chrome.kill();
    /* Ver a nota gêmea no audita-linha.mjs: ~60MB de perfil por execução, e o rm só
       funciona depois de o processo morrer de verdade. */
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

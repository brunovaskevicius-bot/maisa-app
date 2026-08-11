/* prova-pulso — o pulso PINTA, ou só o computed style muda?
 *
 * ⚠️ ESTE SCRIPT EXISTE POR CAUSA DE UM FALSO POSITIVO MEU. O audita-varredura.mjs lê
 * `getComputedStyle(...).strokeDashoffset` e viu o número mudando com o tempo — e eu
 * concluí "o pulso anda". NÃO PROVA NADA DISSO. Computed style mudando prova que o
 * motor de animação está rodando; não prova que o SVG foi REPINTADO. Há navegadores em
 * que animar uma custom property registrada que alimenta `stroke-dashoffset` atualiza o
 * valor e NÃO invalida o paint do path — resultado: fio visualmente estático com todos
 * os números "corretos". (E as fotos do foto-pulso.mjs não pegam isso: lá o valor é
 * setado por estilo inline, o que força recálculo e pintura.)
 *
 * A ÚNICA PROVA É O PIXEL. Aqui: N fotos da faixa do fio, sem congelar nada, ao longo
 * de um ciclo — e o hash de cada uma. Hashes todos iguais = não pinta = bug.
 *
 * USO:  node .claude/prova-pulso.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9339;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* 10 amostras cobrindo mais de um ciclo de 9s. */
const AMOSTRAS = 10;
const INTERVALO = 1100;

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

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-prova");
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
    await espera(4500);

    /* A seção centrada, para o desenho estar completo (--d-p = 1) e a faixa do fio
       estar dentro da viewport — screenshot de viewport, sem captureBeyondViewport,
       porque é o caminho que mais se parece com o que o olho vê. */
    await env("Runtime.evaluate", {
      expression: `document.querySelector(".lp3-d-arena").scrollIntoView({block:"center"})`,
    });
    await espera(1200);

    /* ⚠️ COORDENADA DE PÁGINA, NÃO DE VIEWPORT. O `clip` do Page.captureScreenshot é
       relativo à origem do DOCUMENTO, então falta somar o `scrollY` — sem ele o recorte
       cai a milhares de px do fio e sai uma faixa branca. Foi o que aconteceu na 1ª
       rodada deste script: 10 hashes idênticos de 994 bytes, e o "veredito: não pinta"
       era só a mesma imagem VAZIA dez vezes. Faixa branca é o falso positivo perfeito
       para este teste — ela concorda com qualquer hipótese. */
    const { result: g } = await env("Runtime.evaluate", {
      expression: `(() => { const a = document.querySelector(".lp3-d-arena").getBoundingClientRect();
        return { meio: Math.round(a.top + window.scrollY + a.height / 2) }; })()`,
      returnByValue: true,
    });
    const faixa = { x: 0, y: Math.max(0, g.value.meio - 70), width: 1440, height: 140, scale: 1 };

    const linhas = [];
    for (let i = 0; i < AMOSTRAS; i++) {
      const { result: v } = await env("Runtime.evaluate", {
        expression: `(() => { const el = document.querySelector(".lp3-d-traco");
          const cs = getComputedStyle(el);
          /* A onda anda por transform, então o que se lê é a matriz. matrix(a,b,c,d,e,f)
             → \`e\` é o translateX em unidades de usuário do SVG. Vai de 0 a -400. */
          const m = cs.transform;
          const e = m === "none" ? 0 : +parseFloat(m.split(",")[4]).toFixed(2);
          return { desloc: e, anim: cs.animationName, dur: cs.animationDuration,
                   dp: getComputedStyle(document.querySelector(".lp3-d-arena")).getPropertyValue("--d-p").trim(),
                   dash: cs.strokeDashoffset }; })()`,
        returnByValue: true,
      });
      const { data } = await env("Page.captureScreenshot", { format: "png", clip: faixa });
      const buf = Buffer.from(data, "base64");
      const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
      linhas.push({ i, ...v.value, hash, bytes: buf.length });
      if (i < 3) await writeFile(resolve(DESTINO, `prova-${i}.png`), buf);
      await espera(INTERVALO);
    }

    console.log("amostra   deslocamento da onda   --d-p / animacao        hash do pixel");
    for (const l of linhas) {
      console.log(
        `${String(l.i).padStart(6)}   translateX=${String(l.desloc).padStart(8)}   dp=${l.dp}  ${l.anim} ${l.dur}   ${l.hash}`,
      );
    }

    const cabecasDistintas = new Set(linhas.map((l) => l.desloc)).size;
    const hashesDistintos = new Set(linhas.map((l) => l.hash)).size;
    console.log(`\n  deslocamentos distintos     : ${cabecasDistintas}/${AMOSTRAS}`);
    console.log(`  PIXELS distintos            : ${hashesDistintos}/${AMOSTRAS}`);
    console.log(
      `\n  VEREDITO: ${
        hashesDistintos > 1
          ? "A ONDA PINTA ✓ (pixel muda junto com o deslocamento)"
          : cabecasDistintas > 1
            ? "❌ NÃO PINTA — desloca e o pixel NÃO muda."
            : "❌ nem desloca — a animacao nao esta aplicada."
      }`,
    );
  } finally {
    chrome.kill();
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

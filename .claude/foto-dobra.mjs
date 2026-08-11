/* foto-dobra — fotografa a dobra da /barbeiros/v3 para conferir a órbita de rostos.
 * DESCARTÁVEL, mesma plumbing do foto-zap.mjs.
 * USO:  node .claude/foto-dobra.mjs        (com o dev no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const PORTA_CDP = 9349;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar(porta) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch { await espera(250); }
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

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORTA_CDP}`,
  `--user-data-dir=${resolve(RAIZ, ".auditoria-perfil-dobra")}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });

async function main() {
  await mkdir(DESTINO, { recursive: true });
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
  await env("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await env("Page.navigate", { url: "http://localhost:3100/barbeiros/v3" });
  await espera(6000);

  /* ── CONTRASTE MEDIDO, NÃO ESTIMADO ──
     Desenha a foto num canvas replicando `object-fit: cover` + `object-position`,
     compõe o véu branco por cima com o alfa que o gradiente tem naquele y, e mede a
     razão de contraste contra a tinta em cada pedaço de texto. É a única forma de
     saber se o subtítulo caiu numa cadeira azul — olhar a foto não responde isso, e
     "parece legível" é exatamente o julgamento que erra em tela de outra pessoa. */
  const { result } = await env("Runtime.evaluate", {
    expression: `(() => {
      const dobra = document.querySelector(".lp3-dobra");
      const img = document.querySelector(".lp3-foto");
      if (!dobra || !img || !img.naturalWidth) return { erro: "sem foto" };
      const rd = dobra.getBoundingClientRect();
      const L = Math.round(rd.width), A = Math.round(rd.height);

      const cv = document.createElement("canvas");
      cv.width = L; cv.height = A;
      const g = cv.getContext("2d", { willReadFrequently: true });

      /* cover + object-position: 62% 50% — a mesma conta que o navegador faz. */
      const escala = Math.max(L / img.naturalWidth, A / img.naturalHeight);
      const dl = img.naturalWidth * escala, da = img.naturalHeight * escala;
      g.drawImage(img, (L - dl) * 0.62, (A - da) * 0.5, dl, da);

      /* O véu: paradas do gradiente do v3.css, interpoladas linearmente. */
      const PARADAS = [[0, 0.72], [0.26, 0.58], [0.46, 0.24], [0.64, 0]];
      const alfa = (t) => {
        if (t <= 0) return PARADAS[0][1];
        for (let i = 1; i < PARADAS.length; i++) {
          if (t <= PARADAS[i][0]) {
            const [t0, a0] = PARADAS[i - 1], [t1, a1] = PARADAS[i];
            return a0 + (a1 - a0) * ((t - t0) / (t1 - t0));
          }
        }
        return 0;
      };

      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
      const TINTA = lum(15, 23, 42); // #0F172A

      /* A superfície do PRÓPRIO elemento, se ele tiver uma. Medir a foto atrás de um
         botão opaco é medir a coisa errada: o que decide a legibilidade ali é o
         rótulo contra o fundo do botão, não contra a parede. */
      /* ⚠️ PARSE POR CANVAS, NÃO POR REGEX. A primeira versão lia os números da string
         com /[0-9.]+/ e quebrou calada: os tokens desta página são declarados em
         OKLCH, e o Chrome devolve "oklch(0.2077 0.0398 265.8)" no computed style —
         a regex pegava 0.2077 como R, 0.0398 como G e 265.8 como B. Deu contraste
         de mentira em todas as linhas. Um canvas de 1×1 normaliza qualquer sintaxe
         que o navegador entenda; é o mesmo truque do corParaRgb() do Particulas.tsx. */
      const cc = document.createElement("canvas");
      cc.width = cc.height = 1;
      const gc = cc.getContext("2d", { willReadFrequently: true });
      const rgba = (s) => {
        gc.clearRect(0, 0, 1, 1);
        gc.fillStyle = "rgba(0,0,0,0)";
        gc.fillStyle = s;
        gc.fillRect(0, 0, 1, 1);
        const d = gc.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };

      const medir = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        /* Num <a> com wrap, quem pinta é o filho — pega o descendente com fundo. */
        const alvo = [el, ...el.querySelectorAll("*")].find((n) => rgba(getComputedStyle(n).backgroundColor)[3] > 0.02) || el;
        /* A cor do texto sai do MESMO nó que pinta o fundo. Ler a tinta de um
           elemento e o fundo de outro dá um par que não existe na tela — foi o que
           fez o botão medir 1,01:1: o <a> herdava azul e o rótulo dentro dele é
           branco, então eu comparava azul com azul. */
        const cs = getComputedStyle(alvo);
        const fundo = rgba(cs.backgroundColor);
        const tintaEl = rgba(cs.color);
        const lumEl = lum(tintaEl[0], tintaEl[1], tintaEl[2]);
        const r = el.getBoundingClientRect();
        const x0 = Math.max(0, Math.round(r.left - rd.left)), y0 = Math.max(0, Math.round(r.top - rd.top));
        const w = Math.min(L - x0, Math.round(r.width)), h = Math.min(A - y0, Math.round(r.height));
        if (w <= 0 || h <= 0) return null;
        const d = g.getImageData(x0, y0, w, h).data;
        let pior = 99, soma = 0, n = 0;
        /* amostra em grade de 4px: 1 pixel não descreve um fundo fotográfico */
        for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
          const i = (y * w + x) * 4;
          const a = alfa((y0 + y) / A);
          let R = d[i] * (1 - a) + 255 * a, G = d[i + 1] * (1 - a) + 255 * a, B = d[i + 2] * (1 - a) + 255 * a;
          /* e por cima de tudo, a superfície do próprio elemento */
          if (fundo[3] > 0.02) {
            R = R * (1 - fundo[3]) + fundo[0] * fundo[3];
            G = G * (1 - fundo[3]) + fundo[1] * fundo[3];
            B = B * (1 - fundo[3]) + fundo[2] * fundo[3];
          }
          const lf = lum(R, G, B);
          const c = (Math.max(lf, lumEl) + 0.05) / (Math.min(lf, lumEl) + 0.05);
          if (c < pior) pior = c;
          soma += c; n++;
        }
        return {
          pior: +pior.toFixed(2), medio: +(soma / n).toFixed(2),
          topo: +((y0 / A) * 100).toFixed(0), base: +(((y0 + h) / A) * 100).toFixed(0),
          /* Concatenação e não template literal: esta string vive DENTRO da template
             literal que carrega o script para a página, e uma crase aqui fecharia a
             de fora. */
          superficie: fundo[3] > 0.02 ? ("fundo próprio a " + Math.round(fundo[3] * 100) + "%") : "sobre a foto",
        };
      };

      return { frase: medir(".lp3-frase"), sub: medir(".lp3-sub"), cta: medir(".lp3-cta") };
    })()`,
    returnByValue: true,
  });
  const m = result.value;
  if (m.erro) console.log("medição:", m.erro);
  else for (const [nome, v] of Object.entries(m)) {
    if (!v) continue;
    const veredito = v.pior >= 7 ? "AAA" : v.pior >= 4.5 ? "AA" : v.pior >= 3 ? "AA-grande" : "REPROVADO";
    console.log(`${nome.padEnd(6)} y ${String(v.topo).padStart(2)}–${String(v.base).padStart(2)}%  pior ${String(v.pior).padStart(6)}:1  médio ${String(v.medio).padStart(6)}:1  ${veredito.padEnd(10)} ${v.superficie}`);
  }

  const { data } = await env("Page.captureScreenshot", { format: "png" });
  await writeFile(resolve(DESTINO, "dobra.png"), Buffer.from(data, "base64"));
  console.log("dobra.png");
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exitCode = 1; })
  .finally(async () => {
    chrome.kill();
    await espera(1500);
    await rm(resolve(RAIZ, ".auditoria-perfil-dobra"), { recursive: true, force: true }).catch(() => {});
  });

/* mede-video-dobra — a régua de contraste da /barbeiros/v4.
 *
 * POR QUE ELA EXISTE, se o foto-dobra.mjs já media a dobra: porque medir uma FOTO é
 * medir uma imagem, e medir um VÍDEO é medir todas. O véu da v3 foi calibrado nos
 * tons da parede da barbearia; o vídeo tem tons próprios e eles mudam ao longo da
 * reprodução. Um quadro claro aprova, o quadro 200 pode reprovar, e o sintoma disso
 * na vida real é a manchete sumindo por dois segundos — que é o tipo de defeito que
 * screenshot nenhum pega, porque screenshot é um quadro só.
 *
 * O QUE ELA FAZ: varre o vídeo de meio em meio segundo até o CORTE (duração − 2s),
 * desenha cada quadro replicando `object-fit: cover` + `object-position: 62% 50%`,
 * compõe o véu do v3.css por cima com o alfa que o gradiente tem naquele y, e mede
 * a razão de contraste atrás da manchete, do subtítulo e do botão. Reporta o PIOR
 * quadro de cada um — que é o que decide, já que a pessoa vê todos.
 *
 * Também confere o que não é cor: se o vídeo realmente toca, se ele REBOBINA no
 * corte e não no fim do arquivo, e qual a resolução da fonte.
 *
 * USO:  node .claude/mede-video-dobra.mjs        (com o dev no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const PORTA_CDP = 9351;
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
  `--user-data-dir=${resolve(RAIZ, ".auditoria-perfil-video")}`,
  /* ⚠️ SEM ISTO A MEDIÇÃO MENTE: o autoplay é recusado num perfil sem gesto do
     usuário, o vídeo fica no quadro zero e todos os quadros medem igual. */
  "--autoplay-policy=no-user-gesture-required",
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });

/* ⚠️ AS PARADAS DO VÉU NÃO MORAM AQUI, E ISSO É DE PROPÓSITO.
   A primeira versão desta régua trazia a lista copiada à mão do v3.css — e uma régua
   que guarda a própria cópia do que mede é uma régua que mente no dia em que a folha
   muda e ninguém lembra de atualizar as duas. Agora ela LÊ o `background-image`
   computado do `.lp3-veu` na página, que já vem com a cascata resolvida: se a v4
   sobrescrever o véu da v3, é o da v4 que ela mede, sem saber que ele existe. */

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

  for (const [rotulo, larg, alt] of [["desktop 1440", 1440, 900], ["celular 390", 390, 844]]) {
    await env("Emulation.setDeviceMetricsOverride", {
      width: larg, height: alt, deviceScaleFactor: 2, mobile: larg < 500,
    });
    await env("Page.navigate", { url: "http://localhost:3100/barbeiros/v4" });
    await espera(7000);

    const { result } = await env("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const dobra = document.querySelector(".lp3-dobra");
        const v = document.querySelector(".lp4-video");
        if (!dobra || !v) return { erro: "sem dobra ou sem video" };
        if (!v.videoWidth) return { erro: "video nao decodificou (readyState " + v.readyState + ")" };

        const CORTE = 2;
        const fim = Number.isFinite(v.duration) ? v.duration - CORTE : 8.006;

        /* ── 1. ELE TOCA E REBOBINA NO CORTE? ──
           Deixa correr e anota o maior tempo já visto e quantas voltas deu. Se o
           maior tempo passar do corte, o rebobinar está atrasado; se não houver
           volta nenhuma, ou parou ou o arquivo é curto demais para o teste. */
        const antes = v.currentTime;
        let maior = 0, voltas = 0, ultimo = v.currentTime;
        const t0 = performance.now();
        await new Promise((ok) => {
          const tick = () => {
            const t = v.currentTime;
            if (t > maior) maior = t;
            if (t < ultimo - 0.3) voltas++;
            ultimo = t;
            if (performance.now() - t0 > 11000) return ok();
            requestAnimationFrame(tick);
          };
          tick();
        });
        const andou = v.currentTime !== antes || maior > 0.5;

        /* ── 2. O CONTRASTE, QUADRO A QUADRO ── */
        const rd = dobra.getBoundingClientRect();
        const L = Math.round(rd.width), A = Math.round(rd.height);
        const cv = document.createElement("canvas");
        cv.width = L; cv.height = A;
        const g = cv.getContext("2d", { willReadFrequently: true });

        /* ── O VÉU, LIDO DA PÁGINA ──
           O backgroundImage computado já traz a cascata resolvida (v3 sobrescrito
           pela v4, se for o caso) e os alfas normalizados em rgba(). Só interessam
           as paradas COM porcentagem — que é como as duas folhas as escrevem.
           ⚠️ SEM CRASE NESTE COMENTÁRIO: ele vive dentro da template literal que
           carrega o script para a página, e uma crase aqui fecharia a de fora. É o
           mesmo aviso que já estava escrito no foto-dobra.mjs, e eu o desrespeitei
           uma vez antes de reescrever esta linha. */
        const veu = document.querySelector(".lp3-veu");
        if (!veu) return { erro: "sem veu" };
        const grad = getComputedStyle(veu).backgroundImage;
        const P = [];
        const re = /rgba?\\(([^)]*)\\)\\s*([\\d.]+)%/g;
        let mm;
        while ((mm = re.exec(grad))) {
          const n = mm[1].split(",").map((s) => parseFloat(s.trim()));
          P.push([parseFloat(mm[2]) / 100, n.length > 3 ? n[3] : 1]);
        }
        if (P.length < 2) return { erro: "nao li o gradiente do veu: " + grad };

        const alfa = (t) => {
          if (t <= P[0][0]) return P[0][1];
          for (let i = 1; i < P.length; i++) {
            if (t <= P[i][0]) {
              const t0b = P[i-1][0], a0 = P[i-1][1], t1 = P[i][0], a1 = P[i][1];
              return t1 === t0b ? a1 : a0 + (a1 - a0) * ((t - t0b) / (t1 - t0b));
            }
          }
          return P[P.length - 1][1];
        };
        const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);

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

        const caixas = {};
        for (const sel of [".lp3-frase", ".lp3-sub", ".lp3-cta"]) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const alvo = [el, ...el.querySelectorAll("*")].find((n) => rgba(getComputedStyle(n).backgroundColor)[3] > 0.02) || el;
          const cs = getComputedStyle(alvo);
          const r = el.getBoundingClientRect();
          const x0 = Math.max(0, Math.round(r.left - rd.left)), y0 = Math.max(0, Math.round(r.top - rd.top));
          const w = Math.min(L - x0, Math.round(r.width)), h = Math.min(A - y0, Math.round(r.height));
          if (w <= 0 || h <= 0) continue;
          const tintaEl = rgba(cs.color);
          caixas[sel] = {
            x0, y0, w, h,
            lumEl: lum(tintaEl[0], tintaEl[1], tintaEl[2]),
            fundo: rgba(cs.backgroundColor),
            topo: Math.round((y0 / A) * 100), base: Math.round(((y0 + h) / A) * 100),
          };
        }

        const escala = Math.max(L / v.videoWidth, A / v.videoHeight);
        const dl = v.videoWidth * escala, da = v.videoHeight * escala;
        const dx = (L - dl) * 0.62, dy = (A - da) * 0.5;

        const pausado = v.paused;
        v.pause();
        const acc = {};
        for (const sel of Object.keys(caixas)) acc[sel] = { pior: 99, piorEm: 0, soma: 0, n: 0 };

        const amostras = [];
        for (let t = 0; t <= fim; t += 0.5) amostras.push(Math.min(t, fim - 0.01));

        for (const t of amostras) {
          await new Promise((ok) => {
            const f = () => { v.removeEventListener("seeked", f); ok(); };
            v.addEventListener("seeked", f);
            v.currentTime = t;
            setTimeout(f, 1200); /* rede: se o seeked nao vier, segue */
          });
          g.drawImage(v, dx, dy, dl, da);
          for (const [sel, c] of Object.entries(caixas)) {
            const d = g.getImageData(c.x0, c.y0, c.w, c.h).data;
            for (let y = 0; y < c.h; y += 4) for (let x = 0; x < c.w; x += 4) {
              const i = (y * c.w + x) * 4;
              const a = alfa((c.y0 + y) / A);
              let R = d[i] * (1 - a) + 255 * a, G = d[i+1] * (1 - a) + 255 * a, B = d[i+2] * (1 - a) + 255 * a;
              if (c.fundo[3] > 0.02) {
                R = R * (1 - c.fundo[3]) + c.fundo[0] * c.fundo[3];
                G = G * (1 - c.fundo[3]) + c.fundo[1] * c.fundo[3];
                B = B * (1 - c.fundo[3]) + c.fundo[2] * c.fundo[3];
              }
              const lf = lum(R, G, B);
              const ct = (Math.max(lf, c.lumEl) + 0.05) / (Math.min(lf, c.lumEl) + 0.05);
              if (ct < acc[sel].pior) { acc[sel].pior = ct; acc[sel].piorEm = t; }
              acc[sel].soma += ct; acc[sel].n++;
            }
          }
        }
        if (!pausado) { v.currentTime = 0; v.play().catch(() => {}); }

        const saida = {};
        for (const [sel, a] of Object.entries(acc)) {
          saida[sel] = {
            pior: +a.pior.toFixed(2), piorEm: +a.piorEm.toFixed(1),
            medio: +(a.soma / a.n).toFixed(2),
            topo: caixas[sel].topo, base: caixas[sel].base,
            superficie: caixas[sel].fundo[3] > 0.02 ? ("fundo proprio a " + Math.round(caixas[sel].fundo[3] * 100) + "%") : "sobre o video",
          };
        }
        return {
          fonte: v.videoWidth + "x" + v.videoHeight,
          duracao: +v.duration.toFixed(3), corte: +fim.toFixed(3),
          andou, maiorTempo: +maior.toFixed(2), voltas, amostras: amostras.length,
          /* Devolvido para conferência: se aqui aparecer o véu da v3, a v4 não
             sobrescreveu nada e o resto do relatório está medindo a página errada. */
          veu: P.map((p) => Math.round(p[0] * 100) + "%·" + p[1]).join("  "),
          medidas: saida,
        };
      })()`,
    });

    const m = result.value;
    console.log("\n══ " + rotulo + " ══");
    if (!m || m.erro) { console.log("  medição:", m ? m.erro : "sem retorno"); continue; }
    console.log(`  fonte ${m.fonte} · duração ${m.duracao}s · corte em ${m.corte}s`);
    console.log(`  véu lido da página: ${m.veu}`);
    console.log(`  tocou: ${m.andou ? "sim" : "NÃO"} · maior tempo visto ${m.maiorTempo}s · voltas ${m.voltas} · ${m.amostras} quadros medidos`);
    const estouro = m.maiorTempo > m.corte + 0.12;
    console.log(`  corte respeitado: ${estouro ? "NÃO — passou " + (m.maiorTempo - m.corte).toFixed(2) + "s do corte" : "sim"}`);
    for (const [sel, v] of Object.entries(m.medidas)) {
      const veredito = v.pior >= 7 ? "AAA" : v.pior >= 4.5 ? "AA" : v.pior >= 3 ? "AA-grande" : "REPROVADO";
      console.log(`  ${sel.padEnd(11)} y ${String(v.topo).padStart(2)}–${String(v.base).padStart(2)}%  pior ${String(v.pior).padStart(6)}:1 (em ${v.piorEm}s)  médio ${String(v.medio).padStart(6)}:1  ${veredito}  ${v.superficie}`);
    }
    const { data } = await env("Page.captureScreenshot", { format: "png" });
    await writeFile(resolve(DESTINO, `v4-${larg}.png`), Buffer.from(data, "base64"));
  }
  console.log("\nscreenshots em .claude/auditoria/v4-1440.png e v4-390.png");
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exitCode = 1; })
  .finally(async () => {
    chrome.kill();
    await espera(1500);
    await rm(resolve(RAIZ, ".auditoria-perfil-video"), { recursive: true, force: true }).catch(() => {});
  });

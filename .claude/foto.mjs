/* foto — fotografa uma rota do dev server, em qualquer viewport.
 *
 * Existe porque o sandbox do agente não deixa invocar o binário do Chrome direto
 * numa linha de shell, mas deixa rodar `node`. O mesmo caminho que o
 * `scripts/captura-telas.mjs` já usa (CDP por WebSocket), sem a parte de fixture.
 *
 * uso: node .claude/foto.mjs <rota-sem-barra> <largura> <altura> <saida.png> [espera_ms]
 * ex.: node .claude/foto.mjs barbeiros/v3 1440 900 .claude/v3.png 3000
 *
 * A rota vai SEM a barra inicial de propósito: o sandbox do agente trata qualquer
 * argumento começando com "/" como caminho de arquivo e recusa a chamada.
 */
import { spawn } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTA = 9333;

const [rota, larg, alt, saida, esperaMs = "2500"] = process.argv.slice(2);
const ALVO = `http://localhost:3100/${rota.replace(/^\/+/, "")}`;

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

const perfil = resolve(RAIZ, ".foto-perfil");
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
  const enviar = sessao(ws);
  const { targetId } = await enviar("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await enviar("Target.attachToTarget", { targetId, flatten: true });
  const cmd = (m, p) => enviar(m, p, sessionId);

  await cmd("Page.enable");
  await cmd("Runtime.enable");

  /* `REDUZIDO=1 node .claude/foto.mjs …` fotografa a página como quem pediu para ela
     não se mexer. Serve para conferir que "sem movimento" não virou "sem conteúdo". */
  if (process.env.REDUZIDO === "1") {
    await cmd("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
  }
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      console.error(`foto: EXCEÇÃO — ${d.exception?.description ?? d.text}`);
    }
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) {
      console.error(`foto: console.${m.params.type} — ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`);
    }
  });
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: Number(larg),
    height: Number(alt),
    deviceScaleFactor: 2,
    mobile: Number(larg) < 700,
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
  const nav = await cmd("Page.navigate", { url: ALVO });
  if (nav.errorText) console.error(`foto: navegação falhou — ${nav.errorText}`);
  await carregou;
  await espera(Number(esperaMs));

  /* `ROLAR=2600 node .claude/foto.mjs …` fotografa a página já rolada, e devolve o
     estado do carrossel naquele ponto. Existe porque a <Telas> é uma seção PINADA:
     o que ela mostra depende de quanto se rolou, e sem isto não há como conferir se
     o passo virou onde deveria — só dá para ver a primeira tela. */
  if (process.env.ROLAR) {
    await cmd("Runtime.evaluate", { expression: `scrollTo(0, ${Number(process.env.ROLAR)})` });
    await espera(600);
    const passo = await cmd("Runtime.evaluate", {
      returnByValue: true,
      expression: `JSON.stringify({
        y: Math.round(scrollY),
        ativo: document.querySelector('.lp3-t')?.dataset.ativo,
        palcoTopo: Math.round(document.querySelector('.lp3-t-palco')?.getBoundingClientRect().top ?? -1),
        grudado: (() => {
          const p = document.querySelector('.lp3-t-palco'); if (!p) return null;
          const topoPin = (innerHeight - p.getBoundingClientRect().height) / 2;
          return Math.abs(p.getBoundingClientRect().top - topoPin) < 2;
        })(),
        d: [...document.querySelectorAll('.lp3-t-cel')].map(el => el.style.getPropertyValue('--d')),
      })`,
    });
    console.log(`foto: rolagem ${passo.result.value}`);
  }

  await cmd("Runtime.enable");
  const diag = await cmd("Runtime.evaluate", {
    expression: `JSON.stringify({
      url: location.href,
      titulo: document.title,
      hidratou: (() => {
        const c = document.querySelector('canvas.lp3-poeira');
        if (!c) return 'sem canvas';
        const k = Object.keys(c).filter(x => x.startsWith('__react'));
        return k.length ? 'sim: ' + k.join(',') : 'NAO (sem fiber)';
      })(),
      recursos: performance.getEntriesByType('resource').filter(r => r.responseStatus >= 400)
        .map(r => r.name.split('/').pop().split('?')[0] + ':' + r.responseStatus),
      webpack: typeof window.webpackChunk_N_E,
      fibersNaPagina: [...document.querySelectorAll('*')].slice(0, 400)
        .filter(el => Object.keys(el).some(k => k.startsWith('__react'))).length,
      dobra: !!document.querySelector('.lp3-dobra'),
      caixas: (() => {
        const q = (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; };
        return { dobra: q('.lp3-dobra'), telas: q('.lp3-t'), pilha: q('.lp3-t-pilha'), palco: q('.lp3-t-palco'), risco: q('.lp3-t-risco'), vh: innerHeight };
      })(),
      frasePx: getComputedStyle(document.querySelector('.lp3-frase')).fontSize,

      /* ── A ÓRBITA ──────────────────────────────────────────────────────────
         Os raios NÃO são lidos do CSS de propósito: custom property sem @property
         volta do getComputedStyle como o token cru ("max(58vw, 265px)"), não como
         px. Então eles são DEDUZIDOS dos centros medidos, por mínimos quadrados em
         a·u + b·v = 1 (u = Δx², v = Δy²), de onde rx = 1/√a e ry = 1/√b. O resíduo
         é o brinde: se os dezesseis pontos não estivessem numa elipse, ele
         denunciaria — ou seja, isto MEDE o offset-path em vez de acreditar nele.
            (Sem crase dentro deste bloco: ele vive num template literal.) */
      orb: (() => {
        const cs = [...document.querySelectorAll('.lp3-orb-card')];
        if (!cs.length) return 'SEM CARTOES';
        const dob = document.querySelector('.lp3-dobra').getBoundingClientRect();
        const cx = dob.left + dob.width / 2, cy = dob.top + dob.height / 2;
        const rs = cs.map(el => el.getBoundingClientRect());
        const pts = rs.map(r => [r.left + r.width / 2 - cx, r.top + r.height / 2 - cy]);
        let Suu = 0, Suv = 0, Svv = 0, Su = 0, Sv = 0;
        for (const [dx, dy] of pts) { const u = dx * dx, v = dy * dy; Suu += u * u; Suv += u * v; Svv += v * v; Su += u; Sv += v; }
        const det = Suu * Svv - Suv * Suv;
        const a = (Su * Svv - Sv * Suv) / det, b = (Sv * Suu - Su * Suv) / det;
        const rx = 1 / Math.sqrt(a), ry = 1 / Math.sqrt(b);
        const resid = pts.map(([dx, dy]) => a * dx * dx + b * dy * dy - 1);
        /* perímetro por Ramanujan — é ele que vira "passo" quando dividido por n */
        const h = ((rx - ry) / (rx + ry)) ** 2;
        const per = Math.PI * (rx + ry) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
        return {
          n: cs.length,
          cartao: [Math.round(rs[0].width), Math.round(rs[0].height)],
          rx: Math.round(rx), ry: Math.round(ry),
          residMax: Math.max(...resid.map(Math.abs)).toFixed(4),
          perimetro: Math.round(per),
          passo: Math.round(per / cs.length),
          /* quantos centros distintos: sob movimento reduzido isto TEM de continuar
             igual a n. Se cair para 1, o anel desmontou e "sem movimento" virou
             "sem conteúdo". */
          distintos: new Set(pts.map(([dx, dy]) => Math.round(dx) + ',' + Math.round(dy))).size,
          anim: getComputedStyle(cs[0]).animationName,
          estado: getComputedStyle(cs[0]).animationPlayState,
          alturaOcupada: [Math.round(Math.min(...rs.map(r => r.top))), Math.round(Math.max(...rs.map(r => r.bottom)))],
        };
      })(),

      /* ── A PROVA DE COLISÃO, conferida contra a régua e não contra a intenção ──
         A caixa do texto é a UNIÃO das linhas reais (Range por bloco da manchete +
         o botão), não o rect do <h1> — que é um bloco de largura cheia e mediria ar
         centrado como se fosse tinta. */
      prova: (() => {
        const cs = [...document.querySelectorAll('.lp3-orb-card')];
        if (!cs.length) return 'SEM CARTOES';
        const dob = document.querySelector('.lp3-dobra').getBoundingClientRect();
        const cx = dob.left + dob.width / 2, cy = dob.top + dob.height / 2;
        const linhas = [];
        document.querySelectorAll('.lp3-frase span').forEach(sp => {
          const rg = document.createRange(); rg.selectNodeContents(sp);
          for (const r of rg.getClientRects()) if (r.width > 1) linhas.push(r);
        });
        const cta = document.querySelector('.lp3-cta')?.getBoundingClientRect();
        if (cta) linhas.push(cta);
        const L = Math.min(...linhas.map(r => r.left)), R = Math.max(...linhas.map(r => r.right));
        const T = Math.min(...linhas.map(r => r.top)), B2 = Math.max(...linhas.map(r => r.bottom));
        const texto = { l: Math.round(L), r: Math.round(R), t: Math.round(T), b: Math.round(B2) };
        const rs = cs.map(el => el.getBoundingClientRect());
        const pts = rs.map(r => [r.left + r.width / 2 - cx, r.top + r.height / 2 - cy]);
        let Suu = 0, Suv = 0, Svv = 0, Su = 0, Sv = 0;
        for (const [dx, dy] of pts) { const u = dx * dx, v = dy * dy; Suu += u * u; Suv += u * v; Svv += v * v; Su += u; Sv += v; }
        const det = Suu * Svv - Suv * Suv;
        const rx = 1 / Math.sqrt((Su * Svv - Sv * Suv) / det), ry = 1 / Math.sqrt((Sv * Suu - Su * Suv) / det);
        /* o texto pode não estar centrado no mesmo ponto que a elipse; a prova é
           conservadora e usa a META-LARGURA que alcança a borda mais distante. */
        const A = Math.max(Math.abs(L - cx), Math.abs(R - cx)) + rs[0].width / 2;
        const Bv = Math.max(Math.abs(T - cy), Math.abs(B2 - cy)) + rs[0].height / 2;
        const valor = (A / rx) ** 2 + (Bv / ry) ** 2;
        /* e a checagem burra, no instante da foto: sobreposição real de retângulos */
        let toques = 0;
        for (const c of rs) for (const t of linhas)
          if (c.left < t.right && c.right > t.left && c.top < t.bottom && c.bottom > t.top) toques++;
        return { texto, A: Math.round(A), B: Math.round(Bv), valor: valor.toFixed(3), folga: (1 - valor).toFixed(3), seguro: valor <= 1, toquesAgora: toques };
      })(),

      poeira: (() => {
        const c = document.querySelector('canvas.lp3-poeira');
        if (!c) return null;
        const g = c.getContext('2d');
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let azul = 0, ouro = 0, cinza = 0;
        const amostras = [];
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 200) continue;
          const [r, g, b] = [d[i], d[i+1], d[i+2]];
          if (r > 245 && g > 245 && b > 245) continue;
          if (b - r > 12) azul++;
          else if (r - b > 12) ouro++;
          else cinza++;
          if (amostras.length < 6 && Math.abs(r-g) + Math.abs(g-b) > 40) amostras.push(r+','+g+','+b);
        }
        return { w: c.width, h: c.height, azul, ouro, cinza, amostras };
      })(),
    })`,
    returnByValue: true,
  });
  console.log(`foto: ${diag.result.value}`);

  /* ── A PROVA QUE A FOTO NÃO DÁ: que o anel ANDA ──
     Um screenshot mostra dezesseis cartões sobre uma elipse — e é exatamente isso
     que se veria com a animação PARADA, porque a distribuição vem do atraso e não de
     posição estática. O teste do resíduo passa nos dois casos e não distingue um do
     outro. A única evidência é medir duas vezes.

     ⚠️ SEM CRONÔMETRO NA CONTA, E ISSO É UMA CORREÇÃO. A primeira versão media a
     corda e dividia por um dt de performance.now(), e dava 33,9px/s onde o modelo
     previa 31,3 — 8% de erro que passei a caçar na geometria. Não era a geometria: eu
     lia as 16 posições ANTES de zerar o cronômetro, e os 16 getBoundingClientRect
     (cada um força layout) custavam ~98ms que ficavam fora do dt.
     A conta certa não precisa de relógio nenhum: lendo offset-distance e a posição na
     MESMA amostra, corda ÷ (Δ% ÷ 100) tem de dar o perímetro. Deu 3.744–3.775 contra
     3.761 do Ramanujan, e aí os dois números pararam de brigar.
     Sob REDUZIDO=1 o esperado é Δ% = 0 e corda = 0. */
  const anda = await cmd("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const cs = [...document.querySelectorAll('.lp3-orb-card')];
      if (!cs.length) return 'SEM CARTOES';
      const amostra = () => cs.map(el => {
        const d = parseFloat(getComputedStyle(el).offsetDistance);
        const r = el.getBoundingClientRect();
        return { d, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      const a = amostra();
      await new Promise(r => setTimeout(r, 1500));
      const b = amostra();
      const dpc = b.map((p, i) => { let d = p.d - a[i].d; if (d < 0) d += 100; return d; });
      const corda = b.map((p, i) => Math.hypot(p.x - a[i].x, p.y - a[i].y));
      const per = corda.map((c, i) => (dpc[i] > 0 ? c / (dpc[i] / 100) : 0));
      const med = (v) => v.reduce((s, x) => s + x, 0) / v.length;
      return JSON.stringify({
        andou: med(dpc).toFixed(3) + '% da volta',
        cordaPx: [Math.min(...corda).toFixed(1), Math.max(...corda).toFixed(1)],
        perimetroImplicado: dpc[0] > 0 ? Math.round(med(per)) : 'n/a (parado)',
        estado: getComputedStyle(cs[0]).animationPlayState,
      });
    })()`,
  });
  console.log(`foto: movimento ${anda.result.value}`);

  const { data } = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(resolve(RAIZ, saida), Buffer.from(data, "base64"));
  console.log(`foto: ${saida} (${larg}×${alt})`);
  ws.close();
} finally {
  const morreu = new Promise((ok) => chrome.once("exit", ok));
  chrome.kill();
  await morreu;
  await rm(perfil, { recursive: true, force: true });
}

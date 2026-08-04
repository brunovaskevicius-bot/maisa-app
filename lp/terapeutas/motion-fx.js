/* motion-fx — revelações da landing com Motion (motion.dev), vanilla.
   O gatilho de entrada em tela é um loop de rAF medindo o rect (e não
   IntersectionObserver): dentro de colunas sticky e de containers transformados
   o IO se comporta de forma imprevisível, e a rasura precisava rodar sempre.
   Progressive enhancement: o estado escondido é aplicado por JS, então se o
   Motion não carregar o conteúdo simplesmente aparece.
     data-fx="rise"        → sobe e aparece quando entra na tela
     data-fx="rise-group"  → idem, escalonando os [data-fx-item] filhos
     data-fx="strike"      → risca os [data-strike-text] em cascata e, no fim,
                             encolhe [data-swap-shrink] e abre [data-swap-grow] */
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DANGER = '#C7452F';
  let M = null;
  const queue = [];
  const seen = new WeakSet();

  /* ——— gatilho por rect ——— */
  function watch(el, amount, enter, exit) {
    let inside = false;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      const ratio = r.height ? vis / r.height : 0;
      if (!inside && ratio >= amount) { inside = true; enter(); }
      else if (inside && ratio <= 0.02) { inside = false; if (exit) exit(); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function register(el) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    const kind = el.getAttribute('data-fx');
    // só esconde se a aba está visível: conteúdo invisível é pior que conteúdo sem animação
    const canHide = !reduced && document.visibilityState === 'visible';
    if (kind === 'rise' || kind === 'rise-group') {
      const targets = kind === 'rise' ? [el] : [].slice.call(el.querySelectorAll('[data-fx-item]'));
      if (!targets.length) return;
      if (canHide) targets.forEach((t) => { t.style.opacity = '0'; t.style.transform = 'translateY(18px)'; });
      queue.push({ el, targets, kind, hidden: canHide });
    } else if (kind === 'strike') {
      queue.push({ el, kind, hidden: canHide });
      if (!canHide) commitStrike(el);
    }
    flush();
  }

  function flush() {
    if (!M) return;
    while (queue.length) {
      const job = queue.shift();
      if (job.kind === 'strike') strike(job.el, job.hidden);
      else rise(job.el, job.targets, job.hidden);
    }
  }

  function rise(el, targets, hidden) {
    if (reduced || !hidden) return;
    watch(el, 0.18, () => {
      targets.forEach((t, i) => {
        const d = i * 0.07;
        M.animate(t, { opacity: [0, 1], y: [18, 0] }, { delay: d, type: 'spring', stiffness: 320, damping: 32 });
        setTimeout(() => { t.style.opacity = ''; t.style.transform = ''; }, (d + 0.9) * 1000);
      });
    });
  }

  /* estado final: tudo riscado e o "agora" já ocupando o espaço grande */
  function commitStrike(el) {
    [].slice.call(el.querySelectorAll('[data-strike-item]')).forEach((item) => {
      const txt = item.querySelector('[data-strike-text]') || item;
      txt.style.textDecorationColor = DANGER;
      item.style.opacity = '0.42';
    });
    const shrink = el.querySelector('[data-swap-shrink]');
    const grow = el.querySelector('[data-swap-grow]');
    if (shrink) { shrink.style.flexBasis = '48%'; const i = shrink.querySelector('[data-swap-inner]'); if (i) i.style.opacity = '0.5'; }
    if (grow) { grow.style.flexBasis = '52%'; const i = grow.querySelector('[data-swap-inner]'); if (i) i.style.opacity = '1'; }
  }

  function resetStrike(el) {
    [].slice.call(el.querySelectorAll('[data-strike-item]')).forEach((item) => {
      const txt = item.querySelector('[data-strike-text]') || item;
      txt.style.textDecorationColor = 'transparent';
      item.style.opacity = '1';
    });
    const shrink = el.querySelector('[data-swap-shrink]');
    const grow = el.querySelector('[data-swap-grow]');
    if (shrink) { shrink.style.flexBasis = '70%'; const i = shrink.querySelector('[data-swap-inner]'); if (i) i.style.opacity = '1'; }
    if (grow) { grow.style.flexBasis = '30%'; const i = grow.querySelector('[data-swap-inner]'); if (i) i.style.opacity = '0.55'; }
  }

  function strike(el, hidden) {
    if (!hidden) return;
    const items = [].slice.call(el.querySelectorAll('[data-strike-item]'));
    if (!items.length) return;
    let timers = [];
    let done = false;
    watch(el, 0.18, () => {
      if (done) return;
      timers.forEach(clearTimeout);
      timers = [];
      items.forEach((item, i) => {
        const txt = item.querySelector('[data-strike-text]') || item;
        const d = 0.5 + i * 0.62;
        M.animate(txt, { textDecorationColor: ['rgba(199,69,47,0)', DANGER] }, { delay: d, duration: 0.7, ease: 'easeOut' });
        M.animate(item, { opacity: [1, 0.42] }, { delay: d + 0.3, duration: 0.6, ease: 'easeOut' });
        timers.push(setTimeout(() => {
          txt.style.textDecorationColor = DANGER;
          item.style.opacity = '0.42';
        }, (d + 1) * 1000));
      });
      // a troca de espaço é transição CSS de flex-basis: o valor final fica no
      // inline style e não volta atrás quando a animação termina
      const swapAt = 0.5 + items.length * 0.62 + 1.2;
      timers.push(setTimeout(() => { done = true; commitStrike(el); }, swapAt * 1000));
    }, () => {
      if (done) return; // já completou uma vez: não volta ao estado inicial
      timers.forEach(clearTimeout);
      timers = [];
      resetStrike(el);
    });
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.hasAttribute && root.hasAttribute('data-fx')) register(root);
    if (root.querySelectorAll) [].slice.call(root.querySelectorAll('[data-fx]')).forEach(register);
  }

  new MutationObserver((muts) => {
    muts.forEach((m) => [].slice.call(m.addedNodes).forEach(scan));
  }).observe(document.documentElement, { childList: true, subtree: true });

  scan(document.body || document.documentElement);

  (function wait(n) {
    if (window.Motion) { M = window.Motion; flush(); return; }
    if (n > 300) return;
    setTimeout(() => wait(n + 1), 40);
  })(0);
})();

/* scroll-stroke — porte do skiper19 (Skiper UI / @gurvinder-singh02): um traço SVG
   que se desenha conforme o progresso do scroll. Em vez do pathLength do
   framer-motion, usa stroke-dasharray/offset com o mesmo mapeamento de progresso
   (target atravessando a viewport). Fica atrás do texto, pointer-events:none. */
(function () {
  if (window.customElements && customElements.get('scroll-stroke')) return;

  const D = 'M42 322 C 26 150, 214 62, 368 96 C 520 128, 566 292, 424 352 C 286 410, 84 372, 66 236 C 50 104, 226 36, 372 70';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  class ScrollStroke extends HTMLElement {
    connectedCallback() {
      if (this._boot) return;
      this._boot = true;
      const w = this.getAttribute('w') || '600';
      const h = this.getAttribute('h') || '440';
      const color = this.getAttribute('stroke') || '#E09A34';
      const sw = this.getAttribute('stroke-width') || '16';
      // atributo "drawn" (e não "from") porque `from` é reservado pelo x-import
      this.from = parseFloat(this.getAttribute('drawn') || '0.35');
      this.style.cssText = 'display:block;pointer-events:none';
      // shadow DOM: o React não pode ver filhos que não foram criados por ele
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%" fill="none" aria-hidden="true" style="display:block;overflow:visible">' +
        '<path d="' + (this.getAttribute('d') || D) + '" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"></path></svg>';
      this.path = root.querySelector('path');
      this.len = this.path.getTotalLength();
      this.path.style.strokeDasharray = this.len;
      this.path.style.strokeDashoffset = this.len * (1 - this.from);
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this.reduced) { this.path.style.strokeDashoffset = 0; return; }
      // o progresso vem do alvo (a seção), não do próprio elemento: dentro de uma
      // coluna sticky o rect do elemento congela e o traço nunca completa
      this.targetSel = this.getAttribute('target') || 'section';
      this.frame = this.frame.bind(this);
      this.io = new IntersectionObserver((e) => {
        this.visible = e[0].isIntersecting;
        if (this.visible) this.start();
      }, { rootMargin: '200px' });
      this.io.observe(this);
      this.start();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      if (this.io) this.io.disconnect();
      this._boot = false;
    }

    start() {
      if (this.raf) cancelAnimationFrame(this.raf);
      const loop = () => {
        if (this.visible !== false) this.frame();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    frame() {
      const target = this.closest(this.targetSel) || this;
      const r = target.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      const drawn = this.from + (1 - this.from) * p;
      this.path.style.strokeDashoffset = (this.len * (1 - drawn)).toFixed(2);
    }
  }
  customElements.define('scroll-stroke', ScrollStroke);
})();

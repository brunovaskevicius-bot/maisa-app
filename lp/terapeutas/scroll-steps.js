/* scroll-steps — trilho vertical que acompanha o progresso da seção.
   O componente não cria DOM: os passos vêm do template ([data-step], [data-dot],
   [data-rail]) e ele só ajusta altura do trilho e estado de cada passo, com
   transição CSS (valor final no inline style, nada volta atrás).
   Progresso medido pelo alvo (a seção), igual ao scroll-stroke. */
(function () {
  if (window.customElements && customElements.get('scroll-steps')) return;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  class ScrollSteps extends HTMLElement {
    connectedCallback() {
      if (this._boot) return;
      this._boot = true;
      this.style.display = 'block';
      this.targetSel = this.getAttribute('target') || 'section';
      this.steps = [].slice.call(this.querySelectorAll('[data-step]'));
      this.rail = this.querySelector('[data-rail]');
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
      if (!this.steps.length) return;
      const target = this.closest(this.targetSel) || this;
      const r = target.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const p = clamp((vh * 0.75 - r.top) / Math.max(1, r.height - vh * 0.5), 0, 1);
      const n = this.steps.length;
      const active = clamp(Math.floor(p * n), 0, n - 1);
      if (this.rail) this.rail.style.height = (p * 100).toFixed(1) + '%';
      if (this._active === active) return;
      this._active = active;
      this.steps.forEach((s, i) => {
        const dot = s.querySelector('[data-dot]');
        const on = i === active;
        const past = i < active;
        s.style.opacity = on ? '1' : (past ? '0.66' : '0.34');
        if (dot) {
          dot.style.background = on || past ? 'var(--accent)' : 'var(--surface-page)';
          dot.style.borderColor = on || past ? 'var(--accent)' : 'var(--border-strong)';
          dot.style.transform = on ? 'scale(1.25)' : 'none';
        }
      });
    }
  }
  customElements.define('scroll-steps', ScrollSteps);
})();

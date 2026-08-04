/* stack-scroll — porte do skiper34 (StickyCard_003, Skiper UI / @gurvinder-singh02).
   Cards sticky em tela cheia que encolhem e giram conforme o scroll passa deles,
   com a imagem girando ao contrário pra continuar de pé.
   Mesma matemática do original: cada card guarda o scrollY do momento em que
   encosta na margem de topo (uma vez só), e daí em diante
   av = max(0, 1 - (scrollY - maxY)/10000) · scale = av · rotate = (1-av)*100.
   Sem framer-motion e sem Lenis (não há bundler aqui); o resto é igual. */
(function () {
  if (window.customElements && customElements.get('stack-scroll')) return;
  const VERT_MARGIN = 10; // vh, igual ao original

  class StackScroll extends HTMLElement {
    connectedCallback() {
      if (this._boot) return;
      this._boot = true;
      this.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8vh;position:relative;width:100%';
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.frame = this.frame.bind(this);
      this.io = new IntersectionObserver((e) => {
        this.visible = e[0].isIntersecting;
        if (this.visible) this.start();
      }, { rootMargin: '300px' });
      this.io.observe(this);
      requestAnimationFrame(() => this.start());
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      if (this.io) this.io.disconnect();
      this._boot = false;
    }

    get scrollY() {
      const el = document.scrollingElement || document.documentElement;
      return el.scrollTop || window.scrollY || 0;
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
      const cards = this.querySelectorAll(':scope > [data-scard]');
      if (!cards.length || this.reduced) return;
      const vh = window.innerHeight || 800;
      const sy = this.scrollY;
      const band = vh * (VERT_MARGIN / 100);
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (card._maxY == null) {
          // equivalente ao useInView({ margin: '0 0 -90% 0', once: true })
          if (card.getBoundingClientRect().top <= band + 1) card._maxY = sy;
          else continue;
        }
        const av = sy > card._maxY ? Math.max(0, 1 - (sy - card._maxY) / 10000) : 1;
        const rot = (1 - av) * 100;
        card.style.transform = 'scale(' + av.toFixed(4) + ') rotate(' + rot.toFixed(3) + 'deg)';
        const img = card.querySelector('[data-scard-img]');
        if (img) img.style.transform = 'rotate(' + (-rot).toFixed(3) + 'deg) scale(1.25)';
      }
    }
  }
  customElements.define('stack-scroll', StackScroll);
})();

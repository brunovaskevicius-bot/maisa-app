/* hover-expand — porte do skiper52 (HoverExpand_001, Skiper UI / @gurvinder-singh02).
   Fileira de painéis: o ativo abre, os outros viram tiras. Hover ou clique ativa.
   O movimento é transição CSS de width (o valor final fica no inline style e não
   volta atrás), no lugar do framer-motion — não há bundler aqui. */
(function () {
  if (window.customElements && customElements.get('hover-expand')) return;
  const OPEN = 480, SHUT = 96, H = 480;

  class HoverExpand extends HTMLElement {
    connectedCallback() {
      if (this._boot) return;
      this._boot = true;
      this.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%';
      this.panels = [].slice.call(this.querySelectorAll(':scope > [data-hx]'));
      this.panels.forEach((p, i) => {
        p.addEventListener('mouseenter', () => this.setActive(i));
        p.addEventListener('click', () => this.setActive(i));
        p.addEventListener('focus', () => this.setActive(i));
      });
      const start = parseInt(this.getAttribute('active') || '0', 10) || 0;
      this.setActive(start);
    }

    disconnectedCallback() { this._boot = false; }

    setActive(idx) {
      if (this.active === idx) return;
      this.active = idx;
      this.panels.forEach((p, i) => {
        const on = i === idx;
        p.style.width = (on ? OPEN : SHUT) + 'px';
        p.style.height = H + 'px';
        const scrim = p.querySelector('[data-hx-scrim]');
        const open = p.querySelector('[data-hx-open]');
        const vert = p.querySelector('[data-hx-vert]');
        if (scrim) scrim.style.opacity = on ? '1' : '0';
        if (open) { open.style.opacity = on ? '1' : '0'; open.style.transform = on ? 'none' : 'translateY(10px)'; }
        if (vert) vert.style.opacity = on ? '0' : '1';
      });
    }
  }
  customElements.define('hover-expand', HoverExpand);
})();

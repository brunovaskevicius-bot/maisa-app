/* ms-cta-button — porte do AnimatedGenerateButton (glow + letras piscando + sparkles)
   para web component, recolorido na paleta maisa: verde-900 de base, brilho âmbar,
   texto creme. O componente injeta o próprio CSS (pseudo-elementos e stagger não
   existem em style inline). Attrs: label, label-active, hue, href. */
(function () {
  if (window.customElements && customElements.get('ms-cta-button')) return;

  const SPARKLES = 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z';

  const CSS = `
ms-cta-button{display:inline-block;position:relative;z-index:1}
ms-cta-button .msc{--padding:4px;--radius:24px;--transition:.4s;
  --hl:hsl(var(--hue),92%,66%);--hl-80:hsla(var(--hue),92%,66%,.8);--hl-50:hsla(var(--hue),92%,66%,.5);
  --hl-30:hsla(var(--hue),92%,66%,.3);--hl-20:hsla(var(--hue),92%,66%,.2);
  position:relative;display:flex;align-items:center;justify-content:center;gap:10px;
  height:56px;padding:0 30px;border-radius:var(--radius);cursor:pointer;user-select:none;
  background:#0C2A1E;color:#FDFBF7;border:1px solid rgba(253,251,247,.16);
  font-family:'Figtree',ui-sans-serif,system-ui,sans-serif;font-size:17px;font-weight:600;letter-spacing:-.005em;
  box-shadow:inset 0 1px 1px rgba(255,255,255,.10),inset 0 2px 2px rgba(255,255,255,.07),
    inset 0 8px 8px rgba(255,255,255,.04),0 -2px 2px rgba(12,42,30,.05),0 -8px 8px rgba(12,42,30,.06),0 8px 20px rgba(12,42,30,.18);
  transition:box-shadow var(--transition),border-color var(--transition),background-color var(--transition)}
ms-cta-button .msc::before{content:"";position:absolute;top:calc(0px - var(--padding));left:calc(0px - var(--padding));
  width:calc(100% + var(--padding) * 2);height:calc(100% + var(--padding) * 2);
  border-radius:calc(var(--radius) + var(--padding));pointer-events:none;z-index:-1;
  background-image:linear-gradient(0deg,rgba(12,42,30,.28),rgba(12,42,30,.66));
  transition:box-shadow var(--transition),filter var(--transition);
  box-shadow:0 -8px 8px -6px transparent inset,0 -16px 16px -8px transparent inset,
    1px 1px 1px rgba(255,255,255,.12),2px 2px 2px rgba(255,255,255,.06),
    -1px -1px 1px rgba(12,42,30,.12),-2px -2px 2px rgba(12,42,30,.06)}
ms-cta-button .msc::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background-image:linear-gradient(0deg,#FDFBF7,var(--hl),var(--hl-50),8%,transparent);
  opacity:0;transition:opacity var(--transition),filter var(--transition);
  -webkit-mask-image:linear-gradient(0deg,#fff,transparent);mask-image:linear-gradient(0deg,#fff,transparent)}
ms-cta-button .msc-svg{width:22px;height:22px;flex:0 0 auto;fill:rgba(253,251,247,.82);
  filter:drop-shadow(0 0 2px rgba(253,251,247,.5));animation:msc-flicker 2s linear infinite .5s;
  transition:fill var(--transition),filter var(--transition)}
ms-cta-button .msc-txt{position:relative;display:flex;align-items:center}
ms-cta-button .msc-l{display:block;white-space:nowrap;transition:opacity .3s ease-in-out}
ms-cta-button .msc-l2{position:absolute;inset:0;opacity:0}
ms-cta-button .msc[data-on="1"] .msc-l1{opacity:0}
ms-cta-button .msc[data-on="1"] .msc-l2{opacity:1}
ms-cta-button .msc-c{display:inline-block;color:rgba(253,251,247,.72);
  animation:msc-letter 2s ease-in-out infinite;
  transition:color var(--transition),text-shadow var(--transition)}
@keyframes msc-letter{50%{text-shadow:0 0 3px rgba(255,255,255,.55);color:#fff}}
@keyframes msc-flicker{50%{opacity:.35}}
ms-cta-button .msc:hover{border-color:hsla(var(--hue),92%,74%,.45)}
ms-cta-button .msc:hover::before{box-shadow:0 -8px 8px -6px rgba(255,255,255,.55) inset,
  0 -16px 16px -8px var(--hl-30) inset,1px 1px 1px rgba(255,255,255,.14),2px 2px 2px rgba(255,255,255,.07),
  -1px -1px 1px rgba(12,42,30,.12),-2px -2px 2px rgba(12,42,30,.06)}
ms-cta-button .msc:hover::after{opacity:1}
ms-cta-button .msc:hover .msc-svg{fill:#fff;filter:drop-shadow(0 0 3px var(--hl)) drop-shadow(0 -4px 6px rgba(12,42,30,.5));animation:none}
ms-cta-button .msc:active{transform:translateY(1px);border-color:hsla(var(--hue),92%,78%,.7);background-color:#123D2C}
ms-cta-button .msc:active::after{opacity:1;filter:brightness(150%)}
ms-cta-button .msc:active .msc-c{text-shadow:0 0 1px hsla(var(--hue),92%,88%,.9);animation:none}
ms-cta-button .msc:focus-visible{outline:2px solid var(--hl);outline-offset:3px}
ms-cta-button .msc-c:nth-child(1){animation-delay:0s}
ms-cta-button .msc-c:nth-child(2){animation-delay:.06s}
ms-cta-button .msc-c:nth-child(3){animation-delay:.12s}
ms-cta-button .msc-c:nth-child(4){animation-delay:.18s}
ms-cta-button .msc-c:nth-child(5){animation-delay:.24s}
ms-cta-button .msc-c:nth-child(6){animation-delay:.3s}
ms-cta-button .msc-c:nth-child(7){animation-delay:.36s}
ms-cta-button .msc-c:nth-child(8){animation-delay:.42s}
ms-cta-button .msc-c:nth-child(9){animation-delay:.48s}
ms-cta-button .msc-c:nth-child(10){animation-delay:.54s}
ms-cta-button .msc-c:nth-child(11){animation-delay:.6s}
ms-cta-button .msc-c:nth-child(12){animation-delay:.66s}
ms-cta-button .msc-c:nth-child(13){animation-delay:.72s}
ms-cta-button .msc-c:nth-child(14){animation-delay:.78s}
ms-cta-button .msc-c:nth-child(15){animation-delay:.84s}
ms-cta-button .msc-c:nth-child(16){animation-delay:.9s}
ms-cta-button .msc-c:nth-child(17){animation-delay:.96s}
ms-cta-button .msc-c:nth-child(18){animation-delay:1.02s}
ms-cta-button .msc-c:nth-child(19){animation-delay:1.08s}
ms-cta-button .msc-c:nth-child(20){animation-delay:1.14s}
@media (prefers-reduced-motion:reduce){ms-cta-button .msc-c,ms-cta-button .msc-svg{animation:none}}
`;

  function inject() {
    if (document.getElementById('ms-cta-button-css')) return;
    const s = document.createElement('style');
    s.id = 'ms-cta-button-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const letters = (text) => Array.from(text).map((ch) => {
    const s = document.createElement('span');
    s.className = 'msc-c';
    s.textContent = ch === ' ' ? '\u00a0' : ch;
    return s;
  });

  class MsCtaButton extends HTMLElement {
    connectedCallback() {
      if (this._boot) return;
      this._boot = true;
      inject();
      this.btn = document.createElement('button');
      this.btn.type = 'button';
      this.btn.className = 'msc';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('class', 'msc-svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', SPARKLES);
      svg.appendChild(path);
      this.wrap = document.createElement('span');
      this.wrap.className = 'msc-txt';
      this.l1 = document.createElement('span');
      this.l1.className = 'msc-l msc-l1';
      this.l2 = document.createElement('span');
      this.l2.className = 'msc-l msc-l2';
      this.wrap.append(this.l1, this.l2);
      this.btn.append(svg, this.wrap);
      this.appendChild(this.btn);
      this.paint();
      this.btn.addEventListener('click', () => {
        this.btn.dataset.on = '1';
        clearTimeout(this.t);
        this.t = setTimeout(() => {
          this.btn.dataset.on = '0';
          const href = this.getAttribute('href');
          if (href) {
            const el = href.startsWith('#') && document.querySelector(href);
            if (el) el.scrollIntoView ? window.scrollTo({ top: el.getBoundingClientRect().top + (document.scrollingElement || document.documentElement).scrollTop - 24, behavior: 'smooth' }) : null;
            else window.location.href = href;
          }
        }, 1100);
      });
    }

    static get observedAttributes() { return ['label', 'label-active', 'hue']; }
    attributeChangedCallback() { if (this._boot) this.paint(); }

    paint() {
      const label = this.getAttribute('label') || 'Começar teste grátis';
      const active = this.getAttribute('label-active') || 'Abrindo';
      this.btn.style.setProperty('--hue', (this.getAttribute('hue') || '33') + 'deg');
      this.btn.setAttribute('aria-label', label);
      this.l1.replaceChildren(...letters(label));
      this.l2.replaceChildren(...letters(active));
    }
  }
  customElements.define('ms-cta-button', MsCtaButton);
})();

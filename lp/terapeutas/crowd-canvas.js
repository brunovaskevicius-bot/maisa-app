/* crowd-canvas — porte fiel do skiper39 (Canvas crowd, Skiper UI / @gurvinder-singh02)
   para web component, mantendo a lógica original: gsap.timeline por peep, resetPeep com
   offsetY em power2.in, crowd ordenada por anchorY, availablePeeps recicladas no onComplete.
   Adaptações: (1) web component em vez de React, (2) fator de escala pro sprite caber na
   faixa da hero (o original desenha no tamanho natural dentro de 90vh), (3) attr count.
   Atenção: como no original, `rows` divide a LARGURA e `cols` divide a ALTURA do sheet.
   Inspired by and adapted from https://codepen.io/zadvorsky/pen/xxwbBQV */
(function () {
  if (window.customElements && customElements.get('crowd-canvas')) return;

  const randomRange = (min, max) => min + Math.random() * (max - min);
  const randomIndex = (array) => randomRange(0, array.length) | 0;
  const removeFromArray = (array, i) => array.splice(i, 1)[0];
  const removeItemFromArray = (array, item) => removeFromArray(array, array.indexOf(item));
  const removeRandomFromArray = (array) => removeFromArray(array, randomIndex(array));
  const getRandomFromArray = (array) => array[randomIndex(array) | 0];

  class CrowdCanvas extends HTMLElement {
    connectedCallback() {
      if (this._boot) return;
      this._boot = true;
      this.style.cssText = 'display:block;position:relative;overflow:hidden;height:100%';

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'display:block;position:absolute;inset:0;width:100%;height:100%';
      this.appendChild(canvas);
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.rows = parseInt(this.getAttribute('rows') || '7', 10);
      this.cols = parseInt(this.getAttribute('cols') || '5', 10);
      this.limit = parseInt(this.getAttribute('count') || '0', 10) || 0;
      this.stage = { width: 0, height: 0 };
      this.allPeeps = [];
      this.availablePeeps = [];
      this.crowd = [];
      this.scale = 1;
      this.visible = true;
      this.render = this.render.bind(this);

      this.ro = new ResizeObserver(() => this.resize());
      this.io = new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; }, { rootMargin: '200px' });

      this.withGsap(() => {
        const img = document.createElement('img');
        img.onload = () => { this.img = img; this.init(); };
        img.src = this.getAttribute('src');
      });
    }

    disconnectedCallback() {
      if (window.gsap) window.gsap.ticker.remove(this.render);
      this.crowd.forEach((p) => { if (p.walk) p.walk.kill(); });
      if (this.ro) this.ro.disconnect();
      if (this.io) this.io.disconnect();
      this._boot = false;
    }

    static get observedAttributes() { return ['count']; }
    attributeChangedCallback(n, o, v) {
      if (!this._boot || o === v) return;
      this.limit = parseInt(v || '0', 10) || 0;
      if (this.img) this.resize();
    }

    withGsap(cb) {
      if (window.gsap) return cb();
      let n = 0;
      const t = setInterval(() => {
        if (window.gsap) { clearInterval(t); cb(); }
        else if (++n > 300) clearInterval(t);
      }, 40);
    }

    /* ——— peeps ——— */
    createPeep(image, rect) {
      const peep = {
        image, rect: [], width: 0, height: 0,
        x: 0, y: 0, anchorY: 0, scaleX: 1, walk: null,
        setRect: (r, s) => {
          peep.rect = r;
          peep.width = r[2] * s;
          peep.height = r[3] * s;
        },
        render: (ctx) => {
          ctx.save();
          ctx.translate(peep.x, peep.y);
          ctx.scale(peep.scaleX, 1);
          ctx.drawImage(peep.image, peep.rect[0], peep.rect[1], peep.rect[2], peep.rect[3], 0, 0, peep.width, peep.height);
          ctx.restore();
        }
      };
      peep.setRect(rect, this.scale);
      return peep;
    }

    createPeeps() {
      const { rows, cols } = this;
      const width = this.img.naturalWidth, height = this.img.naturalHeight;
      const total = rows * cols;
      const rectWidth = width / rows;
      const rectHeight = height / cols;
      this.rectHeight = rectHeight;
      for (let i = 0; i < total; i++) {
        this.allPeeps.push(this.createPeep(this.img, [
          (i % rows) * rectWidth,
          ((i / rows) | 0) * rectHeight,
          rectWidth,
          rectHeight
        ]));
      }
      for (let i = this.allPeeps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = this.allPeeps[i]; this.allPeeps[i] = this.allPeeps[j]; this.allPeeps[j] = t;
      }
    }

    resetPeep(peep) {
      const gsap = window.gsap;
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = (100 - 250 * gsap.parseEase('power2.in')(Math.random())) * this.scale;
      const startY = this.stage.height - peep.height + offsetY;
      let startX, endX;
      if (direction === 1) { startX = -peep.width; endX = this.stage.width; peep.scaleX = 1; }
      else { startX = this.stage.width + peep.width; endX = 0; peep.scaleX = -1; }
      peep.x = startX; peep.y = startY; peep.anchorY = startY;
      return { startX, startY, endX };
    }

    normalWalk(peep, props) {
      const gsap = window.gsap;
      const { startY, endX } = props;
      const xDuration = 10, yDuration = 0.25;
      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(peep, { duration: xDuration, x: endX, ease: 'none' }, 0);
      tl.to(peep, { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - 10 * this.scale }, 0);
      return tl;
    }

    addPeepToCrowd() {
      if (!this.availablePeeps.length) return null;
      const peep = removeRandomFromArray(this.availablePeeps);
      const walk = this.normalWalk(peep, this.resetPeep(peep)).eventCallback('onComplete', () => {
        this.removePeepFromCrowd(peep);
        this.addPeepToCrowd();
      });
      peep.walk = walk;
      this.crowd.push(peep);
      this.crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    }

    removePeepFromCrowd(peep) {
      removeItemFromArray(this.crowd, peep);
      this.availablePeeps.push(peep);
    }

    initCrowd() {
      while (this.availablePeeps.length) {
        const p = this.addPeepToCrowd();
        if (!p) break;
        p.walk.progress(Math.random());
      }
    }

    /* ——— stage ——— */
    resize() {
      if (!this.img || !this.ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const parent = this.parentElement;
      this.stage.width = this.clientWidth || (parent ? parent.clientWidth : 0) || 1;
      this.stage.height = this.clientHeight || (parent ? parent.clientHeight : 0) || 1;
      this.canvas.width = this.stage.width * dpr;
      this.canvas.height = this.stage.height * dpr;
      this.dpr = dpr;

      // resetPeep sobe o peep até 150*scale px; a escala tem que reservar essa folga,
      // senão a faixa corta cabeça (no original o canvas tem 90vh e isso nunca acontece).
      const fit = this.stage.height / (this.rectHeight + 150);
      this.scale = Math.max(0.25, Math.min(1, fit));

      this.crowd.forEach((p) => { if (p.walk) p.walk.kill(); });
      this.crowd.length = 0;
      this.availablePeeps.length = 0;
      const pool = this.limit ? this.allPeeps.slice(0, Math.min(this.limit, this.allPeeps.length)) : this.allPeeps;
      pool.forEach((p) => { p.setRect(p.rect, this.scale); this.availablePeeps.push(p); });
      this.initCrowd();
    }

    render() {
      if (!this.visible || !this.ctx) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.scale(this.dpr || 1, this.dpr || 1);
      this.crowd.forEach((peep) => peep.render(ctx));
      ctx.restore();
    }

    init() {
      this.createPeeps();
      this.resize();
      window.gsap.ticker.add(this.render);
      this.ro.observe(this);
      this.io.observe(this);
    }
  }
  customElements.define('crowd-canvas', CrowdCanvas);
})();

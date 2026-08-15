/* ═══════════════════════════════════════════════════════════
   Camada de movimento — Lenis + GSAP ScrollTrigger
   Abertura em canvas (sequência de frames ou foto única),
   revelações, parallax, íris e galeria horizontal fixada.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH   = matchMedia('(hover: none), (pointer: coarse)').matches;
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];

  let lenis = null, booted = false, ctx = null, canvas = null;
  let frames = [], frameCount = 0, currentIdx = -1, fallbackImg = null;
  const DPR = Math.min(devicePixelRatio || 1, 1.75);

  /* ——— canvas ——— */
  const sizeCanvas = () => {
    if (!canvas) return false;
    const w = Math.round(canvas.clientWidth * DPR), h = Math.round(canvas.clientHeight * DPR);
    if (!w || !h) return false;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  };
  const redraw = () => {
    sizeCanvas();
    if (frameCount > 0 && currentIdx >= 0) drawFrame(currentIdx); else drawImage(fallbackImg, lastZoom);
  };
  let lastZoom = 1;
  function drawImage(img, zoom = 1) {
    if (!img || !img.naturalWidth || !ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.fillStyle = '#160a0e';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) * 0.22, dw, dh);   // enquadra o rosto no terço superior
  }
  function drawFrame(i) {
    let j = Math.max(0, Math.min(frameCount - 1, i));
    while (j > 0 && !(frames[j] && frames[j].complete && frames[j].naturalWidth)) j--;
    const img = frames[j];
    if (img && img.complete && img.naturalWidth) { drawImage(img); currentIdx = i; }
  }
  const loadImg = (src) => new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(img);
    img.src = src;
  });

  /* ——— loader ——— */
  const RING = 326.7;
  function setPct(p) {
    const el = $('#loadPct'), ring = $('.li-ring');
    if (el) el.textContent = String(Math.round(p * 100)).padStart(2, '0');
    if (ring) ring.style.strokeDashoffset = String(RING * (1 - p));
  }
  function hideLoader() {
    document.body.classList.remove('is-loading');
    const l = $('#loader');
    if (l) { l.classList.add('is-done'); setTimeout(() => { l.style.display = 'none'; }, 1000); }
  }

  /* ——— preload ——— */
  async function preload(cfg) {
    const man = window.__FRAMES_MANIFEST__ || {};
    const count = REDUCED ? 0 : (+cfg.count || +man.count || 0);
    if (!count) {
      fallbackImg = await loadImg(cfg.poster || $('#film')?.dataset.poster || 'assets/angella-portrait.png');
      setPct(1);
      return false;
    }
    frameCount = count;
    const dir = cfg.dir || man.dir || 'assets/frames/';
    const pad = +cfg.pad || +man.pad || 4;
    const src = (i) => `${dir}${cfg.prefix || 'f-'}${String(i+1).padStart(pad,'0')}${cfg.ext || '.jpg'}`;
    frames = new Array(frameCount);
    let loaded = 0, next = 0, done;
    const ready = new Promise(r => done = r);
    const threshold = Math.min(40, frameCount);
    const worker = async () => {
      while (next < frameCount) {
        const i = next++;
        frames[i] = await loadImg(src(i));
        loaded++;
        setPct(loaded / frameCount);
        if (i === 0 && currentIdx < 0) drawFrame(0);
        if (loaded === threshold) done();
        if (currentIdx >= 0 && Math.abs(i - currentIdx) < 2) drawFrame(currentIdx);
      }
    };
    Promise.all(Array.from({length: 8}, worker)).then(done);
    await ready;
    return true;
  }

  /* ——— abertura ——— */
  function buildHero(hasFrames) {
    const hero = $('#hero');
    if (!hero || !canvas) return;
    hero.style.setProperty('--cine-h', hasFrames ? '620vh' : '300vh');
    sizeCanvas();
    if (hasFrames) drawFrame(0); else drawImage(fallbackImg, 1);
    requestAnimationFrame(() => { redraw(); requestAnimationFrame(redraw); });
    if (window.ResizeObserver) new ResizeObserver(redraw).observe(canvas);

    const atoEl = $('#hudAto'), pctEl = $('#hudPct');
    const romans = ['I','II','III','IV'];

    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate(self) {
        const p = self.progress;
        if (hasFrames) {
          const idx = Math.round(p * (frameCount - 1));
          if (idx !== currentIdx) drawFrame(idx);
        } else {
          lastZoom = 1 + p * 0.22;
          if (sizeCanvas()) { /* redimensionou */ }
          drawImage(fallbackImg, lastZoom);   // ken burns
        }
        if (atoEl) atoEl.textContent = romans[Math.min(3, Math.floor(p * 4))];
        if (pctEl) pctEl.textContent = String(Math.round(p * 100)).padStart(2,'0');
      }
    });

    if (REDUCED) return;
    const tl = gsap.timeline({defaults:{ease:'none'}, scrollTrigger:{trigger:hero, start:'top top', end:'bottom bottom', scrub:true}});
    tl.to('.ho-intro',  {opacity:0, y:-70, duration:.10}, .06)
      .fromTo('.ho-1', {opacity:0, y:70}, {opacity:1, y:0, duration:.07}, .19)
      .to('.ho-1',     {opacity:0, y:-70, duration:.07}, .33)
      .fromTo('.ho-2', {opacity:0, y:70}, {opacity:1, y:0, duration:.07}, .43)
      .to('.ho-2',     {opacity:0, y:-70, duration:.07}, .57)
      .fromTo('.ho-3', {opacity:0, scale:.93}, {opacity:1, scale:1, duration:.08}, .67)
      .to('.ho-3',     {opacity:0, scale:1.07, duration:.07}, .83)
      .to('.hero-hud', {opacity:0, duration:.05}, .93);
    gsap.to('.hud-scroll', {opacity:0, scrollTrigger:{trigger:hero, start:'2% top', end:'7% top', scrub:true}});
  }

  /* ——— revelações, íris e parallax ——— */
  function buildReveals() {
    const marks = [
      ['.section-head, .products-head, .booking-grid, .ig-profile', 'reveal'],
      ['.ig-post, .h-media', 'mask-in'],
      ['.spec-photo', 'zoom-in'],
    ];
    marks.forEach(([sel, cls]) => $$(sel).forEach(el => el.classList.add(cls)));

    const all = () => $$('.reveal, .mask-in, .zoom-in');
    if (REDUCED) { all().forEach(el => el.classList.add('visible')); return; }

    ScrollTrigger.batch('.reveal, .mask-in, .zoom-in', {
      start: 'top 90%',
      onEnter: b => b.forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 70)),
    });
    // rede de segurança: nada pode ficar invisível para sempre
    setTimeout(() => all().forEach(el => el.classList.add('visible')), 6000);

    // parallax (depende de scroll, então não esconde nada)
    $$('.ig-avatar-ring img, .product-img img').forEach(img => {
      gsap.fromTo(img, {yPercent:-6}, {yPercent:6, ease:'none',
        scrollTrigger:{trigger:img.closest('.ig-avatar-ring, .product-img') || img, start:'top bottom', end:'bottom top', scrub:true}});
    });
  }

  /* ——— galeria horizontal fixada ——— */
  let hAnim = null, hadFrames = false;
  function buildHorizontal() {
    const sec = $('.gal-h'), track = $('.h-track');
    if (!sec || !track) return;
    if (REDUCED || TOUCH) { track.classList.add('is-native'); return; }
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 80);
    if (dist() <= 0) return;
    hAnim = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: sec, start: 'top top', end: () => '+=' + dist(),
        scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      }
    });
    $$('.h-media img', track).forEach(img => {
      gsap.fromTo(img, {xPercent:-7}, {xPercent:7, ease:'none',
        scrollTrigger:{trigger: img.closest('.h-panel'), containerAnimation: hAnim, start:'left right', end:'right left', scrub:true}});
    });
  }

  /* ——— cursor ——— */
  function buildCursor() {
    if (TOUCH || REDUCED) return;
    const cur = $('.cursor'); if (!cur) return;
    cur.style.opacity = 1;
    const qx = gsap.quickTo(cur, 'x', {duration:.34, ease:'power3.out'});
    const qy = gsap.quickTo(cur, 'y', {duration:.34, ease:'power3.out'});
    addEventListener('mousemove', e => { qx(e.clientX); qy(e.clientY); });
    document.addEventListener('mouseover', e => {
      const view = e.target.closest('[data-cursor="view"], .masonry figure, .ig-post, .h-panel');
      const link = e.target.closest('a, button');
      cur.classList.toggle('is-view', !!view);
      cur.classList.toggle('is-link', !view && !!link);
    });
  }

  /* ——— nav sólida ——— */
  function buildChrome() {
    const nav = $('.nav');
    const on = (y) => nav && nav.classList.toggle('scrolled', y > 12);
    if (lenis) lenis.on('scroll', ({scroll}) => on(scroll));
    else addEventListener('scroll', () => on(scrollY), {passive:true});
  }

  /* ——— API pública ——— */
  const api = {
    async init(cfg = {}) {
      if (booted) return;
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') { hideLoader(); return; }
      booted = true;
      gsap.registerPlugin(ScrollTrigger);

      if (!REDUCED && typeof Lenis !== 'undefined') {
        lenis = new Lenis({lerp:.09, smoothWheel:true, syncTouch:false});
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(t => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
        lenis.stop();
      }
      canvas = $('#film');
      ctx = canvas ? canvas.getContext('2d', {alpha:false}) : null;
      addEventListener('resize', () => {
        redraw();
      });

      const safety = setTimeout(() => api.start(false), 12000);
      let hasFrames = false;
      try { hasFrames = await preload(cfg); } catch (e) { console.warn('frames', e); }
      clearTimeout(safety);
      hadFrames = hasFrames;
      api.start(hasFrames);
    },

    start(hasFrames) {
      if (api._started) return;
      api._started = true;
      buildHero(hasFrames);
      buildReveals();
      buildHorizontal();
      buildCursor();
      hideLoader();
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
    },

    // troca de página: desmonta os pins antes do React trocar o DOM, remonta depois
    reset() {
      if (!booted || typeof ScrollTrigger === 'undefined') return;
      ScrollTrigger.getAll().forEach(t => t.kill(true));
      if (hAnim) { hAnim.kill(); hAnim = null; }
    },
    build() {
      if (!booted || !api._started || typeof ScrollTrigger === 'undefined') return;
      canvas = $('#film');
      ctx = canvas ? canvas.getContext('2d', {alpha:false}) : null;
      if (canvas) { redraw(); buildHero(hadFrames); }
      buildReveals();
      buildHorizontal();
      ScrollTrigger.refresh();
    },

    // trava a rolagem quando uma gaveta/painel abre
    lock(on) {
      if (lenis) on ? lenis.stop() : lenis.start();
      document.documentElement.style.overflow = on ? 'hidden' : '';
    },
    scrollTo(el) {
      if (!el) return;
      if (lenis) lenis.scrollTo(el, {offset:-70, duration:1.4});
      else scrollTo({top: el.offsetTop - 70, behavior:'smooth'});
    },
    refresh() { if (booted && typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); },
    frames: () => ({count: frameCount, current: currentIdx, mode: frameCount ? 'frames' : 'estático'}),
  };

  window.Motion = api;
})();

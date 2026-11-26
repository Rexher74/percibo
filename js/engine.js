'use strict';
/* Motor: lienzo lógico de 800×500, entrada, temporizadores, audio y utilidades de dibujo. */

const W = 800, H = 500;
const C = {
  bg: '#0c1014', panel: '#11161c', ink: '#e6edf3',
  dim: 'rgba(230,237,243,.55)', faint: 'rgba(230,237,243,.16)', ghost: 'rgba(230,237,243,.07)',
  you: '#3fc6ff', truth: '#5ad690', bad: '#ff6b6b', warm: '#ffa94d',
};
const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const hsl = (h, s, l) => `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;

/* ---------- RNG determinista ---------- */
function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
class RNG {
  constructor(seed) {
    let a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0;
    this.next = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
}

/* ---------- Motor ---------- */
const E = {
  cv: null, g: null, hud: null, painter: null,
  listeners: [], timers: new Set(), rafs: new Set(), voices: new Set(), ac: null,

  init() {
    this.cv = $('#cv'); this.g = this.cv.getContext('2d'); this.hud = $('#hud');
    new ResizeObserver(() => this.resize()).observe(this.cv);
    document.addEventListener('pointerdown', () => this.audio(), { once: true });
  },
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.repaint();
  },
  /* Guarda la función de pintado actual para poder redibujar al redimensionar. */
  paint(fn) { this.painter = fn; this.repaint(); },
  repaint() {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height);
    g.setTransform(this.cv.width / W, 0, 0, this.cv.height / H, 0, 0);
    if (this.painter) { g.save(); this.painter(g); g.restore(); }
  },
  pt(e) { const r = this.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; },

  /* ---- ciclo de vida ---- */
  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    const rec = { target, type, fn, opts }; this.listeners.push(rec);
    return () => { target.removeEventListener(type, fn, opts); this.listeners = this.listeners.filter(r => r !== rec); };
  },
  cancelAll() {
    this.listeners.forEach(r => r.target.removeEventListener(r.type, r.fn, r.opts)); this.listeners = [];
    this.timers.forEach(clearTimeout); this.timers.clear();
    this.rafs.forEach(cancelAnimationFrame); this.rafs.clear();
    [...this.voices].forEach(v => v.stop());
    this.hud.innerHTML = '';
  },
  wait(ms) { return new Promise(res => { const id = setTimeout(() => { this.timers.delete(id); res(); }, ms); this.timers.add(id); }); },
  frame() { return new Promise(res => { const id = requestAnimationFrame(t => { this.rafs.delete(id); res(t); }); this.rafs.add(id); }); },
  /* Llama a fn(ms) en cada fotograma hasta que devuelva false. */
  async loop(fn) { const t0 = performance.now(); for (;;) { await this.frame(); if (fn(performance.now() - t0) === false) break; } },

  /* ---- entrada ---- */
  click(timeout) {
    return new Promise(res => {
      let tid = null;
      const off = this.on(this.cv, 'pointerdown', e => {
        if (e.button > 0) return; e.preventDefault(); off();
        if (tid) { clearTimeout(tid); this.timers.delete(tid); }
        res(this.pt(e));
      });
      if (timeout) { tid = setTimeout(() => { this.timers.delete(tid); off(); res(null); }, timeout); this.timers.add(tid); }
    });
  },
  /* Clic en el lienzo, espacio o Enter. Devuelve performance.now() o null si vence el plazo. */
  press(timeout) {
    return new Promise(res => {
      let tid = null, fin = false;
      const done = v => {
        if (fin) return; fin = true; offA(); offB();
        if (tid) { clearTimeout(tid); this.timers.delete(tid); }
        res(v);
      };
      const offA = this.on(this.cv, 'pointerdown', e => { if (e.button > 0) return; e.preventDefault(); done(performance.now()); });
      const offB = this.on(window, 'keydown', e => {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); done(performance.now()); }
      });
      if (timeout != null) { tid = setTimeout(() => { this.timers.delete(tid); done(null); }, Math.max(0, timeout)); this.timers.add(tid); }
    });
  },
  /* Mantener pulsado (ratón/dedo o barra espaciadora). Devuelve la duración en ms. */
  hold(onDown) {
    return new Promise(res => {
      let t0 = null, kind = null; const offs = [];
      const down = k => { if (t0 !== null) return; t0 = performance.now(); kind = k; onDown && onDown(); };
      const up = k => { if (t0 === null || k !== kind) return; const d = performance.now() - t0; offs.forEach(f => f()); res(d); };
      offs.push(this.on(this.cv, 'pointerdown', e => { if (e.button > 0) return; e.preventDefault(); try { this.cv.setPointerCapture(e.pointerId); } catch {} down('p'); }));
      offs.push(this.on(this.cv, 'pointerup', () => up('p')));
      offs.push(this.on(this.cv, 'pointercancel', () => up('p')));
      offs.push(this.on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) down('k'); } }));
      offs.push(this.on(window, 'keyup', e => { if (e.code === 'Space') { e.preventDefault(); up('k'); } }));
    });
  },
  /* Pulsar, deslizar y soltar. fn(p, fase) con fase = down | move | up. */
  drag(fn) {
    return new Promise(res => {
      let down = false; const offs = [];
      offs.push(this.on(this.cv, 'pointerdown', e => {
        if (e.button > 0) return; e.preventDefault(); down = true;
        try { this.cv.setPointerCapture(e.pointerId); } catch {}
        fn(this.pt(e), 'down');
      }));
      offs.push(this.on(this.cv, 'pointermove', e => { if (down) fn(this.pt(e), 'move'); }));
      const up = e => { if (!down) return; down = false; const p = this.pt(e); fn(p, 'up'); offs.forEach(f => f()); res(p); };
      offs.push(this.on(this.cv, 'pointerup', up));
      offs.push(this.on(this.cv, 'pointercancel', up));
    });
  },

  /* ---- HUD (capa HTML sobre el lienzo) ---- */
  add(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); const el = t.content.firstElementChild; this.hud.append(el); return el; },
  clearHud() { this.hud.innerHTML = ''; },
  chip(html) { this.hud.querySelectorAll('.chip').forEach(c => c.remove()); return this.add(`<div class="chip">${html}</div>`); },
  waitClick(el) { return new Promise(res => { el.addEventListener('click', () => res(), { once: true }); }); },
  choice(opts, cls = 'dock') {
    return new Promise(res => {
      const el = this.add(`<div class="${cls}"></div>`);
      let fin = false;
      const done = v => { if (fin) return; fin = true; offK(); el.remove(); res(v); };
      opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'btn ' + (o.cls || ''); b.innerHTML = o.label;
        b.addEventListener('click', () => done(o.value));
        el.append(b);
      });
      const offK = this.on(window, 'keydown', e => {
        if (e.repeat) return;
        const o = opts.find(o => o.key && (e.key === o.key || e.code === o.key));
        if (o) { e.preventDefault(); done(o.value); }
      });
    });
  },
  ask(label, cls = 'panel') {
    return new Promise(res => {
      const el = this.add(`<form class="${cls} ask"><label>${label}</label><input type="text" inputmode="decimal" autocomplete="off" aria-label="${label}"><button class="btn primary" type="submit">Enviar</button></form>`);
      const inp = $('input', el);
      setTimeout(() => inp.focus(), 30);
      el.addEventListener('submit', e => {
        e.preventDefault();
        const v = parseFloat(inp.value.replace(',', '.'));
        if (!isFinite(v)) { inp.classList.add('bad'); inp.focus(); return; }
        el.remove(); res(v);
      });
    });
  },

  /* ---- audio ---- */
  audio() {
    if (!this.ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; this.ac = new A(); }
    if (this.ac.state === 'suspended') this.ac.resume();
    return this.ac;
  },
  sustain(f, { type = 'triangle', vol = 0.22 } = {}) {
    const ac = this.audio(); if (!ac) return { set() {}, stop() {} };
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.value = f;
    gn.gain.setValueAtTime(0, ac.currentTime); gn.gain.linearRampToValueAtTime(vol, ac.currentTime + 0.03);
    o.connect(gn).connect(ac.destination); o.start();
    let stopped = false;
    const v = {
      set: f => o.frequency.setTargetAtTime(f, ac.currentTime, 0.01),
      stop: () => {
        if (stopped) return; stopped = true; this.voices.delete(v);
        const t = ac.currentTime; gn.gain.cancelScheduledValues(t); gn.gain.setValueAtTime(gn.gain.value, t);
        gn.gain.linearRampToValueAtTime(0, t + 0.05); o.stop(t + 0.07);
      },
    };
    this.voices.add(v); return v;
  },
  tone(f, ms, opts) { const v = this.sustain(f, opts); return this.wait(ms).then(() => v.stop()); },

  /* ---- dibujo ---- */
  fill(c) { this.g.fillStyle = c; this.g.fillRect(0, 0, W, H); },
  text(s, x, y, o = {}) {
    const g = this.g; g.save();
    g.font = `${o.weight || 400} ${o.size || 16}px ${o.font === 'sans' ? SANS : MONO}`;
    g.fillStyle = o.color || C.ink; g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
    g.fillText(s, x, y); g.restore();
  },
  hint(s) { if (s) this.text(s, 400, 24, { size: 13, color: C.dim }); },
  dot(x, y, r, c) { const g = this.g; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = c; g.fill(); },
  ring(x, y, r, c, w = 2, dash) { const g = this.g; g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.strokeStyle = c; g.lineWidth = w; if (dash) g.setLineDash(dash); g.stroke(); g.restore(); },
  line(x1, y1, x2, y2, c, w = 2, dash) {
    const g = this.g; g.save(); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; if (dash) g.setLineDash(dash); g.stroke(); g.restore();
  },
  rect(x, y, w, h, fill, stroke, lw = 2) { const g = this.g; if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeRect(x, y, w, h); } },
  poly(pts, fill, stroke, lw = 2, dash) {
    const g = this.g; g.save(); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; if (dash) g.setLineDash(dash); g.stroke(); }
    g.restore();
  },
  cross(x, y, s, c, w = 2) { this.line(x - s, y, x + s, y, c, w); this.line(x, y - s, x, y + s, c, w); },
  xmark(x, y, s, c, w = 3) { this.line(x - s, y - s, x + s, y + s, c, w); this.line(x - s, y + s, x + s, y - s, c, w); },
  arrow(x1, y1, x2, y2, c, w = 3) {
    this.line(x1, y1, x2, y2, c, w);
    const a = Math.atan2(y2 - y1, x2 - x1), s = 14;
    this.poly([{ x: x2, y: y2 }, { x: x2 - s * Math.cos(a - 0.45), y: y2 - s * Math.sin(a - 0.45) }, { x: x2 - s * Math.cos(a + 0.45), y: y2 - s * Math.sin(a + 0.45) }], c);
  },
  /* Muestra fn durante ~ms (sincronizado con los fotogramas). */
  async flash(fn, ms) {
    this.paint(fn); const t0 = performance.now();
    await this.frame();
    while (performance.now() - t0 < ms - 6) await this.frame();
  },
  /* Escalera adaptativa: baja el nivel al acertar, lo sube al fallar. Devuelve la media geométrica de los últimos 6 niveles. */
  async staircase({ n = 12, start, down = 0.72, up = 1 / 0.6, min, max, trial }) {
    let lv = start; const hist = [];
    for (let i = 0; i < n; i++) {
      const ok = await trial(lv, i); hist.push(lv);
      lv = clamp(ok ? lv * down : lv * up, min, max);
    }
    const last = hist.slice(-6);
    return Math.exp(last.reduce((s, v) => s + Math.log(v), 0) / last.length);
  },
  /* Superpone ✓ / ✗ al dibujo actual un instante. */
  async feedback(ok, y = 465, ms = 380) {
    const prev = this.painter;
    this.paint(() => { prev && prev(); this.text(ok ? '✓' : '✗', 400, y, { size: 26, weight: 700, color: ok ? C.truth : C.bad }); });
    await this.wait(ms);
  },
  async countdown() {
    for (const n of [3, 2, 1]) { this.paint(() => this.text(String(n), 400, 250, { size: 96, weight: 700, color: C.ink })); await this.wait(420); }
    this.paint(null); await this.wait(150);
  },

  /* Puntuación lineal: 100 si err ≤ good, 0 si err ≥ bad. */
  lin(err, good, bad) { return Math.round(100 * clamp((bad - err) / (bad - good), 0, 1)); },
};

function grade(s) { return s >= 95 ? 'S' : s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : s >= 40 ? 'D' : 'F'; }

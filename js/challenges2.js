'use strict';
/* Retos 21–50. Mismo contrato que challenges.js: run(E, rng) → { score, detail }. */

/* ---------- utilidades ---------- */
const DRAG_HINT = 'pulsa, desliza y suelta para fijar';
const LR = (a = 'izquierda', b = 'derecha') => [{ label: `← ${a}`, key: 'ArrowLeft', value: 'L' }, { label: `${b} →`, key: 'ArrowRight', value: 'R' }];
const ARROWS4 = [
  { label: '←', key: 'ArrowLeft', value: 180 }, { label: '↑', key: 'ArrowUp', value: -90 },
  { label: '↓', key: 'ArrowDown', value: 90 }, { label: '→', key: 'ArrowRight', value: 0 },
];
function inBox(p, x0 = 30, y0 = 45, x1 = W - 30, y1 = H - 30) { return p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1; }
function catmull(P, seg = 14) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
const polyLen = pts => pts.reduce((s, p, i) => i ? s + dist(p, pts[i - 1]) : 0, 0);
function path(pts, col, w = 3) {
  const g = E.g; g.save(); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
  g.strokeStyle = col; g.lineWidth = w; g.lineJoin = g.lineCap = 'round'; g.stroke(); g.restore();
}
function noiseMask(n = 160) {
  const L = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * TAU, l: 8 + Math.random() * 24 }));
  return () => L.forEach(o => E.line(o.x, o.y, o.x + Math.cos(o.a) * o.l, o.y + Math.sin(o.a) * o.l, 'rgba(230,237,243,.55)', 2.5));
}
/* Puntos sin solaparse dentro de una caja. */
function scatter(rng, n, rOf, box = [60, 60, 740, 450], gap = 8) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = rOf(i);
    for (let k = 0; k < 400; k++) {
      const p = { x: rng.range(box[0] + r, box[2] - r), y: rng.range(box[1] + r, box[3] - r), r };
      if (out.every(o => dist(o, p) > o.r + p.r + gap)) { out.push(p); break; }
    }
  }
  return out;
}
const sizeWord = (u, t) => `${pctOff(u, t)} ${u > t ? 'más grande' : 'más pequeño'}`;

/* ===================== 21. Pétalos (Ebbinghaus) ===================== */
def({
  id: 'ebbinghaus', emoji: '🌼', name: 'Pétalos',
  desc: 'Haz que el círculo central de la derecha sea igual de grande que el naranja de la izquierda. Los círculos de alrededor engañan. Pulsa, desliza desde el centro y suelta.',
  async run(E, rng) {
    const r0 = rng.range(22, 34), bigLeft = rng.next() < 0.5, L = { x: 215, y: 255 }, R = { x: 585, y: 255 };
    const ring = (c, big, rot) => {
      const n = big ? 6 : 10, rr = big ? r0 * 1.55 : r0 * 0.38, d = r0 + rr + (big ? 16 : 9);
      return Array.from({ length: n }, (_, i) => ({ x: c.x + Math.cos(rot + i / n * TAU) * d, y: c.y + Math.sin(rot + i / n * TAU) * d, r: rr }));
    };
    const S = [...ring(L, bigLeft, rng.range(0, 1)), ...ring(R, !bigLeft, rng.range(0, 1))];
    let r = r0 * (rng.next() < 0.5 ? rng.range(0.65, 0.8) : rng.range(1.2, 1.35));
    const draw = (hint, extra) => E.paint(() => {
      E.hint(hint); S.forEach(s => E.dot(s.x, s.y, s.r, '#56616c'));
      E.dot(L.x, L.y, r0, C.warm); E.dot(R.x, R.y, r, C.you); extra && extra();
    });
    draw(DRAG_HINT);
    await E.drag(p => { r = clamp(dist(p, R), 4, r0 * 2.4); draw(DRAG_HINT); });
    draw('', () => E.ring(R.x, R.y, r0, C.truth, 2, [4, 4]));
    return { score: E.lin(Math.abs(r / r0 - 1), 0.01, 0.25), detail: sizeWord(r, r0) };
  },
});

/* ===================== 22. Vías (Ponzo) ===================== */
def({
  id: 'ponzo', emoji: '🛤️', name: 'Vías',
  desc: 'Ajusta la barra azul para que mida exactamente lo mismo que la naranja. Las vías que convergen engañan. Pulsa, desliza y suelta.',
  async run(E, rng) {
    const L = rng.range(60, 100), adjTop = rng.next() < 0.5, yT = 150, yB = 390, cx = 400;
    let u = L * (rng.next() < 0.5 ? rng.range(0.65, 0.8) : rng.range(1.25, 1.4));
    const railX = (y, s) => cx + s * (28 + (y - 30) / 450 * 132);
    const scene = () => {
      for (let k = 0; k <= 14; k++) { const y = 48 + 432 * Math.pow(k / 14, 1.5); E.line(railX(y, -1) - 8, y, railX(y, 1) + 8, y, C.ghost, 3); }
      E.line(railX(48, -1), 48, railX(480, -1), 480, C.ink, 3); E.line(railX(48, 1), 48, railX(480, 1), 480, C.ink, 3);
    };
    const bar = (y, len, col) => E.rect(cx - len / 2, y - 6, len, 12, col);
    const draw = (hint, extra) => E.paint(() => { scene(); E.hint(hint); bar(adjTop ? yB : yT, L, C.warm); bar(adjTop ? yT : yB, u, C.you); extra && extra(); });
    draw(DRAG_HINT);
    await E.drag(p => { u = clamp(2 * Math.abs(p.x - cx), 8, 500); draw(DRAG_HINT); });
    const y = adjTop ? yT : yB;
    draw('', () => { E.line(cx - L / 2, y - 16, cx - L / 2, y + 16, C.truth, 2); E.line(cx + L / 2, y - 16, cx + L / 2, y + 16, C.truth, 2); });
    return { score: E.lin(Math.abs(u / L - 1), 0.01, 0.25), detail: `${pctOff(u, L)} ${u > L ? 'más larga' : 'más corta'}` };
  },
});

/* ===================== 23. Vertical ===================== */
def({
  id: 'vertical', emoji: '🗼', name: 'Vertical',
  desc: 'Una línea vertical se apoya sobre una horizontal. Ajusta la línea azul hasta que ambas midan exactamente lo mismo. Pulsa, desliza y suelta.',
  async run(E, rng) {
    const mode = rng.pick(['v', 'h']), L = rng.range(170, 290), yb = 420, x0 = 400 + rng.range(-70, 70);
    let u = L * (rng.next() < 0.5 ? rng.range(0.65, 0.8) : rng.range(1.2, 1.3));
    const hw = () => mode === 'h' ? u : L, vh = () => mode === 'v' ? u : L;
    const draw = (hint, extra) => E.paint(() => {
      E.hint(hint);
      E.line(x0 - hw() / 2, yb, x0 + hw() / 2, yb, mode === 'h' ? C.you : C.ink, 4);
      E.line(x0, yb, x0, yb - vh(), mode === 'v' ? C.you : C.ink, 4);
      extra && extra();
    });
    draw(DRAG_HINT);
    await E.drag(p => { u = mode === 'v' ? clamp(yb - p.y, 10, 400) : clamp(2 * Math.abs(p.x - x0), 10, 720); draw(DRAG_HINT); });
    draw('', () => mode === 'v' ? E.line(x0 + 22, yb, x0 + 22, yb - L, C.truth, 3, [5, 5]) : E.line(x0 - L / 2, yb + 22, x0 + L / 2, yb + 22, C.truth, 3, [5, 5]));
    return { score: E.lin(Math.abs(u / L - 1), 0.01, 0.25), detail: `${pctOff(u, L)} ${u > L ? 'más larga' : 'más corta'}` };
  },
});

/* ===================== 24. Jastrow ===================== */
def({
  id: 'jastrow', emoji: '🍌', name: 'Arcos',
  desc: 'Dos arcos apilados. Agranda o encoge el azul hasta que sea idéntico al naranja. Arrastra a izquierda o derecha y suelta para fijar.',
  async run(E, rng) {
    const k = rng.range(0.9, 1.08), R1 = 110 * k, R2 = 165 * k, half = 34 * D2R, mid = (R1 + R2) / 2;
    const adjTop = rng.next() < 0.5, top = { x: 400, y: 195 }, bot = { x: 400, y: 285 };
    let s = rng.next() < 0.5 ? rng.range(0.72, 0.85) : rng.range(1.15, 1.28);
    const arcShape = (M, sc, fill, stroke, dash) => {
      const g = E.g; g.save(); g.translate(M.x, M.y); g.scale(sc, sc);
      g.beginPath(); g.arc(0, mid, R2, -Math.PI / 2 - half, -Math.PI / 2 + half); g.arc(0, mid, R1, -Math.PI / 2 + half, -Math.PI / 2 - half, true); g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.lineWidth = 2.5 / sc; g.strokeStyle = stroke; if (dash) g.setLineDash(dash.map(d => d / sc)); g.stroke(); }
      g.restore();
    };
    const HT = 'arrastra ← → para cambiar el tamaño y suelta';
    const draw = (hint, extra) => E.paint(() => { E.hint(hint); arcShape(adjTop ? bot : top, 1, C.warm); arcShape(adjTop ? top : bot, s, C.you); extra && extra(); });
    draw(HT);
    let x0 = 0, s0 = s;
    await E.drag((p, ph) => { if (ph === 'down') { x0 = p.x; s0 = s; } s = clamp(s0 * Math.exp((p.x - x0) / 300), 0.55, 1.5); draw(HT); });
    draw('', () => arcShape(adjTop ? top : bot, 1, null, C.truth, [6, 5]));
    return { score: E.lin(Math.abs(s - 1), 0.01, 0.2), detail: sizeWord(s, 1) };
  },
});

/* ===================== 25. Espejo ===================== */
def({
  id: 'mirror', emoji: '🪞', name: 'Espejo',
  desc: 'La línea es un espejo. Haz clic exactamente donde se vería el reflejo del punto.',
  async run(E, rng) {
    let M, u, n, P, Q;
    for (let i = 0; i < 1000; i++) {
      let th = rng.range(15, 165); if (Math.abs(th - 90) < 12) th += 25;
      th *= D2R; M = { x: 400 + rng.range(-80, 80), y: 250 + rng.range(-50, 50) };
      u = { x: Math.cos(th), y: Math.sin(th) }; n = { x: -u.y, y: u.x };
      const t = rng.range(-180, 180), d = rng.sign() * rng.range(60, 170);
      P = { x: M.x + u.x * t + n.x * d, y: M.y + u.y * t + n.y * d }; Q = { x: M.x + u.x * t - n.x * d, y: M.y + u.y * t - n.y * d };
      if (inBox(P, 50, 60, 750, 450) && inBox(Q, 50, 60, 750, 450)) break;
    }
    const scene = () => { E.line(M.x - u.x * 900, M.y - u.y * 900, M.x + u.x * 900, M.y + u.y * 900, '#8fa1b3', 4); E.dot(P.x, P.y, 8, C.warm); };
    E.paint(() => { scene(); E.hint('haz clic donde está el reflejo'); });
    const c = await E.click(), e = dist(c, Q);
    E.paint(() => { scene(); E.line(P.x, P.y, Q.x, Q.y, C.truth, 1.5, [4, 5]); E.cross(Q.x, Q.y, 10, C.truth, 2.5); E.dot(c.x, c.y, 6, C.you); });
    return { score: E.lin(e, 3, 70), detail: `a ${Math.round(e)} px del reflejo` };
  },
});

/* ===================== 26. Cruce ===================== */
def({
  id: 'cross', emoji: '✖️', name: 'Cruce',
  desc: 'Si prolongaras los dos segmentos, se cruzarían en un punto. Haz clic justo ahí.',
  async run(E, rng) {
    let X, S;
    for (let i = 0; i < 2000; i++) {
      X = { x: rng.range(80, 720), y: rng.range(80, 420) };
      const a1 = rng.range(0, TAU), a2 = a1 + rng.sign() * rng.range(35, 145) * D2R;
      S = [a1, a2].map(a => { const d = { x: Math.cos(a), y: Math.sin(a) }, g = rng.range(110, 280), l = rng.range(70, 130); return [{ x: X.x + d.x * g, y: X.y + d.y * g }, { x: X.x + d.x * (g + l), y: X.y + d.y * (g + l) }]; });
      if (S.every(s => s.every(p => inBox(p, 20, 45, 780, 480)))) break;
    }
    const scene = () => S.forEach(([a, b]) => E.line(a.x, a.y, b.x, b.y, C.ink, 4));
    E.paint(() => { scene(); E.hint('haz clic donde se cruzarían'); });
    const c = await E.click(), e = dist(c, X);
    E.paint(() => { scene(); S.forEach(([a]) => E.line(a.x, a.y, X.x, X.y, C.truth, 1.5, [4, 5])); E.cross(X.x, X.y, 10, C.truth, 2.5); E.dot(c.x, c.y, 6, C.you); });
    return { score: E.lin(e, 3, 60), detail: `a ${Math.round(e)} px del cruce` };
  },
});

/* ===================== 27. Paralelogramo ===================== */
def({
  id: 'corner', emoji: '🔷', name: 'Esquina',
  desc: 'Tres puntos son esquinas de un paralelogramo. Haz clic donde va la cuarta: la opuesta al punto marcado con un anillo. 3 rondas.',
  async run(E, rng) {
    let sum = 0, esum = 0;
    for (let r = 0; r < 3; r++) {
      let A, B, Cc, D;
      for (let i = 0; i < 2000; i++) {
        B = { x: rng.range(150, 650), y: rng.range(120, 380) };
        const a1 = rng.range(0, TAU), a2 = a1 + rng.sign() * rng.range(40, 140) * D2R, l1 = rng.range(120, 230), l2 = rng.range(120, 230);
        A = { x: B.x + Math.cos(a1) * l1, y: B.y + Math.sin(a1) * l1 }; Cc = { x: B.x + Math.cos(a2) * l2, y: B.y + Math.sin(a2) * l2 };
        D = { x: A.x + Cc.x - B.x, y: A.y + Cc.y - B.y };
        if ([A, Cc, D].every(p => inBox(p, 50, 60, 750, 450))) break;
      }
      const scene = () => { E.hint(`ronda ${r + 1}/3`); [A, B, Cc].forEach(p => E.dot(p.x, p.y, 7, C.ink)); E.ring(B.x, B.y, 15, C.warm, 2.5); };
      E.paint(scene);
      const c = await E.click(), e = dist(c, D);
      sum += E.lin(e, 3, 60); esum += e;
      E.paint(() => { scene(); E.poly([A, B, Cc, D], null, C.truth, 1.5, [5, 5]); E.cross(D.x, D.y, 10, C.truth, 2.5); E.dot(c.x, c.y, 6, C.you); });
      await E.wait(900);
    }
    return { score: Math.round(sum / 3), detail: `error medio ${Math.round(esum / 3)} px` };
  },
});

/* ===================== 28. Alinear ===================== */
def({
  id: 'align', emoji: '🧵', name: 'Alinear',
  desc: 'Arrastra el punto azul hasta que quede exactamente en la recta invisible que une los dos puntos blancos.',
  async run(E, rng) {
    let A, B, u, D;
    for (let i = 0; i < 1000; i++) {
      const phi = rng.range(0, Math.PI); D = rng.range(420, 640); u = { x: Math.cos(phi), y: Math.sin(phi) };
      const c = { x: 400 + rng.range(-40, 40), y: 255 + rng.range(-30, 30) };
      A = { x: c.x - u.x * D / 2, y: c.y - u.y * D / 2 }; B = { x: c.x + u.x * D / 2, y: c.y + u.y * D / 2 };
      if (inBox(A, 40, 55, 760, 465) && inBox(B, 40, 55, 760, 465)) break;
    }
    const n = { x: -u.y, y: u.x }, t = rng.range(0.3, 0.7), base = { x: A.x + u.x * D * t, y: A.y + u.y * D * t };
    let off = rng.sign() * rng.range(25, 60), grab = 0;
    const P = () => ({ x: base.x + n.x * off, y: base.y + n.y * off });
    const HT = 'arrastra el punto azul y suelta';
    const draw = (hint, extra) => E.paint(() => {
      E.hint(hint); extra && extra();
      E.line(base.x - n.x * 90, base.y - n.y * 90, base.x + n.x * 90, base.y + n.y * 90, C.ghost, 2, [3, 6]);
      E.dot(A.x, A.y, 7, C.ink); E.dot(B.x, B.y, 7, C.ink); const p = P(); E.dot(p.x, p.y, 8, C.you);
    });
    draw(HT);
    await E.drag((p, ph) => { const o = (p.x - base.x) * n.x + (p.y - base.y) * n.y; if (ph === 'down') grab = o - off; off = clamp(o - grab, -150, 150); draw(HT); });
    draw('', () => E.line(A.x, A.y, B.x, B.y, C.truth, 1.5, [5, 5]));
    return { score: E.lin(Math.abs(off), 1, 25), detail: `desviado ${Math.abs(off).toFixed(1)} px` };
  },
});

/* ===================== 29. Vaso ===================== */
def({
  id: 'glass', emoji: '🥛', name: 'Vaso',
  desc: 'Es un vaso redondo, más ancho arriba que abajo. Arrastra el nivel del agua hasta llenar exactamente la fracción de su capacidad que se pide.',
  async run(E, rng) {
    const Hc = rng.range(250, 310), r0 = rng.range(32, 60), r1 = r0 * rng.range(1.6, 2.5), yb = 440, cx = 400;
    const [f, lab] = rng.pick([[1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']]);
    const rad = h => r0 + (r1 - r0) * h / Hc, V = h => Math.PI * h / 3 * (r0 * r0 + r0 * rad(h) + rad(h) ** 2);
    let lo = 0, hi = Hc; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (V(m) < f * V(Hc)) lo = m; else hi = m; }
    const hT = lo;
    let h = rng.next() < 0.5 ? rng.range(0.05, 0.3) * Hc : rng.range(0.8, 0.97) * Hc;
    const ell = (y, r, fill, stroke) => { const g = E.g; g.beginPath(); g.ellipse(cx, y, r, r * 0.16, 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
    const glass = () => {
      const y = yb - h, r = rad(h);
      if (h > 0) { E.poly([{ x: cx - r0, y: yb }, { x: cx + r0, y: yb }, { x: cx + r, y }, { x: cx - r, y }], 'rgba(63,198,255,.35)'); ell(yb, r0, 'rgba(63,198,255,.35)'); ell(y, r, 'rgba(63,198,255,.55)', C.you); }
      E.line(cx - r0, yb, cx - r1, yb - Hc, C.ink, 3); E.line(cx + r0, yb, cx + r1, yb - Hc, C.ink, 3);
      ell(yb - Hc, r1, null, C.ink); ell(yb, r0, null, C.ink);
    };
    const draw = (hint, extra) => E.paint(() => { E.hint(hint); E.text(`llénalo hasta ${lab} de su capacidad`, 400, 64, { size: 24, weight: 700, color: C.ink, font: 'sans' }); glass(); extra && extra(); });
    draw(DRAG_HINT);
    await E.drag(p => { h = clamp(yb - p.y, 0, Hc); draw(DRAG_HINT); });
    draw('', () => { const r = rad(hT); E.line(cx - r - 30, yb - hT, cx + r + 30, yb - hT, C.truth, 2.5, [6, 5]); });
    const frac = V(h) / V(Hc);
    return { score: E.lin(Math.abs(frac - f), 0.01, 0.2), detail: `lleno al ${Math.round(frac * 100)}% (objetivo ${Math.round(f * 100)}%)` };
  },
});

/* ===================== 30. Caminos ===================== */
def({
  id: 'paths', emoji: '〰️', name: 'Caminos',
  desc: 'Dos caminos sinuosos. ¿Cuál es más largo si los estiraras? Responde con los botones o con ← / →. 8 rondas, cada vez más igualadas.',
  async run(E, rng) {
    const ratios = [1.3, 1.24, 1.19, 1.15, 1.12, 1.09, 1.07, 1.05];
    const make = (cx, target) => {
      for (let i = 0; i < 400; i++) {
        const n = rng.int(4, 8), w = rng.range(120, 300), hgt = rng.range(150, 360);
        const xs = Array.from({ length: n }, () => rng.range(-w / 2, w / 2)).sort((a, b) => a - b);
        let pts = catmull(xs.map(x => ({ x, y: rng.range(-hgt / 2, hgt / 2) })));
        const k = target / polyLen(pts); pts = pts.map(p => ({ x: cx + p.x * k, y: 255 + p.y * k }));
        if (pts.every(p => p.x > cx - 175 && p.x < cx + 175 && p.y > 55 && p.y < 450)) return pts;
      }
      return null;
    };
    let hits = 0;
    for (let r = 0; r < 8; r++) {
      let A, B, leftLonger;
      do {
        const LA = rng.range(480, 760); leftLonger = rng.next() < 0.5;
        A = make(205, leftLonger ? LA : LA / ratios[r]); B = make(595, leftLonger ? LA / ratios[r] : LA);
      } while (!A || !B);
      const scene = () => { E.hint(`ronda ${r + 1}/8 · ¿cuál es más largo?`); path(A, C.ink); path(B, C.ink); E.line(400, 70, 400, 440, C.ghost, 1); };
      E.paint(scene);
      const ans = await E.choice(LR());
      const ok = (ans === 'L') === leftLonger; if (ok) hits++;
      E.paint(() => { scene(); E.text(`${Math.round(polyLen(A))} px`, 205, 470, { size: 13, color: leftLonger ? C.truth : C.dim }); E.text(`${Math.round(polyLen(B))} px`, 595, 470, { size: 13, color: leftLonger ? C.dim : C.truth }); });
      await E.feedback(ok, 470, 700);
    }
    return { score: Math.round(hits * 12.5), detail: `${hits}/8 aciertos` };
  },
});

/* ===================== 31. Promedio ===================== */
def({
  id: 'mean', emoji: '⚪', name: 'Promedio',
  desc: 'Verás varios círculos de distintos tamaños un momento. Después, ajusta un único círculo para que tenga su tamaño medio (diámetro medio).',
  async run(E, rng) {
    const n = rng.int(7, 11), set = scatter(rng, n, () => rng.range(10, 50));
    const m = set.reduce((s, c) => s + c.r, 0) / set.length;
    await E.countdown();
    E.paint(() => set.forEach(c => E.dot(c.x, c.y, c.r, C.ink)));
    await E.wait(1600); E.paint(null); await E.wait(400);
    const O = { x: 400, y: 260 };
    let r = m * (rng.next() < 0.5 ? rng.range(0.5, 0.7) : rng.range(1.4, 1.7));
    const draw = (hint, extra) => E.paint(() => { E.hint(hint); extra && extra(); E.dot(O.x, O.y, r, C.you); });
    draw(DRAG_HINT);
    await E.drag(p => { r = clamp(dist(p, O), 3, 120); draw(DRAG_HINT); });
    draw('', () => { set.forEach(c => E.ring(c.x, c.y, c.r, C.faint, 1)); });
    E.paint((prev => () => { prev(); E.ring(O.x, O.y, m, C.truth, 2.5, [5, 5]); })(E.painter));
    return { score: E.lin(Math.abs(r / m - 1), 0.02, 0.3), detail: sizeWord(r, m) };
  },
});

/* ===================== 32. Redondo ===================== */
def({
  id: 'round', emoji: '🥚', name: 'Redondo',
  desc: 'Entre estas figuras solo una es un círculo perfecto; las demás están ligeramente achatadas. Haz clic en el círculo. 8 rondas.',
  async run(E, rng) {
    const ds = [0.22, 0.17, 0.13, 0.1, 0.08, 0.065, 0.05, 0.04];
    let hits = 0;
    for (let r = 0; r < 8; r++) {
      const cells = rng.shuffle([0, 1, 2, 3, 4, 5]), good = rng.int(0, 5);
      const S = cells.map((c, i) => {
        const rr = rng.range(32, 52), d = i === good ? 0 : ds[r] * rng.range(0.9, 1.1);
        return { x: 160 + (c % 3) * 240 + rng.range(-25, 25), y: 160 + Math.floor(c / 3) * 180 + rng.range(-15, 15), a: rr * (1 + d / 2), b: rr * (1 - d / 2), rot: rng.range(0, Math.PI) };
      });
      const scene = (mark) => {
        E.hint(`ronda ${r + 1}/8 · ¿cuál es un círculo perfecto?`);
        S.forEach((s, i) => { const g = E.g; g.beginPath(); g.ellipse(s.x, s.y, s.a, s.b, s.rot, 0, TAU); g.strokeStyle = mark && i === good ? C.truth : C.ink; g.lineWidth = 3; g.stroke(); });
      };
      E.paint(() => scene(false));
      const p = await E.click();
      const pick = S.reduce((m, s, i) => dist(s, p) < dist(S[m], p) ? i : m, 0), ok = pick === good;
      if (ok) hits++;
      E.paint(() => scene(true));
      await E.feedback(ok, 470, 650);
    }
    return { score: Math.round(hits * 12.5), detail: `${hits}/8 aciertos` };
  },
});

/* ===================== 33. Agudeza (Landolt C) ===================== */
def({
  id: 'acuity', emoji: '👓', name: 'Agudeza',
  desc: 'Aparecerá un anillo con una abertura, cada vez más pequeño si aciertas. Indica hacia dónde mira la abertura con las flechas. 14 ensayos.',
  async run(E, rng) {
    const landolt = (x, y, g, ang) => {
      const c = E.g, ha = Math.asin(0.25), a = ang * D2R;
      c.save(); c.beginPath(); c.arc(x, y, 2 * g, a + ha, a + TAU - ha); c.lineWidth = g; c.strokeStyle = C.ink; c.lineCap = 'butt'; c.stroke(); c.restore();
    };
    const thr = await E.staircase({
      n: 14, start: 8, min: 0.25, max: 24,
      trial: async (g, i) => {
        const ang = rng.pick([0, 90, 180, -90]), hint = `ensayo ${i + 1}/14`;
        E.paint(() => { E.hint(hint); E.cross(400, 250, 5, C.faint, 1); }); await E.wait(400);
        await E.flash(() => { E.hint(hint); landolt(400, 250, g, ang); }, 550);
        E.paint(() => E.hint('¿hacia dónde está la abertura?'));
        const ok = (await E.choice(ARROWS4, 'dock arrows')) === ang;
        await E.feedback(ok, 250);
        return ok;
      },
    });
    return { score: E.lin(Math.log2(thr), Math.log2(0.7), Math.log2(6)), detail: `abertura mínima ≈ ${thr.toFixed(2)} px` };
  },
});

/* ===================== 34. Niebla (contraste) ===================== */
def({
  id: 'contrast', emoji: '🌫️', name: 'Niebla',
  desc: 'Aparecerán unas rayas difuminadas, cada vez más tenues si aciertas. ¿Están inclinadas hacia la izquierda (╲) o hacia la derecha (╱)? 14 ensayos.',
  async run(E, rng) {
    const S = 260, gabor = (c, ang) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = S;
      const ctx = cv.getContext('2d'), im = ctx.createImageData(S, S), sig = S / 6, a = ang * D2R, ca = Math.cos(a), sa = Math.sin(a);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = x - S / 2, dy = y - S / 2, env = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
        const v = Math.round(clamp(128 + 127 * c * env * Math.sin((dx * ca + dy * sa) * TAU / 18) + Math.random() - 0.5, 0, 255)), k = (y * S + x) * 4;
        im.data[k] = im.data[k + 1] = im.data[k + 2] = v; im.data[k + 3] = 255;
      }
      ctx.putImageData(im, 0, 0); return cv;
    };
    const bg = () => E.fill('rgb(128,128,128)');
    const thr = await E.staircase({
      n: 14, start: 0.3, min: 0.004, max: 0.6,
      trial: async (c, i) => {
        const right = rng.next() < 0.5, img = gabor(c, right ? 45 : -45), hint = `ensayo ${i + 1}/14`;
        E.paint(() => { bg(); E.text(hint, 400, 24, { size: 13, color: '#333' }); E.cross(400, 250, 5, '#666', 1); }); await E.wait(400);
        await E.flash(() => { bg(); E.text(hint, 400, 24, { size: 13, color: '#333' }); E.g.drawImage(img, 400 - S / 2, 250 - S / 2); }, 600);
        E.paint(() => { bg(); E.text('¿hacia dónde se inclinan?', 400, 24, { size: 13, color: '#333' }); });
        const ok = (await E.choice([{ label: '← ╲', key: 'ArrowLeft', value: false }, { label: '╱ →', key: 'ArrowRight', value: true }])) === right;
        await E.feedback(ok, 250);
        return ok;
      },
    });
    return { score: E.lin(Math.log10(thr), Math.log10(0.008), Math.log10(0.15)), detail: `contraste mínimo ≈ ${(thr * 100).toFixed(1)}%` };
  },
});

/* ===================== 35. Vernier ===================== */
def({
  id: 'vernier', emoji: '🔬', name: 'Vernier',
  desc: 'Dos líneas verticales, una encima de otra. ¿La de abajo está desplazada a la izquierda o a la derecha? El desplazamiento se reduce al acertar. 14 ensayos.',
  async run(E, rng) {
    const thr = await E.staircase({
      n: 14, start: 6, min: 0.1, max: 20,
      trial: async (d, i) => {
        const side = rng.sign(), x = 400 + rng.range(-40, 40), hint = `ensayo ${i + 1}/14`;
        E.paint(() => E.hint(hint)); await E.wait(350);
        await E.flash(() => { E.hint(hint); E.line(x, 140, x, 238, C.ink, 2); E.line(x + side * d, 262, x + side * d, 360, C.ink, 2); }, 450);
        E.paint(() => E.hint('¿hacia dónde está desplazada la de abajo?'));
        const ok = (await E.choice(LR())) === (side < 0 ? 'L' : 'R');
        await E.feedback(ok, 250);
        return ok;
      },
    });
    return { score: E.lin(Math.log2(thr), Math.log2(0.3), Math.log2(4)), detail: `desplazamiento mínimo ≈ ${thr.toFixed(2)} px` };
  },
});

/* ===================== 36. Vistazo ===================== */
def({
  id: 'glance', emoji: '📸', name: 'Vistazo',
  desc: 'Una figura con dos patas aparecerá un instante, cada vez más breve. ¿Qué pata era más larga? 10 rondas.',
  async run(E, rng) {
    const durs = [200, 150, 120, 100, 80, 65, 50, 40, 33, 25];
    let hits = 0, best = null;
    for (let r = 0; r < 10; r++) {
      const longLeft = rng.next() < 0.5, x = 400 + rng.range(-30, 30), y = 170, w = 46;
      E.paint(() => { E.hint(`ronda ${r + 1}/10`); E.cross(400, 250, 6, C.dim); }); await E.wait(600);
      await E.flash(() => {
        E.line(x - w, y, x + w, y, C.ink, 4);
        E.line(x - w, y, x - w, y + (longLeft ? 170 : 120), C.ink, 4); E.line(x + w, y, x + w, y + (longLeft ? 120 : 170), C.ink, 4);
      }, durs[r]);
      E.paint(() => {
        E.line(x - w - 10, y, x + w + 10, y, C.ink, 10);
        for (const s of [-1, 1]) { const px = x + s * w; E.poly([{ x: px - 7, y }, { x: px + 7, y }, { x: px + 12, y: y + 90 }, { x: px - 2, y: y + 100 }, { x: px + 8, y: y + 200 }, { x: px - 10, y: y + 200 }, { x: px - 14, y: y + 95 }], C.ink); }
      });
      await E.wait(400);
      E.paint(() => E.hint(`ronda ${r + 1}/10 · ¿qué pata era más larga?`));
      const ok = (await E.choice(LR())) === (longLeft ? 'L' : 'R');
      if (ok) { hits++; best = durs[r]; }
      E.paint(() => E.text(`${durs[r]} ms`, 400, 250, { size: 18, color: C.dim }));
      await E.feedback(ok, 300, 450);
    }
    return { score: hits * 10, detail: `${hits}/10${best ? ` · acertaste hasta ${best} ms` : ''}` };
  },
});

/* ===================== 37. Orden ===================== */
def({
  id: 'order', emoji: '🚦', name: 'Orden',
  desc: 'Dos luces se encienden casi a la vez. ¿Cuál se encendió primero? La diferencia se reduce en cada ronda. 10 rondas.',
  async run(E, rng) {
    const soas = [110, 90, 70, 55, 45, 36, 28, 22, 17, 13];
    let hits = 0;
    for (let r = 0; r < 10; r++) {
      const leftFirst = rng.next() < 0.5, soa = soas[r], Lp = { x: 250, y: 250 }, Rp = { x: 550, y: 250 };
      const base = () => { E.hint(`ronda ${r + 1}/10`); E.cross(400, 250, 6, C.dim); E.ring(Lp.x, Lp.y, 22, C.faint, 1.5); E.ring(Rp.x, Rp.y, 22, C.faint, 1.5); };
      E.paint(base); await E.wait(rng.range(600, 1100));
      await E.loop(ms => {
        const first = leftFirst ? Lp : Rp, second = leftFirst ? Rp : Lp;
        E.paint(() => { base(); E.dot(first.x, first.y, 20, C.ink); if (ms >= soa) E.dot(second.x, second.y, 20, C.ink); });
        return ms < soa + 180;
      });
      E.paint(() => { E.hint(`ronda ${r + 1}/10 · ¿cuál se encendió primero?`); E.cross(400, 250, 6, C.dim); E.ring(Lp.x, Lp.y, 22, C.faint, 1.5); E.ring(Rp.x, Rp.y, 22, C.faint, 1.5); });
      const ok = (await E.choice(LR())) === (leftFirst ? 'L' : 'R'); if (ok) hits++;
      await E.feedback(ok, 330, 450);
    }
    return { score: hits * 10, detail: `${hits}/10 aciertos` };
  },
});

/* ===================== 38. Agudo (audio) ===================== */
def({
  id: 'pitchdiff', emoji: '🎶', name: 'Agudo',
  desc: 'Necesitas sonido. Oirás dos notas seguidas: ¿la segunda es más aguda o más grave? Se van pareciendo más al acertar. 12 ensayos.',
  async run(E, rng) {
    if (!E.audio()) return { score: 0, detail: 'audio no disponible' };
    const show = (t, col = C.ink) => E.paint(() => E.text(t, 400, 230, { size: 64, color: col, font: 'sans' }));
    const thr = await E.staircase({
      n: 12, start: 80, min: 1.5, max: 300,
      trial: async (c, i) => {
        const f = rng.range(300, 650), up = rng.next() < 0.5, f2 = f * Math.pow(2, (up ? c : -c) / 1200);
        E.paint(() => E.hint(`ensayo ${i + 1}/12`)); await E.wait(350);
        show('♪ 1'); await E.tone(f, 420); show(''); await E.wait(280);
        show('♪ 2'); await E.tone(f2, 420);
        E.paint(() => E.hint('¿la segunda nota es…?'));
        const ok = (await E.choice([{ label: '↓ más grave', key: 'ArrowDown', value: false }, { label: 'más aguda ↑', key: 'ArrowUp', value: true }])) === up;
        await E.feedback(ok, 250);
        return ok;
      },
    });
    return { score: E.lin(Math.log2(thr), Math.log2(4), Math.log2(80)), detail: `diferencia mínima ≈ ${Math.round(thr)} cents` };
  },
});

/* ===================== 39. Volumen (audio) ===================== */
def({
  id: 'loud', emoji: '🔊', name: 'Volumen',
  desc: 'Necesitas sonido. Oirás dos pitidos iguales salvo en el volumen: ¿el segundo suena más fuerte o más flojo? 12 ensayos.',
  async run(E, rng) {
    if (!E.audio()) return { score: 0, detail: 'audio no disponible' };
    const show = t => E.paint(() => E.text(t, 400, 230, { size: 64, color: C.ink, font: 'sans' }));
    const thr = await E.staircase({
      n: 12, start: 6, min: 0.2, max: 12,
      trial: async (db, i) => {
        const base = 0.14 * Math.pow(10, rng.range(-4, 2) / 20), louder = rng.next() < 0.5, v2 = base * Math.pow(10, (louder ? db : -db) / 20), f = rng.range(420, 620);
        E.paint(() => E.hint(`ensayo ${i + 1}/12`)); await E.wait(350);
        show('🔈 1'); await E.tone(f, 450, { type: 'sine', vol: base }); show(''); await E.wait(300);
        show('🔈 2'); await E.tone(f, 450, { type: 'sine', vol: v2 });
        E.paint(() => E.hint('¿el segundo pitido suena…?'));
        const ok = (await E.choice([{ label: '↓ más flojo', key: 'ArrowDown', value: false }, { label: 'más fuerte ↑', key: 'ArrowUp', value: true }])) === louder;
        await E.feedback(ok, 250);
        return ok;
      },
    });
    return { score: E.lin(Math.log2(thr), Math.log2(0.7), Math.log2(6)), detail: `diferencia mínima ≈ ${thr.toFixed(1)} dB` };
  },
});

/* ===================== 40. Búsqueda ===================== */
def({
  id: 'search', emoji: '🧩', name: 'Búsqueda',
  desc: 'Entre muchas eles hay una sola T (puede estar girada). Haz clic en ella lo antes posible. 5 rondas.',
  async run(E, rng) {
    const glyph = (x, y, rot, isT) => {
      const g = E.g; g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = C.ink; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath();
      if (isT) { g.moveTo(-12, -12); g.lineTo(12, -12); g.moveTo(0, -12); g.lineTo(0, 12); }
      else { g.moveTo(-12, 12); g.lineTo(12, 12); g.moveTo(-8, -12); g.lineTo(-8, 12); }
      g.stroke(); g.restore();
    };
    let total = 0, hits = 0;
    for (let r = 0; r < 5; r++) {
      const n = 14 + r * 6, cells = rng.shuffle([...Array(40).keys()]).slice(0, n), t = rng.int(0, n - 1);
      const items = cells.map(c => ({ x: 70 + (c % 8) * 94 + rng.range(-16, 16), y: 85 + Math.floor(c / 8) * 85 + rng.range(-12, 12), rot: rng.int(0, 3) * Math.PI / 2 }));
      const scene = () => { E.hint(`ronda ${r + 1}/5 · encuentra la T`); items.forEach((o, i) => glyph(o.x, o.y, o.rot, i === t)); };
      E.paint(scene);
      const t0 = performance.now(), p = await E.click(15000), ms = performance.now() - t0;
      const ok = !!p && dist(p, items[t]) < 32;
      if (ok) { hits++; total += 20 * clamp(1 - (ms - 1500) / 12000, 0.3, 1); }
      E.paint(() => { scene(); E.ring(items[t].x, items[t].y, 26, C.truth, 3); if (p && !ok) E.xmark(p.x, p.y, 9, C.bad); E.text(ok ? `✓ ${(ms / 1000).toFixed(1)} s` : p ? '✗' : 'tiempo agotado', 400, 475, { size: 16, color: ok ? C.truth : C.bad }); });
      await E.wait(900);
    }
    return { score: Math.round(total), detail: `${hits}/5 aciertos` };
  },
});

/* ===================== 41. Vigila (seguimiento múltiple) ===================== */
def({
  id: 'mot', emoji: '🕵️', name: 'Vigila',
  desc: 'Algunas bolas se marcarán en azul. Después todas se vuelven iguales y se mueven. Síguelas con la vista y, cuando paren, haz clic en las que eran azules. 2 rondas.',
  async run(E, rng) {
    let good = 0, tot = 0;
    for (const [r, cfg] of [{ n: 8, k: 3 }, { n: 10, k: 4 }].entries()) {
      const R = 15, B = scatter(rng, cfg.n, () => R, [40, 50, 760, 465], 12).map(b => { const a = rng.range(0, TAU); return { ...b, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 }; });
      const T = new Set(rng.shuffle([...B.keys()]).slice(0, cfg.k));
      const draw = (hint, col) => E.paint(() => { E.hint(hint); B.forEach((b, i) => E.dot(b.x, b.y, R, col(i))); });
      draw(`ronda ${r + 1}/2 · memoriza las azules`, i => T.has(i) ? C.you : C.ink); await E.wait(2200);
      let last = 0;
      await E.loop(ms => {
        const dt = Math.min(40, ms - last) / 1000; last = ms;
        for (const b of B) {
          const a = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 0.25; b.vx = Math.cos(a) * 160; b.vy = Math.sin(a) * 160;
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 40 + R || b.x > 760 - R) { b.vx = -b.vx; b.x = clamp(b.x, 40 + R, 760 - R); }
          if (b.y < 45 + R || b.y > 470 - R) { b.vy = -b.vy; b.y = clamp(b.y, 45 + R, 470 - R); }
        }
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
          const a = B[i], b = B[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 2 * R && d > 0) { const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rel > 0) { a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny; } }
        }
        draw('síguelas…', () => C.ink);
        return ms < 6500;
      });
      const sel = new Set();
      const pickHint = () => `haz clic en las ${cfg.k} que eran azules`;
      draw(pickHint(), () => C.ink);
      while (sel.size < cfg.k) {
        const p = await E.click();
        const i = B.reduce((m, b, k) => dist(b, p) < dist(B[m], p) ? k : m, 0);
        if (dist(B[i], p) > R * 2) continue;
        sel.has(i) ? sel.delete(i) : sel.add(i);
        E.paint(() => { E.hint(pickHint()); B.forEach((b, k) => { E.dot(b.x, b.y, R, C.ink); if (sel.has(k)) E.ring(b.x, b.y, R + 6, C.you, 3); }); });
      }
      const hit = [...sel].filter(i => T.has(i)).length; good += hit; tot += cfg.k;
      E.paint(() => { E.hint(`${hit}/${cfg.k} correctas`); B.forEach((b, k) => { E.dot(b.x, b.y, R, T.has(k) ? C.truth : C.ink); if (sel.has(k) && !T.has(k)) E.ring(b.x, b.y, R + 6, C.bad, 3); }); });
      await E.wait(1300);
    }
    return { score: Math.round(good / tot * 100), detail: `${good}/${tot} bolas seguidas` };
  },
});

/* ===================== 42. Stroop ===================== */
def({
  id: 'stroop', emoji: '🎭', name: 'Stroop',
  desc: 'Aparecerá el nombre de un color escrito con tinta de otro color. Elige el color de la TINTA, no lo que dice la palabra (teclas 1–4). 12 rondas, rápido.',
  async run(E, rng) {
    const cols = [['ROJO', '#ff5a5a'], ['VERDE', '#4cd07d'], ['AZUL', '#4aa8ff'], ['AMARILLO', '#ffd84a']];
    const opts = cols.map(([, c], i) => ({ label: `<span class="sw" style="background:${c}"></span>${i + 1}`, key: String(i + 1), value: i }));
    let total = 0, hits = 0, tsum = 0;
    for (let r = 0; r < 12; r++) {
      const w = rng.int(0, 3), ink = rng.next() < 0.75 ? rng.pick([0, 1, 2, 3].filter(k => k !== w)) : w;
      E.paint(() => { E.hint(`ronda ${r + 1}/12`); E.cross(400, 220, 6, C.dim); }); await E.wait(rng.range(350, 650));
      E.paint(() => { E.hint(`ronda ${r + 1}/12 · ¿de qué color es la tinta?`); E.text(cols[w][0], 400, 220, { size: 64, weight: 800, color: cols[ink][1] }); });
      const t0 = performance.now(), ans = await E.choice(opts), t = performance.now() - t0; tsum += t;
      const ok = ans === ink; if (ok) { hits++; total += 100 / 12 * clamp(1 - (t - 900) / 2600, 0.3, 1); }
      await E.feedback(ok, 330, 300);
    }
    return { score: Math.round(total), detail: `${hits}/12 · ${(tsum / 12000).toFixed(2)} s de media` };
  },
});

/* ===================== 43. Flancos ===================== */
def({
  id: 'flanker', emoji: '➡️', name: 'Flancos',
  desc: 'Verás cinco flechas en fila. Indica hacia dónde apunta la del CENTRO (← / →), ignorando las de los lados. 16 rondas, rápido.',
  async run(E, rng) {
    let total = 0, hits = 0, tsum = 0;
    for (let r = 0; r < 16; r++) {
      const dir = rng.sign(), cong = rng.next() < 0.5, y = 230 + rng.range(-40, 40);
      E.paint(() => { E.hint(`ronda ${r + 1}/16`); E.cross(400, 230, 6, C.dim); }); await E.wait(rng.range(350, 700));
      E.paint(() => {
        E.hint(`ronda ${r + 1}/16`);
        for (let k = -2; k <= 2; k++) { const d = k === 0 || cong ? dir : -dir, x = 400 + k * 72; E.arrow(x - d * 24, y, x + d * 24, y, C.ink, 5); }
      });
      const t0 = performance.now(), ans = await E.choice(LR('', '')), t = performance.now() - t0; tsum += t;
      const ok = (ans === 'R') === (dir > 0); if (ok) { hits++; total += 100 / 16 * clamp(1 - (t - 500) / 1500, 0.3, 1); }
      await E.feedback(ok, 330, 250);
    }
    return { score: Math.round(total), detail: `${hits}/16 · ${Math.round(tsum / 16)} ms de media` };
  },
});

/* ===================== 44. Periferia ===================== */
def({
  id: 'periphery', emoji: '🌐', name: 'Periferia',
  desc: 'Mira al centro. Durante un instante verás una figura central (▲ o ■) y una estrella en el borde. Di qué figura había en el centro y luego haz clic donde estaba la estrella. 8 rondas.',
  async run(E, rng) {
    const durs = [240, 200, 170, 140, 120, 100, 85, 70], pos = Array.from({ length: 8 }, (_, k) => ({ x: 400 + Math.cos(k * TAU / 8) * 300, y: 250 + Math.sin(k * TAU / 8) * 185 }));
    let total = 0, both = 0;
    const centre = tri => tri ? E.poly([{ x: 400, y: 234 }, { x: 416, y: 262 }, { x: 384, y: 262 }], C.ink) : E.rect(386, 236, 28, 28, C.ink);
    for (let r = 0; r < 8; r++) {
      const tri = rng.next() < 0.5, t = rng.int(0, 7), distract = r >= 3;
      E.paint(() => { E.hint(`ronda ${r + 1}/8 · mira al centro`); E.cross(400, 250, 8, C.dim); }); await E.wait(700);
      await E.flash(() => {
        centre(tri);
        pos.forEach((p, k) => { if (k === t) E.text('★', p.x, p.y, { size: 34, color: C.ink, font: 'sans' }); else if (distract) E.rect(p.x - 11, p.y - 11, 22, 22, null, C.ink, 2.5); });
      }, durs[r]);
      const mask = noiseMask(220); E.paint(mask); await E.wait(350);
      E.paint(() => E.hint('¿qué figura había en el centro?'));
      const cOk = (await E.choice([{ label: '← ▲', key: 'ArrowLeft', value: true }, { label: '■ →', key: 'ArrowRight', value: false }])) === tri;
      const ghost = () => pos.forEach(p => E.ring(p.x, p.y, 18, C.faint, 1.5));
      E.paint(() => { E.hint('¿dónde estaba la estrella?'); ghost(); });
      const p = await E.click(), k = pos.reduce((m, q, i) => dist(q, p) < dist(pos[m], p) ? i : m, 0), pOk = k === t;
      total += 12.5 * ((cOk ? 0.4 : 0) + (pOk ? 0.6 : 0)); if (cOk && pOk) both++;
      E.paint(() => { E.hint(`centro ${cOk ? '✓' : '✗'} · estrella ${pOk ? '✓' : '✗'}`); ghost(); E.text('★', pos[t].x, pos[t].y, { size: 34, color: C.truth, font: 'sans' }); if (!pOk) E.xmark(pos[k].x, pos[k].y, 10, C.bad); });
      await E.wait(800);
    }
    return { score: Math.round(total), detail: `${both}/8 rondas perfectas` };
  },
});

/* ===================== 45. Cables ===================== */
def({
  id: 'cables', emoji: '🧶', name: 'Cables',
  desc: 'Un montón de cables enredados. Sigue con la vista el que empieza en el punto azul y haz clic en el extremo derecho donde termina. 5 rondas.',
  async run(E, rng) {
    let total = 0, hits = 0;
    for (let r = 0; r < 5; r++) {
      const N = 4 + r, ys = Array.from({ length: N }, (_, i) => 75 + i * 350 / (N - 1)), perm = rng.shuffle([...Array(N).keys()]), s = rng.int(0, N - 1);
      const cables = ys.map((y, i) => catmull([{ x: 70, y }, { x: 230, y: rng.range(60, 440) }, { x: 400, y: rng.range(60, 440) }, { x: 570, y: rng.range(60, 440) }, { x: 730, y: ys[perm[i]] }], 20));
      const scene = mark => {
        E.hint(`ronda ${r + 1}/5 · ¿dónde termina el cable azul?`);
        cables.forEach((c, i) => path(c, mark && i === s ? C.truth : '#c9d3dc', mark && i === s ? 4 : 2.5));
        ys.forEach(y => { E.dot(70, y, 6, C.dim); E.dot(730, y, 6, C.dim); });
        E.dot(70, ys[s], 9, C.you);
      };
      E.paint(() => scene(false));
      const t0 = performance.now();
      let p; do { p = await E.click(); } while (p.x < 560);
      const ms = performance.now() - t0, end = ys.reduce((m, y, i) => Math.abs(y - p.y) < Math.abs(ys[m] - p.y) ? i : m, 0), ok = end === perm[s];
      if (ok) { hits++; total += 20 * clamp(1 - (ms - 2500) / 12000, 0.3, 1); }
      E.paint(() => { scene(true); if (!ok) E.xmark(730, ys[end], 10, C.bad); E.text(ok ? `✓ ${(ms / 1000).toFixed(1)} s` : '✗', 400, 478, { size: 16, color: ok ? C.truth : C.bad }); });
      await E.wait(1000);
    }
    return { score: Math.round(total), detail: `${hits}/5 aciertos` };
  },
});

/* ===================== 46. Secuencia (Corsi) ===================== */
def({
  id: 'corsi', emoji: '🧠', name: 'Secuencia',
  desc: 'Los cuadrados se iluminarán uno a uno. Repite la secuencia haciendo clic en el mismo orden. Cada acierto añade uno más; dos fallos seguidos terminan.',
  async run(E, rng) {
    const S = 62, blocks = scatter(rng, 9, () => S / 2 + 4, [50, 50, 750, 460], 22);
    const scene = (lit, col = C.ink, hint = '') => E.paint(() => { E.hint(hint); blocks.forEach((b, i) => E.rect(b.x - S / 2, b.y - S / 2, S, S, i === lit ? col : '#2a333d')); });
    const hit = p => blocks.findIndex(b => Math.abs(p.x - b.x) < S / 2 + 6 && Math.abs(p.y - b.y) < S / 2 + 6);
    let len = 3, fails = 0, best = 2;
    while (len <= 9 && fails < 2) {
      const seq = rng.shuffle([...blocks.keys()]).slice(0, len);
      scene(-1, C.ink, `secuencia de ${len}`); await E.wait(800);
      for (const i of seq) { scene(i, C.ink, `secuencia de ${len}`); await E.wait(560); scene(-1, C.ink, `secuencia de ${len}`); await E.wait(200); }
      let ok = true;
      for (let k = 0; k < len && ok; k++) {
        scene(-1, C.ink, `repite · ${k}/${len}`);
        let i; do { i = hit(await E.click()); } while (i < 0);
        ok = i === seq[k];
        scene(i, ok ? C.you : C.bad, `repite · ${k + 1}/${len}`); await E.wait(180);
      }
      scene(-1, C.ink, ''); await E.feedback(ok, 480, 600);
      if (ok) { best = len; len++; fails = 0; } else fails++;
    }
    return { score: Math.round(clamp((best - 2) / 6, 0, 1) * 100), detail: `recordaste ${best} bloques` };
  },
});

/* ===================== 47. Gradiente ===================== */
def({
  id: 'gradient', emoji: '🌈', name: 'Gradiente',
  desc: 'Ordena las fichas de color para que la fila pase suavemente de un extremo al otro. Haz clic en una ficha para colocarla en el primer hueco libre; clic en un hueco para devolverla.',
  async run(E, rng) {
    const n = 6, h1 = rng.range(0, 360), span = rng.sign() * rng.range(60, 95), s = rng.range(50, 75), l = rng.range(45, 60);
    const col = i => hsl(((h1 + span * i / (n + 1)) % 360 + 360) % 360, s, l);
    const cw = 74, gap = 10, x0 = 400 - (8 * cw + 7 * gap) / 2, slotX = k => x0 + k * (cw + gap);
    const pool = rng.shuffle([...Array(n).keys()].map(i => i + 1)), poolX = k => 400 - (n * cw + (n - 1) * 20) / 2 + k * (cw + 20);
    const slots = Array(n).fill(null);           // slots[k] = índice en pool
    const placed = () => new Set(slots.filter(v => v !== null));
    const draw = (reveal) => E.paint(() => {
      E.hint(reveal ? '' : 'ordena de un extremo al otro');
      for (let k = 0; k < 8; k++) {
        const x = slotX(k), y = 130;
        if (k === 0 || k === 7) E.rect(x, y, cw, 100, col(k === 0 ? 0 : n + 1));
        else if (slots[k - 1] !== null) E.rect(x, y, cw, 100, col(pool[slots[k - 1]]));
        else E.rect(x, y, cw, 100, null, C.faint, 1.5);
        if (reveal && k > 0 && k < 7) { const ok = pool[slots[k - 1]] === k; E.text(ok ? '✓' : `${pool[slots[k - 1]]}`, x + cw / 2, 252, { size: 15, color: ok ? C.truth : C.bad }); }
      }
      if (!reveal) { const P = placed(); pool.forEach((_, k) => { if (!P.has(k)) E.rect(poolX(k), 310, cw, 74, col(pool[k])); }); }
      else for (let k = 1; k <= n; k++) E.rect(slotX(k), 300, cw, 40, col(k));
      if (reveal) E.text('orden correcto', 400, 365, { size: 13, color: C.truth });
    });
    draw(false);
    const el = E.add('<div class="dock"><button class="btn primary" disabled>Fijar</button></div>'), btn = $('button', el);
    const off = E.on(E.cv, 'pointerdown', e => {
      const p = E.pt(e), P = placed();
      if (p.y > 310 && p.y < 384) { const k = pool.findIndex((_, k) => !P.has(k) && p.x >= poolX(k) && p.x <= poolX(k) + cw); if (k >= 0) slots[slots.indexOf(null)] = k; }
      else if (p.y > 130 && p.y < 230) { const k = Math.floor((p.x - x0) / (cw + gap)); if (k >= 1 && k <= n) slots[k - 1] = null; }
      btn.disabled = slots.includes(null); draw(false);
    });
    await E.waitClick(btn); el.remove(); off();
    const D = slots.reduce((s, v, k) => s + Math.abs(pool[v] - (k + 1)), 0);
    draw(true);
    return { score: E.lin(D, 0, 14), detail: D ? `desorden total ${D}` : 'orden perfecto' };
  },
});

/* ===================== 48. Simetría ===================== */
def({
  id: 'symmetry', emoji: '🦋', name: 'Simetría',
  desc: 'Un patrón aparecerá medio segundo. ¿Era perfectamente simétrico respecto a su eje vertical? Las diferencias serán cada vez más sutiles. 10 rondas.',
  async run(E, rng) {
    const N = 10, cs = 26, gx = 400 - N * cs / 2, gy = 120;
    let hits = 0;
    for (let r = 0; r < 10; r++) {
      const sym = rng.next() < 0.5, cells = [];
      for (let y = 0; y < N; y++) { const row = []; for (let x = 0; x < N / 2; x++) row.push(rng.next() < 0.45); cells.push([...row, ...row.slice().reverse()]); }
      if (!sym) {
        const k = Math.max(2, Math.round(14 * Math.pow(0.76, r)));
        rng.shuffle([...Array(N * N / 2).keys()]).slice(0, k).forEach(i => { const y = Math.floor(i / (N / 2)), x = i % (N / 2); cells[y][x] = !cells[y][x]; });
      }
      const grid = c => c.forEach((row, y) => row.forEach((v, x) => v && E.rect(gx + x * cs + 1, gy + y * cs + 1, cs - 2, cs - 2, C.ink)));
      E.paint(() => { E.hint(`ronda ${r + 1}/10`); E.cross(400, 250, 6, C.dim); }); await E.wait(500);
      await E.flash(() => grid(cells), 500);
      const noise = Array.from({ length: N }, () => Array.from({ length: N }, () => Math.random() < 0.5));
      E.paint(() => grid(noise)); await E.wait(300);
      E.paint(() => E.hint(`ronda ${r + 1}/10 · ¿era simétrico?`));
      const ok = (await E.choice(LR('simétrico', 'no simétrico'))) === (sym ? 'L' : 'R'); if (ok) hits++;
      E.paint(() => { E.hint(sym ? 'era simétrico' : 'no era simétrico'); grid(cells); E.line(400, gy - 10, 400, gy + N * cs + 10, C.truth, 2, [4, 4]); });
      await E.feedback(ok, 410, 800);
    }
    return { score: hits * 10, detail: `${hits}/10 aciertos` };
  },
});

/* ===================== 49. Velocidad ===================== */
def({
  id: 'speed', emoji: '🏎️', name: 'Velocidad',
  desc: 'El punto naranja recorre su carril a velocidad constante. Ajusta con el deslizador la velocidad del punto azul (que va en sentido contrario por un carril más corto) hasta que vayan igual de rápido.',
  async run(E, rng) {
    const v0 = rng.range(110, 260), La = 600, Lb = rng.range(260, 460), vMin = 40, vMax = 600;
    let v = v0 * Math.pow(2, rng.sign() * rng.range(0.6, 1.2)), xa = 0, xb = Lb, done = false, last = 0;
    const ua = 400 - La / 2, ub = 400 - Lb / 2;
    const scene = () => {
      E.line(ua, 150, ua + La, 150, C.faint, 2); E.line(ub, 300, ub + Lb, 300, C.faint, 2);
      E.dot(ua + xa, 150, 11, C.warm); E.dot(ub + xb, 300, 11, C.you);
    };
    const el = E.add(`<div class="dock col"><label class="sl wide"><span>lento</span><input type="range" min="0" max="1000" step="1"><span>rápido</span></label><button class="btn primary">Fijar</button></div>`);
    const inp = $('input', el); inp.style.background = 'linear-gradient(to right,#1d2a33,#3fc6ff)';
    inp.value = Math.round(Math.log(v / vMin) / Math.log(vMax / vMin) * 1000);
    inp.addEventListener('input', () => { v = vMin * Math.pow(vMax / vMin, inp.value / 1000); });
    E.waitClick($('button', el)).then(() => { done = true; });
    await E.loop(ms => {
      const dt = Math.min(50, ms - last) / 1000; last = ms;
      xa = (xa + v0 * dt) % La; xb = ((xb - v * dt) % Lb + Lb) % Lb;
      E.paint(() => { E.hint('iguala la velocidad del punto azul'); scene(); });
      return !done;
    });
    el.remove();
    E.paint(() => { scene(); E.text(`objetivo ${Math.round(v0)} px/s · tú ${Math.round(v)} px/s`, 400, 380, { size: 16, color: C.ink }); });
    return { score: E.lin(Math.abs(v / v0 - 1), 0.03, 0.4), detail: `${pctOff(v, v0)} ${v > v0 ? 'más rápido' : 'más lento'}` };
  },
});

/* ===================== 50. Lento ===================== */
def({
  id: 'slow', emoji: '🐌', name: 'Lento',
  desc: 'Varios puntos se mueven sin parar; uno de ellos va algo más lento que los demás. Haz clic en él. Cada ronda la diferencia es menor. 6 rondas.',
  async run(E, rng) {
    const ds = [0.4, 0.3, 0.24, 0.18, 0.14, 0.1], R = 11;
    let hits = 0;
    for (let r = 0; r < 6; r++) {
      const slow = rng.int(0, 6), P = scatter(rng, 7, () => R, [40, 50, 760, 465], 30).map((p, i) => { const a = rng.range(0, TAU), s = 170 * (i === slow ? 1 - ds[r] : 1); return { ...p, vx: Math.cos(a) * s, vy: Math.sin(a) * s }; });
      let clicked = null, last = 0;
      const off = E.on(E.cv, 'pointerdown', e => { if (!clicked) clicked = E.pt(e); });
      const draw = hint => E.paint(() => { E.hint(hint); P.forEach(p => E.dot(p.x, p.y, R, C.ink)); });
      await E.loop(ms => {
        const dt = Math.min(40, ms - last) / 1000; last = ms;
        for (const p of P) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < 40 + R || p.x > 760 - R) { p.vx = -p.vx; p.x = clamp(p.x, 40 + R, 760 - R); }
          if (p.y < 45 + R || p.y > 470 - R) { p.vy = -p.vy; p.y = clamp(p.y, 45 + R, 470 - R); }
        }
        draw(`ronda ${r + 1}/6 · ¿cuál es el más lento?`);
        return !clicked && ms < 15000;
      });
      off();
      const pick = clicked ? P.reduce((m, p, i) => dist(p, clicked) < dist(P[m], clicked) ? i : m, 0) : -1, ok = pick === slow;
      if (ok) hits++;
      E.paint(() => { E.hint(`ronda ${r + 1}/6`); P.forEach(p => E.dot(p.x, p.y, R, C.ink)); E.ring(P[slow].x, P[slow].y, R + 8, C.truth, 3); if (pick >= 0 && !ok) E.xmark(P[pick].x, P[pick].y, 10, C.bad); });
      await E.feedback(ok, 480, 900);
    }
    return { score: Math.round(hits * 100 / 6), detail: `${hits}/6 aciertos` };
  },
});

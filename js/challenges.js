'use strict';
/* Los 20 retos. Cada uno: run(E, rng) → { score: 0..100, detail: texto }. */

const CHALLENGES = [];
const def = c => CHALLENGES.push(c);

/* ---------- utilidades compartidas ---------- */
function hsl2rgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
function rgb2lab([r, g, b]) {
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  r = lin(r); g = lin(g); b = lin(b);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function deltaE(a, b) { const p = rgb2lab(hsl2rgb(a.h, a.s, a.l)), q = rgb2lab(hsl2rgb(b.h, b.s, b.l)); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
/* Distancia máxima que se puede recorrer desde p en la dirección d sin salir del lienzo. */
function rayMax(p, d, m = 14) {
  let t = Infinity;
  if (d.x > 1e-6) t = Math.min(t, (W - m - p.x) / d.x); if (d.x < -1e-6) t = Math.min(t, (m - p.x) / d.x);
  if (d.y > 1e-6) t = Math.min(t, (H - m - p.y) / d.y); if (d.y < -1e-6) t = Math.min(t, (m - p.y) / d.y);
  return t;
}
const pctOff = (u, t) => `${Math.round(Math.abs(u / t - 1) * 100)}%`;
function sq(cx, cy, half, ang = 0) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({
    x: cx + half * (a * Math.cos(ang) - b * Math.sin(ang)), y: cy + half * (a * Math.sin(ang) + b * Math.cos(ang)),
  }));
}
function shape(type, x, y, s, c) {
  if (type === 'circle') return E.dot(x, y, s, c);
  if (type === 'square') return E.rect(x - s * 0.88, y - s * 0.88, s * 1.76, s * 1.76, c);
  if (type === 'triangle') return E.poly([{ x, y: y - s * 1.1 }, { x: x + s, y: y + s * 0.75 }, { x: x - s, y: y + s * 0.75 }], c);
  if (type === 'diamond') return E.poly([{ x, y: y - s * 1.15 }, { x: x + s, y }, { x, y: y + s * 1.15 }, { x: x - s, y }], c);
}

/* ===================== 1. Color ===================== */
def({
  id: 'color', emoji: '🎨', name: 'Color',
  desc: 'Un color aparecerá durante dos segundos. Después, recréalo de memoria con los deslizadores de tono, saturación y luminosidad.',
  async run(E, rng) {
    const T = { h: rng.range(0, 360), s: rng.range(35, 90), l: rng.range(32, 68) };
    await E.countdown();
    E.paint(() => E.dot(400, 250, 140, hsl(T.h, T.s, T.l)));
    await E.wait(2000);
    E.paint(null); await E.wait(400);
    const U = { h: Math.round(rng.range(0, 360)), s: 50, l: 50 };
    const draw = () => E.paint(() => { E.hint('recrea el color de memoria'); E.dot(400, 165, 112, hsl(U.h, U.s, U.l)); });
    draw();
    const el = E.add(`<div class="dock col">
      <label class="sl"><span>Tono</span><input type="range" min="0" max="360" step="1" data-k="h"></label>
      <label class="sl"><span>Saturación</span><input type="range" min="0" max="100" step="1" data-k="s"></label>
      <label class="sl"><span>Luminosidad</span><input type="range" min="0" max="100" step="1" data-k="l"></label>
      <button class="btn primary">Fijar</button></div>`);
    const ins = [...el.querySelectorAll('input')];
    const grad = () => {
      ins[0].style.background = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map(h => hsl(h, U.s, U.l)).join(',')})`;
      ins[1].style.background = `linear-gradient(to right, ${hsl(U.h, 0, U.l)}, ${hsl(U.h, 100, U.l)})`;
      ins[2].style.background = `linear-gradient(to right, #000, ${hsl(U.h, U.s, 50)}, #fff)`;
    };
    ins.forEach(i => { i.value = U[i.dataset.k]; i.addEventListener('input', () => { U[i.dataset.k] = +i.value; grad(); draw(); }); });
    grad();
    await E.waitClick($('button', el)); el.remove();

    const dE = deltaE(T, U);
    E.paint(g => {
      g.beginPath(); g.moveTo(400, 230); g.arc(400, 230, 140, Math.PI / 2, Math.PI * 1.5); g.fillStyle = hsl(T.h, T.s, T.l); g.fill();
      g.beginPath(); g.moveTo(400, 230); g.arc(400, 230, 140, -Math.PI / 2, Math.PI / 2); g.fillStyle = hsl(U.h, U.s, U.l); g.fill();
      E.text('objetivo', 330, 400, { color: C.truth, size: 15 }); E.text('tú', 470, 400, { color: C.you, size: 15 });
    });
    return { score: E.lin(dE, 2.5, 42), detail: `diferencia ΔE ${dE.toFixed(1)}` };
  },
});

/* ===================== 2. Longitud ===================== */
def({
  id: 'length', emoji: '📏', name: 'Longitud',
  desc: 'Memoriza la longitud de una línea. Luego aparecerá otra en distinta posición y orientación: arrástrala hasta que mida lo mismo. Al soltar se fija.',
  async run(E, rng) {
    const L = rng.range(110, 340), a1 = rng.range(0, Math.PI);
    const d1 = { x: Math.cos(a1), y: Math.sin(a1) };
    await E.countdown();
    E.paint(() => E.line(400 - d1.x * L / 2, 250 - d1.y * L / 2, 400 + d1.x * L / 2, 250 + d1.y * L / 2, C.ink, 4));
    await E.wait(1500); E.paint(null); await E.wait(600);

    let A = null, d, maxL;
    for (let i = 0; i < 500 && !A; i++) {
      const a2 = a1 + rng.sign() * rng.range(45, 135) * D2R, dd = { x: Math.cos(a2), y: Math.sin(a2) };
      const p = { x: rng.range(40, 760), y: rng.range(60, 460) }, m = rayMax(p, dd);
      if (m >= L * 1.35) { A = p; d = dd; maxL = m; }
    }
    if (!A) { d = { x: 1, y: 0 }; A = { x: 40, y: rng.range(80, 420) }; maxL = rayMax(A, d); }

    let len = 0;
    const draw = hint => E.paint(() => {
      E.hint(hint);
      E.line(A.x, A.y, A.x + d.x * maxL, A.y + d.y * maxL, C.ghost, 2, [3, 7]);
      if (len > 0) { E.line(A.x, A.y, A.x + d.x * len, A.y + d.y * len, C.you, 4); E.dot(A.x + d.x * len, A.y + d.y * len, 7, C.you); }
      E.dot(A.x, A.y, 6, C.ink);
    });
    draw('pulsa, desliza y suelta para fijar');
    await E.drag(p => { len = clamp((p.x - A.x) * d.x + (p.y - A.y) * d.y, 0, maxL); draw('pulsa, desliza y suelta para fijar'); });

    const n = { x: -d.y * 16, y: d.x * 16 };
    E.paint(() => {
      E.line(A.x, A.y, A.x + d.x * len, A.y + d.y * len, C.you, 4); E.dot(A.x, A.y, 6, C.ink);
      E.line(A.x + n.x, A.y + n.y, A.x + n.x + d.x * L, A.y + n.y + d.y * L, C.truth, 3);
      E.line(A.x + d.x * L + n.x * 1.6, A.y + d.y * L + n.y * 1.6, A.x + d.x * L - n.x * 0.4, A.y + d.y * L - n.y * 0.4, C.truth, 2);
    });
    const rel = Math.abs(len - L) / L;
    return { score: E.lin(rel, 0.02, 0.35), detail: `${pctOff(len, L)} ${len > L ? 'más larga' : 'más corta'}` };
  },
});

/* ===================== 3. Centro ===================== */
def({
  id: 'center', emoji: '⭕', name: 'Centro',
  desc: 'Solo verás un trozo de circunferencia. Haz clic justo donde estaría su centro.',
  async run(E, rng) {
    let c, r, a0, span;
    for (let i = 0; i < 2000; i++) {
      r = rng.range(120, 240); c = { x: rng.range(140, 660), y: rng.range(100, 400) };
      span = rng.range(60, 105) * D2R; a0 = rng.range(0, TAU);
      let ok = true;
      for (let k = 0; k <= 24 && ok; k++) { const a = a0 + span * k / 24, x = c.x + r * Math.cos(a), y = c.y + r * Math.sin(a); ok = x > 25 && x < 775 && y > 40 && y < 475; }
      if (ok) break;
    }
    const arc = col => { const g = E.g; g.save(); g.beginPath(); g.arc(c.x, c.y, r, a0, a0 + span); g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round'; g.stroke(); g.restore(); };
    E.paint(() => { E.hint('haz clic en el centro'); arc(C.ink); });
    const p = await E.click();
    const e = dist(p, c);
    E.paint(() => {
      E.ring(c.x, c.y, r, C.truth, 1.5, [4, 6]); arc(C.ink);
      E.line(p.x, p.y, c.x, c.y, C.faint, 1);
      E.cross(c.x, c.y, 9, C.truth, 2); E.dot(p.x, p.y, 6, C.you);
    });
    return { score: E.lin(e / r, 0.02, 0.3), detail: `a ${Math.round(e)} px del centro` };
  },
});

/* ===================== 4. Duración ===================== */
def({
  id: 'duration', emoji: '⏱️', name: 'Duración',
  desc: 'Un cuadrado se encenderá durante un rato. Cuando se apague, mantén pulsado (ratón, dedo o barra espaciadora) exactamente el mismo tiempo.',
  async run(E, rng) {
    const T = rng.range(1000, 4000);
    const box = (fill, label) => E.paint(() => { E.rect(320, 130, 160, 160, fill, C.faint); E.text(label, 400, 350, { size: 15, color: C.dim }); });
    box(null, 'observa…'); await E.wait(1000);
    box(C.ink, 'observa…'); await E.wait(T);
    box(null, ''); await E.wait(700);
    box(null, 'ahora mantén pulsado el mismo tiempo');
    const u = await E.hold(() => box(C.you, ''));
    const s = 560 / Math.max(T, u);
    E.paint(() => {
      E.rect(320, 110, 160, 160, null, C.faint);
      E.rect(120, 320, T * s, 22, C.truth); E.text(`objetivo ${(T / 1000).toFixed(2)} s`, 120, 360, { align: 'left', size: 14, color: C.truth });
      E.rect(120, 390, u * s, 22, C.you); E.text(`tú ${(u / 1000).toFixed(2)} s`, 120, 430, { align: 'left', size: 14, color: C.you });
    });
    const rel = Math.abs(u - T) / T;
    return { score: E.lin(rel, 0.02, 0.4), detail: `${pctOff(u, T)} ${u > T ? 'de más' : 'de menos'}` };
  },
});

/* ===================== 5. Tono (audio) ===================== */
def({
  id: 'pitch', emoji: '🎵', name: 'Nota',
  desc: 'Necesitas sonido. Escucharás una nota; después mueve el deslizador hasta que suene igual. Puedes repetir la nota original dos veces.',
  async run(E, rng) {
    if (!E.audio()) return { score: 0, detail: 'audio no disponible' };
    const f0 = 220 * Math.pow(2, rng.range(0, 2)), u0 = rng.range(0.18, 0.82);
    const fr = u => f0 * Math.pow(2, (u - u0) * 2);
    let u = rng.next() < 0.5 ? rng.range(0, u0 - 0.12) : rng.range(u0 + 0.12, 1);
    const note = (label, col = C.ink) => E.paint(() => { E.text('♪', 400, 190, { size: 120, color: col, font: 'sans' }); E.text(label, 400, 300, { size: 15, color: C.dim }); });

    note('escucha…'); await E.wait(500);
    await E.tone(f0, 1100);
    note('ajusta el deslizador hasta que suene igual', C.you);

    let replays = 2, voice = null, held = false, stopT = null;
    const el = E.add(`<div class="dock col">
      <label class="sl wide"><span>grave</span><input type="range" min="0" max="1000" step="1"><span>agudo</span></label>
      <div class="row"><button class="btn" data-a="orig">▶ Original (2)</button><button class="btn primary" data-a="ok">Fijar</button></div></div>`);
    const inp = $('input', el), bo = $('[data-a=orig]', el);
    inp.value = Math.round(u * 1000);
    inp.style.background = 'linear-gradient(to right, #1d2a33, #3fc6ff)';
    const play = () => {
      if (!voice) voice = E.sustain(fr(u));
      voice.set(fr(u));
      clearTimeout(stopT);
      if (!held) stopT = setTimeout(() => { if (voice) { voice.stop(); voice = null; } }, 450);
    };
    inp.addEventListener('pointerdown', () => { held = true; clearTimeout(stopT); play(); });
    const release = () => { held = false; clearTimeout(stopT); stopT = setTimeout(() => { if (voice) { voice.stop(); voice = null; } }, 250); };
    inp.addEventListener('pointercancel', release); E.on(window, 'pointerup', () => { if (held) release(); });
    inp.addEventListener('input', () => { u = inp.value / 1000; play(); });
    bo.addEventListener('click', async () => {
      if (!replays) return; replays--; bo.textContent = `▶ Original (${replays})`; bo.disabled = !replays;
      if (voice) { voice.stop(); voice = null; }
      await E.tone(f0, 900);
    });
    await E.waitClick($('[data-a=ok]', el));
    clearTimeout(stopT); if (voice) voice.stop();
    el.remove();

    const fu = fr(u), cents = Math.round(Math.abs(1200 * Math.log2(fu / f0)));
    const X = v => 100 + v * 600;
    E.paint(() => {
      E.text('♪', 400, 120, { size: 80, color: C.faint, font: 'sans' });
      E.line(100, 280, 700, 280, C.faint, 2);
      for (let k = 0; k <= 24; k++) E.line(X(k / 24), 274, X(k / 24), 286, C.faint, 1);
      E.line(X(u0), 250, X(u0), 310, C.truth, 3); E.text('objetivo', X(u0), 330, { size: 13, color: C.truth });
      E.dot(X(u), 280, 8, C.you); E.text('tú', X(u), 236, { size: 13, color: C.you });
      E.text('cada marca = un semitono', 400, 390, { size: 12, color: C.dim });
    });
    return { score: E.lin(cents, 10, 200), detail: `${cents} cents ${fu > f0 ? 'agudo' : 'grave'}` };
  },
});

/* ===================== 6. Área ===================== */
def({
  id: 'area', emoji: '🟠', name: 'Área',
  desc: 'Haz que la figura de la derecha tenga exactamente la misma área que la de la izquierda. Pulsa, desliza desde el centro y suelta para fijar.',
  async run(E, rng) {
    const toCircle = rng.next() < 0.5;
    const L = { x: 215, y: 255 }, R = { x: 585, y: 255 };
    let A, refAng = rng.range(0, 45) * D2R, refSize;
    if (toCircle) { refSize = rng.range(55, 105); A = (2 * refSize) ** 2; }     // semilado del cuadrado
    else { refSize = rng.range(60, 115); A = Math.PI * refSize ** 2; }           // radio del círculo
    let s = 0;
    const areaOf = s => toCircle ? Math.PI * s * s : (2 * s) ** 2;
    const drawRef = () => toCircle ? E.poly(sq(L.x, L.y, refSize, refAng), C.ghost, C.ink, 2) : (E.dot(L.x, L.y, refSize, C.ghost), E.ring(L.x, L.y, refSize, C.ink, 2));
    const drawMine = (v, col, dash) => toCircle ? E.ring(R.x, R.y, v, col, 2.5, dash) : E.poly(sq(R.x, R.y, v), null, col, 2.5, dash);
    const draw = hint => E.paint(() => {
      E.hint(hint); drawRef(); E.dot(R.x, R.y, 4, C.dim);
      if (s > 0) { toCircle ? E.dot(R.x, R.y, s, 'rgba(63,198,255,.12)') : E.poly(sq(R.x, R.y, s), 'rgba(63,198,255,.12)'); drawMine(s, C.you); }
    });
    const H_ = 'pulsa, desliza y suelta para fijar';
    draw(H_);
    await E.drag(p => { s = clamp(toCircle ? dist(p, R) : Math.max(Math.abs(p.x - R.x), Math.abs(p.y - R.y)), 0, 205); draw(H_); });
    const t = toCircle ? Math.sqrt(A / Math.PI) : Math.sqrt(A) / 2;
    E.paint(() => { drawRef(); drawMine(s, C.you); drawMine(t, C.truth, [5, 6]); E.dot(R.x, R.y, 4, C.dim); });
    const ratio = areaOf(s) / A;
    return { score: E.lin(Math.abs(ratio - 1), 0.03, 0.5), detail: `${Math.round(ratio * 100)}% del área` };
  },
});

/* ===================== 7. Equilibrio ===================== */
def({
  id: 'balance', emoji: '⚖️', name: 'Equilibrio',
  desc: 'Imagina que la figura es una lámina de cartón. Haz clic en el punto exacto donde se mantendría en equilibrio sobre la punta de un dedo (su centro de masas).',
  async run(E, rng) {
    const n = rng.int(5, 9), c0 = { x: 400 + rng.range(-60, 60), y: 255 + rng.range(-25, 25) }, rot = rng.range(0, TAU);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i + rng.range(0.15, 0.85)) / n * TAU, dir = { x: Math.cos(a), y: Math.sin(a) };
      const r = Math.min(rng.range(45, 200), rayMax(c0, dir, 40));
      pts.push({ x: c0.x + dir.x * r, y: c0.y + dir.y * r });
    }
    let A2 = 0, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], cr = p.x * q.y - q.x * p.y; A2 += cr; cx += (p.x + q.x) * cr; cy += (p.y + q.y) * cr; }
    const c = { x: cx / (3 * A2), y: cy / (3 * A2) }, area = Math.abs(A2 / 2);
    E.paint(() => { E.hint('haz clic en el centro de masas'); E.poly(pts, 'rgba(230,237,243,.10)', C.ink, 2); });
    const p = await E.click();
    const e = dist(p, c);
    E.paint(() => { E.poly(pts, 'rgba(230,237,243,.10)', C.ink, 2); E.line(p.x, p.y, c.x, c.y, C.faint, 1); E.cross(c.x, c.y, 10, C.truth, 2.5); E.dot(p.x, p.y, 6, C.you); });
    return { score: E.lin(e / Math.sqrt(area), 0.015, 0.25), detail: `a ${Math.round(e)} px del punto` };
  },
});

/* ===================== 8. Gris ===================== */
def({
  id: 'gray', emoji: '🌗', name: 'Gris',
  desc: 'Ajusta el gris del cuadrado de la derecha hasta que sea idéntico al de la izquierda. Cuidado: el fondo cambia cómo lo ves.',
  async run(E, rng) {
    const g0 = rng.range(32, 68), darkLeft = rng.next() < 0.5;
    const bgL = darkLeft ? 8 : 88, bgR = darkLeft ? 88 : 8;
    let u = Math.round(rng.next() < 0.5 ? rng.range(10, g0 - 12) : rng.range(g0 + 12, 90));
    const scene = () => {
      E.rect(0, 0, 400, H, hsl(0, 0, bgL)); E.rect(400, 0, 400, H, hsl(0, 0, bgR));
      E.rect(140, 110, 120, 120, hsl(0, 0, g0)); E.rect(540, 110, 120, 120, hsl(0, 0, u));
    };
    const draw = () => E.paint(scene);
    draw();
    const el = E.add(`<div class="dock col"><label class="sl wide"><span>oscuro</span><input type="range" min="0" max="100" step="0.5"><span>claro</span></label><button class="btn primary">Fijar</button></div>`);
    const inp = $('input', el); inp.value = u; inp.style.background = 'linear-gradient(to right,#000,#fff)';
    inp.addEventListener('input', () => { u = +inp.value; draw(); });
    await E.waitClick($('button', el)); el.remove();
    const diff = Math.abs(u - g0);
    E.paint(() => {
      scene();
      E.rect(250, 290, 150, 70, hsl(0, 0, g0)); E.rect(400, 290, 150, 70, hsl(0, 0, u));
      E.rect(250, 290, 300, 70, null, C.faint, 1);
      E.rect(250, 372, 300, 76, C.panel, C.faint, 1);
      E.text('juntos, sin fondo que engañe', 400, 392, { size: 12, color: C.dim });
      E.text(`objetivo ${g0.toFixed(0)}%`, 325, 424, { size: 14, color: C.truth });
      E.text(`tú ${u.toFixed(0)}%`, 475, 424, { size: 14, color: C.you });
    });
    return { score: E.lin(diff, 1, 20), detail: `${diff.toFixed(1)} puntos de luminosidad` };
  },
});

/* ===================== 9. Túnel ===================== */
def({
  id: 'tunnel', emoji: '🚇', name: 'Túnel',
  desc: 'Una bola entra en un túnel a velocidad constante. Pulsa (clic o espacio) justo en el instante en que su centro llegue a la salida.',
  async run(E, rng) {
    const dir = rng.sign(), v = rng.range(140, 300), Lt = rng.range(200, 340), Y = 250, br = 12;
    const approach = rng.range(200, 720 - Lt);
    const X0 = dir > 0 ? 40 : 760, a = X0 + dir * approach, b = a + dir * Lt;
    const tEnter = approach / v * 1000, tExit = (approach + Lt) / v * 1000;
    const x1 = Math.min(a, b), x2 = Math.max(a, b);
    const scene = (alpha = 1) => {
      E.line(20, Y, 780, Y, C.ghost, 2, [4, 8]);
      E.g.globalAlpha = alpha; E.rect(x1, Y - 45, x2 - x1, 90, '#1b232c', C.faint, 1.5); E.g.globalAlpha = 1;
      E.line(b, Y - 55, b, Y + 55, C.faint, 1, [3, 5]);
    };
    const start = performance.now() + 700;
    let pressed = null;
    const lp = E.loop(() => {
      const t = Math.max(0, performance.now() - start), s = v * t / 1000;
      E.paint(() => { E.hint('pulsa cuando salga'); if (s < approach + br) E.dot(X0 + dir * s, Y, br, C.ink); scene(); });
      return pressed === null && t < tExit + 2500;
    });
    pressed = await E.press(tExit + 3200);
    if (pressed === null) pressed = start + tExit + 2500;
    await lp;
    const dt = pressed - (start + tExit), xs = X0 + dir * v * Math.max(0, pressed - start) / 1000;
    E.paint(() => { scene(0.35); E.dot(b, Y, br, C.truth); E.dot(clamp(xs, 10, 790), Y, br - 3, C.you); E.text('salida', b, Y + 75, { size: 13, color: C.truth }); });
    return { score: E.lin(Math.abs(dt), 20, 450), detail: `${dt > 0 ? 'tarde' : 'pronto'} por ${Math.round(Math.abs(dt))} ms` };
  },
});

/* ===================== 10. Porción ===================== */
def({
  id: 'pie', emoji: '🥧', name: 'Porción',
  desc: '¿Qué porcentaje del círculo ocupa la porción azul? Escribe un número del 1 al 99.',
  async run(E, rng) {
    const p = rng.int(3, 97), k = rng.int(1, 3), cuts = [];
    let rem = 100 - p;
    for (let i = 0; i < k - 1 && rem > 6; i++) { const c = rng.range(3, rem - 3); cuts.push(c); rem -= c; }
    cuts.push(rem);
    const slices = rng.shuffle([{ v: p, me: true }, ...cuts.map(v => ({ v }))]);
    const greys = ['#38424c', '#2a323b', '#4a5560'];
    const a0 = rng.range(0, TAU), cx = 400, cy = 210, R = 150;
    const pie = () => {
      let a = a0;
      slices.forEach((s, i) => {
        const b = a + s.v / 100 * TAU, g = E.g;
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a, b); g.closePath();
        g.fillStyle = s.me ? C.you : greys[i % 3]; g.fill(); g.strokeStyle = C.bg; g.lineWidth = 3; g.stroke();
        s.mid = (a + b) / 2; a = b;
      });
    };
    E.paint(pie);
    const u = clamp(await E.ask('¿Qué % es azul?', 'dock ask'), 0, 100);
    const me = slices.find(s => s.me);
    E.paint(() => {
      pie();
      const r = p < 12 ? R + 28 : R * 0.6;
      E.text(`${p}%`, cx + Math.cos(me.mid) * r, cy + Math.sin(me.mid) * r, { size: 20, weight: 700, color: p < 12 ? C.truth : C.bg });
      E.text(`era ${p}%`, 400, 410, { size: 18, color: C.truth }); E.text(`dijiste ${u}%`, 400, 440, { size: 16, color: C.you });
    });
    return { score: E.lin(Math.abs(u - p), 0.5, 15), detail: `fallo de ${Math.abs(u - p).toFixed(0)} puntos` };
  },
});

/* ===================== 11. Cambio ===================== */
def({
  id: 'change', emoji: '👁️', name: 'Cambio',
  desc: 'La escena parpadeará alternando con una versión casi igual: una figura cambia de color o de forma. Haz clic en ella lo antes posible. 5 rondas.',
  async run(E, rng) {
    const shapes = ['circle', 'square', 'triangle', 'diamond'], cols = ['#3fc6ff', '#ffa94d', '#5ad690', '#ff6b8b', '#c08bff'];
    let total = 0, hits = 0;
    for (let r = 0; r < 5; r++) {
      const n = 6 + 2 * r, cells = rng.shuffle([...Array(32).keys()]).slice(0, n);
      const A = cells.map(i => ({ x: 70 + (i % 8) * 94 + rng.range(-14, 14), y: 90 + Math.floor(i / 8) * 100 + rng.range(-12, 12), s: shapes[rng.int(0, 3)], c: cols[rng.int(0, 4)] }));
      const idx = rng.int(0, n - 1), B = A.map(o => ({ ...o })), t = B[idx];
      if (rng.next() < 0.5) t.s = rng.pick(shapes.filter(s => s !== t.s)); else t.c = rng.pick(cols.filter(c => c !== t.c));
      const items = list => list.forEach(o => shape(o.s, o.x, o.y, 18, o.c));
      let clicked = null;
      const off = E.on(E.cv, 'pointerdown', e => { if (!clicked) clicked = { p: E.pt(e), t: performance.now() }; });
      const t0 = performance.now();
      await E.loop(ms => {
        const ph = ms % 1640, show = ph < 700 ? A : ph < 820 ? null : ph < 1520 ? B : null;
        E.paint(() => { E.hint(`ronda ${r + 1}/5 · ¿qué cambia?`); if (show) items(show); });
        return !clicked && ms < 15000;
      });
      off();
      let hit = false, ms = 15000;
      if (clicked) {
        ms = clicked.t - t0;
        const near = A.reduce((m, o, i) => { const d = dist(o, clicked.p); return d < m.d ? { d, i } : m; }, { d: Infinity, i: -1 });
        hit = near.i === idx && near.d < 50;
      }
      if (hit) { hits++; total += 20 * clamp(1 - (ms - 1500) / 13500, 0.3, 1); }
      E.paint(() => {
        E.hint(`ronda ${r + 1}/5`); items(B); E.ring(A[idx].x, A[idx].y, 34, C.truth, 3);
        if (clicked && !hit) E.xmark(clicked.p.x, clicked.p.y, 10, C.bad);
        E.text(hit ? `✓ ${(ms / 1000).toFixed(1)} s` : clicked ? '✗' : 'tiempo agotado', 400, 470, { size: 16, color: hit ? C.truth : C.bad });
      });
      await E.wait(1000);
    }
    return { score: Math.round(total), detail: `${hits}/5 aciertos` };
  },
});

/* ===================== 12. Matiz ===================== */
def({
  id: 'odd', emoji: '🔍', name: 'Matiz',
  desc: 'Una casilla tiene un color ligeramente distinto: haz clic en ella. Cada acierto lo hace más difícil. Tienes 20 segundos; cada fallo resta 2.',
  async run(E, rng) {
    const TL = 20000, X = 200, Y = 75, S = 400;
    let level = 0, penalty = 0, flash = -1e9, b;
    const board = () => {
      const k = Math.min(8, 2 + Math.floor((level + 1) / 2)), d = Math.max(1.1, 24 * Math.pow(0.86, level));
      const h = rng.range(0, 360), s = rng.range(45, 75), l = rng.range(42, 58);
      b = { k, odd: rng.int(0, k * k - 1), base: hsl(h, s, l), oddc: hsl(h, s, l + (rng.sign()) * d) };
    };
    board();
    const off = E.on(E.cv, 'pointerdown', e => {
      const p = E.pt(e), cs = S / b.k, col = Math.floor((p.x - X) / cs), row = Math.floor((p.y - Y) / cs);
      if (col < 0 || row < 0 || col >= b.k || row >= b.k) return;
      if (row * b.k + col === b.odd) { level++; board(); } else { penalty += 2000; flash = performance.now(); }
    });
    const grid = (mark) => {
      const cs = S / b.k, gap = Math.max(3, 10 - b.k);
      for (let i = 0; i < b.k * b.k; i++) {
        const x = X + (i % b.k) * cs, y = Y + Math.floor(i / b.k) * cs;
        E.rect(x + gap / 2, y + gap / 2, cs - gap, cs - gap, i === b.odd ? b.oddc : b.base);
        if (mark && i === b.odd) E.rect(x + gap / 2, y + gap / 2, cs - gap, cs - gap, null, C.truth, 4);
      }
    };
    await E.loop(ms => {
      const left = TL - ms - penalty;
      E.paint(() => {
        E.rect(X, 44, S, 8, C.ghost); E.rect(X, 44, S * clamp(left / TL, 0, 1), 8, left < 5000 ? C.bad : C.you);
        E.text(`nivel ${level}`, X + S + 20, 48, { align: 'left', size: 14, color: C.dim });
        grid(false);
        if (performance.now() - flash < 250) E.rect(X - 6, Y - 6, S + 12, S + 12, null, C.bad, 3);
      });
      return left > 0;
    });
    off();
    E.paint(() => { E.text(`nivel ${level}`, X + S + 20, 48, { align: 'left', size: 14, color: C.dim }); grid(true); });
    return { score: Math.round(100 * Math.min(1, level / 20)), detail: `nivel ${level} alcanzado` };
  },
});

/* ===================== 13. Reflejos ===================== */
def({
  id: 'reaction', emoji: '⚡', name: 'Reflejos',
  desc: 'Cuando el recuadro se ponga verde, haz clic (o pulsa espacio) lo más rápido que puedas. 5 intentos; adelantarse penaliza.',
  async run(E, rng) {
    const times = [];
    const panel = (fill, label, sub = '') => E.paint(() => { E.rect(100, 70, 600, 340, fill, C.faint, 1); E.text(label, 400, 230, { size: 30, weight: 700 }); E.text(sub, 400, 280, { size: 14, color: C.dim }); E.hint(`intento ${times.length + 1}/5`); });
    while (times.length < 5) {
      panel('#2a1517', 'espera al verde…');
      const early = await E.press(rng.range(1200, 3500));
      if (early !== null) { panel('#3a1d1f', '¡Demasiado pronto!', 'cuenta como 600 ms'); times.push(600); await E.wait(1100); continue; }
      panel('#1f8f4e', '¡YA!');
      await E.frame();
      const t0 = performance.now(), t = await E.press(2000);
      const rt = t === null ? 1000 : Math.max(0, t - t0);
      times.push(rt);
      panel('#151c23', `${Math.round(rt)} ms`, times.length < 5 ? 'siguiente intento…' : '');
      await E.wait(900);
    }
    const med = [...times].sort((a, b) => a - b)[2];
    E.paint(() => {
      times.forEach((t, i) => {
        const w = Math.min(t, 1000) * 0.5, y = 110 + i * 52;
        E.rect(160, y, w, 26, t === med ? C.you : C.faint); E.text(`${Math.round(t)} ms`, 170 + w, y + 13, { align: 'left', size: 14 });
      });
      E.text(`mediana ${Math.round(med)} ms`, 400, 400, { size: 18, color: C.you });
    });
    return { score: E.lin(med, 200, 500), detail: `mediana ${Math.round(med)} ms` };
  },
});

/* ===================== 14. Rotación mental ===================== */
function polyomino(rng, n) {
  const norm = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).join(';'); };
  const rot = cs => cs.map(([x, y]) => [y, -x]);
  for (;;) {
    const cells = [[0, 0]], has = (x, y) => cells.some(c => c[0] === x && c[1] === y);
    while (cells.length < n) { const [x, y] = rng.pick(cells), [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]); }
    const m = norm(cells.map(([x, y]) => [-x, y]));
    let r = cells, chiral = true;
    for (let i = 0; i < 4; i++) { if (norm(r) === m) chiral = false; r = rot(r); }
    if (chiral) return cells;
  }
}
def({
  id: 'rotate', emoji: '🔄', name: 'Rotación',
  desc: '¿La figura de la derecha es la misma girada, o su reflejo en un espejo? Responde con los botones o con ← / →. 8 rondas: rapidez y acierto cuentan.',
  async run(E, rng) {
    let total = 0, hits = 0, tsum = 0;
    const draw = (cells, x, y, ang, mir, col) => {
      const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length, cy = cells.reduce((s, c) => s + c[1], 0) / cells.length, s = 34, g = E.g;
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(mir ? -1 : 1, 1);
      cells.forEach(([a, b]) => { g.fillStyle = col; g.fillRect((a - cx - 0.5) * s + 1.5, (b - cy - 0.5) * s + 1.5, s - 3, s - 3); });
      g.restore();
    };
    for (let r = 0; r < 8; r++) {
      const cells = polyomino(rng, r < 3 ? 5 : r < 6 ? 6 : 7), a1 = rng.range(0, TAU), a2 = a1 + rng.range(60, 300) * D2R, mir = rng.next() < 0.5;
      const scene = () => { E.hint(`ronda ${r + 1}/8`); E.line(400, 80, 400, 400, C.ghost, 1); draw(cells, 220, 240, a1, false, C.ink); draw(cells, 580, 240, a2, mir, C.ink); };
      E.paint(scene);
      const t0 = performance.now();
      const ans = await E.choice([{ label: '← Igual', key: 'ArrowLeft', value: false }, { label: 'Espejo →', key: 'ArrowRight', value: true }]);
      const t = performance.now() - t0, ok = ans === mir;
      tsum += t;
      if (ok) { hits++; total += 12.5 * clamp(1 - (t - 2000) / 8000, 0.4, 1); }
      E.paint(() => { scene(); E.text(ok ? `✓ ${(t / 1000).toFixed(1)} s` : `✗ era ${mir ? 'espejo' : 'igual'}`, 400, 440, { size: 18, color: ok ? C.truth : C.bad }); });
      await E.wait(650);
    }
    return { score: Math.round(total), detail: `${hits}/8 · ${(tsum / 8000).toFixed(1)} s de media` };
  },
});

/* ===================== 15. Posición ===================== */
def({
  id: 'spot', emoji: '📍', name: 'Posición',
  desc: 'Un punto aparecerá un instante y luego se tapará con ruido. Haz clic donde estaba. 5 rondas.',
  async run(E, rng) {
    let sum = 0, esum = 0;
    for (let r = 0; r < 5; r++) {
      const p = { x: rng.range(60, 740), y: rng.range(70, 440) };
      E.paint(() => { E.hint(`ronda ${r + 1}/5`); E.cross(400, 255, 10, C.dim, 2); }); await E.wait(700);
      E.paint(() => { E.hint(`ronda ${r + 1}/5`); E.dot(p.x, p.y, 7, C.ink); }); await E.wait(280);
      const noise = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * TAU, l: 8 + Math.random() * 22 }));
      E.paint(() => noise.forEach(n => E.line(n.x, n.y, n.x + Math.cos(n.a) * n.l, n.y + Math.sin(n.a) * n.l, 'rgba(230,237,243,.5)', 2)));
      await E.wait(450);
      E.paint(() => E.hint(`ronda ${r + 1}/5 · ¿dónde estaba?`));
      const u = await E.click(), e = dist(u, p);
      sum += E.lin(e, 4, 90); esum += e;
      E.paint(() => { E.hint(`ronda ${r + 1}/5`); E.line(u.x, u.y, p.x, p.y, C.faint, 1); E.dot(p.x, p.y, 7, C.truth); E.dot(u.x, u.y, 6, C.you); E.text(`${Math.round(e)} px`, 400, 475, { size: 14, color: C.dim }); });
      await E.wait(800);
    }
    return { score: Math.round(sum / 5), detail: `error medio ${Math.round(esum / 5)} px` };
  },
});

/* ===================== 16. Mayoría ===================== */
def({
  id: 'majority', emoji: '🫧', name: 'Mayoría',
  desc: 'Aparecerán puntos azules y naranjas mezclados durante menos de un segundo. ¿De qué color había más? 10 rondas, cada vez más igualadas.',
  async run(E, rng) {
    const ratios = [2, 1.7, 1.5, 1.4, 1.3, 1.25, 1.2, 1.15, 1.1, 1.07];
    let hits = 0;
    for (let r = 0; r < 10; r++) {
      const n = rng.int(30, 54);
      let more = Math.round(n * ratios[r] / (1 + ratios[r])), less = n - more; if (more <= less) more = less + 1;
      const blueMore = rng.next() < 0.5, dots = [];
      const cols = [...Array(more).fill(blueMore ? C.you : C.warm), ...Array(less).fill(blueMore ? C.warm : C.you)];
      for (const c of cols) {
        for (let k = 0; k < 200; k++) {
          const d = { x: rng.range(80, 720), y: rng.range(60, 440), r: rng.range(4, 9), c };
          if (dots.every(o => dist(o, d) > o.r + d.r + 6)) { dots.push(d); break; }
        }
      }
      const nb = dots.filter(d => d.c === C.you).length, no = dots.length - nb;
      E.paint(() => { E.hint(`ronda ${r + 1}/10`); E.cross(400, 250, 8, C.dim); }); await E.wait(500);
      E.paint(() => { E.hint(`ronda ${r + 1}/10`); dots.forEach(d => E.dot(d.x, d.y, d.r, d.c)); }); await E.wait(750);
      E.paint(() => E.hint(`ronda ${r + 1}/10 · ¿qué color había más?`));
      const ans = await E.choice([{ label: '← <span style="color:#3fc6ff">●</span> Azul', key: 'ArrowLeft', value: true }, { label: 'Naranja <span style="color:#ffa94d">●</span> →', key: 'ArrowRight', value: false }]);
      const ok = nb === no || ans === (nb > no); if (ok) hits++;
      E.paint(() => { E.hint(`ronda ${r + 1}/10`); dots.forEach(d => E.dot(d.x, d.y, d.r, d.c)); E.rect(250, 430, 300, 40, C.bg); E.text(`${ok ? '✓' : '✗'}  ${nb} azules · ${no} naranjas`, 400, 450, { size: 16, color: ok ? C.truth : C.bad }); });
      await E.wait(900);
    }
    return { score: hits * 10, detail: `${hits}/10 aciertos` };
  },
});

/* ===================== 17. Flujo ===================== */
def({
  id: 'motion', emoji: '🌪️', name: 'Flujo',
  desc: 'Una nube de puntos se agita: la mayoría al azar, pero unos pocos avanzan juntos en una dirección. Después, arrastra para señalar hacia dónde fluían.',
  async run(E, rng) {
    const N = 170, R = 190, cx = 400, cy = 245, coh = 0.24, sp = 120, th = rng.range(0, TAU);
    const spawn = () => { const r = R * Math.sqrt(Math.random()), a = Math.random() * TAU; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), life: 150 + Math.random() * 350 }; };
    const dots = Array.from({ length: N }, spawn);
    await E.countdown();
    let last = 0;
    await E.loop(ms => {
      const dt = Math.min(50, ms - last); last = ms;
      for (let i = 0; i < N; i++) {
        const d = dots[i]; d.life -= dt;
        if (d.life <= 0) { dots[i] = spawn(); continue; }
        const a = Math.random() < coh ? th : Math.random() * TAU;
        d.x += Math.cos(a) * sp * dt / 1000; d.y += Math.sin(a) * sp * dt / 1000;
        if (Math.hypot(d.x - cx, d.y - cy) > R) dots[i] = spawn();
      }
      E.paint(() => { E.ring(cx, cy, R + 8, C.ghost, 1); dots.forEach(d => E.dot(d.x, d.y, 2.6, C.ink)); });
      return ms < 2200;
    });
    let ang = null;
    const draw = hint => E.paint(() => {
      E.hint(hint); E.ring(cx, cy, R + 8, C.faint, 1); E.dot(cx, cy, 4, C.dim);
      if (ang !== null) E.arrow(cx, cy, cx + Math.cos(ang) * 160, cy + Math.sin(ang) * 160, C.you);
    });
    const HT = 'pulsa, desliza hacia la dirección y suelta';
    draw(HT);
    await E.drag(p => { if (dist(p, { x: cx, y: cy }) > 4) ang = Math.atan2(p.y - cy, p.x - cx); draw(HT); });
    if (ang === null) ang = th + Math.PI;
    let err = Math.abs(ang - th) % TAU; if (err > Math.PI) err = TAU - err; err /= D2R;
    draw(''); const prev = E.painter;
    E.paint(() => { prev(); E.arrow(cx, cy, cx + Math.cos(th) * 160, cy + Math.sin(th) * 160, C.truth); });
    return { score: E.lin(err, 4, 60), detail: `desviado ${Math.round(err)}°` };
  },
});

/* ===================== 18. Cuadrado ===================== */
def({
  id: 'square', emoji: '🔲', name: 'Cuadrado',
  desc: 'Estira o encoge el rectángulo hasta que sea un cuadrado perfecto. Está inclinado para ponértelo difícil. Pulsa, desliza y suelta para fijar.',
  async run(E, rng) {
    const th = rng.sign() * rng.range(12, 78) * D2R, w = rng.range(140, 230);
    const u = { x: Math.cos(th), y: Math.sin(th) }, v = { x: -Math.sin(th), y: Math.cos(th) };
    const O = { x: 400 - (u.x + v.x) * w / 2, y: 255 - (u.y + v.y) * w / 2 };
    let h = w * (rng.next() < 0.5 ? rng.range(0.55, 0.8) : rng.range(1.25, 1.45));
    const quad = h => [O, { x: O.x + u.x * w, y: O.y + u.y * w }, { x: O.x + u.x * w + v.x * h, y: O.y + u.y * w + v.y * h }, { x: O.x + v.x * h, y: O.y + v.y * h }];
    const draw = (hint, extra) => E.paint(() => {
      E.hint(hint); const q = quad(h);
      E.poly(q, 'rgba(230,237,243,.07)', C.ink, 2.5);
      E.line(q[2].x, q[2].y, q[3].x, q[3].y, C.you, 4);
      E.dot((q[2].x + q[3].x) / 2, (q[2].y + q[3].y) / 2, 7, C.you);
      extra && extra();
    });
    const HT = 'pulsa, desliza y suelta para fijar';
    draw(HT);
    await E.drag(p => { h = clamp((p.x - O.x) * v.x + (p.y - O.y) * v.y, 20, w * 1.8); draw(HT); });
    draw('', () => E.poly(quad(w), null, C.truth, 2, [6, 6]));
    const rel = Math.abs(h / w - 1);
    return { score: E.lin(rel, 0.01, 0.2), detail: `lados en proporción ${(h / w).toFixed(3)}` };
  },
});

/* ===================== 19. Flechas (Müller-Lyer) ===================== */
def({
  id: 'arrows', emoji: '🏹', name: 'Flechas',
  desc: 'Ajusta la línea de abajo hasta que mida exactamente lo mismo que la de arriba. Las puntas engañan. Pulsa, desliza y suelta para fijar.',
  async run(E, rng) {
    const L = rng.range(200, 320), topArrow = rng.next() < 0.5;
    const xs1 = rng.range(70, 730 - L), xs2 = rng.range(70, 270), y1 = 170, y2 = 330;
    let len = clamp(L * (rng.next() < 0.5 ? rng.range(0.65, 0.8) : rng.range(1.2, 1.35)), 40, 730 - xs2);
    const fin = 30, fa = 36 * D2R;
    const fig = (x, y, l, arrow, col) => {
      E.line(x, y, x + l, y, col, 3);
      const k = arrow ? 1 : -1;   // arrow: <—> (puntas hacia fuera); tails: >—<
      for (const s of [-1, 1]) {
        E.line(x, y, x + k * fin * Math.cos(fa), y + s * fin * Math.sin(fa), col, 3);
        E.line(x + l, y, x + l - k * fin * Math.cos(fa), y + s * fin * Math.sin(fa), col, 3);
      }
    };
    const draw = hint => E.paint(() => { E.hint(hint); fig(xs1, y1, L, topArrow, C.ink); fig(xs2, y2, len, !topArrow, C.you); E.dot(xs2 + len, y2, 6, C.you); });
    const HT = 'pulsa, desliza y suelta para fijar';
    draw(HT);
    await E.drag(p => { len = clamp(p.x - xs2, 20, 730 - xs2); draw(HT); });
    E.paint(() => {
      fig(xs1, y1, L, topArrow, C.faint); fig(xs2, y2, len, !topArrow, C.you);
      E.line(xs1, y1 + 40, xs1 + L, y1 + 40, C.truth, 3); E.line(xs2, y2 + 40, xs2 + L, y2 + 40, C.truth, 3);
      E.line(xs2 + L, y2 - 30, xs2 + L, y2 + 50, C.truth, 2, [4, 4]);
    });
    const rel = Math.abs(len - L) / L;
    return { score: E.lin(rel, 0.01, 0.25), detail: `${pctOff(len, L)} ${len > L ? 'más larga' : 'más corta'}` };
  },
});

/* ===================== 20. Oculta (Poggendorff) ===================== */
def({
  id: 'hidden', emoji: '🧱', name: 'Oculta',
  desc: 'Una línea diagonal pasa por detrás de una barra. Arrastra el tramo de la derecha arriba o abajo hasta que sea la continuación exacta del de la izquierda.',
  async run(E, rng) {
    const bw = rng.range(70, 150), bx1 = 400 - bw / 2 + rng.range(-40, 40), bx2 = bx1 + bw;
    const al = rng.range(25, 55) * D2R, s = rng.sign(), m = -s * Math.tan(al);   // pendiente en coordenadas de pantalla
    let yL, yT;
    for (let i = 0; i < 500; i++) { yL = rng.range(90, 410); yT = yL + m * bw; if (yT > 90 && yT < 410) break; }
    let yR = yT + rng.sign() * rng.range(40, 80);
    const seg = 220;
    const scene = (col) => {
      E.line(bx1 - seg, yL - m * seg, bx1, yL, C.ink, 3);
      E.line(bx2, yR, bx2 + seg, yR + m * seg, col, 3);
      E.rect(bx1, 44, bw, 436, '#26303a');
    };
    const HT = 'arrastra el tramo derecho arriba o abajo y suelta';
    E.paint(() => { scene(C.you); E.hint(HT); });
    let off = 0;
    await E.drag((p, ph) => { if (ph === 'down') off = p.y - yR; yR = clamp(p.y - off, 20, 480); E.paint(() => { scene(C.you); E.hint(HT); }); });
    E.paint(() => {
      scene(C.you);
      E.line(bx1 - seg, yL - m * seg, bx2 + seg, yT + m * seg, C.truth, 2, [6, 6]);
    });
    const perp = Math.abs(yR - yT) * Math.cos(al);
    return { score: E.lin(perp, 1.5, 30), detail: `desviada ${perp.toFixed(1)} px` };
  },
});

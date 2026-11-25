'use strict';
/* Pantallas y flujo del juego. */

const BRAND = 'PERCIBO';
const EPOCH = new Date(2026, 10, 25);   // día #1
const byId = Object.fromEntries(CHALLENGES.map(c => [c.id, c]));
const pad = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNumber = (d = new Date()) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5) + 1;
const dailySet = key => new RNG('daily:' + key).shuffle(CHALLENGES.slice()).slice(0, 5);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('percibo:' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('percibo:' + k, JSON.stringify(v)); } catch {} },
};

let runToken = 0;
const screen = () => $('#screen');
function show(which) { $('#screen').hidden = which !== 'screen'; $('#stage').hidden = which !== 'stage'; }
function setHeader(txt) { $('#hdr-no').textContent = txt || ''; }

function abortRun() { runToken++; E.cancelAll(); E.paint(null); }

/* ---------- Inicio ---------- */
function home() {
  abortRun(); show('screen');
  const key = dayKey(), no = dayNumber(), set = dailySet(key), done = store.get('daily:' + key);
  setHeader('#' + no);
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  screen().innerHTML = `
    <div class="home">
      <h1 class="logo">${BRAND}</h1>
      <div class="meta">#${no} · ${date}</div>
      <div class="emojis">${set.map(c => `<span title="${c.name}">${c.emoji}</span>`).join('')}</div>
      <p class="tag">Cinco pruebas de instinto perceptivo, elegidas cada día entre veinte. Dos minutos. Una puntuación.</p>
      ${done
        ? `<div class="done">Hoy: <b>${done.total}</b> / 500 · <span class="grade g-${done.grade}">${done.grade}</span></div>
           <button class="btn primary" data-a="see">Ver resultado</button>`
        : `<button class="btn primary big" data-a="play">Jugar</button>`}
      <div class="row">
        <button class="btn" data-a="all">Los 20 retos</button>
        <button class="btn" data-a="rand">Partida aleatoria</button>
      </div>
      <div class="foot">Todo se guarda solo en este navegador.</div>
    </div>`;
  const on = (a, fn) => { const b = $(`[data-a=${a}]`); b && b.addEventListener('click', fn); };
  on('play', () => play(set, { seed: 'daily:' + key, daily: key, title: `#${no}` }));
  on('see', () => results(done, { daily: key, title: `#${no}` }));
  on('all', catalog);
  on('rand', () => { const s = 'r' + Date.now(); play(new RNG(s).shuffle(CHALLENGES.slice()).slice(0, 5), { seed: s, title: 'aleatoria' }); });
  $('.btn.primary', screen())?.focus();
}

/* ---------- Catálogo ---------- */
function catalog() {
  abortRun(); show('screen'); setHeader('retos');
  const best = store.get('best', {});
  screen().innerHTML = `
    <div class="catalog">
      <h2>Los 20 retos</h2>
      <p class="sub">Practica cualquiera por separado. Tu mejor marca queda guardada.</p>
      <div class="cards">${CHALLENGES.map(c => `
        <button class="card" data-id="${c.id}">
          <span class="em">${c.emoji}</span><span class="nm">${c.name}</span>
          <span class="bs">${best[c.id] != null ? `mejor ${best[c.id]} <i class="grade g-${grade(best[c.id])}">${grade(best[c.id])}</i>` : '—'}</span>
        </button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" data-a="home">◂ Inicio</button>
        <button class="btn primary" data-a="marathon">Maratón: los 20 seguidos</button>
      </div>
    </div>`;
  screen().querySelectorAll('.card').forEach(b => b.addEventListener('click', () => {
    const s = 'p' + Date.now(); play([byId[b.dataset.id]], { seed: s, title: 'práctica', practice: true });
  }));
  $('[data-a=home]').addEventListener('click', home);
  $('[data-a=marathon]').addEventListener('click', () => { const s = 'm' + Date.now(); play(CHALLENGES.slice(), { seed: s, title: 'maratón' }); });
}

/* ---------- Partida ---------- */
function intro(ch, i, n) {
  show('screen');
  screen().innerHTML = `
    <div class="intro">
      ${n > 1 ? `<div class="kicker">RETO ${i + 1} DE ${n}</div>` : `<div class="kicker">PRÁCTICA</div>`}
      <h2><span class="em">${ch.emoji}</span> ${ch.name}</h2>
      <p>${ch.desc}</p>
      <button class="btn primary big">Listo</button>
    </div>`;
  const b = $('.intro .btn'); b.focus();
  return new Promise(res => b.addEventListener('click', res, { once: true }));
}

async function play(list, opts) {
  abortRun();
  const token = runToken, out = [];
  setHeader(opts.title);
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    await intro(ch, i, list.length);
    if (token !== runToken) return;
    show('stage'); document.activeElement?.blur();
    E.cancelAll(); E.paint(null); E.resize();
    let res;
    try { res = await ch.run(E, new RNG(opts.seed + ':' + ch.id)); }
    catch (err) { console.error(err); res = { score: 0, detail: 'error' }; }
    if (token !== runToken) return;
    E.cancelAll();
    const score = clamp(Math.round(res.score || 0), 0, 100);
    out.push({ id: ch.id, score, grade: grade(score), detail: res.detail });
    const best = store.get('best', {});
    if (best[ch.id] == null || score > best[ch.id]) { best[ch.id] = score; store.set('best', best); }
    E.chip(`<b>${score}</b> pts · <span class="grade g-${grade(score)}">${grade(score)}</span> · ${esc(res.detail)}`);
    const last = i === list.length - 1;
    await E.choice([{ label: last ? 'Ver resultado ▸' : 'Siguiente ▸', key: 'Enter', value: 1, cls: 'primary' }]);
    if (token !== runToken) return;
  }
  E.cancelAll();
  const total = out.reduce((s, r) => s + r.score, 0);
  const run = { total, max: out.length * 100, grade: grade(total / out.length), events: out, at: Date.now() };
  if (opts.daily) store.set('daily:' + opts.daily, run);
  results(run, opts);
}

/* ---------- Resultados ---------- */
function radar(events) {
  const n = events.length, cx = 160, cy = 150, R = 110;
  if (n < 3) return '';
  const P = (i, r) => { const a = -Math.PI / 2 + i / n * TAU; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const rings = [0.25, 0.5, 0.75, 1].map(k => `<polygon points="${events.map((_, i) => P(i, R * k).join(',')).join(' ')}" fill="none" stroke="rgba(230,237,243,.12)"/>`).join('');
  const spokes = events.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${P(i, R)[0]}" y2="${P(i, R)[1]}" stroke="rgba(230,237,243,.12)"/>`).join('');
  const poly = `<polygon points="${events.map((e, i) => P(i, R * e.score / 100).join(',')).join(' ')}" fill="rgba(63,198,255,.18)" stroke="#3fc6ff" stroke-width="2"/>`;
  const labels = n <= 8 ? events.map((e, i) => { const [x, y] = P(i, R + 22); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="18">${byId[e.id].emoji}</text>`; }).join('') : '';
  return `<svg class="radar" viewBox="0 0 320 300" role="img" aria-label="radar de puntuaciones">${rings}${spokes}${poly}${labels}</svg>`;
}

function results(run, opts) {
  abortRun(); show('screen');
  const single = run.events.length === 1, e0 = run.events[0];
  const shareText = `${BRAND} ${opts.title} · ${run.total}/${run.max} (${run.grade})\n` + run.events.map(e => `${byId[e.id].emoji} ${e.score}`).join(' · ');
  screen().innerHTML = `
    <div class="results">
      <div class="kicker">${single ? 'PRÁCTICA' : 'RESULTADO ' + esc(opts.title).toUpperCase()}</div>
      ${single
        ? `<h2>${byId[e0.id].emoji} ${byId[e0.id].name}</h2><div class="total"><b>${e0.score}</b><span>/ 100</span><i class="grade big g-${e0.grade}">${e0.grade}</i></div><p class="sub">${esc(e0.detail)}</p>`
        : `<div class="total"><b>${run.total}</b><span>/ ${run.max}</span><i class="grade big g-${run.grade}">${run.grade}</i></div>
           ${radar(run.events)}
           <ul class="list">${run.events.map(e => `
             <li><span class="em">${byId[e.id].emoji}</span><span class="nm">${byId[e.id].name}</span><span class="dt">${esc(e.detail)}</span>
             <span class="sc">${e.score}</span><i class="grade g-${e.grade}">${e.grade}</i></li>`).join('')}</ul>`}
      <div class="row">
        ${single ? `<button class="btn primary" data-a="again">Otra vez</button><button class="btn" data-a="all">Los 20 retos</button>`
                 : `<button class="btn primary" data-a="share">Copiar resultado</button><button class="btn" data-a="all">Los 20 retos</button>`}
        <button class="btn" data-a="home">Inicio</button>
      </div>
    </div>`;
  const on = (a, fn) => { const b = $(`[data-a=${a}]`); b && b.addEventListener('click', fn); };
  on('home', home); on('all', catalog);
  on('again', () => play([byId[e0.id]], { seed: 'p' + Date.now(), title: 'práctica', practice: true }));
  on('share', async () => {
    try { await navigator.clipboard.writeText(shareText); toast('Copiado'); }
    catch { toast('No se pudo copiar'); }
  });
}

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 1600);
}

/* ---------- Arranque ---------- */
document.addEventListener('DOMContentLoaded', () => {
  E.init();
  $('.brand').addEventListener('click', e => { e.preventDefault(); home(); });
  home();
});

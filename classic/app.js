(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mm = q => { try { return matchMedia(q).matches; } catch (e) { return false; } };
const UA = navigator.userAgent || '';
const RM = mm('(prefers-reduced-motion: reduce)');
const IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ANDROID = /Android/i.test(UA);
const IN_X = /Twitter for iP(hone|ad)|TwitterAndroid/i.test(UA);
const WEBVIEW = IN_X || /; wv\)/.test(UA) || (IOS && !/Safari\//.test(UA));
const LOW = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
const PHONE = /Android|iPhone|iPod/i.test(UA) || (mm('(hover: none)') && innerWidth < 760);
const root = document.documentElement;
root.classList.toggle('ios', IOS); root.classList.toggle('inx', IN_X); root.classList.toggle('webview', WEBVIEW);
try { history.scrollRestoration = 'manual'; } catch (e) {}
scrollTo(0, 0);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const S = window.SFX, Z = window.ZONES, EX = window.EXHIBITS, N = EX.length;
const URL_LIVE = 'https://maximusdigitals.github.io/brightwater/';
const hx = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = c => 'rgb(' + c.join(',') + ')';
// THE CURVE. Nothing moves for the first fifth of the route; after that it creeps, a percent or two per exhibit.
const D = p => Math.pow(clamp((p - .2) / .8), 1.6);
const pOf = i => i / (N - 1);

/* ====================== PIP ====================== */
function pipSVG(k = 0) { // k: 0 friendly ... 1 wrong (used only in the header, tiny steps)
  const mouthW = 9 + k * 6, eyeR = 4.2 - k * 1.6;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#e0892b"/><circle cx="24" cy="30" r="10" fill="#5e3a22"/><circle cx="76" cy="30" r="10" fill="#5e3a22"/><ellipse cx="50" cy="54" rx="34" ry="31" fill="#7a5032"/><ellipse cx="50" cy="66" rx="22" ry="17" fill="#e9cfa6"/><circle cx="37" cy="47" r="${eyeR + 1.4}" fill="#fffdf6"/><circle cx="63" cy="47" r="${eyeR + 1.4}" fill="#fffdf6"/><circle cx="38" cy="47.5" r="${eyeR}" fill="#1f1c17"/><circle cx="64" cy="47.5" r="${eyeR}" fill="#1f1c17"/><circle cx="36.6" cy="45.6" r="1.3" fill="#fff"/><circle cx="62.6" cy="45.6" r="1.3" fill="#fff"/><ellipse cx="50" cy="59" rx="6" ry="4" fill="#1f1c17"/><path d="M${50 - mouthW} 66 Q50 ${74 + k * 4} ${50 + mouthW} 66" fill="none" stroke="#1f1c17" stroke-width="2.6" stroke-linecap="round"/><path d="M28 64 l-14 -2 M28 68 l-14 3 M72 64 l14 -2 M72 68 l14 3" stroke="#1f1c17" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}
$('#gPip').innerHTML = pipSVG(0); $('#barPip').innerHTML = pipSVG(0);
let pipK = 0;

/* ====================== MAP ====================== */
const ZSEG = { A: [[60, 372], [250, 334]], B: [[236, 282], [64, 196]], C: [[72, 128], [318, 62]], D: [[366, 62], [540, 146]], E: [[542, 206], [384, 272]], F: [[318, 322], [560, 384]] };
const ZBOX = { A: [30, 300, 250, 100], B: [30, 160, 230, 136], C: [40, 22, 300, 128], D: [348, 22, 222, 152], E: [360, 182, 212, 112], F: [296, 302, 280, 102] };
const MPTS = []; (() => { const by = {}; EX.forEach((e, i) => (by[e.z] = by[e.z] || []).push(i)); Object.keys(ZSEG).forEach(z => { const [[x0, y0], [x1, y1]] = ZSEG[z], ids = by[z] || [], n = ids.length; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; ids.forEach((id, j) => { const t = n > 1 ? j / (n - 1) : .5, w = Math.sin(t * Math.PI * 3) * 16; MPTS[id] = [x0 + dx * t + nx * w, y0 + dy * t + ny * w]; }); }); })();
function mapSVG(state) {
  let s = `<svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg" font-family="Bungee, Impact, sans-serif">`;
  s += `<rect width="600" height="420" fill="#f2e8cc"/><path d="M250 190 Q300 150 350 190 Q380 240 320 262 Q260 270 250 230Z" fill="#9cc7cf"/><text x="300" y="218" font-size="11" text-anchor="middle" fill="#2c6470">BRIGHT WATER</text>`;
  for (let i = 0; i < 26; i++) { const x = (i * 97) % 580 + 10, y = (i * 61) % 400 + 10; s += `<circle cx="${x}" cy="${y}" r="${5 + (i % 3) * 2}" fill="#9fbf86" opacity=".5"/>`; }
  Object.keys(ZBOX).forEach(z => { const [x, y, w, h] = ZBOX[z], c = Z[z].col; s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${c}" opacity=".16" stroke="${c}" stroke-width="2" stroke-dasharray="${z === 'F' ? '6 5' : '0'}"/><text x="${x + 12}" y="${y + 20}" font-size="12" fill="${c}">${Z[z].name.toUpperCase()}</text>`; });
  s += `<path d="M30 404 L${MPTS.map(p => p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join(' L')} L586 404" fill="none" stroke="#1f1c17" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`;
  s += `<text x="20" y="414" font-size="10" fill="#1f1c17">GATE</text><text x="548" y="414" font-size="10" fill="#0f6b3a">EXIT</text>`;
  MPTS.forEach((p, i) => {
    const st = state ? (i < state.cur ? 'v' : i === state.cur ? 'y' : 'a') : 'a', empty = state && i <= state.cur && (EX[i].cage === 'empty');
    const fill = st === 'v' ? (empty ? '#f2e8cc' : '#1f1c17') : st === 'y' ? '#8f2a22' : '#f2e8cc';
    s += `<circle class="mdot" data-i="${i}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${st === 'y' ? 8 : 6}" fill="${fill}" stroke="#1f1c17" stroke-width="2"/>`;
  });
  if (state) {
    const p = MPTS[state.cur]; s += `<text x="${p[0].toFixed(0)}" y="${(p[1] - 14).toFixed(0)}" font-size="11" text-anchor="middle" fill="#8f2a22">${state.lateYou ? 'STILL HERE' : 'YOU'}</text>`;
    if (state.fol != null && state.fol >= 0) { const q = MPTS[state.fol]; s += `<circle cx="${(q[0] + 6).toFixed(1)}" cy="${(q[1] + 7).toFixed(1)}" r="5" fill="#1f1c17" opacity="${state.folA.toFixed(2)}"/>`; }
  }
  return s + `</svg>`;
}
$('#heroMap').innerHTML = mapSVG(null);

/* ====================== BUILD THE ROUTE ====================== */
const IUCN = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC'], IUCNL = { CR: 'Critically endangered', EN: 'Endangered', VU: 'Vulnerable', NT: 'Near threatened', LC: 'Least concern' };
const KIND = { A: 'moat', B: 'glass', C: 'bamboo', D: 'glass', E: 'glass', F: 'bars' };
const LURK = { 28: [196, 40, '#f3d36b'], 30: [24, 56, '#f3d36b'], 32: [200, 30, '#ffd25a'], 34: [18, 40, '#e4f05a'], 36: [206, 120, '#ffd25a'], 38: [16, 70, '#ff5a3a'], 39: [190, 36, '#e4f05a'], 41: [28, 44, '#ff3b2a'], 43: [200, 60, '#ffd25a'], 44: [20, 34, '#ff5a3a'], 45: [196, 50, '#b49cff'], 46: [24, 66, '#ffd25a'], 47: [204, 40, '#ff3b2a'], 48: [16, 44, '#ffd25a'] };
const ESC = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const t0 = Date.now();
function feedTime(i) { const m = 600 + pOf(i) * 478 + 35; const h = Math.floor(m / 60), mi = Math.floor(m % 60 / 5) * 5; return ((h % 12) || 12) + ':' + String(mi).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); }
function tagFor(e, i, dk) {
  if (e.cage === 'none') return ['Staff', 'warn'];
  if (e.cage === 'open-you') return ['Occupied', 'warn'];
  if (e.cage === 'empty') return [dk > .8 ? 'Do not look for it' : 'Temporarily off display', 'warn'];
  if (e.cage === 'ajar') return ['Door fault reported', 'warn'];
  if (dk > .55) return ['Feeding cancelled', ''];
  return ['Feeding ' + feedTime(i), ''];
}
function trail(i) { // the path between exhibits: your shoes, then something else's
  const dk = D(pOf(i)); let s = '', n = 9;
  for (let k = 0; k < n; k++) { const x = 4 + k * 11, y = k % 2 ? 12 : 30; s += `<i style="left:${x}%;top:${y}px;transform:rotate(80deg)"></i>`; }
  const paws = Math.round(clamp((dk - .2) / .7) * 6);
  for (let k = 0; k < paws; k++) { const x = 18 + k * 12, y = k % 2 ? 6 : 34; s += `<i class="paw" style="left:${x}%;top:${y}px;opacity:${(.5 + dk * .5).toFixed(2)}"></i>`; }
  if (dk > .7) for (let k = 0; k < Math.round((dk - .7) * 12); k++) s += `<i class="claw" style="left:${30 + k * 14}%;top:${k % 2 ? 4 : 28}px"></i>`;
  return `<div class="trail" aria-hidden="true">${s}</div>`;
}
function exhibitHTML(e, i) {
  const p = pOf(i), dk = D(p), zc = Z[e.z].col, card = rgb(mix(hx('#fbf5e6'), hx('#d6c9a8'), dk * .85));
  const wear = clamp((dk - .12) / .8) * .95, kind = (e.cage === 'ajar' || e.cage === 'empty') ? 'bars' : KIND[e.z];
  const enc = 'enc k-' + kind + (e.cage === 'ajar' ? ' ajar' : '') + (e.cage === 'empty' ? ' empty' : '');
  const lk = LURK[i] ? [...LURK[i], clamp((dk - .3) * 1.6)] : null;
  const art = ART.draw(e.a, { id: 'e' + i, zone: Z[e.z].key, dk, empty: e.cage === 'empty', oddShadow: e.odd, lurk: lk });
  const [tg, tw] = tagFor(e, i, dk);
  let status = '';
  if (e.t === 'real') status = `<div class="iucn" aria-label="Conservation status: ${IUCNL[e.st]}">${IUCN.map(c => `<i class="${c === e.st ? 'on' : ''}">${c}</i>`).join('')}</div><p class="iucn-l">IUCN Red List: ${IUCNL[e.st]}</p>`;
  else status = `<span class="badge">${ESC(e.st)}</span>`;
  const facts = e.f.map(([k, v]) => { let vv = ESC(v).replace('{elapsed}', '<span class="elapsed">just arrived</span>'); if (e.scrawl && e.scrawl[0] === k) vv = `<s>${ESC(v)}</s><span class="hw">${ESC(e.scrawl[2])}</span>`; return `<dt>${ESC(k)}</dt><dd>${vv}</dd>`; }).join('');
  const kind2 = e.t === 'real' ? 'Animal' : e.t === 'anime' ? 'Spirit Grove resident' : e.t === 'monster' ? 'Quarantine Wing' : 'Final exhibit';
  const sig = dk < .5 ? 'J. Marsh, keeper' : dk < .8 ? 'J. M.' : dk < .95 ? 'J' : '';
  const day = new Date(), ds = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const feedLbl = e.t === 'you' ? 'Wave' : 'Feed';
  return `<article class="ex" id="ex-${i + 1}" data-i="${i}" style="--zc:${zc}">
  <div class="ex-no"><b>${String(i + 1).padStart(2, '0')}</b><span>${Z[e.z].name} · ${kind2}</span><span class="ln"></span><span>${i + 1} / ${N}</span></div>
  <figure class="${enc}" data-i="${i}" role="button" tabindex="0" aria-label="Tap ${ESC(e.n)}">
    <div class="art">${art}</div><div class="bars">${kind === 'bars' ? '<i class="wall"></i><i class="door"></i>' : ''}</div><div class="fx"></div>
    <span class="tag ${tw}">${tg}</span><span class="tap">${e.cage === 'empty' ? 'Tap the dark' : 'Tap to say hi'}</span>
  </figure>
  <div class="plac"><div class="pin">
    <div class="face front" style="--card:${card};--wear:${wear.toFixed(2)};background:${card}">
      <div class="zb"><span>${Z[e.z].name}</span><span>Nº ${String(i + 1).padStart(2, '0')}</span></div>
      <div class="bd"><h2>${ESC(e.n)}</h2><p class="sci">${ESC(e.sci)}</p>${status}<dl class="facts">${facts}</dl><p class="hist">${ESC(e.h)}</p>
      <div class="acts"><button class="pri feed" data-i="${i}">${feedLbl}</button><button class="flipb" data-i="${i}">Keeper’s log</button><span class="fed" data-i="${i}"></span></div></div>
      <div class="wear"></div>
    </div>
    <div class="face back"><p class="log-h"><span>Keeper’s log · Nº ${String(i + 1).padStart(2, '0')}</span><span>${ds}</span></p><p class="log-t">${ESC(e.note)}</p><p class="log-sig">${sig ? '— ' + sig : ''}</p><button class="flipb" data-i="${i}">Turn back</button></div>
  </div></div>
  <button class="btn next" data-go="${i + 1}">${i + 1 < N ? 'Next exhibit →' : 'To the exit →'}</button>
</article>${i + 1 < N ? trail(i) : ''}`;
}
function zoneHTML(zk, firstI) {
  const z = Z[zk], dk = D(pOf(firstI)); let sub = ESC(z.sub);
  if (zk === 'D') sub = 'Please let your eyes adjust. <s>Lights on a timer</s>';
  if (zk === 'E') sub = 'Do not tap on the glass. Mind the wet floor.';
  if (zk === 'F') sub = '<s>Staff only beyond this point</s><span class="hw">everyone welcome now</span>';
  const arrow = { A: '→', B: '↗', C: '↑', D: '→', E: '↘', F: '↓' }[zk];
  return `<section class="zone" style="--zc:${z.col}" data-z="${zk}"><div class="post"><span class="pl">${zk}</span><div class="pr"><span class="zl">Zone ${zk}${dk > .6 ? ' · after hours' : ''}</span><h3>${ESC(z.sign)}</h3></div><span class="arrow">${arrow}</span></div><p class="zs">${sub}</p></section>`;
}
(() => { let h = '', lastZ = ''; EX.forEach((e, i) => { if (e.z !== lastZ) { h += zoneHTML(e.z, i); lastZ = e.z; } h += exhibitHTML(e, i); }); $('#route').innerHTML = h; })();
const ARTS = $$('.ex');

/* ====================== PROGRESS & THE SLOW DARK ====================== */
// background colour stops by route position. The first 15 exhibits barely move.
const BG = [[0, '#f3ead3'], [.3, '#f1e4c3'], [.45, '#eed7a6'], [.56, '#e4bf86'], [.64, '#c8946c'], [.72, '#8a6672'], [.8, '#4a3a52'], [.88, '#231d2c'], [.95, '#110e16'], [1, '#09080b']].map(([p, c]) => [p, hx(c)]);
const bgAt = p => { for (let i = 1; i < BG.length; i++) if (p <= BG[i][0]) { const [a, ca] = BG[i - 1], [b, cb] = BG[i]; const k = (p - a) / (b - a); const s = k * k * (3 - 2 * k); return mix(ca, cb, s); } return BG[BG.length - 1][1]; };
const lum = c => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;
let tops = [], heroBottom = 0;
function measure() { tops = ARTS.map(a => a.getBoundingClientRect().top + scrollY); heroBottom = $('#hero').getBoundingClientRect().bottom + scrollY; }
let p = 0, maxP = 0, cur = -1, d = 0, started = false, scared = false, lastQ = -1;
const themeMeta = $('meta[name="theme-color"]');
function progress() {
  if (!tops.length) return 0; const y = scrollY + innerHeight * .55;
  if (y < tops[0]) return 0; for (let i = 0; i < N - 1; i++) if (y < tops[i + 1]) return (i + (y - tops[i]) / (tops[i + 1] - tops[i])) / (N - 1);
  return 1;
}
function paint() {
  p = clamp(progress()); if (p > maxP) maxP = p; d = D(p);
  const c = Math.min(N - 1, Math.floor(p * (N - 1) + 1e-6)); if (scrollY + innerHeight * .55 >= (tops[0] || 1e9)) { if (c !== cur) { cur = c; onExhibit(c); } }
  const q = Math.round(p * 400); if (q === lastQ) return; lastQ = q;
  const bg = bgAt(p), L = lum(bg), k = clamp((.5 - L) / .22), fg = mix(hx('#1f1c17'), hx('#e9dfc9'), k);
  root.style.setProperty('--bg', rgb(bg)); root.style.setProperty('--fg', rgb(fg));
  root.style.setProperty('--vig', (Math.pow(clamp((d - .18) / .82), 1.25) * .95).toFixed(3));
  root.style.setProperty('--sh', (.55 + d * .75).toFixed(3));
  if (themeMeta) themeMeta.setAttribute('content', rgb(bg));
  S.setDread(d);
  eyesPaint();
  const pk = Math.round(clamp((d - .55) / .45) * 4) / 4; if (pk !== pipK) { pipK = pk; $('#barPip').innerHTML = pipSVG(pk); }
}
let raf = 0; addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); steps(); }, { passive: true });
addEventListener('resize', () => { measure(); lastQ = -1; paint(); }, { passive: true });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); lastQ = -1; paint(); });
addEventListener('load', () => { measure(); paint(); });

// park clock + visitor counter: they only go one way
const fmtT = m => { const h = Math.floor(m / 60) % 24, mi = Math.floor(m % 60); return ((h % 12) || 12) + ':' + String(mi).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); };
let shownVis = 2314;
setInterval(() => {
  if (scared) return;
  const mins = 600 + maxP * 478 + (started ? Math.min(20, (Date.now() - t0) / 60000) * 0 : 0);
  $('#clock').textContent = fmtT(mins);
  $('#closes').textContent = maxP > .985 ? 'Gates closed' : maxP > .93 ? 'Closing now' : 'Gates close 6 pm';
  const target = Math.max(1, Math.round(2314 * Math.pow(1 - maxP, 1.8))); if (maxP > .97) shownVis = 1; else shownVis += Math.sign(target - shownVis) * Math.max(1, Math.round(Math.abs(target - shownVis) / 6));
  $('#visitors').textContent = shownVis.toLocaleString('en-GB');
  const el = $('.elapsed'); if (el) { const s = Math.round((Date.now() - t0) / 1000); el.textContent = Math.floor(s / 60) + ' min ' + (s % 60) + ' s'; }
}, 400);

/* ====================== EYES IN THE DARK ====================== */
const EYES = [[.04, .2, .38, 0], [.86, .14, .46, 1], [.06, .78, .52, 0], [.9, .7, .58, 1], [.46, .9, .64, 0], [.18, .5, .7, 1], [.78, .42, .74, 0], [.6, .1, .8, 1], [.3, .86, .84, 1], [.92, .9, .88, 0], [.02, .4, .9, 1], [.7, .62, .93, 0]];
const eyesEl = $('#eyes');
EYES.forEach(([x, y, th, red], i) => { const e = document.createElement('div'); e.className = 'ep' + (red ? ' red' : ''); e.style.left = (x * 100) + '%'; e.style.top = (y * 100) + '%'; e.innerHTML = '<i></i><i></i>'; e.querySelectorAll('i').forEach(j => j.style.animationDelay = (i * .7) + 's'); eyesEl.appendChild(e); e.addEventListener('click', () => { e.classList.add('shut'); S.whisper(x * 2 - 1, .9, .08); setTimeout(() => { e.style.left = (Math.random() * 90) + '%'; e.style.top = (10 + Math.random() * 80) + '%'; e.classList.remove('shut'); }, 2600); }); });
function eyesPaint() { $$('.ep', eyesEl).forEach((e, i) => { const th = EYES[i][2]; e.style.opacity = clamp((d - th) / .12).toFixed(2); e.style.pointerEvents = d > th ? 'auto' : 'none'; }); }

/* ====================== LIGHTS FLICKER (dims only, never more than ~2 a second) ====================== */
const dimEl = $('#dim');
(function flick() {
  setTimeout(flick, 700 + Math.random() * (6000 - d * 4500));
  if (RM || !started || scared || d < .45) return;
  if (Math.random() > (d - .4) * 1.1) return;
  const v = (.1 + (d - .45) * .5).toFixed(2); dimEl.style.opacity = v; setTimeout(() => { dimEl.style.opacity = 0; }, 90 + Math.random() * 90);
  if (Math.random() < .3) setTimeout(() => { dimEl.style.opacity = v; setTimeout(() => dimEl.style.opacity = 0, 70); }, 300);
})();

/* ====================== FOOTSTEPS THAT KEEP PACE ====================== */
let moved = 0, lastSY = 0, stopT = 0;
function steps() {
  const y = scrollY, dy = Math.abs(y - lastSY); lastSY = y; if (!S.on || scared || d < .58) return;
  moved += dy; if (moved > 300) { moved = 0; S.step((Math.random() - .5) * .5, 0, .05 + (d - .58) * .35); }
  clearTimeout(stopT); stopT = setTimeout(() => { if (Math.random() < .55 && d > .64) S.step((Math.random() - .5) * .4, .35, .04 + (d - .6) * .3); }, 160);
}

/* ====================== EXHIBIT INTERACTIONS ====================== */
const CUTE = { anime: ['bzz!', 'nya~', '☆', 'hai!', '♪', 'mochi!', 'pon!', '♥'], real: ['♥', '!', '♪'] };
const CREEP = ['don’t go further', 'they’re out', 'it’s counting', 'you should have left', 'behind you', 'stay with us', 'closing time', 'don’t show it your ticket'];
const taps = {};
function bubble(enc, txt, x = 50, y = 30) { const b = document.createElement('span'); b.className = 'bub2'; b.textContent = txt; b.style.left = x + '%'; b.style.top = y + '%'; $('.fx', enc).appendChild(b); setTimeout(() => b.remove(), 950); }
function tapExhibit(enc) {
  const i = +enc.dataset.i, e = EX[i], dk = D(pOf(i)); taps[i] = (taps[i] || 0) + 1; enc.classList.add('tapped'); S.kick();
  const pan = 0;
  if (e.cage === 'empty') { S.voice(e.snd, Math.min(1, dk + .3), Math.random() < .5 ? -.8 : .8); if (dk > .6) bubble(enc, '…', 18 + Math.random() * 64, 30); const l = $('.lurk', enc); if (l) { l.style.opacity = 1; } return; }
  if (e.t === 'you') { enc.classList.add('stare'); S.heart(3); S.whisper(.6, 1.4, .12); bubble(enc, taps[i] > 1 ? 'turn around' : 'that’s you', 50, 16); return; }
  if (dk > .55) {
    enc.classList.remove('hop'); enc.classList.add('stare'); S.voice(e.snd, dk, pan);
    if (taps[i] > 1 && e.t !== 'real') bubble(enc, CREEP[(i + taps[i]) % CREEP.length], 50, 18);
    else if (taps[i] > 2) S.whisper(Math.random() * 2 - 1, 1, .1);
    return;
  }
  enc.classList.remove('hop'); void enc.offsetWidth; enc.classList.add('hop'); S.voice(e.snd, dk, pan);
  const pool = e.t === 'anime' ? CUTE.anime : CUTE.real; bubble(enc, e.t === 'anime' && dk > .3 && taps[i] > 2 ? '…why are you still here' : pool[(i + taps[i]) % pool.length], 54, 22);
}
const fed = {};
function feed(i, btn) {
  const e = EX[i], enc = $('#ex-' + (i + 1) + ' .enc'), fx = $('.fx', enc), dk = D(pOf(i)); fed[i] = (fed[i] || 0) + 1; S.kick();
  if (e.t === 'you') { S.heart(2); toast(dk > .9 ? 'Something waves back.' : 'You wave.'); return; }
  S.feed(); const h = enc.clientHeight;
  for (let k = 0; k < 7; k++) { const pl = document.createElement('i'); pl.className = 'pel'; pl.style.left = (28 + Math.random() * 44) + '%'; pl.style.top = '-10px'; pl.style.setProperty('--dy', (h * .8 + Math.random() * 10) + 'px'); pl.style.animationDelay = (k * .05) + 's'; fx.appendChild(pl); setTimeout(() => { pl.classList.add('gone'); setTimeout(() => pl.remove(), 300); }, e.cage === 'empty' ? 1100 : 1700 + Math.random() * 600); }
  if (e.cage === 'empty') setTimeout(() => { S.voice('growl', .9, .7); toast(dk > .85 ? 'Something took it. It wants more.' : 'Something in the dark took it.'); }, 1050);
  else if (!(dk > .55)) setTimeout(() => { enc.classList.remove('hop'); void enc.offsetWidth; enc.classList.add('hop'); S.voice(e.snd, dk); }, 700);
  else setTimeout(() => S.voice(e.snd, dk), 700);
  const lbl = $('.fed[data-i="' + i + '"]'); lbl.textContent = (dk > .7 ? 'Fed ' + fed[i] + '. Still hungry.' : 'Fed today: ' + (fed[i] + (dk < .4 ? 41 + i * 3 : 0)));
}
document.addEventListener('click', ev => {
  const t = ev.target;
  const enc = t.closest('.enc'); if (enc) { tapExhibit(enc); return; }
  const fb = t.closest('.feed'); if (fb) { feed(+fb.dataset.i, fb); return; }
  const fl = t.closest('.flipb'); if (fl) { const pl = fl.closest('.plac'); pl.classList.toggle('flip'); S.ui(); const i = +fl.dataset.i; if (pl.classList.contains('flip') && D(pOf(i)) > .5) setTimeout(() => S.whisper(.3, 1, .07), 500); return; }
  const nx = t.closest('[data-go]'); if (nx) { goTo(+nx.dataset.go); S.ui(); return; }
});
document.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('enc')) { ev.preventDefault(); tapExhibit(ev.target); } });
function goTo(i) { const el = i >= N ? $('#exit') : ARTS[i]; const y = el.getBoundingClientRect().top + scrollY - (i >= N ? 0 : 70); smooth(y); }
function smooth(y) { const y0 = scrollY, dy = y - y0, t0 = performance.now(), dur = Math.min(1100, 400 + Math.abs(dy) * .4); const f = now => { const k = clamp((now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, y0 + dy * e); if (k < 1 && !scared) requestAnimationFrame(f); }; requestAnimationFrame(f); }
let toastT = 0; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }
function onExhibit(i) { if (d > .7) warm(); }

/* ====================== MAP OVERLAY ====================== */
function openMap() {
  const dd = D(pOf(Math.max(0, cur))), folA = clamp((dd - .38) / .4) * .85;
  const fol = folA > 0 ? Math.max(0, cur - Math.max(1, Math.round(6 * (1 - dd)))) : null;
  $('#mapSvg').innerHTML = mapSVG({ cur: Math.max(0, cur), fol, folA, lateYou: dd > .85 });
  $('#mapHint').textContent = cur < 0 ? 'Start at the gate' : dd > .85 ? 'You are still here. So is it.' : dd > .6 ? 'You are here. Stay on the path.' : 'You are here: ' + EX[cur].n;
  $('#map').hidden = false; S.ui();
}
$('#mapBtn').addEventListener('click', openMap);
$('#mapX').addEventListener('click', () => { $('#map').hidden = true; });
$('#map').addEventListener('click', ev => { if (ev.target.id === 'map') { $('#map').hidden = true; return; } const dot = ev.target.closest('.mdot'); if (!dot) return; const i = +dot.dataset.i; if (i <= Math.max(cur, 0)) { $('#map').hidden = true; goTo(i); } else toast(D(maxP) > .7 ? 'No. Keep walking.' : 'One way round, please. Follow the paw prints.'); });

/* ====================== GATE ====================== */
const toured = LS.get('bw.toured') === '1';
if (toured) $('#skipRun').hidden = false;
$('#tNo').textContent = String(10000 + Math.floor(Math.random() * 89999));
(() => { let t = ''; if (IN_X && IOS) t = navigator.audioSession ? 'iPhone: turn your volume up.' : 'iPhone: flip the ringer switch on and turn the volume up.'; else if (IN_X) t = 'Turn your volume up.'; if (t) { const h = $('#hint'); h.textContent = t; h.hidden = false; } })();
function reveal() {
  const gate = $('#gate');
  if (gate) {
    gate.classList.add('gone');
    gate.style.pointerEvents = 'none';
    try { gate.setAttribute('aria-hidden', 'true'); } catch (e) {}
    setTimeout(() => { try { if (gate.classList.contains('gone')) gate.style.display = 'none'; } catch (e) {} }, 750);
  }
  document.body.classList.remove('locked');
  try { document.body.style.height = ''; } catch (e) {}
  root.classList.remove('noscroll');
}
function begin(sound) {
  const first = !started;
  started = true;
  reveal();
  try {
    if (sound) S.unlock();
    else { const b = $('#sndBtn'); if (b) b.classList.add('off'); }
  } catch (e) {}
  if (first) setTimeout(() => { try { measure(); lastQ = -1; paint(); } catch (e) {} }, 60);
}
window.__bwBegin = begin;
if (window.__bwBegan) begin(window.__bwWantSound);
$('#enter').addEventListener('click', () => begin(true));
$('#enterQuiet').addEventListener('click', () => begin(false));
$('#skipRun').addEventListener('click', () => { started = true; scared = true; reveal(); try { S.unlock(); } catch (e) {} try { warm(); runNow(true); } catch (e) {} });
$('#sndBtn').addEventListener('click', () => {
  const b = $('#sndBtn');
  if (!S.on) { S.unlock(); b.classList.remove('off'); lastQ = -1; paint(); return; }
  const off = !b.classList.contains('off'); b.classList.toggle('off', off); S.A.master.gain.setTargetAtTime(off ? 0 : .9, S.A.ac.currentTime, .05);
});

/* ====================== THE SCARE ====================== */
function pipHorror() {
  const rnd = (() => { let r = 7; return () => (r = (r * 9301 + 49297) % 233280) / 233280; })();
  let fur = ''; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, rr = 182 + rnd() * 26; fur += (i ? 'L' : 'M') + (200 + Math.cos(a) * rr * 1.02).toFixed(0) + ' ' + (214 + Math.sin(a) * rr * .98).toFixed(0); }
  let up = '', lo = ''; for (let i = 0; i < 17; i++) { const x = 66 + i * 16.8, y = 262 + Math.sin(i / 16 * Math.PI) * 26; up += `<path d="M${x - 8} ${y - 2} L${x} ${y + 30 + rnd() * 16} L${x + 8} ${y - 2}Z" fill="#efe6cf"/>`; }
  for (let i = 0; i < 14; i++) { const x = 92 + i * 16.5, y = 352 - Math.sin(i / 13 * Math.PI) * 10; lo += `<path d="M${x - 8} ${y + 2} L${x} ${y - 26 - rnd() * 12} L${x + 8} ${y + 2}Z" fill="#e3d8bc"/>`; }
  let veins = ''; [[128, 168, 58], [282, 156, 66]].forEach(([cx, cy, r]) => { for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI * 2; veins += `<path d="M${(cx + Math.cos(a) * r * .95).toFixed(0)} ${(cy + Math.sin(a) * r * .95).toFixed(0)} Q${(cx + Math.cos(a + .3) * r * .6).toFixed(0)} ${(cy + Math.sin(a + .3) * r * .6).toFixed(0)} ${(cx + Math.cos(a) * r * .3).toFixed(0)} ${(cy + Math.sin(a) * r * .3).toFixed(0)}" stroke="#a3221a" stroke-width="1.6" fill="none"/>`; } });
  let drips = ''; [[96, 330, 60], [150, 368, 46], [252, 370, 70], [318, 326, 52]].forEach(([x, y, l]) => { drips += `<path d="M${x - 5} ${y} Q${x} ${y + l * .6} ${x - 1} ${y + l} Q${x + 4} ${y + l + 8} ${x + 5} ${y + l} Q${x + 3} ${y + l * .5} ${x + 7} ${y}Z" fill="#5e0905"/>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="1200" height="1200"><defs><radialGradient id="v" cx="50%" cy="48%" r="58%"><stop offset="50%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".97"/></radialGradient><radialGradient id="sc" cx="45%" cy="45%" r="55%"><stop offset="0" stop-color="#f7f0d6"/><stop offset=".7" stop-color="#e2d3a6"/><stop offset="1" stop-color="#8f7a4f"/></radialGradient><radialGradient id="sk" cx="50%" cy="50%" r="50%"><stop offset=".6" stop-color="#0d0503"/><stop offset="1" stop-color="#0d0503" stop-opacity="0"/></radialGradient><radialGradient id="fc" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#5a3620"/><stop offset="1" stop-color="#1e0f07"/></radialGradient><radialGradient id="mo" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#3d0503"/><stop offset="1" stop-color="#080000"/></radialGradient><filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .05  0 0 0 0 .02  0 0 0 0 0  0 0 0 .6 0"/></filter></defs><rect width="400" height="400" fill="#030202"/><circle cx="70" cy="54" r="44" fill="#22120a"/><circle cx="334" cy="48" r="48" fill="#22120a"/><circle cx="70" cy="54" r="20" fill="#4a1410"/><circle cx="334" cy="48" r="22" fill="#4a1410"/><path d="${fur}Z" fill="url(#fc)"/><ellipse cx="200" cy="300" rx="150" ry="96" fill="#6e5639"/>`
    + `<ellipse cx="128" cy="170" rx="80" ry="82" fill="url(#sk)"/><ellipse cx="282" cy="158" rx="88" ry="92" fill="url(#sk)"/><ellipse cx="128" cy="168" rx="58" ry="60" fill="url(#sc)"/><ellipse cx="282" cy="156" rx="66" ry="70" fill="url(#sc)"/>${veins}<circle cx="134" cy="172" r="7" fill="#000"/><circle cx="277" cy="160" r="5.5" fill="#000"/><circle cx="134" cy="172" r="13" fill="none" stroke="#6a0f0a" stroke-width="3"/><circle cx="277" cy="160" r="11" fill="none" stroke="#6a0f0a" stroke-width="3"/>`
    + `<path d="M178 212 L222 212 L200 238Z" fill="#0c0806"/><path d="M50 256 Q200 228 350 256 Q330 400 200 392 Q70 400 50 256Z" fill="url(#mo)"/><path d="M50 256 Q200 228 350 256 Q200 278 50 256Z" fill="#7a150f"/>${up}${lo}${drips}<path d="M120 330 Q122 360 118 392 M260 322 Q262 352 258 384" stroke="#d8cdb4" stroke-width="2" opacity=".5" fill="none"/><rect width="400" height="400" filter="url(#gr)" opacity=".55"/><rect width="400" height="400" fill="url(#v)"/></svg>`;
}
function keeperHorror() {
  let teeth = ''; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, x = 200 + Math.cos(a) * 44, y = 300 + Math.sin(a) * 74; teeth += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} L${(200 + Math.cos(a) * 24).toFixed(0)} ${(300 + Math.sin(a) * 46).toFixed(0)} L${(200 + Math.cos(a + .14) * 44).toFixed(0)} ${(300 + Math.sin(a + .14) * 74).toFixed(0)}Z" fill="#e9e1cf"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="1200" height="1200"><defs><radialGradient id="g" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#d9d3c4"/><stop offset="1" stop-color="#7d786c"/></radialGradient><radialGradient id="v2" cx="50%" cy="50%" r="62%"><stop offset="50%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".97"/></radialGradient></defs><rect width="400" height="400" fill="#020202"/>`
    + `<path d="M108 120 Q200 60 292 120 L276 380 Q200 420 124 380Z" fill="url(#g)"/><path d="M84 116 Q200 -10 316 116Z" fill="#2b3a34"/><rect x="70" y="106" width="260" height="22" rx="6" fill="#1a241f"/><circle cx="200" cy="80" r="13" fill="#d8b441"/><text x="200" y="86" font-size="16" text-anchor="middle" font-family="Georgia" fill="#2b3a34">B</text>`
    + `<ellipse cx="152" cy="196" rx="34" ry="44" fill="#040303"/><ellipse cx="248" cy="196" rx="34" ry="44" fill="#040303"/><circle cx="156" cy="204" r="4" fill="#f4efe6"/><circle cx="244" cy="204" r="4" fill="#f4efe6"/><path d="M130 250 Q140 270 136 300 M270 250 Q260 270 264 300" stroke="#5b564c" stroke-width="5" fill="none" opacity=".6"/>`
    + `<ellipse cx="200" cy="300" rx="46" ry="78" fill="#120202"/>${teeth}<ellipse cx="200" cy="300" rx="20" ry="40" fill="#000"/><rect width="400" height="400" fill="url(#v2)"/></svg>`;
}
const svgURL = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const IMG1 = svgURL(pipHorror()), IMG2 = svgURL(keeperHorror());
let warmed = false;
function warm() {
  if (warmed) return; warmed = true; const sc = $('#scare'), a = $('.s1', sc), b = $('.s2', sc); a.src = IMG1; b.src = IMG2;
  [a, b].forEach(i => { try { i.decoding = 'sync'; } catch (e) {} if (i.decode) i.decode().catch(() => {}); });
  sc.classList.add('warm'); if (window.RUN) RUN.prep();
}
const noTouch = ev => { if (ev.cancelable && !ev.target.closest('#over')) ev.preventDefault(); };
let trigY = 0; const setTrig = () => { const t = $('#trigger'); trigY = t.getBoundingClientRect().top + scrollY; }; addEventListener('load', setTrig); addEventListener('resize', setTrig, { passive: true });
new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && started && !scared) scare(); }), { threshold: 0 }).observe($('#trigger'));
addEventListener('scroll', () => { if (started && !scared && trigY && scrollY + innerHeight > trigY + 2) scare(); if (started && !warmed && maxP > .7) warm(); }, { passive: true });
async function scare() {
  if (scared || !started) return; scared = true; warm(); S.kick();
  LS.set('bw.toured', '1');
  root.classList.add('noscroll'); try { addEventListener('touchmove', noTouch, { passive: false }); } catch (e) {}
  $('#clock').textContent = '6:00 pm'; $('#closes').textContent = 'Gates closed'; $('#visitors').textContent = '1';
  S.hushAll(1.2); document.title = 'Brightwater Zoo — closed';
  const cl = $('#close'); cl.classList.add('on');
  await sleep(2600);
  $('#closeT').innerHTML = 'The gardens are now closed.<br>Pip will see you out.';
  S.giggle(-.6); await sleep(900); S.heart(2, 0, .5); await sleep(1500);
  $('#closeT').textContent = ''; await sleep(450);
  // HIT ONE: the mascot
  const sc = $('#scare'); sc.classList.remove('warm'); sc.classList.add('go'); S.sting(1);
  if (!RM) { sc.classList.add('shake'); const f = $('#flash'); f.style.transition = 'none'; f.style.opacity = '.55'; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = '0'; })); }
  if (navigator.vibrate && !RM) try { navigator.vibrate([280, 60, 200, 60, 500]); } catch (e) {}
  await sleep(720);
  // HIT TWO: the keeper, closer (no second flash)
  sc.classList.add('two'); S.sting(1.5); S.roar();
  await sleep(1100);
  sc.classList.remove('shake'); cl.classList.remove('on');
  runNow(false);
  setTimeout(() => { sc.classList.remove('go', 'two'); sc.style.display = 'none'; }, 400);
}
async function runNow(skip) {
  const rw = $('#runword'); rw.classList.add('on'); if (skip) S.roar();
  root.classList.add('noscroll'); try { addEventListener('touchmove', noTouch, { passive: false }); } catch (e) {}
  await sleep(850);
  rw.classList.remove('on'); rw.style.display = 'none';
  if (window.RUN) RUN.start({ fromTour: !skip });
}

/* ====================== TAB TITLE ====================== */
const fav = $('#favicon'), favOrig = fav.href;
document.addEventListener('visibilitychange', () => {
  if (scared) return; const dd = D(maxP);
  if (document.hidden && dd > .2) document.title = dd > .7 ? 'it followed you' : dd > .45 ? 'come back before closing' : 'Pip misses you!';
  else { document.title = 'Brightwater Zoo — Fifty Animals, One Way Round'; if (!document.hidden && dd > .6 && S.on) S.whisper(-.3, 1, .1); }
});

window.__bw = { get p() { return p; }, get d() { return d; }, get cur() { return cur; }, get maxP() { return maxP; }, get scared() { return scared; }, get warmed() { return warmed; }, get audio() { return S.state; }, env: { IOS, ANDROID, IN_X, WEBVIEW, LOW, PHONE }, D, goTo, URL_LIVE };
})();

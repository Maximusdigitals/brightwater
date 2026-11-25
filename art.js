/* Brightwater Zoo: printed-map style creature illustrations, drawn as SVG.
   Every creature is built from flat shapes the way 1950s park maps were: no gradients, a misregistered
   ink shadow, halftone shading. viewBox 0 0 240 180, ground line at y=150, animals face right. */
(() => {
'use strict';
const PI = Math.PI, cos = Math.cos, sin = Math.sin;
const hx2 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (h, k) => { const c = hx2(h); return toHex(c.map(v => k < 0 ? v * (1 + k) : v + (255 - v) * k)); };
const mixc = (a, b, k) => { const x = hx2(a), y = hx2(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };
const INK = '#1f1c17';
const f = n => Math.round(n * 10) / 10;
const E = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${x}/>`;
const C = (cx, cy, r, fill, x = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" ${x}/>`;
const P = (d, fill, x = '') => `<path d="${d}" fill="${fill}" ${x}/>`;
const L = (x1, y1, x2, y2, st, w, x = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${st}" stroke-width="${w}" stroke-linecap="round" ${x}/>`;
const R = (x, y, w, h, fill, rx = 0, ex = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${fill}" ${ex}/>`;
const Q = (d, st, w, x = '') => `<path d="${d}" fill="none" stroke="${st}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;

/* ---------- eyes ---------- */
// style: dot | anime | glow | void | many | slit
function eye(x, y, r, o = {}) {
  const st = o.eye || 'dot', glow = o.shine || 0; let s = '';
  if (st === 'anime') {
    s += E(x, y, r * 1.0, r * 1.25, '#fffdf6') + `<g class="pu">` + E(x + r * .12, y + r * .1, r * .78, r * 1.02, o.iris || '#2b2a4a') + E(x + r * .12, y + r * .2, r * .42, r * .55, INK) + `</g>` + C(x - r * .25, y - r * .45, r * .32, '#fff') + C(x + r * .4, y + r * .45, r * .14, '#fff');
  } else if (st === 'glow') {
    s += C(x, y, r * 2.6, o.glowc || '#ffd25a', 'opacity=".22"') + C(x, y, r * 1.1, o.glowc || '#ffd25a') + `<g class="pu">` + E(x + r * .1, y, r * .28, r * .9, INK) + `</g>`;
  } else if (st === 'void') {
    s += E(x, y, r * 1.1, r * 1.4, '#050404') + `<g class="pu">` + C(x, y + r * .2, r * .18, '#f4efe6') + `</g>`;
  } else if (st === 'slit') {
    s += E(x, y, r, r * .85, o.iris || '#d9b13b') + `<g class="pu">` + E(x + r * .1, y, r * .18, r * .75, INK) + `</g>`;
  } else {
    s += C(x, y, r * 1.1, '#fffdf6') + `<g class="pu">` + C(x + r * .25, y, r * .72, INK) + `</g>` + C(x + r * .05, y - r * .3, r * .22, '#fff');
  }
  if (glow > 0 && st !== 'glow') s += C(x + r * .25, y, r * .55, '#f6e27a', `opacity="${f(glow)}" class="shine"`);
  return s;
}

/* ---------- body plans ---------- */
function stripes(cx, cy, rx, ry, col, n, skew = 0) {
  let s = ''; for (let i = 0; i < n; i++) { const x = cx - rx + (i + .5) * (2 * rx / n); s += P(`M${f(x - 3)} ${f(cy - ry - 2)} Q${f(x + 4 + skew)} ${f(cy)} ${f(x - 2)} ${f(cy + ry + 2)} L${f(x + 2)} ${f(cy + ry + 2)} Q${f(x + 9 + skew)} ${f(cy)} ${f(x + 2)} ${f(cy - ry - 2)}Z`, col); } return s;
}
function spots(cx, cy, rx, ry, col, n, seed = 1, big = 1) {
  let s = '', r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) { const a = rnd() * 2 * PI, k = Math.sqrt(rnd()) * .85; s += `<rect x="${f(cx + cos(a) * rx * k - 4 * big)}" y="${f(cy + sin(a) * ry * k - 3 * big)}" width="${f((6 + rnd() * 5) * big)}" height="${f((5 + rnd() * 4) * big)}" rx="${f(2.2 * big)}" fill="${col}" transform="rotate(${Math.round(rnd() * 60 - 30)} ${f(cx + cos(a) * rx * k)} ${f(cy + sin(a) * ry * k)})"/>`; }
  return s;
}

function quad(o, id) {
  const c = o.c, d = shade(c, -.25), bw = o.bw || 46, bh = o.bh || 24, leg = o.leg ?? 30, lw = o.lw || 9;
  const cx = o.cx || 112, cy = 150 - leg - bh * .62; let s = '';
  // tail
  const tx = cx - bw * .92, ty = cy - bh * .25;
  if (o.tail === 'thin') s += Q(`M${f(tx)} ${f(ty)} Q${f(tx - 16)} ${f(ty + 10)} ${f(tx - 14)} ${f(ty + 30)}`, d, 4) + E(tx - 14, ty + 32, 3.5, 6, o.tuft || INK);
  else if (o.tail === 'bush') s += P(`M${f(tx + 6)} ${f(ty)} Q${f(tx - 30)} ${f(ty - 26)} ${f(tx - 40)} ${f(ty - 4)} Q${f(tx - 34)} ${f(ty + 14)} ${f(tx + 4)} ${f(ty + 8)}Z`, o.tailc || c) + (o.tailtip ? E(tx - 36, ty - 6, 7, 8, o.tailtip) : '');
  else if (o.tail === 'ring') { s += Q(`M${f(tx)} ${f(ty)} Q${f(tx - 34)} ${f(ty - 10)} ${f(tx - 30)} ${f(ty - 46)}`, c, 11); for (let i = 0; i < 5; i++) { const t = (i + .5) / 5, x = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * (tx - 34) + t * t * (tx - 30), y = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * (ty - 10) + t * t * (ty - 46); s += C(x, y, 4.4, o.ringc || '#6e3a1f'); } }
  else if (o.tail === 'thick') s += P(`M${f(tx + 8)} ${f(ty - 6)} Q${f(tx - 40)} ${f(ty + 4)} ${f(tx - 70)} ${f(ty + 26)} Q${f(tx - 30)} ${f(ty + 22)} ${f(tx + 8)} ${f(ty + 14)}Z`, c);
  else if (o.tail === 'stub') s += E(tx, ty, 6, 4, d);
  else if (o.tail === 'tails9') { for (let i = 0; i < 9; i++) { const a = -PI * .95 + i * .16; s += P(`M${f(tx + 6)} ${f(ty)} Q${f(tx + cos(a) * 30)} ${f(ty + sin(a) * 40 - 10)} ${f(tx + cos(a) * 54)} ${f(ty + sin(a) * 50)} Q${f(tx + cos(a) * 34 + 8)} ${f(ty + sin(a) * 30)} ${f(tx + 4)} ${f(ty + 8)}Z`, i % 2 ? c : shade(c, -.06)) + C(tx + cos(a) * 52, ty + sin(a) * 48, 5, o.tailtip || '#c8402f'); } }
  // legs: far then near
  const n = o.legs || 4, lx = [];
  if (n === 4) lx.push(cx - bw * .6, cx + bw * .5); else for (let i = 0; i < n / 2; i++) lx.push(cx - bw * .8 + i * (bw * 1.6 / (n / 2 - 1)));
  const legd = (x, col, off) => o.paw === 'hoof' ? R(x + off, cy + bh * .3, lw, leg + bh * .32, col, 3) + R(x + off, 146, lw, 4, INK, 1) : R(x + off, cy + bh * .3, lw, leg + bh * .32, col, lw / 2.2) + E(x + off + lw / 2, 149, lw * .7, 3, col);
  if (leg > 0) lx.forEach(x => s += legd(x, d, 7));
  if (o.hump) s += E(cx - bw * .1, cy - bh * .8, bw * .4, bh * .5, c);
  s += E(cx, cy, bw, bh, c);
  if (o.belly) s += P(`M${f(cx - bw * .8)} ${f(cy + bh * .4)} Q${f(cx)} ${f(cy + bh * 1.25)} ${f(cx + bw * .8)} ${f(cy + bh * .4)} Q${f(cx)} ${f(cy + bh * .75)} ${f(cx - bw * .8)} ${f(cy + bh * .4)}Z`, o.belly);
  if (o.pat) { s += `<clipPath id="${id}cb">${E(cx, cy, bw, bh, '#000')}</clipPath><g clip-path="url(#${id}cb)">`; if (o.pat === 'stripes') s += stripes(cx, cy, bw, bh, o.patc || INK, o.patn || 9); if (o.pat === 'spots') s += spots(cx, cy, bw, bh, o.patc || INK, o.patn || 14, o.seed || 3, o.patb || 1); if (o.pat === 'ros') s += spots(cx, cy, bw, bh, o.patc || INK, o.patn || 18, o.seed || 5, .7); if (o.pat === 'windows') { for (let i = 0; i < 4; i++) s += R(cx - bw * .7 + i * bw * .38, cy - bh * .55, bw * .28, bh * .55, '#fff4c6', 5) + R(cx - bw * .7 + i * bw * .38, cy - bh * .55, bw * .28, 5, shade(c, -.35)); } s += `</g>`; }
  if (o.spines) for (let i = 0; i < 7; i++) { const x = cx - bw * .7 + i * bw * .22; s += P(`M${f(x - 5)} ${f(cy - bh * .82)} L${f(x)} ${f(cy - bh * .82 - 14 - (i % 2) * 6)} L${f(x + 5)} ${f(cy - bh * .82)}Z`, o.spinec || INK); }
  if (leg > 0) lx.forEach(x => s += legd(x, c, 0));
  if (o.rider) s += rider(o, cx, cy, bh);
  // neck + head
  const hr = o.hr || 15, nl = o.neck || 0, na = (o.na ?? 55) * PI / 180;
  const nx = cx + bw * .72, ny = cy - bh * .25;
  const hx = nx + cos(na) * nl + hr * .5, hy = ny - sin(na) * nl - 4;
  if (o.mane) s += C(hx - 2, hy + 2, hr * 1.75, o.mane) ;
  if (nl) s += Q(`M${f(nx - 4)} ${f(ny + 6)} L${f(hx - 2)} ${f(hy)}`, c, o.nw || 16);
  if (o.pat === 'spots' && nl > 20) { for (let i = 1; i < 4; i++) { const t = i / 4; s += R(nx + (hx - nx) * t - 3, ny + (hy - ny) * t - 2, 6, 5, o.patc || INK, 2); } }
  if (o.pat === 'stripes' && nl) { for (let i = 1; i < 4; i++) { const t = i / 4.2; s += L(nx + (hx - nx) * t - 5, ny + (hy - ny) * t - 6, nx + (hx - nx) * t + 5, ny + (hy - ny) * t + 6, o.patc || INK, 3.5); } }
  // ears behind head
  const ear = o.ear || 'round';
  if (ear === 'round') s += C(hx - hr * .5, hy - hr * .82, hr * .38, d) + C(hx - hr * .5, hy - hr * .82, hr * .18, o.earin || shade(c, .3));
  if (ear === 'point') s += P(`M${f(hx - hr * .9)} ${f(hy - hr * .3)} L${f(hx - hr * .55)} ${f(hy - hr * 1.6)} L${f(hx - hr * .05)} ${f(hy - hr * .6)}Z`, d) + P(`M${f(hx - hr * .3)} ${f(hy - hr * .5)} L${f(hx + hr * .1)} ${f(hy - hr * 1.55)} L${f(hx + hr * .45)} ${f(hy - hr * .55)}Z`, c);
  if (ear === 'big') s += P(`M${f(hx - hr * .2)} ${f(hy - hr * .5)} Q${f(hx - hr * 2.4)} ${f(hy - hr * 1.6)} ${f(hx - hr * 2.2)} ${f(hy + hr * .9)} Q${f(hx - hr * 1.2)} ${f(hy + hr * 1.6)} ${f(hx - hr * .3)} ${f(hy + hr * .6)}Z`, d);
  if (ear === 'fennec') s += P(`M${f(hx - hr * .8)} ${f(hy - hr * .2)} L${f(hx - hr * 1.5)} ${f(hy - hr * 2.6)} L${f(hx - hr * .05)} ${f(hy - hr * .7)}Z`, d) + P(`M${f(hx - hr * .2)} ${f(hy - hr * .5)} L${f(hx + hr * .1)} ${f(hy - hr * 2.7)} L${f(hx + hr * .7)} ${f(hy - hr * .4)}Z`, c) + P(`M${f(hx - hr * .02)} ${f(hy - hr * .7)} L${f(hx + hr * .15)} ${f(hy - hr * 2.2)} L${f(hx + hr * .5)} ${f(hy - hr * .6)}Z`, o.earin || '#f2c2a8');
  if (o.horn === 'oss') s += R(hx - hr * .5, hy - hr * 1.7, 3.5, hr, d, 1.5) + C(hx - hr * .5 + 1.7, hy - hr * 1.7, 3.2, INK) + R(hx - hr * .05, hy - hr * 1.7, 3.5, hr, c, 1.5) + C(hx - hr * .05 + 1.7, hy - hr * 1.7, 3.2, INK);
  if (o.horn === 'antler') s += Q(`M${f(hx - hr * .3)} ${f(hy - hr * .7)} L${f(hx - hr * .9)} ${f(hy - hr * 3)} M${f(hx - hr * .7)} ${f(hy - hr * 2.2)} L${f(hx - hr * 1.8)} ${f(hy - hr * 2.6)} M${f(hx - hr * .85)} ${f(hy - hr * 2.8)} L${f(hx - hr * .2)} ${f(hy - hr * 3.6)} M${f(hx + hr * .1)} ${f(hy - hr * .7)} L${f(hx + hr * .7)} ${f(hy - hr * 2.9)} M${f(hx + hr * .5)} ${f(hy - hr * 2.1)} L${f(hx + hr * 1.5)} ${f(hy - hr * 2.4)}`, o.hornc || '#e7dcc4', 3.5);
  // head
  s += E(hx, hy, hr * (o.hw || 1), hr, o.headc || c);
  if (o.mask) s += P(`M${f(hx - hr * .5)} ${f(hy - hr * .1)} Q${f(hx + hr * .3)} ${f(hy - hr * .9)} ${f(hx + hr * 1.1)} ${f(hy - hr * .1)} Q${f(hx + hr * .3)} ${f(hy + hr * .6)} ${f(hx - hr * .5)} ${f(hy - hr * .1)}Z`, o.mask);
  const sn = o.snout ?? .6;
  if (sn) s += E(hx + hr * .78, hy + hr * .28, hr * sn, hr * (o.snh || .48), o.snc || shade(o.headc || c, .12));
  if (sn) s += C(hx + hr * (.78 + sn * .85), hy + hr * .12, hr * .13, INK);
  if (o.trunk) s += Q(`M${f(hx + hr * .9)} ${f(hy + hr * .1)} Q${f(hx + hr * 1.6)} ${f(hy + hr * 1.2)} ${f(hx + hr * 1.2)} ${f(hy + hr * 2.3)} Q${f(hx + hr * 1.1)} ${f(hy + hr * 2.6)} ${f(hx + hr * 1.45)} ${f(hy + hr * 2.6)}`, o.headc || c, o.trunkw || 10);
  if (o.tusk) s += P(`M${f(hx + hr * .6)} ${f(hy + hr * .6)} Q${f(hx + hr * 1.2)} ${f(hy + hr * 1.4)} ${f(hx + hr * 1.9)} ${f(hy + hr * 1.0)} Q${f(hx + hr * 1.2)} ${f(hy + hr * 1.1)} ${f(hx + hr * .8)} ${f(hy + hr * .5)}Z`, '#f6efdc');
  if (o.horn === 'rhino') s += P(`M${f(hx + hr * 1.0)} ${f(hy - hr * .2)} L${f(hx + hr * 1.35)} ${f(hy - hr * 1.6)} L${f(hx + hr * 1.55)} ${f(hy - hr * .05)}Z`, shade(c, .3)) + P(`M${f(hx + hr * .45)} ${f(hy - hr * .5)} L${f(hx + hr * .6)} ${f(hy - hr * 1.1)} L${f(hx + hr * .8)} ${f(hy - hr * .45)}Z`, shade(c, .3));
  if (o.teeth) { for (let i = 0; i < 5; i++) s += P(`M${f(hx + hr * (.45 + i * .22))} ${f(hy + hr * .55)} l3 7 l3 -7Z`, '#f8f3e6'); }
  if (o.blush) s += E(hx + hr * .35, hy + hr * .35, hr * .22, hr * .12, o.blush, 'opacity=".75"');
  if (o.leafHead) s += P(`M${f(hx - hr * .5)} ${f(hy - hr * .8)} Q${f(hx)} ${f(hy - hr * 2.2)} ${f(hx + hr * .9)} ${f(hy - hr * 1.1)} Q${f(hx + hr * .2)} ${f(hy - hr * .7)} ${f(hx - hr * .5)} ${f(hy - hr * .8)}Z`, '#5e9a49');
  if (o.mark) s += P(`M${f(hx - hr * .1)} ${f(hy - hr * .9)} l3 6 l3 -6Z`, o.mark);
  s += eye(hx + hr * .25, hy - hr * .22, hr * (o.er || .2), o);
  if (o.eyes2) s += eye(hx - hr * .2, hy - hr * .35, hr * (o.er || .2) * .8, o) + eye(hx + hr * .55, hy - hr * .6, hr * (o.er || .2) * .6, o);
  return s;
}
function rider(o, cx, cy, bh) { // nuckelavee: a torso grown out of the back
  const x = cx + 6, y = cy - bh * .7, c = o.riderc || '#9b3b2e'; let s = '';
  s += P(`M${f(x - 12)} ${f(y + 6)} Q${f(x - 14)} ${f(y - 40)} ${f(x)} ${f(y - 44)} Q${f(x + 14)} ${f(y - 40)} ${f(x + 12)} ${f(y + 6)}Z`, c);
  s += Q(`M${f(x - 10)} ${f(y - 36)} Q${f(x - 34)} ${f(y - 10)} ${f(x - 30)} ${f(y + 34)}`, c, 6) + Q(`M${f(x + 10)} ${f(y - 36)} Q${f(x + 40)} ${f(y - 14)} ${f(x + 38)} ${f(y + 36)}`, c, 6);
  s += C(x, y - 54, 13, c) + Q(`M${f(x - 8)} ${f(y - 58)} Q${f(x)} ${f(y - 46)} ${f(x + 8)} ${f(y - 58)}`, '#e9d6b6', 1.5) + eye(x + 4, y - 56, 2.8, { eye: 'glow', glowc: '#ff3b2a' });
  return s;
}

function bird(o, id) {
  const c = o.c, d = shade(c, -.25), cx = o.cx || 112, leg = o.leg ?? 24, by = 150 - leg - (o.bh || 22) * .7, bw = o.bw || 30, bh = o.bh || 22; let s = '';
  if (leg) s += L(cx - 4, by + bh * .5, cx - 8, 148, o.legc || '#c9853a', 3) + L(cx + 6, by + bh * .5, cx + 8, 148, o.legc || '#c9853a', 3);
  if (o.tailf) s += P(`M${f(cx - bw * .7)} ${f(by)} L${f(cx - bw * 1.6)} ${f(by + bh * .9)} L${f(cx - bw * .5)} ${f(by + bh * .6)}Z`, d);
  s += E(cx, by, bw, bh, c, o.tilt ? `transform="rotate(${o.tilt} ${cx} ${by})"` : '');
  if (o.belly) s += E(cx + bw * .25, by + bh * .3, bw * .55, bh * .6, o.belly);
  s += E(cx - bw * .15, by - bh * .05, bw * .7, bh * .55, d, `transform="rotate(-12 ${cx} ${by})"`);
  const nl = o.neck || 0; const hx = cx + bw * .8 + (o.nx || 0), hy = by - bh * .5 - nl, hr = o.hr || 11;
  if (nl) s += Q(`M${f(cx + bw * .6)} ${f(by - bh * .3)} C${f(cx + bw * 1.4)} ${f(by - nl * .4)} ${f(hx - 14)} ${f(hy + nl * .5)} ${f(hx - 2)} ${f(hy + 3)}`, c, o.nw || 6);
  if (o.crest) s += P(`M${f(hx - 6)} ${f(hy - hr * .7)} L${f(hx - 12)} ${f(hy - hr * 1.9)} L${f(hx)} ${f(hy - hr * .9)} L${f(hx + 2)} ${f(hy - hr * 2)} L${f(hx + 5)} ${f(hy - hr * .8)}Z`, o.crest);
  if (o.disc) s += P(`M${f(hx)} ${f(hy - hr * 1.2)} Q${f(hx - hr * 1.6)} ${f(hy - hr * 1.6)} ${f(hx - hr * 1.2)} ${f(hy + hr * .4)} Q${f(hx)} ${f(hy + hr * 1.6)} ${f(hx + hr * 1.2)} ${f(hy + hr * .4)} Q${f(hx + hr * 1.6)} ${f(hy - hr * 1.6)} ${f(hx)} ${f(hy - hr * 1.2)}Z`, o.disc);
  else s += C(hx, hy, hr, o.headc || c);
  const bk = o.beak || 'short', bc = o.beakc || '#e7a234';
  if (bk === 'short') s += P(`M${f(hx + hr * .8)} ${f(hy - 3)} L${f(hx + hr * 1.8)} ${f(hy + 1)} L${f(hx + hr * .8)} ${f(hy + 4)}Z`, bc);
  if (bk === 'bent') s += P(`M${f(hx + hr * .7)} ${f(hy - 4)} Q${f(hx + hr * 2)} ${f(hy - 2)} ${f(hx + hr * 1.9)} ${f(hy + 9)} Q${f(hx + hr * 1.5)} ${f(hy + 4)} ${f(hx + hr * .7)} ${f(hy + 4)}Z`, bc) + P(`M${f(hx + hr * 1.5)} ${f(hy + 2)} Q${f(hx + hr * 2)} ${f(hy + 2)} ${f(hx + hr * 1.9)} ${f(hy + 9)}Z`, INK);
  if (bk === 'huge') s += P(`M${f(hx + hr * .6)} ${f(hy - hr * .7)} Q${f(hx + hr * 4.2)} ${f(hy - hr * .9)} ${f(hx + hr * 4.4)} ${f(hy + hr * .3)} Q${f(hx + hr * 2.5)} ${f(hy + hr * .6)} ${f(hx + hr * .6)} ${f(hy + hr * .6)}Z`, bc) + C(hx + hr * 4.1, hy - hr * .1, 3, INK);
  if (bk === 'hook') s += P(`M${f(hx + hr * .6)} ${f(hy - 2)} Q${f(hx + hr * 1.3)} ${f(hy - 1)} ${f(hx + hr * 1.1)} ${f(hy + 7)} L${f(hx + hr * .6)} ${f(hy + 4)}Z`, bc);
  if (o.cheek) s += E(hx + hr * .2, hy + hr * .1, hr * .6, hr * .5, o.cheek);
  s += eye(hx + hr * .25, hy - hr * .2, hr * (o.er || .24), o);
  if (o.dark) s += E(hx - hr * .2, hy - hr * .2, hr * .4, hr * .4, INK);
  return s;
}
function flock(o, id) { // several small flamingos
  let s = ''; const n = o.n || 5;
  for (let i = 0; i < n; i++) { const k = i / Math.max(1, n - 1), sc = .48 + (i % 3) * .05; const x = 18 + k * 190 + (i % 2) * 8, y = (i % 2) ? 10 : 0; s += `<g transform="translate(${f(x - 112 * sc)} ${f(150 - 150 * sc + y)}) scale(${sc})">` + bird(Object.assign({}, o, { cx: 112, oneLeg: i % 3 === 0 }), id + i) + `</g>`; }
  return s;
}
function upright(o, id) { // primates, owls, penguins, meerkats, humanoids
  const c = o.c, d = shade(c, -.25), cx = o.cx || 116, h = o.h || 70, bw = o.bw || 22; const top = 150 - h; let s = '';
  if (o.tail === 'ring') { s += Q(`M${f(cx - 6)} 140 Q${f(cx - 60)} 140 ${f(cx - 56)} 60`, c, 9); for (let i = 0; i < 6; i++) { const t = (i + .5) / 6, x = (1 - t) * (1 - t) * (cx - 6) + 2 * (1 - t) * t * (cx - 60) + t * t * (cx - 56), y = (1 - t) * (1 - t) * 140 + 2 * (1 - t) * t * 140 + t * t * 60; s += C(x, y, 4.2, INK); } }
  if (o.tail === 'long') s += Q(`M${f(cx - 6)} 140 Q${f(cx - 50)} 150 ${f(cx - 62)} 120`, c, 6);
  if (o.wings) s += P(`M${f(cx - 4)} ${f(top + h * .3)} Q${f(cx - 95)} ${f(top - 30)} ${f(cx - 110)} ${f(top + h * .7)} Q${f(cx - 60)} ${f(top + h * .5)} ${f(cx - 4)} ${f(top + h * .75)}Z`, o.wingc || d) + P(`M${f(cx + 4)} ${f(top + h * .3)} Q${f(cx + 95)} ${f(top - 30)} ${f(cx + 110)} ${f(top + h * .7)} Q${f(cx + 60)} ${f(top + h * .5)} ${f(cx + 4)} ${f(top + h * .75)}Z`, o.wingc || d);
  if (o.shell) s += E(cx - 6, top + h * .55, bw * 1.1, h * .32, o.shell);
  // legs
  const lh = o.lh ?? h * .28;
  if (lh) s += R(cx - bw * .55, 150 - lh, bw * .38, lh, d, 4) + R(cx + bw * .15, 150 - lh, bw * .38, lh, d, 4);
  // body
  s += P(`M${f(cx - bw)} ${f(150 - lh)} Q${f(cx - bw * 1.15)} ${f(top + h * .3)} ${f(cx)} ${f(top + h * .22)} Q${f(cx + bw * 1.15)} ${f(top + h * .3)} ${f(cx + bw)} ${f(150 - lh)}Z`, c);
  if (o.belly) s += E(cx, top + h * .6, bw * .55, h * .22, o.belly);
  if (o.apron) s += P(`M${f(cx - bw * .7)} ${f(top + h * .35)} L${f(cx + bw * .7)} ${f(top + h * .35)} L${f(cx + bw * .8)} ${f(150 - lh)} L${f(cx - bw * .8)} ${f(150 - lh)}Z`, o.apron) + R(cx - 5, top + h * .42, 10, 7, '#d8b441', 2);
  // arms
  const al = o.arm || h * .45, aw = o.aw || 6;
  s += Q(`M${f(cx - bw * .8)} ${f(top + h * .32)} Q${f(cx - bw * 1.6)} ${f(top + h * .32 + al * .5)} ${f(cx - bw * 1.2 - (o.armout || 0))} ${f(top + h * .32 + al)}`, o.armc || d, aw) + Q(`M${f(cx + bw * .8)} ${f(top + h * .32)} Q${f(cx + bw * 1.6)} ${f(top + h * .32 + al * .5)} ${f(cx + bw * 1.2 + (o.armout || 0))} ${f(top + h * .32 + al)}`, o.armc || d, aw);
  if (o.claws) [-1, 1].forEach(sg => { const x = cx + sg * (bw * 1.2 + (o.armout || 0)), y = top + h * .32 + al; for (let i = -1; i <= 1; i++) s += L(x, y, x + i * 4 + sg * 2, y + 12, '#e9e0cf', 1.6); });
  // head
  const hr = o.hr || bw * .75, hy = top + h * .1, hx = cx;
  if (o.ear === 'round') s += C(hx - hr * .85, hy - hr * .55, hr * .32, d) + C(hx + hr * .85, hy - hr * .55, hr * .32, d);
  if (o.ear === 'point') s += P(`M${f(hx - hr * .9)} ${f(hy - hr * .1)} L${f(hx - hr * .7)} ${f(hy - hr * 1.5)} L${f(hx - hr * .1)} ${f(hy - hr * .8)}Z`, d) + P(`M${f(hx + hr * .9)} ${f(hy - hr * .1)} L${f(hx + hr * .7)} ${f(hy - hr * 1.5)} L${f(hx + hr * .1)} ${f(hy - hr * .8)}Z`, d);
  if (o.ear === 'big') s += E(hx - hr * 1.05, hy - hr * .35, hr * .55, hr * .7, d) + E(hx + hr * 1.05, hy - hr * .35, hr * .55, hr * .7, d) + E(hx - hr * 1.05, hy - hr * .35, hr * .3, hr * .45, '#e7a59a') + E(hx + hr * 1.05, hy - hr * .35, hr * .3, hr * .45, '#e7a59a');
  if (o.horn === 'antler') s += Q(`M${f(hx - hr * .4)} ${f(hy - hr * .8)} L${f(hx - hr * 1.4)} ${f(hy - hr * 2.8)} M${f(hx - hr * 1)} ${f(hy - hr * 2)} L${f(hx - hr * 2.4)} ${f(hy - hr * 2.2)} M${f(hx - hr * 1.3)} ${f(hy - hr * 2.6)} L${f(hx - hr * .9)} ${f(hy - hr * 3.8)} M${f(hx - hr * 1.9)} ${f(hy - hr * 2.15)} L${f(hx - hr * 2.6)} ${f(hy - hr * 3.2)} M${f(hx + hr * .4)} ${f(hy - hr * .8)} L${f(hx + hr * 1.4)} ${f(hy - hr * 2.8)} M${f(hx + hr * 1)} ${f(hy - hr * 2)} L${f(hx + hr * 2.4)} ${f(hy - hr * 2.2)} M${f(hx + hr * 1.3)} ${f(hy - hr * 2.6)} L${f(hx + hr * .9)} ${f(hy - hr * 3.8)} M${f(hx + hr * 1.9)} ${f(hy - hr * 2.15)} L${f(hx + hr * 2.6)} ${f(hy - hr * 3.2)}`, o.hornc || '#ddd2bb', 3.2);
  if (o.horn === 'goat') s += Q(`M${f(hx - hr * .5)} ${f(hy - hr * .7)} Q${f(hx - hr * 1.2)} ${f(hy - hr * 2)} ${f(hx - hr * 1.6)} ${f(hy - hr * 1.2)}`, o.hornc || '#d9c9a7', 4) + Q(`M${f(hx + hr * .5)} ${f(hy - hr * .7)} Q${f(hx + hr * 1.2)} ${f(hy - hr * 2)} ${f(hx + hr * 1.6)} ${f(hy - hr * 1.2)}`, o.hornc || '#d9c9a7', 4);
  if (o.disc) s += P(`M${f(hx)} ${f(hy - hr * .85)} Q${f(hx - hr * 1.5)} ${f(hy - hr * 1.5)} ${f(hx - hr * 1.15)} ${f(hy + hr * .3)} Q${f(hx)} ${f(hy + hr * 1.5)} ${f(hx + hr * 1.15)} ${f(hy + hr * .3)} Q${f(hx + hr * 1.5)} ${f(hy - hr * 1.5)} ${f(hx)} ${f(hy - hr * .85)}Z`, o.headc || c) + P(`M${f(hx)} ${f(hy - hr * .55)} Q${f(hx - hr * 1.1)} ${f(hy - hr * 1)} ${f(hx - hr * .85)} ${f(hy + hr * .25)} Q${f(hx)} ${f(hy + hr * 1.15)} ${f(hx + hr * .85)} ${f(hy + hr * .25)} Q${f(hx + hr * 1.1)} ${f(hy - hr * 1)} ${f(hx)} ${f(hy - hr * .55)}Z`, o.disc);
  else s += E(hx, hy, hr * (o.hw || 1), hr * (o.hh || 1), o.headc || c);
  if (o.skull) s += P(`M${f(hx - hr * .75)} ${f(hy - hr * .3)} Q${f(hx)} ${f(hy - hr * 1.3)} ${f(hx + hr * .75)} ${f(hy - hr * .3)} L${f(hx + hr * .3)} ${f(hy + hr * 1.5)} L${f(hx - hr * .3)} ${f(hy + hr * 1.5)}Z`, o.skull);
  if (o.plate) s += E(hx, hy - hr * .9, hr * .6, hr * .2, '#cfe3e2') + E(hx, hy - hr * .95, hr * .45, hr * .1, '#7fb2c0');
  if (o.cap) s += P(`M${f(hx - hr * 1.05)} ${f(hy - hr * .35)} Q${f(hx)} ${f(hy - hr * 1.9)} ${f(hx + hr * 1.05)} ${f(hy - hr * .35)}Z`, o.cap) + R(hx - hr * 1.1, hy - hr * .45, hr * 2.6, hr * .28, shade(o.cap, -.3), 2) + C(hx, hy - hr * .95, hr * .2, '#d8b441');
  if (o.face) s += E(hx + (o.fx || 0), hy + hr * .15, hr * .68, hr * .6, o.face);
  if (o.beak) s += P(`M${f(hx - 3)} ${f(hy + hr * .05)} L${f(hx + 3)} ${f(hy + hr * .05)} L${f(hx)} ${f(hy + hr * .45)}Z`, o.beak);
  if (o.nose) s += E(hx + (o.fx || 0), hy + hr * .3, hr * .16, hr * .1, INK);
  if (o.grin) s += grin(hx, hy + hr * .45, hr * o.grin);
  if (o.mouth) s += Q(`M${f(hx - hr * .2)} ${f(hy + hr * .52)} Q${f(hx)} ${f(hy + hr * .66)} ${f(hx + hr * .2)} ${f(hy + hr * .52)}`, INK, 1.6);
  if (o.blush) s += E(hx - hr * .55, hy + hr * .3, hr * .18, hr * .1, o.blush) + E(hx + hr * .55, hy + hr * .3, hr * .18, hr * .1, o.blush);
  const er = hr * (o.er || .22), ex = hr * (o.ed || .38);
  if (o.oneEye) s += eye(hx, hy, er * 1.6, o); else s += eye(hx - ex, hy - hr * .05, er, o) + eye(hx + ex, hy - hr * .05, er, o);
  if (o.whisk) s += Q(`M${f(hx - hr * .5)} ${f(hy + hr * .35)} l-16 -3 M${f(hx - hr * .5)} ${f(hy + hr * .45)} l-16 4 M${f(hx + hr * .5)} ${f(hy + hr * .35)} l16 -3 M${f(hx + hr * .5)} ${f(hy + hr * .45)} l16 4`, INK, 1);
  return s;
}
function grin(x, y, w) { // too many teeth
  let s = P(`M${f(x - w)} ${f(y - w * .15)} Q${f(x)} ${f(y + w * .7)} ${f(x + w)} ${f(y - w * .15)} Q${f(x)} ${f(y + w * .25)} ${f(x - w)} ${f(y - w * .15)}Z`, '#4a0f0c');
  const n = Math.max(6, Math.round(w / 2.2));
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, tx = x - w + t * 2 * w, ty = y - w * .15 + Math.sin(t * PI) * w * .2; s += P(`M${f(tx - w / n)} ${f(ty)} L${f(tx)} ${f(ty + w * .2)} L${f(tx + w / n)} ${f(ty)}Z`, '#f5efe2'); }
  return s;
}
function fish(o, id) {
  const c = o.c, d = shade(c, -.25), cx = o.cx || 118, cy = o.cy || 92, bw = o.bw || 60, bh = o.bh || 22; let s = '';
  s += P(`M${f(cx - bw * .85)} ${f(cy)} L${f(cx - bw * 1.35)} ${f(cy - bh * 1.3)} L${f(cx - bw * 1.2)} ${f(cy)} L${f(cx - bw * 1.35)} ${f(cy + bh * 1.2)}Z`, d);
  s += P(`M${f(cx - bw * .1)} ${f(cy - bh * .8)} L${f(cx - bw * .3)} ${f(cy - bh * 2)} L${f(cx + bw * .25)} ${f(cy - bh * .8)}Z`, d);
  if (o.shark) s += P(`M${f(cx + bw * .1)} ${f(cy + bh * .6)} L${f(cx - bw * .2)} ${f(cy + bh * 1.7)} L${f(cx + bw * .35)} ${f(cy + bh * .6)}Z`, d);
  s += P(`M${f(cx - bw)} ${f(cy)} Q${f(cx - bw * .2)} ${f(cy - bh * 1.15)} ${f(cx + bw)} ${f(cy - bh * .05)} Q${f(cx - bw * .2)} ${f(cy + bh * 1.15)} ${f(cx - bw)} ${f(cy)}Z`, c);
  if (o.belly) s += P(`M${f(cx - bw * .8)} ${f(cy + bh * .2)} Q${f(cx)} ${f(cy + bh * .2)} ${f(cx + bw * .98)} ${f(cy + 1)} Q${f(cx - bw * .2)} ${f(cy + bh * 1.05)} ${f(cx - bw * .8)} ${f(cy + bh * .2)}Z`, o.belly);
  if (o.shark) for (let i = 0; i < 4; i++) s += L(cx + bw * .38 + i * 5, cy - bh * .3, cx + bw * .34 + i * 5, cy + bh * .15, d, 1.5);
  if (o.teeth) for (let i = 0; i < 7; i++) s += P(`M${f(cx + bw * .55 + i * 5.5)} ${f(cy + bh * .28 - i * .6)} l2.8 6 l2.8 -6Z`, '#f8f3e6');
  if (o.lure) s += Q(`M${f(cx + bw * .6)} ${f(cy - bh * .8)} Q${f(cx + bw * 1.1)} ${f(cy - bh * 3)} ${f(cx + bw * 1.35)} ${f(cy - bh * 1.4)}`, d, 2) + C(cx + bw * 1.35, cy - bh * 1.3, 10, '#d8f7a0', 'opacity=".3" class="lure"') + C(cx + bw * 1.35, cy - bh * 1.3, 4.5, '#eaffc4', 'class="lure"');
  s += eye(cx + bw * .6, cy - bh * .3, o.er || 4, o);
  return s;
}
function serpent(o, id) {
  const c = o.c, d = shade(c, -.25), amp = o.amp || 18, y0 = o.y0 || 120, w = o.w || 16; let pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([20 + t * 170, y0 - Math.sin(t * PI * (o.waves || 2.2)) * amp - t * (o.rise || 0)]); }
  const dd = 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L');
  let s = Q(dd, d, w + 3) + Q(dd, c, w);
  if (o.pat) pts.forEach((p, i) => { if (i % 2 && i < 23) s += E(p[0], p[1], w * .42, w * .3, o.patc || INK); });
  if (o.dorsal) pts.forEach((p, i) => { if (i % 2 && i < 23) s += P(`M${f(p[0] - 4)} ${f(p[1] - w * .45)} l4 -9 l4 9Z`, o.dorsal); });
  const [hx, hy] = pts[24]; const hr = o.hr || w * .85;
  s += E(hx + 6, hy - 2, hr * 1.25, hr * .85, c);
  if (o.horn === 'dragon') s += Q(`M${f(hx)} ${f(hy - hr * .6)} Q${f(hx - 8)} ${f(hy - hr * 2)} ${f(hx - 18)} ${f(hy - hr * 2.2)} M${f(hx + 8)} ${f(hy - hr * .6)} Q${f(hx + 4)} ${f(hy - hr * 2.1)} ${f(hx - 4)} ${f(hy - hr * 2.6)}`, o.hornc || '#f0d58a', 3) + Q(`M${f(hx + 18)} ${f(hy + 3)} Q${f(hx + 40)} ${f(hy + 4)} ${f(hx + 44)} ${f(hy + 22)} M${f(hx + 18)} ${f(hy)} Q${f(hx + 38)} ${f(hy - 10)} ${f(hx + 48)} ${f(hy - 2)}`, o.whisc || '#f0d58a', 2);
  if (o.pearl) s += C(hx + 30, hy + 30, 6, '#fff5e0') + C(hx + 28, hy + 28, 2, '#fff');
  if (o.tongue) s += Q(`M${f(hx + 18)} ${f(hy + 2)} l9 1 l4 -3 M${f(hx + 27)} ${f(hy + 3)} l4 3`, '#c2362b', 1.6);
  s += eye(hx + 8, hy - hr * .35, hr * (o.er || .22), o);
  return s;
}
function octo(o, id) {
  const c = o.c, d = shade(c, -.25), cx = o.cx || 120, cy = o.cy || 70, r = o.r || 30; let s = '';
  for (let i = 0; i < 8; i++) { const a = PI * (.08 + i * .12), x0 = cx + cos(a) * r * .6, len = o.len || 60; s += Q(`M${f(x0)} ${f(cy + r * .5)} Q${f(cx + cos(a) * r * 1.6)} ${f(cy + r * .5 + len * .5)} ${f(cx + cos(a) * r * 2 + sin(i) * 10)} ${f(cy + r * .5 + len)}`, i % 2 ? d : c, 8 - i % 2 * 2); }
  s += E(cx, cy, r * .95, r * 1.1, c) + E(cx - r * .25, cy - r * .3, r * .25, r * .35, shade(c, .15));
  if (o.eyesN) { for (let i = 0; i < o.eyesN; i++) s += eye(cx - r * .6 + (i % 4) * r * .4, cy + r * .05 + Math.floor(i / 4) * r * .35, 3.6, o); }
  else s += eye(cx - r * .38, cy + r * .2, 4.5, o) + eye(cx + r * .38, cy + r * .2, 4.5, o);
  return s;
}
function blob(o, id) { // anime spirits, slimes, seals
  const c = o.c, d = shade(c, -.22), cx = o.cx || 120, r = o.r || 40, cy = 150 - r * (o.squash || .9); let s = '';
  if (o.tails) for (let i = 0; i < o.tails; i++) s += E(cx - r * .9, cy - 4 - i * 3, 14, 5, c, `transform="rotate(${-40 + i * 12} ${cx - r * .7} ${cy})"`);
  if (o.ear === 'leaf') s += P(`M${f(cx - r * .4)} ${f(cy - r * .8)} Q${f(cx - r * .9)} ${f(cy - r * 1.7)} ${f(cx - r * .1)} ${f(cy - r * 1.5)} Q${f(cx - r * .1)} ${f(cy - r)} ${f(cx - r * .4)} ${f(cy - r * .8)}Z`, '#5e9a49') + P(`M${f(cx + r * .3)} ${f(cy - r * .85)} Q${f(cx + r * .9)} ${f(cy - r * 1.7)} ${f(cx + r * .1)} ${f(cy - r * 1.55)}Z`, '#77b25a');
  if (o.ear === 'mouse') s += C(cx - r * .62, cy - r * .7, r * .38, d) + C(cx + r * .62, cy - r * .7, r * .38, d) + C(cx - r * .62, cy - r * .7, r * .2, o.earin || '#f3c7c1') + C(cx + r * .62, cy - r * .7, r * .2, o.earin || '#f3c7c1');
  if (o.ear === 'cat') s += P(`M${f(cx - r * .8)} ${f(cy - r * .4)} L${f(cx - r * .7)} ${f(cy - r * 1.25)} L${f(cx - r * .2)} ${f(cy - r * .8)}Z`, d) + P(`M${f(cx + r * .8)} ${f(cy - r * .4)} L${f(cx + r * .7)} ${f(cy - r * 1.25)} L${f(cx + r * .2)} ${f(cy - r * .8)}Z`, d);
  if (o.ear === 'antenna') s += Q(`M${f(cx - r * .3)} ${f(cy - r * .8)} Q${f(cx - r * .6)} ${f(cy - r * 1.6)} ${f(cx - r * .9)} ${f(cy - r * 1.5)} M${f(cx + r * .3)} ${f(cy - r * .8)} Q${f(cx + r * .6)} ${f(cy - r * 1.6)} ${f(cx + r * .9)} ${f(cy - r * 1.5)}`, d, 2.5) + C(cx - r * .9, cy - r * 1.5, 4.5, '#ffe66b', 'class="zap"') + C(cx + r * .9, cy - r * 1.5, 4.5, '#ffe66b', 'class="zap"');
  if (o.bigtail) s += P(`M${f(cx - r * .6)} ${f(cy + r * .3)} Q${f(cx - r * 2.2)} ${f(cy - r * .2)} ${f(cx - r * 1.5)} ${f(cy - r * 1.4)} Q${f(cx - r * .9)} ${f(cy - r * .3)} ${f(cx - r * .5)} ${f(cy)}Z`, o.tailc || c);
  if (o.drip) s += P(`M${f(cx - r)} ${f(150)} Q${f(cx - r * 1.05)} ${f(cy - r * .2)} ${f(cx)} ${f(cy - r * .95)} Q${f(cx + r * 1.05)} ${f(cy - r * .2)} ${f(cx + r)} ${f(150)} Q${f(cx + r * .6)} 156 ${f(cx + r * .3)} 150 Q${f(cx)} 158 ${f(cx - r * .3)} 150 Q${f(cx - r * .6)} 156 ${f(cx - r)} 150Z`, c, 'opacity=".92"');
  else s += E(cx, cy, r * (o.wide || 1), r * (o.squash || .9), c);
  if (o.belly) s += E(cx, cy + r * .25, r * .62, r * .5, o.belly);
  if (o.chev) for (let i = 0; i < 3; i++) s += P(`M${f(cx - 8 + (i - 1) * 12)} ${f(cy + r * .15)} l4 -5 l4 5Z`, d);
  if (o.cap) s += P(`M${f(cx - r * .75)} ${f(cy - r * .55)} Q${f(cx)} ${f(cy - r * 1.6)} ${f(cx + r * .75)} ${f(cy - r * .55)}Z`, o.cap) + C(cx - r * .25, cy - r * .9, 4, '#fff6e6') + C(cx + r * .2, cy - r * .75, 3, '#fff6e6');
  if (o.ribbon) s += P(`M${f(cx)} ${f(cy + r * .35)} l-12 -7 v14Z M${f(cx)} ${f(cy + r * .35)} l12 -7 v14Z`, o.ribbon) + C(cx, cy + r * .35, 3.5, shade(o.ribbon, -.3));
  if (o.gem) s += P(`M${f(cx)} ${f(cy - r * .62)} l5 6 l-5 6 l-5 -6Z`, o.gem);
  if (o.leaf) s += P(`M${f(cx - 4)} ${f(cy - r * .85)} Q${f(cx + 10)} ${f(cy - r * 1.5)} ${f(cx + 20)} ${f(cy - r * 1.05)} Q${f(cx + 8)} ${f(cy - r * .8)} ${f(cx - 4)} ${f(cy - r * .85)}Z`, '#4f8a3e');
  if (o.windows) for (let i = 0; i < 3; i++) s += R(cx - r * .75 + i * r * .52, cy - r * .3, r * .4, r * .3, '#ffefb8', 4);
  if (o.legs) for (let i = 0; i < o.legs; i++) s += R(cx - r * .9 + i * (r * 1.8 / (o.legs - 1)) - 3, 144, 7, 8, d, 3);
  const er = r * (o.er || .2), ed = r * (o.ed || .36), ey = cy - r * (o.ey || .12);
  s += eye(cx - ed, ey, er, o) + eye(cx + ed, ey, er, o);
  if (o.blush) s += E(cx - ed - er * .4, ey + er * 1.7, er * .7, er * .35, o.blush, 'opacity=".8"') + E(cx + ed + er * .4, ey + er * 1.7, er * .7, er * .35, o.blush, 'opacity=".8"');
  if (o.cheekc) s += C(cx - ed - er * .2, ey + er * 2, er * .5, o.cheekc, 'class="zap"') + C(cx + ed + er * .2, ey + er * 2, er * .5, o.cheekc, 'class="zap"');
  if (o.smile) s += Q(`M${f(cx - r * .12)} ${f(ey + er * 1.6)} Q${f(cx)} ${f(ey + er * 2.3)} ${f(cx + r * .12)} ${f(ey + er * 1.6)}`, INK, 1.8);
  if (o.grin) s += grin(cx, ey + er * 2, r * o.grin);
  if (o.whisk) s += Q(`M${f(cx - r * .45)} ${f(ey + er * 1.8)} l-18 -3 M${f(cx - r * .45)} ${f(ey + er * 2.1)} l-18 4 M${f(cx + r * .45)} ${f(ey + er * 1.8)} l18 -3 M${f(cx + r * .45)} ${f(ey + er * 2.1)} l18 4`, INK, 1.1);
  return s;
}
function mecha(o, id) {
  const c = o.c, d = shade(c, -.3), cx = 112; let s = '';
  s += R(cx - 40, 140 - 30, 10, 38, d, 2) + R(cx + 22, 110, 10, 38, d, 2);
  s += R(cx - 46, 86, 80, 32, c, 8) + R(cx - 38, 92, 22, 6, d, 2) + C(cx - 10, 102, 5, '#ffd25a', 'class="zap"');
  s += R(cx - 30, 112, 10, 38, c, 2) + R(cx + 12, 112, 10, 38, c, 2);
  s += L(cx - 46, 92, cx - 66, 74, d, 5) + C(cx - 66, 72, 4, '#e2553f');
  s += R(cx + 22, 56, 46, 38, c, 9) + P(`M${cx + 26} 60 l4 -22 l12 18Z M${cx + 52} 58 l10 -20 l4 22Z`, d) + R(cx + 50, 74, 22, 14, shade(c, .2), 5);
  s += R(cx + 30, 66, 22, 9, INK, 4) + `<g class="pu">` + R(cx + 34, 68, 6, 5, '#6be1ff', 2) + R(cx + 44, 68, 6, 5, '#6be1ff', 2) + `</g>`;
  return s;
}
function bat(o, id) {
  const c = o.c, cx = 120, cy = 64; let s = L(cx, 28, cx, 46, INK, 2);
  s += P(`M${cx} ${cy - 8} Q${cx - 30} ${cy - 30} ${cx - 62} ${cy - 6} L${cx - 50} ${cy + 6} L${cx - 40} ${cy - 2} L${cx - 30} ${cy + 12} L${cx - 18} ${cy + 4} L${cx} ${cy + 26} L${cx + 18} ${cy + 4} L${cx + 30} ${cy + 12} L${cx + 40} ${cy - 2} L${cx + 50} ${cy + 6} L${cx + 62} ${cy - 6} Q${cx + 30} ${cy - 30} ${cx} ${cy - 8}Z`, shade(c, -.25));
  s += E(cx, cy, 14, 20, c) + E(cx, cy + 22, 11, 10, c) + P(`M${cx - 9} ${cy + 28} l-4 12 l9 -6Z M${cx + 9} ${cy + 28} l4 12 l-9 -6Z`, c);
  s += eye(cx - 5, cy + 22, 2.4, o) + eye(cx + 5, cy + 22, 2.4, o) + P(`M${cx - 3} ${cy + 29} l1.5 4 l1.5 -4Z M${cx + 1} ${cy + 29} l1.5 4 l1.5 -4Z`, '#fff');
  return s;
}
function sloth(o, id) {
  const c = o.c, d = shade(c, -.25); let s = R(10, 34, 220, 8, '#6b4a2c', 4);
  s += Q('M80 40 Q72 70 92 92', d, 9) + Q('M160 40 Q170 70 148 92', d, 9) + Q('M100 40 Q96 66 104 88', c, 9) + Q('M140 40 Q144 66 136 88', c, 9);
  s += E(120, 82, 34, 22, c) + E(152, 96, 17, 15, c) + E(156, 98, 12, 10, '#e9d9b8') + P('M144 94 Q150 88 156 96 Q150 98 144 94Z', '#4a3726') + P('M158 96 Q164 88 170 94 Q164 98 158 96Z', '#4a3726');
  s += eye(150, 94, 2.6, o) + eye(164, 94, 2.6, o) + E(158, 102, 2.6, 1.6, INK) + Q('M153 106 Q158 109 163 106', INK, 1.4);
  for (let i = 0; i < 4; i++) s += L(84 + i * 14, 70 + (i % 2) * 6, 88 + i * 14, 78 + (i % 2) * 6, '#7e9a5a', 2, 'opacity=".7"');
  return s;
}
function frog(o, id) {
  const c = o.c, d = shade(c, -.3), cx = 120; let s = '';
  s += E(cx - 30, 140, 22, 10, d) + E(cx + 30, 140, 22, 10, d) + E(cx, 118, 44, 30, c);
  s += spots(cx, 118, 40, 26, INK, 12, 7, .9);
  s += C(cx - 24, 92, 13, c) + C(cx + 24, 92, 13, c) + eye(cx - 24, 92, 8, Object.assign({}, o, { eye: 'dot' })) + eye(cx + 24, 92, 8, Object.assign({}, o, { eye: 'dot' }));
  s += Q(`M${cx - 26} 122 Q${cx} 132 ${cx + 26} 122`, INK, 2);
  s += R(cx - 48, 140, 14, 10, c, 5) + R(cx + 34, 140, 14, 10, c, 5);
  return s;
}
function mirror(o, id) { // exhibit 50: you
  let s = R(52, 14, 136, 136, '#2a2d2f', 6) + R(58, 20, 124, 124, '#8fa3a8', 3) + P('M58 20 L110 20 L58 92Z', '#b7c6c8', 'opacity=".45"');
  s += `<g class="you">` + C(120, 80, 17, '#3b3f42') + P('M88 144 Q90 104 120 100 Q150 104 152 144Z', '#3b3f42') + `</g>`;
  s += `<g class="behind">` + eye(150, 46, 2.6, { eye: 'glow', glowc: '#ffd25a' }) + eye(160, 46, 2.6, { eye: 'glow', glowc: '#ffd25a' }) + eye(74, 60, 2.2, { eye: 'glow', glowc: '#ff5a3a' }) + eye(82, 60, 2.2, { eye: 'glow', glowc: '#ff5a3a' }) + `</g>`;
  return s;
}

/* ---------- scenes ---------- */
const SCENES = {
  savanna: { sky: '#f2c879', far: '#d79a52', ground: '#cfa45b', prop: 'acacia' },
  rain: { sky: '#bfdcc0', far: '#6aa06a', ground: '#7f9f52', prop: 'leaves' },
  grove: { sky: '#f6d3d1', far: '#e59fa2', ground: '#a9c18a', prop: 'lantern' },
  night: { sky: '#2f3b5c', far: '#24304d', ground: '#3d4a52', prop: 'moon' },
  deep: { sky: '#2a6f86', far: '#1f5568', ground: '#c9b98d', prop: 'water' },
  quar: { sky: '#b9b6ad', far: '#9a968b', ground: '#7b776d', prop: 'hazard' }
};
function scene(z, dk, id) {
  const S = SCENES[z] || SCENES.savanna, night = '#0e0d14';
  const sky = mixc(S.sky, night, dk * .8), far = mixc(S.far, night, dk * .75), gr = mixc(S.ground, night, dk * .7);
  let s = R(0, 0, 240, 180, sky) + P('M0 120 Q60 98 120 112 T240 104 V180 H0Z', far) + R(0, 140, 240, 40, gr);
  if (S.prop === 'acacia') s += (dk < .5 ? C(196, 34, 16, mixc('#fbe6a6', sky, dk * 2)) : '') + L(34, 140, 38, 92, mixc('#6b4a2c', night, dk), 4) + P('M8 92 Q38 72 70 90 Q38 98 8 92Z', mixc('#5b7a3a', night, dk * .8));
  if (S.prop === 'leaves') for (let i = 0; i < 6; i++) s += P(`M${i * 46 - 10} 0 Q${i * 46 + 14} ${30 + (i % 2) * 14} ${i * 46 + 30} 0Z`, mixc(i % 2 ? '#3e7a44' : '#58985a', night, dk * .8));
  if (S.prop === 'lantern') for (let i = 0; i < 3; i++) s += L(30 + i * 90, 0, 30 + i * 90, 16, INK, 1) + E(30 + i * 90, 24, 8, 10, mixc('#e2553f', night, dk * .7)) + R(26 + i * 90, 13, 8, 3, INK) + R(26 + i * 90, 33, 8, 3, INK);
  if (S.prop === 'moon') s += C(200, 34, 13, mixc('#f0e6c8', sky, dk * .6)) + C(205, 30, 11, sky);
  if (S.prop === 'water') { for (let i = 0; i < 6; i++) s += C(30 + i * 37, 120 - (i % 3) * 30, 3 + (i % 2) * 2, '#d7f1f7', 'opacity=".35" class="bub"'); s += P('M0 18 Q60 10 120 18 T240 18', 'none', `stroke="#d7f1f7" stroke-width="2" opacity=".35"`); }
  if (S.prop === 'hazard') { s += R(0, 132, 240, 8, '#d8b441'); for (let i = 0; i < 16; i++) s += P(`M${i * 16} 132 l8 0 l-8 8 l-8 0Z`, INK); }
  return s;
}

/* ---------- public ---------- */
const PLANS = { quad, bird, flock, upright, fish, serpent, octo, blob, mecha, bat, sloth, frog, mirror };
// opts: { id, zone, dk(0..1), empty, ajar, lurk, oddShadow, shine }
function draw(spec, opts = {}) {
  const id = opts.id || ('a' + Math.random().toString(36).slice(2, 7)), dk = opts.dk || 0;
  const o = Object.assign({}, spec); if (o.shineAt != null && dk >= o.shineAt) o.shine = Math.min(.9, (dk - o.shineAt) * 2.2 + .2);
  let body = opts.empty ? '' : (PLANS[o.plan] || quad)(o, id);
  const dim = dk > 0 ? `<rect width="240" height="180" fill="#0b0a10" opacity="${f(dk * .42)}"/>` : '';
  const shadow = o.plan === 'fish' || o.plan === 'octo' || o.plan === 'bat' || o.plan === 'sloth' || o.plan === 'mirror' ? '' : E(120, 151, 70 * (o.shw || 1), 5, '#000', 'opacity=".16"');
  const odd = opts.oddShadow ? E(opts.oddShadow[0], 151, opts.oddShadow[1], 4.5, '#000', 'opacity=".2"') : '';
  const print = body ? `<g transform="translate(2.4 2.2)" opacity=".16" class="reg">${body.replace(/fill="#[0-9a-f]{3,6}"/g, 'fill="#1f1c17"')}</g>` : '';
  let lurk = '';
  if (opts.lurk) { const [lx, ly, lc, ls] = opts.lurk; lurk = `<g class="lurk" opacity="${f(Math.min(1, ls))}">` + eye(lx, ly, 2.4, { eye: 'glow', glowc: lc }) + eye(lx + 9, ly + .5, 2.4, { eye: 'glow', glowc: lc }) + `</g>`; }
  return `<svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">` + scene(opts.zone, dk, id) + shadow + odd + print + `<g class="cr">${body}</g>` + dim + lurk + `</svg>`;
}
function bare(spec, o2 = {}) { // creature only, transparent background (runner sprites, scare)
  const o = Object.assign({}, spec, o2); const id = 'b' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 240 180" width="${o2.w || 480}" height="${o2.h || 360}" xmlns="http://www.w3.org/2000/svg">` + (PLANS[o.plan] || quad)(o, id) + `</svg>`;
}
window.ART = { draw, bare, shade, mixc, grin, eye, SCENES };
})();

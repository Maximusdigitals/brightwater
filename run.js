/* Brightwater: the escape. A three-lane perspective runner on one canvas.
   Built for 60fps in phone webviews: no per-frame allocations in the hot path beyond small objects,
   pre-rendered sprites and backdrop, DPR capped. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const S = window.SFX, EX = window.EXHIBITS, UA = navigator.userAgent || '';
const ANDROID = /Android/i.test(UA), LOW = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
const PHONE = /Android|iPhone|iPod/i.test(UA) || (matchMedia('(hover: none)').matches && innerWidth < 760);
const WEBVIEW = /Twitter for iP|TwitterAndroid|; wv\)/.test(UA);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const URL_LIVE = 'https://maximusdigitals.github.io/brightwater/';
const gred = $('#gred'), game = $('#game'), cv = $('#cv'), ctx = cv.getContext('2d', { alpha: false });
let W = 0, H = 0, DPR = 1, HY = 0, GY = 0, RW = 0, CX = 0;
function size() {
  DPR = Math.min(window.devicePixelRatio || 1, (ANDROID || LOW) ? 1.5 : 2);
  W = game.clientWidth || innerWidth; H = game.clientHeight || innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  HY = H * .36; GY = H * 1.02; CX = W / 2; RW = Math.min(W * .56, H * .42, 380);
  backdrop();
}
const FZ = 5.5, ZP = 2.4, ZFAR = 80; // projection constant, player depth, draw distance
const sc = z => 1 / (1 + Math.max(-.9, z) / FZ);
const sy = z => HY + (GY - HY) * sc(z);
const sx = (lane, z) => CX + lane * (RW * .66) * sc(z);

/* ---------- sprites from the tour's own art ---------- */
const SPR = {}; let prepped = false;
const CHASE = ['Pip', 'The Long Keeper', 'The Hollow Stag'];
const LANE_MON = ['Chupacabra', 'Kappa', 'The Jersey Devil', 'Nuckelavee', 'Baku, the Dream-Eater', 'Mothman', 'Kei, the Contract Cat', 'Puru, the Friendly Slime'];
function prep() {
  if (prepped) return; prepped = true;
  [...new Set([...CHASE, ...LANE_MON])].forEach(name => {
    const e = EX.find(x => x.n === name); if (!e) return;
    const spec = Object.assign({}, e.a); if (name === 'Kei, the Contract Cat' || name === 'Puru, the Friendly Slime') { spec.eye = 'void'; spec.grin = .5; spec.smile = 0; }
    const img = new Image(); img.onload = () => {
      const c = document.createElement('canvas'); c.width = 360; c.height = 270; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 360, 270);
      const dk = document.createElement('canvas'); dk.width = 360; dk.height = 270; const h = dk.getContext('2d'); h.drawImage(c, 0, 0); h.globalCompositeOperation = 'source-atop'; h.fillStyle = 'rgba(10,6,10,.58)'; h.fillRect(0, 0, 360, 270);
      SPR[name] = { lit: c, dark: dk };
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ART.bare(spec, { w: 480, h: 360 }));
  });
}
/* ---------- backdrop & vignette, drawn once per resize ---------- */
let BD = null, VG = null;
function backdrop() {
  BD = document.createElement('canvas'); BD.width = Math.round(W * DPR); BD.height = Math.round(HY * DPR + 4); const g = BD.getContext('2d'); g.scale(DPR, DPR);
  const gr = g.createLinearGradient(0, 0, 0, HY); gr.addColorStop(0, '#07060c'); gr.addColorStop(1, '#2a1e33'); g.fillStyle = gr; g.fillRect(0, 0, W, HY + 4);
  g.fillStyle = '#e9dfc0'; g.beginPath(); g.arc(W * .8, HY * .3, Math.min(W, H) * .05, 0, 7); g.fill(); g.fillStyle = '#07060c'; g.beginPath(); g.arc(W * .8 + Math.min(W, H) * .02, HY * .27, Math.min(W, H) * .045, 0, 7); g.fill();
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,240,' + (.2 + Math.random() * .5) + ')'; g.fillRect(Math.random() * W, Math.random() * HY * .7, 1.4, 1.4); }
  // tree line + the zoo gate in the distance
  g.fillStyle = '#120e16'; g.beginPath(); g.moveTo(0, HY); for (let x = 0; x <= W; x += 14) g.lineTo(x, HY - 18 - Math.abs(Math.sin(x * .05) * 26) - (x % 28 ? 0 : 10)); g.lineTo(W, HY); g.fill();
  const gw = RW * .5, gx = CX - gw / 2; g.fillStyle = '#0a080d'; g.fillRect(gx, HY - 54, 8, 54); g.fillRect(gx + gw - 8, HY - 54, 8, 54); g.fillRect(gx - 6, HY - 60, gw + 12, 12);
  g.font = '400 ' + Math.round(gw * .11) + 'px Bungee, Impact, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#3a2a3e'; g.fillText('BRIGHTWATER', CX, HY - 50);
  g.fillStyle = '#0f6b3a'; g.fillRect(CX - 16, HY - 30, 32, 12); g.fillStyle = '#c8ffd8'; g.font = '700 9px Archivo, sans-serif'; g.fillText('EXIT', CX, HY - 21);
}
function vignette() {
  VG = document.createElement('canvas'); VG.width = Math.round(W * DPR / 2); VG.height = Math.round(H * DPR / 2); const g = VG.getContext('2d');
  const r = g.createRadialGradient(VG.width / 2, VG.height * .55, Math.min(VG.width, VG.height) * .25, VG.width / 2, VG.height * .55, Math.max(VG.width, VG.height) * .75);
  r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = r; g.fillRect(0, 0, VG.width, VG.height);
}

/* ---------- state ---------- */
let G = null, raf = 0, last = 0, running = false, paused = false, hudT = 0;
function reset() {
  G = { t: 0, dist: 0, v: 11, lane: 0, lx: 0, y: 0, vy: 0, slide: 0, pel: 0, chase: .95, objs: [], next: 58, rows: 0, dead: false, stepT: 0, flick: 0, howto: 4, by: '' };
}
function spawnRow() {
  const z = G.next - G.dist, lanes = [-1, 0, 1], t = G.t;
  const r = Math.random(); let pattern = []; G.rows++;
  const pick = () => { const q = Math.random(); if (q < .3) return 'crate'; if (q < .5) return 'bar'; if (q < .75 && t > 6) return 'mon'; return 'cage'; };
  if (G.rows <= 2) { const ls = lanes.filter(l => l !== G.lane); pattern = [[ls[(Math.random() * ls.length) | 0], G.rows === 1 ? 'cage' : 'crate']]; }
  else if (r < .35) { pattern = [[lanes[(Math.random() * 3) | 0], pick()]]; }
  else if (r < .8) { const free = lanes[(Math.random() * 3) | 0]; lanes.forEach(l => { if (l !== free) pattern.push([l, pick()]); }); }
  else { const ty = Math.random() < .5 ? 'crate' : 'bar'; lanes.forEach(l => pattern.push([l, ty])); } // full row: must jump or slide
  pattern.forEach(([l, ty]) => G.objs.push({ z, lane: l, ty, name: ty === 'mon' ? LANE_MON[(Math.random() * LANE_MON.length) | 0] : '', bob: Math.random() * 6 }));
  const blocked = new Set(pattern.filter(([, ty]) => ty === 'cage' || ty === 'mon').map(([l]) => l));
  const free = lanes.filter(l => !blocked.has(l)); const pl = free[(Math.random() * free.length) | 0];
  if (Math.random() < .7) for (let k = 1; k <= 5; k++) G.objs.push({ z: z + 2 + k * 1.8, lane: pl, ty: 'pel', bob: k });
  G.next += Math.max(10, 20 - t * .14) + Math.random() * 6;
}
function act(a) {
  if (!running || paused || G.dead) return;
  if (G.howto > 0) { G.howto = 0; $('#howto').classList.add('off'); }
  if (a === 'L' || a === 'R') { const n = G.lane + (a === 'L' ? -1 : 1); if (n < -1 || n > 1) { G.chase = Math.min(1.25, G.chase + .32); S.run.bump(); shake = .25; } else { G.lane = n; S.run.lane(n * .5); } }
  if (a === 'U' && G.y <= .01) { G.vy = 9.2; G.slide = 0; S.run.jump(); }
  if (a === 'D') { if (G.y > .05) G.vy = -16; G.slide = .62; S.run.slide(); }
}
let shake = 0;
function step(dt) {
  G.t += dt; G.v = Math.min(30, 11 + G.t * .26); const dz = G.v * dt; G.dist += dz;
  while (G.next - G.dist < ZFAR) spawnRow();
  G.lx += (G.lane - G.lx) * Math.min(1, dt * 16);
  if (G.y > 0 || G.vy > 0) { G.vy -= 26 * dt; G.y = Math.max(0, G.y + G.vy * dt); if (G.y === 0) G.vy = 0; }
  if (G.slide > 0) G.slide -= dt;
  G.chase = Math.max(.12, G.chase - dt * .07); S.run.chase(G.chase);
  if (G.chase > 1.15) return die(CHASE[(Math.random() * 2) | 0]);
  const pl = Math.round(G.lx);
  for (let i = G.objs.length - 1; i >= 0; i--) {
    const o = G.objs[i]; o.z -= dz;
    if (o.z < -3) { G.objs.splice(i, 1); continue; }
    if (o.hit || Math.abs(o.z - ZP) > .7 || o.lane !== pl) continue;
    if (o.ty === 'pel') { if (G.y < 1.6) { o.hit = 1; G.pel++; S.run.pellet(); G.objs.splice(i, 1); } continue; }
    if (o.ty === 'crate' && G.y > .75) continue;
    if (o.ty === 'bar' && G.slide > 0) continue;
    o.hit = 1; return die(o.ty === 'mon' ? o.name : CHASE[(Math.random() * 3) | 0], o.ty);
  }
  G.stepT -= dt; if (G.stepT <= 0 && G.y === 0) { G.stepT = .32 - Math.min(.14, G.t * .002); S.run.feet(G.chase); }
  if (shake > 0) shake -= dt;
  if (G.howto > 0) { G.howto -= dt; if (G.howto <= 0) $('#howto').classList.add('off'); }
}
/* ---------- drawing ---------- */
const TILE = 2.2;
function quad(z0, z1, a, b, fill) { // ground band between z0 and z1, lane-span a..b (in lane units)
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(sx(a, z0), sy(z0)); ctx.lineTo(sx(b, z0), sy(z0)); ctx.lineTo(sx(b, z1), sy(z1)); ctx.lineTo(sx(a, z1), sy(z1)); ctx.fill();
}
function draw() {
  const ox = shake > 0 && !RM ? (Math.random() - .5) * 10 : 0, oy = shake > 0 && !RM ? (Math.random() - .5) * 8 : 0;
  ctx.setTransform(DPR, 0, 0, DPR, ox * DPR, oy * DPR);
  ctx.drawImage(BD, 0, 0, W, HY + 4);
  ctx.fillStyle = '#0d0b10'; ctx.fillRect(0, HY, W, H - HY);
  // path tiles
  const off = G.dist % (TILE * 2);
  quad(-1, ZFAR, -1.62, 1.62, '#2a2620');
  for (let z = -off; z < ZFAR; z += TILE * 2) quad(Math.max(-1, z), z + TILE, -1.62, 1.62, '#36312a');
  // kerbs + lane seams
  ctx.strokeStyle = 'rgba(233,223,201,.16)'; ctx.lineWidth = 2; [-.5, .5].forEach(l => { ctx.beginPath(); ctx.moveTo(sx(l, -1), sy(-1)); ctx.lineTo(sx(l, ZFAR), sy(ZFAR)); ctx.stroke(); });
  quad(-1, ZFAR, -1.78, -1.62, '#6b5f4c'); quad(-1, ZFAR, 1.62, 1.78, '#6b5f4c');
  // fence posts and lamps
  const pOff = G.dist % 6;
  for (let z = ZFAR - pOff; z > -1; z -= 6) {
    const s = sc(z), y = sy(z), h = 70 * s, k = Math.round((G.dist + z) / 6);
    [-1.95, 1.95].forEach((l, j) => {
      const x = sx(l, z); ctx.fillStyle = '#17131b'; ctx.fillRect(x - 3 * s, y - h, 6 * s, h);
      if ((k + j) % 3 === 0) { // lamp
        ctx.fillRect(x - 2 * s, y - h * 2.2, 4 * s, h * 2.2); const on = !((k * 7 + j) % 5 === 0 && (G.t * 3 | 0) % 2);
        if (on) { ctx.fillStyle = 'rgba(255,214,130,.16)'; ctx.beginPath(); ctx.arc(x, y - h * 2.2, 26 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(x, y - h * 2.2, 5 * s, 0, 7); ctx.fill(); }
      }
    });
    ctx.strokeStyle = '#17131b'; ctx.lineWidth = Math.max(1, 3 * s);
    [-1.95, 1.95].forEach(l => { ctx.beginPath(); ctx.moveTo(sx(l, z), y - h * .7); ctx.lineTo(sx(l, z + 6), sy(z + 6) - 70 * sc(z + 6) * .7); ctx.stroke(); });
  }
  // objects far to near
  G.objs.sort((a, b) => b.z - a.z);
  for (const o of G.objs) { if (o.z > ZFAR || o.z < -1.5) continue; drawObj(o); if (o.z < ZP && !o.pdrawn) {} }
  drawPlayer();
  drawChasers();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function drawObj(o) {
  const s = sc(o.z), x = sx(o.lane, o.z), y = sy(o.z), lw = RW * .62 * s;
  if (o.ty === 'pel') { const b = Math.sin(G.t * 6 + o.bob) * 4 * s; ctx.fillStyle = '#d8b441'; ctx.beginPath(); ctx.arc(x, y - 26 * s + b, 8 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#fff3b8'; ctx.beginPath(); ctx.arc(x - 2.5 * s, y - 29 * s + b, 2.4 * s, 0, 7); ctx.fill(); return; }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, lw * .5, 6 * s, 0, 0, 7); ctx.fill();
  if (o.ty === 'crate') { const w = lw * .82, h = w * .62; ctx.fillStyle = '#8a5a2e'; ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeStyle = '#4a2e16'; ctx.lineWidth = Math.max(1, 4 * s); ctx.strokeRect(x - w / 2, y - h, w, h); ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y); ctx.moveTo(x + w / 2, y - h); ctx.lineTo(x - w / 2, y); ctx.stroke(); ctx.fillStyle = '#e9dfc9'; ctx.font = '400 ' + Math.max(6, 11 * s) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FEED', x, y - h * .44); return; }
  if (o.ty === 'bar') { const w = lw, top = y - 150 * s, h = 34 * s; ctx.fillStyle = '#1b161e'; ctx.fillRect(x - w / 2, top, 5 * s, 150 * s); ctx.fillRect(x + w / 2 - 5 * s, top, 5 * s, 150 * s); ctx.fillStyle = '#d8b441'; ctx.fillRect(x - w / 2, top + 50 * s, w, h); ctx.fillStyle = '#1f1c17'; for (let i = 0; i < 6; i++) { ctx.beginPath(); const bx = x - w / 2 + i * w / 6; ctx.moveTo(bx, top + 50 * s + h); ctx.lineTo(bx + w / 12, top + 50 * s); ctx.lineTo(bx + w / 6, top + 50 * s); ctx.lineTo(bx + w / 12, top + 50 * s + h); ctx.fill(); } ctx.fillStyle = '#e2231a'; ctx.font = '400 ' + Math.max(6, 10 * s) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DUCK', x, top + 40 * s); return; }
  if (o.ty === 'cage') { const w = lw * .9, h = w * 1.15; ctx.fillStyle = 'rgba(20,16,24,.85)'; ctx.fillRect(x - w / 2, y - h, w, h); ctx.fillStyle = '#7b7c80'; for (let i = 0; i <= 6; i++) ctx.fillRect(x - w / 2 + i * (w / 6) - 2 * s, y - h, 4 * s, h); ctx.fillRect(x - w / 2, y - h, w, 6 * s); ctx.fillRect(x - w / 2, y - 6 * s, w, 6 * s); const gl = (Math.sin(G.t * 2 + o.bob) + 1) * .5; ctx.fillStyle = 'rgba(255,90,58,' + (.4 + gl * .5) + ')'; ctx.fillRect(x - 8 * s, y - h * .6, 4 * s, 3 * s); ctx.fillRect(x + 4 * s, y - h * .6, 4 * s, 3 * s); return; }
  if (o.ty === 'mon') { const sp = SPR[o.name]; const w = lw * 1.6, h = w * .75; const b = Math.abs(Math.sin(G.t * 5 + o.bob)) * 5 * s; if (sp) ctx.drawImage(sp.lit, x - w / 2, y - h * .833 - b, w, h); else { ctx.fillStyle = '#2a2523'; ctx.fillRect(x - w / 4, y - h * .8, w / 2, h * .8); } ctx.fillStyle = 'rgba(8,6,10,.35)'; ctx.fillRect(x - w / 2, y - h, w, h * 0); return; }
}
function drawPlayer() {
  const z = ZP, s = sc(z), x = CX + G.lx * RW * .66 * s, gy = sy(z), jy = G.y * 60 * s, sl = G.slide > 0, ph = G.t * (8 + G.v * .3);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x, gy, 26 * s * (1 - G.y * .15), 7 * s, 0, 0, 7); ctx.fill();
  const u = 1.3 * s, by = gy - jy; ctx.lineCap = 'round';
  if (sl) { // sliding: low and wide
    ctx.fillStyle = '#d9a03d'; ctx.beginPath(); ctx.ellipse(x, by - 20 * u, 26 * u, 15 * u, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(x, by - 36 * u, 11 * u, 0, 7); ctx.fill(); return;
  }
  const a = Math.sin(ph), lgA = G.y > 0 ? .6 : a;
  ctx.strokeStyle = '#1f2a44'; ctx.lineWidth = 9 * u; // legs
  ctx.beginPath(); ctx.moveTo(x - 7 * u, by - 40 * u); ctx.lineTo(x - 9 * u + lgA * 6 * u, by - 4 * u - Math.max(0, lgA) * 12 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 7 * u, by - 40 * u); ctx.lineTo(x + 9 * u - lgA * 6 * u, by - 4 * u - Math.max(0, -lgA) * 12 * u); ctx.stroke();
  ctx.strokeStyle = '#d9a03d'; ctx.lineWidth = 7 * u; // arms
  ctx.beginPath(); ctx.moveTo(x - 15 * u, by - 72 * u); ctx.lineTo(x - 24 * u, by - 50 * u - a * 10 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 15 * u, by - 72 * u); ctx.lineTo(x + 24 * u, by - 50 * u + a * 10 * u); ctx.stroke();
  ctx.fillStyle = '#e0a63f'; ctx.beginPath(); ctx.moveTo(x - 17 * u, by - 78 * u); ctx.lineTo(x + 17 * u, by - 78 * u); ctx.lineTo(x + 15 * u, by - 38 * u); ctx.lineTo(x - 15 * u, by - 38 * u); ctx.fill(); // raincoat
  ctx.fillStyle = '#8f2a22'; ctx.fillRect(x - 11 * u, by - 74 * u, 22 * u, 24 * u); // backpack
  ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(x, by - 90 * u, 12 * u, 0, 7); ctx.fill(); // head
  ctx.fillStyle = '#f3ead3'; ctx.fillRect(x - 6 * u, by - 68 * u, 12 * u, 7 * u); // ticket on the pack
}
function drawChasers() {
  const k = Math.min(1.15, G.chase), base = H * (1.3 - k * .36);
  CHASE.forEach((name, i) => {
    const sp = SPR[name], w = Math.min(W * .62, H * .55) * (i === 0 ? 1.08 : .92), h = w * .75;
    const x = CX + (i === 0 ? 0 : i === 1 ? -1 : 1) * W * .3 + Math.sin(G.t * 3 + i) * 8, y = base + (i === 0 ? 0 : 18) + Math.abs(Math.sin(G.t * 7 + i * 2)) * 14;
    if (sp) ctx.drawImage(sp.dark, x - w / 2, y - h, w, h);
    // eyes stay lit
    const ey = y - h * (name === 'The Long Keeper' ? .78 : name === 'The Hollow Stag' ? .6 : .62), ex = x + (name === 'Pip' ? 0 : 0);
    ctx.fillStyle = name === 'Pip' ? '#ffe07a' : '#ff4a2e';
    ctx.beginPath(); ctx.ellipse(ex - w * .055, ey, w * .022, w * .014, 0, 0, 7); ctx.ellipse(ex + w * .055, ey, w * .022, w * .014, 0, 0, 7); ctx.fill();
  });
}
/* ---------- loop ---------- */
function frame(ts) {
  raf = requestAnimationFrame(frame);
  if (!running || paused) { last = ts; return; }
  let dt = (ts - last) / 1000; last = ts; if (!(dt > 0)) dt = 1 / 60; dt = Math.min(dt, 1 / 20);
  step(dt); if (!G) return; draw();
  hudT -= dt; if (hudT <= 0) { hudT = .1; gred.style.opacity = Math.max(0, (G.chase - .45) * 1.4).toFixed(2); $('#hudM').textContent = Math.floor(G.dist); $('#hudP').textContent = G.pel; }
}
function die(name, ty) {
  if (G.dead) return; G.dead = true; G.by = name; S.run.crash(); shake = .5;
  if (navigator.vibrate && !RM) try { navigator.vibrate([200, 40, 300]); } catch (e) {}
  draw(); running = false;
  const m = Math.floor(G.dist), score = m + G.pel * 10, best = +(LS.get('bw.best') || 0), nb = score > best;
  if (nb) LS.set('bw.best', String(score));
  LS.set('bw.toured', '1');
  setTimeout(() => {
    $('#ovBy').textContent = ty === 'crate' ? 'Tripped on a feed crate. Caught by' : ty === 'bar' ? 'Hit the sign. Caught by' : ty === 'cage' ? 'Ran into a cage. Caught by' : 'Caught by';
    $('#ovName').textContent = ty === 'crate' || ty === 'bar' || ty === 'cage' ? CHASE[(Math.random() * 3) | 0] : name;
    $('#ovM').textContent = m; $('#ovP').textContent = G.pel; $('#ovS').textContent = score;
    const ob = $('#ovBest'); ob.textContent = nb ? 'New best: ' + score : 'Best: ' + Math.max(best, score); ob.classList.toggle('new', nb);
    $('#hudB').textContent = Math.max(best, score);
    const txt = `i made it ${m} m out of Brightwater Zoo before ${$('#ovName').textContent.replace(/^The /, 'the ')} got me. score ${score}. take the tour, sound on`;
    $('#share').href = 'https://x.com/intent/post?text=' + encodeURIComponent(txt) + '&url=' + encodeURIComponent(URL_LIVE);
    if (PHONE || WEBVIEW) $('#share').removeAttribute('target');
    $('#over').hidden = false; S.run.stop();
  }, 700);
}
function start() {
  prep(); game.classList.add('on'); size(); reset();
  $('#over').hidden = true; $('#howto').classList.remove('off'); $('#hudB').textContent = LS.get('bw.best') || 0;
  S.run.chaseOn(); running = true; paused = false; last = performance.now();
  if (!raf) raf = requestAnimationFrame(frame);
}
/* ---------- input ---------- */
let tx = 0, ty = 0, tdone = false, tActive = false;
game.addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; tdone = false; tActive = true; }, { passive: true });
game.addEventListener('touchmove', e => { if (e.cancelable) e.preventDefault(); if (!tActive || tdone) return; const t = e.touches[0], dx = t.clientX - tx, dy = t.clientY - ty; if (Math.max(Math.abs(dx), Math.abs(dy)) > 26) { tdone = true; act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D')); } }, { passive: false });
game.addEventListener('touchend', e => { if (!tActive) return; tActive = false; if (tdone) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; if (Math.max(Math.abs(dx), Math.abs(dy)) > 14) act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D')); }, { passive: true });
// mouse drag for desktop testing
let md = null; game.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') md = [e.clientX, e.clientY]; });
game.addEventListener('pointerup', e => { if (!md || e.pointerType !== 'mouse') return; const dx = e.clientX - md[0], dy = e.clientY - md[1]; md = null; if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D')); });
addEventListener('keydown', e => {
  if (!game.classList.contains('on')) return; const k = e.key.toLowerCase();
  const m = { arrowleft: 'L', a: 'L', arrowright: 'R', d: 'R', arrowup: 'U', w: 'U', ' ': 'U', arrowdown: 'D', s: 'D' }[k];
  if (m) { e.preventDefault(); act(m); }
  if (k === 'enter' && G && G.dead) start();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && running && !G.dead) { paused = true; $('#resume').hidden = false; } });
$('#resume').addEventListener('click', () => { paused = false; $('#resume').hidden = true; last = performance.now(); S.kick(); });
addEventListener('resize', () => { if (game.classList.contains('on')) size(); }, { passive: true });
$('#again').addEventListener('click', () => { S.kick(); start(); });
$('#toTour').addEventListener('click', () => { scrollTo(0, 0); location.reload(); });
window.RUN = { prep, start, act, get G() { return G; }, get running() { return running; } };
})();

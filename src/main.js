/* Brightwater Zoo 3D: a first-person walk through fifty enclosures. Scroll to walk, swipe to turn, tap the animals. */
import * as THREE from 'three';
import { buildModel, animate, mat, GEO } from './models.js';
import { E, Z, STOPS, GATES, S_EXIT, S_D0, frame, yawAt, zoneAt, buildWorld } from './world.js';
import { placardAtlas, gateTextures, signTextures } from './tex.js';
import { Runner } from './runner.js';

const $ = s => document.querySelector(s);
const UA = navigator.userAgent || '';
const IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MOBILE = IOS || /Android|Mobile/i.test(UA) || matchMedia('(pointer:coarse)').matches;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SFX = window.SFX || { voice() {}, step() {}, setDread() {}, on: false, unlock() {}, hushAll() {}, giggle() {}, whisper() {}, heart() {}, feed() {}, ui() {}, sting() {}, roar() {}, breath() {}, run: {} };
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ESC = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BW = window.__bw3 = { mode: 'boot', s: 0, d: 0, facing: 0, stop: 0, card: -1, fps: 0, frames: 0, errors: [], scared: false, env: { IOS, MOBILE, RM } };
addEventListener('error', e => BW.errors.push(String(e.message)));

// ---------- renderer ----------
let renderer;
function makeRenderer() {
  const cv = $('#gl');
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !MOBILE || devicePixelRatio < 2.5, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;
  return true;
}
if (!makeRenderer()) {
  document.documentElement.classList.add('nogl');
  BW.mode = 'nogl';
  window.__bwBegin = () => {}; throw new Error('WebGL unavailable');
}
let PR = Math.min(devicePixelRatio || 1, MOBILE ? 1.75 : 1.5);
renderer.setPixelRatio(PR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, .1, 420);
scene.add(camera);
scene.fog = new THREE.Fog('#cfeeff', 30, 120);

// sky dome
const skyU = { top: { value: new THREE.Color('#6fc3ff') }, hor: { value: new THREE.Color('#d8f1ff') }, bot: { value: new THREE.Color('#d8f1ff') } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying float vY; void main(){ vec3 c = vY > 0.0 ? mix(hor, top, pow(clamp(vY,0.0,1.0), 0.6)) : mix(hor, bot, clamp(-vY*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}'
}));
sky.renderOrder = -10; scene.add(sky);
const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: '#fff6d8', fog: false }));
scene.add(sun);
const hemi = new THREE.HemisphereLight('#ffffff', '#8fbf6a', 1.6); scene.add(hemi);
const dir = new THREE.DirectionalLight('#fff4dc', 2.2); scene.add(dir); scene.add(dir.target);
const gateLamp = new THREE.SpotLight('#ffe2b0', 0, 14, .42, .5, 1.0); scene.add(gateLamp); scene.add(gateLamp.target);
const torch = new THREE.SpotLight('#fff2d6', 0, 26, .5, .55, 1.1); camera.add(torch); torch.position.set(.2, -.2, 0); camera.add(torch.target); torch.target.position.set(0, -.6, -6);

// ---------- escalation curve ----------
// d: 0 for the first ten exhibits, then creeps up to 1 at the exit. Every value is interpolated.
const KEYS = [
  { d: 0, top: '#5fb8ff', hor: '#d6f0ff', fog: '#d4efff', fn: 34, ff: 135, hs: '#ffffff', hg: '#9cc97a', hi: 1.55, sc: '#fff4dc', si: 2.3, el: 62, az: .4 },
  { d: .18, top: '#6aaee8', hor: '#f2ead0', fog: '#efe6cf', fn: 32, ff: 125, hs: '#fff7e8', hg: '#a6be7a', hi: 1.45, sc: '#ffe9c0', si: 2.1, el: 42, az: .55 },
  { d: .36, top: '#5f86c4', hor: '#ffc283', fog: '#f4bd88', fn: 26, ff: 105, hs: '#ffe2c0', hg: '#9a9a6a', hi: 1.2, sc: '#ffb066', si: 1.8, el: 17, az: .7 },
  { d: .5, top: '#2c3766', hor: '#d9786a', fog: '#a7697a', fn: 20, ff: 85, hs: '#c9a0b4', hg: '#5a5a58', hi: .85, sc: '#ff7a50', si: .9, el: 4, az: .8 },
  { d: .64, top: '#1d2828', hor: '#6a7a62', fog: '#5e6b56', fn: 12, ff: 58, hs: '#9fb08f', hg: '#2c3328', hi: .55, sc: '#a8b890', si: .3, el: -3, az: .85 },
  { d: .8, top: '#06090c', hor: '#1a221d', fog: '#141a16', fn: 7, ff: 40, hs: '#3a4a52', hg: '#101410', hi: .26, sc: '#405060', si: .08, el: -10, az: .9 },
  { d: 1, top: '#000000', hor: '#050706', fog: '#040505', fn: 3, ff: 26, hs: '#2a3440', hg: '#050505', hi: .07, sc: '#000000', si: 0, el: -20, az: .9 }
];
KEYS.forEach(k => { for (const p of ['top', 'hor', 'fog', 'hs', 'hg', 'sc']) k[p] = new THREE.Color(k[p]); });
const CUR = {};
function curve(d) {
  let i = 0; while (i < KEYS.length - 2 && d > KEYS[i + 1].d) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = clamp((d - a.d) / (b.d - a.d), 0, 1);
  for (const p of ['top', 'hor', 'fog', 'hs', 'hg', 'sc']) (CUR[p] || (CUR[p] = new THREE.Color())).copy(a[p]).lerp(b[p], t);
  for (const p of ['fn', 'ff', 'hi', 'si', 'el', 'az']) CUR[p] = lerp(a[p], b[p], t);
  CUR.torch = sstep(.8, .95, d); CUR.d = d;
  return CUR;
}
BW.curve = d => { const c = curve(d); return { sky: '#' + c.top.getHexString(), fog: '#' + c.fog.getHexString(), fogFar: +c.ff.toFixed(1), hemi: +c.hi.toFixed(3), sun: +c.si.toFixed(3), sunEl: +c.el.toFixed(1), torch: +c.torch.toFixed(3) }; };
const dAt = s => Math.pow(clamp((s - S_D0) / (S_EXIT - S_D0), 0, 1), 1.08);
BW.dAt = dAt;

let lastD = -1, override = null;
function applyCurve(d, camPos) {
  const c = curve(d);
  skyU.top.value.copy(c.top); skyU.hor.value.copy(c.hor); skyU.bot.value.copy(c.fog);
  scene.fog.color.copy(c.fog); scene.fog.near = c.fn; scene.fog.far = c.ff;
  renderer.setClearColor(c.fog);
  hemi.color.copy(c.hs); hemi.groundColor.copy(c.hg); hemi.intensity = c.hi;
  dir.color.copy(c.sc); dir.intensity = c.si;
  const el = c.el * Math.PI / 180, az = c.az * Math.PI;
  const sd = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
  dir.position.copy(camPos).addScaledVector(sd, 50); dir.target.position.copy(camPos);
  sun.position.copy(camPos).addScaledVector(sd, 300); sun.lookAt(camPos);
  sun.material.color.copy(c.sc).lerp(new THREE.Color('#ffffff'), .5); sun.visible = c.el > -6;
  sun.scale.setScalar(1 + sstep(.3, .55, d) * .6);
  BW.torchBase = c.torch;
  if (W) {
    W.cloudMat.color.copy(c.hor).lerp(new THREE.Color('#ffffff'), .6 * (1 - d)); W.clouds.visible = d < .75;
    W.glowMat.opacity = sstep(.35, .7, d) * .55;
    W.pawMat.color.set('#ffffff').lerp(new THREE.Color('#5a1a12'), sstep(.6, .95, d));
  }
  document.documentElement.style.setProperty('--d', d.toFixed(3));
}

// ---------- world ----------
let W = null;
const crowd = { n: 64, list: [] }, eyes = { n: 40, list: [] };
let crowdBody, crowdHead, eyeMesh, crosser, keeperGhost, pipBoss;
function buildAll() {
  const atlas = placardAtlas();
  W = buildWorld(scene, atlas, gateTextures(GATES), signTextures());
  // visitors (instanced capsules) that thin out as the day goes on
  const shirt = ['#e0892b', '#3f7d3a', '#d9566b', '#3b4f8f', '#1f7f86', '#d8b441', '#f3ede0', '#8f5a9f'];
  crowdBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .24, 1.15, 6), new THREE.MeshLambertMaterial({ flatShading: true }), crowd.n);
  crowdHead = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.17, 0), new THREE.MeshLambertMaterial({ flatShading: true }), crowd.n);
  const f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
  for (let i = 0; i < crowd.n; i++) {
    const s = 6 + Math.random() * (S_EXIT * .62), lat = (Math.random() < .5 ? -1 : 1) * (1.3 + Math.random() * 1.1);
    frame(s, f); const kid = Math.random() < .3;
    crowd.list.push({ s, lat, kid, thr: .05 + Math.pow(Math.random(), .8) * .62 * (s / S_EXIT + .3), ph: Math.random() * 9, x: f.p.x + f.r.x * lat, z: f.p.z + f.r.z * lat, yaw: Math.atan2(f.r.x * Math.sign(-lat), f.r.z * Math.sign(-lat)) + Math.PI });
    crowdBody.setColorAt(i, new THREE.Color(shirt[i % shirt.length])); crowdHead.setColorAt(i, new THREE.Color(['#e7c09a', '#b98055', '#7a4a2a', '#f0d2b4'][i % 4]));
  }
  // one straggler who never moves
  frame(STOPS[17].s + 3, f); crowd.list.push({ s: STOPS[17].s + 3, lat: 1.6, kid: false, thr: 2, still: 1, ph: 0, x: f.p.x + f.r.x * 1.6, z: f.p.z + f.r.z * 1.6, yaw: yawAt(STOPS[17].s) - Math.PI / 2 });
  crowdBody.count = crowdHead.count = crowd.list.length;
  crowdBody.setColorAt(crowd.list.length - 1, new THREE.Color('#5a5a58')); crowdHead.setColorAt(crowd.list.length - 1, new THREE.Color('#bdb6a6'));
  crowdBody.frustumCulled = crowdHead.frustumCulled = false; scene.add(crowdBody, crowdHead);
  // eyes in the trees
  eyeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 6, 4), new THREE.MeshBasicMaterial({ fog: false }), eyes.n * 2);
  for (let i = 0; i < eyes.n; i++) {
    const s = S_D0 + 40 + Math.random() * (S_EXIT - S_D0 - 40), side = Math.random() < .5 ? -1 : 1, lat = 8.5 + Math.random() * 9;
    frame(s, f); const x = f.p.x + f.r.x * lat * side, z = f.p.z + f.r.z * lat * side, y = .4 + Math.random() * 2.2;
    eyes.list.push({ s, x, z, y, side, rx: f.t.x * .13, rz: f.t.z * .13, thr: dAt(s) * .6 + .35 + Math.random() * .2, ph: Math.random() * 20 });
    const c = new THREE.Color(Math.random() < .3 ? '#ff4a2e' : '#f3d36b'); eyeMesh.setColorAt(i * 2, c); eyeMesh.setColorAt(i * 2 + 1, c);
  }
  eyeMesh.frustumCulled = false; scene.add(eyeMesh);
  // shadow things
  const black = mat('#050505', 'basic');
  const blackify = R => R.root.traverse(o => { if (o.isMesh && o.material !== undefined && !(o.material.type === 'MeshBasicMaterial' && o.material.color.getHex() !== 0x000000 && o.material.fog === false)) o.material = o.material.transparent ? o.material : black; });
  crosser = buildModel(E.find(e => e.n === 'Chupacabra')); blackify(crosser); crosser.root.visible = false; scene.add(crosser.root); crosser.t = -1;
  keeperGhost = buildModel(E.find(e => e.n === 'The Long Keeper')); blackify(keeperGhost); keeperGhost.root.visible = false; scene.add(keeperGhost.root); keeperGhost.shown = {};
  pipBoss = buildModel(E.find(e => e.n === 'Pip')); pipBoss.root.visible = false; scene.add(pipBoss.root);
  BW.counts = W.counts;
}

// ---------- state ----------
const T = { s: 0, tgt: 2, v: 0, face: 0, faceF: 0, lastIn: 0, bob: 0, stepAcc: 0, card: -1, k: new Float32Array(64), turned: 0, hint: 1 };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let lastStepT = 0, mode = 'boot', t0 = 0, now = 0, began = false;
const nearestStop = s => { let b = 0, bd = 1e9; STOPS.forEach((st, i) => { const dd = Math.abs(st.s - s); if (dd < bd) { bd = dd; b = i; } }); return { i: b, dist: bd }; };

// ---------- input ----------
const MAXS = S_EXIT + .5;
function walk(ds) {
  if (mode !== 'tour') return;
  if (T.card >= 0) closeCard();
  if (T.face !== 0) { if (Math.abs(ds) > .05) turnTo(0); return; }
  T.tgt = clamp(T.tgt + ds, 0, MAXS); T.lastIn = now; hideHint(1);
}
function turnTo(dirn) {
  if (mode !== 'tour') return;
  if (dirn !== 0) {
    const n = nearestStop(T.s); T.tgt = STOPS[n.i].s; T.v = 0;
    if (T.face === -dirn) dirn = 0; // turning back the other way faces the path
  }
  if (dirn !== T.face) { if (T.card >= 0) closeCard(); T.face = dirn; T.turned++; hideHint(2); SFX.step && SFX.step(dirn * .5, 0, .05);
    if (dirn !== 0 && BW.d > .42 && crosser.t < 0 && Math.random() < .55) crossNow(); }
}
BW.turnTo = turnTo;
BW.jump = q => { const s = q <= 1 ? q * S_EXIT : q; T.s = T.tgt = T.prevS = clamp(s, 0, MAXS - 1); T.v = 0; T.lastIn = now; };
BW.stops = STOPS; BW.S_EXIT = S_EXIT; BW.scene = scene; BW.sky = sky; BW.sun = sun; BW.getW = () => W; BW.pip = () => pipBoss; BW.cam = camera;
const cv = $('#gl');
cv.addEventListener('wheel', e => {
  e.preventDefault(); if (mode !== 'tour') return;
  const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
  const dx = e.deltaX * k, dy = e.deltaY * k;
  if (Math.abs(dx) > Math.abs(dy) * 1.5) { T.hx = (T.hx || 0) + dx; if (Math.abs(T.hx) > 80) { turnTo(T.hx > 0 ? 1 : -1); T.hx = 0; T.hxLock = now; } return; }
  walk(clamp(dy, -240, 240) * .014);
}, { passive: false });
let tp = null;
function tStart(x, y) { tp = { x0: x, y0: y, x, y, t: now, ax: 0, vy: 0, lt: performance.now() }; T.v = 0; }
function tMove(x, y) {
  if (!tp) return; const dx = x - tp.x0, dy = y - tp.y0;
  if (!tp.ax && Math.hypot(dx, dy) > 12) tp.ax = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
  if (tp.ax === 'v') { const k = .032 * 844 / Math.max(500, innerHeight), dd = (tp.y - y) * k, t = performance.now(), dt = Math.max(1, t - tp.lt) / 1000; walk(dd); tp.vy = lerp(tp.vy, dd / dt, .5); tp.lt = t; }
  tp.x = x; tp.y = y;
}
function tEnd(x, y) {
  if (!tp) return; const dx = x - tp.x0, dy = y - tp.y0, dur = now - tp.t;
  if (tp.ax === 'h' && Math.abs(dx) > 36) turnTo(dx < 0 ? -1 : 1);
  else if (tp.ax === 'v') {
    // a flick carries you on to the next stop in that direction, never past it
    const v = performance.now() - tp.lt < 90 ? tp.vy : 0;
    if (Math.abs(v) > 4 && T.face === 0) { const ahead = v > 0 ? STOPS.find(st => st.s > T.tgt + .6) : [...STOPS].reverse().find(st => st.s < T.tgt - .6); T.tgt = ahead ? ahead.s : (v > 0 ? MAXS : 0); T.v = 0; T.lastIn = now; }
  }
  else if (!tp.ax && dur < .5) tap(x, y);
  tp = null;
}
const pt = e => (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e;
cv.addEventListener('touchstart', e => { e.preventDefault(); const p = pt(e); tStart(p.clientX, p.clientY); }, { passive: false });
cv.addEventListener('touchmove', e => { e.preventDefault(); const p = pt(e); tMove(p.clientX, p.clientY); }, { passive: false });
cv.addEventListener('touchend', e => { e.preventDefault(); const p = pt(e); tEnd(p.clientX, p.clientY); }, { passive: false });
cv.addEventListener('touchcancel', () => { tp = null; });
let mdown = false;
cv.addEventListener('mousedown', e => { mdown = true; tStart(e.clientX, e.clientY); });
addEventListener('mousemove', e => { if (mdown) tMove(e.clientX, e.clientY); });
addEventListener('mouseup', e => { if (mdown) { mdown = false; tEnd(e.clientX, e.clientY); } });
const keys = {};
addEventListener('keydown', e => {
  if (mode !== 'tour') return; const k = e.key;
  if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(k)) { keys[k.toLowerCase()] = 1; e.preventDefault(); }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { turnTo(-1); e.preventDefault(); }
  if (k === 'ArrowRight' || k === 'd' || k === 'D') { turnTo(1); e.preventDefault(); }
  if ((k === 'Enter' || k === ' ') && T.face) { const ex = facedEx(); if (ex) openCard(ex.idx); e.preventDefault(); }
  if (k === 'Escape') { closeCard(); }
});
addEventListener('keyup', e => { delete keys[e.key.toLowerCase()]; });
$('#tl').addEventListener('click', () => turnTo(-1)); $('#tr').addEventListener('click', () => turnTo(1));
$('#tf').addEventListener('click', () => { if (T.face) return turnTo(0); const nx = STOPS.find(st => st.s > T.s + 1.5); walk((nx ? nx.s : MAXS) - T.tgt); });

// ---------- tapping animals ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function facedEx() { if (!T.face) return null; const st = STOPS[nearestStop(T.s).i]; const i = T.face < 0 ? st.L : st.R; const idx = W.ex.findIndex(x => x.i === i); return idx >= 0 ? { idx, ex: W.ex[idx] } : null; }
function tap(x, y) {
  if (mode !== 'tour' || !W) return;
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const near = W.ex.filter(ex => Math.abs(STOPS[ex.si].s - T.s) < 30).map(ex => ex.proxy);
  const hit = ray.intersectObjects(near, false)[0];
  if (hit && hit.distance < 22) { const idx = hit.object.userData.ex; if (T.card === idx) return; openCard(idx); return; }
  if (T.card >= 0) closeCard();
}
BW.tapAt = tap;
BW.project = idx => { const ex = W.ex[idx]; const p = (ex.R ? new THREE.Vector3().setFromMatrixPosition(ex.R.root.matrixWorld).add(new THREE.Vector3(0, ex.R.h * .5, 0)) : ex.center.clone()).project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, z: p.z }; };

// ---------- the card ----------
const IUCN = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC'], IUCNL = { CR: 'Critically endangered', EN: 'Endangered', VU: 'Vulnerable', NT: 'Near threatened', LC: 'Least concern' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function openCard(idx) {
  const ex = W.ex[idx], e = ex.e, z = Z[e.z], d = dAt(STOPS[ex.si].s);
  T.card = idx; BW.card = ex.i; T.k[idx] = 1;
  const p = BW.project(idx), pan = clamp((p.x / innerWidth) * 2 - 1, -1, 1);
  SFX.voice(e.snd, d, pan);
  if (e.n === 'Pip' || ex.absent) SFX.giggle && SFX.giggle(pan);
  let status = '';
  if (e.t === 'real') status = `<div class="iucn">${IUCN.map(c => `<i class="${c === e.st ? 'on' : ''}">${c}</i>`).join('')}</div><p class="iucn-l">IUCN Red List: ${IUCNL[e.st]}</p>`;
  else status = `<p class="tag ${e.t}">${ESC(e.st)}</p>`;
  const el = Math.round((performance.now() - t0) / 1000);
  const facts = e.f.map(([k, v]) => { let vv = ESC(v).replace('{elapsed}', `${Math.floor(el / 60)} min ${el % 60} s`); if (e.scrawl && e.scrawl[0] === k) vv = `<s>${ESC(v)}</s> <span class="hw">${ESC(e.scrawl[2])}</span>`; return `<dt>${ESC(k)}</dt><dd>${vv}</dd>`; }).join('');
  const kind = e.t === 'anime' ? 'Spirit Grove resident · parody name' : e.t === 'monster' ? 'Quarantine Wing · folklore' : e.t === 'you' ? 'Final exhibit' : z.name;
  const empty = ex.absent ? `<p class="empty">This enclosure is empty.</p>` : '';
  const c = $('#card');
  c.innerHTML = `<div class="c-top" style="--zc:${z.col}"><span>${ESC(kind)}</span><span>Nº ${String(ex.i + 1).padStart(2, '0')} / 50</span></div>
  <h2>${ESC(e.n)}</h2><p class="sci">${ESC(e.sci)}</p>${status}${empty}<dl>${facts}</dl><p class="hist">${ESC(e.h)}</p>
  <div class="log ${d > .55 ? 'bad' : ''}"><b>Keeper\u2019s log · ${DAYS[(ex.i * 3) % 7]}</b><p>${ESC(e.note)}</p></div>
  <div class="c-btns"><button class="btn sm" id="cFeed">${ex.absent ? 'Knock on the bars' : e.t === 'you' ? 'Wave' : 'Feed'}</button><button class="linkbtn" id="cX">Close</button></div>`;
  c.style.setProperty('--ox', Math.round(p.x) + 'px'); c.style.setProperty('--oy', Math.round(p.y) + 'px');
  c.hidden = false; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
  $('#cX').onclick = closeCard;
  $('#cFeed').onclick = () => { T.k[idx] = 1; SFX.feed(); setTimeout(() => SFX.voice(e.snd, d, pan), 250); if (d > .6 && Math.random() < .5) setTimeout(() => SFX.whisper(-pan), 900); };
  hideHint(3);
}
function closeCard() { if (T.card < 0) return; T.card = -1; BW.card = -1; const c = $('#card'); c.classList.remove('in'); c.hidden = true; }
$('#card').addEventListener('wheel', e => e.stopPropagation(), { passive: true });

// ---------- hints, hud ----------
function hideHint(n) { if (T.hint && n >= T.hint) { T.hint = n + 1; const h = $('#hint3d'); if (T.hint > 3) h.classList.add('gone'); else h.textContent = T.hint === 2 ? (MOBILE ? 'Swipe left or right to look into the cages' : 'Arrow keys ← → (or the side buttons) to face a cage') : (MOBILE ? 'Tap an animal' : 'Click an animal'); } }
const fmtClock = p => { const m = Math.round(600 + p * 480), h = Math.floor(m / 60), mm = m % 60; return `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };
let lastZone = '', hudT = 0;
function hud() {
  const p = clamp(T.s / S_EXIT, 0, 1);
  $('#clock').textContent = fmtClock(p);
  $('#visitors').textContent = Math.max(1, Math.round(2314 * Math.pow(1 - p, 2.4))).toLocaleString('en-GB');
  const n = nearestStop(T.s), st = STOPS[n.i], at = n.dist < 4;
  const name = i => i < 0 ? '' : E[i].n;
  $('#tl').querySelector('span').textContent = T.face === 1 ? 'Path' : T.face === -1 ? '' : at ? name(st.L) || 'Bench' : '';
  $('#tr').querySelector('span').textContent = T.face === -1 ? 'Path' : T.face === 1 ? '' : at ? name(st.R) || 'Bench' : '';
  $('#tl').classList.toggle('off', T.face === -1); $('#tr').classList.toggle('off', T.face === 1);
  document.body.classList.toggle('atstop', at || T.face !== 0); document.body.classList.toggle('turned', T.face !== 0);
  $('#tf').querySelector('span').textContent = '';
  $('#tf').querySelector('i').textContent = T.face ? '▼' : '▲';
  $('#exn').textContent = `${Math.min(50, st.L + 1)}${st.R >= 0 ? '–' + (st.R + 1) : ''} / 50`;
  const z = zoneAt(T.s);
  if (z !== lastZone) { lastZone = z; const zz = Z[z]; $('#zoneName').textContent = zz.name; if (T.s > 10) banner(zz.name, zz.sub, zz.col); }
}
function banner(a, b, col) { const el = $('#banner'); el.innerHTML = `<b>${ESC(a)}</b><span>${ESC(b)}</span>`; el.style.setProperty('--zc', col); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

// ---------- creepy events ----------
function crossNow() { const fs = frame(T.s + 7); crosser.t = 0; crosser.dir = Math.random() < .5 ? -1 : 1; crosser.f = { p: fs.p.clone(), r: fs.r.clone(), t: fs.t.clone() }; crosser.root.visible = true; setTimeout(() => SFX.step && SFX.step(crosser.dir * .6, 0, .12), 200); setTimeout(() => SFX.step && SFX.step(crosser.dir * .8, 0, .1), 450); BW.crossed = (BW.crossed || 0) + 1; }
function creepy(dt) {
  // a dark shape crossing the avenue while you're looking into a cage
  if (crosser.t >= 0) {
    crosser.t += dt / 1.1; const k = crosser.t, f = crosser.f, lat = (k * 12 - 6) * crosser.dir;
    crosser.root.position.set(f.p.x + f.r.x * lat, 0, f.p.z + f.r.z * lat); crosser.root.rotation.y = Math.atan2(-f.r.z * crosser.dir, f.r.x * crosser.dir);
    animate(crosser, now, 1);
    if (k > 1) { crosser.root.visible = false; if (k > 9) crosser.t = -1; }
  }
  // the long keeper, for a quarter of a second, at the edge of the fog
  for (const si of [3, 6, 11]) {
    const s0 = STOPS[si].s + 4;
    if (!keeperGhost.shown[si] && T.s > s0 && T.s < s0 + 8 && T.face === 0 && T.s > (T.prevS || 0)) {
      keeperGhost.shown[si] = 1; keeperGhost.until = now + (RM ? .5 : .28);
      const f = frame(T.s + (si < 6 ? 44 : 28)), side = si === 6 ? 2 : -1.5;
      keeperGhost.root.position.set(f.p.x + f.r.x * side, 0, f.p.z + f.r.z * side); keeperGhost.root.rotation.y = Math.atan2(f.t.z, -f.t.x);
      BW.ghosts = (BW.ghosts || 0) + 1;
    }
  }
  keeperGhost.root.visible = now < (keeperGhost.until || 0);
}

// ---------- per-frame world updates ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s3 = new THREE.Vector3(), _e = new THREE.Euler(), _lp = new THREE.Vector3();
function updateCrowd(p) {
  crowd.list.forEach((c, i) => {
    let show = p < c.thr && Math.hypot(c.x - camPos.x, c.z - camPos.z) > (T.face ? 5.5 : 3.4);
    if (c.still) { show = T.s > STOPS[13].s && !c.gone; if (show && T.face !== 0 && Math.abs(T.s - c.s) < 6) c.seen = 1; if (c.seen && T.face === 0) c.gone = 1; }
    const sc = show ? (c.kid ? .7 : 1) : 0, bob = c.still ? 0 : Math.abs(Math.sin(now * 2 + c.ph)) * .04;
    _e.set(0, c.yaw + (c.still ? 0 : Math.sin(now * .4 + c.ph) * .5), 0); _q.setFromEuler(_e);
    _m.compose(_v.set(c.x, .58 * sc + bob, c.z), _q, _s3.set(sc, sc, sc)); crowdBody.setMatrixAt(i, _m);
    _m.compose(_v.set(c.x, 1.3 * sc + bob, c.z), _q, _s3.set(sc, sc, sc)); crowdHead.setMatrixAt(i, _m);
  });
  crowdBody.instanceMatrix.needsUpdate = crowdHead.instanceMatrix.needsUpdate = true;
}
function updateEyes(d) {
  eyes.list.forEach((e, i) => {
    const on = d > e.thr && Math.abs(e.s - T.s) < 40, blink = ((now + e.ph) % 5.5) < .14, sc = on ? (blink ? .15 : 1) : 0;
    _m.makeScale(1, sc, 1).setPosition(e.x + e.rx, e.y, e.z + e.rz); eyeMesh.setMatrixAt(i * 2, _m);
    _m.makeScale(1, sc, 1).setPosition(e.x - e.rx, e.y, e.z - e.rz); eyeMesh.setMatrixAt(i * 2 + 1, _m);
  });
  eyeMesh.instanceMatrix.needsUpdate = true;
}
function updateLamps(d) {
  const flick = d > .55;
  W.lamps.forEach(l => {
    let on = 1; if (flick) { const r = Math.sin(now * 23 + l.s) * Math.sin(now * 7.3 + l.s * 2); if (r > .85 - (d - .55)) on = .2; }
    if (l.dead && d > .7) on = 0; if (mode === 'ending' && BW.lightsOut) on = 0;
    _m.makeScale(on ? 1 : .001, on ? 1 : .001, on ? 1 : .001); W.bulbs.getMatrixAt(l.bi, _lp.m || (_lp.m = new THREE.Matrix4()));
    const pos = _v.setFromMatrixPosition(_lp.m); _m.setPosition(pos); W.bulbs.setMatrixAt(l.bi, _m);
    W.glows.getMatrixAt(l.gi, _lp.m); const gp = _v.setFromMatrixPosition(_lp.m); _m.makeScale(2.6 * (on ? 1 : .001), 1, 2.6 * (on ? 1 : .001)).setPosition(gp); W.glows.setMatrixAt(l.gi, _m);
  });
  W.bulbs.instanceMatrix.needsUpdate = W.glows.instanceMatrix.needsUpdate = true;
}
function updateExhibits(dt) {
  const rad = lerp(75, 42, BW.d);
  W.stopObjs.forEach((objs, si) => { const ds = STOPS[si].s - T.s, vis = ds > -22 && ds < rad; for (const o of objs) o.visible = o.isMesh && o.material.visible === false ? true : vis; });
  W.ex.forEach((ex, idx) => {
    if (!ex.R || !ex.R.holder.visible) return;
    T.k[idx] = Math.max(0, T.k[idx] - dt * .8);
    ex.R.root.updateMatrixWorld(); const loc = ex.R.root.worldToLocal(_v.copy(camPos));
    const look = clamp(Math.atan2(-loc.z, loc.x), -1, 1) * (ex.e.a.plan === 'flock' ? 0 : 1);
    animate(ex.R, now, T.k[idx], look);
    if (ex.e.a.plan === 'mirror') { ex.R.root.position.x = clamp(-loc.z * .02, -.6, .6); }
  });
  W.statues.forEach(st => { const d = BW.d, loc = st.R.root.worldToLocal(_v.copy(camPos)); const want = T.s > 14 ? clamp(Math.atan2(-loc.z, loc.x), -1.4, 1.4) : 0; st.R.head && (st.R.head.rotation.y += (want - st.R.head.rotation.y) * .05); });
}

// ---------- camera ----------
let aspect = 1;
function placeCamera(dt) {
  const f = frame(T.s), yaw = Math.atan2(-f.t.x, -f.t.z);
  T.faceF += (T.face - T.faceF) * (1 - Math.exp(-dt * 5));
  const portrait = aspect < .8, shift = portrait ? 2.2 : 1.1;
  const lat = -T.faceF * shift, spd = Math.abs(T.s - (T.prevS || T.s)) / Math.max(dt, .001);
  T.bob += dt * clamp(spd, 0, 8) * 1.6;
  const bob = RM ? 0 : Math.sin(T.bob * 2) * .045 * clamp(spd / 3, 0, 1);
  camPos.set(f.p.x + f.r.x * lat, 1.62 + bob, f.p.z + f.r.z * lat);
  if (BW.shake > 0 && !RM) { camPos.x += (Math.random() - .5) * BW.shake; camPos.y += (Math.random() - .5) * BW.shake; BW.shake = Math.max(0, BW.shake - dt * 1.5); }
  camera.position.copy(camPos);
  const ya = yaw - T.faceF * Math.PI / 2, pitch = -.05 + Math.abs(T.faceF) * (portrait ? .04 : .02);
  camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ'; camera.rotation.y = ya; camera.rotation.x = pitch; camera.rotation.z = RM ? 0 : Math.sin(T.bob) * .006 * clamp(spd / 3, 0, 1);
  const baseF = portrait ? 74 : aspect < 1.3 ? 66 : 58;
  camera.fov = baseF; camera.updateProjectionMatrix();
  sky.position.copy(camPos);
}
function resize() {
  const w = innerWidth, h = innerHeight; aspect = w / h;
  renderer.setSize(w, h, false); camera.aspect = aspect; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); if (window.visualViewport) visualViewport.addEventListener('resize', resize);

// ---------- footsteps & breath ----------
function sounds(dt, d) {
  const moved = Math.abs(T.s - (T.prevS || T.s));
  T.stepAcc += moved;
  if (T.stepAcc > 1.15) { T.stepAcc = 0; const side = (T.sideStep = -(T.sideStep || 1)); SFX.step(side * .25, 0, .05 + .02 * (1 - d)); if (d > .62) SFX.step(-side * .1, .2 + Math.random() * .05, .025 + d * .03); }
  if (d > .82 && moved < .002 && mode === 'tour' && now - (T.lastBreath || 0) > 7 + Math.random() * 6) { T.lastBreath = now; SFX.breath && SFX.breath(); }
  if (now - (T.lastDread || 0) > .25) { T.lastDread = now; SFX.setDread(d); }
}

// ---------- ending: closing time, Pip, the scare ----------
function ending() {
  if (mode !== 'tour') return;
  mode = BW.mode = 'ending'; closeCard(); turnTo(0); T.face = 0; LS.set('bw3.toured', '1'); BW.toured = true;
  document.body.classList.add('ending');
  SFX.hushAll && SFX.hushAll(1.5);
  const f0 = frame(S_EXIT + 6.5), f = { p: f0.p.clone(), t: f0.t.clone(), r: f0.r.clone() }, say = (t) => { const el = $('#closeT'); el.textContent = t; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  setTimeout(() => { BW.lightsOut = true; SFX.sting && SFX.heart(2); say('The gardens are now closed.'); }, 400);
  setTimeout(() => {
    pipBoss.root.visible = true; pipBoss.root.position.set(f.p.x, 0, f.p.z); pipBoss.root.rotation.y = Math.atan2(f.t.z, -f.t.x); pipBoss.root.scale.setScalar(1);
    gateLamp.position.set(f.p.x, 5.2, f.p.z + .01); gateLamp.target.position.set(f.p.x, .6, f.p.z); gateLamp.intensity = 60; torch.target.position.set(0, -.2, -6);
    SFX.giggle(0); say('Pip will see you out.'); BW.pipShown = true;
  }, 2600);
  setTimeout(() => {
    // the lunge: Pip covers the distance in 0.3 s, then the hit
    BW.scared = true; const a = performance.now(); const from = pipBoss.root.position.clone();
    SFX.sting(1); SFX.roar && SFX.roar();
    const fwd = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y)); let hit = false;
    const step = () => { const k = clamp((performance.now() - a) / 300, 0, 1);
      posePip(from, fwd, k);
      gateLamp.intensity = k < .4 ? 60 : 0;
      if (k >= 1 && !hit) { hit = true; BW.hit = true; BW.shake = .32; flash($('#flash')); try { navigator.vibrate && navigator.vibrate([90, 50, 220]); } catch (e) {} }
      if (performance.now() - a < 1200) requestAnimationFrame(step); };
    step();
  }, 4200);
  setTimeout(() => { $('#runword').classList.add('on'); }, 5500);
  setTimeout(() => { $('#runword').classList.remove('on'); pipBoss.root.visible = false; startRun(); }, 6600);
}
function posePip(from, fwd, k) {
  const ke = k * k, sc = 1 + ke * .6, to = camPos.clone().addScaledVector(fwd, 1.55); to.y = 1.62 - 1.23 * sc;
  pipBoss.root.visible = true; pipBoss.root.position.lerpVectors(from, to, ke); pipBoss.root.scale.setScalar(sc); animate(pipBoss, now, 1);
}
BW.posePip = k => { const fwd = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y)); const from = camPos.clone().addScaledVector(fwd, 6.5); from.y = 0; pipBoss.root.rotation.y = Math.atan2(fwd.z, -fwd.x); posePip(from, fwd, k); BW.posed = 1; };
function flash(fl) {
  // two flashes inside ~0.8 s (≤ 3 per second); a single fade with reduced motion
  if (RM) { fl.style.transition = 'opacity .6s'; fl.style.background = '#5a0a08'; fl.style.opacity = .8; setTimeout(() => fl.style.opacity = 0, 600); return; }
  fl.style.transition = 'none'; fl.style.background = '#ffffff'; fl.style.opacity = 1;
  setTimeout(() => { fl.style.transition = 'opacity .25s'; fl.style.opacity = 0; }, 70);
  setTimeout(() => { fl.style.transition = 'none'; fl.style.background = '#b3140c'; fl.style.opacity = .55; }, 470);
  setTimeout(() => { fl.style.transition = 'opacity .6s'; fl.style.opacity = 0; }, 540);
}

// ---------- runner ----------
let runner = null;
function startRun() {
  mode = BW.mode = 'run'; document.body.classList.add('running'); document.body.classList.remove('ending');
  if (!runner) runner = new Runner({ renderer, THREE, SFX, LS, RM, MOBILE, onBack: () => { location.href = location.pathname + '?gate=1'; } });
  BW.runner = runner; runner.start();
}

// ---------- main loop ----------
let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = 0, lowT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (t - last) / 1000); last = t; now = t / 1000;
  fpsN++; fpsT += dt; if (fpsT > 1) { BW.fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0;
    if (BW.fps < 42 && PR > 1 && (mode === 'tour' || mode === 'run')) { lowT++; if (lowT > 2) { PR = Math.max(1, PR - .25); renderer.setPixelRatio(PR); resize(); lowT = 0; BW.pr = PR; } } else lowT = 0; }
  BW.frames++;
  if (mode === 'run') { runner.frame(dt, now); return; }
  if (mode === 'boot' || mode === 'gate') return;
  if (mode === 'tour') {
    if (keys.arrowup || keys.w) walk(dt * 7); if (keys.arrowdown || keys.s) walk(-dt * 7);
    if (Math.abs(T.v) > .05) { T.tgt = clamp(T.tgt + T.v * dt, 0, MAXS); T.v *= Math.exp(-dt * 3.2); T.lastIn = now; } else T.v = 0;
    if (now - T.lastIn > .45 && T.face === 0) { const n = nearestStop(T.tgt); if (n.dist < 4.5 && n.dist > .01) T.tgt += (STOPS[n.i].s - T.tgt) * (1 - Math.exp(-dt * 2.5)); }
  }
  T.prevS = T.s;
  const dS = T.tgt - T.s; T.s += clamp(dS * (1 - Math.exp(-dt * 3.2)), -14 * dt, 14 * dt);
  if (mode === 'tour' && T.s >= S_EXIT - .3) ending();
  const d = mode === 'ending' ? 1 : dAt(T.s);
  BW.s = +T.s.toFixed(2); BW.tgt = T.tgt; BW.d = d; BW.facing = T.face; BW.stop = nearestStop(T.s).i;
  placeCamera(dt);
  if (Math.abs(d - lastD) > .0008 || now - (T.lastSky || 0) > .5) { applyCurve(d, camPos); lastD = d; T.lastSky = now; }
  // your phone torch: full beam at the very end, and a softer one whenever you look into a dark cage
  torch.intensity = Math.max(CUR.torch || 0, Math.abs(T.faceF) * sstep(.45, .72, d) * .75) * 26;
  updateExhibits(dt); creepy(dt); updateCrowd(T.s / S_EXIT); updateEyes(d); updateLamps(d);
  if (mode === 'tour') sounds(dt, d);
  if (now - hudT > .15) { hudT = now; hud(); }
  renderer.render(scene, camera);
}

// ---------- boot ----------
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const L = ['40px Bungee', '20px "Young Serif"', '700 20px Archivo', '40px Reenie'].map(f => document.fonts.load(f).catch(() => {}));
  return Promise.race([Promise.all(L), new Promise(r => setTimeout(r, 2500))]);
}
async function boot() {
  resize();
  await fontsReady();
  try { buildAll(); } catch (e) { BW.errors.push('build ' + e.message); throw e; }
  T.s = T.tgt = 2; placeCamera(.016); applyCurve(0, camPos);
  try { renderer.compile(scene, camera); } catch (e) {}
  renderer.render(scene, camera);
  mode = BW.mode = 'gate'; BW.ready = true;
  if (LS.get('bw3.toured')) { const b = $('#skipRun'); b.hidden = false; }
  requestAnimationFrame(loop);
  if (window.__bwBegan) begin(window.__bwWantSound, window.__bwWantRun);
}
function begin(sound, run) {
  if (began) return; began = true;
  if (sound) { try { SFX.unlock(); } catch (e) {} } else if (SFX.A) SFX.A.music = 0;
  document.body.classList.remove('locked'); document.body.classList.add('touring');
  t0 = performance.now();
  if (!W) return; // boot() will call us again once the park is built
  if (run && LS.get('bw3.toured')) { startRun(); return; }
  mode = BW.mode = 'tour'; T.lastIn = now; SFX.setDread(0);
  banner('Welcome to Brightwater', 'Fifty animals, one way round', '#e0892b');
}
window.__bwBegin = (sound, run) => { if (sound) { try { SFX.unlock(); } catch (e) {} } if (!W) { window.__bwWantSound = sound; window.__bwWantRun = run; return; } began = false; begin(sound, run); };
$('#sndBtn').addEventListener('click', () => { if (!SFX.on) { SFX.unlock(); SFX.A.music = 1; $('#sndBtn').classList.remove('off'); return; } SFX.A.master.gain.value = SFX.A.master.gain.value > 0 ? 0 : .9; $('#sndBtn').classList.toggle('off', SFX.A.master.gain.value === 0); });
document.addEventListener('visibilitychange', () => { if (document.hidden && runner && mode === 'run') runner.pause(); });
boot().catch(e => { BW.errors.push(String(e && e.message)); });

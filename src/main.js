/* Brightwater Zoo 3D: a first-person walk through fifty enclosures. Scroll to walk, swipe to turn, tap the animals. */
import * as THREE from 'three';
import { buildModel, animate, mat, GEO } from './models.js';
import { E, Z, STOPS, GATES, OPENROW, S_EXIT, S_D0, frame, yawAt, zoneAt, buildWorld } from './world.js';
import { placardAtlas, gateTextures, signTextures } from './tex.js';
import { Runner } from './runner.js';
import { U, glowTex, fogTex } from './fx.js';

const $ = s => document.querySelector(s);
const UA = navigator.userAgent || '';
const IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MOBILE = IOS || /Android|Mobile/i.test(UA) || matchMedia('(pointer:coarse)').matches;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SFX = window.SFX || { glass() {}, clang() {}, whistle() {}, chomp() {}, thud() {}, toss() {}, quiet() {}, click() {}, voice() {}, step() {}, setDread() {}, on: false, unlock() {}, hushAll() {}, giggle() {}, whisper() {}, heart() {}, feed() {}, ui() {}, sting() {}, roar() {}, breath() {}, run: {} };
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
    W.puddleMat.color.copy(c.top).lerp(c.hor, .45); W.puddleMat.opacity = .38 + .25 * sstep(.5, .9, d);
    W.lampPts.material.opacity = sstep(.3, .62, d) * .95;
    U.uWind.value = lerp(1, .2, sstep(.74, .95, d));
  }
  document.documentElement.style.setProperty('--d', d.toFixed(3));
}

// ---------- world ----------
let W = null;
const crowd = { n: 64, list: [] }, eyes = { n: 40, list: [] };
let crowdBody, crowdHead, eyeMesh, crosser, keeperGhost, pipBoss, watcher, darters = [], swarm = [];
function buildAll() {
  const atlas = placardAtlas();
  W = buildWorld(scene, atlas, gateTextures(GATES), signTextures());
  // visitors (instanced capsules) that thin out as the day goes on
  const shirt = ['#e0892b', '#3f7d3a', '#d9566b', '#3b4f8f', '#1f7f86', '#d8b441', '#f3ede0', '#8f5a9f'];
  crowdBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .24, 1.15, 6), new THREE.MeshLambertMaterial({ flatShading: true }), crowd.n + 1);
  crowdHead = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.17, 0), new THREE.MeshLambertMaterial({ flatShading: true }), crowd.n + 1);
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
  watcher = buildModel(E.find(e => e.n === 'The Long Keeper')); blackify(watcher); watcher.root.visible = false; scene.add(watcher.root); watcher.done = {};
  // glimpses: black shapes that dart across the far avenue, between cages, at the edge of your view
  for (const n of ['Chupacabra', 'The Jersey Devil', 'The Hollow Stag']) { const D = buildModel(E.find(e => e.n === n)); blackify(D); D.root.visible = false; D.t = -1; scene.add(D.root); darters.push(D); }
  // the swarm: everything that got out
  // [name, screen x, screen y of the face (-1..1), share of screen height, delay s]
  const SW = [['Pip', .05, -.25, .52, 0], ['Kuramuffin', -.62, -.5, .5, .12], ['Chupacabra', .66, -.52, .48, .22], ['The Long Keeper', -.8, .2, .95, .33], ['The Hollow Stag', .82, .18, .8, .43], ['The Jersey Devil', -.38, .62, .4, .52], ['Mothman', .42, .66, .42, .6], ['Gon-zilla', 0, .45, 1.1, .72, 2.8]];
  swarm = SW.map(([n, nx, ny, frac, delay, sc0 = 1], i) => { const R = i === 0 ? pipBoss : buildModel(E.find(e => e.n === n)); if (n === 'Gon-zilla') blackify(R); if (i) { R.root.visible = false; scene.add(R.root); } return { R, n, nx, ny, frac, delay, sc0, from: new THREE.Vector3(), up: /Jersey|Mothman/.test(n) }; });
  buildAmbient();
  BW.counts = W.counts;
}

// ---------- state ----------
const T = { s: 0, tgt: 2, v: 0, face: 0, faceF: 0, faceV: 0, drag: null, dist: 0, stepN: 0, lastIn: 0, bob: 0, stepAcc: 0, card: -1, k: new Float32Array(64), turned: 0, hint: 1 };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let lastStepT = 0, mode = 'boot', t0 = 0, now = 0, began = false;
const nearestStop = s => { let b = 0, bd = 1e9; STOPS.forEach((st, i) => { const dd = Math.abs(st.s - s); if (dd < bd) { bd = dd; b = i; } }); return { i: b, dist: bd }; };

// ---------- input ----------
// Walking is a continuous stroll: a drag moves you directly, a flick or the wheel adds momentum that coasts out,
// and when you slow down near a pair of enclosures the path settles you gently in front of them.
const MAXS = S_EXIT + .5, MAXV = 7;
function walk(ds) {
  if (mode !== 'tour') return;
  if (T.card >= 0) closeCard();
  if (T.face !== 0) { if (Math.abs(ds) > .05) turnTo(0); return; }
  T.tgt = clamp(T.tgt + ds, 0, MAXS); T.lastIn = now; T.auto = null; hideHint(1);
}
function push(v) {
  if (mode !== 'tour') return;
  if (T.card >= 0) closeCard();
  if (T.face !== 0) { if (Math.abs(v) > .2) turnTo(0); return; }
  T.v = clamp(T.v + v, -MAXV, MAXV); T.lastIn = now; T.auto = null; hideHint(1);
}
function setFace(dirn) {
  if (mode !== 'tour') return;
  if (dirn !== 0) { const n = nearestStop(T.s); T.tgt = STOPS[n.i].s; T.v = 0; }
  if (dirn !== T.face) { if (T.card >= 0) closeCard(); T.face = dirn; BW.facing = dirn; T.turned++; hideHint(2); SFX.step && SFX.step(dirn * .5, 0, .05);
    if (dirn !== 0 && BW.d > .42 && crosser.t < 0 && Math.random() < .55) crossNow(); }
}
function turnTo(dirn) { if (dirn !== 0 && T.face === -dirn) dirn = 0; setFace(dirn); }
BW.turnTo = turnTo;
BW.jump = q => { const s = q <= 1 ? q * S_EXIT : q; T.s = T.tgt = T.prevS = clamp(s, 0, MAXS - 1); T.v = 0; T.lastIn = now; };
BW.stops = STOPS; BW.S_EXIT = S_EXIT; BW.scene = scene; BW.sky = sky; BW.sun = sun; BW.getW = () => W; BW.pip = () => pipBoss; BW.cam = camera;
const cv = $('#gl');
cv.addEventListener('wheel', e => {
  e.preventDefault(); if (mode !== 'tour') return;
  const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
  const dx = e.deltaX * k, dy = e.deltaY * k;
  if (Math.abs(dx) > Math.abs(dy) * 1.5) { T.hx = (T.hx || 0) + dx; if (Math.abs(T.hx) > 80) { turnTo(T.hx > 0 ? 1 : -1); T.hx = 0; T.hxLock = now; } return; }
  push(clamp(dy, -240, 240) * .016);
}, { passive: false });
let tp = null;
function tStart(x, y) { tp = { x0: x, y0: y, x, y, t: now, ax: 0, vy: 0, lt: performance.now(), face0: T.face }; if (T.face === 0) T.v *= .2; }
function tMove(x, y) {
  if (!tp) return; const dx = x - tp.x0, dy = y - tp.y0;
  if (!tp.ax && Math.hypot(dx, dy) > 12) tp.ax = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
  if (tp.ax === 'v') { const k = .026 * 844 / Math.max(500, innerHeight), dd = (tp.y - y) * k, t = performance.now(), dt = Math.max(8, t - tp.lt) / 1000; walk(dd); tp.vy = lerp(tp.vy, dd / dt, .5); tp.lt = t; }
  if (tp.ax === 'h' && mode === 'tour') { if (T.card >= 0 && Math.abs(dx) > 20) closeCard(); T.drag = clamp(tp.face0 + dx / (Math.min(innerWidth, 900) * .5), -1, 1); }
  tp.x = x; tp.y = y;
}
function tEnd(x, y) {
  if (!tp) return; const dx = x - tp.x0, dur = now - tp.t;
  if (tp.ax === 'h') {
    const v = T.drag == null ? tp.face0 : T.drag; T.drag = null;
    if (dur < .45 && Math.abs(dx) > 36) turnTo(dx < 0 ? -1 : 1); // a quick swipe always commits
    else { const want = Math.abs(v) > .42 ? Math.sign(v) : 0; if (want !== T.face) setFace(want); }
  } else if (tp.ax === 'v') {
    const v = performance.now() - tp.lt < 90 ? tp.vy : 0;
    if (T.face === 0 && Math.abs(v) > .5) { T.v = clamp(v * .8, -MAXV, MAXV); T.lastIn = now; }
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
  if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(k)) { keys[k.toLowerCase()] = 1; if (T.face && !e.repeat) turnTo(0); e.preventDefault(); }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { turnTo(-1); e.preventDefault(); }
  if (k === 'ArrowRight' || k === 'd' || k === 'D') { turnTo(1); e.preventDefault(); }
  if ((k === 'Enter' || k === ' ') && T.face) { const ex = facedEx(); if (ex) openCard(ex.idx); e.preventDefault(); }
  if (k === 'Escape') { closeCard(); }
});
addEventListener('keyup', e => { delete keys[e.key.toLowerCase()]; });
$('#tl').addEventListener('click', () => turnTo(-1)); $('#tr').addEventListener('click', () => turnTo(1));
$('#tf').addEventListener('click', () => { if (T.face) return turnTo(0); const nx = STOPS.find(st => st.s > T.s + 1.5); T.auto = nx ? nx.s : MAXS; T.lastIn = now; hideHint(1); });

// ---------- tapping animals ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function facedEx() { if (!T.face) return null; const st = STOPS[nearestStop(T.s).i]; if (Math.abs(st.s - T.s) > 4) return null; const i = T.face < 0 ? st.L : st.R; const idx = W.ex.findIndex(x => x.i === i); return idx >= 0 ? { idx, ex: W.ex[idx] } : null; }
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
  T.card = idx; BW.card = ex.i; T.k[idx] = 1; ex.hop = now; if (ex.st) ex.st.attend = now + 5;
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
  <div class="c-btns"><button class="btn sm" id="cFeed">${ex.absent ? 'Knock' : e.t === 'you' ? 'Wave' : 'Feed'}</button>${ex.absent || e.t === 'you' ? '' : `<button class="btn sm alt" id="cKnock">${ex.tank ? 'Tap the glass' : ex.barred ? 'Rattle the bars' : 'Call'}</button>`}<button class="linkbtn" id="cX">Close</button></div>`;
  c.style.setProperty('--ox', Math.round(p.x) + 'px'); c.style.setProperty('--oy', Math.round(p.y) + 'px');
  c.hidden = false; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
  $('#cX').onclick = closeCard;
  // buttons close the card first so you can watch what happens
  $('#cFeed').onclick = () => { closeCard(); act(ex.absent ? 'knock' : e.t === 'you' ? 'call' : 'feed', idx); };
  if ($('#cKnock')) $('#cKnock').onclick = () => { closeCard(); act(ex.tank || ex.barred ? 'knock' : 'call', idx); };
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
  const fe = mode === 'tour' && T.face !== 0 && T.card < 0 && Math.abs(T.faceF) > .8 ? facedEx() : null, acts = $('#acts');
  if (fe) { const x = fe.ex; acts.hidden = false; acts.classList.add('on'); BW.actsFor = fe.idx;
    $('#aFeed').querySelector('span').textContent = x.e.t === 'you' ? 'Wave' : 'Feed'; $('#aFeed').hidden = x.e.t === 'you';
    $('#aKnock').querySelector('span').textContent = x.tank ? 'Tap the glass' : x.barred || x.absent ? 'Rattle the bars' : 'Clap';
    $('#aCall').querySelector('span').textContent = x.e.t === 'you' ? 'Wave' : 'Call';
  } else { acts.classList.remove('on'); BW.actsFor = -1; }
  $('#tf').querySelector('i').textContent = T.face ? '▼' : '▲';
  $('#exn').textContent = `${Math.min(50, st.L + 1)}${st.R >= 0 ? '–' + (st.R + 1) : ''} / 50`;
  const z = zoneAt(T.s);
  if (z !== lastZone) { lastZone = z; const zz = Z[z]; $('#zoneName').textContent = zz.name; if (T.s > 10) banner(zz.name, zz.sub, zz.col); }
}
function banner(a, b, col) { const el = $('#banner'); el.innerHTML = `<b>${ESC(a)}</b><span>${ESC(b)}</span>`; el.style.setProperty('--zc', col); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

// ---------- creepy events ----------
function crossNow(ahead = 7) { const fs = frame(T.s + ahead); crosser.t = 0; crosser.dir = Math.random() < .5 ? -1 : 1; crosser.f = { p: fs.p.clone(), r: fs.r.clone(), t: fs.t.clone() }; crosser.root.visible = true; setTimeout(() => SFX.step && SFX.step(crosser.dir * .6, 0, .12), 200); setTimeout(() => SFX.step && SFX.step(crosser.dir * .8, 0, .1), 450); BW.crossed = (BW.crossed || 0) + 1; }
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
  const flick = d > .55, col = W.lampPts.geometry.attributes.color;
  W.lamps.forEach(l => {
    let on = 1; if (flick) { const r = Math.sin(now * 23 + l.s) * Math.sin(now * 7.3 + l.s * 2); if (r > .85 - (d - .55)) on = .2; }
    if (l.dead && d > .7) on = 0; if (mode === 'ending' && BW.lightsOut) on = 0;
    // late on, the lamps ahead of you go out one by one as you approach
    if (mode === 'tour' && d > .76 && !l.out && !l.dead && l.s > T.s + 3 && l.s - T.s < 15 + l.r * 9) { l.out = now; const fp = frame(l.s); SFX.click && SFX.click(clamp((fp.p.x - camPos.x) * .1, -1, 1)); BW.lampsOut = (BW.lampsOut || 0) + 1; }
    if (l.out) on = now - l.out < .4 ? (Math.sin(now * 55) > .2 ? 1 : .1) : 0;
    col.setXYZ(l.pi, on, on * (.85 + .15 * on), on * .8);
    _m.makeScale(on ? 1 : .001, on ? 1 : .001, on ? 1 : .001); W.bulbs.getMatrixAt(l.bi, _lp.m || (_lp.m = new THREE.Matrix4()));
    const pos = _v.setFromMatrixPosition(_lp.m); _m.setPosition(pos); W.bulbs.setMatrixAt(l.bi, _m);
    W.glows.getMatrixAt(l.gi, _lp.m); const gp = _v.setFromMatrixPosition(_lp.m); _m.makeScale(2.6 * (on ? 1 : .001), 1, 2.6 * (on ? 1 : .001)).setPosition(gp); W.glows.setMatrixAt(l.gi, _m);
  });
  W.bulbs.instanceMatrix.needsUpdate = W.glows.instanceMatrix.needsUpdate = true; col.needsUpdate = true;
}
const WALKERS = { quad: .6, upright: .45, blob: .42, frog: .35, fish: .45 };
const angD = (a, b) => { let x = (b - a) % (Math.PI * 2); if (x > Math.PI) x -= Math.PI * 2; if (x < -Math.PI) x += Math.PI * 2; return x; };
function wander(ex) {
  const R = ex.R, plan = ex.e.a.plan, sp = WALKERS[plan] || 0, big = R.w > 3.3 || ex.e.n === 'Gon-zilla';
  const rx = Math.max(0, 2.4 - .35 - R.w * .42), z0 = -2.1 + .35 + R.w * .3, z1 = 2.1 - .55 - R.w * .3;
  return { x: R.root.position.x, z: R.root.position.z, y0: R.root.position.y, yaw: R.root.rotation.y, base: R.root.rotation.y, idleYaw: R.root.rotation.y,
    mode: 'idle', can: sp > 0 && !big && rx > .2, sp: sp * (R.h > 1.8 ? 1.25 : 1), rx, z0: Math.min(z0, z1), z1: Math.max(z0, z1), walking: false, wait: .5 + Math.random() * 3, w: 0, attend: 0, turnable: plan !== 'flock' && plan !== 'sloth' && plan !== 'bat' && plan !== 'mirror' && plan !== 'bird' };
}
function updateExhibits(dt) {
  const rad = lerp(75, 42, BW.d);
  W.stopObjs.forEach((objs, si) => { const ds = STOPS[si].s - T.s, vis = ds > -22 && ds < rad; for (const o of objs) o.visible = o.isMesh && o.material.visible === false ? true : vis; });
  W.ex.forEach((ex, idx) => {
    if (!ex.R || !ex.R.holder.visible) return;
    const R = ex.R, far = Math.abs(STOPS[ex.si].s - T.s) > 40;
    T.k[idx] = Math.max(0, T.k[idx] - dt * .8);
    if (far) return; // only animate what you can see properly
    if (ex.e.a.plan === 'mirror') { R.root.updateMatrixWorld(); const loc = R.root.worldToLocal(_v.copy(camPos)); animate(R, now, T.k[idx], clamp(Math.atan2(-loc.z, loc.x), -1, 1)); R.root.position.x = clamp(-loc.z * .02, -.6, .6); return; }
    const st = ex.st || (ex.st = wander(ex)), dS = dAt(STOPS[ex.si].s);
    const hl = R.holder.worldToLocal(_v.copy(camPos)), camYaw = Math.atan2(-(hl.z - st.z), hl.x - st.x);
    // late at night they stop pacing and just watch you; anything you've tapped looks at you for a while
    const stare = st.turnable && st.mode === 'idle' && (dS > .6 || now < st.attend);
    let w = 0, lookP = null;
    const goTo = (mul, turnRate = 3.5) => {
      const dx = st.tx - st.x, dz = st.tz - st.z, dist = Math.hypot(dx, dz); if (dist < .06 || !st.can) return true;
      const want = Math.atan2(-dz, dx), da = angD(st.yaw, want); st.yaw += da * (1 - Math.exp(-dt * turnRate * mul));
      const v = Math.min(dist / dt, st.sp * mul * clamp(1 - Math.abs(da) / 1.3, .15, 1)); st.x += dx / dist * v * dt; st.z += dz / dist * v * dt; w = clamp(v / st.sp, 0, 1.6); return false;
    };
    if (st.mode === 'food') { // trot over to the food
      if (goTo(st.fast ? 3.2 : 1.4)) { st.mode = 'eat'; st.eatT = now; }
    } else if (st.mode === 'eat') {
      const fd = st.food, fy = Math.atan2(-(fd.position.z - st.z), fd.position.x - st.x);
      if (st.turnable) st.yaw += angD(st.yaw, fy) * (1 - Math.exp(-dt * 5));
      const k = (now - st.eatT) / (st.fast ? .35 : 2.4); lookP = -.75; R.chew = k < 1 ? 1 : 0;
      fd.scale.setScalar(Math.max(0, 1 - k) * fd.s0); if (Math.floor(now * 4.2) !== st.lastChew && k < 1) { st.lastChew = Math.floor(now * 4.2); if (st.lastChew % 2) SFX.chomp(ex.pan || 0, 1); }
      if (k >= 1.1) { R.holder.remove(fd); st.food = null; R.chew = 0; st.mode = 'idle'; st.attend = now + 4; st.wait = 2 + Math.random() * 2;
        if (dS < .6 && !st.fast) { ex.hop = now; T.k[idx] = .6; SFX.voice(ex.e.snd, dS, ex.pan || 0); } else if (st.fast) SFX.thud(ex.pan || 0); }
    } else if (st.mode === 'flee') { // startled: bolt to the far corner, ears back
      if (goTo(2.6, 6)) { st.mode = 'idle'; st.wait = 2.5 + Math.random() * 2; st.idleYaw = camYaw; }
    } else if (st.mode === 'come' || st.mode === 'charge') {
      if (goTo(st.mode === 'charge' ? 4 : 1.2)) { if (st.mode === 'charge') { SFX.clang(ex.pan || 0, .6); SFX.thud(ex.pan || 0); BW.shake = .12; vibrate(ex); }
        else if (dS < .6) { ex.hop = now; SFX.voice(ex.e.snd, dS, ex.pan || 0); T.k[idx] = .5; }
        st.mode = 'idle'; st.attend = now + (dS > .6 ? 30 : 5); st.idleYaw = camYaw; }
    } else if (stare) { st.walking = false; st.yaw += angD(st.yaw, camYaw) * (1 - Math.exp(-dt * (dS > .6 ? 1.1 : 4))); }
    else if (st.can) {
      // when you look into its enclosure, it wanders over to the front to have a look at you
      const watched = T.face !== 0 && T.face === ex.side && nearestStop(T.s).i === ex.si;
      if (watched && !st.came) { st.came = 1; st.tx = clamp(st.x * .3, -.5, .5); st.tz = lerp(st.z0, st.z1, .75); st.walking = true; }
      if (!watched) st.came = 0;
      if (st.walking) {
        if (goTo(1)) { st.walking = false; st.wait = (st.came ? 4 : 1.5) + Math.random() * 4.5; st.idleYaw = st.came || Math.random() < .55 ? lerp(st.base, camYaw, st.came ? 1 : .5) : st.yaw + (Math.random() - .5) * 1.5; }
      } else {
        st.wait -= dt; st.yaw += angD(st.yaw, st.idleYaw) * (1 - Math.exp(-dt * 2));
        if (st.wait <= 0) { const rx = st.came ? Math.min(st.rx, .6) : st.rx; st.tx = (Math.random() * 2 - 1) * rx; st.tz = lerp(st.z0, st.z1, st.came ? .5 + Math.random() * .5 : Math.random()); st.walking = true; }
      }
    }
    R.earsBack = Math.max(0, (R.earsBack || 0) - dt * .4);
    st.w += (w - st.w) * (1 - Math.exp(-dt * 6));
    R.gait += dt * st.w * st.sp / Math.max(.22, R.h * .28) * Math.PI;
    ex.pan = clamp(-hl.x * 0 + (T.face === ex.side ? 0 : ex.side * .6), -1, 1);
    const hk = ex.hop ? (now - ex.hop) / .5 : 9, hop = hk < 1 ? Math.sin(Math.PI * hk) * Math.min(.5, R.h * .28) : 0;
    R.root.position.set(st.x, st.y0 + hop, st.z); R.root.rotation.y = st.yaw;
    R.root.updateMatrixWorld();
    const loc = R.root.worldToLocal(_v.copy(camPos)), hd = Math.hypot(loc.x, loc.z);
    const look = st.mode === 'eat' ? 0 : clamp(Math.atan2(-loc.z, loc.x), -1.1, 1.1) * (stare ? 1 : (1 - Math.min(1, st.w)) * .7) * (ex.e.a.plan === 'flock' ? 0 : 1);
    if (lookP == null) lookP = clamp(Math.atan2(loc.y - R.h * .8, hd), -.6, .6) * (stare ? 1 : .3);
    animate(R, now, T.k[idx], look, Math.min(1, st.w), lookP);
  });
  W.statues.forEach(st => { const loc = st.R.root.worldToLocal(_v.copy(camPos)); const want = T.s > 14 ? clamp(Math.atan2(-loc.z, loc.x), -1.4, 1.4) : 0; st.R.head && (st.R.head.rotation.y += (want - st.R.head.rotation.y) * .05); });
}

// ---------- play: feed, knock / rattle, call ----------
const FOODC = { meat: ['#a8322a', [.16, .1, .12]], fish: ['#9fb4c4', [.22, .07, .08]], fruit: ['#e8913a', [.11, .11, .11]], leaf: ['#5f9a3a', [.2, .03, .14]], bug: ['#5a4a2a', [.07, .05, .1]], pellet: ['#c9a23a', [.1, .08, .1]] };
function dietOf(e) {
  const t = ((e.f.find(f => /diet|food|eats/i.test(f[0])) || [, ''])[1] + ' ' + e.h).toLowerCase();
  if (/fish|squid|crab|shell|krill/.test(t)) return 'fish'; if (/meat|prey|antelope|zebra|carrion|blood|flesh|rodent|lizard|deer|carcass/.test(t)) return 'meat';
  if (/insect|grub|larva|termite|moth|beetle/.test(t)) return 'bug'; if (/fruit|nectar|berr|fig|mango/.test(t)) return 'fruit'; if (/leav|grass|bamboo|shoot|algae|browse|hay/.test(t)) return 'leaf'; return 'pellet';
}
const tweens = [], vibs = [];
function vibrate(ex) { if (!ex.bars || !ex.bars.length) return; if (!ex.barBase) ex.barBase = ex.bars.map(i => { const m = new THREE.Matrix4(); W.boxIm.getMatrixAt(i, m); return m; }); vibs.push({ ex, t0: now }); }
function ripple(ex, lx, ly) {
  const z = 4.2 / 2 - .02, ring = new THREE.Mesh(new THREE.RingGeometry(.05, .075, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85, depthWrite: false }));
  ring.position.set(lx, ly, z); ex.R ? ex.R.holder.add(ring) : null; tweens.push({ o: ring, t0: now, d: .7, f: (o, k) => { o.scale.setScalar(1 + k * 7); o.material.opacity = .85 * (1 - k); }, end: o => o.parent && o.parent.remove(o) });
  ex.smudges = ex.smudges || []; if (ex.smudges.length < 6) { const sm = new THREE.Mesh(new THREE.CircleGeometry(.08 + Math.random() * .04, 10), new THREE.MeshBasicMaterial({ color: '#f3f0e6', transparent: true, opacity: .16, depthWrite: false })); sm.position.set(lx + (Math.random() - .5) * .05, ly, z + .005); ex.R && ex.R.holder.add(sm); ex.smudges.push(sm); }
}
function eyesBehind(ex) {
  // the startle reveals something at the back of the enclosure
  const H = ex.R ? ex.R.holder : null; if (!H) return;
  if (!ex.behind) { ex.behind = new THREE.Group(); for (const s2 of [-1, 1]) { const m = new THREE.Mesh(GEO.eye, mat('#ff3b2a', 'glow')); m.scale.setScalar(.045); m.position.set(s2 * .11, 0, 0); ex.behind.add(m); } H.add(ex.behind); }
  const st = ex.st; ex.behind.position.set(st && st.x > 0 ? -1.4 : 1.4, 1.5 + Math.random() * .5, -1.95); ex.behind.visible = true; ex.behindT = now + 1.6; BW.behind = (BW.behind || 0) + 1;
  setTimeout(() => SFX.whisper && SFX.whisper(0, 1.2, .08), 300);
}
function act(kind, idx) {
  if (mode !== 'tour' || idx == null || idx < 0) return; const ex = W.ex[idx], e = ex.e, R = ex.R, dS = dAt(STOPS[ex.si].s), late = dS > .6, monster = e.t === 'monster';
  const st = R ? (ex.st || (ex.st = wander(ex))) : null; BW.acts = (BW.acts || 0) + 1; BW.lastAct = kind;
  if (kind === 'feed') {
    if (st && st.food) return;
    const diet = dietOf(e), [fc, fs] = FOODC[diet], H = R ? R.holder : null; if (!H) { SFX.clang(0, .8); if (late) eyesBehind(ex); return; }
    const fd = new THREE.Mesh(diet === 'fruit' || diet === 'meat' ? GEO.ico0 || GEO.box : GEO.box, mat(fc)); fd.scale.set(fs[0], fs[1], fs[2]); fd.s0 = 1;
    const sc0 = fd.scale.clone(); fd.scale.setScalar = k => fd.scale.copy(sc0).multiplyScalar(k);
    const from = H.worldToLocal(camPos.clone().add(new THREE.Vector3(0, -.35, 0))), to = new THREE.Vector3(clamp((st.x || 0) * .4 + (Math.random() - .5) * .8, -1.4, 1.4), ex.tank ? .2 : .16, ex.tank ? .4 : lerp(st.z0, st.z1, .85));
    H.add(fd); SFX.toss(); BW.fed = (BW.fed || 0) + 1;
    tweens.push({ o: fd, t0: now, d: ex.tank ? 1.1 : .6, f: (o, k) => { o.position.lerpVectors(from, to, k); o.position.y += Math.sin(Math.PI * k) * (ex.tank ? .4 : 1.1) * (ex.tank ? (1 - k) : 1); o.rotation.set(k * 9, k * 5, 0); },
      end: o => { SFX.step(ex.pan || 0, 0, .05);
        if (late && !monster) { st.attend = now + 30; return; } // it isn't hungry. it just keeps looking at you
        st.food = o; st.fast = monster; const dx = st.x - o.position.x, dz = st.z - o.position.z, dd = Math.hypot(dx, dz) || 1, off = Math.min(.9, R.w * .38);
        st.tx = o.position.x + dx / dd * off; st.tz = o.position.z + dz / dd * off; st.tx = clamp(st.tx, -st.rx - .2, st.rx + .2); st.tz = clamp(st.tz, st.z0 - .2, st.z1 + .2); st.mode = 'food'; st.walking = false; } });
  } else if (kind === 'knock') {
    const H = R ? R.holder : null;
    if (ex.tank) { SFX.glass(ex.pan || 0); if (H) ripple(ex, (Math.random() - .5) * 1.6, 1.1 + Math.random() * .6); }
    else { SFX.clang(ex.pan || 0); vibrate(ex); }
    BW.knocks = (BW.knocks || 0) + 1;
    if (!R) { if (late || Math.random() < .3) setTimeout(() => eyesBehind(ex), 250); else setTimeout(() => SFX.giggle && dS > .4 && SFX.giggle(0), 600); return; }
    if (st.food) { R.holder.remove(st.food); st.food = null; R.chew = 0; } st.mode = 'idle';
    if (monster) { st.tx = clamp(st.x, -.6, .6); st.tz = st.z1 + .25; st.mode = 'charge'; T.k[idx] = 1; setTimeout(() => SFX.voice(e.snd, 1, ex.pan || 0), 150); return; } // it throws itself at the front
    if (late) { st.tx = clamp(st.x * .5, -.5, .5); st.tz = st.z1; st.mode = 'come'; if (dS > .72) setTimeout(() => eyesBehind(ex), 700); return; } // no flinch. it walks up to you
    // startle: flinch, ears back, bolt to the far corner, calm down after a bit
    T.k[idx] = 1; ex.hop = now; R.earsBack = 1; SFX.voice(e.snd, dS, ex.pan || 0);
    if (st.can) { st.tx = (st.x > 0 ? -1 : 1) * st.rx; st.tz = st.z0; st.mode = 'flee'; }
  } else if (kind === 'call') {
    SFX.whistle(); BW.calls2 = (BW.calls2 || 0) + 1;
    if (!R) { if (dS > .4) setTimeout(() => { SFX.step(0, 0, .04); eyesBehind(ex); }, 900); return; }
    if (e.t === 'you') { T.k[idx] = 1; return; }
    if (st.food) return;
    if (st.can) { st.tx = clamp(st.x * .3, -.4, .4); st.tz = st.z1 + (late ? .15 : 0); st.mode = 'come'; }
    else { st.attend = now + 6; T.k[idx] = late ? 0 : .7; if (!late) SFX.voice(e.snd, dS, ex.pan || 0); }
  }
}
BW.act = act; BW.glimpse = () => glimpse(BW.d); BW.openRow = OPENROW;
['aFeed', 'aKnock', 'aCall'].forEach((id, i) => $('#' + id).addEventListener('click', e => { e.stopPropagation(); const fe = facedEx(); if (fe) { const x = fe.ex; act(i === 0 ? 'feed' : i === 1 ? (x.tank || x.barred || x.absent ? 'knock' : 'call') : 'call', fe.idx); } }));
function playFx(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) { const t = tweens[i], k = clamp((now - t.t0) / t.d, 0, 1); t.f(t.o, k); if (k >= 1) { tweens.splice(i, 1); t.end && t.end(t.o); } }
  for (let i = vibs.length - 1; i >= 0; i--) {
    const v = vibs[i], k = (now - v.t0) / .8, F = v.ex.F.elements, ax = F[0], az = F[2];
    v.ex.bars.forEach((bi, j) => { _m.copy(v.ex.barBase[j]); if (k < 1) { const a = Math.sin(now * 75 + j * 1.3) * .03 * (1 - k) * (1 - k); _m.elements[12] += ax * a; _m.elements[14] += az * a; } W.boxIm.setMatrixAt(bi, _m); });
    W.boxIm.instanceMatrix.needsUpdate = true; if (k >= 1) vibs.splice(i, 1);
  }
  W.ex.forEach(ex => { if (ex.behind && ex.behind.visible && now > ex.behindT) ex.behind.visible = false; });
}

// ---------- ambience: leaves, birds, bats, moths, fog banks, the watcher ----------
let leaves, fliers, fogCards = [];
const LEAFC = { A: ['#e0b04a', '#c8742a', '#9fbf5a'], B: ['#4f8f3f', '#7fb24a', '#3f7d3a'], C: ['#f6c1cc', '#ffffff', '#f2a7b8'], D: ['#8a6a4a', '#6a5a3a', '#4a5a3a'], E: ['#6a7a5a', '#5a6a4a', '#7a6a4a'], F: ['#4a3a2a', '#3a3028', '#5a4a3a'] };
function buildAmbient() {
  leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(.13, .08), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), 40);
  leaves.frustumCulled = false; leaves.list = []; for (let i = 0; i < 40; i++) { leaves.list.push({ s: 0, lat: 0, y: -1, ph: Math.random() * 9, vx: 0 }); leaves.setColorAt(i, new THREE.Color('#ffffff')); }
  scene.add(leaves);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -.18, -.7, 1, 0, 0, 0, .18, 0, 0, -.18, 0, 0, .18, .7, 1, 0], 3)); wg.computeVertexNormals();
  fliers = new THREE.InstancedMesh(wg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 26); fliers.frustumCulled = false;
  for (let i = 0; i < 26; i++) fliers.setColorAt(i, new THREE.Color(i < 10 ? '#2b2b30' : i < 16 ? '#0d0a0a' : '#e9e2c9'));
  scene.add(fliers);
  const ft = fogTex();
  for (let k = 0; k < 7; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, transparent: true, opacity: 0, depthWrite: false, color: '#ffffff' })); sp.scale.set(10, 2.6, 1); sp.visible = false; sp.u = { s: 6 + k * 6, lat: (Math.random() - .5) * 9, dr: (Math.random() - .5) * .3 }; scene.add(sp); fogCards.push(sp); }
}
const _f2 = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
function ambient(dt, d) {
  // leaves / petals drifting across the path on the wind
  const z = zoneAt(T.s), cols = LEAFC[z], wind = U.uWind.value;
  leaves.list.forEach((l, i) => {
    if (l.y < 0 || l.s < T.s - 3 || l.s > T.s + 26) { l.s = T.s + 2 + Math.random() * 22; l.lat = -7 - Math.random() * 3; l.y = 1 + Math.random() * 3; l.vx = .8 + Math.random() * 1.2; l.c = 1; leaves.setColorAt(i, _c.set(cols[(Math.random() * cols.length) | 0])); }
    l.lat += l.vx * dt * wind * (z === 'F' ? .4 : 1); l.y -= dt * (.25 + .15 * Math.sin(now * 3 + l.ph)); if (l.lat > 8) l.y = -1;
    frame(l.s, _f2); const sh = (z === 'F' || d > .8) ? 0 : 1;
    _e.set(now * 2 + l.ph, now * 1.3 + l.ph, Math.sin(now * 4 + l.ph)); _q.setFromEuler(_e);
    _m.compose(_v.set(_f2.p.x + _f2.r.x * l.lat, l.y + Math.sin(now * 2 + l.ph) * .15, _f2.p.z + _f2.r.z * l.lat), _q, _s3.set(sh, sh, sh)); leaves.setMatrixAt(i, _m);
  });
  leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  // birds wheel overhead in the morning; bats and moths come out at night
  for (let i = 0; i < 26; i++) {
    let sc = 0, x = 0, y = 0, zz = 0, yaw = 0, fl = 0;
    if (i < 10) { sc = (1 - sstep(.25, .4, d)) * .45; const c = frame(T.s + 30 + (i % 3) * 8, _f2).p, a = now * .35 + i * .63, r = 7 + (i % 4) * 2.5; x = c.x + Math.cos(a) * r; zz = c.z + Math.sin(a) * r; y = 14 + (i % 5) * 1.6 + Math.sin(now + i) * .6; yaw = -a; fl = Math.sin(now * 9 + i * 1.7) * (Math.sin(now * .7 + i) > .3 ? 1 : .15); }
    else if (i < 16) { sc = sstep(.6, .72, d) * .32; const c = frame(T.s + 9 + (i - 10) * 5, _f2).p, a = now * (1.6 + i * .07) + i * 2.1; x = c.x + Math.cos(a) * 3.5 + Math.sin(now * 3.1 + i) * 1.2; zz = c.z + Math.sin(a * 1.3) * 3; y = 4 + Math.sin(now * 2.3 + i) * 1.4; yaw = -a * 1.3; fl = Math.sin(now * 22 + i); }
    else { sc = sstep(.5, .62, d) * (BW.lightsOut ? 0 : .07); const L = W.lamps.find(l => l.s > T.s + 2 + (i % 4) * 12) || W.lamps[W.lamps.length - 1], P3 = W.lampPts.geometry.attributes.position, j = L.pi; if (L.out) sc = 0; const a = now * (5 + i % 3) + i; x = P3.getX(j) + Math.cos(a) * .35 + Math.sin(now * 7 + i) * .12; zz = P3.getZ(j) + Math.sin(a * 1.2) * .35; y = P3.getY(j) + Math.sin(now * 6 + i * 2) * .25; yaw = a; fl = Math.sin(now * 30 + i); }
    _e.set(0, yaw, 0); _q.setFromEuler(_e); _m.compose(_v.set(x, y, zz), _q, _s3.set(sc, sc * fl, sc)); fliers.setMatrixAt(i, _m);
  }
  fliers.instanceMatrix.needsUpdate = true;
  // fog banks drifting through the low ground from dusk on
  const fo = sstep(.42, .62, d) * (1 - sstep(.9, 1, d) * .4) * .55;
  fogCards.forEach(sp => {
    if (sp.u.s < T.s - 2) { sp.u.s += 42; sp.u.lat = (Math.random() - .5) * 9; }
    sp.u.lat += sp.u.dr * dt; frame(sp.u.s, _f2); sp.position.set(_f2.p.x + _f2.r.x * sp.u.lat, .75, _f2.p.z + _f2.r.z * sp.u.lat);
    sp.visible = fo > .01; sp.material.opacity = fo * clamp((sp.u.s - T.s) / 5, 0, 1); sp.material.color.copy(scene.fog.color).lerp(_c.set('#ffffff'), .25);
  });
  // the watcher: a tall shape between the trees, far ahead. Look into a cage and back, and it's gone.
  let show = false;
  for (const si of [15, 18, 21, 24]) {
    const s0 = STOPS[si].s; if (watcher.done[si]) continue;
    if (T.s > s0 - 4 && T.s < s0 + 9) { show = true;
      if (watcher.si !== si) { watcher.si = si; watcher.seen = 0; const f = frame(s0 + 30, _f2), side = si % 2 ? 1 : -1; watcher.root.position.set(f.p.x + f.r.x * 12.5 * side, 0, f.p.z + f.r.z * 12.5 * side); }
      if (T.face !== 0) watcher.seen = 1; else if (watcher.seen) { watcher.done[si] = 1; show = false; BW.watched = (BW.watched || 0) + 1; }
    } else if (watcher.si === si && T.s >= s0 + 9) watcher.done[si] = 1;
  }
  watcher.root.visible = show && mode === 'tour';
  if (show) { const p = watcher.root.position; watcher.root.rotation.y = Math.atan2(-(camPos.z - p.z), camPos.x - p.x); }
  // glimpses: sharp movements, rare at first and more and more often as it gets dark
  if (mode === 'tour' && d > .3 && now > (T.nextGlimpse || 0)) { if (T.nextGlimpse) glimpse(d); T.nextGlimpse = now + lerp(34, 4.5, sstep(.3, .95, d)) * (.6 + Math.random() * .8); }
  darters.forEach(D => {
    if (D.t < 0) return; D.t += dt / D.dur; const k = D.t;
    if (k >= 1) { D.root.visible = false; D.t = -1; return; }
    D.root.visible = true; D.root.position.lerpVectors(D.a, D.b, k); D.root.position.y = D.y0 + Math.abs(Math.sin(k * Math.PI * 6)) * .15;
    D.gait = (D.gait || 0) + dt * 40; animate(D, now, 0, 0, 1);
  });
}
const _c = new THREE.Color();
function glimpse(d) {
  const D = darters.find(x => x.t < 0); if (!D) return;
  const r = Math.random(); let kind;
  if (T.face !== 0 && r < .65) kind = 'edge'; else kind = r < .5 ? 'horizon' : 'between';
  const a = new THREE.Vector3(), b = new THREE.Vector3(), f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
  if (kind === 'horizon') { frame(T.s + 42 + Math.random() * 18, f); const dir = Math.random() < .5 ? -1 : 1; a.copy(f.p).addScaledVector(f.r, -20 * dir); b.copy(f.p).addScaledVector(f.r, 20 * dir); D.dur = .75; }
  else if (kind === 'between') { const st = STOPS.find(x => x.s > T.s + 12) || STOPS[STOPS.length - 1]; frame(st.s + (Math.random() < .5 ? -3.2 : 3.2), f); const dir = Math.random() < .5 ? -1 : 1; a.copy(f.p).addScaledVector(f.r, -8.5 * dir); b.copy(f.p).addScaledVector(f.r, 8.5 * dir); D.dur = .42; }
  else { const st = STOPS[nearestStop(T.s).i], side = T.face, dir = Math.random() < .5 ? -1 : 1; frame(st.s + dir * 6, f); a.copy(f.p).addScaledVector(f.r, side * 9.5); frame(st.s + dir * 2.7, f); b.copy(f.p).addScaledVector(f.r, side * 2.2); D.dur = .33; }
  D.a = a; D.b = b; D.y0 = 0; D.t = 0; D.root.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x); BW.glimpses = (BW.glimpses || 0) + 1; BW.glimpseKinds = (BW.glimpseKinds || '') + kind[0];
  if (Math.random() < .35) setTimeout(() => SFX.step && SFX.step((Math.random() - .5), 0, .03), 120);
}

// ---------- camera ----------
let aspect = 1;
function placeCamera(dt) {
  const f = frame(T.s), yaw = Math.atan2(-f.t.x, -f.t.z);
  // turning: follows your finger while you drag, then eases (a damped spring) into the cage or back to the path
  const tgtF = T.drag != null ? T.drag : T.face;
  if (T.drag != null) { T.faceF += (tgtF - T.faceF) * (1 - Math.exp(-dt * 16)); T.faceV = 0; }
  else { const acc = (tgtF - T.faceF) * 40 - T.faceV * 11.8; T.faceV += acc * dt; T.faceF += T.faceV * dt; }
  const portrait = aspect < .8, shift = portrait ? 2.2 : 1.1, af = Math.abs(T.faceF);
  const lat = -T.faceF * shift, moved = Math.abs(T.s - (T.prevS || T.s)), spd = moved / Math.max(dt, .001);
  // head bob and footsteps are tied to distance walked: one step every 0.78 m
  T.dist += moved; const ph = T.dist / .78 * Math.PI, amp = RM ? 0 : clamp(spd / 2.2, 0, 1);
  const bob = (Math.abs(Math.sin(ph)) - .5) * .06 * amp;
  // breathing when you stand still (heavier late at night)
  const idle = 1 - clamp(spd / 1.5, 0, 1), dd = BW.d || 0, br = RM ? 0 : idle * (1 + dd * 1.8);
  camPos.set(f.p.x + f.r.x * lat, 1.62 + bob + Math.sin(now * 1.25) * .01 * br, f.p.z + f.r.z * lat);
  if (BW.shake > 0 && !RM) { camPos.x += (Math.random() - .5) * BW.shake; camPos.y += (Math.random() - .5) * BW.shake; BW.shake = Math.max(0, BW.shake - dt * 1.5); }
  camera.position.copy(camPos);
  const ya = yaw - T.faceF * Math.PI / 2 + (RM ? 0 : Math.sin(now * .37) * .012 * dd * idle), pitch = -.05 + af * (portrait ? .04 : .02) + Math.sin(now * 1.25 - .7) * .005 * br - amp * .01;
  camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ'; camera.rotation.y = ya; camera.rotation.x = pitch; camera.rotation.z = Math.sin(ph) * .006 * amp;
  const baseF = portrait ? 74 : aspect < 1.3 ? 66 : 58;
  camera.fov = baseF + clamp(spd, 0, 8) * .35; camera.updateProjectionMatrix();
  sky.position.copy(camPos);
}
function resize() {
  const w = innerWidth, h = innerHeight; aspect = w / h;
  renderer.setSize(w, h, false); camera.aspect = aspect; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); if (window.visualViewport) visualViewport.addEventListener('resize', resize);

// ---------- footsteps & breath ----------
function sounds(dt, d) {
  const moved = Math.abs(T.s - (T.prevS || T.s)), sn = Math.floor(T.dist / .78);
  const quiet = T.s > S_EXIT - 34; if (quiet !== !!T.quiet) { T.quiet = quiet; SFX.quiet && SFX.quiet(quiet); }
  if (sn !== T.stepN) { T.stepN = sn; const side = (T.sideStep = -(T.sideStep || 1)); SFX.step(side * .25, 0, (.045 + .02 * (1 - d)) * (quiet ? .6 : 1)); if (d > .62 && !quiet) SFX.step(-side * .1, .2 + Math.random() * .05, .025 + d * .03); }
  if (d > .82 && moved < .002 && mode === 'tour' && now - (T.lastBreath || 0) > 7 + Math.random() * 6) { T.lastBreath = now; SFX.breath && SFX.breath(); }
  if (now - (T.lastDread || 0) > .25 && !T.quiet) { T.lastDread = now; SFX.setDread(d); }
}

// ---------- ending: closing time, Pip, the scare ----------
function ending() {
  if (mode !== 'tour') return;
  mode = BW.mode = 'ending'; closeCard(); T.drag = null; T.auto = null; T.v = 0; turnTo(0); T.face = 0; LS.set('bw3.toured', '1'); BW.toured = true;
  document.body.classList.add('ending');
  SFX.hushAll && SFX.hushAll(1.5);
  const f0 = frame(S_EXIT + 6.5), f = { p: f0.p.clone(), t: f0.t.clone(), r: f0.r.clone() }, say = (t) => { const el = $('#closeT'); el.textContent = t; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  setTimeout(() => { BW.lightsOut = true; SFX.sting && SFX.heart(2); say('The gardens are now closed.'); }, 400);
  setTimeout(() => {
    pipBoss.root.visible = true; pipBoss.root.position.set(f.p.x, 0, f.p.z); pipBoss.root.rotation.y = Math.atan2(f.t.z, -f.t.x); pipBoss.root.scale.setScalar(1);
    gateLamp.position.set(f.p.x, 5.2, f.p.z + .01); gateLamp.target.position.set(f.p.x, .6, f.p.z); gateLamp.intensity = 60; torch.target.position.set(0, -.2, -6);
    SFX.giggle(0); say('Pip will see you out.'); BW.pipShown = true;
  }, 2600);
  setTimeout(() => { SFX.heart && SFX.heart(2, 0, .5); }, 3300);
  setTimeout(() => swarmGo(), 4300);
}
// the swarm: they come from everywhere at once, staggered inside a second
function swarmBasis() {
  const ry = camera.rotation.y, fwd = new THREE.Vector3(-Math.sin(ry), 0, -Math.cos(ry)), right = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
  const tv = Math.tan(camera.fov * Math.PI / 360), asp = camera.aspect;
  return { fwd, right, cam: camPos.clone(), tv, th: tv * asp, nar: Math.sqrt(Math.min(1, asp * 1.5)) };
}
function poseSwarm(t, B) {
  swarm.forEach((c, i) => {
    const R = c.R, k = clamp((t - c.delay) / .38, 0, 1); if (t < c.delay) { if (i) R.root.visible = false; return; }
    R.root.visible = true; const frac = c.frac * B.nar, sc = c.sc0, dist = Math.max(.9, (R.h * sc * .9) / (frac * 2 * B.tv)) + i * .04;
    const face = B.cam.clone().addScaledVector(B.fwd, dist).addScaledVector(B.right, c.nx * dist * B.th); face.y = B.cam.y + c.ny * dist * B.tv;
    const to = face.clone(); to.y -= R.h * sc * .82;
    if (!c.started) { c.started = 1; if (i) { c.from.copy(to).addScaledVector(B.right, (Math.abs(c.nx) < .1 ? (i % 2 ? 1 : -1) : Math.sign(c.nx)) * 5).addScaledVector(B.fwd, 3); c.from.y = c.up ? 5 : 0; } else c.from.copy(R.root.position);
      SFX.voice(['giggle', 'screech', 'growl', 'scream', 'roar', 'screech', 'scream', 'boom'][i], 1, clamp(c.nx, -1, 1)); }
    const p = new THREE.Vector3().lerpVectors(c.from, to, 1 - Math.pow(1 - k, 2)); p.y += Math.sin(Math.PI * k) * (c.up ? .2 : 1.1);
    R.root.position.copy(p); R.root.scale.setScalar(sc); R.root.rotation.y = Math.atan2(-(B.cam.z - p.z), B.cam.x - p.x); animate(R, now, 1, 0, 0, .3);
  });
}
function swarmGo() {
  BW.scared = true; BW.swarm = swarm.length; const B = swarmBasis(), a = performance.now(); let hit = false, dark = false;
  swarm.forEach(c => c.started = 0); SFX.sting(1); SFX.roar && SFX.roar();
  // the gate lamp swings round onto them: same light, so nothing recompiles at the worst moment
  gateLamp.color.set('#ff9a78'); gateLamp.angle = 1.1; gateLamp.position.copy(B.cam).addScaledVector(B.fwd, -.4); gateLamp.position.y += .6; gateLamp.target.position.copy(B.cam).addScaledVector(B.fwd, 3); gateLamp.intensity = 24;
  const step = () => { const t = (performance.now() - a) / 1000; poseSwarm(t, B);
    if (t > .3 && !hit) { hit = true; BW.hit = true; BW.shake = .4; flash($('#flash')); try { navigator.vibrate && navigator.vibrate([90, 40, 90, 40, 260]); } catch (e) {} }
    if (t > .55 && t < 1.55) BW.shake = Math.max(BW.shake, .22);
    if (t > 1.6 && !dark) { dark = true; const fl = $('#flash'); fl.style.transition = 'opacity .25s'; fl.style.background = '#000'; fl.style.opacity = 1; SFX.voice('scream', 1, -.5); setTimeout(() => SFX.voice('screech', 1, .5), 180); }
    if (t < 2.5) requestAnimationFrame(step); };
  step();
  setTimeout(() => { $('#runword').classList.add('on'); }, 2200);
  setTimeout(() => { $('#runword').classList.remove('on'); swarm.forEach(c => { c.R.root.visible = false; }); const fl = $('#flash'); fl.style.transition = 'opacity .4s'; fl.style.opacity = 0; startRun(); }, 3300);
}
BW.swarmList = () => swarm;
BW.poseSwarm = ms => { const B = swarmBasis(); gateLamp.color.set('#ff9a78'); gateLamp.angle = 1.1; gateLamp.position.copy(B.cam).addScaledVector(B.fwd, -.4); gateLamp.position.y += .6; gateLamp.target.position.copy(B.cam).addScaledVector(B.fwd, 3); gateLamp.intensity = 24; swarm.forEach(c => c.started = 0); poseSwarm(ms / 1000, B); BW.posed = 1; };
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
  const dt = Math.min(.066, (t - last) / 1000); last = t; now = t / 1000;
  fpsN++; fpsT += dt; if (fpsT > 1) { BW.fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0;
    if (BW.fps < 42 && PR > 1 && (mode === 'tour' || mode === 'run')) { lowT++; if (lowT > 2) { PR = Math.max(1, PR - .25); renderer.setPixelRatio(PR); resize(); lowT = 0; BW.pr = PR; } } else lowT = 0; }
  BW.frames++;
  if (mode === 'run') { runner.frame(dt, now); return; }
  if (mode === 'boot' || mode === 'gate') return;
  if (mode === 'tour') {
    const up = keys.arrowup || keys.w, dn = keys.arrowdown || keys.s;
    if ((up || dn) && T.face === 0) { T.v += ((up ? 4.4 : -4.4) - T.v) * (1 - Math.exp(-dt * 3)); T.lastIn = now; T.auto = null; }
    if (T.auto != null) { const rem = T.auto - T.tgt; T.v = clamp(rem * 1.3, -4.4, 4.4); if (Math.abs(rem) < .05) T.auto = null; }
    if (Math.abs(T.v) > .02) { T.tgt = clamp(T.tgt + T.v * dt, 0, MAXS); if (!up && !dn && T.auto == null) T.v *= Math.exp(-dt * 1.5); } else T.v = 0;
    // settle gently in front of the nearest pair of enclosures once you've slowed down
    const n = nearestStop(T.tgt);
    if (!tp && T.auto == null && !up && !dn && now - T.lastIn > .25 && T.face === 0 && Math.abs(T.v) < 1.6 && n.dist < 3.2 && n.dist > .005) { T.tgt += (STOPS[n.i].s - T.tgt) * (1 - Math.exp(-dt * 2.2)); T.v *= Math.exp(-dt * 3); }
  }
  T.prevS = T.s;
  const dS = T.tgt - T.s; T.s += clamp(dS * (1 - Math.exp(-dt * 6)), -12 * dt, 12 * dt);
  BW.settled = Math.abs(T.v) < .05 && Math.abs(dS) < .3 && T.auto == null;
  if (mode === 'tour' && T.s >= S_EXIT - .3) ending();
  const d = mode === 'ending' ? 1 : dAt(T.s);
  BW.s = +T.s.toFixed(2); BW.tgt = T.tgt; BW.d = d; BW.facing = T.face; BW.stop = nearestStop(T.s).i;
  placeCamera(dt);
  if (Math.abs(d - lastD) > .0008 || now - (T.lastSky || 0) > .5) { applyCurve(d, camPos); lastD = d; T.lastSky = now; }
  // your phone torch: full beam at the very end, and a softer one whenever you look into a dark cage
  const orow = sstep(OPENROW[0].s - 14, OPENROW[0].s - 4, T.s) * (mode === 'tour' ? 1 : 0);
  torch.angle = .5 + orow * .38; if (W.alarmPts) W.alarmPts.material.opacity = orow * (.35 + .65 * Math.max(0, Math.sin(now * 4.2)));
  if (orow > .5 && !BW.openSeen) { BW.openSeen = 1; SFX.voice && SFX.voice('creak', .5, -.6); }
  torch.intensity = Math.max(CUR.torch || 0, Math.abs(T.faceF) * sstep(.45, .72, d) * .75) * 26;
  U.uTime.value = now;
  updateExhibits(dt); playFx(dt); creepy(dt); updateCrowd(T.s / S_EXIT); updateEyes(d); updateLamps(d); ambient(dt, d);
  if (mode === 'tour') sounds(dt, d);
  if (now - hudT > .15) { hudT = now; hud(); }
  renderer.render(scene, camera); BW.calls = renderer.info.render.calls;
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

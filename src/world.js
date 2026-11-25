/* Brightwater 3D: the park. One winding avenue, enclosures either side, zone gates between areas.
   Almost all scenery is instanced (one draw call per primitive type). */
import * as THREE from 'three';
import { GEO, mat, buildModel } from './models.js';

export const E = window.EXHIBITS, Z = window.ZONES;
export const ZK = ['A', 'B', 'C', 'D', 'E', 'F'];
export const STYLE = {
  A: { bar: '#f5f0e2', frame: '#c8743a', floor: '#d8c07f', wall: '#d9a86a', roof: '#e0892b', ground: '#a9d16f', path: '#efd9a7', crown: ['#7fb24a', '#93c257', '#6fa443'], trunk: '#7a5032', tree: 'acacia' },
  B: { bar: '#6f8f3a', frame: '#3f5a2a', floor: '#6f8f45', wall: '#4f7a3a', roof: '#2f5a2a', ground: '#5f9a4a', path: '#d8c49a', crown: ['#3f7d3a', '#2f6b32', '#4f8f3f'], trunk: '#5b3a22', tree: 'round' },
  C: { bar: '#c8402f', frame: '#2b2320', floor: '#efd6d0', wall: '#f0d0c4', roof: '#c8402f', ground: '#8fbf7a', path: '#ead8c2', crown: ['#f2a7b8', '#f6c1cc', '#e88fa6'], trunk: '#4a3428', tree: 'round' },
  D: { bar: '#3a4058', frame: '#1d2233', floor: '#4a4f62', wall: '#383d52', roof: '#1d2233', ground: '#46684f', path: '#b8ad94', crown: ['#2f4a44', '#36524a', '#28403a'], trunk: '#2a221c', tree: 'pine' },
  E: { bar: '#2a6f78', frame: '#1f4f55', floor: '#c9b98f', wall: '#2a7a84', roof: '#1f4f55', ground: '#4a6a58', path: '#a8a08a', crown: ['#2f5a52', '#3a6a5a', '#284a44'], trunk: '#2a221c', tree: 'pine', tank: 1 },
  F: { bar: '#7a5040', frame: '#3a3a3a', floor: '#5f5f58', wall: '#6a6a62', roof: '#33332f', ground: '#4f5a48', path: '#8f8a7c', crown: ['#3a3a30', '#2f302a'], trunk: '#2a2420', tree: 'dead' }
};
// ---------- the avenue ----------
export function X(s) { return 6 * Math.sin(s * .018) + 2.6 * Math.sin(s * .047 + 1); }
const _f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
export function frame(s, o = _f) {
  const x = X(s), dx = (X(s + .5) - X(s - .5));
  o.p.set(x, 0, -s); o.t.set(dx, 0, -1).normalize(); o.r.set(-o.t.z, 0, o.t.x);
  return o;
}
export const yawAt = s => { const f = frame(s); return Math.atan2(-f.t.x, -f.t.z); };

// ---------- route plan: stops (pairs), zone gates ----------
export const STOPS = [], GATES = [];
(function plan() {
  let s = 20; GATES.push({ s: 7, z: 'IN' });
  ZK.forEach((zk, zi) => {
    const ids = E.map((e, i) => [e, i]).filter(([e]) => e.z === zk).map(([, i]) => i);
    if (zi > 0) { GATES.push({ s: s - 9, z: zk }); s += 4; }
    for (let k = 0; k < ids.length; k += 2) { STOPS.push({ s, z: zk, L: ids[k], R: ids[k + 1] != null ? ids[k + 1] : -1, n: STOPS.length }); s += 15; }
  });
  GATES.push({ s: s + 2, z: 'OUT' });
})();
export const S_EXIT = GATES[GATES.length - 1].s - 3;
export const S_D0 = STOPS[4].s; // the first ten exhibits stay sunny
export const zoneAt = s => { let z = 'A'; for (const g of GATES) if (s >= g.s && g.z.length === 1) z = g.z; return z; };

// ---------- instance collectors ----------
class Bag {
  constructor(geo, material) { this.geo = geo; this.mat = material; this.m = []; this.c = []; }
  add(m, c) { this.m.push(m.clone()); this.c.push(new THREE.Color(c)); return this.m.length - 1; }
  build() {
    const im = new THREE.InstancedMesh(this.geo, this.mat, Math.max(1, this.m.length));
    this.m.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, this.c[i]); });
    im.count = this.m.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; this.im = im; return im;
  }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function M(px, py, pz, sx, sy, sz, ry = 0, rx = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(px, py, pz); _s.set(sx, sy, sz); return _m.compose(_p, _q, _s); }
// world matrix from a local frame (origin o, yaw y) * local box
const _w = new THREE.Matrix4(), _l = new THREE.Matrix4();
function inFrame(F, lx, ly, lz, sx, sy, sz, ry = 0, rx = 0, rz = 0) { _l.copy(M(lx, ly, lz, sx, sy, sz, ry, rx, rz)); return _w.multiplyMatrices(F, _l); }

const rnd = (() => { let x = 1234567; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; })();

export function buildWorld(scene, atlasTex, gateTex, signTex) {
  const W = {};
  const lam = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true });
  const boxes = new Bag(GEO.box, lam), crowns = new Bag(GEO.ico0, lam), cones = new Bag(GEO.cone, lam);
  const bulbs = new Bag(new THREE.SphereGeometry(.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
  const lanterns = new Bag(new THREE.BoxGeometry(.32, .42, .32), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'), gg = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(.5, 'rgba(255,255,255,.45)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gg; gx.fillRect(0, 0, 64, 64);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd98a', map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const glows = new Bag(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), glowMat);
  const pawMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const paws = new Bag(new THREE.CircleGeometry(.11, 7).rotateX(-Math.PI / 2), pawMat);
  W.lamps = [];

  // ---------- ground + path ribbons (vertex coloured by zone) ----------
  function ribbon(half, step, y, colFn) {
    const pos = [], col = [], idx = []; const n = Math.ceil((S_EXIT + 60) / step) + 1; const f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
    for (let i = 0; i < n; i++) {
      const s = -30 + i * step; frame(s, f); const c = new THREE.Color(colFn(s));
      for (const k of [-1, 1]) { pos.push(f.p.x + f.r.x * half * k, y, f.p.z + f.r.z * half * k); col.push(c.r, c.g, c.b); }
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const blendZone = (s, key) => {
    // colour that drifts from zone to zone over ~20 m around each gate
    let a = 'A', b = 'A', t = 0;
    for (const g of GATES) if (g.z.length === 1) { if (s > g.s - 10) { a = b; b = g.z; t = Math.min(1, (s - (g.s - 10)) / 20); if (s > g.s + 10) a = b; } }
    const ca = new THREE.Color(STYLE[a][key]), cb = new THREE.Color(STYLE[b][key]); return ca.lerp(cb, a === b ? 1 : t);
  };
  const ground = new THREE.Mesh(ribbon(70, 4, 0, s => blendZone(s, 'ground')), new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.frustumCulled = false; scene.add(ground);
  const path = new THREE.Mesh(ribbon(2.6, 1, .025, s => blendZone(s, 'path')), new THREE.MeshLambertMaterial({ vertexColors: true }));
  path.frustumCulled = false; scene.add(path);
  // kerbs + paw prints + lamps along the avenue
  const f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
  for (let s = -20; s < S_EXIT + 30; s += 2) {
    frame(s, f); const yaw = Math.atan2(-f.t.x, -f.t.z), z = zoneAt(s);
    for (const k of [-1, 1]) boxes.add(M(f.p.x + f.r.x * 2.7 * k, .07, f.p.z + f.r.z * 2.7 * k, .25, .14, 2.05, yaw), k < 0 ? '#cfc3a6' : '#c9bc9e');
    if (s > 0 && s < S_EXIT && (s % 4 === 0)) { for (const [dx, dz] of [[-.18, 0], [.18, .55]]) { const lx = f.p.x + f.r.x * (dx + .3 * Math.sin(s)), lz = f.p.z + f.r.z * (dx + .3 * Math.sin(s)) - dz; paws.add(M(lx, .035, lz, 1, 1, 1.25, yaw), '#e0892b'); } }
    if (s % 12 === 0 && s > -12 && s < S_EXIT + 12) {
      const k = (s / 12) % 2 ? 1 : -1, lx = f.p.x + f.r.x * 3.1 * k, lz = f.p.z + f.r.z * 3.1 * k;
      boxes.add(M(lx, 1.5, lz, .12, 3, .12, yaw), '#2b3a34'); boxes.add(M(lx - f.r.x * .25 * k, 3.0, lz - f.r.z * .25 * k, .55, .08, .12, yaw + Math.PI / 2), '#2b3a34');
      const bi = bulbs.add(M(lx - f.r.x * .45 * k, 2.88, lz - f.r.z * .45 * k, 1, 1, 1), '#ffffff');
      const gi = glows.add(M(lx - f.r.x * .8 * k, .04, lz - f.r.z * .8 * k, 2.6, 1, 2.6), '#ffffff');
      W.lamps.push({ s, bi, gi, dead: s > S_EXIT * .82 && rnd() < .5 });
    }
  }
  // ---------- trees and bushes ----------
  for (let s = -30; s < S_EXIT + 50; s += 2.2) {
    frame(s, f); const z = zoneAt(s), st = STYLE[z];
    for (const k of [-1, 1]) {
      const lat = 9 + rnd() * 18, x = f.p.x + f.r.x * lat * k + (rnd() - .5) * 2, zz = f.p.z + f.r.z * lat * k + (rnd() - .5) * 2;
      const h = 2 + rnd() * 3, cc = st.crown[(rnd() * st.crown.length) | 0];
      if (st.tree === 'acacia') { boxes.add(M(x, h / 2, zz, .25, h, .25), st.trunk); crowns.add(M(x, h + .2, zz, 2.2 + rnd(), .55, 2.0 + rnd(), rnd() * 3), cc); }
      else if (st.tree === 'round') { boxes.add(M(x, h / 2, zz, .3, h, .3), st.trunk); crowns.add(M(x, h + .9, zz, 1.6 + rnd(), 1.5 + rnd(), 1.6 + rnd(), rnd() * 3), cc); }
      else if (st.tree === 'pine') { boxes.add(M(x, .6, zz, .3, 1.2, .3), st.trunk); cones.add(M(x, 1 + h * .7, zz, 1.2 + rnd() * .5, h * 1.5, 1.2 + rnd() * .5, rnd() * 3), cc); }
      else { boxes.add(M(x, h / 2, zz, .22, h, .22, rnd()), st.trunk); boxes.add(M(x + .4, h * .75, zz, .12, 1.4, .12, rnd() * 3, 0, .8), st.trunk); boxes.add(M(x - .3, h * .6, zz, .1, 1.1, .1, rnd() * 3, 0, -.9), st.trunk); }
      if (rnd() < .55) crowns.add(M(f.p.x + f.r.x * (3.4 + rnd() * 2) * k + (rnd() - .5), .3, f.p.z + f.r.z * (3.4 + rnd() * 2) * k + (rnd() - .5) * 3, .6 + rnd() * .4, .45 + rnd() * .3, .6 + rnd() * .4, rnd() * 3), z === 'F' ? '#4a4a3e' : z === 'C' ? '#7fae6a' : st.crown[0]);
    }
  }
  // clouds
  const clouds = new Bag(GEO.ico0, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
  for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = 160 + rnd() * 60; for (let j = 0; j < 3; j++) clouds.add(M(Math.cos(a) * r + j * 9, 55 + rnd() * 30, Math.sin(a) * r - S_EXIT / 2, 10 + rnd() * 6, 4 + rnd() * 2, 7 + rnd() * 3, rnd()), '#ffffff'); }

  // ---------- enclosures ----------
  const glassMat = new THREE.MeshBasicMaterial({ color: '#7fd6e0', transparent: true, opacity: .18, depthWrite: false });
  const waterMat = new THREE.MeshBasicMaterial({ color: '#2a8fa8', transparent: true, opacity: .2, depthWrite: false, side: THREE.BackSide });
  const plMat = new THREE.MeshLambertMaterial({ map: atlasTex });
  W.ex = []; W.stopObjs = STOPS.map(() => []);
  const CW = 4.8, CD = 4.2, CH = 3.3, OFF = 5.4;
  STOPS.forEach((st, si) => {
    for (const side of [-1, 1]) {
      const i = side < 0 ? st.L : st.R;
      frame(st.s, f);
      const ox = f.p.x + f.r.x * OFF * side, oz = f.p.z + f.r.z * OFF * side;
      const face = new THREE.Vector3(-f.r.x * side, 0, -f.r.z * side), ry = Math.atan2(face.x, face.z);
      const F = new THREE.Matrix4().compose(new THREE.Vector3(ox, 0, oz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
      const S = STYLE[st.z];
      if (i < 0) { // kiosk / bench on the empty side
        boxes.add(inFrame(F, 0, .45, 1.3, 2.4, .12, .6), '#8a5a32'); boxes.add(inFrame(F, 0, .75, 1.05, 2.4, .5, .1), '#8a5a32');
        for (const x of [-1, 1]) boxes.add(inFrame(F, x * 1.05, .22, 1.3, .1, .45, .5), '#2b3a34');
        boxes.add(inFrame(F, 0, 1.1, -.6, 2.4, 2.2, 1.6), st.z === 'F' ? '#55554e' : '#e6d3a8'); boxes.add(inFrame(F, 0, 2.35, -.6, 2.8, .3, 2.0), S.roof);
        continue;
      }
      const e = E[i], cage = e.cage || 'shut', tank = S.tank && e.a.plan !== 'quad' && e.a.plan !== 'serpent' && e.a.plan !== 'mirror';
      // floor, walls, roof frame
      boxes.add(inFrame(F, 0, .06, 0, CW, .12, CD), S.floor);
      boxes.add(inFrame(F, 0, CH / 2, -CD / 2, CW, CH, .14), S.wall);
      for (const x of [-1, 1]) {
        // side walls: a low wall with bars above, so you glimpse the residents as you walk past
        boxes.add(inFrame(F, x * CW / 2, .45, 0, .16, .9, CD), S.wall);
        if (!tank) for (let b = 0; b < 9; b++) boxes.add(inFrame(F, x * CW / 2, CH / 2 + .45, -CD / 2 + .3 + b * (CD - .5) / 8, .06, CH - .9, .06), S.bar);
        else boxes.add(inFrame(F, x * CW / 2, CH / 2 + .45, 0, .14, CH - .9, CD), S.wall);
        boxes.add(inFrame(F, x * CW / 2, .92, 0, .22, .08, CD + .1), S.frame);
      }
      if (!(e.n === 'Gon-zilla')) { boxes.add(inFrame(F, 0, CH, 0, CW + .3, .16, CD + .3), S.roof); boxes.add(inFrame(F, 0, CH + .35, -.2, CW * .9, .12, CD * .7, 0, .25), S.roof); }
      for (const x of [-1, 1]) boxes.add(inFrame(F, x * CW / 2, CH / 2, CD / 2, .2, CH, .2), S.frame);
      boxes.add(inFrame(F, 0, CH - .08, CD / 2, CW, .16, .2), S.frame);
      boxes.add(inFrame(F, 0, .1, CD / 2, CW, .2, .2), S.frame);
      if (st.z === 'F') for (let k = 0; k < 8; k++) boxes.add(inFrame(F, -CW / 2 + .3 + k * .6, .28, CD / 2 + .08, .3, .14, .05, 0, 0, .6), k % 2 ? '#1f1c17' : '#e8c23a');
      // front: bars or glass
      const doorAng = cage === 'ajar' ? -1.05 : (cage === 'empty' || cage === 'open-you') ? -1.75 : 0;
      if (tank) {
        if (cage !== 'ajar') { const g = new THREE.Mesh(GEO.box, glassMat); g.applyMatrix4(inFrame(F, 0, CH / 2, CD / 2 - .05, CW - .2, CH - .3, .04)); scene.add(g); W.stopObjs[si].push(g); }
        else for (let k = 0; k < 9; k++) boxes.add(inFrame(F, (rnd() - .5) * 3, .05, CD / 2 + .4 + rnd() * 1.6, .25 + rnd() * .3, .04, .2 + rnd() * .2, rnd() * 3), '#bfeaf0');
        const wv = new THREE.Mesh(GEO.box, waterMat); wv.applyMatrix4(inFrame(F, 0, (CH - .3) / 2 + .1, -.05, CW - .3, CH - .35, CD - .3)); scene.add(wv); W.stopObjs[si].push(wv);
        for (let k = 0; k < 4; k++) cones.add(inFrame(F, -1.8 + k * 1.1 + rnd() * .3, .5, -1.5 + rnd() * .4, .14, 1 + rnd(), .14), '#3f8f5a');
      } else if (cage !== 'none') {
        const nb = 13;
        for (let b = 0; b < nb; b++) {
          const x = -CW / 2 + .2 + b * (CW - .4) / (nb - 1);
          if (Math.abs(x) < .62) continue;
          boxes.add(inFrame(F, x, CH / 2, CD / 2, .07, CH - .1, .07), S.bar);
        }
        // the door: three bars hinged at x = -.62
        const D = new THREE.Matrix4().multiplyMatrices(F, M(-.62, 0, CD / 2, 1, 1, 1, doorAng)).clone();
        for (const dx of [.2, .62, 1.04]) boxes.add(inFrame(D, dx, CH / 2 - .05, 0, .07, CH - .2, .07), S.bar);
        boxes.add(inFrame(D, .62, CH * .55, 0, 1.24, .08, .08), S.bar);
        boxes.add(inFrame(D, 1.0, CH * .5, .06, .1, .22, .1), '#d8b441');
      }
      // inside dressing
      if (st.z === 'A') { crowns.add(inFrame(F, -1.5, .3, -1.2, .9, .5, .7, rnd()), '#b8a07a'); crowns.add(inFrame(F, 1.6, .2, -1.4, .5, .3, .5, rnd()), '#9fbf5a'); }
      if (st.z === 'B') { crowns.add(inFrame(F, -1.7, .7, -1.5, .9, .9, .7, rnd()), '#3f7d3a'); crowns.add(inFrame(F, 1.8, .5, -1.4, .7, .7, .6, rnd()), '#2f6b32'); }
      if (st.z === 'C') { for (const x of [-1, 1]) lanterns.add(inFrame(F, x * 1.7, CH - .6, 1.5, 1, 1, 1), '#ffb36b'); crowns.add(inFrame(F, -1.7, .6, -1.5, .8, .8, .7), '#f2a7b8'); }
      if (st.z === 'D') boxes.add(inFrame(F, .4, 2.1, -1, 3.4, .12, .12, 0, 0, .15), '#4a3a2c');
      if (st.z === 'F') { boxes.add(inFrame(F, -1.4, .2, -1.3, 1.2, .3, .9, .3), '#c8b47a'); for (let k = 0; k < 3; k++) boxes.add(inFrame(F, -2.25, 2.4 - k * .25, -.8 + k * .1, .05, .2, .12, 0, .4), '#666'); }
      // placard on a post, angled towards the path
      boxes.add(inFrame(F, CW / 2 + .5, .6, CD / 2 + .55, .1, 1.2, .1), S.frame);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .62), plMat);
      const col = i % 5, row = (i / 5) | 0, uvs = pl.geometry.attributes.uv; const u0 = col / 5, v0 = 1 - (row + 1) / 10;
      for (let k = 0; k < 4; k++) uvs.setXY(k, u0 + uvs.getX(k) / 5, v0 + uvs.getY(k) / 10);
      pl.applyMatrix4(inFrame(F, CW / 2 + .5, 1.35, CD / 2 + .6, 1, 1, 1, side * -.5, -.15)); scene.add(pl); W.stopObjs[si].push(pl);
      // the resident
      let R = null;
      const absent = cage === 'empty' || e.n === 'Pip';
      if (!absent) {
        R = buildModel(e, 3.6);
        const inF = tank ? 0 : (e.a.plan === 'mirror' ? .6 : -.3);
        R.root.position.set(0, .12, inF);
        R.root.rotation.y = -Math.PI / 2 + side * .55 * (e.a.plan === 'flock' ? 0 : 1);
        if (e.a.plan === 'mirror') R.root.rotation.y = -Math.PI / 2;
        const holder = new THREE.Group(); holder.applyMatrix4(F); holder.add(R.root); scene.add(holder);
        R.holder = holder; W.stopObjs[si].push(holder);
      }
      const ex = { i, e, si, side, R, F, ry, center: new THREE.Vector3(ox, 1.2, oz), cage, tank, absent };
      // tap proxy (generous)
      const px = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
      const ph = R ? Math.max(1.4, R.h + .4) : 2.2, pw = R ? Math.min(CW - .4, Math.max(1.6, R.w + .6)) : CW - .6;
      px.applyMatrix4(inFrame(F, 0, ph / 2 + .1, 0, pw, ph, CD - .6)); px.userData.ex = W.ex.length; scene.add(px); ex.proxy = px; W.stopObjs[si].push(px);
      W.ex.push(ex);
    }
  });
  // ---------- gates (arches with painted signs) ----------
  GATES.forEach((g, gi) => {
    frame(g.s, f); const yaw = Math.atan2(-f.t.x, -f.t.z), Fm = new THREE.Matrix4().compose(f.p.clone(), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
    const col = g.z === 'IN' ? '#e0892b' : g.z === 'OUT' ? '#8f2a22' : Z[g.z].col;
    for (const k of [-1, 1]) { boxes.add(inFrame(Fm, k * 3.3, 2.4, 0, .6, 4.8, .6), col); boxes.add(inFrame(Fm, k * 3.3, 4.95, 0, .8, .3, .8), '#1f1c17'); }
    boxes.add(inFrame(Fm, 0, 4.6, 0, 7.4, .35, .5), '#1f1c17');
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshLambertMaterial({ map: gateTex[gi] }));
    sg.applyMatrix4(inFrame(Fm, 0, 3.75, .3, 1, 1, 1, 0)); scene.add(sg); g.sign = sg;
    // fence wings either side of the gate
    for (const k of [-1, 1]) for (let j = 0; j < 6; j++) { boxes.add(inFrame(Fm, k * (4 + j * 1.2), .9, 0, .1, 1.8, .1), '#1f1c17'); boxes.add(inFrame(Fm, k * (4.6 + j * 1.2), 1.4, 0, 1.2, .08, .06), col); }
  });
  // ---------- pip statues + signposts ----------
  W.signs = [];
  const SIGNS = [[11, 0], [S_D0 - 8, 1], [STOPS[9].s + 8, 2], [STOPS[13].s + 8, 3], [STOPS[17].s + 8, 4], [STOPS[21].s + 8, 5], [STOPS[24].s + 8, 6]];
  SIGNS.forEach(([s, ti], k) => {
    frame(s, f); const side = k % 2 ? 1 : -1, x = f.p.x + f.r.x * 3.4 * side, z = f.p.z + f.r.z * 3.4 * side, yaw = Math.atan2(-f.t.x, -f.t.z);
    boxes.add(M(x, .9, z, .12, 1.8, .12, yaw), '#2b3a34');
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .8), new THREE.MeshLambertMaterial({ map: signTex[ti] }));
    p.position.set(x, 1.9, z); p.rotation.y = yaw - side * .45; scene.add(p); W.signs.push(p);
  });
  W.statues = [];
  const pipE = E.find(e => e.n === 'Pip');
  [[3, -1], [STOPS[2].s + 7.5, 1], [STOPS[5].s + 7.5, -1], [STOPS[9].s + 7.5, 1], [STOPS[14].s + 7.5, -1], [STOPS[19].s + 7.5, 1]].forEach(([s, side], k) => {
    frame(s, f); const x = f.p.x + f.r.x * 3.6 * side, z = f.p.z + f.r.z * 3.6 * side;
    boxes.add(M(x, .4, z, .9, .8, .9), '#e6d3a8');
    if (k >= 4) return; // later pedestals are empty
    const R = buildModel(pipE); R.root.position.set(x, .8, z); R.root.rotation.y = Math.atan2(f.r.z * side, -f.r.x * side); scene.add(R.root);
    W.statues.push({ s, R, base: R.root.rotation.y });
  });

  [boxes, crowns, cones, bulbs, lanterns, glows, paws, clouds].forEach(b => scene.add(b.build()));
  W.bulbs = bulbs.im; W.glows = glows.im; W.glowMat = glowMat; W.lanternIm = lanterns.im; W.clouds = clouds.im; W.pawMat = pawMat; W.cloudMat = clouds.mat;
  W.counts = { boxes: boxes.m.length, crowns: crowns.m.length, cones: cones.m.length };
  return W;
}

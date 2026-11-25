/* Brightwater 3D: every creature is built in code from a handful of low-poly parts.
   Forward is +x, up is +y. Models are normalised to a target height afterwards. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { patch } from './fx.js';

const G = {
  ico: new THREE.IcosahedronGeometry(1, 1),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 6),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 7),
  tcyl: new THREE.CylinderGeometry(.6, 1, 1, 7),
  torus: new THREE.TorusGeometry(1, .16, 5, 12),
  disc: new THREE.CircleGeometry(1, 14),
  eye: new THREE.SphereGeometry(1, 8, 6)
};
export const GEO = G;
const MC = new Map();
export function mat(c, kind = 'lam') {
  const k = kind + c;
  if (MC.has(k)) return MC.get(k);
  let m;
  if (kind === 'glow') m = new THREE.MeshBasicMaterial({ color: c, fog: false });
  else if (kind === 'basic') m = new THREE.MeshBasicMaterial({ color: c });
  else if (kind === 'shade') m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .32, depthWrite: false });
  else m = new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  MC.set(k, m); return m;
}
const D2R = Math.PI / 180;
// add a part: geometry, colour, position, scale, rotation
function P(par, g, c, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], kind) {
  const m = new THREE.Mesh(G[g] || g, typeof c === 'string' ? mat(c, kind) : c);
  m.position.set(p[0], p[1], p[2]); m.scale.set(s[0], s[1], s[2]); m.rotation.set(r[0], r[1], r[2]);
  par.add(m); return m;
}
function grp(par, p = [0, 0, 0]) { const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); par.add(g); return g; }
// limb between two points (box)
function limb(par, a, b, w, c, g = 'box') {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const m = new THREE.Mesh(G[g], mat(c));
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.scale.set(w, L, w);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  par.add(m); return m;
}
const darker = (c, k = .6) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
const u = 1 / 20;

/* eyes: kind = dot | anime | slit | glow | void ; returns array of eye groups (for blinking) */
function eyes(par, a, cx, cy, cz, r, sep, look = [1, 0, 0]) {
  const out = [], kind = a.eye || 'dot';
  for (const s of [-1, 1]) {
    const e = grp(par, [cx, cy, cz + s * sep]);
    e.rotation.y = -s * .35;
    if (kind === 'anime') {
      P(e, 'eye', '#ffffff', [0, 0, 0], [r * .5, r * 1.15, r * 1.0], [0, 0, 0], 'basic');
      P(e, 'eye', a.iris || '#2a2a2a', [r * .32, -r * .08, 0], [r * .3, r * .9, r * .78], [0, 0, 0], 'basic');
      P(e, 'eye', '#111', [r * .45, -r * .1, 0], [r * .2, r * .5, r * .42], [0, 0, 0], 'basic');
      P(e, 'eye', '#ffffff', [r * .58, r * .3, -r * .2], [r * .1, r * .26, r * .22], [0, 0, 0], 'basic');
    } else if (kind === 'glow') {
      P(e, 'eye', a.glowc || '#ffd25a', [0, 0, 0], [r * .5, r * .75, r * .75], [0, 0, 0], 'glow');
    } else if (kind === 'void') {
      P(e, 'eye', '#000000', [0, 0, 0], [r * .5, r * 1.1, r * .9], [0, 0, 0], 'basic');
      P(e, 'eye', '#f3f0e6', [r * .3, 0, 0], [r * .1, r * .14, r * .14], [0, 0, 0], 'basic');
    } else if (kind === 'slit') {
      P(e, 'eye', a.iris || '#c9a23a', [0, 0, 0], [r * .5, r * .8, r * .8], [0, 0, 0], 'basic');
      P(e, 'box', '#111', [r * .42, 0, 0], [r * .1, r * 1.2, r * .18], [0, 0, 0], 'basic');
      P(e, 'eye', '#ffffff', [r * .44, r * .3, -r * .22], [r * .08, r * .14, r * .14], [0, 0, 0], 'basic');
    } else {
      P(e, 'eye', '#141210', [0, 0, 0], [r * .55, r * .75, r * .75], [0, 0, 0], 'basic');
      P(e, 'eye', '#ffffff', [r * .4, r * .28, -r * .2], [r * .12, r * .2, r * .2], [0, 0, 0], 'basic');
    }
    out.push(e);
  }
  return out;
}
function ears(par, a, x, y, hr, hc) {
  const t = a.ear; if (!t || t === 'none') return [];
  const out = [];
  for (const s of [-1, 1]) {
    let e;
    if (t === 'point' || t === 'cat') e = P(par, 'cone4', hc, [x, y + hr * .85, s * hr * .55], [hr * .38, hr * (t === 'cat' ? .7 : .6), hr * .3], [s * .25, 0, 0]);
    else if (t === 'round') e = P(par, 'ico0', hc, [x - hr * .1, y + hr * .8, s * hr * .6], [hr * .25, hr * .3, hr * .2]);
    else if (t === 'big') e = P(par, 'ico0', hc, [x - hr * .5, y + hr * .1, s * hr * 1.15], [hr * .35, hr * 1.25, hr * .9], [s * .3, 0, 0]);
    else if (t === 'fennec') e = P(par, 'cone4', hc, [x - hr * .1, y + hr * 1.3, s * hr * .65], [hr * .55, hr * 1.5, hr * .35], [s * .35, 0, 0]);
    else if (t === 'antenna') {
      e = P(par, 'cone4', hc, [x, y + hr * 1.2, s * hr * .5], [hr * .26, hr * 1.4, hr * .22], [s * .3, 0, 0]);
      P(par, 'cone4', '#1f2433', [x, y + hr * 1.75, s * hr * .67], [hr * .15, hr * .38, hr * .13], [s * .3, 0, 0]);
    } else if (t === 'leaf') e = P(par, 'cone4', hc, [x, y + hr * .95, s * hr * .45], [hr * .2, hr * .7, hr * .16], [s * .15, 0, 0]);
    if (e) out.push(e);
    if (a.earin && e && (t === 'point' || t === 'round')) P(par, 'cone4', a.earin, [x + hr * .06, y + hr * .85, s * hr * .55], [hr * .22, hr * .4, hr * .14], [s * .25, 0, 0]);
  }
  return out;
}
function horns(par, a, x, y, hr) {
  const t = a.horn; if (!t) return;
  const c = a.hornc || '#5b4630';
  if (t === 'oss') for (const s of [-1, 1]) { P(par, 'cyl', '#9a4f22', [x - hr * .2, y + hr * 1.1, s * hr * .35], [hr * .1, hr * .6, hr * .1]); P(par, 'ico0', '#3a2414', [x - hr * .2, y + hr * 1.45, s * hr * .35], [hr * .16, hr * .16, hr * .16]); }
  if (t === 'goat') for (const s of [-1, 1]) P(par, 'cone', '#d8ccb4', [x - hr * .4, y + hr * 1.1, s * hr * .45], [hr * .18, hr * 1.1, hr * .18], [0, 0, .9]);
  if (t === 'antler') for (const s of [-1, 1]) {
    const b = grp(par, [x - hr * .1, y + hr * .7, s * hr * .5]); b.rotation.x = s * .5;
    limb(b, [0, 0, 0], [-hr * .4, hr * 2.6, 0], hr * .14, c);
    for (let i = 1; i < 4; i++) limb(b, [-hr * .13 * i, hr * .65 * i, 0], [hr * .5 - hr * .1 * i, hr * (.65 * i + .9), 0], hr * .1, c);
  }
}
function tail(par, a, x, y, H, c) {
  const t = a.tail; if (!t) return null;
  const T = grp(par, [x, y, 0]);
  if (t === 'thin') { limb(T, [0, 0, 0], [-H * .5, -H * .9, 0], H * .08, c); P(T, 'ico0', a.tuft || darker(c, .5), [-H * .5, -H * .95, 0], [H * .12, H * .16, H * .12]); }
  else if (t === 'bush') { P(T, 'ico', a.tailc || c, [-H * .55, H * .05, 0], [H * .6, H * .28, H * .26], [0, 0, .35]); if (a.tailtip) P(T, 'ico0', a.tailtip, [-H * 1.05, H * .25, 0], [H * .2, H * .15, H * .15]); }
  else if (t === 'stub') P(T, 'ico0', c, [-H * .05, 0, 0], [H * .18, H * .14, H * .14]);
  else if (t === 'thick') { const s = P(T, 'cone', c, [-H * 1.2, -H * .2, 0], [H * .42, H * 2.4, H * .35], [0, 0, Math.PI / 2 + .12]); }
  else if (t === 'long') limb(T, [0, 0, 0], [-H * 1.1, H * .4, 0], H * .1, c);
  else if (t === 'ring') { for (let i = 0; i < 8; i++) { const f = i / 8; P(T, 'cyl', i % 2 ? '#f4efe6' : '#1f1c17', [-H * (.1 + f * 1.2), H * (f * f * 1.5), 0], [H * .1, H * .17, H * .1], [0, 0, .8 + f * .5]); } }
  else if (t === 'tails9') {
    // nine-tailed fox spirit with eight tails missing: one tail, eight bandaged stumps
    P(T, 'ico', c, [-H * .7, H * .5, 0], [H * .75, H * .3, H * .28], [0, 0, .8]);
    if (a.tailtip) P(T, 'ico0', a.tailtip, [-H * 1.15, H * 1.0, 0], [H * .22, H * .18, H * .18]);
    for (let i = 0; i < 8; i++) { const ang = (i / 7 - .5) * 1.6; P(T, 'cyl', '#efe6d2', [-H * .1, H * .12, Math.sin(ang) * H * .3], [H * .07, H * .22, H * .07], [ang, 0, .6]); }
  }
  return T;
}
function pattern(par, a, L, H, by) {
  if (!a.pat) return;
  const n = a.patn || 10;
  if (a.pat === 'spots' || a.pat === 'ros' || a.pat === 1) {
    for (let i = 0; i < n; i++) {
      const th = (i * 2.399) % (Math.PI * 2), ph = ((i * .618) % 1) * 1.9 - .95;
      const x = Math.sin(ph) * L * .45, yy = Math.cos(th) * .5 + .5;
      const y = by + H * .5 * (.25 + .7 * yy), z = Math.sin(th) * H * .5 * Math.cos(ph) * (1 - yy * .4);
      P(par, 'ico0', a.patc, [x, y, z], [H * .14 * (a.patb || 1), H * .1, H * .14 * (a.patb || 1)]);
    }
  } else if (a.pat === 'stripes') {
    for (let i = 0; i < n; i++) { const x = (i / (n - 1) - .5) * L * .85; P(par, 'box', a.patc, [x, by, 0], [L * .035, H * (1.02 - Math.abs(x / L) * .5), H * .93], [0, 0, .15]); }
  } else if (a.pat === 'windows') {
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) P(par, 'box', '#fbe7a6', [(i - 2) * L * .16, by + H * .12, s * H * .43], [L * .11, H * .32, H * .06]);
  }
}

function quad(root, a, R) {
  const c = a.c, L = (a.bw || 40) * u, H = (a.bh || 20) * u, legL = (a.leg || 20) * u, lw = (a.lw || 8) * u;
  const hr = (a.hr || 14) * u, hw = a.hw || 1;
  const by = legL + H * .45;
  const body = grp(root); R.bob = body;
  P(body, 'ico', c, [0, by, 0], [L / 2, H / 2, H / 2 * .9]);
  if (a.belly) P(body, 'ico', a.belly, [L * .05, by - H * .14, 0], [L * .4, H * .36, H * .4]);
  if (a.stripe) P(body, 'box', '#efe9dc', [L * .3, by, 0], [L * .05, H * .9, H * .92]);
  pattern(body, a, L, H, by);
  // legs
  // chest and haunches give the body a proper silhouette
  P(body, 'ico', c, [L * .27, by + H * .03, 0], [L * .27, H * .47, H * .42]);
  P(body, 'ico', c, [-L * .28, by + H * .01, 0], [L * .25, H * .46, H * .41]);
  const n = a.legs || 4, pairs = n / 2; R.legs = []; R.knees = [];
  const lc = a.legc || darker(c, .92), pc = a.paw === 'hoof' ? '#2a2420' : darker(c, .7);
  for (let i = 0; i < pairs; i++) for (const s of [-1, 1]) {
    const x = pairs === 1 ? 0 : (i / (pairs - 1) - .5) * L * .7, hind = x < 0 && pairs > 1;
    const LL = legL + H * .1, lg = grp(root, [x, LL, s * H * .28]);
    P(lg, 'ico', c, [hind ? -lw * .15 : lw * .1, -LL * .2, 0], [lw * (hind ? 1.05 : .85), LL * .33, lw * .72]);
    const kn = grp(lg, [0, -LL * .48, 0]);
    P(kn, 'box', lc, [0, -LL * .26, 0], [lw * .62, LL * .56, lw * .62]);
    if (a.paw === 'hoof') P(kn, 'box', pc, [0, -LL * .52 + lw * .2, 0], [lw * .78, lw * .42, lw * .78]);
    else P(kn, 'ico0', pc, [lw * .22, -LL * .52 + lw * .16, 0], [lw * .55, lw * .26, lw * .5]);
    R.legs.push(lg); R.knees.push(kn);
  }
  // neck + head
  const head = grp(root); R.head = head;
  let hx = L / 2 + hr * .55, hy = by + H * .25;
  if ((a.neck || 0) > 4) {
    const na = (a.na || 40) * D2R, nl = a.neck * u, nw = (a.nw || hr / u * .9) * u;
    const nx0 = L * .38, ny0 = by + H * .1;
    hx = nx0 + Math.cos(na) * nl; hy = ny0 + Math.sin(na) * nl;
    limb(root, [nx0, ny0, 0], [hx, hy, 0], nw, c);
    if (a.pat === 'spots') for (let i = 1; i < 5; i++) P(root, 'ico0', a.patc, [nx0 + Math.cos(na) * nl * i / 5 + nw * .2, ny0 + Math.sin(na) * nl * i / 5, (i % 2 ? 1 : -1) * nw * .42], [nw * .25, nw * .3, nw * .1]);
    if (a.mane === undefined && a.pat === 'stripes') for (let i = 0; i < 6; i++) P(root, 'box', '#1f1c17', [nx0 + Math.cos(na) * nl * i / 6 - nw * .25, ny0 + Math.sin(na) * nl * i / 6 + nw * .5, 0], [nw * .3, nw * .5, nw * .15], [0, 0, na]);
  }
  head.position.set(hx, hy, 0);
  if (a.mane) P(head, 'ico0', a.mane, [-hr * .2, 0, 0], [hr * 1.55, hr * 1.6, hr * 1.6]);
  P(head, 'ico', a.headc || c, [0, 0, 0], [hr * hw, hr * .92, hr * .9]);
  const sn = a.snout || 0;
  if (sn > 0) {
    const sl = hr * (.4 + sn * 1.1), sh = hr * (a.snh || .55);
    P(head, 'ico', a.snc || a.headc || c, [hr * .6 + sl * .45, -hr * .25, 0], [sl * .6, sh, hr * .55]);
    P(head, 'ico0', '#1d1915', [hr * .62 + sl * .95, -hr * .12, 0], [hr * .14, hr * .12, hr * .2]);
    if (a.teeth) for (let i = 0; i < 4; i++) for (const s of [-1, 1]) P(head, 'cone4', '#f5efe0', [hr * .8 + sl * (.25 + i * .18), -hr * .25 - sh * .7, s * hr * .4], [hr * .07, -hr * .22, hr * .07]);
    if (a.mask) P(head, 'ico0', a.mask, [hr * .5, hr * .1, 0], [hr * .45, hr * .4, hr * .85]);
  }
  if (a.trunk) {
    const tw = (a.trunkw || 10) * u; let p0 = [hr * .85, -hr * .1, 0];
    const segs = [[hr * 1.25, -hr * .9], [hr * 1.35, -hr * 1.9], [hr * 1.15, -hr * 2.6]];
    R.trunk = grp(head);
    segs.forEach((q, i) => { const p1 = [q[0], q[1], 0]; limb(R.trunk, p0, p1, tw * (1 - i * .2), a.headc || c); p0 = p1; });
    if (a.tusk) for (const s of [-1, 1]) P(head, 'cone', '#f3ead3', [hr * 1.15, -hr * .95, s * hr * .42], [hr * .12, hr * .9, hr * .12], [0, 0, -2.5]);
  }
  if (a.horn === 'rhino') { P(head, 'cone', '#9a9184', [hr * 1.65, hr * .35, 0], [hr * .3, hr * 1.1, hr * .3], [0, 0, -.35]); P(head, 'cone', '#9a9184', [hr * 1.1, hr * .5, 0], [hr * .2, hr * .5, hr * .2], [0, 0, -.2]); }
  horns(head, a, 0, 0, hr);
  R.ears = ears(head, a, -hr * .1, 0, hr, a.headc || c);
  R.eyes = eyes(head, a, hr * .66, hr * .18, 0, hr * (a.er ? Math.min(.34, a.er * 1.2) : .2), hr * .42);
  if (a.glasses) for (const s of [-1, 1]) P(head, 'torus', '#222', [hr * .9, hr * .2, s * hr * .42], [hr * .26, hr * .26, hr * .26], [0, Math.PI / 2, 0]);
  if (a.whisk) for (const s of [-1, 1]) for (let i = 0; i < 2; i++) P(head, 'box', '#2a2420', [hr * 1.1, -hr * .1 - i * hr * .12, s * hr * .6], [hr * .05, hr * .03, hr * .8], [0, s * .2, 0]);
  if (a.collar) P(root, 'torus', a.collar, [L * .42, by + H * .15, 0], [H * .45, H * .45, H * .45], [0, Math.PI / 2, .5]);
  if (a.key) P(root, 'box', '#d8b441', [L * .48, by - H * .3, 0], [H * .08, H * .25, H * .14]);
  if (a.spines) for (let i = 0; i < 9; i++) P(root, 'cone4', a.spinec, [(i / 8 - .5) * L * .9 + L * .1, by + H * .5, 0], [H * .1, H * (.35 + Math.sin(i / 8 * Math.PI) * .3), H * .1], [0, 0, -.3]);
  if (a.rider) { const rc = a.riderc || '#a8483a'; P(root, 'ico', rc, [L * .1, by + H * 1.15, 0], [H * .35, H * .7, H * .3]); P(root, 'ico', rc, [L * .14, by + H * 2.0, 0], [H * .27, H * .3, H * .27]); limb(root, [L * .1, by + H * 1.5, H * .3], [L * .3, by + H * .2, H * .45], H * .1, rc); P(root, 'eye', '#ffd25a', [L * .14 + H * .25, by + H * 2.05, H * .1], [H * .05, H * .05, H * .05], [0, 0, 0], 'glow'); }
  R.tail = tail(root, a, -L * .48, by + H * .15, H, c);
}

function upright(root, a, R) {
  const c = a.c, h = (a.h || 80) * u, hr = (a.hr || 14) * u, lh = (a.lh || 10) * u, bw = (a.bw || 16) * u, hh = a.hh || 1;
  const bodyH = Math.max(h - lh - hr * 2 * hh, bw * 1.4), by = lh + bodyH / 2;
  const body = grp(root); R.bob = body;
  R.legs = [];
  for (const s of [-1, 1]) { const lg = grp(root, [0, lh, s * bw * .45]); P(lg, 'box', c, [0, -lh / 2, 0], [bw * .45, lh + .02, bw * .45]); P(lg, 'ico0', darker(a.face || c, .75), [bw * .22, -lh + bw * .06, 0], [bw * .38, bw * .13, bw * .27]); R.legs.push(lg); }
  P(body, 'ico', c, [0, by, 0], [bw * .85, bodyH / 2, bw]);
  if (a.belly) P(body, 'ico', a.belly, [bw * .35, by - bodyH * .05, 0], [bw * .55, bodyH * .4, bw * .75]);
  if (a.apron) P(body, 'box', a.apron, [bw * .5, by - bodyH * .15, 0], [bw * .3, bodyH * .7, bw * 1.3]);
  if (a.shell) P(body, 'ico', a.shell, [-bw * .5, by, 0], [bw * .6, bodyH * .45, bw * .95]);
  if (a.wings) { R.wings = []; for (const s of [-1, 1]) { const w = grp(body, [-bw * .4, by + bodyH * .3, s * bw * .7]); P(w, 'cone4', a.wingc || darker(c), [0, -bodyH * .2, s * bw * 1.2], [bw * 1.3, bodyH * 1.1, bw * .12], [s * 1.25, 0, Math.PI]); R.wings.push(w); } }
  // arms
  const al = (a.arm || 24) * u, aw = (a.aw || 4) * u;
  R.arms = [];
  for (const s of [-1, 1]) {
    const ar = grp(body, [bw * .2, by + bodyH * .32, s * bw * .95]);
    limb(ar, [0, 0, 0], [al * .35, -al * .9, s * (a.armout || 0) * u], aw, c);
    if (a.claws) for (let i = -1; i < 2; i++) P(ar, 'cone4', '#e9e1cf', [al * .38, -al * .95 - aw, s * (a.armout || 0) * u + i * aw * .6], [aw * .25, -aw * 1.4, aw * .25]);
    R.arms.push(ar);
  }
  if (a.tail === 'long') { R.tail = grp(root, [-bw * .7, lh + bodyH * .2, 0]); limb(R.tail, [0, 0, 0], [-h * .35, -lh * .3 + h * .05, 0], bw * .22, c); }
  else if (a.tail === 'ring') R.tail = tail(root, a, -bw * .7, lh + bodyH * .25, bodyH * .9, c);
  const head = grp(root, [bw * .1, lh + bodyH + hr * hh * .8, 0]); R.head = head;
  const hc = a.skull || a.headc || c;
  P(head, 'ico', hc, [0, 0, 0], [hr * .95, hr * hh, hr]);
  if (a.disc) P(head, 'ico', a.disc, [hr * .45, -hr * .05, 0], [hr * .55, hr * .9 * hh, hr * .95]);
  if (a.face) P(head, 'ico', a.face, [hr * .42, -hr * .1, 0], [hr * .6, hr * .7, hr * .8]);
  if (a.mask) P(head, 'ico', a.mask, [hr * .5, hr * .1, 0], [hr * .4, hr * .4, hr * .9]);
  if (a.nose) P(head, 'ico0', '#1d1915', [hr * .98, -hr * .1, 0], [hr * .14, hr * .11, hr * .17]);
  if (a.beak) P(head, 'cone4', a.beak, [hr * 1.05, -hr * .2, 0], [hr * .2, hr * .5, hr * .2], [0, 0, -2.3]);
  if (a.plate) { P(head, 'cyl', '#d8d2c4', [0, hr * hh * .95, 0], [hr * .6, hr * .1, hr * .6]); P(head, 'cyl', '#5fa8c8', [0, hr * hh * 1.0, 0], [hr * .5, hr * .06, hr * .5]); }
  if (a.cap) { P(head, 'cyl', a.cap, [0, hr * hh * .9, 0], [hr * .95, hr * .4, hr * .95]); P(head, 'box', '#111', [hr * .65, hr * hh * .72, 0], [hr * .7, hr * .06, hr * 1.2]); }
  if (a.mouth) P(head, 'box', '#3a1a12', [hr * .92, -hr * .45, 0], [hr * .1, hr * .12, hr * .6]);
  if (a.grin) { P(head, 'box', '#1a0d0a', [hr * .92, -hr * .42, 0], [hr * .08, hr * .18, hr * 1.5 * a.grin]); for (let i = 0; i < 6; i++) P(head, 'box', '#f3ead3', [hr * .95, -hr * .36, (i / 5 - .5) * hr * 1.4 * a.grin], [hr * .06, hr * .08, hr * .09]); }
  R.ears = ears(head, a, -hr * .1, 0, hr, a.headc || c);
  horns(head, a, 0, 0, hr);
  R.eyes = eyes(head, a, hr * .78, hr * .15, 0, hr * Math.min(.42, (a.er || .2) * 1.1), hr * (a.ed || .36) * 1.05);
  R.walker = 1;
}

function blob(root, a, R) {
  const c = a.c, r = (a.r || 34) * u * .9, sq = a.squash || .95, w = a.wide || 1;
  const body = grp(root); R.bob = body;
  P(body, 'ico', c, [0, r * sq, 0], [r * w, r * sq, r * w]);
  if (a.belly) P(body, 'ico', a.belly, [r * .45, r * sq * .8, 0], [r * .6, r * sq * .7, r * .78 * w]);
  if (a.chev) for (let i = 0; i < 3; i++) P(body, 'cone4', darker(a.belly || c, .7), [r * 1.0 * w, r * (.7 + i * .2), 0], [r * .06, r * .12, r * .2], [0, 0, Math.PI / 2]);
  const head = grp(body, [0, r * sq * 1.05, 0]); R.head = head;
  R.ears = ears(head, a, -r * .15, r * .1, r * .75, c);
  R.eyes = eyes(head, a, r * .82 * w, r * .12, 0, r * (a.er || .22) * .95, r * (a.ed || .36) * 1.05);
  if (a.blush) for (const s of [-1, 1]) P(head, 'disc', a.blush, [r * .86 * w, -r * .12, s * r * .55], [r * .14, r * .1, 1], [0, Math.PI / 2 + s * .6, 0], 'basic');
  if (a.cheekc) for (const s of [-1, 1]) P(head, 'disc', a.cheekc, [r * .82 * w, -r * .22, s * r * .62], [r * .16, r * .16, 1], [0, Math.PI / 2 + s * .7, 0], 'basic');
  if (a.smile) P(head, 'box', '#3a2020', [r * .98 * w, -r * .25, 0], [r * .04, r * .05, r * .22]);
  if (a.grin) { P(head, 'box', '#2a1a14', [r * .97 * w, -r * .2, 0], [r * .05, r * .12, r * 1.2 * a.grin]); for (let i = 0; i < 7; i++) P(head, 'box', '#fff', [r * .99 * w, -r * .16, (i / 6 - .5) * r * 1.1 * a.grin], [r * .05, r * .07, r * .08]); }
  if (a.cap) P(head, 'cone', a.cap, [0, r * .95, 0], [r * .45, r * .4, r * .45]);
  if (a.ear === 'leaf') P(head, 'ico0', '#5b8a3a', [0, r * .85, 0], [r * .5, r * .08, r * .35]);
  if (a.gem) P(head, 'ico0', a.gem, [r * .7, r * .55, 0], [r * .1, r * .14, r * .1], [0, 0, 0], 'glow');
  if (a.ribbon) for (const s of [-1, 1]) P(head, 'box', a.ribbon, [-r * .3, r * .2, s * r * .95], [r * .1, r * .9, r * .1], [s * .3, 0, 0]);
  if (a.moon) P(head, 'torus', a.moonc, [r * .62, r * .45, 0], [r * .2, r * .2, r * .2], [0, Math.PI / 2, a.moon === 'down' ? Math.PI : 0], 'glow');
  if (a.whisk) for (const s of [-1, 1]) for (let i = 0; i < 2; i++) P(head, 'box', '#d8d2c4', [r * .95 * w, -r * .1 - i * r * .1, s * r * .7], [r * .03, r * .02, r * .6], [0, s * .3, 0]);
  if (a.cable) { limb(root, [r * 1.0, r * .75, 0], [r * 1.7, 0.02, r * .5], r * .05, '#1f1c17'); limb(root, [r * 1.7, .02, r * .5], [r * 2.6, .02, r * 1.4], r * .05, '#1f1c17'); }
  if (a.bigtail) { R.tail = grp(root, [-r * .9, r * .5, 0]); const tc = a.tailc || c; P(R.tail, 'box', tc, [-r * .2, r * .3, 0], [r * .15, r * .6, r * .12], [0, 0, .7]); P(R.tail, 'box', tc, [-r * .35, r * .8, 0], [r * .5, r * .15, r * .12], [0, 0, .3]); P(R.tail, 'box', tc, [-r * .5, r * 1.15, 0], [r * .2, r * .8, r * .14], [0, 0, .7]); }
  if (a.clipWings) { R.wings = []; for (const s of [-1, 1]) { const wg = grp(body, [-r * .45, r * 1.15, s * r * .6]); P(wg, 'cone4', a.wingc, [0, r * .2, s * r * .2], [r * .35, r * .35, r * .08], [s * .9, 0, 0]); P(wg, 'box', '#ffffff', [0, r * .02, s * r * .1], [r * .25, r * .06, r * .25]); R.wings.push(wg); } }
  // stubby feet
  R.legs = []; for (const s of [-1, 1]) { const lg = grp(root, [r * .4, r * .2, s * r * .45]); P(lg, 'ico0', darker(c, .85), [0, -r * .1, 0], [r * .3, r * .14, r * .22]); R.legs.push(lg); }
  if (a.ear === 'cat' || a.ear === 'antenna') { R.tail = R.tail || grp(root, [-r * .9, r * .4, 0]); if (!a.bigtail) limb(R.tail, [0, 0, 0], [-r * .5, r * .8, 0], r * .1, c); }
}

function bird(root, a, R) {
  const c = a.c, bw = (a.bw || 24) * u, bh = (a.bh || 26) * u, hr = (a.hr || 11) * u, legL = (a.leg || 16) * u;
  // perch branch
  limb(root, [-bw * 2, legL * .9, -bw], [bw * 2, legL * .9, bw], bw * .22, '#6b4a2b');
  const body = grp(root); R.bob = body;
  P(body, 'ico', c, [0, legL + bh * .5, 0], [bw * .55, bh * .62, bw * .55], [0, 0, -.35]);
  if (a.belly) P(body, 'ico', a.belly, [bw * .25, legL + bh * .55, 0], [bw * .35, bh * .42, bw * .45], [0, 0, -.35]);
  if (a.tailf) P(body, 'box', c, [-bw * .55, legL + bh * .1, 0], [bw * .5, bh * .12, bw * .35], [0, 0, .9]);
  const head = grp(root, [bw * .2, legL + bh * 1.05, 0]); R.head = head;
  P(head, 'ico', c, [0, 0, 0], [hr * 1.1, hr, hr]);
  if (a.cheek) P(head, 'ico', a.cheek, [hr * .35, -hr * .15, 0], [hr * .7, hr * .7, hr * 1.05]);
  if (a.beak === 'huge') { P(head, 'cone4', a.beakc, [hr * 2.3, -hr * .1, 0], [hr * .6, hr * 2.6, hr * .55], [0, 0, -Math.PI / 2 - .1]); P(head, 'box', '#1f1c17', [hr * 3.4, -hr * .2, 0], [hr * .3, hr * .3, hr * .35]); }
  R.eyes = eyes(head, { eye: 'dot' }, hr * .55, hr * .2, 0, hr * .28, hr * .55);
  for (const s of [-1, 1]) limb(root, [0, legL, s * bw * .2], [bw * .05, legL * .9, s * bw * .2], bw * .08, a.legc || '#555');
}
function flock(root, a, R) {
  const n = Math.min(a.n || 6, 6); R.flock = [];
  P(root, 'disc', '#7fc4d6', [0, .03, 0], [2.0, 2.0, 1], [-Math.PI / 2, 0, 0], 'basic');
  for (let i = 0; i < n; i++) {
    const ang = i * 2.4, rr = .3 + (i % 3) * .55;
    const f = grp(root, [Math.cos(ang) * rr, 0, Math.sin(ang) * rr]); f.rotation.y = ang * 1.7;
    const legL = 1.25, bw = .55, c = a.c;
    limb(f, [0, 0, 0], [0, legL, 0], .04, a.legc);
    if (i % 2) limb(f, [0, legL, .08], [.2, legL * .7, .08], .04, a.legc); else limb(f, [0, 0, .1], [0, legL, .08], .04, a.legc);
    const b = grp(f); P(b, 'ico', c, [0, legL + .15, 0], [bw * .6, bw * .38, bw * .38], [0, 0, .1]);
    P(b, 'box', darker(c, .55), [-bw * .45, legL + .2, 0], [bw * .35, bw * .1, bw * .3], [0, 0, .4]);
    const nk = grp(b, [bw * .4, legL + .25, 0]);
    limb(nk, [0, 0, 0], [.15, .35, 0], .07, c); limb(nk, [.15, .35, 0], [0, .65, 0], .07, c);
    P(nk, 'ico', c, [.05, .72, 0], [.1, .09, .09]);
    P(nk, 'cone4', a.beakc, [.2, .66, 0], [.04, .18, .04], [0, 0, -2.2]);
    P(nk, 'cone4', '#1f1c17', [.27, .6, 0], [.03, .07, .03], [0, 0, -2.8]);
    R.flock.push(nk);
  }
}
function frog(root, a, R) {
  const c = a.c, r = .5;
  P(root, 'ico0', '#6b6a5e', [0, .25, 0], [1.1, .3, .9]);
  const body = grp(root, [0, .5, 0]); R.bob = body;
  P(body, 'ico', c, [0, r * .5, 0], [r * 1.1, r * .6, r * .9]);
  for (let i = 0; i < 7; i++) P(body, 'ico0', '#141414', [(i % 3 - 1) * r * .5, r * .95, ((i * 7) % 5 - 2) * r * .18], [r * .14, r * .08, r * .14]);
  P(body, 'ico', '#f2d33a', [-r * .1, r * .72, 0], [r * .7, r * .2, r * .5]);
  const head = grp(body, [r * .6, r * .7, 0]); R.head = head;
  R.eyes = eyes(head, { eye: 'dot' }, r * .1, r * .15, 0, r * .3, r * .35);
  for (const s of [-1, 1]) { P(body, 'ico', c, [-r * .55, r * .2, s * r * .7], [r * .45, r * .25, r * .25]); P(body, 'ico0', '#1c1c1c', [r * .7, 0, s * r * .55], [r * .2, r * .1, r * .14]); }
}
function sloth(root, a, R) {
  const c = a.c;
  limb(root, [-1.8, 2.4, 0], [1.8, 2.5, 0], .14, '#6b4a2b');
  const body = grp(root, [0, 2.45, 0]); R.bob = body;
  P(body, 'ico', c, [0, -.55, 0], [.75, .42, .45]);
  for (const x of [-.45, .45]) for (const s of [-1, 1]) limb(body, [x, -.5, s * .3], [x * 1.25, 0, s * .1], .12, c);
  const head = grp(body, [.75, -.5, 0]); R.head = head;
  P(head, 'ico', c, [0, 0, 0], [.32, .3, .3]);
  P(head, 'ico', '#e6d6b8', [.17, -.05, 0], [.18, .2, .26]);
  for (const s of [-1, 1]) P(head, 'box', '#4a3424', [.27, .02, s * .1], [.04, .07, .14]);
  R.eyes = eyes(head, { eye: 'dot' }, .32, .02, 0, .07, .1);
  P(head, 'ico0', '#2a1c14', [.36, -.08, 0], [.04, .03, .05]);
}
function bat(root, a, R) {
  const c = a.c;
  limb(root, [-1.6, 2.6, 0], [1.6, 2.6, 0], .08, '#3a3634');
  const body = grp(root, [0, 2.55, 0]); R.bob = body;
  for (const s of [-1, 1]) limb(body, [0, 0, s * .1], [0, -.3, s * .12], .04, '#3a2c28');
  P(body, 'ico', c, [0, -.65, 0], [.26, .42, .26]);
  R.wings = [];
  for (const s of [-1, 1]) { const w = grp(body, [0, -.4, s * .15]); P(w, 'cone4', '#3e322e', [0, -.25, s * .3], [.28, .7, .05], [s * 1.0, 0, Math.PI]); R.wings.push(w); }
  const head = grp(body, [0, -1.12, 0]); R.head = head;
  P(head, 'ico', c, [0, 0, 0], [.18, .17, .17]);
  for (const s of [-1, 1]) P(head, 'cone4', c, [0, -.18, s * .1], [.07, -.2, .05]);
  R.eyes = eyes(head, { eye: 'dot' }, .15, .04, 0, .05, .07);
  P(head, 'cone4', '#f3ead3', [.15, .1, .03], [.02, .06, .02]); P(head, 'cone4', '#f3ead3', [.15, .1, -.03], [.02, .06, .02]);
}
function serpent(root, a, R) {
  const c = a.c, n = 26; R.segs = [];
  const sp = grp(root); R.bob = sp;
  for (let i = 0; i < n; i++) {
    const t = i / n, ang = t * Math.PI * 3.6, rad = 1.1 - t * .6;
    const s = P(sp, 'ico0', (a.pat && i % 3 === 0) ? a.patc : c, [Math.cos(ang) * rad, .17 + t * .9 * (t > .8 ? 1 : 0) + .02 * i * (t > .75), Math.sin(ang) * rad], [.24 - t * .06, .18, .24 - t * .06]);
    R.segs.push(s);
  }
  R.segY = R.segs.map(m => m.position.y);
  const last = R.segs[n - 1].position;
  const head = grp(root, [last.x, last.y + .35, last.z]); R.head = head;
  limb(root, [last.x, last.y, last.z], [last.x, last.y + .35, last.z], .14, c);
  P(head, 'ico', c, [.1, 0, 0], [.3, .14, .2]);
  R.eyes = eyes(head, a, .2, .07, 0, .07, .1);
  if (a.tongue) R.tongue = P(head, 'box', '#c8402f', [.45, -.04, 0], [.2, .015, .04]);
}
function fish(root, a, R) {
  const c = a.c, L = (a.bw || 50) * u * .9, H = (a.bh || 20) * u * .9;
  const body = grp(root, [0, 1.4, 0]); R.bob = body;
  P(body, 'ico', c, [0, 0, 0], [L / 2, H / 2, H / 2 * (a.shark ? .8 : 1)]);
  if (a.belly) P(body, 'ico', a.belly, [L * .05, -H * .14, 0], [L * .42, H * .34, H * .37]);
  R.tail = grp(body, [-L * .45, 0, 0]);
  P(R.tail, 'cone4', c, [-H * .4, H * .3, 0], [H * .25, H * .9, H * .06], [0, 0, .7]);
  P(R.tail, 'cone4', c, [-H * .4, -H * .25, 0], [H * .2, H * .7, H * .06], [0, 0, 2.4]);
  if (a.shark) {
    P(body, 'cone4', c, [0, H * .65, 0], [H * .35, H * .8, H * .06], [0, 0, .25]);
    for (const s of [-1, 1]) P(body, 'cone4', c, [L * .1, -H * .3, s * H * .35], [H * .2, H * .6, H * .06], [s * 1.1, 0, 1.5]);
    for (let i = 0; i < 3; i++) P(body, 'box', darker(c, .7), [L * .28 + i * H * .12, 0, H * .37], [H * .03, H * .35, H * .02]);
  }
  const head = grp(body, [L * .32, 0, 0]); R.head = head;
  if (a.teeth) { P(head, 'box', '#1a1014', [L * .12, -H * .15, 0], [H * .25, H * .1, H * .6]); for (let i = 0; i < 6; i++) P(head, 'cone4', '#f3ead3', [L * .14, -H * .08, (i / 5 - .5) * H * .55], [H * .04, -H * .16, H * .04]); }
  R.eyes = eyes(head, a, L * .08, H * .15, 0, H * .12, H * .3);
  if (a.lure) { limb(head, [0, H * .45, 0], [L * .3, H * .95, 0], H * .03, '#2a2024'); R.lure = P(head, 'eye', '#d8ff9a', [L * .32, H * .95, 0], [H * .1, H * .1, H * .1], [0, 0, 0], 'glow'); }
}
function octo(root, a, R) {
  const c = a.c, r = (a.r || 28) * u * .9, L = (a.len || 50) * u * .9;
  const body = grp(root, [0, L * .4, 0]); R.bob = body;
  P(body, 'ico', c, [-r * .3, r * .9, 0], [r * 1.0, r * 1.25, r * .95], [0, 0, .4]);
  R.tents = [];
  for (let i = 0; i < 8; i++) {
    const ang = i / 8 * Math.PI * 2, t = grp(body, [Math.cos(ang) * r * .5, 0, Math.sin(ang) * r * .5]);
    t.rotation.y = -ang;
    let p0 = [0, 0, 0];
    for (let k = 1; k <= 3; k++) { const p1 = [k * L * .22, -L * .14 * k + (k === 3 ? L * .12 : 0), 0]; limb(t, p0, p1, r * (.28 - k * .06), c); p0 = p1; }
    R.tents.push(t);
  }
  const head = grp(body, [r * .55, r * .5, 0]); R.head = head;
  if (a.eyesN) { R.eyes = []; for (let i = 0; i < a.eyesN; i++) { const e = grp(body, [r * .7, r * (.2 + (i % 4) * .35), ((i * 5) % 7 - 3) * r * .25]); P(e, 'eye', a.glowc, [0, 0, 0], [r * .08, r * .12, r * .12], [0, 0, 0], 'glow'); R.eyes.push(e); } }
  else R.eyes = eyes(head, a, r * .2, 0, 0, r * .22, r * .45);
}
function kaiju(root, a, R) {
  const c = a.c;
  const body = grp(root); R.bob = body;
  P(body, 'ico', c, [0, 2.0, 0], [.9, 1.3, .8], [0, 0, -.3]);
  P(body, 'ico', '#a9b98a', [.4, 1.8, 0], [.5, 1.0, .6], [0, 0, -.3]);
  R.legs = [];
  for (const s of [-1, 1]) { const lg = grp(root, [0, 1.1, s * .5]); P(lg, 'box', c, [0, -.55, 0], [.45, 1.1, .45]); P(lg, 'box', darker(c, .7), [.15, -1.05, 0], [.7, .14, .5]); R.legs.push(lg); }
  R.tail = grp(root, [-.7, 1.2, 0]); P(R.tail, 'cone', c, [-1.2, -.4, 0], [.5, 2.6, .45], [0, 0, Math.PI / 2 + .35]);
  for (let i = 0; i < 6; i++) P(body, 'cone4', a.plate, [-.65 + i * .05 - (i > 3 ? (i - 3) * .3 : 0), 3.1 - i * .3, 0], [.22, .55, .08], [0, 0, .5]);
  R.arms = []; for (const s of [-1, 1]) { const ar = grp(body, [.6, 2.5, s * .65]); limb(ar, [0, 0, 0], [.4, -.4, 0], .14, c); R.arms.push(ar); }
  const head = grp(root, [.75, 3.35, 0]); R.head = head;
  P(head, 'ico', c, [0, 0, 0], [.55, .45, .45]);
  P(head, 'ico', c, [.45, -.15, 0], [.35, .2, .3]);
  for (let i = 0; i < 5; i++) P(head, 'cone4', '#f3ead3', [.7, -.33, (i / 4 - .5) * .4], [.03, -.1, .03]);
  R.eyes = eyes(head, a, .4, .15, 0, .13, .2);
}
function mirror(root, a, R) {
  // you: a visitor with a phone, lit by its screen
  const body = grp(root); R.bob = body;
  for (const s of [-1, 1]) P(root, 'box', '#2f3a52', [0, .45, s * .14], [.17, .9, .17]);
  P(body, 'box', '#c8402f', [0, 1.25, 0], [.32, .75, .5]);
  P(body, 'box', '#3a2a1e', [-.22, 1.3, 0], [.15, .5, .38]);
  for (const s of [-1, 1]) limb(body, [0, 1.55, s * .3], [.35, 1.2, s * .12], .1, '#c8402f');
  P(body, 'box', '#111', [.42, 1.25, 0], [.04, .22, .12]);
  R.screen = P(body, 'box', '#bfe6ff', [.44, 1.25, 0], [.01, .2, .1], [0, 0, 0], 'glow');
  const head = grp(root, [0, 1.82, 0]); R.head = head;
  P(head, 'ico', '#d9b08c', [0, 0, 0], [.17, .2, .17]);
  P(head, 'ico0', '#2a1c14', [-.04, .1, 0], [.18, .13, .18]);
  R.eyes = eyes(head, { eye: 'dot' }, .15, .02, 0, .035, .06);
}

const PLANS = { quad, upright, blob, bird, flock, frog, sloth, bat, serpent, fish, octo, kaiju, mirror };
// target heights (world units) by exhibit name; default by plan
const SIZE = {
  'Lesser Flamingo': 1.9, 'Reticulated Giraffe': 3.1, 'Plains Zebra': 1.8, 'African Lion': 1.55, 'African Bush Elephant': 2.7, 'Meerkat': .95,
  'Common Hippopotamus': 1.45, 'Southern White Rhino': 1.6, 'Red Panda': 1.0, 'Ring-tailed Lemur': 1.2, 'Toco Toucan': 1.5, 'Dyeing Poison Frog': .95,
  'Linnaeus\u2019s Two-toed Sloth': 2.7, 'Bornean Orangutan': 1.7, 'Jaguar': 1.35, 'Pikachew': 1.5, 'Catbust': 1.7, 'Totoroar': 2.5, 'Kuramuffin': 1.5,
  'Jiji-ish': 1.25, 'Kyubey-gone': 1.3, 'Ein-stein': 1.25, 'Happy-ish': 1.4, 'Luna-tic': 1.35, 'Gon-zilla': 4.0, 'Fennec Fox': .95, 'Aye-aye': 1.05,
  'Bengal Slow Loris': .95, 'Barn Owl': 1.1, 'Common Vampire Bat': 2.7, 'Philippine Tarsier': .95, 'Tasmanian Devil': .85, 'Komodo Dragon': .85,
  'Nile Crocodile': .7, 'Reticulated Python': 1.0, 'Great White Shark': 1.6, 'Giant Pacific Octopus': 1.7, 'Humpback Anglerfish': 1.4,
  'Japanese Giant Salamander': .6, 'Kappa': 1.55, 'The Jersey Devil': 1.95, 'Mothman': 2.5, 'Chupacabra': 1.25, 'The Hollow Stag': 3.0,
  'Baku, the Dream-Eater': 1.7, 'Nuckelavee': 2.2, 'The Kraken': 2.7, 'The Long Keeper': 3.3, 'Pip': 1.45, 'Visitor': 1.75
};
const _box = new THREE.Box3(), _v = new THREE.Vector3();
export function buildModel(e, maxW = 3.7) {
  const a = e.a, root = new THREE.Group(), R = { root };
  const inner = new THREE.Group(); root.add(inner);
  (PLANS[a.plan] || quad)(inner, a, R);
  // Spirit Grove residents are chibi: big heads, big eyes
  if (e.t === 'anime' && R.head && (a.plan === 'quad' || a.plan === 'upright')) R.head.scale.multiplyScalar(1.32);
  inner.updateMatrixWorld(true);
  _box.setFromObject(inner);
  const h = _box.max.y - Math.min(0, _box.min.y), w = Math.max(_box.max.x - _box.min.x, _box.max.z - _box.min.z);
  let s = (SIZE[e.n] || 1.4) / Math.max(h, .01);
  if (w * s > maxW) s = maxW / w;
  inner.scale.setScalar(s);
  // centre on x/z
  _box.getCenter(_v); inner.position.set(-_v.x * s, -Math.min(0, _box.min.y) * s, -_v.z * s);
  if (R.bob) R.bobY = R.bob.position.y;
  R.scale = s; R.h = h * s; R.w = w * s; R.plan = a.plan;
  // blob shadow
  const sh = new THREE.Mesh(G.disc, mat('#000000', 'shade')); sh.rotation.x = -Math.PI / 2; sh.position.y = .02; sh.scale.set(Math.min(1.8, w * s * .45), Math.min(1.4, w * s * .35), 1); root.add(sh);
  R.phase = Math.random() * 10; R.gait = 0;
  if (R.ears) R.earRot = R.ears.map(m => m.rotation.x);
  bake(root, R);
  return R;
}

/* merge every group's static parts into one vertex-coloured mesh per material kind: ~10 draw calls per animal */
const VC = {};
function vcMat(k) {
  if (VC[k]) return VC[k];
  VC[k] = k === 'lam' ? patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { aoMin: .62, aoH: .9 })
    : k === 'glow' ? new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }) : new THREE.MeshBasicMaterial({ vertexColors: true });
  return VC[k];
}
const kindOf = m => m.transparent ? null : m.type === 'MeshLambertMaterial' && !m.vertexColors ? 'lam' : m.type === 'MeshBasicMaterial' && !m.vertexColors ? (m.fog === false ? 'glow' : 'basic') : null;
function bake(root, R) {
  const keep = new Set();
  for (const v of Object.values(R)) { if (v && v.isMesh) keep.add(v); else if (Array.isArray(v)) v.forEach(o => o && o.isMesh && keep.add(o)); }
  const nodes = []; root.traverse(n => { if (!n.isMesh) nodes.push(n); });
  for (const n of nodes) {
    const by = {};
    for (const ch of n.children) if (ch.isMesh && !keep.has(ch)) { const k = kindOf(ch.material); if (k) (by[k] = by[k] || []).push(ch); }
    for (const k in by) {
      const list = by[k]; if (list.length < 2) continue;
      const geos = list.map(m => {
        m.updateMatrix(); const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
        for (const at of Object.keys(g.attributes)) if (at !== 'position' && at !== 'normal') g.deleteAttribute(at);
        g.applyMatrix4(m.matrix); const c = m.material.color, n3 = g.attributes.position.count, col = new Float32Array(n3 * 3);
        for (let i = 0; i < n3; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
      });
      const mg = mergeGeometries(geos); if (!mg) continue;
      const mesh = new THREE.Mesh(mg, vcMat(k)); n.add(mesh); list.forEach(m => n.remove(m));
    }
  }
}

/* animation. k = excitement 0..1 (just tapped), lookYaw/lookP = where the head turns, w = walking 0..1 (R.gait advances outside) */
export function animate(R, t, k = 0, lookYaw = 0, w = 0, lookP = 0) {
  const p = t + R.phase, g = R.gait || 0;
  if (R.bob) {
    R.bob.position.y = (R.bobY || 0) + Math.sin(p * 2.1) * .015 / R.scale + w * Math.abs(Math.sin(g)) * .05 / R.scale + k * Math.abs(Math.sin(p * 14)) * .2 / R.scale;
    const br = Math.sin(p * 1.75); R.bob.scale.set(1, 1 + br * .01, 1 + br * .03); // breathing
    R.bob.rotation.x = w * Math.sin(g) * .04;
  }
  if (R.head) {
    R.head.rotation.y += ((lookYaw + (1 - w) * Math.sin(p * .7) * .22) - R.head.rotation.y) * .07;
    if (R.plan !== 'flock') R.head.rotation.z = Math.sin(p * 1.3) * .05 + lookP * .5 + w * Math.sin(g * 2) * .05 + k * Math.sin(p * 20) * .15 + (R.chew || 0) * Math.sin(p * 14) * .12;
  }
  if (R.tail) { R.tail.rotation.y = Math.sin(p * (2.4 + k * 10 + w * 3)) * (.35 + k * .3); R.tail.rotation.z = Math.sin(p * 1.1) * .12; }
  if (R.eyes) { const q = p % 4.3, bl = q < .12 || (R.phase > 5 && q > .3 && q < .4) ? .1 : 1; for (const e of R.eyes) e.scale.y = bl; }
  if (R.ears) R.ears.forEach((m, i) => { const tw = ((p * .37 + i * .13) % 5) < .12 ? .35 : 0; m.rotation.x = R.earRot[i] + (i ? -tw : tw) + k * Math.sin(p * 25) * .15 + (i % 2 ? 1 : -1) * (R.earsBack || 0) * .7; });
  if (R.wings) { const f = Math.sin(p * (R.plan === 'bat' ? 1.5 : 2) + (k ? p * 18 : 0)) * (.15 + k * .5); R.wings[0].rotation.x = f; R.wings[1].rotation.x = -f; }
  if (R.legs) {
    const n = R.legs.length;
    R.legs.forEach((l, i) => {
      const off = n <= 2 ? (i % 2) * Math.PI : ((((i >> 1) + (i & 1)) % 2) * Math.PI), sw = Math.sin(g + off);
      l.rotation.z = sw * .5 * w + (k > 0 ? Math.sin(p * 16 + i * 2) * .3 * k : 0);
      if (R.knees && R.knees[i]) R.knees[i].rotation.z = -Math.max(0, Math.sin(g + off + 1.3)) * .75 * w;
    });
  }
  if (R.tents) R.tents.forEach((tt, i) => tt.rotation.z = Math.sin(p * 1.4 + i) * .25);
  if (R.flock) R.flock.forEach((n, i) => n.rotation.z = Math.sin(p * .8 + i * 1.7) * .25 - (i % 3 === 0 ? (Math.sin(p * .3 + i) > .6 ? .9 : 0) : 0));
  if (R.trunk) R.trunk.rotation.z = Math.sin(p * 1.1) * .25;
  if (R.lure) R.lure.scale.setScalar(.1 * (1 + .3 * Math.sin(p * 4)));
  if (R.tongue) R.tongue.visible = (p % 2) < .3;
  if (R.arms) R.arms.forEach((a, i) => a.rotation.z = Math.sin(p * 1.2 + i * 3) * .1 - w * Math.sin(g + i * Math.PI) * .45 + k * Math.sin(p * 15 + i) * .5);
  if (R.segs) R.segs.forEach((sg, i) => sg.position.y = R.segY[i] + Math.max(0, Math.sin(p * 1.6 - i * .5)) * .03);
}

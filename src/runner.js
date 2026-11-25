/* The run home: a 3-lane endless runner down the same avenue, at night, with the residents behind you. */
import * as THREE from 'three';
import { buildModel, animate, GEO, mat } from './models.js';
const $ = s => document.querySelector(s);
const E = window.EXHIBITS;
const LANE = 1.7;
export class Runner {
  constructor(o) {
    Object.assign(this, o);
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color('#0b100d'); sc.fog = new THREE.Fog('#0b100d', 8, 48);
    this.cam = new THREE.PerspectiveCamera(64, 1, .1, 120); sc.add(this.cam);
    sc.add(new THREE.HemisphereLight('#7f9a8a', '#0a0a08', 1.0));
    const key = new THREE.DirectionalLight('#c9d8ff', .7); key.position.set(-3, 8, 4); sc.add(key);
    this.torch = new THREE.SpotLight('#fff0d0', 40, 40, .55, .6, 1.0); this.cam.add(this.torch); this.cam.add(this.torch.target); this.torch.target.position.set(0, -2, -12);
    // treadmill scenery: repeats every P metres
    const P = this.P = 24; const tread = this.tread = new THREE.Group(); sc.add(tread);
    const lam = new THREE.MeshLambertMaterial({ flatShading: true }), boxes = [], cols = [];
    const add = (x, y, z, sx, sy, sz, c, ry = 0) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)); boxes.push(m); cols.push(new THREE.Color(c)); };
    for (let rep = -1; rep < 4; rep++) {
      const z0 = -rep * P;
      for (let k = 0; k < 6; k++) add(0, -.05, z0 - k * 4 - 2, 5.6, .1, 3.9, k % 2 ? '#7a7466' : '#857f70');
      for (const sd of [-1, 1]) {
        add(sd * 2.95, .08, z0 - P / 2, .3, .16, P, '#5a564c');
        add(sd * 10, -.06, z0 - P / 2, 14, .1, P, '#26302a');
        // cages along the side, doors hanging open
        add(sd * 6, 1.6, z0 - 6, .15, 3.2, 4, '#4a4a44'); add(sd * 7.8, 1.6, z0 - 6, .15, 3.2, 4, '#4a4a44'); add(sd * 6.9, 3.2, z0 - 6, 2, .15, 4.1, '#2a2a26');
        for (let b = 0; b < 6; b++) add(sd * (6 + (b % 2) * 0), 1.6, z0 - 4.2 - b * .7, .06, 3.1, .06, '#6b4a3a');
        add(sd * 4.6, 1.6, z0 - 4.6, .06, 3.0, 1.4, '#6b4a3a', sd * .9);
        // lamp post
        add(sd * 3.4, 1.6, z0 - 16, .12, 3.2, .12, '#1f2420');
        // dead trees
        add(sd * (11 + (rep & 1) * 3), 2, z0 - 12, .3, 4, .3, '#2a2420'); add(sd * (11 + (rep & 1) * 3) + .5, 3, z0 - 12, .12, 1.6, .12, '#2a2420', .8);
      }
    }
    const im = new THREE.InstancedMesh(GEO.box, lam, boxes.length); boxes.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, cols[i]); }); im.frustumCulled = false; tread.add(im);
    const bulb = new THREE.InstancedMesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe7a0' }), 10); let bi = 0;
    for (let rep = -1; rep < 4; rep++) for (const sd of [-1, 1]) bulb.setMatrixAt(bi++, new THREE.Matrix4().makeTranslation(sd * 3.2, 3.15, -rep * P - 16));
    bulb.frustumCulled = false; tread.add(bulb);
    // eyes in the dark either side
    const eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 6, 4), new THREE.MeshBasicMaterial({ color: '#f3d36b', fog: false }), 24);
    for (let i = 0; i < 12; i++) { const x = (i % 2 ? 1 : -1) * (9 + Math.random() * 6), y = .5 + Math.random() * 2, z = -Math.random() * P * 4; eyes.setMatrixAt(i * 2, new THREE.Matrix4().makeTranslation(x - .12, y, z)); eyes.setMatrixAt(i * 2 + 1, new THREE.Matrix4().makeTranslation(x + .12, y, z)); }
    eyes.frustumCulled = false; tread.add(eyes);
    // the player: a visitor in a red jacket, seen from behind
    const pl = this.pl = new THREE.Group(); sc.add(pl);
    const part = (g, c, p, s) => { const m = new THREE.Mesh(GEO[g], mat(c)); m.position.set(...p); m.scale.set(...s); return m; };
    this.body = new THREE.Group(); pl.add(this.body);
    this.body.add(part('box', '#c8402f', [0, 1.05, 0], [.5, .62, .3]), part('box', '#3a2a1e', [0, 1.1, .2], [.38, .45, .16]), part('ico', '#d9b08c', [0, 1.55, 0], [.17, .2, .17]), part('ico0', '#2a1c14', [0, 1.65, .02], [.18, .12, .18]));
    this.legs = [-1, 1].map(sd => { const g = new THREE.Group(); g.position.set(sd * .13, .75, 0); g.add(part('box', '#2f3a52', [0, -.37, 0], [.16, .75, .16])); this.body.add(g); return g; });
    this.arms = [-1, 1].map(sd => { const g = new THREE.Group(); g.position.set(sd * .32, 1.3, 0); g.add(part('box', '#c8402f', [0, -.28, 0], [.12, .56, .12])); this.body.add(g); return g; });
    // chasers
    const pick = n => E.find(e => e.n === n);
    this.chasers = [['Pip', -.5, .85], ['The Long Keeper', -1.75, 1.05], ['Chupacabra', 1.15, .95], ['Kuramuffin', .55, 1.25]].map(([n, lx, lag]) => {
      const R = buildModel(pick(n)); R.root.rotation.y = -Math.PI / 2; R.root.scale.setScalar(n === 'The Long Keeper' ? .8 : .7); sc.add(R.root); return { R, n, lx, lag };
    });
    // obstacles
    this.obs = []; this.pool = {};
    this.mk = {
      low: () => { const g = new THREE.Group(); g.add(part('box', '#e8c23a', [0, .5, 0], [1.5, .14, .12]), part('box', '#1f1c17', [0, .28, 0], [1.5, .1, .1]), part('box', '#1f1c17', [-.68, .3, 0], [.1, .6, .12]), part('box', '#1f1c17', [.68, .3, 0], [.1, .6, .12])); return g; },
      high: () => { const g = new THREE.Group(); g.add(part('box', '#fbf5e6', [0, 1.55, 0], [1.6, .55, .08]), part('box', '#8f2a22', [0, 1.8, 0], [1.6, .1, .09]), part('box', '#2b3a34', [-.75, 1.0, 0], [.08, 2.0, .08]), part('box', '#2b3a34', [.75, 1.0, 0], [.08, 2.0, .08])); return g; },
      block: () => { const g = new THREE.Group(); g.add(part('box', '#7a5032', [0, .55, 0], [1.3, 1.1, 1.1]), part('box', '#6b4a2b', [.1, 1.45, 0], [1.0, .7, .9]), part('box', '#3a2a1e', [0, .55, .56], [1.32, .1, .02])); return g; },
      pellet: () => { const m = new THREE.Mesh(GEO.ico0, mat('#ffd25a', 'glow')); m.scale.setScalar(.16); const g = new THREE.Group(); g.add(m); g.children[0].position.y = .8; return g; }
    };
    this.bindInput();
  }
  get(kind) { const p = (this.pool[kind] = this.pool[kind] || []); const g = p.pop() || this.mk[kind](); g.visible = true; this.scene.add(g); return g; }
  put(o) { o.g.visible = false; this.scene.remove(o.g); this.pool[o.kind].push(o.g); }
  start() {
    $('#game').classList.add('on'); $('#over').hidden = true; $('#howto').classList.remove('gone');
    this.obs.forEach(o => this.put(o)); this.obs = [];
    Object.assign(this, { dist: 0, speed: 9, lane: 0, x: 0, y: 0, vy: 0, slide: 0, gap: 2.6, stumbleT: -99, t: 0, pellets: 0, nextSpawn: 26, alive: true, paused: false, caughtT: -1, by: 'Pip' });
    this.best = +(this.LS.get('bw3.best') || 0);
    $('#hudB').textContent = this.best;
    this.SFX.run.chaseOn && this.SFX.run.chaseOn();
    this.resize(); window.__bw3.run = this;
  }
  resize() { const w = innerWidth, h = innerHeight; this.cam.aspect = w / h; this.cam.fov = w / h < .8 ? 72 : 60; this.cam.updateProjectionMatrix(); this.renderer.setSize(w, h, false); }
  pause() { if (!this.alive) return; this.paused = true; $('#resume').hidden = false; }
  resume() { this.paused = false; $('#resume').hidden = true; }
  bindInput() {
    const g = $('#game'); let s = null;
    const act = a => { if (!this.alive) return; if (this.paused) return this.resume(); $('#howto').classList.add('gone');
      if (a === 'L' && this.lane > -1) { this.lane--; this.SFX.run.lane(-.5); this.sideCheck(); }
      if (a === 'R' && this.lane < 1) { this.lane++; this.SFX.run.lane(.5); this.sideCheck(); }
      if (a === 'U' && this.y <= .001) { this.vy = 8.4; this.slide = 0; this.SFX.run.jump(); }
      if (a === 'D') { this.slide = .75; if (this.y > 0) this.vy = -14; this.SFX.run.slide(); } };
    this.act = act;
    g.addEventListener('touchstart', e => { const t = e.changedTouches[0]; s = { x: t.clientX, y: t.clientY, done: 0 }; if (e.target.closest('button,a')) return; e.preventDefault(); }, { passive: false });
    g.addEventListener('touchmove', e => { if (!s || s.done) return; const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y; if (Math.hypot(dx, dy) > 28) { s.done = 1; act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D')); } e.preventDefault(); }, { passive: false });
    g.addEventListener('touchend', e => { if (s && !s.done && this.paused) this.resume(); s = null; });
    addEventListener('keydown', e => { if (!$('#game').classList.contains('on')) return; const k = e.key; const m = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'U', w: 'U', W: 'U', ' ': 'U', ArrowDown: 'D', s: 'D', S: 'D' }[k]; if (m) { e.preventDefault(); act(m); } });
    let md = null; g.addEventListener('mousedown', e => { if (e.target.closest('button,a')) return; md = { x: e.clientX, y: e.clientY }; });
    addEventListener('mouseup', e => { if (!md) return; const dx = e.clientX - md.x, dy = e.clientY - md.y; md = null; if (Math.hypot(dx, dy) > 30) act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D')); });
    $('#resume').addEventListener('click', () => this.resume());
    $('#again').addEventListener('click', () => this.start());
    $('#toTour').addEventListener('click', () => this.onBack());
    addEventListener('resize', () => { if ($('#game').classList.contains('on')) this.resize(); });
  }
  sideCheck() { for (const o of this.obs) if (o.kind === 'block' && o.lane === this.lane && Math.abs(o.g.position.z) < .5) this.caught(this.near()); }
  near() { return this.chasers[(Math.random() * 3) | 0].n; }
  spawn() {
    // pick one or two blocked lanes, always leave a way through
    const r = Math.random(), lanes = [-1, 0, 1].sort(() => Math.random() - .5), z = -60;
    const kind = r < .36 ? 'low' : r < .62 ? 'high' : 'block';
    const n = kind === 'block' ? (Math.random() < .5 ? 2 : 1) : (Math.random() < .35 ? 3 : 1);
    for (let i = 0; i < n; i++) { const g = this.get(kind); g.position.set(lanes[i] * LANE, 0, z); this.obs.push({ g, kind, lane: lanes[i], hit: 0 }); }
    const free = lanes[n] !== undefined ? lanes[n] : lanes[0];
    if (kind !== 'block' || n < 3) for (let k = 0; k < 5; k++) { const g = this.get('pellet'); g.position.set(free * LANE, kind === 'low' && n === 3 ? .6 : 0, z - 6 - k * 1.6); this.obs.push({ g, kind: 'pellet', lane: free, hit: 0 }); }
    this.nextSpawn = 13 + Math.random() * 9 - Math.min(5, this.speed * .2);
  }
  stumble(by) {
    if (this.t - this.stumbleT < 6 && this.gap < 2.2) return this.caught(by);
    this.stumbleT = this.t; this.gap = .9; this.SFX.run.bump(); try { navigator.vibrate && navigator.vibrate(60); } catch (e) {}
    $('#gred').classList.remove('on'); void $('#gred').offsetWidth; $('#gred').classList.add('on');
  }
  caught(by) {
    if (!this.alive) return; this.alive = false; this.by = by || 'Pip'; this.caughtT = this.t; this.SFX.run.crash(); try { navigator.vibrate && navigator.vibrate([120, 60, 200]); } catch (e) {}
    const m = Math.round(this.dist), score = m + this.pellets * 10;
    if (score > this.best) { this.best = score; this.LS.set('bw3.best', String(score)); }
    setTimeout(() => {
      $('#ovName').textContent = this.by; $('#ovM').textContent = m; $('#ovP').textContent = this.pellets; $('#ovS').textContent = score; $('#ovBest').textContent = 'Best: ' + this.best;
      const txt = `I ran ${m} m out of Brightwater Zoo before ${this.by} caught me. Score ${score}. Can you get further?`;
      $('#share').href = 'https://x.com/intent/post?text=' + encodeURIComponent(txt) + '&url=' + encodeURIComponent('https://maximusdigitals.github.io/brightwater/');
      $('#over').hidden = false; this.SFX.run.stop && this.SFX.run.stop(); window.__bw3.over = { m, score, by: this.by, best: this.best };
    }, 900);
  }
  frame(dt, now) {
    if (this.paused) { this.renderer.render(this.scene, this.cam); return; }
    this.t += dt;
    if (this.alive) {
      this.speed = Math.min(22, 9 + this.t * .16);
      const dz = this.speed * dt; this.dist += dz;
      this.tread.position.z = (this.dist % this.P);
      this.nextSpawn -= dz; if (this.nextSpawn <= 0) this.spawn();
      for (let i = this.obs.length - 1; i >= 0; i--) {
        const o = this.obs[i]; o.g.position.z += dz;
        if (o.kind === 'pellet') o.g.rotation.y += dt * 4;
        if (!o.hit && Math.abs(o.g.position.z) < .45 && o.lane === this.lane) {
          o.hit = 1;
          if (o.kind === 'pellet') { if (!(this.slide > 0 && o.g.position.y > .3)) { this.pellets++; this.SFX.run.pellet(); o.g.visible = false; } }
          else if (o.kind === 'low' && this.y < .55) this.stumble('Pip');
          else if (o.kind === 'high' && this.slide <= 0) this.stumble('The Long Keeper');
          else if (o.kind === 'block') this.caught(this.near());
        }
        if (o.g.position.z > 8) { this.put(o); this.obs.splice(i, 1); }
      }
      this.vy -= 24 * dt; this.y = Math.max(0, this.y + this.vy * dt); if (this.y === 0) this.vy = 0;
      this.slide = Math.max(0, this.slide - dt);
      this.gap = Math.min(2.6, this.gap + dt * .25);
      this.SFX.run.chase && this.SFX.run.chase(1 - (this.gap - .9) / 1.7);
      if ((this.stepAcc = (this.stepAcc || 0) + dz) > 2.2) { this.stepAcc = 0; this.SFX.run.feet(Math.min(1, this.speed / 20)); }
      $('#hudM').textContent = Math.round(this.dist); $('#hudP').textContent = this.pellets;
    } else this.gap = Math.max(.2, this.gap - dt * 4);
    this.x += (this.lane * LANE - this.x) * (1 - Math.exp(-dt * 14));
    // player pose
    const run = this.alive ? this.t * this.speed * .9 : 0, sl = this.slide > 0;
    this.pl.position.set(this.x, this.y, 0); this.body.rotation.x = sl ? -1.1 : -.12; this.body.position.y = sl ? -.35 : 0; this.body.position.z = sl ? .5 : 0;
    this.legs.forEach((l, i) => l.rotation.x = Math.sin(run + i * Math.PI) * (this.y > 0 ? .3 : .9));
    this.arms.forEach((a, i) => a.rotation.x = Math.sin(run + i * Math.PI + Math.PI) * .9);
    // chasers stay just behind you, closer after a stumble
    this.chasers.forEach((c, i) => {
      const z = this.gap * c.lag + Math.sin(this.t * 3 + i) * .15, x = this.x * .6 + c.lx * LANE * 1.1;
      c.R.root.position.set(x, Math.abs(Math.sin(this.t * 9 + i)) * .12, z); c.R.root.rotation.y = Math.PI / 2; // facing -z, after you
      animate(c.R, now, 1);
    });
    // camera: behind and above, sways with lane
    const shake = (!this.RM && this.t - this.stumbleT < .35) ? .12 : 0;
    const lunge = this.alive ? 0 : Math.min(1, (this.t - this.caughtT) / .5);
    this.cam.position.set(this.x * .55 + (Math.random() - .5) * shake, 3.9 + this.y * .3 - lunge * 1.2, 7.2 - lunge * 3.2);
    this.cam.lookAt(this.x * .7, 1.0 + this.y * .4, -6);
    this.renderer.render(this.scene, this.cam);
  }
}

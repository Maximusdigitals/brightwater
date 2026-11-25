/* The run home: a 3-lane endless runner down the same avenue, at night, with the residents behind you. */
import * as THREE from 'three';
import { buildModel, animate, GEO, mat } from './models.js';
import { patch, glowTex, U } from './fx.js';
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
    const lam = patch(new THREE.MeshLambertMaterial({ flatShading: true })), boxes = [], cols = [];
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
    // bloom on the lamps
    const bp = []; for (let rep = -1; rep < 4; rep++) for (const sd of [-1, 1]) bp.push(sd * 3.2, 3.15, -rep * P - 16);
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    const bl = new THREE.Points(bg, new THREE.PointsMaterial({ size: 3.2, map: glowTex(), color: '#ffcf7a', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); bl.frustumCulled = false; tread.add(bl);
    // a red rim light from behind: whatever is chasing you is lit by it
    const rim = new THREE.PointLight('#ff3a1a', 30, 14, 1.4); rim.position.set(0, 2.5, 5); sc.add(rim); this.rim = rim;
    // speed lines
    this.lines = new THREE.InstancedMesh(new THREE.BoxGeometry(.02, .02, 1), new THREE.MeshBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 36);
    this.lines.frustumCulled = false; this.lineP = []; for (let i = 0; i < 36; i++) this.lineP.push(this.newLine({}, true)); sc.add(this.lines);
    // pickup sparkles
    const N = 72, sp = new THREE.BufferGeometry(); sp.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); sp.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    this.spk = new THREE.Points(sp, new THREE.PointsMaterial({ size: .35, map: glowTex(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); this.spk.frustumCulled = false; sc.add(this.spk);
    this.spkP = Array.from({ length: N }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 })); this.spkI = 0;
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
    // the whole pack that got out is behind you
    this.chasers = [['Pip', -.5, .85, .7], ['The Long Keeper', -1.75, 1.05, .8], ['Chupacabra', 1.15, .95, .7], ['Kuramuffin', .55, 1.25, .7], ['The Hollow Stag', 2.05, 1.45, .7], ['The Jersey Devil', -1.15, 1.55, .65, 1.3], ['Mothman', 1.3, 1.75, .6, 1.6], ['Gon-zilla', -2.6, 1.6, .5]].map(([n, lx, lag, s, fly]) => {
      const R = buildModel(pick(n)); R.root.rotation.y = -Math.PI / 2; R.root.scale.setScalar(s); sc.add(R.root); return { R, n, lx, lag, fly: fly || 0 };
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
  newLine(o, init) { const a = Math.random() * Math.PI * 2, r = 2.2 + Math.random() * 3.5; o.x = Math.cos(a) * r * 1.3; o.y = 2.2 + Math.sin(a) * r * .8; o.z = init ? -Math.random() * 40 : -40 - Math.random() * 10; o.len = 1 + Math.random() * 2.5; return o; }
  sparkle(x, y, z, col = [1, .85, .35], n = 10) { for (let k = 0; k < n; k++) { const p = this.spkP[this.spkI = (this.spkI + 1) % this.spkP.length]; const a = Math.random() * Math.PI * 2; Object.assign(p, { life: .45 + Math.random() * .2, x, y, z, vx: Math.cos(a) * (1 + Math.random() * 2), vy: 1 + Math.random() * 3, vz: Math.sin(a) * 1.5, c: col }); } }
  pop(txt, cls = '') { const el = document.createElement('span'); el.textContent = txt; if (cls) el.className = cls; el.style.left = (44 + Math.random() * 12) + '%'; $('#pops').appendChild(el); setTimeout(() => el.remove(), 950); }
  get(kind) { const p = (this.pool[kind] = this.pool[kind] || []); const g = p.pop() || this.mk[kind](); g.visible = true; this.scene.add(g); return g; }
  put(o) { o.g.visible = false; this.scene.remove(o.g); this.pool[o.kind].push(o.g); }
  start() {
    $('#game').classList.add('on'); $('#over').hidden = true; $('#howto').classList.remove('gone');
    this.obs.forEach(o => this.put(o)); this.obs = [];
    this.howGone = 0; Object.assign(this, { dist: 0, speed: 9, lane: 0, x: 0, y: 0, vy: 0, slide: 0, gap: 2.6, stumbleT: -99, t: 0, pellets: 0, nextSpawn: 26, alive: true, paused: false, caughtT: -1, by: 'Pip',
      combo: 0, comboT: -9, bestCombo: 0, bonus: 0, nears: 0, laneT: -9, roarT: 4, camX: 0, camY: 3.9, shakeK: 0, slow: 1, sq: 0, fovK: 0 });
    $('#pops').innerHTML = ''; $('#hudC').textContent = '';
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
      if (a === 'L' && this.lane > -1) { this.lane--; this.laneT = this.t; this.SFX.run.lane(-.5); this.sideCheck(); }
      if (a === 'R' && this.lane < 1) { this.lane++; this.laneT = this.t; this.SFX.run.lane(.5); this.sideCheck(); }
      if (a === 'U' && this.y <= .001) { this.vy = 8.6; this.slide = 0; this.sq = -1; this.SFX.run.jump(); }
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
  near() { return this.chasers[(Math.random() * this.chasers.length) | 0].n; }
  spawn() {
    // pick one or two blocked lanes, always leave a way through
    const r = Math.random(), lanes = [-1, 0, 1].sort(() => Math.random() - .5), z = -60;
    const hard = Math.min(1, this.t / 70), kind = r < .36 ? 'low' : r < .62 ? 'high' : 'block';
    const n = kind === 'block' ? (Math.random() < .35 + hard * .35 ? 2 : 1) : (Math.random() < .3 + hard * .3 ? 3 : Math.random() < hard * .5 ? 2 : 1);
    for (let i = 0; i < n; i++) { const g = this.get(kind); g.position.set(lanes[i] * LANE, 0, z); this.obs.push({ g, kind, lane: lanes[i], hit: 0 }); }
    const free = lanes[n] !== undefined ? lanes[n] : lanes[0];
    if (kind !== 'block' || n < 3) for (let k = 0; k < 5; k++) { const g = this.get('pellet'); g.position.set(free * LANE, kind === 'low' && n === 3 ? .6 : 0, z - 6 - k * 1.6); this.obs.push({ g, kind: 'pellet', lane: free, hit: 0 }); }
    this.nextSpawn = 13 + Math.random() * 9 - Math.min(6, this.speed * .25);
    // later on, a second row follows hard on the first
    if (this.t > 35 && Math.random() < Math.min(.45, (this.t - 35) / 80)) { const k2 = kind === 'low' ? 'high' : 'low', l2 = lanes[(Math.random() * 3) | 0]; const g = this.get(k2); g.position.set(l2 * LANE, 0, z - 9); this.obs.push({ g, kind: k2, lane: l2, hit: 0 }); }
  }
  stumble(by) {
    if (this.t - this.stumbleT < 6 && this.gap < 2.2) return this.caught(by);
    this.stumbleT = this.t; this.gap = .9; this.combo = 0; this.shakeK = .5; this.SFX.run.bump(); setTimeout(() => this.SFX.run.roar && this.SFX.run.roar(), 180); this.pop('They\u2019re right behind you', 'warn'); try { navigator.vibrate && navigator.vibrate(60); } catch (e) {}
    $('#gred').classList.remove('on'); void $('#gred').offsetWidth; $('#gred').classList.add('on');
  }
  caught(by) {
    if (!this.alive) return; this.alive = false; this.by = by || 'Pip'; this.caughtT = this.t; this.slow = .3; this.shakeK = .8; this.SFX.run.crash(); try { navigator.vibrate && navigator.vibrate([120, 60, 200]); } catch (e) {}
    const m = Math.round(this.dist), score = this.score(), prev = this.best, nb = score > prev;
    if (nb) { this.best = score; this.LS.set('bw3.best', String(score)); }
    setTimeout(() => {
      $('#ovName').textContent = this.by; $('#ovBest').textContent = nb ? (prev ? 'Previous best: ' + prev : 'First run on the board') : 'Best: ' + this.best; $('#ovNew').hidden = !nb;
      $('#ovExtra').textContent = `Close calls ${this.nears} \u00b7 Best combo \u00d7${Math.max(1, this.bestCombo)}`;
      const cnt = (el, v) => { const t0 = performance.now(), D = this.RM ? 1 : 700; const f = () => { const k = Math.min(1, (performance.now() - t0) / D); el.textContent = Math.round(v * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; f(); };
      cnt($('#ovM'), m); cnt($('#ovP'), this.pellets); cnt($('#ovS'), score);
      const txt = `I ran ${m} m out of Brightwater Zoo before ${this.by} caught me. Score ${score}. Can you get further?`;
      $('#share').href = 'https://x.com/intent/post?text=' + encodeURIComponent(txt) + '&url=' + encodeURIComponent('https://maximusdigitals.github.io/brightwater/');
      $('#over').hidden = false; this.SFX.run.stop && this.SFX.run.stop(); window.__bw3.over = { m, score, by: this.by, best: this.best };
    }, 1100);
  }
  score() { return Math.round(this.dist) + this.pellets * 10 + this.bonus; }
  frame(dt, now) {
    if (this.paused) { this.renderer.render(this.scene, this.cam); return; }
    U.uTime.value = now;
    this.slow += (1 - this.slow) * (1 - Math.exp(-dt * (this.alive ? 6 : 1.2))); const rdt = dt; dt *= this.slow;
    this.t += dt;
    if (this.t > 6 && !this.howGone) { this.howGone = 1; $('#howto').classList.add('gone'); }
    if (this.alive) {
      this.speed = Math.min(25, 9 + this.t * .2 - Math.max(0, this.t - 40) * .06);
      const dz = this.speed * dt; this.dist += dz;
      this.tread.position.z = (this.dist % this.P);
      this.nextSpawn -= dz; if (this.nextSpawn <= 0) this.spawn();
      for (let i = this.obs.length - 1; i >= 0; i--) {
        const o = this.obs[i]; o.g.position.z += dz;
        if (o.kind === 'pellet') o.g.rotation.y += dt * 4;
        if (!o.hit && Math.abs(o.g.position.z) < .45 && o.lane === this.lane) {
          o.hit = 1;
          if (o.kind === 'pellet') { if (!(this.slide > 0 && o.g.position.y > .3)) {
            this.pellets++; this.combo = this.t - this.comboT < 1.1 ? this.combo + 1 : 1; this.comboT = this.t; this.bestCombo = Math.max(this.bestCombo, this.combo);
            const add = this.combo >= 3 ? (this.combo - 2) * 5 : 0; this.bonus += add; this.SFX.run.pellet(this.combo);
            if (this.combo >= 3) { this.pop(`\u00d7${this.combo}  +${10 + add}`); if (this.combo % 5 === 0) this.SFX.run.combo && this.SFX.run.combo(this.combo); }
            const em = $('#hudC'); em.textContent = this.combo >= 2 ? '\u00d7' + this.combo : ''; em.classList.remove('bump'); void em.offsetWidth; em.classList.add('bump');
            this.sparkle(o.g.position.x, o.g.position.y + .8, o.g.position.z); o.g.visible = false; } }
          else if (o.kind === 'low' && this.y < .55) this.stumble('Pip');
          else if (o.kind === 'high' && this.slide <= 0) this.stumble('The Long Keeper');
          else if (o.kind === 'block') this.caught(this.near());
          else o.clean = 1;
        }
        // near misses: you cleared it in your lane, or swerved past it at the last moment
        if (!o.hit && !o.near && o.kind !== 'pellet' && o.g.position.z > .5) {
          o.near = 1;
          if (o.clean) { this.bonus += 10; this.nears++; this.pop('Nice! +10', 'near'); this.SFX.run.whoosh && this.SFX.run.whoosh(0); }
          else if (Math.abs(o.lane - this.lane) === 1 && this.t - this.laneT < .45) { this.bonus += 15; this.nears++; this.pop('Close call! +15', 'near'); this.SFX.run.near && this.SFX.run.near((o.lane - this.lane) * .6); }
        }
        if (o.g.position.z > 8) { this.put(o); this.obs.splice(i, 1); }
      }
      this.vy -= 24 * dt; this.y = Math.max(0, this.y + this.vy * dt); if (this.y === 0) this.vy = 0;
      this.slide = Math.max(0, this.slide - dt);
      this.gap = Math.min(2.6, this.gap + dt * .25);
      this.SFX.run.chase && this.SFX.run.chase(1 - (this.gap - .9) / 1.7);
      if ((this.stepAcc = (this.stepAcc || 0) + dz) > 2.2) { this.stepAcc = 0; this.SFX.run.feet(Math.min(1, this.speed / 20)); }
      $('#hudM').textContent = Math.round(this.dist); $('#hudP').textContent = this.pellets; $('#hudS').textContent = this.score();
      if (this.t - this.comboT > 1.1 && this.combo) { this.combo = 0; $('#hudC').textContent = ''; }
      // they gain on you: a roar now and then, louder and closer when you've stumbled
      this.roarT -= dt; if (this.roarT <= 0) { this.roarT = 5 + Math.random() * 6; if (this.gap < 2.3 || Math.random() < .4) { this.SFX.run.roar && this.SFX.run.roar(); this.shakeK = Math.max(this.shakeK, .18); this.lungeT = this.t; } }
    } else this.gap = Math.max(.2, this.gap - dt * 4);
    this.x += (this.lane * LANE - this.x) * (1 - Math.exp(-rdt * 16));
    // player pose
    const run = this.alive ? this.t * this.speed * .9 : 0, sl = this.slide > 0;
    const land = this.y === 0 && this.wasAir; this.wasAir = this.y > 0; if (land) { this.sq = 1; this.SFX.run.feet(1); }
    this.sq *= Math.exp(-rdt * 9); const sq = this.y > 0 ? 1 + Math.min(.15, this.vy * .02) : 1 - this.sq * .18;
    this.pl.position.set(this.x, this.y, 0); this.pl.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.body.rotation.x = sl ? -1.1 : -.12 - Math.min(.25, this.speed * .008); this.body.position.y = sl ? -.35 : 0; this.body.position.z = sl ? .5 : 0;
    this.body.rotation.z = (this.x - this.lane * LANE) * .35;
    this.legs.forEach((l, i) => l.rotation.x = Math.sin(run + i * Math.PI) * (this.y > 0 ? .3 : .9));
    this.arms.forEach((a, i) => a.rotation.x = Math.sin(run + i * Math.PI + Math.PI) * .9);
    // chasers stay just behind you, closer after a stumble
    const lunge0 = this.lungeT != null && this.t - this.lungeT < .5 ? Math.sin((this.t - this.lungeT) / .5 * Math.PI) * .6 : 0;
    this.chasers.forEach((c, i) => {
      const z = this.gap * c.lag + Math.sin(this.t * 3 + i) * .15 - lunge0 * (i === 0 ? 1 : .5), x = this.x * .6 + c.lx * LANE * 1.1;
      c.R.root.position.set(x, c.fly ? c.fly + Math.sin(this.t * 4 + i) * .25 : Math.abs(Math.sin(this.t * 9 + i)) * .12, z); c.R.root.rotation.y = Math.PI / 2; // facing -z, after you
      c.R.gait = (c.R.gait || 0) + dt * (8 + this.speed * .5); animate(c.R, now, .35, 0, 1, .2);
    });
    // speed lines, faster and brighter as you speed up
    const sk = Math.max(0, (this.speed - 11) / 12) * (this.alive ? 1 : .3);
    this.lines.material.opacity = sk * .55;
    this.lineP.forEach((o, i) => { o.z += (this.speed * 2.2) * dt; if (o.z > 8) this.newLine(o); this._m = this._m || new THREE.Matrix4(); this._m.makeScale(1, 1, o.len * (1 + sk * 2)).setPosition(o.x + this.x * .5, o.y, o.z); this.lines.setMatrixAt(i, this._m); });
    this.lines.instanceMatrix.needsUpdate = true;
    // sparkles
    const sa = this.spk.geometry.attributes.position, sc2 = this.spk.geometry.attributes.color;
    this.spkP.forEach((p, i) => { if (p.life > 0) { p.life -= rdt; p.vy -= 9 * rdt; p.x += p.vx * rdt; p.y += p.vy * rdt; p.z += p.vz * rdt + (this.alive ? this.speed * dt : 0); } const k = Math.max(0, p.life) * 2; sa.setXYZ(i, p.x, p.y, p.z); sc2.setXYZ(i, (p.c ? p.c[0] : 0) * k, (p.c ? p.c[1] : 0) * k, (p.c ? p.c[2] : 0) * k); });
    sa.needsUpdate = sc2.needsUpdate = true;
    this.rim.intensity = 18 + (2.6 - this.gap) * 22 + lunge0 * 30;
    // camera: follows with a little lag, leans into lane changes, FOV opens up with speed, shakes on hits and roars
    this.shakeK = Math.max(0, this.shakeK - rdt * 1.6); const shake = this.RM ? 0 : this.shakeK * .35;
    const lunge = this.alive ? 0 : Math.min(1, (this.t - this.caughtT) / .5);
    this.camX += (this.x * .55 - this.camX) * (1 - Math.exp(-rdt * 7)); this.camY += (3.9 + this.y * .35 - this.camY) * (1 - Math.exp(-rdt * 5));
    this.cam.position.set(this.camX + (Math.random() - .5) * shake, this.camY - lunge * 1.2 + (Math.random() - .5) * shake, 7.2 - lunge * 3.2);
    this.cam.lookAt(this.x * .7, 1.0 + this.y * .4, -6);
    this.cam.rotation.z += (this.x - this.lane * LANE) * -.04;
    const fv = (innerWidth / innerHeight < .8 ? 72 : 60) + sk * 9; if (Math.abs(this.cam.fov - fv) > .05) { this.cam.fov += (fv - this.cam.fov) * (1 - Math.exp(-rdt * 3)); this.cam.updateProjectionMatrix(); }
    this.renderer.render(this.scene, this.cam);
  }
}

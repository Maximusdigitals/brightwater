/* Brightwater sound: everything is synthesised with Web Audio, no files.
   Unlock rules for X's in-app browser (WKWebView on iPhone, Android System WebView) come from MARLOWE. */
(() => {
'use strict';
const UA = navigator.userAgent || '';
const IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const A = { on: false, d: 0, music: 1 };
function silentWav() {
  const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44); return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
// must run synchronously inside the tap
function unlock() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  try { if (!A.ac) init(); } catch (e) { A.on = false; return false; }
  const ac = A.ac; if (!ac) return false;
  try { const p = ac.resume && ac.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  try { const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0); } catch (e) {}
  if (IOS && !navigator.audioSession && !A.silent) {
    try { const el = document.createElement('audio'); el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny'); el.loop = true; el.preload = 'auto'; el.src = silentWav(); const p = el.play(); if (p && p.catch) p.catch(() => {}); A.silent = el; } catch (e) {}
  }
  return true;
}
function kick() {
  if (!A.on) return;
  try { if (A.ac.state !== 'running' && A.ac.state !== 'closed') { const p = A.ac.resume(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
  try { if (A.silent && A.silent.paused) { const p = A.silent.play(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
}
['touchend', 'pointerup', 'click', 'keydown'].forEach(ev => addEventListener(ev, kick, { passive: true, capture: true }));
addEventListener('pageshow', kick); addEventListener('focus', kick);
document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

function init() {
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  let ac; try { ac = new C({ latencyHint: 'interactive' }); } catch (e) { try { ac = new C(); } catch (e2) { return; } }
  try {
  A.ac = ac; A.on = true;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5; comp.connect(ac.destination);
  A.master = ac.createGain(); A.master.gain.value = .9; A.master.connect(comp);
  // a little room
  A.verb = ac.createDelay(1); A.verb.delayTime.value = .19; const fb = ac.createGain(); fb.gain.value = .32; const lp = ac.createBiquadFilter(); lp.frequency.value = 2400;
  A.verb.connect(lp); lp.connect(fb); fb.connect(A.verb); lp.connect(A.master);
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; A.noise = nb;
  A.mus = gain(0, A.master); A.box = gain(0, A.master); A.box.connect(A.verb);
  // wind
  const wn = src(nb, true, .5), wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = .7;
  const wl = ac.createOscillator(); wl.frequency.value = .07; const wlg = gain(260); wl.connect(wlg); wlg.connect(wf.frequency); wl.start();
  A.wind = gain(0, A.master); wn.connect(wf); wf.connect(A.wind); wn.start();
  // drone, slowly detuning sawtooths under a low-pass
  A.drone = gain(0, A.master); A.drone.connect(A.verb); A.dlp = ac.createBiquadFilter(); A.dlp.frequency.value = 110; A.dlp.connect(A.drone);
  [41.2, 41.6, 61.7, 87.3].forEach(fq => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; const g = gain(.2); o.connect(g); g.connect(A.dlp); o.start(); });
  // crowd murmur (filtered noise) for the busy morning
  const cn = src(nb, true, .8), cf = ac.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 700; cf.Q.value = .5; A.crowd = gain(0, A.master); cn.connect(cf); cf.connect(A.crowd); cn.start();
  // heartbeat bus
  A.hb = gain(0, A.master);
  sequencer(); ambience();
  } catch (e) { A.on = false; }
}
function gain(v, to) { const g = A.ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
function src(buf, loop, rate = 1) { const s = A.ac.createBufferSource(); s.buffer = buf; s.loop = !!loop; s.playbackRate.value = rate; return s; }
function setG(node, v, t = .8) { if (!A.on) return; const n = A.ac.currentTime; node.gain.cancelScheduledValues(n); node.gain.setTargetAtTime(v, n, t / 3); }
const pan = p => { if (A.ac.createStereoPanner) { const s = A.ac.createStereoPanner(); s.pan.value = p; s.connect(A.master); return s; } return A.master; };
function tone(type, fq, dur, vol, when = 0, opt = {}) {
  if (!A.on) return; const ac = A.ac, t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(fq, t); if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t + (opt.glide || dur));
  if (opt.det) o.detune.value = opt.det;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (opt.a || .01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(opt.out || (opt.pan != null ? pan(opt.pan) : A.master)); if (opt.wet) g.connect(A.verb); o.start(t); o.stop(t + dur + .05);
  if (opt.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = opt.vib; lg.gain.value = opt.vd || fq * .03; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur); }
}
function hiss(dur, vol, fq, q = 1, type = 'bandpass', when = 0, p = 0, to) {
  if (!A.on) return; const ac = A.ac, t = ac.currentTime + when, s = src(A.noise), bf = ac.createBiquadFilter(), g = ac.createGain();
  bf.type = type; bf.frequency.setValueAtTime(fq, t); if (to) bf.frequency.exponentialRampToValueAtTime(to, t + dur); bf.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bf); bf.connect(g); g.connect(pan(p)); s.start(t, Math.random()); s.stop(t + dur + .05);
}

/* ---------- park music: a cheerful band-organ waltz that slowly loses its nerve ---------- */
// scale degrees in C major, 3/4. [note(semitones from C5) or null, beats]
const TUNE = [[7, 1], [4, .5], [5, .5], [7, 1], [12, 1], [11, .5], [9, .5], [7, 1], [5, 1], [4, .5], [5, .5], [7, 1], [2, 2], [null, 1],
  [9, 1], [7, .5], [5, .5], [4, 1], [7, 1], [5, .5], [4, .5], [2, 1], [4, 1], [5, .5], [7, .5], [0, 1], [0, 2], [null, 1]];
const BASS = [0, 7, 7, 0, 7, 7, 5, 9, 9, 7, 11, 11];
let ti = 0, bi = 0, nextT = 0;
function sequencer() {
  const ac = A.ac; if (!ac) return; nextT = ac.currentTime + .1;
  const step = () => {
    if (!A.on) return; const now = ac.currentTime;
    while (nextT < now + .25) {
      const d = A.d, bpm = 138 * (1 - .32 * d), beat = 60 / bpm, [n, len] = TUNE[ti];
      const wob = (Math.random() - .5) * 40 * d, det = -d * 55 + wob; // flat and seasick, a little more every exhibit
      if (n != null && A.music > 0) {
        const fq = 523.25 * Math.pow(2, n / 12);
        tone('square', fq, len * beat * .9, .05, nextT - now, { out: A.mus, det, a: .005 });
        tone('triangle', fq * 2, len * beat * .6, .03, nextT - now, { out: A.mus, det: det * 1.3 });
        // music box twin, minor-ish (the third flattens as d rises)
        const nb = (n % 12 === 4) ? n - 1 : n;
        if (d > .45 && Math.random() < .8) tone('sine', 523.25 * 2 * Math.pow(2, nb / 12), len * beat * 1.6, .045, nextT - now, { out: A.box, det: det * 1.6, a: .003 });
      }
      // oom-pah-pah
      if (Math.abs((ti === 0 ? 0 : 1) * 0) === 0) { const b = BASS[bi % BASS.length]; tone('triangle', 130.81 * Math.pow(2, b / 12), beat * .5, bi % 3 === 0 ? .09 : .04, nextT - now, { out: A.mus, det }); bi++; }
      nextT += len * beat; ti = (ti + 1) % TUNE.length;
      if (len > 1) { const b = BASS[bi % BASS.length]; tone('triangle', 130.81 * Math.pow(2, b / 12), beat * .5, .04, nextT - now - beat, { out: A.mus, det }); bi++; }
    }
    A.seqT = setTimeout(step, 90);
  };
  step();
}
/* ---------- ambience: birds by day, crickets at dusk, nothing at the end ---------- */
function ambience() {
  const loop = () => {
    if (!A.on) return; const d = A.d;
    if (!A.stopAmb) {
      if (Math.random() < Math.pow(1 - d, 2.2) * .55) bird(Math.random() * 1.6 - .8);
      if (d > .35 && d < .9 && Math.random() < Math.sin(Math.min(1, (d - .35) / .55) * Math.PI) * .7) cricket(Math.random() * 1.6 - .8);
    }
    A.ambT = setTimeout(loop, 380 + Math.random() * 500);
  };
  loop();
}
function bird(p) { const b = 2400 + Math.random() * 2200, n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) tone('sine', b, .07, .035, i * .09, { to: b * (1.2 + Math.random() * .4), glide: .06, pan: p }); }
function cricket(p) { for (let i = 0; i < 6; i++) tone('sine', 4400, .02, .02, i * .035, { pan: p }); }

/* ---------- the dread dial: called with 0..1 as you walk ---------- */
function setDread(d, stage = 'tour') {
  A.d = d; if (!A.on || stage !== 'tour') return;
  setG(A.mus, Math.pow(1 - d, 2.2) * .55 * A.music, 1.5);
  setG(A.box, Math.max(0, Math.min(1, (d - .45) / .35)) * Math.max(0, 1 - (d - .8) * 4) * .5 * A.music, 2);
  setG(A.crowd, Math.pow(Math.max(0, 1 - d * 2.2), 2) * .05, 2);
  setG(A.wind, Math.min(.16, Math.max(0, d - .3) * .25), 2);
  setG(A.drone, Math.pow(Math.max(0, (d - .4) / .6), 1.6) * .3, 3);
  try { A.dlp.frequency.setTargetAtTime(90 + d * 120, A.ac.currentTime, 1); } catch (e) {}
}
function hushAll(t = .2) { if (!A.on) return; A.stopAmb = true; [A.mus, A.box, A.crowd, A.wind, A.drone].forEach(g => setG(g, 0, t)); }

/* ---------- animal voices ---------- */
function voice(kind, dk = 0, p = 0) {
  if (!A.on) return; const low = 1 - dk * .35; // later animals all sound a bit lower and wrong
  switch (kind) {
    case 'honk': tone('sawtooth', 520 * low, .14, .07, 0, { to: 430 * low, pan: p }); tone('sawtooth', 560 * low, .12, .05, .18, { to: 440 * low, pan: p }); break;
    case 'hum': tone('sine', 92, 1.1, .2, 0, { vib: 5, pan: p }); break;
    case 'bark': [0, .16].forEach(w => { hiss(.09, .14, 900, 2, 'bandpass', w, p); tone('square', 380 * low, .08, .05, w, { to: 260, pan: p }); }); break;
    case 'roar': hiss(1.3, .35, 260 * low, 1.4, 'bandpass', 0, p, 120); tone('sawtooth', 120 * low, 1.2, .16, 0, { to: 70, vib: 9, vd: 10, pan: p }); break;
    case 'trumpet': tone('sawtooth', 340 * low, .9, .14, 0, { to: 620 * low, glide: .3, vib: 7, vd: 20, pan: p, wet: 1 }); hiss(.8, .06, 1600, 2, 'bandpass', 0, p); break;
    case 'squeak': tone('sine', 2400 * low, .08, .07, 0, { to: 3200 * low, pan: p }); tone('sine', 2600 * low, .06, .05, .12, { to: 3300, pan: p }); break;
    case 'grunt': hiss(.35, .25, 180 * low, 3, 'bandpass', 0, p, 90); tone('square', 70 * low, .3, .08, 0, { to: 55, pan: p }); break;
    case 'chirp': for (let i = 0; i < 3; i++) tone('triangle', 1500 * low, .06, .06, i * .08, { to: 2100 * low, pan: p }); break;
    case 'croak': for (let i = 0; i < 4; i++) tone('square', 300 * low, .05, .05, i * .06, { pan: p }); break;
    case 'blip': tone('sine', 900 * low, .12, .1, 0, { to: 1500, pan: p }); break;
    case 'sigh': hiss(1.2, .08, 600, .8, 'lowpass', 0, p, 200); break;
    case 'hoot': [0, .3, .6].forEach((w, i) => tone('sine', (380 + i * 80) * low, .26, .12, w, { to: (520 + i * 80) * low, pan: p })); break;
    case 'zap': hiss(.25, .18, 5000, 1, 'highpass', 0, p); tone('square', 1800, .05, .04, 0, { to: 600, pan: p }); tone('sine', 1320 * low, .3, .07, .1, { pan: p, wet: 1 }); break;
    case 'meow': tone('sawtooth', 700 * low, .45, .06, 0, { to: 520 * low, glide: .4, vib: 6, vd: 30, pan: p }); break;
    case 'boom': tone('sine', 60 * low, 1.2, .35, 0, { to: 38, pan: p }); hiss(1, .1, 140, 1, 'lowpass', 0, p); break;
    case 'chime': [0, 4, 7, 12].forEach((s, i) => tone('sine', 880 * low * Math.pow(2, s / 12), .9, .06, i * .09, { pan: p, wet: 1 })); break;
    case 'beep': tone('square', 880, .08, .05, 0, { pan: p }); tone('square', 1175, .08, .05, .12, { pan: p }); tone('square', 660 * low, .2, .05, .26, { pan: p }); break;
    case 'bloop': tone('sine', 300 * low, .25, .14, 0, { to: 700 * low, glide: .2, pan: p, wet: 1 }); break;
    case 'pon': tone('sine', 180, .2, .22, 0, { to: 90, pan: p }); tone('sine', 180, .2, .2, .25, { to: 90, pan: p }); break;
    case 'yip': tone('sawtooth', 900 * low, .1, .06, 0, { to: 1300, pan: p }); break;
    case 'tap': [0, .14, .5, .64].forEach(w => hiss(.04, .3, 1800, 6, 'bandpass', w, p)); break;
    case 'screech': hiss(1.1, .25, 3000 * low, 3, 'bandpass', 0, p, 1800); tone('sawtooth', 1900 * low, 1, .04, 0, { to: 1400, vib: 14, vd: 60, pan: p }); break;
    case 'click': for (let i = 0; i < 5; i++) hiss(.02, .2, 6000, 4, 'bandpass', i * .07, p); break;
    case 'scream': hiss(.8, .25, 1200 * low, 2, 'bandpass', 0, p, 700); tone('sawtooth', 600 * low, .7, .07, 0, { to: 300, vib: 20, vd: 40, pan: p }); break;
    case 'hiss': hiss(1.1, .2, 5200, .7, 'highpass', 0, p); break;
    case 'gurgle': for (let i = 0; i < 6; i++) tone('sine', 140 + Math.random() * 160, .09, .14, i * .07, { to: 300, pan: p }); break;
    case 'flutter': for (let i = 0; i < 12; i++) hiss(.05, .14, 400, 1, 'lowpass', i * .05, p); break;
    case 'growl': hiss(1.4, .3, 150, 2, 'bandpass', 0, p, 110); tone('sawtooth', 62, 1.3, .12, 0, { vib: 22, vd: 8, pan: p }); break;
    case 'creak': tone('sawtooth', 160, 1.5, .05, 0, { to: 90, vib: 30, vd: 25, pan: p, wet: 1 }); break;
    case 'steps': for (let i = 0; i < 4; i++) step(p, i * .55); break;
    case 'giggle': giggle(p); break;
    case 'heart': heart(3); break;
    default: tone('sine', 660, .1, .06, 0, { pan: p });
  }
}
function step(p = 0, w = 0, vol = .22) { hiss(.12, vol, 240, 1.4, 'lowpass', w, p, 120); tone('sine', 70, .1, vol * .5, w, { pan: p }); }
function giggle(p = 0) { [0, .11, .2, .28, .42].forEach((w, i) => tone('triangle', 980 - i * 40, .08, .06, w, { to: 760, pan: p, wet: 1, vib: 30, vd: 40 })); }
function whisper(p = 0, dur = 1.4, vol = .12) { hiss(dur, vol, 2600, 4, 'bandpass', 0, p, 1800); hiss(dur * .8, vol * .7, 1200, 5, 'bandpass', .2, p, 900); }
function heart(n = 2, when = 0, vol = .4) { for (let i = 0; i < n; i++) { tone('sine', 58, .16, vol, when + i * .78, { to: 40 }); tone('sine', 52, .14, vol * .7, when + i * .78 + .2, { to: 38 }); } }
function breath() { hiss(1.3, .07, 650, 1.6, 'bandpass', 0, 0, 380); hiss(1.5, .05, 480, 1.6, 'bandpass', 1.5, 0, 300); }
function feed() { for (let i = 0; i < 5; i++) tone('sine', 1300 + Math.random() * 600, .05, .05, i * .07); }
function ui() { tone('sine', 1250, .05, .05); }
function sting(k = 1) {
  if (!A.on) return; const ac = A.ac;
  // a dissonant brass-and-noise stab: tritone cluster + white noise + a sub hit
  [146.8, 207.7, 220, 311.1, 415.3].forEach(fq => tone('sawtooth', fq * k, 1.4, .14, 0, { a: .003, vib: 7, vd: 6 }));
  hiss(1.2, .9, 3000, .6, 'bandpass', 0, 0, 800); hiss(.5, .7, 9000, .5, 'highpass', 0);
  tone('sine', 55, 1.6, .9, 0, { to: 30, a: .002 });
}
function roar() { voice('roar', .9, -.4); setTimeout(() => voice('growl', .9, .5), 200); setTimeout(() => voice('screech', .9, 0), 380); }
/* ---------- runner sfx ---------- */
const run = {
  jump: () => tone('square', 300, .14, .05, 0, { to: 700 }),
  slide: () => hiss(.25, .12, 1200, 1, 'bandpass', 0, 0, 400),
  lane: p => hiss(.08, .06, 2200, 2, 'bandpass', 0, p),
  pellet: () => { tone('sine', 1567, .07, .05); tone('sine', 2093, .1, .04, .05); },
  bump: () => { tone('square', 90, .18, .2, 0, { to: 50 }); hiss(.15, .25, 400, 1, 'lowpass'); },
  crash: () => { hiss(.8, .6, 400, .5, 'lowpass'); tone('sine', 50, .9, .7, 0, { to: 25 }); sting(.8); },
  feet: k => step(0, 0, .05 + k * .05),
  chaseOn: () => { if (!A.on) return; setG(A.drone, .3, .3); try { A.dlp.frequency.setTargetAtTime(260, A.ac.currentTime, .3); } catch (e) {} setG(A.wind, .08, .5); },
  chase: k => { if (!A.on) return; setG(A.drone, .15 + k * .3, .3); },
  stop: () => { if (!A.on) return; setG(A.drone, 0, 1); setG(A.wind, 0, 1); }
};
window.SFX = { A, unlock, kick, setDread, hushAll, voice, step, giggle, whisper, heart, breath, feed, ui, sting, roar, run, get on() { return A.on; }, get state() { return A.on ? A.ac.state : 'off'; } };
})();

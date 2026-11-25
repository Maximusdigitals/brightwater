/* painted signs: placards (one atlas), gate boards and signposts, drawn on canvas */
import * as THREE from 'three';
const E = window.EXHIBITS, Z = window.ZONES;
const IUCNL = { CR: 'Critically endangered', EN: 'Endangered', VU: 'Vulnerable', NT: 'Near threatened', LC: 'Least concern' };
function fit(ctx, text, font, max, size) { let s = size; do { ctx.font = font.replace('$', s); s -= 2; } while (ctx.measureText(text).width > max && s > 10); }
function hand(ctx, text, x, y, size, col = '#b3261e', rot = -.06) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${size}px Reenie, "Comic Sans MS", cursive`; ctx.fillStyle = col; ctx.fillText(text, 0, 0); ctx.restore(); }
function tex(c, aniso = 4) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }
export function placardAtlas() {
  const cw = 408, ch = 204, c = document.createElement('canvas'); c.width = 2048; c.height = 2048; const x = c.getContext('2d');
  E.forEach((e, i) => {
    const ox = (i % 5) * 409.6, oy = ((i / 5) | 0) * 204.8, z = Z[e.z], late = i >= 39;
    x.save(); x.translate(ox, oy);
    x.fillStyle = late ? '#d8d2c0' : '#fbf5e6'; x.fillRect(4, 4, cw - 8, ch - 8);
    x.fillStyle = z.col; x.fillRect(4, 4, cw - 8, 40);
    x.fillStyle = '#fff'; x.font = '22px Bungee, Impact, sans-serif'; x.textBaseline = 'middle'; x.fillText(z.name.toUpperCase(), 18, 25);
    x.textAlign = 'right'; x.fillText(String(i + 1).padStart(2, '0'), cw - 18, 25); x.textAlign = 'left';
    x.fillStyle = '#1f1c17'; fit(x, e.n, '$px Bungee, Impact, sans-serif', cw - 36, 40); x.fillText(e.n, 18, 82);
    x.font = 'italic 22px "Young Serif", Georgia, serif'; x.fillStyle = '#5a5245'; x.fillText(e.sci, 18, 120);
    x.font = '700 20px Archivo, Arial, sans-serif'; x.fillStyle = e.t === 'real' ? '#3f7d3a' : '#8f2a22';
    x.fillText(e.t === 'real' ? 'IUCN: ' + (IUCNL[e.st] || e.st) : e.st, 18, 160);
    x.strokeStyle = '#1f1c17'; x.lineWidth = 6; x.strokeRect(4, 4, cw - 8, ch - 8);
    if (e.scrawl) { x.strokeStyle = '#b3261e'; x.lineWidth = 4; x.beginPath(); x.moveTo(14, 84); x.lineTo(Math.min(cw - 20, 30 + x.measureText(e.n).width * 1.6), 80); x.stroke(); hand(x, e.scrawl[2], 150, 182, 46); }
    if (late) { x.fillStyle = 'rgba(90,40,20,.25)'; for (let k = 0; k < 14; k++) { x.beginPath(); x.arc(Math.random() * cw, Math.random() * ch, 4 + Math.random() * 14, 0, 7); x.fill(); } }
    x.restore();
  });
  return tex(c, 8);
}
export function gateTextures(GATES) {
  return GATES.map(g => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
    const z = Z[g.z], col = g.z === 'IN' ? '#e0892b' : g.z === 'OUT' ? '#8f2a22' : z.col;
    x.fillStyle = '#fbf5e6'; x.fillRect(0, 0, 1024, 256); x.fillStyle = col; x.fillRect(0, 0, 1024, 18); x.fillRect(0, 238, 1024, 18);
    x.strokeStyle = '#1f1c17'; x.lineWidth = 10; x.strokeRect(5, 5, 1014, 246);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#1f1c17';
    const title = g.z === 'IN' ? 'BRIGHTWATER ZOO' : g.z === 'OUT' ? 'EXIT' : z.sign.toUpperCase();
    const sub = g.z === 'IN' ? 'Zoological Gardens \u00b7 Est. 1931 \u00b7 Welcome!' : g.z === 'OUT' ? 'Pip will see you out' : z.sub;
    fit(x, title, '$px Bungee, Impact, sans-serif', 940, 96); x.fillText(title, 512, 108);
    x.font = '34px "Young Serif", Georgia, serif'; x.fillStyle = '#5a5245'; x.fillText(sub, 512, 192);
    if (g.z === 'E') hand(x, 'they got out', 760, 70, 64, '#b3261e', -.12);
    if (g.z === 'F') { x.strokeStyle = '#b3261e'; x.lineWidth = 8; x.beginPath(); x.moveTo(160, 190); x.lineTo(880, 186); x.stroke(); hand(x, 'GO BACK', 700, 196, 80, '#b3261e', -.08); }
    if (g.z === 'OUT') hand(x, 'he is waiting', 760, 66, 58, '#b3261e', -.1);
    return tex(c);
  });
}
export function signTextures() {
  const S = [['THIS WAY!', 'Follow the paw prints \u2192', ''], ['FEEDING TIMES', 'On every sign. Ask a keeper!', ''], ['GARDENS CLOSE AT 6', 'Please keep to the path', ''],
    ['PLEASE KEEP MOVING', 'Do not feed the keepers', 'he counts'], ['STAY ON THE PATH', 'Lost children: Gate 1', 'none found'], ['DO NOT RUN', 'It hears running', 'run'], ['THIS WAY OUT', 'Pip will see you out \u2192', 'no']];
  return S.map(([a, b, h], k) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    x.fillStyle = k < 3 ? '#fbf5e6' : '#cfc7b4'; x.fillRect(0, 0, 512, 256); x.fillStyle = k < 3 ? '#e0892b' : '#5a2a22'; x.fillRect(0, 0, 512, 22);
    x.strokeStyle = '#1f1c17'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 248);
    x.textAlign = 'center'; x.fillStyle = '#1f1c17'; fit(x, a, '$px Bungee, Impact, sans-serif', 470, 48); x.fillText(a, 256, 110);
    x.font = '26px "Young Serif", Georgia, serif'; x.fillText(b, 256, 170);
    if (h) hand(x, h, 330, 232, 54);
    return tex(c);
  });
}

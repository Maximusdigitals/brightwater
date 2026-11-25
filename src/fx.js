/* Shared shader tweaks: fake ambient occlusion (darker near the ground) and wind sway for foliage. */
import * as THREE from 'three';
export const U = { uTime: { value: 0 }, uWind: { value: 1 } };
export function patch(m, o = {}) {
  const wind = o.wind || 0, aoMin = o.aoMin ?? .58, aoH = o.aoH ?? 1.25, base = o.base ?? .5;
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nvarying float vAOy;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (wind ? `{ vec3 ip = modelMatrix[3].xyz;
#ifdef USE_INSTANCING
ip += instanceMatrix[3].xyz;
#endif
float h = max(position.y + ${base.toFixed(2)}, 0.0);
float sw = sin(uTime * 1.7 + ip.x * .31 + ip.z * .23) + .5 * sin(uTime * 2.9 + ip.z * .5 + ip.x * .1);
transformed.x += sw * ${wind.toFixed(3)} * h * uWind;
transformed.z += cos(uTime * 1.3 + ip.x * .2) * ${(wind * .6).toFixed(3)} * h * uWind; }` : ''))
      .replace('#include <project_vertex>', `#include <project_vertex>
{ vec4 aw = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
aw = instanceMatrix * aw;
#endif
aw = modelMatrix * aw; vAOy = aw.y; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAOy;')
      .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= mix(${aoMin.toFixed(2)}, 1.0, smoothstep(0.0, ${aoH.toFixed(2)}, vAOy));`);
  };
  m.customProgramCacheKey = () => `bw-${wind}-${aoMin}-${aoH}-${base}`;
  return m;
}
let GT = null;
export function glowTex() {
  if (GT) return GT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); GT = new THREE.CanvasTexture(c); return GT;
}
export function fogTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  for (let i = 0; i < 26; i++) { const px = 16 + Math.random() * 96, py = 20 + Math.random() * 24, r = 10 + Math.random() * 18, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 64); }
  const t = new THREE.CanvasTexture(c); return t;
}

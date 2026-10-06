// 목록 히어로 — 천천히 도는 점 구름. 조각들이 몇 개 무리로 모이고, 그중 한 점이 질문처럼 이웃을 잡아요.
// 색은 --3d-accent / --3d-ink / --3d-muted, 위치는 --3d-hero-shift(-1~1, 구름을 좌우로 밀기)로만 받아요.
import * as THREE from './three.module.min.js';
import { reduceMQ, schemeMQ, isLight, readTokens, rng, createRunner, guardContext, clamp } from './common.js';

const DEFAULTS = { accent: '#17604C', ink: '#26231F', muted: '#625C53' };
const FOV = 35;

const COMMON_VERT = `
uniform float uPx, uTime, uPush; uniform vec2 uPtr;
vec4 place(vec3 p) {
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec2 d = mv.xy - uPtr;
  mv.xy += normalize(d + vec2(1e-4)) * exp(-dot(d, d) * 1.6) * uPush;
  return mv;
}`;

export default function mount(el) {
  const light = isLight();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !light, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return false; }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // CSS 색을 그대로 써요
  renderer.setClearColor(0x000000, 0);
  const maxPR = light ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPR));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  const root = new THREE.Group();
  scene.add(root);

  // --- 데이터: 무리 5개 + 흩어진 점 ---
  const rand = rng(20261006);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(6.2831853 * rand());
  const centers = [[-1.55, 0.5, 0.3], [0.05, 1.4, -0.8], [1.6, 0.45, 0.55], [0.5, -1.25, 0.9], [-0.9, -1.15, -0.9]];
  const spread = [0.27, 0.24, 0.3, 0.25, 0.28];
  const colorOf = [0, 1, 0, 2, 1];
  const perCluster = light ? 62 : 150, stray = light ? 34 : 90;
  const pos = [], size = [], col = [], hit = [], ph = [], clusterStart = [];
  centers.forEach((c, k) => {
    clusterStart.push(pos.length / 3);
    for (let i = 0; i < perCluster; i++) {
      pos.push(c[0] + gauss() * spread[k], c[1] + gauss() * spread[k] * 0.9, c[2] + gauss() * spread[k]);
      size.push(3.4 + rand() * 3.6); col.push(colorOf[k]); hit.push(0); ph.push(rand() * 6.28);
    }
  });
  for (let i = 0; i < stray; i++) {
    pos.push(gauss() * 2.1, gauss() * 1.6, gauss() * 1.6);
    size.push(2.4 + rand() * 1.8); col.push(2); hit.push(0); ph.push(rand() * 6.28);
  }
  const n = pos.length / 3;

  // 질문 점: 첫 무리 한가운데에서 가장 가까운 점 몇 개를 잡아요(검색의 은유).
  const q = [centers[0][0] + 0.12, centers[0][1] - 0.08, centers[0][2] + 0.05];
  const dist2 = (i) => (pos[i * 3] - q[0]) ** 2 + (pos[i * 3 + 1] - q[1]) ** 2 + (pos[i * 3 + 2] - q[2]) ** 2;
  const near = [];
  for (let i = clusterStart[0]; i < clusterStart[0] + perCluster; i++) near.push(i);
  near.sort((a, b) => dist2(a) - dist2(b));
  const hits = near.slice(0, 5);
  hits.forEach((i) => { hit[i] = 1; size[i] += 1.2; col[i] = 0; });

  // 무리 안 이웃끼리 가는 선(가는 거미줄)
  const lines = [], hitLines = [];
  const seen = new Set();
  for (let k = 0; k < centers.length; k++) {
    const a0 = clusterStart[k], a1 = a0 + perCluster;
    for (let i = a0; i < a1; i += light ? 3 : 2) {
      let b1 = -1, b2 = -1, d1 = 1e9, d2 = 1e9;
      for (let j = a0; j < a1; j++) {
        if (j === i) continue;
        const d = (pos[i * 3] - pos[j * 3]) ** 2 + (pos[i * 3 + 1] - pos[j * 3 + 1]) ** 2 + (pos[i * 3 + 2] - pos[j * 3 + 2]) ** 2;
        if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = j; } else if (d < d2) { d2 = d; b2 = j; }
      }
      for (const [j, d] of [[b1, d1], [b2, d2]]) {
        if (j < 0 || d > 0.09) continue;
        const key = i < j ? i + '_' + j : j + '_' + i;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
      }
    }
  }
  hits.forEach((i) => hitLines.push(q[0], q[1], q[2], pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));

  // --- 재질 ---
  const uni = {
    uPx: { value: renderer.getPixelRatio() }, uTime: { value: 0 }, uPush: { value: 0.16 }, uPtr: { value: new THREE.Vector2(9, 9) },
    uC0: { value: new THREE.Vector3() }, uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() },
    uOp: { value: 1 },
  };
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  pg.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  pg.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 1));
  pg.setAttribute('aHit', new THREE.Float32BufferAttribute(hit, 1));
  pg.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1));
  const pm = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: COMMON_VERT + `
attribute float aSize, aCol, aHit, aPh; varying float vA, vCol, vHit;
void main() {
  vec4 mv = place(position);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  gl_PointSize = aSize * uPx * (9.0 / depth) * (1.0 + aHit * 0.5);
  vA = clamp(1.15 - (depth - 5.0) / 5.5, 0.3, 1.0) * (0.84 + 0.16 * sin(uTime * 0.7 + aPh));
  vCol = aCol; vHit = aHit;
}`,
    fragmentShader: `
uniform vec3 uC0, uC1, uC2; uniform float uOp; varying float vA, vCol, vHit;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.3, d);
  if (a < 0.01) discard;
  vec3 c = vCol < 0.5 ? uC0 : (vCol < 1.5 ? uC1 : uC2);
  gl_FragColor = vec4(c, a * vA * uOp * (0.9 + 0.1 * vHit));
}`,
  });
  root.add(new THREE.Points(pg, pm));

  const lineMat = (alpha, colorName) => new THREE.ShaderMaterial({
    uniforms: { ...uni, uLC: { value: new THREE.Vector3() }, uLA: { value: alpha } },
    transparent: true, depthWrite: false,
    vertexShader: COMMON_VERT + `varying float vZ; void main(){ vec4 mv = place(position); gl_Position = projectionMatrix * mv; vZ = -mv.z; }`,
    fragmentShader: `uniform vec3 uLC; uniform float uLA, uOp; varying float vZ; void main(){ gl_FragColor = vec4(uLC, uLA * uOp * clamp(1.2 - (vZ - 5.0) / 5.5, 0.25, 1.0)); }`,
  });
  const mkLines = (arr, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(g, mat);
    root.add(l);
    return l;
  };
  const webMat = lineMat(0.24), hitMat = lineMat(0.75);
  mkLines(lines, webMat); mkLines(hitLines, hitMat);

  // 질문 표식: 고리 + 천천히 퍼지는 파동
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(q, 3));
  const ringU = { uPx: uni.uPx, uTime: uni.uTime, uPush: uni.uPush, uPtr: uni.uPtr, uC: { value: new THREE.Vector3() }, uOp: uni.uOp, uPulse: { value: 0 } };
  const ring = new THREE.Points(rg, new THREE.ShaderMaterial({
    uniforms: ringU, transparent: true, depthWrite: false,
    vertexShader: COMMON_VERT + `uniform float uPulse; varying float vP; void main(){ vec4 mv = place(position); gl_Position = projectionMatrix * mv; vP = uPulse; gl_PointSize = uPx * (9.0 / -mv.z) * (13.0 + 26.0 * uPulse); }`,
    fragmentShader: `uniform vec3 uC; uniform float uOp; varying float vP;
void main(){ float d = length(gl_PointCoord - 0.5);
  float w = 0.035 + 0.03 * (1.0 - vP);
  float r = 0.46 - 0.04 * (1.0 - vP);
  float a = smoothstep(r + w, r, d) * smoothstep(r - w * 2.0, r - w, d);
  gl_FragColor = vec4(uC, a * (0.85 * (1.0 - vP) + 0.1) * uOp); }`,
  }));
  root.add(ring);

  // --- 색(토큰) ---
  function applyTokens() {
    const t = readTokens(el, DEFAULTS);
    const set = (v, c) => v.set(c[0], c[1], c[2]);
    set(uni.uC0.value, t.accent); set(uni.uC1.value, t.ink); set(uni.uC2.value, t.muted);
    set(webMat.uniforms.uLC.value, t.muted); set(hitMat.uniforms.uLC.value, t.accent); set(ringU.uC.value, t.accent);
  }
  applyTokens();
  schemeMQ.addEventListener('change', () => { applyTokens(); if (el.dataset.state3d !== 'running') still(); });

  // --- 크기 · 위치 ---
  let W = 1, H = 1;
  function resize() {
    const r = el.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const t = Math.tan((FOV * Math.PI) / 360);
    camera.position.set(0, 0, Math.max(6.6, 2.55 / (t * camera.aspect)));
    const shift = parseFloat(getComputedStyle(el).getPropertyValue('--3d-hero-shift')) || 0;
    camera.setViewOffset(W, H, -shift * W * 0.5, 0, W, H);
    camera.updateProjectionMatrix();
    uni.uPx.value = renderer.getPixelRatio();
    if (el.dataset.state3d !== 'running') still();
  }
  new ResizeObserver(resize).observe(el);

  // --- 포인터 반응(살짝) ---
  const tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const host = el.closest('.hero-stage') || el;
  const onPtr = (e) => {
    if (reduceMQ.matches) return;
    const r = el.getBoundingClientRect();
    tgt.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.4, 1.4);
    tgt.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1.4, 1.4);
  };
  host.addEventListener('pointermove', onPtr, { passive: true });
  host.addEventListener('pointerdown', onPtr, { passive: true });
  host.addEventListener('pointerleave', () => { tgt.x = 0; tgt.y = 0; uni.uPtr.value.set(9, 9); }, { passive: true });

  let spin = 0.6, ptrOn = false;
  function draw(dt, t) {
    uni.uTime.value = t;
    const k = 1 - Math.exp(-dt * 3.5);
    cur.x += (tgt.x - cur.x) * k; cur.y += (tgt.y - cur.y) * k;
    root.rotation.y = spin + cur.x * 0.22;
    root.rotation.x = 0.16 + cur.y * 0.12;
    const tn = Math.tan((FOV * Math.PI) / 360) * camera.position.z;
    ptrOn = Math.abs(tgt.x) < 1.35 && (tgt.x !== 0 || tgt.y !== 0);
    if (ptrOn) uni.uPtr.value.set(cur.x * tn * camera.aspect, -cur.y * tn); else uni.uPtr.value.set(9, 9);
    ringU.uPulse.value = (t * 0.2) % 1;
    renderer.render(scene, camera);
  }
  const runner = createRunner(el, {
    frame(dt, t) { spin += dt * 0.07; draw(dt, t); },
    still() { draw(0.016, 3.2); },
  });
  function still() { if (!reduceMQ.matches || el.dataset.state3d === 'still') draw(0.016, 3.2); }
  guardContext(renderer, runner);
  resize();
  el.classList.add('is-live');
  return true;
}

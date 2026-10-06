// 목록 히어로 — 점 구름 하나. 무리 5개 + 흩어진 점이 천천히 돌고, 포인터(마우스·터치)가 가까우면 점이 비켜 가요.
// 색은 --3d-accent / --3d-ink / --3d-muted, 위치는 --3d-hero-shift(-1~1, 구름을 좌우로 밀기)로만 받아요.
import * as THREE from './three.module.min.js';
import { reduceMQ, isLight, readTokens, rng, createRunner, guardContext, clamp } from './common.js';

const DEFAULTS = { accent: '#C6F432', ink: '#FFFFFF', muted: '#8C8C8C' };
const FOV = 35;

export default function mount(el) {
  const light = isLight();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !light, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return false; }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // CSS 색을 그대로 써요
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, light ? 1.5 : 2));
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
  const colorOf = [0, 1, 0, 2, 1]; // 0 라임 · 1 흰색 · 2 회색
  const perCluster = light ? 62 : 150, stray = light ? 34 : 90;
  const pos = [], size = [], col = [];
  centers.forEach((c, k) => {
    for (let i = 0; i < perCluster; i++) {
      pos.push(c[0] + gauss() * spread[k], c[1] + gauss() * spread[k] * 0.9, c[2] + gauss() * spread[k]);
      size.push(3.4 + rand() * 3.6); col.push(colorOf[k]);
    }
  });
  for (let i = 0; i < stray; i++) {
    pos.push(gauss() * 2.1, gauss() * 1.6, gauss() * 1.6);
    size.push(2.4 + rand() * 1.8); col.push(2);
  }

  // --- 재질 ---
  const uni = {
    uPx: { value: renderer.getPixelRatio() }, uPush: { value: 0.16 }, uPtr: { value: new THREE.Vector2(9, 9) },
    uC0: { value: new THREE.Vector3() }, uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() },
  };
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  pg.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  pg.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 1));
  const pm = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `
uniform float uPx, uPush; uniform vec2 uPtr;
attribute float aSize, aCol; varying float vA, vCol;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec2 d = mv.xy - uPtr;
  mv.xy += normalize(d + vec2(1e-4)) * exp(-dot(d, d) * 1.6) * uPush;
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  gl_PointSize = aSize * uPx * (9.0 / depth);
  vA = clamp(1.15 - (depth - 5.0) / 5.5, 0.35, 1.0); // 멀수록 옅게(고정 값, 깜박임 없음)
  vCol = aCol;
}`,
    fragmentShader: `
uniform vec3 uC0, uC1, uC2; varying float vA, vCol;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.3, d);
  if (a < 0.01) discard;
  vec3 c = vCol < 0.5 ? uC0 : (vCol < 1.5 ? uC1 : uC2);
  gl_FragColor = vec4(c, a * vA);
}`,
  });
  root.add(new THREE.Points(pg, pm));

  // --- 색(토큰) ---
  const t = readTokens(el, DEFAULTS);
  const set = (v, c) => v.set(c[0], c[1], c[2]);
  set(uni.uC0.value, t.accent); set(uni.uC1.value, t.ink); set(uni.uC2.value, t.muted);

  // --- 크기 · 위치 ---
  let W = 1, H = 1;
  function resize() {
    const r = el.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const tn = Math.tan((FOV * Math.PI) / 360);
    camera.position.set(0, 0, Math.max(6.6, 2.55 / (tn * camera.aspect)));
    const shift = parseFloat(getComputedStyle(el).getPropertyValue('--3d-hero-shift')) || 0;
    camera.setViewOffset(W, H, -shift * W * 0.5, 0, W, H);
    camera.updateProjectionMatrix();
    uni.uPx.value = renderer.getPixelRatio();
    if (el.dataset.state3d !== 'running') still();
  }
  new ResizeObserver(resize).observe(el);

  // --- 포인터 반응(마우스 · 터치) ---
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

  let spin = 0.6;
  function draw(dt) {
    const k = 1 - Math.exp(-dt * 3.5);
    cur.x += (tgt.x - cur.x) * k; cur.y += (tgt.y - cur.y) * k;
    root.rotation.y = spin + cur.x * 0.22;
    root.rotation.x = 0.16 + cur.y * 0.12;
    const tn = Math.tan((FOV * Math.PI) / 360) * camera.position.z;
    const on = Math.abs(tgt.x) < 1.35 && (tgt.x !== 0 || tgt.y !== 0);
    if (on) uni.uPtr.value.set(cur.x * tn * camera.aspect, -cur.y * tn); else uni.uPtr.value.set(9, 9);
    renderer.render(scene, camera);
  }
  const runner = createRunner(el, {
    frame(dt) { spin += dt * 0.07; draw(dt); },
    still() { draw(0.016); },
  });
  function still() { if (!reduceMQ.matches || el.dataset.state3d === 'still') draw(0.016); }
  guardContext(renderer, runner);
  resize();
  el.classList.add('is-live');
  return true;
}

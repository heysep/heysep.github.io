// 3D 공통 도우미 — 색 읽기(--3d-* 토큰), 기기 판단, 보이는 동안만 도는 루프.
// 스타일은 3d.css 의 토큰만 바꾸면 돼요. 이 파일은 색 값을 직접 갖지 않아요(없을 때 쓸 기본값만).

export const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const lightMQ = matchMedia('(max-width: 860px), (pointer: coarse)');

/** 폭이 좁거나 터치 위주인 기기 → 점 수 · 해상도 · 안티앨리어싱을 줄여요. */
export const isLight = () => lightMQ.matches;

const px = document.createElement('canvas');
px.width = px.height = 1;
const pctx = px.getContext('2d', { willReadFrequently: true });

/** CSS 색 문자열 → [r, g, b, a] (0~1). color-mix 같은 현대 문법도 브라우저가 풀어 줘요. */
export function parseColor(s) {
  pctx.clearRect(0, 0, 1, 1);
  pctx.fillStyle = '#000';
  pctx.fillStyle = s;
  pctx.fillRect(0, 0, 1, 1);
  const d = pctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
}

/** el 에서 --3d-<이름> 을 읽어요. defaults 는 토큰이 없을 때만 써요. */
export function readTokens(el, defaults) {
  const cs = getComputedStyle(el);
  const out = {};
  for (const k in defaults) out[k] = parseColor(cs.getPropertyValue('--3d-' + k).trim() || defaults[k]);
  return out;
}
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** 씨앗이 고정된 난수 — 새로고침해도 같은 모양. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 화면에 보이고 · 탭이 보이고 · 컨텍스트가 살아 있고 · 움직임 줄이기가 아닐 때만 프레임 루프를 돌려요.
 * 그 밖에는 루프를 멈추고(움직임 줄이기면) 정지 화면을 한 번 그려요.
 */
export function createRunner(el, { frame, still }) {
  let vis = false, raf = 0, last = 0, lost = false;
  const want = () => vis && !document.hidden && !lost && !reduceMQ.matches;
  const mark = (s) => { el.dataset.state3d = s; };
  function loop(t) {
    raf = 0;
    if (!want()) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    frame(dt, t / 1000);
    raf = requestAnimationFrame(loop);
  }
  function sync() {
    if (want()) {
      mark('running');
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    } else {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (lost) mark('lost');
      else if (reduceMQ.matches) { mark('still'); if (vis && !document.hidden) still(); }
      else mark('paused');
    }
  }
  const io = new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: '80px' });
  io.observe(el);
  document.addEventListener('visibilitychange', sync);
  reduceMQ.addEventListener('change', sync);
  return {
    sync,
    setLost(v) { lost = v; sync(); },
    destroy() { io.disconnect(); document.removeEventListener('visibilitychange', sync); reduceMQ.removeEventListener('change', sync); if (raf) cancelAnimationFrame(raf); },
  };
}

/** 렌더러에 컨텍스트 손실 · 복구 처리를 달아요. */
export function guardContext(renderer, runner, onRestore) {
  const c = renderer.domElement;
  c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); runner.setLost(true); });
  c.addEventListener('webglcontextrestored', () => { onRestore && onRestore(); runner.setLost(false); });
}

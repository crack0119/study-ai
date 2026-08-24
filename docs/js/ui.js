// 화면 조립용 최소 도우미. 프레임워크 없음.
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** HTML 문자열 → Element */
export function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function render(target, html){
  target.innerHTML = html;
  return target;
}

/** 이벤트 위임 */
export function on(root, selector, type, fn){
  root.addEventListener(type, (e) => {
    const m = e.target.closest(selector);
    if (m && root.contains(m)) fn(e, m);
  });
}

/** XSS 방지용 이스케이프 (사용자가 직접 입력한 다짐/메모 출력에 사용) */
export function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

let toastTimer = null;
export function toast(msg, ms = 2200){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

export function vibrate(pattern){
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* iOS 미지원 */ }
}

/** 알림음 (iOS는 진동이 없으므로 소리로 보완) */
let audioCtx = null;
export function beep(times = 2){
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    for (let i = 0; i < times; i++){
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      const t0 = now + i * 0.45;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 0.4);
    }
  } catch { /* 무음 정책이면 조용히 넘어간다 */ }
}
/** 사용자 제스처 안에서 오디오 컨텍스트를 미리 깨워둔다 */
export function primeAudio(){
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* noop */ }
}

/** 화면 꺼짐 방지 (타이머·수면 오버레이용) */
let wakeLock = null;
export async function keepAwake(want){
  try {
    if (want && 'wakeLock' in navigator && !wakeLock){
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!want && wakeLock){
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* 지원 안 하면 무시 */ }
}

export const overlayEl = () => document.getElementById('overlay');

export function showOverlay(html, { night = false } = {}){
  const o = overlayEl();
  o.className = 'overlay' + (night ? ' night' : '');
  o.innerHTML = html;
  o.hidden = false;
  document.body.style.overflow = 'hidden';
  return o;
}

export function hideOverlay(){
  const o = overlayEl();
  o.hidden = true;
  o.innerHTML = '';
  document.body.style.overflow = '';
}

export const isOverlayOpen = () => !overlayEl().hidden;

/** 진행 링 SVG */
export function ringHtml(id, label){
  const R = 100, C = 2 * Math.PI * R;
  return `<div class="ring" id="${id}">
    <svg viewBox="0 0 220 220" aria-hidden="true">
      <circle class="track" cx="110" cy="110" r="${R}"></circle>
      <circle class="prog" cx="110" cy="110" r="${R}"
              stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"></circle>
    </svg>
    <div class="num">${label}</div>
  </div>`;
}

export function ringUpdate(root, ratio, label){
  const R = 100, C = 2 * Math.PI * R;
  const prog = root.querySelector('.prog');
  if (prog) prog.setAttribute('stroke-dashoffset', String(C * (1 - Math.max(0, Math.min(1, ratio)))));
  const num = root.querySelector('.num');
  if (num && label != null) num.textContent = label;
}

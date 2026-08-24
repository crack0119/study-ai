// 로컬 알림. 서버 푸시가 없으므로 "예약 큐 + 앱이 살아있을 때 발화 + 놓친 건 다음 실행 때 회수" 구조.
import { pendingReminders, markReminder, pruneReminders } from './store.js';
import { toast, beep, vibrate } from './ui.js';
import { MIN } from './lib/date.js';

export const supported = () => 'Notification' in window;
export const permission = () => (supported() ? Notification.permission : 'unsupported');

/** iOS는 홈 화면에 추가된 상태에서만 권한 요청이 뜬다. 반드시 사용자 탭 안에서 호출할 것. */
export async function requestPermission(){
  if (!supported()){
    toast('홈 화면에 추가한 뒤 다시 열 것');
    return 'unsupported';
  }
  try {
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? '알림 켜짐' : '거부됨 · 폰 설정에서 허용');
    return p;
  } catch {
    return Notification.permission;
  }
}

export async function fire(title, body, tag){
  vibrate([200, 100, 200]);
  beep(2);
  if (permission() !== 'granted') { toast(`${title} — ${body}`); return false; }
  const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', renotify: true };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) { await reg.showNotification(title, opts); return true; }
    new Notification(title, opts);
    return true;
  } catch {
    toast(`${title} — ${body}`);
    return false;
  }
}

/* ── 스케줄러 ─────────────────────────────────── */
let timer = null;
const missedHandlers = new Set();
/** 앱이 꺼져 있어 놓친 알림을 화면에 표시하고 싶을 때 구독 */
export const onMissed = (fn) => { missedHandlers.add(fn); return () => missedHandlers.delete(fn); };

const MISSED_AFTER = 60 * MIN;   // 예정 시각보다 1시간 넘게 지났으면 '놓침' 처리

async function tick(){
  let due;
  try { due = await pendingReminders(); } catch { return; }
  const now = Date.now();
  const missed = [];
  for (const r of due){
    if (r.fireAt > now) continue;
    if (now - r.fireAt > MISSED_AFTER){
      await markReminder(r, 'missed');
      missed.push(r);
    } else {
      await fire(r.title, r.body, r.type);
      await markReminder(r, 'fired');
    }
  }
  if (missed.length) missedHandlers.forEach(fn => fn(missed));
}

export function startScheduler(){
  if (timer) return;
  tick();
  timer = setInterval(tick, 20_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('focus', tick);
  pruneReminders().catch(() => {});
}

export const checkNow = tick;

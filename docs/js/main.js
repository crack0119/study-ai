import { getConfig } from './store.js';
import * as router from './router.js';
import * as pomo from './features/pomodoro.js';
import { startGuard } from './features/bedtimeGuard.js';
import { startScheduler, onMissed, fire } from './notify.js';
import { toast } from './ui.js';
import { setPending } from './views/timer.js';

import * as home from './views/home.js';
import * as sleep from './views/sleep.js';
import * as urge from './views/urge.js';
import * as timer from './views/timer.js';
import * as settings from './views/settings.js';

async function boot(){
  // 서비스 워커 (오프라인 + 알림 표시 주체)
  if ('serviceWorker' in navigator){
    try { await navigator.serviceWorker.register('sw.js'); } catch { /* file:// 등에서는 무시 */ }
  }

  await getConfig();

  router.route('home', home);
  router.route('sleep', sleep);
  router.route('urge', urge);
  router.route('timer', timer);
  router.route('settings', settings);

  // 타이머 종료 처리 — 어느 화면에 있든 동작해야 하므로 여기서 잡는다
  pomo.onSessionEnd(async (snap) => {
    if (snap.mode === 'focus'){
      setPending(snap);   // await 이전에 동기로 — 화면 갱신과 경쟁하지 않게
      await fire('집중 완료', `${snap.subject || '공부'} ${Math.round(snap.actualFocusSec / 60)}분 · 집중도 기록`, 'pomo');
      if (router.path() !== 'timer') location.hash = '#/timer'; else router.refresh();
    } else {
      await fire('휴식 끝', '다시 시작', 'pomo');
      if (router.path() === 'timer') router.refresh();
    }
  });

  onMissed((list) => {
    const wake = list.find(r => r.type === 'wake');
    toast(wake ? '기상 알림을 놓쳤다 · 체크인 확인' : `놓친 알림 ${list.length}건`, 3200);
  });

  await router.start();

  document.getElementById('boot').hidden = true;
  document.getElementById('tabbar').hidden = false;

  startScheduler();
  startGuard({ onWakeCheckin: () => router.refresh() });
  pomo.resumeFromStorage();
}

boot().catch((e) => {
  const b = document.getElementById('boot');
  if (b){ b.hidden = false; b.textContent = '시작 실패 · ' + (e?.message || e); }
  console.error(e);
});

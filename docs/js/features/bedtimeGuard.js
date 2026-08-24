// 수면 강제: 취침 목표 30분 전부터 앱 전체를 오버레이로 잠그고, 다짐 문장을 정확히 타이핑해야만 열린다.
import { getConfig, getSleepLog, patchSleepLog, rescheduleByType, judgeSleep } from '../store.js';
import { sleepWindow, humanDur, hhmm, MIN } from '../lib/date.js';
import { showOverlay, hideOverlay, isOverlayOpen, esc, toast, keepAwake, vibrate } from '../ui.js';

const UNLOCK_KEY = 'guard.unlockUntil';
let watching = false;
let onWakeCheckin = null;   // 체크인 후 화면 갱신 콜백

const unlockUntil = () => Number(localStorage.getItem(UNLOCK_KEY) || 0);
const setUnlock = (ts) => localStorage.setItem(UNLOCK_KEY, String(ts));

/** 문장 비교용 정규화 — 앞뒤 공백과 연속 공백만 관대하게 본다. */
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function diffHtml(target, typed){
  const t = [...target], u = [...typed];
  let out = '';
  for (let i = 0; i < t.length; i++){
    const ch = esc(t[i] === ' ' ? ' ' : t[i]);
    if (i >= u.length) out += `<span class="todo">${ch}</span>`;
    else if (u[i] === t[i]) out += `<span class="done">${ch}</span>`;
    else out += `<span class="wrong">${ch}</span>`;
  }
  return out;
}

/* ── 다짐 오버레이 ────────────────────────────── */
async function showPledge(){
  const cfg = await getConfig();
  const log = await getSleepLog();
  const w = sleepWindow(cfg);
  const now = Date.now();
  const late = now >= w.bedtime.getTime();
  const headline = late
    ? `취침 ${humanDur(now - w.bedtime.getTime())} 지남`
    : `취침 ${humanDur(w.bedtime.getTime() - now)} 전`;

  const o = showOverlay(`
    <div class="ovl-top">
      <div class="ovl-meta">
        <span class="num">${esc(hhmm(new Date()))}</span>
        <span class="num">목표 ${esc(cfg.bedtime)}</span>
      </div>
      <h1 class="ovl-title" style="margin-top:14px">${esc(headline)}</h1>
      <p class="ovl-lead">아래 문장을 그대로 입력해야 열린다.${
        log.pledgeCount > 0 ? ` 오늘 밤 <span style="color:var(--warn)">${log.pledgeCount}번째</span> 미루는 중.` : ''
      }</p>

      <div class="pledge" id="pledgeTarget">${diffHtml(cfg.pledgeText, '')}</div>
      <div class="pledge-bar"><i id="pledgeBar"></i></div>
      <textarea class="in" id="pledgeInput" rows="3" placeholder="여기에 그대로"
        autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"></textarea>
      <p class="cap" id="pledgeHint" style="margin-top:9px">&nbsp;</p>
    </div>
    <div class="ovl-bottom">
      <button class="b b--solid b--big" id="btnSleepNow" disabled>잔다</button>
      <button class="b b--quiet" id="btnDelay" disabled>${cfg.relockMin}분만 더</button>
    </div>
  `);

  const input = o.querySelector('#pledgeInput');
  const targetBox = o.querySelector('#pledgeTarget');
  const bar = o.querySelector('#pledgeBar');
  const btnSleep = o.querySelector('#btnSleepNow');
  const btnDelay = o.querySelector('#btnDelay');
  const hint = o.querySelector('#pledgeHint');
  const totalLen = [...norm(cfg.pledgeText)].length;

  const sync = () => {
    const typed = input.value;
    targetBox.innerHTML = diffHtml(cfg.pledgeText, typed);
    const ok = norm(typed) === norm(cfg.pledgeText);
    const n = [...norm(typed)].length;
    btnSleep.disabled = !ok;
    btnDelay.disabled = !ok;
    bar.style.width = `${Math.min(100, (n / Math.max(1, totalLen)) * 100)}%`;
    hint.innerHTML = ok ? '&nbsp;'
      : (targetBox.querySelector('.no') ? '틀린 글자가 있다' : `${n} / ${totalLen}`);
  };
  input.addEventListener('input', sync);
  sync();

  btnSleep.addEventListener('click', async () => {
    if (btnSleep.disabled) return;
    await patchSleepLog(log.date, {
      pledgeTypedAt: Date.now(),
      sleepCheckinAt: Date.now(),
      overlayShownAt: log.overlayShownAt ?? Date.now(),
    });
    setUnlock(0);
    await scheduleWake();
    vibrate(50);
    await showNightLock();
  });

  btnDelay.addEventListener('click', async () => {
    if (btnDelay.disabled) return;
    await patchSleepLog(log.date, {
      pledgeTypedAt: Date.now(),
      pledgeCount: (log.pledgeCount || 0) + 1,
      overlayShownAt: log.overlayShownAt ?? Date.now(),
    });
    setUnlock(Date.now() + (cfg.relockMin || 10) * MIN);
    hideOverlay();
    toast(`${cfg.relockMin}분 뒤 다시 잠긴다`);
  });

  if (!log.overlayShownAt) await patchSleepLog(log.date, { overlayShownAt: Date.now() });
}

/* ── 취침 체크인 후 잠금 화면 ─────────────────── */
export async function showNightLock(){
  const cfg = await getConfig();
  const log = await getSleepLog();
  const w = sleepWindow(cfg);
  const wakeTs = log.wakeTarget || w.wake.getTime();
  const canCheckin = Date.now() >= wakeTs - 30 * MIN;

  const o = showOverlay(`
    <div class="ovl-top" style="display:flex;flex-direction:column;justify-content:center;text-align:center">
      <div class="nightclock">${esc(hhmm(new Date()))}</div>
      <p class="cap num" style="margin-top:14px">기상 ${esc(cfg.wakeTime)}</p>
      <p class="ovl-lead" style="margin-top:34px">여기서 끝.</p>
    </div>
    <div class="ovl-bottom">
      <button class="b b--solid b--big" id="btnWake" ${canCheckin ? '' : 'disabled'}>
        ${canCheckin ? '기상 체크인' : `기상 체크인 · ${esc(hhmm(new Date(wakeTs - 30 * MIN)))}부터`}
      </button>
      <button class="b b--quiet" id="btnReopen">다시 열기</button>
      <p class="cap" style="text-align:center">다시 열려면 문장을 처음부터 입력해야 한다.</p>
    </div>
  `);

  o.querySelector('#btnWake').addEventListener('click', () => wakeCheckin());
  o.querySelector('#btnReopen').addEventListener('click', async () => {
    await patchSleepLog(log.date, { sleepCheckinAt: null });
    await showPledge();
  });
}

/* ── 기상 ─────────────────────────────────────── */
export async function scheduleWake(){
  const cfg = await getConfig();
  const log = await getSleepLog();
  const w = sleepWindow(cfg);
  const wakeTs = log.wakeTarget || w.wake.getTime();

  // 취침 잠금 시작 알림 (앱이 켜져 있을 때만 울린다 — 꺼져 있으면 다음 실행 때 '놓침'으로 회수)
  const guardTs = w.guardStart.getTime();
  if (guardTs > Date.now() && !log.sleepCheckinAt){
    await rescheduleByType('bedtime', {
      fireAt: guardTs,
      title: '취침 준비',
      body: `${cfg.warnLeadMin}분 뒤 ${cfg.bedtime} 취침. 지금부터 앱이 잠깁니다.`,
    });
  }

  if (wakeTs <= Date.now() || log.wakeCheckinAt) return;
  await rescheduleByType('wake', {
    fireAt: wakeTs,
    title: '기상 시간입니다',
    body: '앱을 열고 기상 체크인을 눌러야 스트릭이 유지됩니다.',
  });
}

export async function wakeCheckin(){
  const log = await getSleepLog();
  if (log.wakeCheckinAt){ toast('이미 체크인함'); return log; }
  const saved = await patchSleepLog(log.date, { wakeCheckinAt: Date.now() });
  await rescheduleByType('wake', null);      // 이미 일어났으니 예약 알림 취소
  await rescheduleByType('bedtime', null);
  setUnlock(0);
  hideOverlay();
  keepAwake(false);
  const j = judgeSleep(saved);
  vibrate([80, 60, 80]);
  toast(j.wakeOk ? `기상 체크인 · 연속 유지` : '체크인 완료 · 목표보다 늦음');
  onWakeCheckin?.();
  return saved;
}

/* ── 감시 루프 ────────────────────────────────── */
export async function check(){
  const cfg = await getConfig();
  const w = sleepWindow(cfg);
  const log = await getSleepLog();

  if (!w.inGuard){
    if (isOverlayOpen() && document.getElementById('pledgeInput')) hideOverlay();
    if (isOverlayOpen() && document.getElementById('btnWake') && log.wakeCheckinAt) hideOverlay();
    return;
  }
  if (log.wakeCheckinAt) return;                     // 오늘 밤은 끝났다
  if (isOverlayOpen()) return;                       // 이미 잠김 (숏폼 마찰 화면 포함)
  if (log.sleepCheckinAt){ await showNightLock(); return; }
  if (Date.now() < unlockUntil()) return;            // 다짐으로 산 유예 시간
  await showPledge();
}

export function startGuard(opts = {}){
  onWakeCheckin = opts.onWakeCheckin || null;
  if (watching) return;
  watching = true;
  check();
  setInterval(check, 30_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('focus', check);
  scheduleWake().catch(() => {});
}

/** 지금 취침 잠금 시간대인지 (다른 모듈이 참조) */
export async function inGuardNow(){
  return sleepWindow(await getConfig()).inGuard;
}

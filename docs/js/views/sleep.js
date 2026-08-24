import { getConfig, getSleepLog, patchSleepLog, sleepLogsBetween, judgeSleep, sleepStreak } from '../store.js';
import { sleepWindow, humanDur, hhmm, lastDays, fromYmd, MIN } from '../lib/date.js';
import { esc, toast, isOverlayOpen } from '../ui.js';
import { showNightLock, wakeCheckin, scheduleWake, check } from '../features/bedtimeGuard.js';
import { permission, requestPermission } from '../notify.js';
import { refresh } from '../router.js';

const WD = ['일','월','화','수','목','금','토'];

export async function render(root){
  const cfg = await getConfig();
  const [log, streak] = await Promise.all([getSleepLog(), sleepStreak()]);
  const w = sleepWindow(cfg);
  const j = judgeSleep(log);
  const now = Date.now();

  const keys = lastDays(8, cfg.dayCutoffHour);
  const logs = await sleepLogsBetween(keys[0], keys[keys.length - 1]);
  const byDate = new Map(logs.map(l => [l.date, l]));
  const canWake = !log.wakeCheckinAt && now >= log.wakeTarget - 30 * MIN;

  const cell = (k, ts, ok) => `
    <div>
      <div class="m-k">${k}</div>
      <div class="m-v num"${ts && !ok ? ' style="color:var(--warn)"' : ''}>${ts ? esc(hhmm(new Date(ts))) : '—'}</div>
    </div>`;

  root.innerHTML = `
    <div class="head">
      <h1 class="t1">수면</h1>
      <p class="cap num">연속 ${streak}일</p>
    </div>

    ${permission() !== 'granted' ? `
      <div class="note" style="margin-bottom:18px">
        기상 알림은 <b>홈 화면에 추가한 앱</b>에서만 뜬다.
        <button class="b b--sm" id="btnPerm" style="margin-top:10px;width:auto">알림 켜기</button>
      </div>` : ''}

    <div class="panel">
      <div class="ovl-meta">
        <span>오늘 밤</span>
        <span class="num">${esc(hhmm(w.guardStart))}부터 잠금</span>
      </div>
      <div class="split">
        ${cell('취침', log.sleepCheckinAt, j.bedOk)}
        <div>
          <div class="m-k">수면</div>
          <div class="m-v num">${j.durationMs ? esc(humanDur(j.durationMs)) : '—'}</div>
        </div>
        ${cell('기상', log.wakeCheckinAt, j.wakeOk)}
      </div>
      ${log.pledgeCount ? `<p class="cap" style="margin-top:6px">오늘 밤 ${log.pledgeCount}번 미룸</p>` : ''}
      <div class="b-stack" style="margin-top:16px">
        ${!log.sleepCheckinAt ? `<button class="b b--solid" id="btnSleepNow">잔다</button>` : ''}
        ${canWake ? `<button class="b ${log.sleepCheckinAt ? 'b--solid' : ''}" id="btnWake">기상 체크인</button>` : ''}
        ${log.wakeCheckinAt ? `<div class="cap" style="text-align:center;color:var(--${j.success ? 'good' : 'bad'})">
          오늘 밤 ${j.success ? '성공' : '실패'}</div>` : ''}
      </div>
    </div>

    <div class="sec">
      <p class="lbl">지난 7일</p>
      <div>
        ${keys.slice(0, 7).reverse().map(k => {
          const l = byDate.get(k);
          const jj = l ? judgeSleep(l) : null;
          const d = fromYmd(k);
          const tone = !l ? 'off' : jj.success ? 'good' : (jj.bedOk || jj.wakeOk) ? 'warn' : 'bad';
          const times = l
            ? `${l.sleepCheckinAt ? hhmm(new Date(l.sleepCheckinAt)) : '--:--'} → ${l.wakeCheckinAt ? hhmm(new Date(l.wakeCheckinAt)) : '--:--'}`
            : '기록 없음';
          return `<div class="log">
            <i class="r-mark ${tone}"></i>
            <div class="log-body">
              <div class="log-top">
                <span class="log-t num">${d.getMonth() + 1}/${d.getDate()} (${WD[d.getDay()]})</span>
                <span class="log-time">${jj?.durationMs ? esc(humanDur(jj.durationMs)) : ''}</span>
              </div>
              <p class="log-meta num">${esc(times)}</p>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="sec">
      <p class="lbl">잠금 규칙</p>
      <div class="note">
        <b>${esc(hhmm(w.guardStart))}</b>부터 앱 전체가 잠긴다.<br>
        다짐 문장을 정확히 입력해야 열리고, <b>${cfg.relockMin}분</b> 뒤 다시 잠긴다.<br>
        취침 +30분 · 기상 +20분 안에 체크인해야 그날 성공.
      </div>
      <button class="b b--sm" id="btnPreview" style="margin-top:14px;width:auto">잠금 미리보기</button>
    </div>
  `;

  root.querySelector('#btnPerm')?.addEventListener('click', async () => { await requestPermission(); refresh(); });

  root.querySelector('#btnSleepNow')?.addEventListener('click', async () => {
    await patchSleepLog(log.date, { sleepCheckinAt: Date.now() });
    await scheduleWake();
    await showNightLock();
  });

  root.querySelector('#btnWake')?.addEventListener('click', async () => { await wakeCheckin(); refresh(); });

  root.querySelector('#btnPreview')?.addEventListener('click', async () => {
    await check();
    if (!isOverlayOpen()) toast('지금은 잠금 시간대가 아니다');
  });
}

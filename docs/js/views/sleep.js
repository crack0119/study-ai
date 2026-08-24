import { getConfig, getSleepLog, patchSleepLog, sleepLogsBetween, judgeSleep, sleepStreak } from '../store.js';
import { sleepWindow, humanDur, hhmm, lastDays, fromYmd, MIN } from '../lib/date.js';
import { esc, toast, isOverlayOpen } from '../ui.js';
import { showNightLock, wakeCheckin, scheduleWake, check } from '../features/bedtimeGuard.js';
import { permission, requestPermission } from '../notify.js';
import { refresh } from '../router.js';

export async function render(root){
  const cfg = await getConfig();
  const [log, streak] = await Promise.all([getSleepLog(), sleepStreak()]);
  const w = sleepWindow(cfg);
  const now = Date.now();
  const j = judgeSleep(log);

  const keys = lastDays(8, cfg.dayCutoffHour);
  const logs = await sleepLogsBetween(keys[0], keys[keys.length - 1]);
  const byDate = new Map(logs.map(l => [l.date, l]));

  const canWake = !log.wakeCheckinAt && now >= log.wakeTarget - 30 * MIN;

  root.innerHTML = `
    <h1>수면</h1>
    <p class="sub">연속 성공 ${streak}일 · 목표 ${esc(cfg.bedtime)} → ${esc(cfg.wakeTime)}</p>

    ${permission() !== 'granted' ? `
      <div class="notice" style="margin-bottom:12px">
        기상 알림을 받으려면 알림 권한이 필요합니다.
        <b>홈 화면에 추가한 앱</b>에서만 권한 요청이 뜹니다 (iOS 16.4+).
        <button class="btn sm" id="btnPerm" style="margin-top:10px">알림 켜기</button>
      </div>` : ''}

    <div class="card">
      <div class="row between">
        <div class="muted">오늘 밤</div>
        <div class="faint">잠금 시작 ${esc(hhmm(w.guardStart))}</div>
      </div>
      <div class="row between" style="margin-top:12px">
        <div>
          <div class="faint">취침</div>
          <div class="big" style="font-size:26px">${log.sleepCheckinAt ? esc(hhmm(new Date(log.sleepCheckinAt))) : '—'}</div>
        </div>
        <div style="text-align:center">
          <div class="faint">수면</div>
          <div class="big" style="font-size:26px">${j.durationMs ? esc(humanDur(j.durationMs)) : '—'}</div>
        </div>
        <div style="text-align:right">
          <div class="faint">기상</div>
          <div class="big" style="font-size:26px">${log.wakeCheckinAt ? esc(hhmm(new Date(log.wakeCheckinAt))) : '—'}</div>
        </div>
      </div>
      ${log.pledgeCount ? `<p class="faint" style="margin-top:10px">오늘 밤 다짐 후 미룸 ${log.pledgeCount}회</p>` : ''}
      <div style="display:grid;gap:8px;margin-top:14px">
        ${!log.sleepCheckinAt ? `<button class="btn primary" id="btnSleepNow">지금 잔다 (잠금)</button>` : ''}
        ${canWake ? `<button class="btn ${log.sleepCheckinAt ? '' : 'primary'}" id="btnWake">기상 체크인</button>` : ''}
        ${log.wakeCheckinAt ? `<div class="faint" style="text-align:center">오늘 밤 판정 완료 — ${j.success ? '성공' : '실패'}</div>` : ''}
      </div>
    </div>

    <h2>최근 7일</h2>
    <div class="list">
      ${keys.slice(0, 7).reverse().map(k => {
        const l = byDate.get(k);
        const jj = l ? judgeSleep(l) : null;
        const d = fromYmd(k);
        const label = `${d.getMonth() + 1}/${d.getDate()} (${'일월화수목금토'[d.getDay()]})`;
        const cls = !l ? 'off' : jj.success ? 'good' : (jj.bedOk || jj.wakeOk) ? 'warn' : 'bad';
        const detail = !l ? '기록 없음'
          : `${l.sleepCheckinAt ? hhmm(new Date(l.sleepCheckinAt)) : '--:--'} → ${l.wakeCheckinAt ? hhmm(new Date(l.wakeCheckinAt)) : '--:--'}` +
            (jj.durationMs ? ` · ${humanDur(jj.durationMs)}` : '');
        return `<div class="item row between">
          <div><span class="dot ${cls}"></span> <b style="margin-left:6px">${esc(label)}</b></div>
          <div class="faint">${esc(detail)}</div>
        </div>`;
      }).join('')}
    </div>

    <h2>규칙</h2>
    <div class="card tight">
      <p class="muted" style="font-size:13px;line-height:1.7;margin:0">
        · ${esc(cfg.bedtime)} <b>${cfg.warnLeadMin}분 전</b>부터 앱 전체가 잠깁니다.<br>
        · 다짐 문장을 정확히 타이핑해야 열립니다. 열어도 ${cfg.relockMin}분 뒤 다시 잠깁니다.<br>
        · 취침 체크인이 목표 +30분 이내, 기상 체크인이 목표 +20분 이내여야 <b>그날 성공</b>입니다.
      </p>
      <button class="btn sm ghost" id="btnPreview" style="margin-top:12px">잠금 화면 미리보기</button>
    </div>
  `;

  root.querySelector('#btnPerm')?.addEventListener('click', async () => {
    await requestPermission();
    refresh();
  });

  root.querySelector('#btnSleepNow')?.addEventListener('click', async () => {
    await patchSleepLog(log.date, { sleepCheckinAt: Date.now() });
    await scheduleWake();
    toast('잘 자요. 기상 체크인 전까지 잠깁니다.');
    await showNightLock();
  });

  root.querySelector('#btnWake')?.addEventListener('click', async () => {
    await wakeCheckin();
    refresh();
  });

  root.querySelector('#btnPreview')?.addEventListener('click', async () => {
    await check();
    if (!isOverlayOpen()) toast('지금은 잠금 시간대가 아닙니다.');
  });
}

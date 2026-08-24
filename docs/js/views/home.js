import { getConfig, getSleepLog, judgeSleep } from '../store.js';
import { summary, peakHourText } from '../features/stats.js';
import { sleepWindow, humanDur, hhmm, MIN } from '../lib/date.js';
import { esc } from '../ui.js';
import { startUrgeFlow } from '../features/urgeFlow.js';
import { wakeCheckin } from '../features/bedtimeGuard.js';
import { refresh } from '../router.js';

export async function render(root){
  const cfg = await getConfig();
  const [log, s] = await Promise.all([getSleepLog(), summary(7)]);
  const w = sleepWindow(cfg);
  const j = judgeSleep(log);
  const now = Date.now();

  const untilBed = w.bedtime.getTime() - now;
  const bedLine = log.sleepCheckinAt
    ? `취침 체크인 ${hhmm(new Date(log.sleepCheckinAt))}`
    : untilBed > 0 ? `취침까지 ${humanDur(untilBed)}` : `취침 시각 ${humanDur(-untilBed)} 초과`;

  const canWake = !log.wakeCheckinAt && now >= log.wakeTarget - 30 * MIN;
  const focusH = s.study.focusSec / 3600;
  const peak = peakHourText(s.urge.byHour);

  root.innerHTML = `
    <h1>오늘</h1>
    <p class="sub">${esc(new Date().toLocaleDateString('ko-KR', { month:'long', day:'numeric', weekday:'long' }))}</p>

    <div class="card">
      <div class="row between">
        <div>
          <div class="k muted">수면 스트릭</div>
          <div class="big">${s.streak}<span class="u muted" style="font-size:16px">일</span></div>
        </div>
        <div style="text-align:right">
          <div class="muted">${esc(bedLine)}</div>
          <div class="faint">목표 ${esc(cfg.bedtime)} → ${esc(cfg.wakeTime)}</div>
          <div class="faint" style="margin-top:6px">
            <span class="dot ${log.sleepCheckinAt ? (j.bedOk ? 'good' : 'warn') : 'off'}"></span> 취침
            &nbsp;<span class="dot ${log.wakeCheckinAt ? (j.wakeOk ? 'good' : 'warn') : 'off'}"></span> 기상
          </div>
        </div>
      </div>
      ${canWake ? `<button class="btn primary" id="btnWakeHome" style="margin-top:14px">기상 체크인</button>` : ''}
    </div>

    <button class="btn danger lg" id="btnUrge" style="margin:14px 0 4px">숏폼 켜고 싶다</button>
    <p class="faint" style="text-align:center;margin-bottom:16px">누르면 60초 대기 + 이유 기록부터 시작합니다.</p>

    <h2>최근 7일</h2>
    <div class="grid2">
      <div class="stat"><div class="k">수면 성공</div><div class="v">${s.sleep.success}<span class="u">/ ${s.sleep.logged || 0}일</span></div></div>
      <div class="stat"><div class="k">평균 수면</div><div class="v">${s.sleep.avgDurationMs ? esc(humanDur(s.sleep.avgDurationMs)) : '—'}</div></div>
      <div class="stat"><div class="k">공부</div><div class="v">${focusH.toFixed(1)}<span class="u">시간 · ${s.study.sessions}세션</span></div></div>
      <div class="stat"><div class="k">숏폼 충동</div><div class="v">${s.urge.total}<span class="u">회 · 참음 ${s.urge.resisted}</span></div></div>
    </div>
    ${peak ? `<p class="faint" style="margin-top:10px">충동 패턴: ${esc(peak)}</p>` : ''}

    <h2>바로 하기</h2>
    <div class="grid2">
      <a class="btn" href="#/timer?auto=1">${cfg.pomodoro.focus}분 타이머</a>
      <a class="btn" href="#/sleep">수면 기록</a>
    </div>
  `;

  root.querySelector('#btnUrge').addEventListener('click', () => {
    startUrgeFlow({ onDone: refresh });
  });
  root.querySelector('#btnWakeHome')?.addEventListener('click', async () => {
    await wakeCheckin();
    refresh();
  });
}

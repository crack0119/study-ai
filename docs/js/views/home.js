import { getConfig, getSleepLog, judgeSleep } from '../store.js';
import { summary, peakRangeText } from '../features/stats.js';
import { sleepWindow, humanDur, hhmm, MIN } from '../lib/date.js';
import { esc } from '../ui.js';
import { startUrgeFlow } from '../features/urgeFlow.js';
import { wakeCheckin } from '../features/bedtimeGuard.js';
import { refresh } from '../router.js';

const WD = ['일','월','화','수','목','금','토'];

export async function render(root){
  const cfg = await getConfig();
  const [log, s] = await Promise.all([getSleepLog(), summary(7)]);
  const w = sleepWindow(cfg);
  const j = judgeSleep(log);
  const now = Date.now();
  const d = new Date();

  const canWake = !log.wakeCheckinAt && log.sleepCheckinAt && now >= log.wakeTarget - 30 * MIN;
  const untilBed = w.bedtime.getTime() - now;

  // 상황에 따라 한 줄만 바뀐다
  let statusK = '취침까지', statusV = humanDur(untilBed), statusTone = '';
  if (log.wakeCheckinAt){ statusK = '오늘 밤'; statusV = j.success ? '성공' : '실패'; statusTone = j.success ? 'good' : 'bad'; }
  else if (log.sleepCheckinAt){ statusK = '기상까지'; statusV = humanDur(Math.max(0, log.wakeTarget - now)); }
  else if (untilBed < 0){ statusK = '취침 지남'; statusV = humanDur(-untilBed); statusTone = 'bad'; }
  else if (untilBed < 30 * MIN){ statusTone = 'warn'; }

  const mark = (ts, ok) => ts
    ? `<span style="color:var(--${ok ? 'fg' : 'warn'})">${esc(hhmm(new Date(ts)))}</span>`
    : `<span style="color:var(--fg-3)">—</span>`;

  const avg = s.sleep.avgDurationMs;
  const avgH = avg ? Math.floor(avg / 3600000) : 0;
  const avgM = avg ? Math.round((avg % 3600000) / 60000) : 0;
  const peak = peakRangeText(s.urge.byHour);

  root.innerHTML = `
    <div class="head">
      <h1 class="t1">오늘</h1>
      <p class="cap num">${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})</p>
    </div>

    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
        <div>
          <p class="lbl">연속</p>
          <div class="d1" style="margin-top:6px">${s.streak}<small>일</small></div>
        </div>
        <div style="text-align:right">
          <p class="lbl">오늘 밤</p>
          <div class="num" style="margin-top:7px;font-size:15px;font-weight:500">
            ${esc(cfg.bedtime)} <span style="color:var(--fg-3)">→</span> ${esc(cfg.wakeTime)}
          </div>
          <div class="cap num" style="margin-top:7px">
            취침 ${mark(log.sleepCheckinAt, j.bedOk)} &nbsp; 기상 ${mark(log.wakeCheckinAt, j.wakeOk)}
          </div>
        </div>
      </div>
      <hr class="rule" style="margin-top:17px">
      <div class="r" style="border:0;padding:13px 0 0">
        <span class="r-k">${esc(statusK)}</span>
        <span class="r-v"${statusTone ? ` style="color:var(--${statusTone})"` : ''}>${esc(statusV)}</span>
      </div>
    </div>

    <div class="b-stack" style="margin-top:20px">
      ${canWake ? `<button class="b b--solid b--big" id="btnWake">기상 체크인</button>` : ''}
      <button class="b ${canWake ? '' : 'b--solid'} b--big" id="btnUrge">60초 버티기</button>
    </div>
    <p class="cap" style="text-align:center;margin-top:9px">인스타·틱톡에 손이 갈 때</p>

    <div class="sec">
      <p class="lbl">지난 7일</p>
      <div class="metrics">
        <div>
          <div class="m-k">수면 성공</div>
          <div class="m-v">${s.sleep.success}<small>/ ${s.sleep.logged}일</small></div>
        </div>
        <div>
          <div class="m-k">평균 수면</div>
          <div class="m-v">${avg ? `${avgH}<small>시간</small> ${avgM}<small>분</small>` : '—'}</div>
        </div>
        <div>
          <div class="m-k">공부</div>
          <div class="m-v">${(s.study.focusSec / 3600).toFixed(1)}<small>시간</small></div>
        </div>
        <div>
          <div class="m-k">충동</div>
          <div class="m-v">${s.urge.total}<small>회</small></div>
        </div>
      </div>
      ${(peak || s.urge.gaveIn) ? `<p class="cap" style="margin-top:11px">${
        [peak ? `충동은 ${esc(peak)}에 몰린다` : '',
         s.urge.gaveIn ? `그냥 본 건 <span style="color:var(--bad)">${s.urge.gaveIn}회</span>` : '']
          .filter(Boolean).join(' · ')}</p>` : ''}
    </div>

    <div class="sec">
      <div class="rows">
        <a class="r r--link" href="#/timer?auto=1">
          <span class="r-k">${cfg.pomodoro.focus}분 집중 시작</span><span class="r-v sm"></span>
        </a>
        <a class="r r--link" href="#/urge">
          <span class="r-k">충동 기록 보기</span><span class="r-v sm"></span>
        </a>
        <a class="r r--link" href="#/sleep">
          <span class="r-k">수면 기록 보기</span><span class="r-v sm"></span>
        </a>
      </div>
    </div>
  `;

  root.querySelector('#btnUrge').addEventListener('click', () => startUrgeFlow({ onDone: refresh }));
  root.querySelector('#btnWake')?.addEventListener('click', async () => { await wakeCheckin(); refresh(); });
}

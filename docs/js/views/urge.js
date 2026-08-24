import { getConfig } from '../store.js';
import { summary, peakRangeText } from '../features/stats.js';
import { esc } from '../ui.js';
import { hhmm, dayKey } from '../lib/date.js';
import { startUrgeFlow } from '../features/urgeFlow.js';
import { refresh } from '../router.js';

const CTX = { study: '공부 직후', late_night: '새벽', idle: '빈 시간' };
const OUT = { resisted: '버팀', replaced: '대체', gave_in: '봄' };
const TONE = { resisted: 'off', replaced: 'off', gave_in: 'bad' };
const REP = { stretch: '스트레칭', walk: '걷기', water: '물·세수', study: '집중' };

export async function render(root){
  const cfg = await getConfig();
  const s = await summary(7);
  const todayKey = dayKey(Date.now(), cfg.dayCutoffHour);
  const today = s.urge.list.filter(u => u.date === todayKey).length;
  const max = Math.max(1, ...s.urge.byHour);
  const peak = peakRangeText(s.urge.byHour);
  const peakCount = peak
    ? s.urge.byHour.reduce((a, n, h) => {
        const start = Number(peak.split('–')[0]);
        return a + ([0,1,2].some(k => (start + k) % 24 === h) ? n : 0);
      }, 0)
    : 0;

  root.innerHTML = `
    <div class="head">
      <h1 class="t1">충동</h1>
      <p class="cap num">오늘 ${today}회 · 7일 ${s.urge.total}회</p>
    </div>

    <button class="b b--solid b--big" id="btnUrge">60초 버티기</button>
    <p class="cap" style="text-align:center;margin-top:9px">인스타·틱톡에 손이 갈 때</p>

    <div class="sec">
      <p class="lbl">시간대 · 지난 7일</p>
      <div class="bars">
        ${s.urge.byHour.map((n, h) => {
          const cls = n === 0 ? '' : n === max ? 'peak' : n >= max / 2 ? 'mid' : 'on';
          return `<i class="${cls}" style="height:${Math.max(2, Math.round((n / max) * 100))}%"></i>`;
        }).join('')}
      </div>
      <div class="bars-axis"><span>0</span><span>6</span><span>12</span><span>18</span><span>23시</span></div>
      ${peak
        ? `<p class="cap" style="margin-top:12px">${esc(peak)}에 ${s.urge.total}회 중 <span class="hl">${peakCount}회</span></p>`
        : `<p class="cap" style="margin-top:12px">기록이 쌓이면 패턴이 보인다</p>`}
    </div>

    <div class="sec">
      <div class="metrics">
        <div><div class="m-k">버티거나 대체함</div><div class="m-v">${s.urge.resisted}<small>회</small></div></div>
        <div><div class="m-k">그냥 봄</div>
          <div class="m-v"${s.urge.gaveIn ? ' style="color:var(--bad)"' : ''}>${s.urge.gaveIn}<small>회</small></div></div>
      </div>
    </div>

    ${s.urge.byContext.length ? `
      <div class="sec">
        <p class="lbl">상황</p>
        <div class="chips">
          ${s.urge.byContext.map(([k, n]) =>
            `<span class="chip chip--static">${esc(CTX[k] || k)}<b>${n}</b></span>`).join('')}
        </div>
      </div>` : ''}

    ${s.urge.byEmotion.length ? `
      <div class="sec">
        <p class="lbl">감정</p>
        <div class="chips">
          ${s.urge.byEmotion.map(([k, n]) =>
            `<span class="chip chip--static">${esc(k)}<b>${n}</b></span>`).join('')}
        </div>
      </div>` : ''}

    <div class="sec">
      <p class="lbl">기록</p>
      <div>
        ${s.urge.list.slice(0, 8).map(u => `
          <div class="log">
            <i class="r-mark ${TONE[u.outcome] || 'off'}"></i>
            <div class="log-body">
              <div class="log-top">
                <span class="log-t">${esc(u.emotion || '미기록')}
                  <span style="color:var(--fg-3);font-weight:400">· ${esc(OUT[u.outcome] || '')}${
                    u.replacement ? ` ${esc(REP[u.replacement] || u.replacement)}` : ''}</span></span>
                <span class="log-time">${esc(u.date.slice(5).replace('-', '/'))} ${esc(hhmm(new Date(u.ts)))}</span>
              </div>
              ${u.reason ? `<p class="log-sub">${esc(u.reason)}</p>` : ''}
              <p class="log-meta">${esc(CTX[u.contextBefore] || '')}</p>
            </div>
          </div>`).join('') || `<p class="empty">아직 기록 없음. 손이 갈 때 위 버튼을 누른다.</p>`}
      </div>
    </div>

    <div class="sec">
      <div class="note">
        앱 자체를 막는 건 iPhone <b>스크린타임 → 앱 시간 제한</b>,
        Android <b>디지털 웰빙 → 앱 타이머</b>.<br>
        여기는 그 앞에 세우는 마찰 장치다.
      </div>
    </div>
  `;

  root.querySelector('#btnUrge').addEventListener('click', () => startUrgeFlow({ onDone: refresh }));
}

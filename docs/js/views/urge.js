import { getConfig } from '../store.js';
import { summary, peakHourText } from '../features/stats.js';
import { esc } from '../ui.js';
import { hhmm, lastDays, dayKey } from '../lib/date.js';
import { startUrgeFlow } from '../features/urgeFlow.js';
import { refresh } from '../router.js';

const CTX_LABEL = { study: '공부 직후', late_night: '새벽·심야', idle: '빈 시간' };
const OUT_LABEL = { resisted: '참음', replaced: '대체 행동', gave_in: '봄' };
const OUT_DOT   = { resisted: 'good', replaced: 'good', gave_in: 'bad' };

export async function render(root){
  const cfg = await getConfig();
  const s = await summary(7);
  const todayKey = dayKey(Date.now(), cfg.dayCutoffHour);
  const todayList = s.urge.list.filter(u => u.date === todayKey);
  const max = Math.max(1, ...s.urge.byHour);
  const peak = peakHourText(s.urge.byHour);
  const days = lastDays(7, cfg.dayCutoffHour);

  root.innerHTML = `
    <h1>숏폼 억제</h1>
    <p class="sub">오늘 ${todayList.length}회 · 최근 7일 ${s.urge.total}회</p>

    <button class="btn danger lg" id="btnUrge">숏폼 켜고 싶다</button>
    <p class="faint" style="text-align:center;margin:8px 0 18px">
      ${cfg.urgeWaitSec}초 대기 → 감정·이유 기록 → 대체 행동
    </p>

    <div class="notice">
      이 앱은 인스타·틱톡 <b>앱 자체를 막지 못합니다</b>. 진짜 차단은
      iPhone <b>설정 → 스크린타임 → 앱 시간 제한</b>,
      Android <b>설정 → 디지털 웰빙 → 앱 타이머</b>에서 걸어두세요.
      여기는 그 앞에 세우는 마찰 장치이자 패턴 기록기입니다.
    </div>

    <h2>언제 무너지는가 (최근 7일)</h2>
    <div class="card">
      <div class="bars">
        ${s.urge.byHour.map((n, h) => {
          const pct = Math.round((n / max) * 100);
          const cls = n === 0 ? '' : n === max ? 'hot' : n >= max / 2 ? 'mid' : '';
          return `<div class="b ${cls}" style="height:${Math.max(3, pct)}%" title="${h}시 ${n}회"></div>`;
        }).join('')}
      </div>
      <div class="barlabels faint"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div>
      ${peak ? `<p class="muted" style="margin-top:12px;font-size:13px">${esc(peak)}</p>` : `<p class="faint" style="margin-top:12px">아직 기록이 없습니다.</p>`}
    </div>

    <div class="grid2">
      <div class="stat"><div class="k">참거나 대체함</div><div class="v">${s.urge.resisted}<span class="u">회</span></div></div>
      <div class="stat"><div class="k">그래도 봄</div><div class="v">${s.urge.gaveIn}<span class="u">회</span></div></div>
    </div>

    ${s.urge.byContext.length ? `<h2>상황</h2><div class="card tight">
      ${s.urge.byContext.map(([k, n]) => `<div class="row between" style="padding:6px 0">
        <span class="muted">${esc(CTX_LABEL[k] || k)}</span><span class="mono">${n}회</span></div>`).join('')}
    </div>` : ''}

    ${s.urge.byEmotion.length ? `<h2>감정</h2><div class="chips">
      ${s.urge.byEmotion.map(([k, n]) => `<span class="chip" style="cursor:default">${esc(k)} ${n}</span>`).join('')}
    </div>` : ''}

    <h2>일별</h2>
    <div class="card tight">
      ${days.map(k => {
        const n = s.urge.list.filter(u => u.date === k).length;
        const gi = s.urge.list.filter(u => u.date === k && u.outcome === 'gave_in').length;
        const d = k.slice(5).replace('-', '/');
        return `<div class="row between" style="padding:6px 0">
          <span class="muted">${esc(d)}</span>
          <span class="mono">${n}회${gi ? ` <span style="color:var(--bad)">· 봄 ${gi}</span>` : ''}</span>
        </div>`;
      }).join('')}
    </div>

    <h2>최근 기록</h2>
    <div class="list">
      ${s.urge.list.slice(0, 15).map(u => `
        <div class="item">
          <div class="row between">
            <div><span class="dot ${OUT_DOT[u.outcome] || 'off'}"></span>
              <b style="margin-left:6px">${esc(u.emotion || '미기록')}</b>
              <span class="faint"> · ${esc(OUT_LABEL[u.outcome] || u.outcome)}</span></div>
            <div class="t">${esc(u.date.slice(5).replace('-', '/'))} ${esc(hhmm(new Date(u.ts)))}</div>
          </div>
          ${u.reason ? `<p class="muted" style="margin:6px 0 0;font-size:14px">“${esc(u.reason)}”</p>` : ''}
          <p class="faint" style="margin:4px 0 0">${esc(CTX_LABEL[u.contextBefore] || '')}${u.replacement ? ` · 대체: ${esc(u.replacement)}` : ''}</p>
        </div>`).join('') || `<p class="faint">아직 기록이 없습니다. 충동이 올 때 위 버튼을 누르세요.</p>`}
    </div>
  `;

  root.querySelector('#btnUrge').addEventListener('click', () => startUrgeFlow({ onDone: refresh }));
}

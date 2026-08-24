import { getConfig, addStudySession, studyBetween } from '../store.js';
import * as pomo from '../features/pomodoro.js';
import { esc, toast, keepAwake, primeAudio, vibrate } from '../ui.js';
import { mmss, humanDur, dayKey } from '../lib/date.js';
import { refresh } from '../router.js';

const PENDING = 'timer.pendingScore';
export const pending = () => { try { return JSON.parse(localStorage.getItem(PENDING) || 'null'); } catch { return null; } };
export const setPending = (v) => v ? localStorage.setItem(PENDING, JSON.stringify(v)) : localStorage.removeItem(PENDING);

let unsub = null;

export function dispose(){ unsub?.(); unsub = null; keepAwake(false); }

export async function render(root){
  dispose();
  const cfg = await getConfig();
  const snap = pending();
  if (snap) return renderScore(root, cfg, snap);

  const st = pomo.getState();
  if (st.mode !== 'idle') return renderRunning(root, cfg, st);
  return renderIdle(root, cfg);
}

/* ── 대기 화면 ────────────────────────────────── */
async function renderIdle(root, cfg){
  const key = dayKey(Date.now(), cfg.dayCutoffHour);
  const todaySessions = await studyBetween(key, key);
  const todaySec = todaySessions.reduce((a, s) => a + (s.actualFocusSec || 0), 0);
  const last = localStorage.getItem('timer.subject') || cfg.subjects[0] || '기타';

  root.innerHTML = `
    <h1>공부 타이머</h1>
    <p class="sub">오늘 ${esc(humanDur(todaySec * 1000))} · ${todaySessions.length}세션</p>

    <h2>과목</h2>
    <div class="chips" id="subjects">
      ${cfg.subjects.map(s => `<button class="chip" data-s="${esc(s)}" aria-pressed="${s === last}">${esc(s)}</button>`).join('')}
    </div>

    <div class="card" style="margin-top:18px">
      <div class="row between">
        <div class="muted">집중 / 휴식</div>
        <div class="mono">${cfg.pomodoro.focus} / ${cfg.pomodoro.break}분</div>
      </div>
      <button class="btn primary lg" id="btnStart" style="margin-top:14px">${cfg.pomodoro.focus}분 집중 시작</button>
      <div class="grid2" style="margin-top:10px">
        <button class="btn sm" data-min="15">15분</button>
        <button class="btn sm" data-min="50">50분</button>
      </div>
    </div>

    ${todaySessions.length ? `<h2>오늘 기록</h2><div class="list">
      ${todaySessions.slice().reverse().map(s => `<div class="item row between">
        <div><b>${esc(s.subject)}</b> <span class="faint">${esc(humanDur(s.actualFocusSec * 1000))}</span></div>
        <div class="faint">${s.focusScore ? '집중 ' + s.focusScore + '/5' : '—'}${s.completed ? '' : ' · 중단'}</div>
      </div>`).join('')}</div>` : ''}
  `;

  const subjEl = root.querySelector('#subjects');
  let subject = last;
  subjEl.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    subject = b.dataset.s;
    localStorage.setItem('timer.subject', subject);
    subjEl.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
  });

  const begin = (min) => {
    primeAudio();
    pomo.start('focus', min, subject);
    keepAwake(true);
    refresh();
  };
  root.querySelector('#btnStart').addEventListener('click', () => begin(cfg.pomodoro.focus));
  root.querySelectorAll('[data-min]').forEach(b =>
    b.addEventListener('click', () => begin(Number(b.dataset.min))));

  // #/timer?auto=1 로 들어오면 바로 시작
  if (location.hash.includes('auto=1')){
    history.replaceState(null, '', '#/timer');
    begin(cfg.pomodoro.focus);
  }
}

/* ── 진행 화면 ────────────────────────────────── */
function renderRunning(root, cfg, st){
  const isFocus = st.mode === 'focus';
  root.innerHTML = `
    <h1>${isFocus ? esc(st.subject || '집중') : '휴식'}</h1>
    <p class="sub">${isFocus ? '끝나면 진동과 알림이 옵니다' : '눈 감고 쉬세요. 폰 보지 말 것.'}</p>
    <div class="timer-face">
      <div class="t" id="face">${esc(mmss(st.leftSec))}</div>
      <div class="mode" id="modeLine"></div>
    </div>
    <div style="display:grid;gap:10px;margin-top:18px">
      <button class="btn primary lg" id="btnToggle">${st.running ? '일시정지' : '이어서'}</button>
      <button class="btn ghost" id="btnStop">${isFocus ? '중단하고 기록' : '휴식 끝'}</button>
    </div>
  `;

  const face = root.querySelector('#face');
  const modeLine = root.querySelector('#modeLine');
  const btnToggle = root.querySelector('#btnToggle');

  unsub = pomo.subscribe((s) => {
    if (!face.isConnected) return;
    face.textContent = mmss(s.leftSec);
    modeLine.textContent = s.running
      ? `${Math.round(s.plannedSec / 60)}분 세션 · 일시정지 ${s.pausedCount}회`
      : '일시정지됨';
    btnToggle.textContent = s.running ? '일시정지' : '이어서';
    if (s.mode === 'idle') refresh();
  });

  keepAwake(true);

  btnToggle.addEventListener('click', () => {
    const s = pomo.getState();
    if (s.running) pomo.pause(); else { primeAudio(); pomo.resume(); }
  });

  root.querySelector('#btnStop').addEventListener('click', async () => {
    const snap = pomo.stop();
    keepAwake(false);
    if (snap.mode === 'focus' && snap.actualFocusSec >= 60){
      setPending(snap);
    } else if (snap.mode === 'focus'){
      toast('1분 미만이라 기록하지 않았습니다.');
    }
    refresh();
  });
}

/* ── 집중도 기록 ─────────────────────────────── */
function renderScore(root, cfg, snap){
  root.innerHTML = `
    <h1>세션 기록</h1>
    <p class="sub">${esc(snap.subject || '기타')} · ${esc(humanDur(snap.actualFocusSec * 1000))} ${snap.completed ? '완료' : '중단'}</p>

    <h2>집중도</h2>
    <div class="grid4" id="score">
      ${[1,2,3,4,5].map(n => `<button class="chip" data-n="${n}" aria-pressed="false"
          style="justify-self:stretch;text-align:center">${n}</button>`).join('')}
    </div>
    <p class="faint" style="margin-top:8px">1 = 계속 딴짓 · 5 = 몰입</p>

    <label class="field"><span>메모 (선택)</span>
      <textarea id="memo" rows="2" maxlength="140" placeholder="막힌 부분, 딴짓한 이유 등"></textarea>
    </label>

    <div style="display:grid;gap:10px;margin-top:20px">
      <button class="btn primary lg" id="btnSave" disabled>저장</button>
      ${snap.completed ? `<button class="btn ghost" id="btnSkipBreak">저장하고 바로 다음 집중</button>` : ''}
    </div>
  `;

  let score = null;
  root.querySelector('#score').addEventListener('click', (e) => {
    const b = e.target.closest('[data-n]');
    if (!b) return;
    score = Number(b.dataset.n);
    root.querySelectorAll('#score .chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    root.querySelector('#btnSave').disabled = false;
  });

  const save = async () => {
    await addStudySession({ ...snap, focusScore: score, memo: root.querySelector('#memo').value.trim() });
    setPending(null);
    vibrate(40);
  };

  root.querySelector('#btnSave').addEventListener('click', async () => {
    await save();
    if (snap.completed){
      pomo.start('break', cfg.pomodoro.break, snap.subject);
      toast(`${cfg.pomodoro.break}분 휴식 시작`);
    } else {
      toast('기록했습니다.');
    }
    refresh();
  });

  root.querySelector('#btnSkipBreak')?.addEventListener('click', async () => {
    await save();
    pomo.start('focus', cfg.pomodoro.focus, snap.subject);
    refresh();
  });
}

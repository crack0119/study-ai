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

/* ── 대기 ─────────────────────────────────── */
async function renderIdle(root, cfg){
  const key = dayKey(Date.now(), cfg.dayCutoffHour);
  const list = await studyBetween(key, key);
  const sec = list.reduce((a, s) => a + (s.actualFocusSec || 0), 0);
  const last = localStorage.getItem('timer.subject') || cfg.subjects[0] || '기타';
  let subject = cfg.subjects.includes(last) ? last : (cfg.subjects[0] || '기타');

  root.innerHTML = `
    <div class="head">
      <h1 class="t1">타이머</h1>
      <p class="cap num">오늘 ${sec ? esc(humanDur(sec * 1000)) : '0분'} · ${list.length}세션</p>
    </div>

    <p class="lbl" style="margin-bottom:10px">과목</p>
    <div class="chips" id="subjects">
      ${cfg.subjects.map(s => `<button class="chip" data-s="${esc(s)}" aria-pressed="${s === subject}">${esc(s)}</button>`).join('')}
    </div>

    <div class="b-stack" style="margin-top:24px">
      <button class="b b--solid b--big" id="btnStart">${cfg.pomodoro.focus}분 시작</button>
      <div class="b-2">
        <button class="b b--sm" data-min="15">15분</button>
        <button class="b b--sm" data-min="50">50분</button>
      </div>
    </div>

    ${list.length ? `
      <div class="sec">
        <p class="lbl">오늘</p>
        <div>
          ${list.slice().reverse().map(s => `
            <div class="log">
              <i class="r-mark ${s.completed ? 'off' : 'warn'}"></i>
              <div class="log-body">
                <div class="log-top">
                  <span class="log-t">${esc(s.subject)}</span>
                  <span class="log-time">${esc(humanDur(s.actualFocusSec * 1000))}</span>
                </div>
                <p class="log-meta">${s.focusScore ? `집중 ${s.focusScore}` : '미기록'}${s.completed ? '' : ' · 중단'}${
                  s.memo ? ` · ${esc(s.memo)}` : ''}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>` : `<p class="cap" style="margin-top:26px">시작하면 끝날 때 알림이 온다.</p>`}
  `;

  const subjEl = root.querySelector('#subjects');
  subjEl.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    subject = b.dataset.s;
    localStorage.setItem('timer.subject', subject);
    subjEl.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
  });

  const begin = (min) => { primeAudio(); pomo.start('focus', min, subject); keepAwake(true); refresh(); };
  root.querySelector('#btnStart').addEventListener('click', () => begin(cfg.pomodoro.focus));
  root.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => begin(Number(b.dataset.min))));

  if (location.hash.includes('auto=1')){
    history.replaceState(null, '', '#/timer');
    begin(cfg.pomodoro.focus);
  }
}

/* ── 진행 ─────────────────────────────────── */
function renderRunning(root, cfg, st){
  const isFocus = st.mode === 'focus';
  root.innerHTML = `
    <div class="head">
      <h1 class="t1">${isFocus ? esc(st.subject || '집중') : '휴식'}</h1>
      <p class="cap num">${Math.round(st.plannedSec / 60)}분</p>
    </div>
    <div class="face">
      <div class="clock" id="face">${esc(mmss(st.leftSec))}</div>
      <div class="state" id="state"></div>
    </div>
    <div class="b-stack">
      <button class="b b--solid" id="btnToggle">${st.running ? '일시정지' : '이어서'}</button>
      <button class="b b--quiet" id="btnStop">${isFocus ? '중단' : '휴식 끝'}</button>
    </div>
  `;

  const face = root.querySelector('#face');
  const state = root.querySelector('#state');
  const toggle = root.querySelector('#btnToggle');

  unsub = pomo.subscribe((s) => {
    if (!face.isConnected) return;
    face.textContent = mmss(s.leftSec);
    state.textContent = s.running
      ? (isFocus ? (s.pausedCount ? `일시정지 ${s.pausedCount}회` : '진행 중') : '눈 감고 쉬기')
      : '멈춤';
    toggle.textContent = s.running ? '일시정지' : '이어서';
    if (s.mode === 'idle') refresh();
  });

  keepAwake(true);

  toggle.addEventListener('click', () => {
    const s = pomo.getState();
    if (s.running) pomo.pause(); else { primeAudio(); pomo.resume(); }
  });

  root.querySelector('#btnStop').addEventListener('click', () => {
    const snap = pomo.stop();
    keepAwake(false);
    if (snap.mode === 'focus'){
      if (snap.actualFocusSec >= 60) setPending(snap);
      else toast('1분 미만은 기록 안 함');
    }
    refresh();
  });
}

/* ── 집중도 기록 ─────────────────────────── */
function renderScore(root, cfg, snap){
  root.innerHTML = `
    <div class="head">
      <h1 class="t1">기록</h1>
      <p class="cap num">${esc(snap.subject || '기타')} · ${esc(humanDur(snap.actualFocusSec * 1000))}</p>
    </div>

    <p class="lbl" style="margin-bottom:10px">집중도</p>
    <div class="b-5" id="score">
      ${[1,2,3,4,5].map(n => `<button class="chip" data-n="${n}" aria-pressed="false">${n}</button>`).join('')}
    </div>
    <p class="cap" style="margin-top:9px">1 딴짓 · 5 몰입</p>

    <p class="lbl" style="margin:26px 0 10px">메모</p>
    <textarea class="in" id="memo" rows="2" maxlength="140" placeholder="막힌 부분, 딴짓한 이유"></textarea>

    <div class="b-stack" style="margin-top:26px">
      <button class="b b--solid" id="btnSave" disabled>${snap.completed ? `저장하고 ${cfg.pomodoro.break}분 휴식` : '저장'}</button>
      ${snap.completed ? `<button class="b b--quiet" id="btnNext">저장하고 바로 이어서</button>` : ''}
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
    vibrate(30);
  };

  root.querySelector('#btnSave').addEventListener('click', async () => {
    await save();
    if (snap.completed) pomo.start('break', cfg.pomodoro.break, snap.subject);
    refresh();
  });

  root.querySelector('#btnNext')?.addEventListener('click', async () => {
    await save();
    pomo.start('focus', cfg.pomodoro.focus, snap.subject);
    refresh();
  });
}

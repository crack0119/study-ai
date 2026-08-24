// 숏폼 마찰 플로우: 60초 대기 → 감정·이유 기록 → 대체 행동.
// 앱이 인스타·틱톡을 막지는 못한다. 여는 비용을 올리고 패턴을 남기는 게 목적.
import { getConfig, addUrge, detectUrgeContext, EMOTIONS, REPLACEMENTS } from '../store.js';
import { showOverlay, hideOverlay, ringHtml, ringUpdate, esc, toast, vibrate, beep, primeAudio } from '../ui.js';
import { mmss } from '../lib/date.js';

let timer = null;
let onDone = null;

const clear = () => { if (timer){ clearInterval(timer); timer = null; } };

export function startUrgeFlow(opts = {}){
  onDone = opts.onDone || null;
  primeAudio();
  step1();
}

/* ── 1단계: 대기 + 기록 ──────────────────── */
async function step1(){
  const cfg = await getConfig();
  const waitSec = cfg.urgeWaitSec || 60;
  const startedAt = Date.now();
  let emotion = '';

  const o = showOverlay(`
    <div class="ovl-top">
      <div class="ovl-meta">
        <span>충동</span>
        <button class="b b--sm b--quiet" id="btnAbort" style="width:auto;min-height:32px;padding:0 6px;color:var(--fg-3)">닫기</button>
      </div>

      ${ringHtml('urgeRing', String(waitSec))}
      <p class="cap" style="text-align:center;margin-top:16px">${waitSec}초 뒤에 넘어간다</p>

      <p class="lbl" style="margin:32px 0 10px">감정</p>
      <div class="chips" id="emotions">
        ${EMOTIONS.map(e => `<button class="chip" data-e="${esc(e)}" aria-pressed="false">${esc(e)}</button>`).join('')}
      </div>

      <p class="lbl" style="margin:26px 0 10px">이유</p>
      <textarea class="in" id="reason" rows="2" maxlength="120"
        placeholder="수학 3번 틀리고 짜증나서"></textarea>
    </div>
    <div class="ovl-bottom">
      <button class="b b--solid b--big" id="btnNext" disabled>다음</button>
    </div>
  `);

  const ring = o.querySelector('#urgeRing');
  const btnNext = o.querySelector('#btnNext');
  const reason = o.querySelector('#reason');

  const evaluate = () => {
    const left = Math.max(0, waitSec - (Date.now() - startedAt) / 1000);
    const filled = emotion && reason.value.trim().length >= 5;
    btnNext.disabled = !(left <= 0 && filled);
    btnNext.textContent = left > 0 ? `${Math.ceil(left)}초 남음` : (filled ? '다음' : '감정과 이유를 채운다');
  };

  o.querySelector('#emotions').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    emotion = b.dataset.e;
    o.querySelectorAll('#emotions .chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    evaluate();
  });
  reason.addEventListener('input', evaluate);

  o.querySelector('#btnAbort').addEventListener('click', async () => {
    clear();
    await log({ startedAt, emotion, reason: reason.value.trim(), outcome: 'resisted', replacement: null });
    hideOverlay();
    toast('기록함');
    onDone?.();
  });

  btnNext.addEventListener('click', () => {
    if (btnNext.disabled) return;
    clear();
    step2({ startedAt, emotion, reason: reason.value.trim() });
  });

  clear();
  timer = setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const left = Math.max(0, waitSec - elapsed);
    ringUpdate(ring, elapsed / waitSec, String(Math.ceil(left)));
    if (left <= 0 && timer){ clear(); vibrate(40); }
    evaluate();
  }, 200);
  evaluate();
}

/* ── 2단계: 대체 행동 ────────────────────── */
function step2(ctx){
  const o = showOverlay(`
    <div class="ovl-top">
      <h1 class="ovl-title">60초 버텼다</h1>
      <p class="ovl-lead">${esc(ctx.emotion)} · “${esc(ctx.reason)}”</p>

      <p class="lbl" style="margin:34px 0 10px">대신 할 것</p>
      <div class="b-stack">
        ${REPLACEMENTS.map(r => `
          <button class="b b-sub" data-r="${r.id}">
            <b>${esc(r.label)}</b><span>${esc(r.desc)}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="ovl-bottom">
      <button class="b" id="btnResist">그냥 닫기</button>
      <button class="b b--quiet" id="btnGiveIn"
        style="color:var(--fg-3);min-height:44px;font-size:13.5px">그래도 본다</button>
    </div>
  `);

  o.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    const id = b.dataset.r;
    await log({ ...ctx, outcome: 'replaced', replacement: id });
    if (id === 'study'){
      hideOverlay();
      location.hash = '#/timer?auto=1';
      onDone?.();
    } else if (id === 'stretch' || id === 'walk'){
      replacementTimer(id === 'stretch' ? '5분 스트레칭' : '5분 걷기', id);
    } else {
      hideOverlay();
      toast('기록함');
      onDone?.();
    }
  });

  o.querySelector('#btnResist').addEventListener('click', async () => {
    await log({ ...ctx, outcome: 'resisted', replacement: null });
    hideOverlay();
    vibrate(50);
    toast('버팀 · 기록함');
    onDone?.();
  });

  o.querySelector('#btnGiveIn').addEventListener('click', async () => {
    await log({ ...ctx, outcome: 'gave_in', replacement: null });
    hideOverlay();
    toast('기록함');
    onDone?.();
  });
}

/* ── 대체 행동 타이머 ────────────────────── */
const STRETCH = ['목 좌우 천천히 10회', '어깨 뒤로 크게 10바퀴', '깍지 끼고 가슴 열기 30초',
                 '햄스트링 좌우 30초', '허리 비틀기 좌우 30초', '눈 감고 심호흡 10회'];

function replacementTimer(title, id){
  const total = 300;
  const startedAt = Date.now();
  const o = showOverlay(`
    <div class="ovl-top">
      <div class="ovl-meta"><span>${esc(title)}</span></div>
      ${ringHtml('repRing', '5:00')}
      ${id === 'stretch'
        ? `<ul style="margin-top:34px">${STRETCH.map(s =>
            `<li class="r" style="color:var(--fg-2)">${esc(s)}</li>`).join('')}</ul>`
        : `<p class="cap" style="text-align:center;margin-top:26px">폰은 주머니에. 5분 뒤 알림이 온다.</p>`}
    </div>
    <div class="ovl-bottom">
      <button class="b b--quiet" id="btnRepDone">끝</button>
    </div>
  `);

  const ring = o.querySelector('#repRing');
  clear();
  timer = setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const left = Math.max(0, total - elapsed);
    ringUpdate(ring, elapsed / total, mmss(left));
    if (left <= 0){
      clear();
      vibrate([200, 100, 200]); beep(2);
      const btn = o.querySelector('#btnRepDone');
      if (btn){ btn.textContent = '완료'; btn.className = 'b b--solid b--big'; }
    }
  }, 250);

  o.querySelector('#btnRepDone').addEventListener('click', () => {
    clear(); hideOverlay(); onDone?.();
  });
}

async function log({ startedAt, emotion, reason, outcome, replacement }){
  const contextBefore = await detectUrgeContext(startedAt);
  return addUrge({
    ts: startedAt,
    emotion, reason, outcome, replacement, contextBefore,
    waitedSec: Math.round((Date.now() - startedAt) / 1000),
  });
}

// 숏폼 충동 마찰 플로우: 60초 대기 → 감정/이유 기록 → 대체 행동 선택.
// 앱이 인스타·틱톡을 막을 수는 없다. 여는 데 드는 '비용'을 올리고, 패턴을 남기는 것이 목적.
import { getConfig, addUrge, updateUrge, detectUrgeContext, EMOTIONS, REPLACEMENTS } from '../store.js';
import { showOverlay, hideOverlay, ringHtml, ringUpdate, esc, toast, vibrate, beep } from '../ui.js';
import { mmss } from '../lib/date.js';

let timer = null;
let onDone = null;

function clear(){ if (timer){ clearInterval(timer); timer = null; } }

export function startUrgeFlow(opts = {}){
  onDone = opts.onDone || null;
  step1();
}

/* ── 1단계: 60초 대기 + 기록 ──────────────────── */
async function step1(){
  const cfg = await getConfig();
  const waitSec = cfg.urgeWaitSec || 60;
  const startedAt = Date.now();
  let emotion = '';

  const o = showOverlay(`
    <div class="ovl-top">
      <div class="row between">
        <div class="muted">숏폼 충동</div>
        <button class="btn sm ghost" id="btnAbort" style="width:auto">닫기</button>
      </div>
      ${ringHtml('urgeRing', String(waitSec))}
      <p class="ovl-lead" style="text-align:center;margin-top:14px">
        ${waitSec}초 지나면 다음으로 넘어갑니다.<br>그 사이에 아래 두 칸을 채우세요.
      </p>

      <h2>지금 감정은?</h2>
      <div class="chips" id="emotions">
        ${EMOTIONS.map(e => `<button class="chip" data-e="${esc(e)}" aria-pressed="false">${esc(e)}</button>`).join('')}
      </div>

      <h2>왜 지금 켜고 싶은가 (한 줄)</h2>
      <textarea id="reason" rows="2" maxlength="120"
        placeholder="예: 수학 3번 틀리고 짜증나서 도망치고 싶다"></textarea>
      <div class="faint" style="margin-top:6px" id="reasonHint">5자 이상</div>
    </div>
    <div class="ovl-bottom">
      <button class="btn primary lg" id="btnNext" disabled>다음</button>
    </div>
  `, { night: true });

  const ring = o.querySelector('#urgeRing');
  const btnNext = o.querySelector('#btnNext');
  const reason = o.querySelector('#reason');
  const hint = o.querySelector('#reasonHint');

  const evaluate = () => {
    const left = Math.max(0, waitSec - (Date.now() - startedAt) / 1000);
    const ok = left <= 0 && emotion && reason.value.trim().length >= 5;
    btnNext.disabled = !ok;
    btnNext.textContent = left > 0 ? `대기 ${Math.ceil(left)}초` : (ok ? '다음' : '감정과 이유를 채우세요');
  };

  o.querySelector('#emotions').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    emotion = b.dataset.e;
    o.querySelectorAll('#emotions .chip').forEach(c =>
      c.setAttribute('aria-pressed', String(c === b)));
    evaluate();
  });

  reason.addEventListener('input', () => {
    const n = reason.value.trim().length;
    hint.textContent = n >= 5 ? `${n}자` : `${n} / 5자`;
    evaluate();
  });

  o.querySelector('#btnAbort').addEventListener('click', async () => {
    clear();
    await log({ startedAt, emotion, reason: reason.value.trim(), outcome: 'resisted', replacement: null });
    hideOverlay();
    toast('그냥 닫았습니다. 기록해 뒀어요.');
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

/* ── 2단계: 대체 행동 선택 ───────────────────── */
function step2(ctx){
  const o = showOverlay(`
    <div class="ovl-top">
      <div class="ovl-title">60초 버텼습니다.</div>
      <p class="ovl-lead">이유: “${esc(ctx.reason)}” · ${esc(ctx.emotion)}</p>
      <h2>지금 대신 할 것</h2>
      <div class="list">
        ${REPLACEMENTS.map(r => `
          <button class="btn" data-r="${r.id}" style="flex-direction:column;align-items:flex-start;min-height:64px;padding:12px 16px">
            <span>${esc(r.label)}</span>
            <span class="faint" style="font-weight:400">${esc(r.desc)}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="ovl-bottom">
      <button class="btn ghost" id="btnResist">아무것도 안 하고 그냥 닫기</button>
      <button class="btn danger" id="btnGiveIn">그래도 본다 (기록됨)</button>
    </div>
  `, { night: true });

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
      toast('좋아요. 30초만 다녀오세요.');
      onDone?.();
    }
  });

  o.querySelector('#btnResist').addEventListener('click', async () => {
    await log({ ...ctx, outcome: 'resisted', replacement: null });
    hideOverlay();
    vibrate(60);
    toast('참았습니다. 기록에 남습니다.');
    onDone?.();
  });

  o.querySelector('#btnGiveIn').addEventListener('click', async () => {
    await log({ ...ctx, outcome: 'gave_in', replacement: null });
    hideOverlay();
    toast('기록했습니다. 언제 무너지는지가 데이터가 됩니다.');
    onDone?.();
  });
}

/* ── 대체 행동 타이머 (5분) ──────────────────── */
const STRETCH = ['목 좌우 천천히 10회', '어깨 뒤로 크게 10바퀴', '팔 뒤로 깍지 끼고 가슴 열기 30초',
                 '햄스트링 스트레칭 좌우 30초', '허리 비틀기 좌우 30초', '눈 감고 심호흡 10회'];

function replacementTimer(title, id){
  const total = 300;
  const startedAt = Date.now();
  const o = showOverlay(`
    <div class="ovl-top">
      <div class="ovl-title">${esc(title)}</div>
      ${ringHtml('repRing', '5:00')}
      ${id === 'stretch' ? `<ul class="muted" style="margin-top:20px;line-height:2;padding-left:18px">
        ${STRETCH.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` :
        `<p class="ovl-lead" style="text-align:center;margin-top:20px">폰은 주머니에. 5분 뒤에 알림이 옵니다.</p>`}
    </div>
    <div class="ovl-bottom">
      <button class="btn ghost" id="btnRepDone">끝냈다</button>
    </div>
  `, { night: true });

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
      if (btn) btn.textContent = '완료 — 공부로 돌아가기';
    }
  }, 250);

  o.querySelector('#btnRepDone').addEventListener('click', () => {
    clear(); hideOverlay(); toast('잘했습니다.'); onDone?.();
  });
}

/* ── 기록 ─────────────────────────────────────── */
async function log({ startedAt, emotion, reason, outcome, replacement }){
  const contextBefore = await detectUrgeContext(startedAt);
  return addUrge({
    ts: startedAt,
    emotion, reason, outcome, replacement, contextBefore,
    waitedSec: Math.round((Date.now() - startedAt) / 1000),
  });
}

export const _updateUrge = updateUrge;

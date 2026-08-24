import { getConfig, setConfig, DEFAULT_CONFIG } from '../store.js';
import { esc, toast } from '../ui.js';
import { permission, requestPermission, fire } from '../notify.js';
import { shareBackup, importFile, wipeAll } from '../backup.js';
import { scheduleWake } from '../features/bedtimeGuard.js';
import { refresh } from '../router.js';

const PERM = { granted: '허용됨', denied: '거부됨', default: '미설정', unsupported: '미지원' };

export async function render(root){
  const cfg = await getConfig();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const numRow = (k, id, val, unit) => `
    <div class="r">
      <span class="r-k">${k}</span>
      <span class="r-v"><input class="in in--inline" type="number" id="${id}" value="${val}">${unit}</span>
    </div>`;

  root.innerHTML = `
    <div class="head">
      <h1 class="t1">설정</h1>
      <p class="cap">이 폰 안에만 저장됨</p>
    </div>

    ${!standalone ? `<div class="note" style="margin-bottom:22px">
      아직 <b>홈 화면에 추가</b> 안 됨. iPhone은 공유 → “홈 화면에 추가”,
      Android는 메뉴 → “앱 설치”. 추가해야 알림이 뜬다.
    </div>` : ''}

    <div class="sec" style="margin-top:0">
      <p class="lbl">수면</p>
      <div class="rows">
        <div class="r"><span class="r-k">취침 목표</span>
          <span class="r-v"><input class="in in--inline" type="time" id="bedtime" value="${esc(cfg.bedtime)}"></span></div>
        <div class="r"><span class="r-k">기상 목표</span>
          <span class="r-v"><input class="in in--inline" type="time" id="wakeTime" value="${esc(cfg.wakeTime)}"></span></div>
        ${numRow('잠금 시작', 'warnLeadMin', cfg.warnLeadMin, '분 전')}
        ${numRow('재잠금', 'relockMin', cfg.relockMin, '분 뒤')}
        <div class="r r--stack">
          <span class="r-k">다짐 문장</span>
          <textarea class="in" id="pledgeText" rows="2" maxlength="120">${esc(cfg.pledgeText)}</textarea>
          <p class="cap">잠금을 풀 때 매번 그대로 입력한다. 20–40자가 적당하다.</p>
        </div>
      </div>
    </div>

    <div class="sec">
      <p class="lbl">충동</p>
      <div class="rows">
        ${numRow('대기 시간', 'urgeWaitSec', cfg.urgeWaitSec, '초')}
      </div>
    </div>

    <div class="sec">
      <p class="lbl">타이머</p>
      <div class="rows">
        ${numRow('집중', 'pFocus', cfg.pomodoro.focus, '분')}
        ${numRow('휴식', 'pBreak', cfg.pomodoro.break, '분')}
        <div class="r"><span class="r-k">과목</span>
          <span class="r-v"><input class="in in--inline" type="text" id="subjects" value="${esc(cfg.subjects.join(', '))}"></span></div>
      </div>
    </div>

    <div class="sec">
      <p class="lbl">알림</p>
      <div class="rows">
        <div class="r"><span class="r-k">권한</span><span class="r-v">${esc(PERM[permission()] || permission())}</span></div>
      </div>
      <div class="b-2" style="margin-top:14px">
        <button class="b b--sm" id="btnPerm">권한 요청</button>
        <button class="b b--sm" id="btnTest">테스트</button>
      </div>
      <div class="note" style="margin-top:14px">
        앱이 꺼져 있는 동안에는 예약 알림이 울리지 않는다.
        기상은 <b>폰 기본 알람</b>과 같이 쓰고, 놓친 알림은 다음에 열 때 알려준다.
      </div>
    </div>

    <div class="sec">
      <p class="lbl">백업</p>
      <div class="b-stack">
        <button class="b" id="btnExport">내보내기</button>
        <label class="b b--quiet">가져오기
          <input type="file" id="fileImport" accept="application/json,.json" hidden>
        </label>
      </div>
      <div class="note" style="margin-top:14px">
        브라우저 데이터를 지우면 전부 사라진다. 주 1회 내보내서 나에게 보내둘 것.
      </div>
    </div>

    <div class="sec">
      <p class="lbl">초기화</p>
      <button class="b b--danger" id="btnWipe">모든 기록 삭제</button>
    </div>

    <p class="cap" style="text-align:center;margin-top:34px">자기통제 v1.1</p>
  `;

  const num = (id, fallback) => {
    const v = Number(root.querySelector('#' + id).value);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };

  const saveNow = async () => {
    const subjects = root.querySelector('#subjects').value.split(',').map(s => s.trim()).filter(Boolean);
    await setConfig({
      bedtime: root.querySelector('#bedtime').value || DEFAULT_CONFIG.bedtime,
      wakeTime: root.querySelector('#wakeTime').value || DEFAULT_CONFIG.wakeTime,
      warnLeadMin: Math.max(0, Number(root.querySelector('#warnLeadMin').value) || 0),
      relockMin: num('relockMin', DEFAULT_CONFIG.relockMin),
      pledgeText: root.querySelector('#pledgeText').value.trim() || DEFAULT_CONFIG.pledgeText,
      urgeWaitSec: num('urgeWaitSec', DEFAULT_CONFIG.urgeWaitSec),
      pomodoro: {
        ...cfg.pomodoro,
        focus: num('pFocus', DEFAULT_CONFIG.pomodoro.focus),
        break: num('pBreak', DEFAULT_CONFIG.pomodoro.break),
      },
      subjects: subjects.length ? subjects : DEFAULT_CONFIG.subjects,
      onboarded: true,
    });
    await scheduleWake();
    toast('저장됨');
  };

  root.querySelectorAll('input, textarea').forEach(inp => {
    if (inp.type === 'file') return;
    inp.addEventListener('change', saveNow);
  });

  root.querySelector('#btnPerm').addEventListener('click', async () => { await requestPermission(); refresh(); });
  root.querySelector('#btnTest').addEventListener('click', () => fire('테스트', '이렇게 뜬다', 'test'));

  root.querySelector('#btnExport').addEventListener('click', async () => {
    try {
      const r = await shareBackup();
      if (r === 'downloaded') toast('파일로 저장됨');
    } catch { toast('내보내기 실패'); }
  });

  root.querySelector('#fileImport').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!confirm('기존 기록에 합친다. 같은 날짜는 덮어쓴다.')) return;
    try {
      await importFile(f, 'merge');
      setTimeout(() => location.reload(), 900);
    } catch (err) { toast(err.message || '가져오기 실패'); }
  });

  root.querySelector('#btnWipe').addEventListener('click', async () => {
    if (!confirm('수면·공부·충동 기록을 전부 지운다. 되돌릴 수 없다.')) return;
    if (!confirm('정말 지울까?')) return;
    await wipeAll();
    localStorage.clear();
    location.reload();
  });
}

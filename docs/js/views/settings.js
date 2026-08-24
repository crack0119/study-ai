import { getConfig, setConfig, DEFAULT_CONFIG } from '../store.js';
import { esc, toast } from '../ui.js';
import { permission, requestPermission, fire } from '../notify.js';
import { shareBackup, importFile, wipeAll } from '../backup.js';
import { scheduleWake } from '../features/bedtimeGuard.js';
import { refresh } from '../router.js';

const PERM_LABEL = { granted: '허용됨', denied: '거부됨', default: '아직 안 물어봄', unsupported: '미지원' };

export async function render(root){
  const cfg = await getConfig();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  root.innerHTML = `
    <h1>설정</h1>
    <p class="sub">모든 데이터는 이 폰 안에만 저장됩니다.</p>

    ${!standalone ? `<div class="notice">
      아직 <b>홈 화면에 추가</b>되지 않았습니다.
      iPhone: 공유 버튼 → “홈 화면에 추가”. Android: 메뉴 → “앱 설치”.
      추가해야 알림이 동작하고 주소창 없이 열립니다.
    </div>` : ''}

    <h2>수면</h2>
    <div class="card">
      <label class="field"><span>취침 목표</span><input type="time" id="bedtime" value="${esc(cfg.bedtime)}"></label>
      <label class="field"><span>기상 목표</span><input type="time" id="wakeTime" value="${esc(cfg.wakeTime)}"></label>
      <label class="field"><span>잠금 시작 (취침 몇 분 전)</span><input type="number" id="warnLeadMin" min="0" max="180" value="${cfg.warnLeadMin}"></label>
      <label class="field"><span>다짐 후 다시 잠기기까지 (분)</span><input type="number" id="relockMin" min="1" max="60" value="${cfg.relockMin}"></label>
      <label class="field"><span>다짐 문장 (매번 그대로 타이핑해야 함)</span>
        <textarea id="pledgeText" rows="3" maxlength="120">${esc(cfg.pledgeText)}</textarea></label>
    </div>

    <h2>숏폼</h2>
    <div class="card">
      <label class="field"><span>대기 시간 (초)</span><input type="number" id="urgeWaitSec" min="10" max="600" value="${cfg.urgeWaitSec}"></label>
      <p class="faint" style="margin-top:8px">길수록 마찰이 커집니다. 60초를 권합니다.</p>
    </div>

    <h2>타이머</h2>
    <div class="card">
      <div class="grid2">
        <label class="field" style="margin-top:0"><span>집중 (분)</span><input type="number" id="pFocus" min="1" max="180" value="${cfg.pomodoro.focus}"></label>
        <label class="field" style="margin-top:0"><span>휴식 (분)</span><input type="number" id="pBreak" min="1" max="60" value="${cfg.pomodoro.break}"></label>
      </div>
      <label class="field"><span>과목 (쉼표로 구분)</span>
        <input type="text" id="subjects" value="${esc(cfg.subjects.join(', '))}"></label>
    </div>

    <h2>알림</h2>
    <div class="card">
      <div class="row between"><span class="muted">권한 상태</span><b>${esc(PERM_LABEL[permission()] || permission())}</b></div>
      <div class="grid2" style="margin-top:12px">
        <button class="btn sm" id="btnPerm">권한 요청</button>
        <button class="btn sm" id="btnTest">테스트 알림</button>
      </div>
      <p class="faint" style="margin-top:10px;line-height:1.6">
        웹앱은 <b>꺼져 있는 동안 예약 알림을 울릴 수 없습니다</b>(서버 푸시 없음).
        기상 알림은 폰 기본 알람과 함께 쓰고, 이 앱에서는 체크인만 하세요.
        앱이 꺼져 있어 놓친 알림은 다음에 열 때 알려줍니다.
      </p>
    </div>

    <h2>백업</h2>
    <div class="card">
      <button class="btn" id="btnExport">백업 내보내기 (공유)</button>
      <label class="btn ghost" style="margin-top:10px">
        백업 가져오기
        <input type="file" id="fileImport" accept="application/json,.json" hidden>
      </label>
      <p class="faint" style="margin-top:10px">
        사파리 방문 기록/데이터 삭제 시 전부 사라집니다. 주 1회 내보내서 나에게 보내두세요.
      </p>
    </div>

    <h2>초기화</h2>
    <div class="card">
      <button class="btn danger" id="btnWipe">모든 기록 삭제</button>
    </div>
    <p class="faint" style="text-align:center;margin:24px 0 0">자기통제 v1.0 · 로컬 전용</p>
  `;

  const num = (id, fallback) => {
    const v = Number(root.querySelector('#' + id).value);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };

  const saveNow = async () => {
    const subjects = root.querySelector('#subjects').value
      .split(',').map(s => s.trim()).filter(Boolean);
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
    toast('저장했습니다.');
  };

  // 입력을 바꾸면 그 자리에서 저장 (저장 버튼을 따로 누르게 하지 않는다)
  root.querySelectorAll('input, textarea').forEach(inp => {
    if (inp.type === 'file') return;
    inp.addEventListener('change', saveNow);
  });

  root.querySelector('#btnPerm').addEventListener('click', async () => { await requestPermission(); refresh(); });
  root.querySelector('#btnTest').addEventListener('click', () => fire('테스트 알림', '이렇게 뜹니다.', 'test'));

  root.querySelector('#btnExport').addEventListener('click', async () => {
    try {
      const r = await shareBackup();
      if (r === 'downloaded') toast('파일로 저장했습니다.');
    } catch { toast('내보내기에 실패했습니다.'); }
  });

  root.querySelector('#fileImport').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!confirm('기존 기록에 합칩니다. 같은 날짜는 백업 내용으로 덮어씁니다. 계속할까요?')) return;
    try {
      await importFile(f, 'merge');
      setTimeout(() => location.reload(), 900);
    } catch (err) { toast(err.message || '가져오기 실패'); }
  });

  root.querySelector('#btnWipe').addEventListener('click', async () => {
    if (!confirm('수면·공부·숏폼 기록을 전부 지웁니다. 되돌릴 수 없습니다.')) return;
    if (!confirm('정말 지울까요?')) return;
    await wipeAll();
    localStorage.clear();
    location.reload();
  });
}

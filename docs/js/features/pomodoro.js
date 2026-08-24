// 뽀모도로 엔진. setInterval 카운트가 아니라 '끝나는 시각(timestamp)' 기준이라
// 화면이 꺼지거나 탭이 백그라운드로 가도 시간이 밀리지 않는다.
const KEY = 'timer.state';

const initial = () => ({
  mode: 'idle',        // idle | focus | break | longBreak
  subject: '',
  plannedSec: 0,
  endAt: 0,            // 실행 중일 때 종료 예정 시각
  leftSec: 0,          // 일시정지 중 남은 초
  running: false,
  segStart: 0,         // 현재 구간 시작 시각 (집중 시간 누적용)
  accumSec: 0,         // 실제 집중한 초
  pausedCount: 0,
  cycle: 0,            // 완료한 집중 세션 수
  startedAt: 0,
});

let state = load();
const subs = new Set();
let ticker = null;
let onComplete = null;

function load(){
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && typeof s === 'object' ? { ...initial(), ...s } : initial();
  } catch { return initial(); }
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* noop */ } }

export const getState = () => ({ ...state, leftSec: remaining() });

export function remaining(){
  if (state.mode === 'idle') return 0;
  return state.running ? Math.max(0, (state.endAt - Date.now()) / 1000) : state.leftSec;
}

function emit(){ const s = getState(); subs.forEach(fn => fn(s)); }

export function subscribe(fn){
  subs.add(fn);
  fn(getState());
  return () => subs.delete(fn);
}

export function onSessionEnd(fn){ onComplete = fn; }

function ensureTicker(){
  if (ticker) return;
  ticker = setInterval(() => {
    if (state.mode === 'idle'){ clearInterval(ticker); ticker = null; return; }
    if (state.running && remaining() <= 0) complete();
    else emit();
  }, 250);
}

export function start(mode, minutes, subject){
  const sec = Math.max(1, Math.round(minutes * 60));
  state = {
    ...initial(),
    mode,
    subject: subject ?? state.subject,
    plannedSec: sec,
    endAt: Date.now() + sec * 1000,
    running: true,
    segStart: Date.now(),
    cycle: state.cycle,
    startedAt: Date.now(),
  };
  save(); emit(); ensureTicker();
}

export function pause(){
  if (!state.running || state.mode === 'idle') return;
  state.leftSec = remaining();
  if (state.mode === 'focus') state.accumSec += (Date.now() - state.segStart) / 1000;
  state.running = false;
  state.pausedCount++;
  save(); emit();
}

export function resume(){
  if (state.running || state.mode === 'idle') return;
  state.endAt = Date.now() + state.leftSec * 1000;
  state.segStart = Date.now();
  state.running = true;
  save(); emit(); ensureTicker();
}

/** 중단 — 완료 처리 없이 세션 정보만 반환 */
export function stop(){
  const snap = snapshot(false);
  state = { ...initial(), subject: state.subject, cycle: state.cycle };
  save(); emit();
  return snap;
}

function snapshot(completed){
  if (state.mode === 'focus' && state.running){
    state.accumSec += (Date.now() - state.segStart) / 1000;
    state.segStart = Date.now();
  }
  return {
    mode: state.mode,
    subject: state.subject,
    startedAt: state.startedAt,
    endedAt: Date.now(),
    plannedFocusSec: state.plannedSec,
    actualFocusSec: Math.min(state.accumSec, state.plannedSec),
    pausedCount: state.pausedCount,
    completed,
  };
}

function complete(){
  const snap = snapshot(true);
  const wasFocus = state.mode === 'focus';
  if (wasFocus) state.cycle++;
  const finishedCycle = state.cycle;
  state = { ...initial(), subject: state.subject, cycle: finishedCycle };
  save();
  onComplete?.(snap);   // 구독자에게 알리기 전에 먼저 — 기록 화면이 밀리지 않도록
  emit();
}

/** 새로고침 후 복원 */
export function resumeFromStorage(){
  state = load();
  if (state.mode !== 'idle'){
    if (state.running && remaining() <= 0) complete();
    else ensureTicker();
  }
  emit();
}

export function reset(){
  state = initial(); save(); emit();
}

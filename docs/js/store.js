// 도메인 저장소 — 화면 코드는 IndexedDB를 직접 만지지 않고 여기만 호출한다.
import * as db from './db.js';
import { dayKey, ymd, fromYmd, addDays, sleepWindow, uid, MIN, DAY } from './lib/date.js';

/* ── 설정 ─────────────────────────────────────── */
export const DEFAULT_CONFIG = {
  key: 'config',
  bedtime: '23:30',
  wakeTime: '06:30',
  warnLeadMin: 30,
  pledgeText: '여기서 끊는다. 폰 내려놓고 잔다.',
  relockMin: 10,          // 다짐 통과 후 오버레이가 다시 뜨기까지
  urgeWaitSec: 60,        // 숏폼 마찰 카운트다운
  pomodoro: { focus: 25, break: 5, longBreak: 15, cycle: 4 },
  subjects: ['국어', '수학', '영어', '탐구'],
  dayCutoffHour: 4,
  sound: true,
  vibrate: true,
  onboarded: false,
};

let _cfg = null;

export async function getConfig(){
  if (_cfg) return _cfg;
  const saved = await db.get('settings', 'config');
  _cfg = { ...DEFAULT_CONFIG, ...(saved || {}) };
  _cfg.pomodoro = { ...DEFAULT_CONFIG.pomodoro, ...(saved?.pomodoro || {}) };
  return _cfg;
}

export async function setConfig(patch){
  const cfg = await getConfig();
  _cfg = { ...cfg, ...patch, key: 'config' };
  await db.put('settings', _cfg);
  return _cfg;
}

export const today = async () => dayKey(Date.now(), (await getConfig()).dayCutoffHour);

/* ── 수면 ─────────────────────────────────────── */
const SLEEP_GRACE_MIN = 30;   // 취침 체크인 허용 지연
const WAKE_GRACE_MIN  = 20;   // 기상 체크인 허용 지연

export async function getSleepLog(date){
  const cfg = await getConfig();
  const key = date || dayKey(Date.now(), cfg.dayCutoffHour);
  const found = await db.get('sleepLogs', key);
  if (found) return found;
  const ref = fromYmd(key); ref.setHours(20, 0, 0, 0);   // 그 날 밤을 대표하는 시각
  const w = sleepWindow(cfg, ref);
  return {
    date: key,
    bedtimeTarget: w.bedtime.getTime(),
    wakeTarget: w.wake.getTime(),
    overlayShownAt: null,
    pledgeTypedAt: null,
    pledgeCount: 0,
    sleepCheckinAt: null,
    wakeCheckinAt: null,
    note: '',
  };
}

export async function saveSleepLog(log){
  return db.put('sleepLogs', log);
}

export async function patchSleepLog(date, patch){
  const log = await getSleepLog(date);
  return db.put('sleepLogs', { ...log, ...patch });
}

/** 그날 밤의 성공 판정 */
export function judgeSleep(log){
  const bedOk  = log.sleepCheckinAt != null && log.sleepCheckinAt <= log.bedtimeTarget + SLEEP_GRACE_MIN * MIN;
  const wakeOk = log.wakeCheckinAt  != null && log.wakeCheckinAt  <= log.wakeTarget    + WAKE_GRACE_MIN  * MIN;
  return { bedOk, wakeOk, success: bedOk && wakeOk,
           durationMs: (log.sleepCheckinAt && log.wakeCheckinAt)
             ? Math.max(0, log.wakeCheckinAt - log.sleepCheckinAt) : null };
}

export async function sleepLogsBetween(fromKey, toKey){
  return db.range('sleepLogs', null, fromKey, toKey);
}

/** 연속 성공일수. 오늘 밤이 아직 판정 전이면 어제부터 센다. */
export async function sleepStreak(){
  const cfg = await getConfig();
  const logs = await db.all('sleepLogs');
  const map = new Map(logs.map(l => [l.date, l]));
  const startKey = dayKey(Date.now(), cfg.dayCutoffHour);
  let cursor = fromYmd(startKey);
  const todayLog = map.get(startKey);
  if (!todayLog || !judgeSleep(todayLog).success) cursor = addDays(cursor, -1);
  let n = 0;
  for (;;){
    const l = map.get(ymd(cursor));
    if (!l || !judgeSleep(l).success) break;
    n++; cursor = addDays(cursor, -1);
    if (n > 3650) break;
  }
  return n;
}

/* ── 공부 세션 ────────────────────────────────── */
export async function addStudySession(s){
  const cfg = await getConfig();
  const rec = {
    id: uid(),
    date: dayKey(s.startedAt ?? Date.now(), cfg.dayCutoffHour),
    subject: s.subject || '기타',
    startedAt: s.startedAt ?? Date.now(),
    endedAt: s.endedAt ?? Date.now(),
    plannedFocusSec: s.plannedFocusSec ?? 0,
    actualFocusSec: Math.round(s.actualFocusSec ?? 0),
    completed: !!s.completed,
    pausedCount: s.pausedCount ?? 0,
    focusScore: s.focusScore ?? null,
    memo: s.memo || '',
  };
  await db.put('studySessions', rec);
  return rec;
}

export const studyBetween = (fromKey, toKey) => db.range('studySessions', 'byDate', fromKey, toKey);

/* ── 숏폼 충동 ────────────────────────────────── */
export const EMOTIONS = ['지루함', '불안', '보상심리', '습관', '외로움', '피곤함'];
export const REPLACEMENTS = [
  { id: 'stretch',    label: '5분 스트레칭', desc: '목·어깨·햄스트링' },
  { id: 'walk',       label: '5분 걷기',     desc: '폰 두고 한 바퀴' },
  { id: 'water',      label: '물 마시고 세수', desc: '찬물로 30초' },
  { id: 'study',      label: '바로 25분 집중', desc: '충동을 그대로 타이머에' },
];

export async function addUrge(u){
  const cfg = await getConfig();
  const ts = u.ts ?? Date.now();
  const rec = {
    id: uid(),
    ts,
    date: dayKey(ts, cfg.dayCutoffHour),
    hour: new Date(ts).getHours(),
    emotion: u.emotion || '',
    reason: u.reason || '',
    waitedSec: u.waitedSec ?? 0,
    outcome: u.outcome || 'resisted',          // resisted | replaced | gave_in
    replacement: u.replacement || null,
    contextBefore: u.contextBefore || 'idle',  // study | idle | late_night
  };
  await db.put('urges', rec);
  return rec;
}

export const updateUrge = (rec) => db.put('urges', rec);
export const urgesBetween = (fromKey, toKey) => db.range('urges', 'byDate', fromKey, toKey);

/** 직전 30분 안에 공부 세션이 끝났는지 → 충동 맥락 자동 판정 */
export async function detectUrgeContext(ts = Date.now()){
  const h = new Date(ts).getHours();
  if (h >= 23 || h < 5) return 'late_night';
  const cfg = await getConfig();
  const key = dayKey(ts, cfg.dayCutoffHour);
  const sessions = await db.range('studySessions', 'byDate', key, key);
  const recent = sessions.some(s => ts - s.endedAt < 30 * MIN && ts - s.endedAt >= 0);
  return recent ? 'study' : 'idle';
}

/* ── 알림 큐 ──────────────────────────────────── */
export async function scheduleReminder(r){
  const rec = {
    id: r.id || uid(),
    type: r.type,                 // wake | bedtime | breakEnd
    fireAt: r.fireAt,
    title: r.title,
    body: r.body || '',
    status: 'pending',
    createdAt: Date.now(),
  };
  await db.put('reminders', rec);
  return rec;
}

export const pendingReminders = () => db.range('reminders', 'byStatus', 'pending', 'pending');
export const markReminder = (rec, status) => db.put('reminders', { ...rec, status, firedAt: Date.now() });

/** 같은 타입의 미발화 예약을 지우고 새로 잡는다 (기상 알림 중복 방지) */
export async function rescheduleByType(type, r){
  const pend = await pendingReminders();
  for (const p of pend.filter(x => x.type === type)) await db.del('reminders', p.id);
  if (r) return scheduleReminder({ ...r, type });
}

/** 7일 지난 발화 완료 알림 정리 */
export async function pruneReminders(){
  const olds = await db.all('reminders');
  for (const r of olds){
    if (r.status !== 'pending' && Date.now() - (r.firedAt || r.createdAt) > 7 * DAY){
      await db.del('reminders', r.id);
    }
  }
}

export const raw = db;

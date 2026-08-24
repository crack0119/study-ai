// 날짜/시간 유틸. "하루"의 경계는 새벽 4시(설정 dayCutoffHour) — 새벽 2시는 전날로 친다.
export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

export function pad2(n){ return String(n).padStart(2,'0'); }

/** Date → 'YYYY-MM-DD' (로컬 기준) */
export function ymd(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

/** 'YYYY-MM-DD' → 그 날 00:00 로컬 Date */
export function fromYmd(s){
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d, 0, 0, 0, 0);
}

/** 새벽 컷오프를 적용한 '오늘' 키 */
export function dayKey(ts = Date.now(), cutoffHour = 4){
  const d = new Date(ts - cutoffHour * HOUR);
  return ymd(d);
}

/** 'HH:MM' → {h,m} */
export function parseHM(hm){
  const [h,m] = String(hm || '00:00').split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

/** 기준 Date의 날짜에 'HH:MM'을 붙인 Date */
export function atHM(base, hm){
  const { h, m } = parseHM(hm);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function addDays(d, n){ return new Date(d.getTime() + n * DAY); }

/** ms → '1시간 23분' / '23분' */
export function humanDur(ms){
  const total = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(total / 60), m = total % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}

/** 초 → 'MM:SS' */
export function mmss(sec){
  const s = Math.max(0, Math.round(sec));
  return `${pad2(Math.floor(s/60))}:${pad2(s%60)}`;
}

export function hhmm(d){ return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

/** 오늘 밤의 취침/기상 스케줄. 컷오프 기준 '오늘'의 밤을 반환. */
export function sleepWindow(cfg, now = new Date()){
  const key = dayKey(now.getTime(), cfg.dayCutoffHour ?? 4);
  const base = fromYmd(key);                       // 그 밤이 시작되는 캘린더 날짜
  let bedtime = atHM(base, cfg.bedtime);
  // 취침 목표가 컷오프 이전(예: 01:00)이면 다음 날로 넘긴다
  if (parseHM(cfg.bedtime).h < (cfg.dayCutoffHour ?? 4)) bedtime = addDays(bedtime, 1);
  const guardStart = new Date(bedtime.getTime() - (cfg.warnLeadMin ?? 30) * MIN);
  let wake = atHM(bedtime, cfg.wakeTime);
  if (wake <= bedtime) wake = addDays(wake, 1);     // 항상 취침 이후의 첫 기상 시각
  return { key, guardStart, bedtime, wake,
           inGuard: now >= guardStart && now < wake,
           afterBedtime: now >= bedtime };
}

/** 최근 n일의 dayKey 배열 (오래된 → 최신) */
export function lastDays(n, cutoffHour = 4, now = Date.now()){
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(now - i * DAY, cutoffHour));
  return out;
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

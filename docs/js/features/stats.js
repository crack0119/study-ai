// 요약 통계 — 별도 집계 스토어 없이 인덱스 범위 조회로 그때그때 계산한다.
import { getConfig, sleepLogsBetween, studyBetween, urgesBetween, judgeSleep, sleepStreak } from '../store.js';
import { lastDays } from '../lib/date.js';

export async function summary(days = 7){
  const cfg = await getConfig();
  const keys = lastDays(days, cfg.dayCutoffHour);
  const from = keys[0], to = keys[keys.length - 1];

  const [sleep, study, urges, streak] = await Promise.all([
    sleepLogsBetween(from, to),
    studyBetween(from, to),
    urgesBetween(from, to),
    sleepStreak(),
  ]);

  const judged = sleep.map(l => ({ log: l, ...judgeSleep(l) }));
  const durations = judged.map(j => j.durationMs).filter(Boolean);

  return {
    keys, from, to, streak,
    sleep: {
      logged: sleep.length,
      success: judged.filter(j => j.success).length,
      avgDurationMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      byDate: new Map(judged.map(j => [j.log.date, j])),
    },
    study: {
      sessions: study.length,
      focusSec: study.reduce((a, s) => a + (s.actualFocusSec || 0), 0),
      avgScore: study.filter(s => s.focusScore).length
        ? study.filter(s => s.focusScore).reduce((a, s) => a + s.focusScore, 0) / study.filter(s => s.focusScore).length
        : null,
      list: study,
    },
    urge: {
      total: urges.length,
      resisted: urges.filter(u => u.outcome !== 'gave_in').length,
      gaveIn: urges.filter(u => u.outcome === 'gave_in').length,
      byHour: hourHistogram(urges),
      byContext: countBy(urges, u => u.contextBefore),
      byEmotion: countBy(urges, u => u.emotion || '미기록'),
      list: urges.sort((a, b) => b.ts - a.ts),
    },
  };
}

export function hourHistogram(urges){
  const h = new Array(24).fill(0);
  for (const u of urges) h[u.hour ?? new Date(u.ts).getHours()]++;
  return h;
}

export function countBy(arr, fn){
  const m = new Map();
  for (const x of arr){ const k = fn(x); m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** 가장 뜨거운 3시간 구간 → '23–2시' */
export function peakRangeText(byHour, span = 3){
  const total = byHour.reduce((a, b) => a + b, 0);
  if (total < 3) return null;
  let best = -1, at = 0;
  for (let h = 0; h < 24; h++){
    let sum = 0;
    for (let k = 0; k < span; k++) sum += byHour[(h + k) % 24];
    if (sum > best){ best = sum; at = h; }
  }
  if (!best) return null;
  return `${at}\u2013${(at + span) % 24}\uc2dc`;
}

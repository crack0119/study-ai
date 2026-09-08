export const fmt = (n: number | null | undefined, dash = '—'): string =>
  n === null || n === undefined || !Number.isFinite(n) ? dash : n.toLocaleString('ko-KR')

export const fmtSigned = (n: number): string => (n > 0 ? `+${fmt(n)}` : fmt(n))

export const fmtDate = (ts: number | null): string => {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

export const fmtDateTime = (ts: number | null): string => {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${fmtDate(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 이름 목록을 "가, 나 외 2명" 처럼 줄인다. */
export const joinNames = (names: string[], max = 3): string => {
  if (names.length === 0) return ''
  if (names.length <= max) return names.join(', ')
  return `${names.slice(0, max).join(', ')} 외 ${names.length - max}명`
}

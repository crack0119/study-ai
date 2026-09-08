import type { AppState, EnglishTable, Round, ScoreEntry, Settings } from '../types'
import { ROSTER } from '../data/roster'
import { DEFAULT_ENGLISH_TABLE, createInitialState, emptyEntry } from '../data/defaults'
import { EXPLORE_SUBJECTS, KOREAN_CHOICES, MATH_CHOICES } from '../data/subjects'
import { sanitizeGrade, sanitizeScore } from './score'

export const STORAGE_KEY = 'score-battle:v1'

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null

const parseSlot = (v: unknown, allowed: readonly string[]): { subject: string | null; score: number | null } => {
  const raw = asRecord(v)
  return {
    subject: raw ? oneOf(raw.subject, allowed) : null,
    score: raw ? sanitizeScore(raw.score) : null,
  }
}

const parseEntry = (memberId: string, v: unknown): ScoreEntry => {
  const raw = asRecord(v)
  if (!raw) return emptyEntry(memberId)
  const explore = Array.isArray(raw.explore) ? raw.explore : []
  return {
    memberId,
    korean: parseSlot(raw.korean, KOREAN_CHOICES),
    math: parseSlot(raw.math, MATH_CHOICES),
    explore: [parseSlot(explore[0], EXPLORE_SUBJECTS), parseSlot(explore[1], EXPLORE_SUBJECTS)],
    englishGrade: sanitizeGrade(raw.englishGrade),
    historyGrade: sanitizeGrade(raw.historyGrade),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : null,
  }
}

const parseRound = (v: unknown): Round | null => {
  const raw = asRecord(v)
  if (!raw || typeof raw.id !== 'string') return null
  const entriesRaw = asRecord(raw.entries) ?? {}
  const entries: Record<string, ScoreEntry> = {}
  for (const m of ROSTER) entries[m.id] = parseEntry(m.id, entriesRaw[m.id])

  const rescueRaw = asRecord(raw.rescue)
  const rescueMember =
    rescueRaw && typeof rescueRaw.memberId === 'string' && ROSTER.some((m) => m.id === rescueRaw.memberId)
      ? rescueRaw.memberId
      : null

  return {
    id: raw.id,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : '이름 없는 회차',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    entries,
    rescue: rescueMember
      ? {
          memberId: rescueMember,
          mode: oneOf(rescueRaw?.mode, ['random', 'manual'] as const) ?? 'random',
          decidedAt: typeof rescueRaw?.decidedAt === 'number' ? (rescueRaw.decidedAt as number) : Date.now(),
        }
      : null,
    finalizedAt: typeof raw.finalizedAt === 'number' ? raw.finalizedAt : null,
  }
}

const parseSettings = (v: unknown): Settings => {
  const raw = asRecord(v)
  const conv = asRecord(raw?.englishConversion)
  const tableRaw = asRecord(conv?.table)
  const table: EnglishTable = { ...DEFAULT_ENGLISH_TABLE }
  if (tableRaw) {
    for (let g = 1; g <= 9; g += 1) {
      const n = Number(tableRaw[g])
      if (Number.isFinite(n) && n >= 0 && n <= 200) table[g] = Math.round(n)
    }
  }
  return {
    englishConversion: { enabled: conv?.enabled === true, table },
    theme: oneOf(raw?.theme, ['system', 'light', 'dark'] as const) ?? 'system',
  }
}

/** 어떤 모양이 들어와도 앱이 쓸 수 있는 상태로 깎아낸다. 복구 불가면 null. */
export const parseState = (v: unknown): AppState | null => {
  const raw = asRecord(v)
  if (!raw) return null
  const rounds = (Array.isArray(raw.rounds) ? raw.rounds : []).map(parseRound).filter((r): r is Round => r !== null)
  if (rounds.length === 0) return null
  const currentRoundId =
    typeof raw.currentRoundId === 'string' && rounds.some((r) => r.id === raw.currentRoundId)
      ? raw.currentRoundId
      : rounds[0].id
  return { version: 1, rounds, currentRoundId, settings: parseSettings(raw.settings) }
}

export const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    return parseState(JSON.parse(raw)) ?? createInitialState()
  } catch {
    return createInitialState()
  }
}

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 저장 공간이 막혀도 화면은 계속 돌아가야 한다. */
  }
}

export const clearState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 무시 */
  }
}

/** 한글 파일명은 브라우저가 통째로 버리는 경우가 있어 ASCII 로만 만든다. */
export const exportFilename = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `score-battle-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`
}

export const downloadJson = (state: AppState): void => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const readJsonFile = (file: File): Promise<AppState> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.onload = () => {
      try {
        const parsed = parseState(JSON.parse(String(reader.result)))
        if (!parsed) throw new Error('형식이 맞지 않습니다.')
        resolve(parsed)
      } catch (e) {
        reject(e instanceof Error ? e : new Error('불러오기에 실패했습니다.'))
      }
    }
    reader.readAsText(file)
  })

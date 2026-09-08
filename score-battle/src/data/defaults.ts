import type { AppState, EnglishTable, Round, ScoreEntry, Settings } from '../types'
import { ROSTER } from './roster'

export const SCORE_MIN = 0
export const SCORE_MAX = 200

/** 1등급 140에서 9등급 60까지 10점 간격. 설정에서 자유롭게 고칠 수 있다. */
export const DEFAULT_ENGLISH_TABLE: EnglishTable = {
  1: 140, 2: 130, 3: 120, 4: 110, 5: 100, 6: 90, 7: 80, 8: 70, 9: 60,
}

export const DEFAULT_SETTINGS: Settings = {
  englishConversion: { enabled: false, table: { ...DEFAULT_ENGLISH_TABLE } },
  theme: 'system',
}

export const emptyEntry = (memberId: string): ScoreEntry => ({
  memberId,
  korean: { subject: null, score: null },
  math: { subject: null, score: null },
  explore: [
    { subject: null, score: null },
    { subject: null, score: null },
  ],
  englishGrade: null,
  historyGrade: null,
  updatedAt: null,
})

export const emptyEntries = (): Record<string, ScoreEntry> =>
  Object.fromEntries(ROSTER.map((m) => [m.id, emptyEntry(m.id)]))

export const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** "10월 학평" 처럼 만들어진 시점의 달을 기본 이름으로 쓴다. */
export const defaultRoundLabel = (at = new Date()): string =>
  `${at.getFullYear()}년 ${at.getMonth() + 1}월 모의고사`

export const createRound = (label?: string): Round => ({
  id: newId(),
  label: label?.trim() || defaultRoundLabel(),
  createdAt: Date.now(),
  entries: emptyEntries(),
  rescue: null,
  finalizedAt: null,
})

export const createInitialState = (): AppState => {
  const first = createRound()
  return {
    version: 1,
    rounds: [first],
    currentRoundId: first.id,
    settings: { ...DEFAULT_SETTINGS, englishConversion: { ...DEFAULT_SETTINGS.englishConversion, table: { ...DEFAULT_ENGLISH_TABLE } } },
  }
}

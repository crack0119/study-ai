export type TeamId = 'A' | 'B'

export interface Member {
  id: string
  name: string
  team: TeamId
}

export type KoreanChoice = '화법과작문' | '언어와매체'
export type MathChoice = '확률과통계' | '미적분' | '기하'

/** 과목 하나에 대한 입력 한 칸. score 는 표준점수(0~200 정수), 미입력이면 null. */
export interface SubjectSlot {
  subject: string | null
  score: number | null
}

export interface ScoreEntry {
  memberId: string
  korean: SubjectSlot
  math: SubjectSlot
  explore: [SubjectSlot, SubjectSlot]
  /** 1~9. 설정에서 환산을 켰을 때만 합계에 들어간다. */
  englishGrade: number | null
  /** 기록용. 승부 계산에는 절대 들어가지 않는다. */
  historyGrade: number | null
  updatedAt: number | null
}

export type RescueMode = 'random' | 'manual'

export interface RescueResult {
  memberId: string
  mode: RescueMode
  decidedAt: number
}

export interface Round {
  id: string
  label: string
  createdAt: number
  entries: Record<string, ScoreEntry>
  rescue: RescueResult | null
  /** 확정한 회차만 상대 전적에 집계된다. */
  finalizedAt: number | null
}

export type EnglishTable = Record<number, number>

export interface Settings {
  englishConversion: {
    enabled: boolean
    table: EnglishTable
  }
  theme: 'system' | 'light' | 'dark'
}

export interface AppState {
  version: 1
  rounds: Round[]
  currentRoundId: string
  settings: Settings
}

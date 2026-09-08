import type { AppState, Member, Round, ScoreEntry, Settings, TeamId } from '../types'
import { ROSTER, TEAM_IDS, membersOf } from '../data/roster'
import { SCORE_MAX, SCORE_MIN, emptyEntry } from '../data/defaults'

export type FieldKey = 'korean' | 'math' | 'explore1' | 'explore2' | 'english'

export const FIELD_LABEL: Record<FieldKey, string> = {
  korean: '국어',
  math: '수학',
  explore1: '탐구 ①',
  explore2: '탐구 ②',
  english: '영어',
}

export interface MemberScore {
  member: Member
  entry: ScoreEntry
  korean: number | null
  math: number | null
  explore1: number | null
  explore2: number | null
  /** 환산이 꺼져 있으면 null. */
  english: number | null
  /** 표준점수 4개의 합. */
  base: number
  /** base + 영어 환산점. 승부에 쓰는 값. */
  total: number
  missing: FieldKey[]
  complete: boolean
}

export interface TeamScore {
  team: TeamId
  total: number
  members: MemberScore[]
  incomplete: MemberScore[]
  complete: boolean
}

export interface Matchup {
  teams: Record<TeamId, TeamScore>
  /** 동점이면 null. */
  winner: TeamId | null
  loser: TeamId | null
  diff: number
  /** 한 명이라도 미제출이면 잠정 결과. */
  provisional: boolean
  missingNames: string[]
  /** 아무도 아무것도 입력하지 않은 상태. */
  empty: boolean
}

export interface Contribution {
  member: Member
  score: MemberScore
  /** 팀 총점 대비 비중(%) */
  share: number
  teamRank: number
  overallRank: number
  /** 이 사람을 빼면 승패가 뒤집히는가. */
  decisive: boolean
}

const isFilled = (v: number | null): v is number => typeof v === 'number' && Number.isFinite(v)

/** 표준점수 입력값을 규칙(0~200 정수)에 맞게 정리한다. 범위 밖이면 null. */
export const sanitizeScore = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  if (n < SCORE_MIN || n > SCORE_MAX) return null
  return n
}

export const sanitizeGrade = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isInteger(n) || n < 1 || n > 9) return null
  return n
}

export const englishPoints = (grade: number | null, settings: Settings): number | null => {
  if (!settings.englishConversion.enabled) return null
  if (!isFilled(grade)) return null
  const v = settings.englishConversion.table[grade]
  return isFilled(v) ? v : null
}

export const scoreMember = (member: Member, round: Round, settings: Settings): MemberScore => {
  const entry = round.entries[member.id] ?? emptyEntry(member.id)
  const korean = isFilled(entry.korean.score) ? entry.korean.score : null
  const math = isFilled(entry.math.score) ? entry.math.score : null
  const explore1 = isFilled(entry.explore[0]?.score ?? null) ? entry.explore[0].score : null
  const explore2 = isFilled(entry.explore[1]?.score ?? null) ? entry.explore[1].score : null
  const english = englishPoints(entry.englishGrade, settings)

  const missing: FieldKey[] = []
  if (korean === null) missing.push('korean')
  if (math === null) missing.push('math')
  if (explore1 === null) missing.push('explore1')
  if (explore2 === null) missing.push('explore2')
  if (settings.englishConversion.enabled && english === null) missing.push('english')

  const base = (korean ?? 0) + (math ?? 0) + (explore1 ?? 0) + (explore2 ?? 0)
  const total = base + (english ?? 0)

  return {
    member,
    entry,
    korean,
    math,
    explore1,
    explore2,
    english,
    base,
    total,
    missing,
    complete: missing.length === 0,
  }
}

export const scoreTeam = (team: TeamId, round: Round, settings: Settings): TeamScore => {
  const members = membersOf(team).map((m) => scoreMember(m, round, settings))
  const incomplete = members.filter((m) => !m.complete)
  return {
    team,
    total: members.reduce((sum, m) => sum + m.total, 0),
    members,
    incomplete,
    complete: incomplete.length === 0,
  }
}

export const buildMatchup = (round: Round, settings: Settings): Matchup => {
  const teams = {
    A: scoreTeam('A', round, settings),
    B: scoreTeam('B', round, settings),
  } as Record<TeamId, TeamScore>

  const diff = Math.abs(teams.A.total - teams.B.total)
  const winner: TeamId | null =
    teams.A.total === teams.B.total ? null : teams.A.total > teams.B.total ? 'A' : 'B'
  const loser: TeamId | null = winner === null ? null : winner === 'A' ? 'B' : 'A'

  const missingNames = TEAM_IDS.flatMap((t) => teams[t].incomplete.map((m) => m.member.name))

  return {
    teams,
    winner,
    loser,
    diff,
    provisional: missingNames.length > 0,
    missingNames,
    empty: teams.A.total === 0 && teams.B.total === 0,
  }
}

/**
 * 이 사람 점수가 빠졌으면 결과가 뒤집혔을까.
 * 팀 총점에서 한 명만 덜어내고 승패를 다시 계산한다.
 */
export const isDecisive = (matchup: Matchup, target: MemberScore): boolean => {
  if (matchup.empty) return false
  const t = target.member.team
  const other: TeamId = t === 'A' ? 'B' : 'A'
  const without = matchup.teams[t].total - target.total
  const rival = matchup.teams[other].total
  const newWinner: TeamId | null = without === rival ? null : without > rival ? t : other
  return newWinner !== matchup.winner
}

export const buildContributions = (matchup: Matchup): Contribution[] => {
  const all = [...matchup.teams.A.members, ...matchup.teams.B.members]
  const overall = [...all].sort((a, b) => b.total - a.total)
  const rankIn = (list: MemberScore[], s: MemberScore) =>
    list.findIndex((x) => x.member.id === s.member.id) + 1

  return all
    .map((s) => {
      const teamList = [...matchup.teams[s.member.team].members].sort((a, b) => b.total - a.total)
      const teamTotal = matchup.teams[s.member.team].total
      return {
        member: s.member,
        score: s,
        share: teamTotal > 0 ? (s.total / teamTotal) * 100 : 0,
        teamRank: rankIn(teamList, s),
        overallRank: rankIn(overall, s),
        decisive: isDecisive(matchup, s),
      }
    })
    .sort((a, b) => b.score.total - a.score.total)
}

/**
 * MVP: 빼면 승패가 뒤집히는 사람 중 최고 득점자.
 * 아무도 승부를 뒤집지 못하면(압승이거나 무승부) 전체 1위를 MVP로 둔다.
 */
export const findMvp = (contributions: Contribution[]): Contribution | null => {
  if (contributions.length === 0) return null
  const decisive = contributions.filter((c) => c.decisive)
  const pool = decisive.length > 0 ? decisive : contributions
  const best = pool.reduce((a, b) => (b.score.total > a.score.total ? b : a))
  return best.score.total > 0 ? best : null
}

export interface CategoryAverage {
  category: string
  A: number | null
  B: number | null
}

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10

/** 과목별 팀 평균. 입력한 사람만 평균에 넣는다. */
export const categoryAverages = (matchup: Matchup, settings: Settings): CategoryAverage[] => {
  const pick = (team: TeamId, fn: (m: MemberScore) => number[]) =>
    mean(matchup.teams[team].members.flatMap(fn))

  const rows: CategoryAverage[] = [
    {
      category: '국어',
      A: pick('A', (m) => (m.korean === null ? [] : [m.korean])),
      B: pick('B', (m) => (m.korean === null ? [] : [m.korean])),
    },
    {
      category: '수학',
      A: pick('A', (m) => (m.math === null ? [] : [m.math])),
      B: pick('B', (m) => (m.math === null ? [] : [m.math])),
    },
    {
      category: '탐구',
      A: pick('A', (m) => [m.explore1, m.explore2].filter(isFilled)),
      B: pick('B', (m) => [m.explore1, m.explore2].filter(isFilled)),
    },
  ]

  if (settings.englishConversion.enabled) {
    rows.push({
      category: '영어',
      A: pick('A', (m) => (m.english === null ? [] : [m.english])),
      B: pick('B', (m) => (m.english === null ? [] : [m.english])),
    })
  }
  return rows
}

export interface HeadToHead {
  A: number
  B: number
  draw: number
  finalized: number
}

/** 확정한 회차만 세어서 상대 전적을 만든다. */
export const headToHead = (state: AppState): HeadToHead => {
  const result: HeadToHead = { A: 0, B: 0, draw: 0, finalized: 0 }
  for (const round of state.rounds) {
    if (!round.finalizedAt) continue
    const m = buildMatchup(round, state.settings)
    if (m.empty) continue
    result.finalized += 1
    if (m.winner === null) result.draw += 1
    else result[m.winner] += 1
  }
  return result
}

export const filledCount = (round: Round, settings: Settings): { done: number; total: number } => {
  const scores = ROSTER.map((m) => scoreMember(m, round, settings))
  return { done: scores.filter((s) => s.complete).length, total: ROSTER.length }
}

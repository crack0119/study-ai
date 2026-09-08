import type { Member, TeamId } from '../types'

export const TEAM_LABEL: Record<TeamId, string> = { A: 'Team A', B: 'Team B' }

export const ROSTER: Member[] = [
  { id: 'a1', name: '이승제', team: 'A' },
  { id: 'a2', name: '강채현', team: 'A' },
  { id: 'a3', name: '송민준', team: 'A' },
  { id: 'a4', name: '장예준', team: 'A' },
  { id: 'a5', name: '강민찬', team: 'A' },
  { id: 'b1', name: '이승현', team: 'B' },
  { id: 'b2', name: '이재훈', team: 'B' },
  { id: 'b3', name: '김유현', team: 'B' },
  { id: 'b4', name: '모재형', team: 'B' },
  { id: 'b5', name: '윤희찬', team: 'B' },
]

export const TEAM_IDS: TeamId[] = ['A', 'B']

export const membersOf = (team: TeamId): Member[] => ROSTER.filter((m) => m.team === team)

export const memberById = (id: string): Member | undefined => ROSTER.find((m) => m.id === id)

export const nameOf = (id: string): string => memberById(id)?.name ?? '알 수 없음'

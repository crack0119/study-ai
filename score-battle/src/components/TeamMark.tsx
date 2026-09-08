import type { TeamId } from '../types'
import { cx } from './ui'

export const teamText = (team: TeamId) => (team === 'A' ? 'text-team-a' : 'text-team-b')
export const teamBg = (team: TeamId) => (team === 'A' ? 'bg-team-a' : 'bg-team-b')
export const teamWash = (team: TeamId) => (team === 'A' ? 'bg-team-a-wash' : 'bg-team-b-wash')
export const teamBorder = (team: TeamId) => (team === 'A' ? 'border-team-a' : 'border-team-b')

export const TeamMark = ({ team, className }: { team: TeamId; className?: string }) => (
  <span className={cx('inline-flex items-center gap-1.5 text-[12px] font-semibold', teamText(team), className)}>
    <span className={cx('size-2 rounded-full', teamBg(team))} />
    Team {team}
  </span>
)

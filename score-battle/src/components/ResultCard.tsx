import { forwardRef } from 'react'
import type { Matchup } from '../lib/score'
import type { Round, TeamId } from '../types'
import { fmt, fmtDate, joinNames } from '../lib/format'
import { cx } from './ui'
import { teamBg, teamText } from './TeamMark'
import { membersOf } from '../data/roster'

const TeamColumn = ({ team, matchup, align }: { team: TeamId; matchup: Matchup; align: 'left' | 'right' }) => {
  const t = matchup.teams[team]
  const won = matchup.winner === team
  return (
    <div className={cx('flex-1', align === 'right' && 'text-right')}>
      <div className={cx('flex items-center gap-1.5', align === 'right' && 'justify-end')}>
        <span className={cx('size-2 rounded-full', teamBg(team))} />
        <span className={cx('text-[12px] font-bold', teamText(team))}>TEAM {team}</span>
      </div>
      <div className={cx('tnum mt-1.5 text-[40px] font-extrabold leading-none tracking-tight', won && teamText(team))}>
        {fmt(t.total, '0')}
      </div>
      <div
        className={cx(
          'mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-ink-mute',
          align === 'right' && 'justify-end',
        )}
      >
        {membersOf(team).map((m) => (
          <span key={m.id}>{m.name}</span>
        ))}
      </div>
    </div>
  )
}

interface Props {
  round: Round
  matchup: Matchup
}

/** 단톡에 그대로 던질 수 있게 만든 결과 카드. 화면에서도 이 모습 그대로 보인다. */
export const ResultCard = forwardRef<HTMLDivElement, Props>(({ round, matchup }, ref) => {
  const { winner, diff, provisional } = matchup
  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-semibold tracking-tight">{round.label}</span>
        <span className="text-[11px] text-ink-mute">{fmtDate(round.createdAt)}</span>
      </div>

      <div className="flex items-start gap-3 px-4 pb-4 pt-5">
        <TeamColumn team="A" matchup={matchup} align="left" />
        <div className="pt-4 text-[11px] font-semibold text-ink-mute">VS</div>
        <TeamColumn team="B" matchup={matchup} align="right" />
      </div>

      <div className="border-t border-line px-4 py-3.5">
        {matchup.empty ? (
          <p className="text-center text-[13px] text-ink-mute">아직 입력된 점수가 없습니다</p>
        ) : (
          <div className="flex items-baseline justify-center gap-2">
            {winner ? (
              <>
                <span className={cx('text-[17px] font-extrabold tracking-tight', teamText(winner))}>
                  Team {winner} 승
                </span>
                <span className="tnum text-[13px] text-ink-soft">{fmt(diff)}점 차</span>
              </>
            ) : (
              <span className="text-[17px] font-extrabold tracking-tight">동점</span>
            )}
          </div>
        )}
        {provisional && !matchup.empty ? (
          <p className="mt-2 text-center text-[11px] leading-relaxed text-warn">
            잠정 결과 · 미제출 {joinNames(matchup.missingNames, 4)}
          </p>
        ) : null}
      </div>
    </div>
  )
})

ResultCard.displayName = 'ResultCard'

import { useMemo, useState } from 'react'
import { useStore } from '../store/AppStore'
import { buildContributions, buildMatchup, categoryAverages, findMvp } from '../lib/score'
import { SubjectBarChart } from '../components/SubjectBarChart'
import { Card, Empty, SectionTitle, Segmented, cx } from '../components/ui'
import { teamBg, teamText } from '../components/TeamMark'
import { fmt } from '../lib/format'
import { shortName } from '../data/subjects'
import type { TeamId } from '../types'

type Scope = 'overall' | 'A' | 'B'

export const CompareScreen = () => {
  const { state, round } = useStore()
  const matchup = useMemo(() => buildMatchup(round, state.settings), [round, state.settings])
  const contributions = useMemo(() => buildContributions(matchup), [matchup])
  const mvp = useMemo(() => findMvp(contributions), [contributions])
  const averages = useMemo(() => categoryAverages(matchup, state.settings), [matchup, state.settings])
  const [scope, setScope] = useState<Scope>('overall')

  const list = scope === 'overall' ? contributions : contributions.filter((c) => c.member.team === scope)

  if (matchup.empty) {
    return <Empty>아직 입력된 점수가 없습니다. 입력 탭에서 점수를 채우면 비교가 나타납니다.</Empty>
  }

  const mvpDetail = (() => {
    if (!mvp || !mvp.decisive || !matchup.winner) return null
    const t = mvp.member.team
    const other: TeamId = t === 'A' ? 'B' : 'A'
    const without = matchup.teams[t].total - mvp.score.total
    const gap = Math.abs(matchup.teams[other].total - without)
    return { other, gap, sameTeamAsWinner: t === matchup.winner }
  })()

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle aside="입력한 사람만 평균에 반영">과목별 팀 평균</SectionTitle>
        <Card className="px-3 py-3">
          <SubjectBarChart data={averages} />
        </Card>
      </div>

      {mvp ? (
        <div>
          <SectionTitle aside={mvp.decisive ? '승부를 가른 한 명' : '최고 득점'}>MVP</SectionTitle>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className={cx('flex size-11 items-center justify-center rounded-full text-[15px] font-bold text-canvas', teamBg(mvp.member.team))}>
                {mvp.member.name.slice(-2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[17px] font-bold tracking-tight">{mvp.member.name}</span>
                  <span className={cx('text-[11.5px] font-semibold', teamText(mvp.member.team))}>
                    Team {mvp.member.team}
                  </span>
                </div>
                <p className="tnum mt-0.5 text-[12px] text-ink-mute">
                  {fmt(mvp.score.total)}점 · 팀 내 {mvp.teamRank}위 · 전체 {mvp.overallRank}위
                </p>
              </div>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-soft">
              {mvpDetail ? (
                mvpDetail.sameTeamAsWinner ? (
                  <>
                    {mvp.member.name}의 <span className="tnum font-semibold text-ink">{fmt(mvp.score.total)}점</span>이
                    빠졌다면 <span className="font-semibold text-ink">Team {mvpDetail.other}</span>가{' '}
                    <span className="tnum font-semibold text-ink">{fmt(mvpDetail.gap)}점</span> 차로 이겼습니다.
                  </>
                ) : (
                  <>이 점수를 빼면 승부가 뒤집힙니다.</>
                )
              ) : (
                <>혼자 빠져도 승부가 뒤집히지는 않지만, 이번 회차 최고 득점입니다.</>
              )}
            </p>
          </Card>
        </div>
      ) : null}

      <div>
        <SectionTitle
          aside={
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: 'overall', label: '전체' },
                { value: 'A', label: 'A팀' },
                { value: 'B', label: 'B팀' },
              ]}
            />
          }
        >
          기여도 순위
        </SectionTitle>
        <Card>
          <ul>
            {list.map((c, i) => (
              <li key={c.member.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span className="tnum w-5 shrink-0 text-[13px] font-semibold text-ink-mute">{i + 1}</span>
                <span className={cx('size-2 shrink-0 rounded-full', teamBg(c.member.team))} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-medium">{c.member.name}</span>
                    {c.decisive ? (
                      <span className="rounded border border-line px-1 py-px text-[10px] text-ink-mute">결정적</span>
                    ) : null}
                    {!c.score.complete ? <span className="text-[10.5px] text-warn">미제출</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-ink-mute">
                    {shortName(c.score.entry.korean.subject)} · {shortName(c.score.entry.math.subject)} ·{' '}
                    {shortName(c.score.entry.explore[0].subject)} · {shortName(c.score.entry.explore[1].subject)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="tnum text-[15px] font-semibold">{fmt(c.score.total)}</div>
                  <div className="tnum text-[10.5px] text-ink-mute">팀 내 {c.share.toFixed(1)}%</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-ink-mute">
          ‘결정적’은 그 사람 점수를 빼면 승패가 뒤집히는 경우입니다. 팀 내 비중은 팀 총점 대비 개인 점수 비율이에요.
        </p>
      </div>
    </div>
  )
}

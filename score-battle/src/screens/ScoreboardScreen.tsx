import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useStore } from '../store/AppStore'
import { buildMatchup, headToHead } from '../lib/score'
import { ResultCard } from '../components/ResultCard'
import { Button, Card, SectionTitle, cx } from '../components/ui'
import { teamBg, teamText } from '../components/TeamMark'
import { IconAlert, IconShare } from '../components/icons'
import { fmt, joinNames } from '../lib/format'
import type { TeamId } from '../types'

const TeamRoster = ({ team }: { team: TeamId }) => {
  const { state, round } = useStore()
  const matchup = useMemo(() => buildMatchup(round, state.settings), [round, state.settings])
  const rows = [...matchup.teams[team].members].sort((a, b) => b.total - a.total)
  // 0에서 시작하되 이번 회차 최고 득점을 가득 찬 길이로 잡아 차이가 보이게 한다.
  const peak = Math.max(
    1,
    ...matchup.teams.A.members.map((m) => m.total),
    ...matchup.teams.B.members.map((m) => m.total),
  )

  return (
    <Card>
      <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <span className={cx('flex items-center gap-1.5 text-[12.5px] font-bold', teamText(team))}>
          <span className={cx('size-2 rounded-full', teamBg(team))} />
          Team {team}
        </span>
        <span className="tnum text-[15px] font-bold">{fmt(matchup.teams[team].total, '0')}</span>
      </div>
      <ul>
        {rows.map((s) => (
          <li key={s.member.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
            <span className="w-14 shrink-0 text-[13.5px] font-medium">{s.member.name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cx('h-full rounded-full', teamBg(team))}
                style={{ width: `${Math.min(100, (s.total / peak) * 100)}%` }}
              />
            </div>
            {s.complete ? (
              <span className="tnum w-11 shrink-0 text-right text-[14px] font-semibold">{fmt(s.total)}</span>
            ) : (
              <span className="w-11 shrink-0 text-right text-[11.5px] text-warn">미제출</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export const ScoreboardScreen = () => {
  const { state, round } = useStore()
  const matchup = useMemo(() => buildMatchup(round, state.settings), [round, state.settings])
  const record = useMemo(() => headToHead(state), [state])
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const capture = async () => {
    if (!cardRef.current) return
    setBusy(true)
    setNote(null)
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff'
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: bg, cacheBust: true })
      // 한글 파일명은 일부 브라우저가 버리므로 ASCII 로만 만든다.
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const filename = `score-battle-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.png`
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], filename, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: round.label })
        setNote('공유 시트를 열었어요')
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setNote('이미지를 저장했어요')
      }
    } catch {
      setNote('이미지를 만들지 못했어요. 다시 시도해 주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle aside={record.finalized > 0 ? `상대 전적 ${record.A}승 ${record.B}패${record.draw ? ` ${record.draw}무` : ''}` : '확정된 회차 없음'}>
          이번 회차
        </SectionTitle>
        <div className="pop">
          <ResultCard ref={cardRef} round={round} matchup={matchup} />
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <Button variant="primary" className="flex-1" onClick={capture} disabled={busy || matchup.empty}>
            <IconShare width={16} height={16} />
            {busy ? '만드는 중…' : '결과 카드 저장·공유'}
          </Button>
        </div>
        {note ? <p className="mt-2 px-1 text-[11.5px] text-ink-mute">{note}</p> : null}
      </div>

      {matchup.provisional && !matchup.empty ? (
        <div className="flex gap-2.5 rounded-lg border border-warn/35 bg-warn/8 px-3.5 py-3">
          <IconAlert width={16} height={16} className="mt-px shrink-0 text-warn" />
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            아직 <span className="font-semibold text-ink">{joinNames(matchup.missingNames, 5)}</span> 점수가 비어 있어
            지금 점수는 잠정입니다. 다 채워지면 순위가 바뀔 수 있어요.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <SectionTitle aside="팀별 합계">팀 구성</SectionTitle>
        <TeamRoster team="A" />
        <TeamRoster team="B" />
      </div>
    </div>
  )
}

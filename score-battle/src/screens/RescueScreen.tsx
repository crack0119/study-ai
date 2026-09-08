import { useMemo, useState } from 'react'
import { useStore } from '../store/AppStore'
import { buildContributions, buildMatchup } from '../lib/score'
import { membersOf, nameOf } from '../data/roster'
import { randomIndex } from '../lib/rng'
import { Wheel } from '../components/Wheel'
import { Button, Card, Empty, Modal, SectionTitle, Segmented, cx } from '../components/ui'
import { teamBg, teamText } from '../components/TeamMark'
import { IconUndo } from '../components/icons'
import { fmt, fmtDateTime } from '../lib/format'

export const RescueScreen = () => {
  const { state, dispatch, round } = useStore()
  const matchup = useMemo(() => buildMatchup(round, state.settings), [round, state.settings])
  const contributions = useMemo(() => buildContributions(matchup), [matchup])

  const [mode, setMode] = useState<'random' | 'manual'>('random')
  const [picked, setPicked] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [reveal, setReveal] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)

  const loser = matchup.loser
  const members = loser ? membersOf(loser) : []
  const rescue = round.rescue

  // 패배 팀 안에서 가장 많이 낸 사람을 구제 후보로 미리 짚어 준다.
  const recommended = useMemo(
    () => (loser ? contributions.filter((c) => c.member.team === loser)[0] ?? null : null),
    [contributions, loser],
  )

  if (matchup.empty) return <Empty>점수가 입력되면 패배 팀이 정해지고, 그때 룰렛을 돌릴 수 있습니다.</Empty>
  if (!loser) return <Empty>지금은 동점입니다. 승부가 갈려야 구제 룰렛을 돌릴 수 있어요.</Empty>

  const lockedIndex = rescue ? members.findIndex((m) => m.id === rescue.memberId) : -1

  const spin = () => {
    if (rescue || spinning) return
    const index = mode === 'random' ? randomIndex(members.length) : members.findIndex((m) => m.id === picked)
    if (index < 0) return
    setTargetIndex(index)
    setReveal(false)
    setSpinning(true)
  }

  const settle = () => {
    if (targetIndex === null) return
    dispatch({ type: 'rescue/set', memberId: members[targetIndex].id, mode })
    setSpinning(false)
    setReveal(true)
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle aside={`${fmt(matchup.diff)}점 차 패배`}>
          <span className={teamText(loser)}>Team {loser}</span> 구제 룰렛
        </SectionTitle>
        <Card className="px-4 pb-4 pt-3">
          {matchup.provisional ? (
            <p className="mb-3 rounded-md border border-warn/35 bg-warn/8 px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
              아직 미제출자가 있어 승패가 바뀔 수 있습니다. 점수를 다 채운 뒤에 돌리는 걸 권합니다.
            </p>
          ) : null}

          <Wheel
            members={members}
            team={loser}
            spinning={spinning}
            targetIndex={targetIndex}
            lockedIndex={lockedIndex >= 0 ? lockedIndex : null}
            highlightIndex={
              rescue || !recommended ? null : members.findIndex((m) => m.id === recommended.member.id)
            }
            onSettled={settle}
          />

          {rescue ? (
            <div className={cx('mt-4 rounded-lg border border-line px-4 py-3.5 text-center', reveal && 'pop')}>
              <p className="text-[11.5px] text-ink-mute">벌칙 제외</p>
              <p className="mt-1 text-[24px] font-extrabold tracking-tight">{nameOf(rescue.memberId)}</p>
              <p className="mt-1.5 text-[11px] text-ink-mute">
                {rescue.mode === 'random' ? '랜덤' : '수동 지정'} · {fmtDateTime(rescue.decidedAt)}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-ink-soft">뽑는 방식</span>
                <Segmented
                  value={mode}
                  onChange={(v) => {
                    setMode(v)
                    setPicked(null)
                  }}
                  options={[
                    { value: 'random', label: '랜덤' },
                    { value: 'manual', label: '수동 지정' },
                  ]}
                />
              </div>

              {mode === 'manual' ? (
                <div className="grid grid-cols-5 gap-1.5">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={spinning}
                      onClick={() => setPicked(m.id)}
                      className={cx(
                        'rounded-lg border py-2 text-[12px] font-medium transition-colors',
                        picked === m.id
                          ? 'border-transparent bg-ink text-canvas'
                          : 'border-line bg-surface text-ink-soft',
                      )}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <Button
                variant="primary"
                className="w-full"
                onClick={spin}
                disabled={spinning || (mode === 'manual' && !picked)}
              >
                {spinning ? '돌아가는 중…' : mode === 'manual' && !picked ? '먼저 한 명을 고르세요' : '룰렛 돌리기'}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {recommended ? (
        <Card className="flex items-center gap-3 px-4 py-3.5">
          <span className={cx('size-2 shrink-0 rounded-full', teamBg(loser))} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px]">
              <span className="font-semibold">{recommended.member.name}</span>
              <span className="text-ink-mute"> · 구제 추천 후보</span>
            </p>
            <p className="tnum mt-0.5 text-[11px] text-ink-mute">
              팀 내 1위 {fmt(recommended.score.total)}점 · 비중 {recommended.share.toFixed(1)}%
              {rescue ? '' : ' · 룰렛에 점선으로 표시'}
            </p>
          </div>
        </Card>
      ) : null}

      {rescue ? (
        <div>
          <Button variant="ghost" className="w-full" onClick={() => setConfirmUndo(true)}>
            <IconUndo width={15} height={15} />
            결과 되돌리기
          </Button>
          <p className="mt-1.5 px-1 text-center text-[11px] text-ink-mute">
            한 번 돌린 결과는 고정됩니다. 다시 돌리려면 되돌리기를 먼저 눌러야 해요.
          </p>
        </div>
      ) : null}

      <Modal
        open={confirmUndo}
        title="구제 결과를 되돌릴까요?"
        description={
          <>
            <span className="font-semibold text-ink">{rescue ? nameOf(rescue.memberId) : ''}</span> 구제 결과가 지워지고
            룰렛을 다시 돌릴 수 있게 됩니다.
          </>
        }
        confirmLabel="되돌리기"
        destructive
        onCancel={() => setConfirmUndo(false)}
        onConfirm={() => {
          dispatch({ type: 'rescue/clear' })
          setConfirmUndo(false)
          setTargetIndex(null)
          setReveal(false)
          setPicked(null)
        }}
      />
    </div>
  )
}

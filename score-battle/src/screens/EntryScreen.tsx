import { useMemo, useState } from 'react'
import { ROSTER, membersOf } from '../data/roster'
import { EXPLORE_GROUPS, KOREAN_CHOICES, MATH_CHOICES } from '../data/subjects'
import type { SubjectSlot, TeamId } from '../types'
import { useStore } from '../store/AppStore'
import { scoreMember } from '../lib/score'
import { ScoreField } from '../components/ScoreField'
import { SubjectSelect } from '../components/SubjectSelect'
import { Card, SectionTitle, cx } from '../components/ui'
import { teamBg, teamText } from '../components/TeamMark'
import { IconCheck } from '../components/icons'
import { fmt, fmtDateTime } from '../lib/format'

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const GradePicker = ({
  value,
  onChange,
  muted,
}: {
  value: number | null
  onChange: (v: number | null) => void
  muted?: boolean
}) => (
  <div className="flex gap-1">
    {GRADES.map((g) => (
      <button
        key={g}
        type="button"
        onClick={() => onChange(value === g ? null : g)}
        className={cx(
          'tnum h-9 flex-1 rounded-md border text-[13px] font-medium transition-colors',
          value === g
            ? 'border-transparent bg-ink text-canvas'
            : cx('border-line bg-surface', muted ? 'text-ink-mute' : 'text-ink-soft'),
        )}
      >
        {g}
      </button>
    ))}
  </div>
)

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="border-t border-line px-4 py-3.5 first:border-t-0">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-[13px] font-semibold">{label}</span>
      {hint ? <span className="text-[11.5px] text-ink-mute">{hint}</span> : null}
    </div>
    {children}
  </div>
)

export const EntryScreen = () => {
  const { state, dispatch, round } = useStore()
  const [selected, setSelected] = useState<string>(ROSTER[0].id)

  const member = useMemo(() => ROSTER.find((m) => m.id === selected) ?? ROSTER[0], [selected])
  const entry = round.entries[member.id]
  const score = useMemo(() => scoreMember(member, round, state.settings), [member, round, state.settings])
  const englishOn = state.settings.englishConversion.enabled

  const patchSlot = (key: 'korean' | 'math', patch: Partial<SubjectSlot>) =>
    dispatch({ type: 'entry/patch', memberId: member.id, patch: { [key]: { ...entry[key], ...patch } } })

  const patchExplore = (idx: 0 | 1, patch: Partial<SubjectSlot>) => {
    const next: [SubjectSlot, SubjectSlot] = [entry.explore[0], entry.explore[1]]
    next[idx] = { ...next[idx], ...patch }
    dispatch({ type: 'entry/patch', memberId: member.id, patch: { explore: next } })
  }

  const otherExplore = (idx: 0 | 1) => entry.explore[idx === 0 ? 1 : 0].subject

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle aside={round.label}>참가자</SectionTitle>
        <div className="space-y-2">
          {(['A', 'B'] as TeamId[]).map((team) => (
            <div key={team} className="flex items-center gap-2">
              <span className={cx('w-8 shrink-0 text-[11px] font-bold', teamText(team))}>{team}팀</span>
              <div className="flex flex-1 gap-1.5">
                {membersOf(team).map((m) => {
                  const s = scoreMember(m, round, state.settings)
                  const on = m.id === selected
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelected(m.id)}
                      className={cx(
                        'relative flex-1 rounded-lg border py-2 text-[12.5px] font-medium transition-colors',
                        on ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface text-ink-soft',
                      )}
                    >
                      {m.name}
                      <span
                        className={cx(
                          'absolute right-1 top-1 size-1.5 rounded-full',
                          s.complete ? teamBg(team) : 'bg-transparent',
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <header className="flex items-end justify-between px-4 pb-3 pt-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={cx('size-2.5 rounded-full', teamBg(member.team))} />
              <h3 className="text-[19px] font-bold tracking-tight">{member.name}</h3>
            </div>
            <p className="mt-1 text-[11.5px] text-ink-mute">
              {entry.updatedAt ? `${fmtDateTime(entry.updatedAt)} 저장됨` : '아직 입력 전'}
            </p>
          </div>
          <div className="text-right">
            <div className="tnum text-[26px] font-bold leading-none">{fmt(score.total, '0')}</div>
            <p className="mt-1 text-[11px] text-ink-mute">현재 합계</p>
          </div>
        </header>

        <div className="border-t border-line">
          <Row label="국어" hint="공통 + 선택 1">
            <div className="flex gap-2">
              <SubjectSelect
                value={entry.korean.subject}
                onChange={(v) => patchSlot('korean', { subject: v })}
                options={KOREAN_CHOICES}
                placeholder="선택과목"
              />
              <ScoreField value={entry.korean.score} onCommit={(v) => patchSlot('korean', { score: v })} />
            </div>
          </Row>

          <Row label="수학" hint="공통 + 선택 1">
            <div className="flex gap-2">
              <SubjectSelect
                value={entry.math.subject}
                onChange={(v) => patchSlot('math', { subject: v })}
                options={MATH_CHOICES}
                placeholder="선택과목"
              />
              <ScoreField value={entry.math.score} onCommit={(v) => patchSlot('math', { score: v })} />
            </div>
          </Row>

          {([0, 1] as const).map((idx) => (
            <Row key={idx} label={`탐구 ${idx === 0 ? '①' : '②'}`} hint="사탐·과탐 자유">
              <div className="flex gap-2">
                <SubjectSelect
                  value={entry.explore[idx].subject}
                  onChange={(v) => patchExplore(idx, { subject: v })}
                  groups={EXPLORE_GROUPS.map((g) => ({
                    label: g.label,
                    // 같은 과목을 두 칸에 겹쳐 고르지 못하게 한다.
                    options: g.subjects.filter((s) => s !== otherExplore(idx)),
                  }))}
                  placeholder="과목 선택"
                />
                <ScoreField value={entry.explore[idx].score} onCommit={(v) => patchExplore(idx, { score: v })} />
              </div>
            </Row>
          ))}

          <Row
            label="영어"
            hint={englishOn ? `환산 ${fmt(state.settings.englishConversion.table[entry.englishGrade ?? 0] ?? null, '—')}점` : '절대평가 · 승부 제외'}
          >
            <GradePicker
              value={entry.englishGrade}
              onChange={(v) => dispatch({ type: 'entry/patch', memberId: member.id, patch: { englishGrade: v } })}
              muted={!englishOn}
            />
          </Row>

          <Row label="한국사" hint="기록용 · 승부 제외">
            <GradePicker
              value={entry.historyGrade}
              onChange={(v) => dispatch({ type: 'entry/patch', memberId: member.id, patch: { historyGrade: v } })}
              muted
            />
          </Row>
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3 text-[12px]">
          {score.complete ? (
            <>
              <IconCheck width={15} height={15} className="text-good" />
              <span className="text-ink-soft">입력 완료 · 스코어보드에 반영됐어요</span>
            </>
          ) : (
            <span className="text-ink-mute">
              남은 항목 · {score.missing.map((k) => ({ korean: '국어', math: '수학', explore1: '탐구①', explore2: '탐구②', english: '영어' })[k]).join(', ')}
            </span>
          )}
        </footer>
      </Card>

      <p className="px-1 text-[11.5px] leading-relaxed text-ink-mute">
        입력하는 즉시 저장됩니다. 표준점수는 0~200 사이 정수만 받고, 영어·한국사는 절대평가라 기본 설정에서는 승부 계산에 넣지 않습니다.
      </p>
    </div>
  )
}

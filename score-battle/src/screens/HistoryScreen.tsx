import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/AppStore'
import { buildMatchup, filledCount, headToHead } from '../lib/score'
import { downloadJson, readJsonFile } from '../lib/storage'
import { Button, Card, Modal, SectionTitle, Segmented, Toggle, cx } from '../components/ui'
import { teamText } from '../components/TeamMark'
import { IconCheck, IconDownload, IconPen, IconPlus, IconTrash, IconUpload } from '../components/icons'
import { fmt, fmtDate } from '../lib/format'
import { DEFAULT_ENGLISH_TABLE } from '../data/defaults'
import { nameOf } from '../data/roster'
import type { Round } from '../types'

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const RoundRow = ({ round, current }: { round: Round; current: boolean }) => {
  const { state, dispatch } = useStore()
  const matchup = useMemo(() => buildMatchup(round, state.settings), [round, state.settings])
  const progress = useMemo(() => filledCount(round, state.settings), [round, state.settings])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(round.label)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const commitLabel = () => {
    dispatch({ type: 'round/rename', id: round.id, label: draft })
    setEditing(false)
  }

  return (
    <li className={cx('border-b border-line last:border-b-0', current && 'bg-surface-2')}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => dispatch({ type: 'round/select', id: round.id })}>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => e.key === 'Enter' && commitLabel()}
              className="w-full rounded-md border border-line-strong bg-surface px-2 py-1 text-[13.5px] focus:outline-none"
            />
          ) : (
            <span className="text-[13.5px] font-medium">{round.label}</span>
          )}
          <p className="tnum mt-0.5 text-[11px] text-ink-mute">
            {fmtDate(round.createdAt)} · {progress.done}/{progress.total}명 입력
            {round.rescue ? ` · 구제 ${nameOf(round.rescue.memberId)}` : ''}
          </p>
        </button>

        <button
          type="button"
          aria-label="회차 이름 바꾸기"
          onClick={() => {
            setDraft(round.label)
            setEditing(true)
          }}
          className="shrink-0 text-ink-mute hover:text-ink"
        >
          <IconPen width={14} height={14} />
        </button>

        <div className="text-right">
          <div className="tnum text-[13px] font-semibold">
            <span className={matchup.winner === 'A' ? teamText('A') : 'text-ink-mute'}>{fmt(matchup.teams.A.total, '0')}</span>
            <span className="mx-1 text-ink-mute">:</span>
            <span className={matchup.winner === 'B' ? teamText('B') : 'text-ink-mute'}>{fmt(matchup.teams.B.total, '0')}</span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-ink-mute">
            {current ? '현재 회차' : matchup.provisional ? '잠정' : '입력 완료'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={() => dispatch({ type: 'round/finalize', id: round.id, finalized: !round.finalizedAt })}
          className={cx(
            'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11.5px] transition-colors',
            round.finalizedAt ? 'border-transparent bg-ink text-canvas' : 'border-line text-ink-mute',
          )}
        >
          <IconCheck width={12} height={12} />
          {round.finalizedAt ? '전적 반영됨' : '전적에 반영'}
        </button>
        {!current ? (
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'round/select', id: round.id })}>
            이 회차 열기
          </Button>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label={`${round.label} 삭제`}
          className="ml-auto text-ink-mute hover:text-red-500"
        >
          <IconTrash width={15} height={15} />
        </button>
      </div>

      <Modal
        open={confirmDelete}
        title="이 회차를 지울까요?"
        description={<><span className="font-semibold text-ink">{round.label}</span>의 점수와 구제 결과가 모두 사라집니다. 되돌릴 수 없어요.</>}
        confirmLabel="삭제"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          dispatch({ type: 'round/remove', id: round.id })
          setConfirmDelete(false)
        }}
      />
    </li>
  )
}

export const HistoryScreen = () => {
  const { state, dispatch } = useStore()
  const record = useMemo(() => headToHead(state), [state])
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [importState, setImportState] = useState<{ open: boolean; pending: Parameters<typeof dispatch>[0] | null }>({
    open: false,
    pending: null,
  })
  const [note, setNote] = useState<string | null>(null)
  const english = state.settings.englishConversion

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const next = await readJsonFile(file)
      setImportState({ open: true, pending: { type: 'state/replace', state: next } })
    } catch (e) {
      setNote(e instanceof Error ? e.message : '불러오기에 실패했습니다.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle aside={`확정 ${record.finalized}회`}>상대 전적</SectionTitle>
        <Card className="flex items-center justify-center gap-6 px-4 py-5">
          <div className="text-center">
            <p className={cx('text-[11.5px] font-semibold', teamText('A'))}>Team A</p>
            <p className="tnum mt-1 text-[30px] font-extrabold leading-none">{record.A}</p>
          </div>
          <div className="pt-4 text-center text-[11px] text-ink-mute">
            <p>승</p>
          </div>
          <div className="text-center">
            <p className={cx('text-[11.5px] font-semibold', teamText('B'))}>Team B</p>
            <p className="tnum mt-1 text-[30px] font-extrabold leading-none">{record.B}</p>
          </div>
        </Card>
        <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-ink-mute">
          {record.draw > 0 ? `무승부 ${record.draw}회를 빼고 ` : ''}‘전적에 반영’을 켠 회차만 승패로 셉니다. 아직 입력 중인
          회차는 꺼 두세요.
        </p>
      </div>

      <div>
        <SectionTitle
          aside={
            <button
              type="button"
              onClick={() => dispatch({ type: 'round/add' })}
              className="inline-flex items-center gap-1 text-[11.5px] text-ink-soft"
            >
              <IconPlus width={13} height={13} />
              새 회차
            </button>
          }
        >
          회차
        </SectionTitle>
        <Card>
          <ul>
            {[...state.rounds]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((r) => (
                <RoundRow key={r.id} round={r} current={r.id === state.currentRoundId} />
              ))}
          </ul>
        </Card>
        <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-ink-mute">
          연필 아이콘을 누르면 회차 이름을 바꿀 수 있어요. 회차를 누르면 그 회차로 전환됩니다.
        </p>
      </div>

      <div>
        <SectionTitle>설정</SectionTitle>
        <Card>
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <div className="flex-1">
              <p className="text-[13.5px] font-medium">영어 등급 환산</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
                켜면 영어 등급을 아래 표대로 점수로 바꿔 팀 합계에 더합니다. 끄면 승부에서 빠집니다.
              </p>
            </div>
            <Toggle
              checked={english.enabled}
              label="영어 등급 환산"
              onChange={(v) => dispatch({ type: 'settings/englishEnabled', enabled: v })}
            />
          </div>

          <div className={cx('px-4 py-3.5 transition-opacity', !english.enabled && 'opacity-45')}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] text-ink-soft">등급별 환산 점수</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'settings/englishTableReset' })}
                className="text-[11.5px] text-ink-mute underline underline-offset-2"
              >
                기본값으로
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map((g) => (
                <label key={g} className="flex items-center gap-1.5">
                  <span className="tnum w-8 shrink-0 text-[11.5px] text-ink-mute">{g}등급</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!english.enabled}
                    value={english.table[g] ?? DEFAULT_ENGLISH_TABLE[g]}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^\d]/g, ''))
                      if (Number.isFinite(n) && n >= 0 && n <= 200)
                        dispatch({ type: 'settings/englishTable', grade: g, value: n })
                    }}
                    className="tnum h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2 text-right text-[13px] focus:outline-none focus:ring-2 focus:ring-ink/15"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3.5">
            <span className="text-[13.5px] font-medium">화면 테마</span>
            <Segmented
              value={state.settings.theme}
              onChange={(theme) => dispatch({ type: 'settings/theme', theme })}
              options={[
                { value: 'system', label: '시스템' },
                { value: 'light', label: '라이트' },
                { value: 'dark', label: '다크' },
              ]}
            />
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle>데이터</SectionTitle>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => downloadJson(state)}>
            <IconDownload width={15} height={15} />
            내보내기
          </Button>
          <Button className="flex-1" onClick={() => fileRef.current?.click()}>
            <IconUpload width={15} height={15} />
            불러오기
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {note ? <p className="mt-2 px-1 text-[11.5px] text-red-500">{note}</p> : null}
        <Button variant="danger" className="mt-2 w-full" onClick={() => setConfirmReset(true)}>
          데이터 전체 초기화
        </Button>
        <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-ink-mute">
          모든 기록은 이 브라우저 안에만 저장됩니다. 폰을 바꾸거나 브라우저 데이터를 지우면 사라지니, 중요한 회차는 내보내기로 백업해 두세요.
        </p>
      </div>

      <Modal
        open={confirmReset}
        title="정말 전부 지울까요?"
        description="모든 회차의 점수, 구제 결과, 상대 전적이 사라집니다. 되돌릴 수 없어요."
        confirmLabel="전부 삭제"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          dispatch({ type: 'state/reset' })
          setConfirmReset(false)
          setNote(null)
        }}
      />

      <Modal
        open={importState.open}
        title="불러온 파일로 덮어쓸까요?"
        description="지금 저장된 회차와 설정이 파일 내용으로 전부 바뀝니다."
        confirmLabel="덮어쓰기"
        destructive
        onCancel={() => setImportState({ open: false, pending: null })}
        onConfirm={() => {
          if (importState.pending) dispatch(importState.pending)
          setImportState({ open: false, pending: null })
          setNote('불러오기를 마쳤습니다.')
        }}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { SCORE_MAX, SCORE_MIN } from '../data/defaults'
import { cx } from './ui'

/**
 * 표준점수 입력 칸. 0~200 정수만 통과시키고,
 * 규칙에 어긋나면 값을 저장하지 않고 그 자리에서 이유를 말해준다.
 */
export const ScoreField = ({
  value,
  onCommit,
  placeholder = '표준점수',
  disabled,
}: {
  value: number | null
  onCommit: (v: number | null) => void
  placeholder?: string
  disabled?: boolean
}) => {
  const [raw, setRaw] = useState(value === null ? '' : String(value))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRaw(value === null ? '' : String(value))
    setError(null)
  }, [value])

  const handle = (next: string) => {
    setRaw(next)
    const trimmed = next.trim()
    if (trimmed === '') {
      setError(null)
      onCommit(null)
      return
    }
    if (!/^\d+$/.test(trimmed)) {
      setError(/[.,]/.test(trimmed) ? '소수점은 입력할 수 없어요' : '숫자만 입력해 주세요')
      return
    }
    const n = Number(trimmed)
    if (n < SCORE_MIN || n > SCORE_MAX) {
      setError(`${SCORE_MIN}~${SCORE_MAX} 사이만 가능해요`)
      return
    }
    setError(null)
    onCommit(n)
  }

  return (
    <div className="w-[104px] shrink-0">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={raw}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        className={cx(
          'tnum h-11 w-full rounded-lg border bg-surface px-3 text-right text-[16px] font-semibold',
          'placeholder:text-[13px] placeholder:font-normal placeholder:text-ink-mute',
          'focus:outline-none focus:ring-2 focus:ring-ink/15',
          error ? 'border-red-500' : 'border-line-strong',
        )}
      />
      {error ? <p className="mt-1 text-right text-[11px] text-red-500">{error}</p> : null}
    </div>
  )
}

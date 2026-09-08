import { useEffect, useRef, useState } from 'react'
import type { Member, TeamId } from '../types'
import { cx } from './ui'

const SIZE = 260
const R = 118
const CENTER = SIZE / 2

/** 0도가 12시, 시계 방향. */
const polar = (angle: number, radius: number) => {
  const rad = ((angle - 0) * Math.PI) / 180
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) }
}

const arcPath = (start: number, end: number, radius: number) => {
  const a = polar(start, radius)
  const b = polar(end, radius)
  const large = end - start > 180 ? 1 : 0
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

const slicePath = (start: number, end: number) => {
  const a = polar(start, R)
  const b = polar(end, R)
  const large = end - start > 180 ? 1 : 0
  return `M ${CENTER} ${CENTER} L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`
}

export const Wheel = ({
  members,
  team,
  spinning,
  targetIndex,
  lockedIndex,
  highlightIndex,
  duration = 4200,
  onSettled,
}: {
  members: Member[]
  team: TeamId
  spinning: boolean
  /** 이번 회전이 멈춰야 할 자리. spinning 이 true 로 바뀔 때 읽는다. */
  targetIndex: number | null
  /** 이미 확정된 결과가 있으면 그 자리에 고정해서 그린다. */
  lockedIndex: number | null
  /** 구제 추천 후보. 테두리로 미리 짚어 준다. */
  highlightIndex?: number | null
  duration?: number
  onSettled?: () => void
}) => {
  const step = 360 / members.length
  const restAngle = (i: number) => -(i * step + step / 2)
  const [rotation, setRotation] = useState(() => (lockedIndex === null ? 0 : restAngle(lockedIndex)))
  const [animating, setAnimating] = useState(false)
  const spun = useRef(false)
  // 콜백은 매 렌더 새로 만들어지므로 ref 로 잡아둔다. 의존성에 넣으면 타이머가 계속 취소된다.
  const settledRef = useRef(onSettled)
  settledRef.current = onSettled

  useEffect(() => {
    if (!spinning || targetIndex === null || spun.current) return
    spun.current = true
    setAnimating(true)
    // 여섯 바퀴 돌고 목표 칸이 위쪽 바늘에 오도록 각도를 맞춘다.
    setRotation((prev) => Math.ceil((prev + 1) / 360) * 360 + 360 * 6 + restAngle(targetIndex))
    const timer = setTimeout(() => {
      setAnimating(false)
      settledRef.current?.()
    }, duration)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, targetIndex, duration, members.length])

  useEffect(() => {
    if (!spinning) spun.current = false
  }, [spinning])

  const baseColor = team === 'A' ? 'var(--team-a)' : 'var(--team-b)'

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE + 14 }}>
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
        <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
          <path d="M9 14 1 0h16L9 14Z" fill="var(--ink)" />
        </svg>
      </div>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mt-3.5"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animating ? `transform ${duration}ms cubic-bezier(.11,.72,.14,1)` : 'none',
        }}
        role="img"
        aria-label={`${members.map((m) => m.name).join(', ')} 구제 룰렛`}
      >
        <circle cx={CENTER} cy={CENTER} r={R + 5} fill="var(--surface-2)" />
        {members.map((m, i) => {
          const start = i * step
          const mid = start + step / 2
          const label = polar(mid, R * 0.6)
          const recommended = highlightIndex === i
          // 이름은 판이 어디서 멈추든 똑바로 서 있도록 회전을 상쇄한다.
          return (
            <g key={m.id}>
              <path
                d={slicePath(start, start + step)}
                fill={baseColor}
                fillOpacity={0.16 + (i % 5) * 0.13}
                stroke="var(--surface)"
                strokeWidth={2}
              />
              {recommended ? (
                <path
                  d={arcPath(start + 2, start + step - 2, R + 3)}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ) : null}
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="14"
                fontWeight="600"
                fill="var(--ink)"
                transform={`rotate(${-rotation} ${label.x} ${label.y})`}
              >
                {m.name}
              </text>
            </g>
          )
        })}
        <circle cx={CENTER} cy={CENTER} r={22} fill="var(--surface)" stroke="var(--line-strong)" />
      </svg>
      <div
        className={cx(
          'pointer-events-none absolute inset-x-0 bottom-0 text-center text-[11px] text-ink-mute transition-opacity',
          animating ? 'opacity-100' : 'opacity-0',
        )}
      >
        돌아가는 중…
      </div>
    </div>
  )
}

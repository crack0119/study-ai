import { useState } from 'react'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { CategoryAverage } from '../lib/score'
import { useThemeColors } from '../lib/useThemeColors'
import { cx } from './ui'
import { teamBg } from './TeamMark'

const fmtAvg = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1)

/** 막대 위 직접 라벨은 반올림해서 붙인다. 소수점은 표 보기에서 확인한다. */
const fmtLabel = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === '' ? '' : String(Math.round(Number(v)))

const TooltipBody = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number | string; color?: string }[]
  label?: string | number
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-1.5 text-ink-soft">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          Team {String(p.dataKey)}
          <span className="tnum ml-1 font-semibold text-ink">{fmtAvg(Number(p.value))}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * 과목별 팀 평균. 축 눈금 대신 막대 위에 값을 직접 붙였고,
 * 색만으로 팀을 구분하지 않도록 범례와 표 보기를 함께 둔다.
 */
export const SubjectBarChart = ({ data }: { data: CategoryAverage[] }) => {
  const c = useThemeColors()
  const [asTable, setAsTable] = useState(false)
  const rows = data.map((d) => ({ category: d.category, A: d.A, B: d.B }))

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          {(['A', 'B'] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
              <span className={cx('size-2 rounded-full', teamBg(t))} />
              Team {t}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="text-[11.5px] text-ink-mute underline underline-offset-2"
        >
          {asTable ? '그래프로 보기' : '표로 보기'}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11.5px] text-ink-mute">
              <th className="py-2 text-left font-medium">과목</th>
              <th className="py-2 text-right font-medium">Team A</th>
              <th className="py-2 text-right font-medium">Team B</th>
              <th className="py-2 text-right font-medium">차이</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} className="border-b border-line last:border-b-0">
                <td className="py-2">{r.category}</td>
                <td className="tnum py-2 text-right">{fmtAvg(r.A)}</td>
                <td className="tnum py-2 text-right">{fmtAvg(r.B)}</td>
                <td className="tnum py-2 text-right text-ink-mute">
                  {r.A === null || r.B === null ? '—' : fmtAvg(Math.round((r.A - r.B) * 10) / 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 22, right: 6, bottom: 0, left: 6 }} barGap={5} barCategoryGap="30%">
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={{ stroke: c['--line'] }}
                tick={{ fill: c['--ink-mute'], fontSize: 12 }}
                dy={6}
              />
              <Tooltip cursor={{ fill: c['--surface-2'] }} content={<TooltipBody />} />
              <Bar dataKey="A" fill={c['--team-a']} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={30}>
                <LabelList dataKey="A" position="top" offset={6} fill={c['--ink-mute']} fontSize={11} formatter={fmtLabel} />
              </Bar>
              <Bar dataKey="B" fill={c['--team-b']} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={30}>
                <LabelList dataKey="B" position="top" offset={6} fill={c['--ink-mute']} fontSize={11} formatter={fmtLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

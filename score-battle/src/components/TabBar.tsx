import type { ComponentType, SVGProps } from 'react'
import { IconArchive, IconBars, IconPen, IconTrophy, IconWheel } from './icons'
import { cx } from './ui'

export type TabKey = 'entry' | 'board' | 'compare' | 'rescue' | 'history'

export const TABS: { key: TabKey; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: 'entry', label: '입력', icon: IconPen },
  { key: 'board', label: '스코어보드', icon: IconTrophy },
  { key: 'compare', label: '비교', icon: IconBars },
  { key: 'rescue', label: '구제', icon: IconWheel },
  { key: 'history', label: '기록', icon: IconArchive },
]

export const TabBar = ({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur-md">
    <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ key, label, icon: Icon }) => {
        const on = key === active
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={on ? 'page' : undefined}
            className={cx(
              'flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors',
              on ? 'text-ink' : 'text-ink-mute',
            )}
          >
            <Icon width={19} height={19} strokeWidth={on ? 1.9 : 1.5} />
            <span className={cx('text-[10.5px]', on && 'font-semibold')}>{label}</span>
          </button>
        )
      })}
    </div>
  </nav>
)

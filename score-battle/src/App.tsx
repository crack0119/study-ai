import { useEffect, useState } from 'react'
import { AppStoreProvider, useStore } from './store/AppStore'
import { TABS, TabBar, type TabKey } from './components/TabBar'
import { EntryScreen } from './screens/EntryScreen'
import { ScoreboardScreen } from './screens/ScoreboardScreen'
import { CompareScreen } from './screens/CompareScreen'
import { RescueScreen } from './screens/RescueScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { buildMatchup, filledCount } from './lib/score'
import { fmt } from './lib/format'
import { cx } from './components/ui'
import { teamText } from './components/TeamMark'

const isTab = (v: string): v is TabKey => TABS.some((t) => t.key === v)
const readHash = (): TabKey => {
  const raw = window.location.hash.replace('#', '')
  return isTab(raw) ? raw : 'entry'
}

const Header = () => {
  const { state, round } = useStore()
  const matchup = buildMatchup(round, state.settings)
  const progress = filledCount(round, state.settings)

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold tracking-tight">5대5 표준점수 대항전</h1>
          <p className="truncate text-[11px] text-ink-mute">
            {round.label} · {progress.done}/{progress.total}명 입력
          </p>
        </div>
        <div className="tnum shrink-0 text-[15px] font-bold">
          <span className={matchup.winner === 'A' ? teamText('A') : 'text-ink-mute'}>{fmt(matchup.teams.A.total, '0')}</span>
          <span className="mx-1 text-ink-mute">:</span>
          <span className={matchup.winner === 'B' ? teamText('B') : 'text-ink-mute'}>{fmt(matchup.teams.B.total, '0')}</span>
        </div>
      </div>
    </header>
  )
}

const Shell = () => {
  const [tab, setTab] = useState<TabKey>(readHash)

  useEffect(() => {
    const onHash = () => setTab(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (next: TabKey) => {
    window.location.hash = next
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">
        <div key={tab} className={cx('rise')}>
          {tab === 'entry' && <EntryScreen />}
          {tab === 'board' && <ScoreboardScreen />}
          {tab === 'compare' && <CompareScreen />}
          {tab === 'rescue' && <RescueScreen />}
          {tab === 'history' && <HistoryScreen />}
        </div>
      </main>
      <TabBar active={tab} onChange={go} />
    </div>
  )
}

export default function App() {
  return (
    <AppStoreProvider>
      <Shell />
    </AppStoreProvider>
  )
}

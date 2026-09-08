import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import type { AppState, RescueMode, Round, ScoreEntry, TeamId } from '../types'
import { createInitialState, createRound, DEFAULT_ENGLISH_TABLE, emptyEntry } from '../data/defaults'
import { ROSTER } from '../data/roster'
import { loadState, saveState } from '../lib/storage'

export type Action =
  | { type: 'entry/patch'; memberId: string; patch: Partial<ScoreEntry> }
  | { type: 'round/add'; label?: string }
  | { type: 'round/select'; id: string }
  | { type: 'round/rename'; id: string; label: string }
  | { type: 'round/remove'; id: string }
  | { type: 'round/finalize'; id: string; finalized: boolean }
  | { type: 'round/clearScores'; id: string }
  | { type: 'rescue/set'; memberId: string; mode: RescueMode }
  | { type: 'rescue/clear' }
  | { type: 'settings/englishEnabled'; enabled: boolean }
  | { type: 'settings/englishTable'; grade: number; value: number }
  | { type: 'settings/englishTableReset' }
  | { type: 'settings/theme'; theme: AppState['settings']['theme'] }
  | { type: 'state/replace'; state: AppState }
  | { type: 'state/reset' }

const mapRound = (state: AppState, id: string, fn: (r: Round) => Round): AppState => ({
  ...state,
  rounds: state.rounds.map((r) => (r.id === id ? fn(r) : r)),
})

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'entry/patch': {
      return mapRound(state, state.currentRoundId, (round) => {
        const prev = round.entries[action.memberId] ?? emptyEntry(action.memberId)
        return {
          ...round,
          entries: {
            ...round.entries,
            [action.memberId]: { ...prev, ...action.patch, memberId: action.memberId, updatedAt: Date.now() },
          },
        }
      })
    }
    case 'round/add': {
      const round = createRound(action.label)
      return { ...state, rounds: [...state.rounds, round], currentRoundId: round.id }
    }
    case 'round/select':
      return state.rounds.some((r) => r.id === action.id) ? { ...state, currentRoundId: action.id } : state
    case 'round/rename':
      return mapRound(state, action.id, (r) => ({ ...r, label: action.label.trim() || r.label }))
    case 'round/remove': {
      const rounds = state.rounds.filter((r) => r.id !== action.id)
      if (rounds.length === 0) return createInitialState()
      return {
        ...state,
        rounds,
        currentRoundId: rounds.some((r) => r.id === state.currentRoundId) ? state.currentRoundId : rounds[0].id,
      }
    }
    case 'round/finalize':
      return mapRound(state, action.id, (r) => ({ ...r, finalizedAt: action.finalized ? Date.now() : null }))
    case 'round/clearScores':
      return mapRound(state, action.id, (r) => ({
        ...r,
        entries: Object.fromEntries(ROSTER.map((m) => [m.id, emptyEntry(m.id)])),
        rescue: null,
      }))
    case 'rescue/set':
      return mapRound(state, state.currentRoundId, (r) =>
        // 이미 뽑혔으면 다시 돌리지 못한다. 되돌리기를 먼저 눌러야 한다.
        r.rescue ? r : { ...r, rescue: { memberId: action.memberId, mode: action.mode, decidedAt: Date.now() } },
      )
    case 'rescue/clear':
      return mapRound(state, state.currentRoundId, (r) => ({ ...r, rescue: null }))
    case 'settings/englishEnabled':
      return {
        ...state,
        settings: {
          ...state.settings,
          englishConversion: { ...state.settings.englishConversion, enabled: action.enabled },
        },
      }
    case 'settings/englishTable':
      return {
        ...state,
        settings: {
          ...state.settings,
          englishConversion: {
            ...state.settings.englishConversion,
            table: { ...state.settings.englishConversion.table, [action.grade]: action.value },
          },
        },
      }
    case 'settings/englishTableReset':
      return {
        ...state,
        settings: {
          ...state.settings,
          englishConversion: { ...state.settings.englishConversion, table: { ...DEFAULT_ENGLISH_TABLE } },
        },
      }
    case 'settings/theme':
      return { ...state, settings: { ...state.settings, theme: action.theme } }
    case 'state/replace':
      return action.state
    case 'state/reset':
      return createInitialState()
    default:
      return state
  }
}

interface Store {
  state: AppState
  dispatch: Dispatch<Action>
  round: Round
}

const StoreContext = createContext<Store | null>(null)

export const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  // 테마는 <html> 클래스로 걸고, '시스템'일 때는 OS 설정을 따라간다.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const pref = state.settings.theme
      const dark = pref === 'dark' || (pref === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [state.settings.theme])

  const round = useMemo(
    () => state.rounds.find((r) => r.id === state.currentRoundId) ?? state.rounds[0],
    [state.rounds, state.currentRoundId],
  )

  const value = useMemo(() => ({ state, dispatch, round }), [state, dispatch, round])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = (): Store => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('AppStoreProvider 안에서만 쓸 수 있습니다.')
  return ctx
}

export const teamColorVar = (team: TeamId): string => (team === 'A' ? 'var(--team-a)' : 'var(--team-b)')

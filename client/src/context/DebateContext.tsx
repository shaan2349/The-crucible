import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { Debate as DebateState } from '../types'

interface DebateContextValue {
  debate: DebateState | null
  setDebate: Dispatch<SetStateAction<DebateState | null>>
}

const DebateContext = createContext<DebateContextValue | null>(null)

/**
 * Lifts the active debate above the router so Reflect (composer) and
 * Council (conversation) can be genuinely separate routes/tabs — per the
 * Product Bible's five-tab nav — instead of one screen's internal state.
 * The active debate isn't persisted to localStorage: it's meant to be a
 * live session, not a resumable draft (that's what Reflect's own draft
 * autosave is for).
 */
export function DebateProvider({ children }: { children: ReactNode }) {
  const [debate, setDebate] = useState<DebateState | null>(null)
  return <DebateContext.Provider value={{ debate, setDebate }}>{children}</DebateContext.Provider>
}

export function useDebateContext(): DebateContextValue {
  const ctx = useContext(DebateContext)
  if (!ctx) throw new Error('useDebateContext must be used within DebateProvider')
  return ctx
}

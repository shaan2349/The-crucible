import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { ReflectSession } from '../types'

interface ReflectContextValue {
  session: ReflectSession | null
  setSession: Dispatch<SetStateAction<ReflectSession | null>>
}

const ReflectContext = createContext<ReflectContextValue | null>(null)

/**
 * Mirrors DebateContext — lifted above the router so an in-progress
 * reflection survives navigating to another tab and back, the same way
 * an in-progress debate does. Not persisted to localStorage: a live
 * session, not a resumable draft (the composer's own draft autosave
 * handles that before a session exists).
 */
export function ReflectProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReflectSession | null>(null)
  return <ReflectContext.Provider value={{ session, setSession }}>{children}</ReflectContext.Provider>
}

export function useReflectContext(): ReflectContextValue {
  const ctx = useContext(ReflectContext)
  if (!ctx) throw new Error('useReflectContext must be used within ReflectProvider')
  return ctx
}

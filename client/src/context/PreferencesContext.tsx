import { createContext, useContext, useState, type ReactNode } from 'react'
import { loadPreferences, savePreferences, type Preferences } from '../lib/storage'
import { useApplyPreferences } from '../hooks/useApplyPreferences'

interface PreferencesContextValue {
  preferences: Preferences
  updatePreferences: (patch: Partial<Preferences>) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences())
  useApplyPreferences(preferences)

  function updatePreferences(patch: Partial<Preferences>) {
    setPreferences((prev) => {
      const next = { ...prev, ...patch }
      savePreferences(next)
      return next
    })
  }

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>{children}</PreferencesContext.Provider>
  )
}

export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferencesContext must be used within PreferencesProvider')
  return ctx
}

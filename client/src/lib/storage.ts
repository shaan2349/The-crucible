import type { Debate, TrainingStats } from '../types'
import type { BioResponse } from './api'

const KEYS = {
  debates: 'crucible:debates',
  bios: 'crucible:bios',
  trainingStats: 'crucible:trainingStats',
  reflectDraft: 'crucible:reflectDraft',
  preferences: 'crucible:preferences',
  onboarded: 'crucible:onboarded',
  interests: 'crucible:interests',
} as const

export interface Preferences {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'normal' | 'large'
  readingWidth: 'comfortable' | 'wide'
  reduceMotion: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  fontSize: 'normal',
  readingWidth: 'comfortable',
  reduceMotion: false,
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — debate still works, just isn't persisted
  }
}

export function loadDebates(): Debate[] {
  return load<Debate[]>(KEYS.debates, [])
}
export function saveDebates(debates: Debate[]): void {
  save(KEYS.debates, debates)
}

export function loadBios(): Record<string, BioResponse> {
  return load<Record<string, BioResponse>>(KEYS.bios, {})
}
export function saveBios(bios: Record<string, BioResponse>): void {
  save(KEYS.bios, bios)
}

const DEFAULT_TRAINING_STATS: TrainingStats = {
  correct: 0,
  total: 0,
  sessions: [],
  streak: 0,
  lastSessionDate: null,
}

export function loadTrainingStats(): TrainingStats {
  // Merged over defaults, not just returned raw — older saved stats predate
  // the sessions/streak fields, and a partial object would otherwise crash
  // any code that reads them.
  return { ...DEFAULT_TRAINING_STATS, ...load<Partial<TrainingStats>>(KEYS.trainingStats, {}) }
}
export function saveTrainingStats(stats: TrainingStats): void {
  save(KEYS.trainingStats, stats)
}

export function loadReflectDraft(): string | null {
  return load<string | null>(KEYS.reflectDraft, null)
}
export function saveReflectDraft(text: string): void {
  save(KEYS.reflectDraft, text)
}
export function clearReflectDraft(): void {
  try {
    localStorage.removeItem(KEYS.reflectDraft)
  } catch {
    // ignore
  }
}

export function loadPreferences(): Preferences {
  return { ...DEFAULT_PREFERENCES, ...load<Partial<Preferences>>(KEYS.preferences, {}) }
}
export function savePreferences(prefs: Preferences): void {
  save(KEYS.preferences, prefs)
}

export function hasOnboarded(): boolean {
  return load<boolean>(KEYS.onboarded, false)
}
export function markOnboarded(): void {
  save(KEYS.onboarded, true)
}

export function loadInterests(): string[] {
  return load<string[]>(KEYS.interests, [])
}
export function saveInterests(interests: string[]): void {
  save(KEYS.interests, interests)
}

/** Every key this app has ever written to localStorage — used by Settings'
 * "delete all data" and "export data" so neither silently misses a key. */
export function allDataKeys(): string[] {
  return Object.values(KEYS)
}

export function exportAllData(): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const key of allDataKeys()) {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw)
      } catch {
        data[key] = raw
      }
    }
  }
  return data
}

export function deleteAllData(): void {
  for (const key of allDataKeys()) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

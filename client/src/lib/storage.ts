import type { Debate, ReflectSession, TrainingStats } from '../types'
import type { BioResponse } from './api'

const KEYS = {
  debates: 'crucible:debates',
  reflectSessions: 'crucible:reflectSessions',
  bios: 'crucible:bios',
  trainingStats: 'crucible:trainingStats',
  // Named for what actually uses it now (Debate.tsx's composer) — this
  // used to be Reflect's draft key back when Reflect and Debate were the
  // same screen. reflectDraft below is a distinct key for the real
  // Reflect screen's own composer, not a renamed alias of this one.
  debateDraft: 'crucible:debateDraft',
  reflectDraft: 'crucible:reflectDraft',
  preferences: 'crucible:preferences',
  onboarded: 'crucible:onboarded',
  interests: 'crucible:interests',
  trainTopics: 'crucible:trainTopics',
} as const

export type Language = 'simple' | 'standard' | 'scholarly'
export type Depth = 'quick' | 'normal' | 'deep'

export interface Preferences {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'normal' | 'large'
  readingWidth: 'comfortable' | 'wide'
  reduceMotion: boolean
  /** How philosophers phrase their responses, across Debate, Reflect,
   * and Library — actually sent to the AI on every relevant request, not
   * just a cosmetic label. */
  language: Language
  /** How much a response elaborates — also sent to the AI, not cosmetic. */
  depth: Depth
  /** Independent of whether the browser supports speech synthesis — this
   * is the user's own choice to hide spoken-response controls even when
   * the browser could technically speak. */
  voiceEnabled: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  fontSize: 'normal',
  readingWidth: 'comfortable',
  reduceMotion: false,
  language: 'standard',
  depth: 'normal',
  voiceEnabled: true,
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

const RECENT_TRAIN_TOPICS_LIMIT = 15

/** Topics from challenges the user actually attempted, most recent last
 * — sent back to the generator so it avoids repeating the same broad
 * theme. Only grows on a completed attempt, not on every challenge
 * merely shown, so browsing (without submitting) doesn't crowd out
 * genuine variety for no reason. */
export function loadRecentTrainTopics(): string[] {
  return load<string[]>(KEYS.trainTopics, [])
}
export function addRecentTrainTopic(topic: string | undefined): void {
  if (!topic?.trim()) return
  const next = [...loadRecentTrainTopics(), topic.trim()].slice(-RECENT_TRAIN_TOPICS_LIMIT)
  save(KEYS.trainTopics, next)
}

export function loadDebateDraft(): string | null {
  return load<string | null>(KEYS.debateDraft, null)
}
export function saveDebateDraft(text: string): void {
  save(KEYS.debateDraft, text)
}
export function clearDebateDraft(): void {
  try {
    localStorage.removeItem(KEYS.debateDraft)
  } catch {
    // ignore
  }
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

export function loadReflectSessions(): ReflectSession[] {
  return load<ReflectSession[]>(KEYS.reflectSessions, [])
}
export function saveReflectSessions(sessions: ReflectSession[]): void {
  save(KEYS.reflectSessions, sessions)
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

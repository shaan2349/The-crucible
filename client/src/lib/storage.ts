import type { Debate, TrainingStats } from '../types'
import type { BioResponse } from './api'

const KEYS = {
  debates: 'crucible:debates',
  bios: 'crucible:bios',
  trainingStats: 'crucible:trainingStats',
  reflectDraft: 'crucible:reflectDraft',
} as const

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

export function loadTrainingStats(): TrainingStats {
  return load<TrainingStats>(KEYS.trainingStats, { correct: 0, total: 0 })
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

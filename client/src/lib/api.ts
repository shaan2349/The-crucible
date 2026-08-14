import type { CouncilOutcome, ParticipationLevel } from '../types'

// In local dev this stays empty and Vite's dev-server proxy (vite.config.ts)
// forwards /api to the backend. When client and server are deployed as
// separate services (e.g. Render static site + web service), this points
// at the backend's public URL, set at build time via a dashboard env var.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function postJSON<T>(path: string, body: unknown, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${API_BASE}/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      let data: unknown
      try {
        data = await res.json()
      } catch {
        throw new Error(`Response wasn't valid JSON (HTTP ${res.status})`)
      }
      if (!res.ok) {
        const message = (data as { error?: string } | null)?.error ?? `Request failed (HTTP ${res.status})`
        throw new Error(message)
      }
      return data as T
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastErr
}

export interface SelectOpponentsResponse {
  ids: string[]
}
export function selectOpponents(claim: string) {
  return postJSON<SelectOpponentsResponse>('/claude/debate/select-opponents', { claim })
}

export interface DecomposeResponse {
  conclusion: string
  premises: { id: string; text: string }[]
}
export function decompose(claim: string) {
  return postJSON<DecomposeResponse>('/claude/debate/decompose', { claim })
}

export interface AttackResponse {
  targetPremiseId: string
  text: string
  spokenText: string
}
export function attack(params: {
  claim: string
  conclusion: string
  premises: { id: string; text: string; status: string }[]
  philosopherId: string
  priorRounds: { round: number; userResponse: string | null }[]
  sameRoundAttacks?: { philosopherId: string; text: string }[]
}) {
  return postJSON<AttackResponse>('/claude/debate/attack', params)
}

export interface EvaluateResponse {
  statuses: { id: string; status: string }[]
}
export function evaluate(params: {
  claim: string
  conclusion: string
  premises: { id: string; text: string; status: string }[]
  lastRoundAttacks: { philosopherId: string; targetPremiseId: string; text: string }[]
  userResponse: string
}) {
  return postJSON<EvaluateResponse>('/claude/debate/evaluate', params)
}

export interface VerdictResponse {
  weakestPremiseId: string
  weakestReason: string
  leanedFramework: string
  sharpenedClaim: string
  outcome: CouncilOutcome
}
export function fetchVerdict(params: {
  claim: string
  conclusion: string
  premises: { id: string; text: string; status: string }[]
  rounds: { round: number; attacks: { philosopherId: string; text: string }[]; userResponse: string | null }[]
  participationLevel: ParticipationLevel
}) {
  return postJSON<VerdictResponse>('/claude/debate/verdict', params)
}

/* -------------------------------- reflect -------------------------------- */

export interface BeginReflectionResponse {
  philosopherIds: string[]
  openings: { philosopherId: string; take: string }[]
}
export function beginReflection(situation: string) {
  return postJSON<BeginReflectionResponse>('/claude/reflect/begin', { situation })
}

export interface RespondReflectionResponse {
  text: string
  spokenText: string
}
export function respondReflection(params: {
  situation: string
  openings: Record<string, string>
  rounds: { round: number; turns: { philosopherId: string; text: string }[]; userMessage: string | null }[]
  philosopherId: string
  userMessage?: string
}) {
  return postJSON<RespondReflectionResponse>('/claude/reflect/respond', params)
}

export interface EndReflectionResponse {
  tension: string
  whatMatters: string
  perspectives: { philosopherId: string; summary: string }[]
  question: string
}
export function endReflection(params: {
  situation: string
  openings: Record<string, string>
  rounds: { round: number; turns: { philosopherId: string; text: string }[]; userMessage: string | null }[]
}) {
  return postJSON<EndReflectionResponse>('/claude/reflect/ending', params)
}

export interface BioResponse {
  positioning: string
  overview: string
  lifeAndContext: string
  works: string
  legacy: string
  coreIdeas: string[]
  modernTakes: { topic: string; take: string }[]
  conversationStarters: string[]
}
export function fetchBio(philosopherId: string) {
  return postJSON<BioResponse>('/claude/library/bio', { philosopherId })
}

export interface CompareResponse {
  positionA: string
  positionB: string
  keyDisagreement: string
  sharedGround: string
}
export function compareThinkers(philosopherAId: string, philosopherBId: string, topic: string) {
  return postJSON<CompareResponse>('/claude/library/compare', { philosopherAId, philosopherBId, topic })
}

export interface SearchResponse {
  matches: { philosopherId: string; reason: string }[]
}
export function searchThinkers(query: string) {
  return postJSON<SearchResponse>('/claude/library/search', { query })
}

export type TrainLevel = 'easy' | 'medium' | 'hard'
export type TrainExerciseType = 'deconstruct' | 'construct' | 'spot-flaw' | 'steelman' | 'framework-lens' | 'premise-audit'

export interface TrainGenerateResponse {
  exerciseType: TrainExerciseType
  topic?: string
  passage?: string // deconstruct, spot-flaw
  conclusion?: string // construct
  claim?: string // steelman
  scenario?: string // framework-lens
  framework?: string // framework-lens
  argument?: string // premise-audit
  premises?: { id: string; text: string }[] // premise-audit
}
export function generateChallenge(level: TrainLevel, exerciseType: TrainExerciseType) {
  return postJSON<TrainGenerateResponse>('/claude/train/generate', { level, exerciseType })
}

export interface TrainScoreResponse {
  score: number
  feedback: string
  trueConclusion?: string // deconstruct
  truePremises?: string[] // deconstruct
  actualFlaw?: string // spot-flaw
  modelPick?: string // premise-audit
}
export function scoreChallenge(params: {
  exerciseType: TrainExerciseType
  passage?: string
  conclusion?: string
  claim?: string
  scenario?: string
  framework?: string
  argument?: string
  premises?: { id: string; text: string }[]
  userConclusion?: string
  userPremises?: string[]
  userAnswer?: string
  userArgument?: string
  userPremiseId?: string
  userExplanation?: string
}) {
  return postJSON<TrainScoreResponse>('/claude/train/score', params)
}

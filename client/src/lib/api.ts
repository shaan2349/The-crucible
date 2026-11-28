import type { CouncilOutcome, ParticipationLevel } from '../types'
import type { Language, Depth } from './storage'

/** Sent on every request whose response is prose a user reads — Debate's
 * attack/verdict, Reflect's begin/respond/ending, Library's bio — so the
 * Settings preference actually changes what comes back, not just a label
 * nobody's request carries. */
export interface StyleParams {
  language?: Language
  depth?: Depth
}

// In local dev this stays empty and Vite's dev-server proxy (vite.config.ts)
// forwards /api to the backend. When client and server are deployed as
// separate services (e.g. Render static site + web service), this points
// at the backend's public URL, set at build time via a dashboard env var.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * The free server sleeps after a quiet spell and takes up to a minute to
 * wake. Knocking as soon as the app opens means it is usually awake by the
 * time someone asks their first question. Repeats every few minutes while
 * the app is open so it does not doze off mid-visit.
 */
let warmed = false
export function wakeServer() {
  if (warmed || typeof window === 'undefined') return
  warmed = true
  const knock = () => void fetch(`${API_BASE}/api/health`, { cache: 'no-store' }).catch(() => {})
  knock()
  window.setInterval(() => {
    if (!document.hidden) knock()
  }, 8 * 60 * 1000)
}

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
        // A refusal like "today's limit reached" or a bad request won't
        // change on retry; only server hiccups and network failures are retried.
        if (res.status < 500) throw Object.assign(new Error(message), { final: true })
        throw new Error(message)
      }
      return data as T
    } catch (e) {
      lastErr = e
      if ((e as { final?: boolean }).final) break
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
  /** Premises this objection may target, so every column gets tested. */
  allowedTargets?: string[]
} & StyleParams) {
  return postJSON<AttackResponse>('/claude/debate/attack', params)
}

export interface EvaluateResponse {
  statuses: { id: string; status: string; reason?: string; revisedText?: string }[]
  revisedConclusion?: string
  note: string
}
export function evaluate(params: {
  claim: string
  conclusion: string
  premises: { id: string; text: string; status: string }[]
  lastRoundAttacks: { philosopherId: string; targetPremiseId: string; text: string }[]
  userResponse: string
} & StyleParams) {
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
} & StyleParams) {
  return postJSON<VerdictResponse>('/claude/debate/verdict', params)
}

/* -------------------------------- reflect -------------------------------- */

export interface BeginReflectionResponse {
  philosopherIds: string[]
  openings: { philosopherId: string; take: string }[]
}
export function beginReflection(situation: string, style?: StyleParams, seats?: { withIds?: string[]; only?: boolean }) {
  return postJSON<BeginReflectionResponse>('/claude/reflect/begin', { situation, ...style, ...seats })
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
  /** What others at the table already said this round, so this philosopher can answer them. */
  sameRoundTurns?: { philosopherId: string; text: string }[]
  /** A philosopher id when the user spoke to one person, or 'all'. */
  addressedTo?: string
} & StyleParams) {
  return postJSON<RespondReflectionResponse>('/claude/reflect/respond', params)
}

export interface DiscussResponse {
  turns: Required<Pick<import('../types').ReflectTurn, 'philosopherId' | 'text' | 'spokenText' | 'to' | 'mood' | 'reactions'>>[]
}
/** The next stretch of conversation at the table, written in one go: only those with something to say speak. */
export function discussReflection(params: {
  situation: string
  openings: Record<string, string>
  rounds: { round: number; turns: { philosopherId: string; text: string }[]; userMessage: string | null }[]
  philosopherIds: string[]
  userMessage: string
  addressedTo: string
  level: import('../types').TableLevel
}) {
  return postJSON<DiscussResponse>('/claude/reflect/discuss', params)
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
} & StyleParams) {
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
export function fetchBio(philosopherId: string, style?: StyleParams) {
  return postJSON<BioResponse>('/claude/library/bio', { philosopherId, ...style })
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
export function generateChallenge(level: TrainLevel, exerciseType: TrainExerciseType, recentTopics?: string[]) {
  return postJSON<TrainGenerateResponse>('/claude/train/generate', { level, exerciseType, recentTopics })
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

/* -------------------------------- oracle -------------------------------- */

export interface OracleQuestion {
  question: string
  context: string
  domain: string
}
export function fetchOracleQuestion(recentQuestions: string[]) {
  return postJSON<OracleQuestion>('/claude/oracle/question', { recentQuestions })
}

export interface OracleReply {
  reply: string
  perspectives: { philosopherId: string; view: string }[]
  followUp: string
}
export function answerOracle(question: string, answer: string, style?: StyleParams) {
  return postJSON<OracleReply>('/claude/oracle/answer', { question, answer, ...style })
}

export interface ExperimentReply {
  reading: string
  reactions: { philosopherId: string; text: string }[]
  question: string
}
/** Two philosophers respond to the visitor's choices in a thought experiment. */
export function reactToExperiment(params: {
  title: string
  setup: string
  question: string
  choice: string
  twist: string
  twistQuestion: string
  twistChoice: string
  why?: string
  thinkers?: string[]
} & StyleParams) {
  return postJSON<ExperimentReply>('/claude/experiments/react', params)
}

export interface JourneyOpening {
  setting: string
  greeting: string
  question: string
}
/** How a thinker greets you on the Journey, and the question they ask. */
export function openJourneyStop(philosopherId: string, style?: StyleParams) {
  return postJSON<JourneyOpening>('/claude/journey/open', { philosopherId, ...style })
}
/** The thinker's reply to your answer, and one idea to carry on. */
export function replyJourneyStop(params: { philosopherId: string; question: string; answer: string } & StyleParams) {
  return postJSON<{ reply: string; takeaway: string }>('/claude/journey/reply', params)
}

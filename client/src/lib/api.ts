async function postJSON<T>(path: string, body: unknown, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`/api${path}`, {
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
}
export function attack(params: {
  claim: string
  conclusion: string
  premises: { id: string; text: string; status: string }[]
  philosopherId: string
  priorRounds: { round: number; userResponse: string | null }[]
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
}
export function fetchVerdict(params: {
  claim: string
  conclusion: string
  premises: { id: string; text: string; status: string }[]
  rounds: { round: number; attacks: { philosopherId: string; text: string }[]; userResponse: string | null }[]
}) {
  return postJSON<VerdictResponse>('/claude/debate/verdict', params)
}

export interface BioResponse {
  life: string
  works: string
  legacy: string
}
export function fetchBio(philosopherId: string) {
  return postJSON<BioResponse>('/claude/library/bio', { philosopherId })
}

export type TrainLevel = 'easy' | 'medium' | 'hard'
export type TrainDirection = 'forward' | 'reverse'

export interface TrainGenerateResponse {
  direction: TrainDirection
  topic?: string
  passage?: string
  conclusion?: string
}
export function generateChallenge(level: TrainLevel, direction: TrainDirection) {
  return postJSON<TrainGenerateResponse>('/claude/train/generate', { level, direction })
}

export interface TrainScoreResponse {
  score: number
  feedback: string
  trueConclusion?: string
  truePremises?: string[]
}
export function scoreChallenge(params: {
  direction: TrainDirection
  passage?: string
  conclusion?: string
  userConclusion?: string
  userPremises: string[]
}) {
  return postJSON<TrainScoreResponse>('/claude/train/score', params)
}

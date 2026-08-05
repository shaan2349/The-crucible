export type PremiseStatus = 'standing' | 'weakened' | 'conceded'

export interface Premise {
  id: string
  text: string
  status: PremiseStatus
}

export interface Attack {
  philosopherId: string
  targetPremiseId: string
  text: string
}

export interface Round {
  round: number
  attacks: Attack[]
  userResponse: string | null
}

export interface Verdict {
  weakestPremiseId: string
  weakestReason: string
  leanedFramework: string
  sharpenedClaim: string
}

export type DebatePhase =
  | 'selecting'
  | 'decomposing'
  | 'attacking'
  | 'awaiting-response'
  | 'evaluating'
  | 'verdict-loading'
  | 'verdict'

export interface Debate {
  id: number
  claim: string
  philosopherIds: string[]
  conclusion: string
  premises: Premise[]
  rounds: Round[]
  currentRound: number
  phase: DebatePhase
  verdict: Verdict | null
  error?: string | null
}

export interface Bio {
  life: string
  works: string
  legacy: string
}

export interface TrainingStats {
  correct: number
  total: number
}

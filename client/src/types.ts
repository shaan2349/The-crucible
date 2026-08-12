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

/** How much the user actually said during the Council, computed from real
 * round data — 'none' = ended without ever responding, 'low' = one
 * meaningful response, 'full' = two or more. Drives both the verdict
 * prompt's honesty rules and which verdict layout renders. */
export type ParticipationLevel = 'none' | 'low' | 'full'

/** The session's overall trajectory — 'UNTESTED' is enforced client-side
 * whenever participationLevel is 'none' and never asked of the model;
 * the other five are the model's read of the full transcript. */
export type CouncilOutcome = 'UNTESTED' | 'REINFORCED' | 'REVISED' | 'SHIFTED' | 'SYNTHESISED' | 'UNRESOLVED'

export interface Verdict {
  weakestPremiseId: string
  weakestReason: string
  leanedFramework: string
  sharpenedClaim: string
  outcome: CouncilOutcome
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
  /** The user's own written reflection, captured after the Council concludes —
   * distinct from `verdict`, which is the AI's analysis. */
  userReflection?: string
  /** Snapshot of engagement at the moment the verdict was requested —
   * persisted alongside the debate so Journal/Profile can trust it later
   * without recomputing from rounds (and without silently going stale if
   * rounds ever get trimmed/edited). */
  participationLevel?: ParticipationLevel
}

export interface Bio {
  life: string
  works: string
  legacy: string
}

export interface TrainingSession {
  date: number
  level: 'easy' | 'medium' | 'hard'
  direction: 'forward' | 'reverse'
  score: number
}

export interface TrainingStats {
  correct: number
  total: number
  sessions: TrainingSession[]
  streak: number
  lastSessionDate: number | null
}

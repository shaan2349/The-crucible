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
  /** Same argument, rewritten for speech — shorter sentences, natural
   * discourse markers, contractions. Used for TTS playback instead of
   * reading `text` verbatim. Optional so debates saved before this
   * existed still load; playback falls back to `text` for those. */
  spokenText?: string
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

/* -------------------------------- Reflect -------------------------------- */
// A deliberately separate shape from Debate/Round/Attack above — Reflect
// has no premises to extract or attack, no verdict, no weakest-premise
// concept. Conflating the two data models would have dragged Debate's
// argument-testing vocabulary into what's supposed to be a genuinely
// different kind of conversation.

export interface ReflectTurn {
  philosopherId: string
  text: string
  spokenText?: string
}

export interface ReflectRound {
  round: number
  turns: ReflectTurn[]
  userMessage: string | null
}

export interface ReflectEndingPerspective {
  philosopherId: string
  summary: string
}

/** The non-verdict ending — see the brief's "WHAT THE COUNCIL SEES" /
 * "WHAT SEEMS TO MATTER TO YOU" / "THREE WAYS TO SEE IT" / "A QUESTION TO
 * CARRY WITH YOU" structure. Never a winner, never forced closure. */
export interface ReflectEnding {
  tension: string
  whatMatters: string
  perspectives: ReflectEndingPerspective[]
  question: string
}

export type ReflectPhase = 'awaiting-response' | 'responding' | 'ending-loading' | 'ended'

export interface ReflectSession {
  id: number
  situation: string
  philosopherIds: string[]
  /** Each chosen philosopher's opening take on the situation — keyed by
   * id since, unlike Debate's rounds, these aren't tied to a round
   * number. */
  openings: Record<string, string>
  rounds: ReflectRound[]
  phase: ReflectPhase
  ending: ReflectEnding | null
  error?: string | null
  userReflection?: string
}

export interface Bio {
  life: string
  works: string
  legacy: string
}

export type TrainExerciseType = 'deconstruct' | 'construct' | 'spot-flaw' | 'steelman' | 'framework-lens' | 'premise-audit'

export interface TrainingSession {
  date: number
  level: 'easy' | 'medium' | 'hard'
  exerciseType: TrainExerciseType
  score: number
}

export interface TrainingStats {
  correct: number
  total: number
  sessions: TrainingSession[]
  streak: number
  lastSessionDate: number | null
}

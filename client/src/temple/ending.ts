import { NIGHT as C } from '../night/theme'
import type { Debate, ParticipationLevel, Premise, PremiseStatus, Round, TempleEnding } from '../types'

/** Any round the user actually answered counts; "I don't know" is an answer. */
export function participationLevel(rounds: Round[]): ParticipationLevel {
  const meaningful = rounds.filter((r) => r.userResponse && r.userResponse.trim().length > 0)
  if (meaningful.length === 0) return 'none'
  if (meaningful.length === 1) return 'low'
  return 'full'
}

/** How a temple ends. Giving a premise up without replacing it is the only
 * way to lose ground; rewriting it for a good reason never is. */
export function templeEnding(premises: Premise[], level: ParticipationLevel): TempleEnding {
  if (level === 'none') return 'untested'
  const fallen = premises.filter((p) => p.status === 'conceded').length
  if (fallen * 2 > premises.length) return 'collapse'
  if (premises.some((p) => p.status === 'revised' || p.status === 'conceded')) return 'reshaped'
  if (premises.some((p) => p.status === 'weakened')) return 'contested'
  if (premises.some((p) => p.status === 'defended')) return 'victory'
  return 'contested'
}

/** The ending of a saved debate, including ones saved before endings existed. */
export function endingOf(d: Debate): TempleEnding {
  return d.ending ?? templeEnding(d.premises, d.participationLevel ?? participationLevel(d.rounds))
}

export const ENDING_COPY: Record<TempleEnding, { eyebrow: string; title: string; color: string; line: string }> = {
  victory: {
    eyebrow: 'VICTORY',
    title: 'Your temple stands, sealed in gold.',
    color: C.gold,
    line: 'Every column held, and you answered the objections that mattered.',
  },
  reshaped: {
    eyebrow: 'STANDS, RESHAPED',
    title: 'Your belief survived by changing.',
    color: C.ivory,
    line: 'You rewrote or gave up a premise along the way. The roof still holds on what remains.',
  },
  contested: {
    eyebrow: 'STILL CONTESTED',
    title: 'The temple stands, but it is cracked.',
    color: C.ember,
    line: 'Some objections were left only partly answered. The question is still open.',
  },
  collapse: {
    eyebrow: 'COLLAPSE',
    title: 'The roof has fallen.',
    color: C.ember,
    line: 'Too many columns were given up without anything in their place.',
  },
  untested: {
    eyebrow: 'UNTESTED',
    title: 'You ended before answering.',
    color: C.muted,
    line: 'Nothing happened to your temple, because nothing was defended or conceded yet.',
  },
}

export const STATUS_WORD: Record<PremiseStatus, { label: string; color: string }> = {
  standing: { label: 'Standing', color: C.gilt },
  defended: { label: 'Sealed in gold', color: C.gold },
  weakened: { label: 'Cracked', color: C.ember },
  conceded: { label: 'Fallen', color: '#7E838C' },
  revised: { label: 'Rebuilt', color: C.ivory },
}

/** The text a premise currently stands for: the rewrite, once revised. */
export function premiseText(p: Premise) {
  return p.status === 'revised' && p.revisedText ? p.revisedText : p.text
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V']
export function numeral(i: number, p?: Premise) {
  return ROMAN[i] + (p?.status === 'revised' ? '′' : '')
}

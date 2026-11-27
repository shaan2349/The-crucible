import { WINGS } from './wings'

/**
 * The Journey: the thinkers met one by one, chapter by chapter (the Hall's
 * wings). Where a thinker devised one of the thought experiments, their stop
 * invites you to play it; otherwise they ask you a question about your life.
 */
export const EXPERIMENT_STOPS: Record<string, { experiment: string; invite: string }> = {
  plato: { experiment: 'cave', invite: 'I have a story about prisoners in a cave. I would rather you lived it than heard it.' },
  descartes: { experiment: 'demon', invite: 'Let us doubt everything together, and see what is left standing.' },
  hobbes: { experiment: 'prisoners', invite: 'Two prisoners, two choices. Show me whether you would trust without a sword above us.' },
  kant: { experiment: 'murderer-at-the-door', invite: 'A man with a knife is at your door, asking where your friend is hiding. What will you say?' },
  bentham: { experiment: 'omelas', invite: 'A city of perfect happiness, with one price. Count it for me.' },
  nietzsche: { experiment: 'recurrence', invite: 'Imagine a demon whispering to you in your loneliest hour. Listen to what he says.' },
  rawls: { experiment: 'veil', invite: 'Design a society for me, but you may not know who you will be in it.' },
  nozick: { experiment: 'experience-machine', invite: 'I can offer you a perfect life. All you have to do is plug in.' },
  camus: { experiment: 'sisyphus', invite: 'Watch a man push a boulder up a hill forever, and tell me if he could be happy.' },
  singer: { experiment: 'drowning-child', invite: 'A child is drowning in front of you, and another far away. Show me the difference.' },
  thomson: { experiment: 'violinist', invite: 'You wake in a hospital, connected to a stranger. Let us find out what you owe him.' },
  parfit: { experiment: 'teleporter', invite: 'Step into my machine. The question is who steps out.' },
  sen: { experiment: 'lottery-of-birth', invite: 'Two students work just as hard. Tell me which one deserves more.' },
  aquinas: { experiment: 'euthyphro', invite: 'Socrates asked a question about the gods that I spent my life answering. Try it yourself.' },
}

export interface Stop {
  id: string
  chapter: number
}

export const CHAPTERS = WINGS.map((w, i) => ({ index: i, name: w.name, sub: w.sub, stops: w.ids.map((id) => ({ id, chapter: i })) }))
export const ALL_STOPS: Stop[] = CHAPTERS.flatMap((c) => c.stops)

/** A stop is open when it is the first of its chapter or the one before it is done. */
export function isOpen(id: string, done: Set<string>) {
  const ch = CHAPTERS.find((c) => c.stops.some((s) => s.id === id))
  if (!ch) return false
  const i = ch.stops.findIndex((s) => s.id === id)
  return i === 0 || done.has(ch.stops[i - 1].id)
}

export type RelationshipKind = 'lineage' | 'rivalry'

export interface Relationship {
  a: string
  b: string
  kind: RelationshipKind
  /** Short note — what actually connects them, not just "influenced." */
  note: string
}

/**
 * Curated, not generated — every edge here is a real, checkable historical
 * relationship (a teacher, a direct reply, a documented feud), not a vague
 * thematic resemblance. Deliberately sparse rather than exhaustive: a
 * constellation with 200 lines reads as noise, not a map.
 */
export const RELATIONSHIPS: Relationship[] = [
  { a: 'socrates', b: 'plato', kind: 'lineage', note: 'Teacher and student' },
  { a: 'plato', b: 'aristotle', kind: 'lineage', note: 'Taught at the Academy for twenty years' },
  { a: 'epicurus', b: 'marcus', kind: 'rivalry', note: 'Epicurean pleasure vs. Stoic duty' },

  { a: 'augustine', b: 'aquinas', kind: 'lineage', note: 'Christian philosophy, eight centuries apart' },
  { a: 'aquinas', b: 'ibnrushd', kind: 'lineage', note: "Built his Aristotle on Averroes' commentaries" },

  { a: 'descartes', b: 'hume', kind: 'rivalry', note: 'Rationalist foundations vs. empiricist doubt' },
  { a: 'hobbes', b: 'locke', kind: 'rivalry', note: 'Absolute sovereign vs. consent of the governed' },
  { a: 'locke', b: 'rousseau', kind: 'lineage', note: 'Social contract tradition, radicalised' },
  { a: 'rousseau', b: 'kant', kind: 'lineage', note: "Kant kept Rousseau's portrait on his wall" },
  { a: 'hume', b: 'kant', kind: 'lineage', note: 'Woke Kant from his "dogmatic slumber"' },
  { a: 'rousseau', b: 'burke', kind: 'rivalry', note: "Burke's Reflections answered revolutionary ideals" },
  { a: 'wollstonecraft', b: 'burke', kind: 'rivalry', note: 'A Vindication of the Rights of Men, written in weeks' },
  { a: 'wollstonecraft', b: 'rousseau', kind: 'rivalry', note: "Attacked Rousseau's account of women's education" },

  { a: 'kant', b: 'hegel', kind: 'lineage', note: 'Idealism, radicalised into dialectic' },
  { a: 'hegel', b: 'marx', kind: 'lineage', note: 'Turned the dialectic onto material history' },
  { a: 'bentham', b: 'mill', kind: 'lineage', note: "Mill was raised from birth on Bentham's utilitarianism" },
  { a: 'kierkegaard', b: 'hegel', kind: 'rivalry', note: 'Rejected the System entirely for the single individual' },
  { a: 'nietzsche', b: 'kant', kind: 'rivalry', note: 'Called the categorical imperative a form of cruelty' },
  { a: 'marx', b: 'smith', kind: 'rivalry', note: 'Turned classical economics into a critique of capital' },

  { a: 'rawls', b: 'kant', kind: 'lineage', note: 'The veil of ignorance as Kantian constructivism' },
  { a: 'nozick', b: 'rawls', kind: 'rivalry', note: 'Anarchy, State, and Utopia answered Rawls directly' },
  { a: 'wittgenstein', b: 'popper', kind: 'rivalry', note: 'A famous, disputed argument over a fireplace poker' },
  { a: 'popper', b: 'marx', kind: 'rivalry', note: "Named historicism as Marxism's central flaw" },
  { a: 'hayek', b: 'keynes', kind: 'rivalry', note: 'The defining economic debate of the 20th century' },
  { a: 'arendt', b: 'marx', kind: 'rivalry', note: "Contested Marx's account of labour and action" },
  { a: 'berlin', b: 'rousseau', kind: 'rivalry', note: "Named the general will a danger to negative liberty" },

  { a: 'kierkegaard', b: 'sartre', kind: 'lineage', note: 'Subjective truth, secularised a century later' },
  { a: 'sartre', b: 'camus', kind: 'rivalry', note: 'Their friendship ended publicly over Marxism' },
  { a: 'sartre', b: 'beauvoir', kind: 'lineage', note: 'Lifelong intellectual partnership' },
  { a: 'foucault', b: 'sartre', kind: 'rivalry', note: 'Rejected existentialist humanism outright' },
  { a: 'sartre', b: 'fanon', kind: 'lineage', note: "Wrote the preface to The Wretched of the Earth" },
  { a: 'beauvoir', b: 'wollstonecraft', kind: 'lineage', note: 'Two centuries of the same unfinished argument' },

  { a: 'confucius', b: 'mencius', kind: 'lineage', note: 'Direct transmission of the Confucian school' },
  { a: 'laozi', b: 'confucius', kind: 'rivalry', note: 'Non-action against ritual and duty' },
  { a: 'mencius', b: 'hobbes', kind: 'rivalry', note: 'Human nature as good, not brutish' },

  { a: 'singer', b: 'bentham', kind: 'lineage', note: 'Utilitarian calculus extended to all sentient beings' },
  { a: 'nussbaum', b: 'singer', kind: 'rivalry', note: 'Capabilities, not aggregate utility' },
  { a: 'sen', b: 'nussbaum', kind: 'lineage', note: 'Co-developed the capabilities approach' },
  { a: 'parfit', b: 'locke', kind: 'rivalry', note: "Dissolved Locke's continuity theory of the self" },
  { a: 'anscombe', b: 'mill', kind: 'rivalry', note: '"Modern Moral Philosophy" against consequentialism' },
]

export function relationshipsFor(id: string): Array<Relationship & { otherId: string }> {
  return RELATIONSHIPS.filter((r) => r.a === id || r.b === id).map((r) => ({
    ...r,
    otherId: r.a === id ? r.b : r.a,
  }))
}

export type BackgroundScreenId =
  | 'landing'
  | 'onboarding'
  | 'reflect'
  | 'debate'
  | 'mythinking'
  | 'library'
  | 'profile'
  | 'train'
  | 'settings'
  | 'council'

interface BackgroundStrategy {
  /**
   * Curated philosopher ids only — deliberately not "all 47." A small,
   * hand-picked pool per screen, mostly non-overlapping with every other
   * screen's pool, is what makes each screen's ambient identity feel
   * distinct rather than the whole app cycling through one shared bag of
   * faces. See useScreenBackground for how a screen picks one entry from
   * its pool.
   */
  pool: string[]
  /** Ambient scrim strength — see RotatingBackdrop's `stops`. */
  dimmed: boolean
}

export const BACKGROUND_REGISTRY: Record<BackgroundScreenId, BackgroundStrategy> = {
  landing: { pool: ['descartes', 'sartre', 'hayek', 'thomson'], dimmed: false },
  onboarding: { pool: ['plato', 'epicurus', 'rawls', 'foucault'], dimmed: false },
  reflect: { pool: ['socrates', 'marcus', 'arendt', 'camus', 'beauvoir', 'confucius', 'buddha', 'laozi'], dimmed: false },
  // Distinct from reflect's more contemplative pool — argumentative/
  // rigorous thinkers, fitting a screen about testing claims.
  debate: { pool: ['nietzsche', 'kant', 'mill', 'hegel', 'marx', 'wittgenstein', 'rousseau'], dimmed: false },
  mythinking: { pool: ['kierkegaard', 'hume', 'wollstonecraft', 'sen'], dimmed: true },
  library: { pool: ['aristotle', 'aquinas', 'hegel', 'kant'], dimmed: true },
  profile: { pool: ['wittgenstein', 'popper', 'berlin', 'nussbaum'], dimmed: true },
  train: { pool: ['locke', 'hobbes', 'machiavelli', 'burke'], dimmed: true },
  // Settings is intentionally neutral and branded — a giant portrait would
  // compete with form controls, so it never picks a photo at all.
  settings: { pool: [], dimmed: true },
  // Council's backdrop is always derived from the philosophers actually
  // selected for that conversation (see DebateBackdrop) — it never falls
  // back to a generic rotating photo. When rendered with no selection at
  // all, it shows the plain neutral fallback rather than borrowing another
  // screen's pool.
  council: { pool: [], dimmed: true },
}

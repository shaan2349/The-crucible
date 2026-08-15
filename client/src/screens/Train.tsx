import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RotateCcw, PenLine, Search, Swords, Shield, Compass, Scale, ArrowLeft, Clock, RefreshCw } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import {
  generateChallenge,
  scoreChallenge,
  type TrainExerciseType,
  type TrainLevel,
  type TrainGenerateResponse,
  type TrainScoreResponse,
} from '../lib/api'
import { loadTrainingStats, saveTrainingStats, loadRecentTrainTopics, addRecentTrainTopic } from '../lib/storage'
import type { TrainingStats } from '../types'

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86_400_000)
}

const LEVELS: TrainLevel[] = ['easy', 'medium', 'hard']
const LEVEL_ORDER: TrainLevel[] = ['easy', 'medium', 'hard']

/** Six genuinely different reasoning exercises, not one exercise with six
 * skins — each teaches a distinct skill, and the user-facing names read
 * as things you'd actually do, not academic categories (the underlying
 * exerciseType ids stay as they are — only the label people see changed). */
const EXERCISE_CONFIG: Record<TrainExerciseType, { label: string; description: string; icon: ReactNode; promptLabel: string; estimatedMinutes: number }> = {
  deconstruct: {
    label: 'Spot the assumption',
    description: 'Extract the hidden premises from a real-style argument.',
    icon: <Search className="h-5 w-5" />,
    promptLabel: 'The passage',
    estimatedMinutes: 2,
  },
  construct: {
    label: 'Build a stronger argument',
    description: 'Construct a valid, sound case from scratch.',
    icon: <PenLine className="h-5 w-5" />,
    promptLabel: 'The conclusion',
    estimatedMinutes: 3,
  },
  'spot-flaw': {
    label: 'Spot the flaw',
    description: 'Find the one logical flaw hiding in the argument.',
    icon: <Search className="h-5 w-5" />,
    promptLabel: 'The argument',
    estimatedMinutes: 1,
  },
  steelman: {
    label: 'Defend the other side',
    description: 'Build the strongest possible case for a claim, even one you might not hold.',
    icon: <Shield className="h-5 w-5" />,
    promptLabel: 'The claim',
    estimatedMinutes: 3,
  },
  'framework-lens': {
    label: 'See it differently',
    description: 'Reason through a real situation the way a specific philosophy would.',
    icon: <Compass className="h-5 w-5" />,
    promptLabel: 'The scenario',
    estimatedMinutes: 2,
  },
  'premise-audit': {
    label: 'Find the weak link',
    description: 'Find the weakest link in an argument, and explain why it actually is.',
    icon: <Scale className="h-5 w-5" />,
    promptLabel: 'The argument',
    estimatedMinutes: 2,
  },
}

const EXERCISE_ORDER: TrainExerciseType[] = ['deconstruct', 'construct', 'spot-flaw', 'steelman', 'framework-lens', 'premise-audit']
const TODAYS_CHALLENGE_COUNT = 3

/** A one-line preview of whatever content field this exercise type
 * actually populated — so a "today's challenge" card shows real
 * generated content, not a generic category description. */
function challengeSummary(c: TrainGenerateResponse): string {
  // `argument` before `conclusion` — premise-audit populates both, and
  // the fuller argument text is the actual challenge; conclusion there
  // is just a supporting field. construct has no `argument` at all, so
  // it still falls through to `conclusion` correctly.
  const text = c.passage || c.claim || c.scenario || c.argument || c.conclusion || ''
  return text.length > 110 ? `${text.slice(0, 110).trim()}…` : text
}

/** Quietly raises or lowers the difficulty offered for a given exercise
 * type based on the last few scores at that type — never shown to the
 * user as a "level up," just reflected in which level gets requested
 * next. Needs at least 2 recent attempts before adjusting; a single
 * lucky or unlucky score isn't enough signal. */
function suggestedLevel(stats: TrainingStats, type: TrainExerciseType): TrainLevel {
  const recent = stats.sessions.filter((s) => s.exerciseType === type).slice(-3)
  if (recent.length < 2) return 'easy'
  const avg = recent.reduce((sum, s) => sum + s.score, 0) / recent.length
  const lastLevel = recent[recent.length - 1].level
  const idx = LEVEL_ORDER.indexOf(lastLevel)
  if (avg >= 4 && idx < LEVEL_ORDER.length - 1) return LEVEL_ORDER[idx + 1]
  if (avg <= 2 && idx > 0) return LEVEL_ORDER[idx - 1]
  return lastLevel
}

function pickChallengeTypes(count: number, avoid: TrainExerciseType[]): TrainExerciseType[] {
  const shuffled = [...EXERCISE_ORDER].sort(() => Math.random() - 0.5)
  const preferred = shuffled.filter((t) => !avoid.includes(t))
  const pool = preferred.length >= count ? preferred : shuffled
  return pool.slice(0, count)
}

export function Train() {
  const [exerciseType, setExerciseType] = useState<TrainExerciseType | null>(null)
  const [level, setLevel] = useState<TrainLevel>('easy')
  const [challenge, setChallenge] = useState<TrainGenerateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<TrainScoreResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [conclusionInput, setConclusionInput] = useState('')
  const [premiseInputs, setPremiseInputs] = useState(['', ''])
  const [freeformAnswer, setFreeformAnswer] = useState('')
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null)
  const [premiseExplanation, setPremiseExplanation] = useState('')

  const [stats, setStats] = useState<TrainingStats>({ correct: 0, total: 0, sessions: [], streak: 0, lastSessionDate: null })

  const [todaysChallenges, setTodaysChallenges] = useState<TrainGenerateResponse[] | null>(null)
  const [challengesLoading, setChallengesLoading] = useState(false)
  const [challengesError, setChallengesError] = useState<string | null>(null)
  const [lastShownTypes, setLastShownTypes] = useState<TrainExerciseType[]>([])

  const fetchedOnMount = useRef(false)
  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invocation of
    // mount effects — this is the app's first screen that fetches from
    // Claude automatically on load rather than in response to a user
    // action, so an unguarded effect would silently double the real API
    // calls (and cost) on every visit in development.
    if (fetchedOnMount.current) return
    fetchedOnMount.current = true
    // Loaded synchronously and passed directly into the first fetch,
    // rather than relying on the `stats` state var — that update and
    // this effect both fire on mount, and reading `stats` here would
    // still see the initial empty default (setState hasn't committed
    // yet), silently defaulting every skill to 'easy' on the very first
    // load of a session even for a user with real history.
    const loaded = loadTrainingStats()
    setStats(loaded)
    loadTodaysChallenges(loaded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadTodaysChallenges(statsOverride?: TrainingStats) {
    const s = statsOverride ?? stats
    setChallengesLoading(true)
    setChallengesError(null)
    try {
      const types = pickChallengeTypes(TODAYS_CHALLENGE_COUNT, lastShownTypes)
      const recentTopics = loadRecentTrainTopics()
      const results = await Promise.all(types.map((t) => generateChallenge(suggestedLevel(s, t), t, recentTopics)))
      setTodaysChallenges(results)
      setLastShownTypes(types)
    } catch (e) {
      setChallengesError((e as Error)?.message || "Couldn't load today's challenges.")
    }
    setChallengesLoading(false)
  }

  function resetAnswers() {
    setConclusionInput('')
    setPremiseInputs(['', ''])
    setFreeformAnswer('')
    setSelectedPremiseId(null)
    setPremiseExplanation('')
  }

  /** Jumps straight into a challenge already fetched for "Today's
   * challenges" — no extra generate() call, since the content is real
   * and already sitting in state. */
  function selectPrefetched(item: TrainGenerateResponse) {
    setExerciseType(item.exerciseType)
    setChallenge(item)
    setFeedback(null)
    setError(null)
    resetAnswers()
  }

  async function generate(type: TrainExerciseType) {
    setExerciseType(type)
    setLoading(true)
    setChallenge(null)
    setFeedback(null)
    setError(null)
    resetAnswers()
    try {
      const result = await generateChallenge(level, type, loadRecentTrainTopics())
      setChallenge(result)
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong generating the challenge.')
    }
    setLoading(false)
  }

  function backToPicker() {
    setExerciseType(null)
    setChallenge(null)
    setFeedback(null)
    setError(null)
  }

  async function submit() {
    if (!challenge || !exerciseType) return
    setLoading(true)
    setError(null)
    try {
      const result = await scoreChallenge({
        exerciseType,
        passage: challenge.passage,
        conclusion: challenge.conclusion,
        claim: challenge.claim,
        scenario: challenge.scenario,
        framework: challenge.framework,
        argument: challenge.argument,
        premises: challenge.premises,
        userConclusion: exerciseType === 'deconstruct' ? conclusionInput : undefined,
        userPremises: exerciseType === 'deconstruct' || exerciseType === 'construct' ? premiseInputs : undefined,
        userAnswer: exerciseType === 'spot-flaw' || exerciseType === 'framework-lens' ? freeformAnswer : undefined,
        userArgument: exerciseType === 'steelman' ? freeformAnswer : undefined,
        userPremiseId: exerciseType === 'premise-audit' ? selectedPremiseId ?? undefined : undefined,
        userExplanation: exerciseType === 'premise-audit' ? premiseExplanation : undefined,
      })
      setFeedback(result)
      addRecentTrainTopic(challenge.topic)
      const now = Date.now()
      const gap = stats.lastSessionDate == null ? null : daysBetween(stats.lastSessionDate, now)
      const streak = gap == null || gap > 1 ? 1 : gap === 0 ? Math.max(stats.streak, 1) : stats.streak + 1
      const nextStats: TrainingStats = {
        correct: stats.correct + (result.score >= 3 ? 1 : 0),
        total: stats.total + 1,
        sessions: [...stats.sessions, { date: now, level, exerciseType, score: result.score }].slice(-30),
        streak,
        lastSessionDate: now,
      }
      setStats(nextStats)
      saveTrainingStats(nextStats)
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong scoring your answer.')
    }
    setLoading(false)
  }

  function updatePremise(i: number, val: string) {
    setPremiseInputs((prev) => {
      const copy = [...prev]
      copy[i] = val
      return copy
    })
  }

  const canSubmit = (() => {
    if (!exerciseType) return false
    if (exerciseType === 'deconstruct') return premiseInputs.some(Boolean) || conclusionInput.trim().length > 0
    if (exerciseType === 'construct') return premiseInputs.some(Boolean)
    if (exerciseType === 'spot-flaw' || exerciseType === 'steelman' || exerciseType === 'framework-lens') return freeformAnswer.trim().length > 0
    if (exerciseType === 'premise-audit') return Boolean(selectedPremiseId) && premiseExplanation.trim().length > 0
    return false
  })()

  // Lightweight progress only, per design — no streak/percentage front
  // and center. "Strongest skill" / "Practicing" need at least 2
  // attempts of a type to say anything, and are omitted rather than
  // guessed when there isn't enough data yet.
  const skillAverages = (() => {
    const byType = new Map<TrainExerciseType, number[]>()
    stats.sessions.forEach((s) => {
      const list = byType.get(s.exerciseType) ?? []
      list.push(s.score)
      byType.set(s.exerciseType, list)
    })
    return Array.from(byType.entries())
      .filter(([, scores]) => scores.length >= 2)
      .map(([type, scores]) => ({ type, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => b.avg - a.avg)
  })()
  const strongest = skillAverages[0]
  const improving = skillAverages.length > 1 ? skillAverages[skillAverages.length - 1] : null

  return (
    <>
      <RotatingBackdrop screen="train" />
      <div className="standard-container relative z-[1] px-6 pb-10 pt-8">
        <header className="mb-6">
          <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">The Study Desk</p>
          <h1 className="font-display text-2xl font-medium text-parchment-900">Training</h1>
          <p className="mt-1 text-sm text-parchment-600">Practice thinking well, on real questions — not revision.</p>
        </header>

        {stats.total > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card className="p-3.5 text-center">
              <p className="font-display text-xl font-medium text-parchment-900">{stats.total}</p>
              <p className="mt-0.5 text-[11px] text-parchment-500">Completed</p>
            </Card>
            <Card className="p-3.5 text-center">
              <p className="font-display text-base font-medium leading-tight text-parchment-900">
                {strongest ? EXERCISE_CONFIG[strongest.type].label : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-parchment-500">Strongest skill</p>
            </Card>
            <Card className="p-3.5 text-center">
              <p className="font-display text-base font-medium leading-tight text-parchment-900">
                {improving ? EXERCISE_CONFIG[improving.type].label : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-parchment-500">Practicing</p>
            </Card>
          </div>
        )}

        {!exerciseType ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-lg font-medium text-parchment-900">Today's challenges</p>
              <button
                type="button"
                onClick={() => loadTodaysChallenges()}
                disabled={challengesLoading}
                aria-label="Get new challenges"
                className="flex h-8 w-8 items-center justify-center rounded-full text-parchment-500 transition-colors hover:text-forge-ember disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${challengesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {challengesLoading && !todaysChallenges && <Loader label="Finding today's challenges…" />}
            {challengesError && !challengesLoading && (
              <Card className="border-rose-300/70 bg-rose-50 p-4">
                <p className="mb-3 text-sm text-rose-700">Something went wrong: {challengesError}</p>
                <Button onClick={() => loadTodaysChallenges()}>Retry</Button>
              </Card>
            )}
            {todaysChallenges && (
              <div className="space-y-3">
                {todaysChallenges.map((item, i) => {
                  const cfg = EXERCISE_CONFIG[item.exerciseType]
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectPrefetched(item)}
                      className="block w-full text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-ember/50"
                      style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${i * 60}ms` }}
                    >
                      <Card className="p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-forge-ember">
                            {cfg.label}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[11px] text-parchment-500">
                            <Clock className="h-3 w-3" />
                            {cfg.estimatedMinutes} min
                          </span>
                        </div>
                        {item.topic && <p className="font-display text-lg font-medium leading-snug text-parchment-900">{item.topic}</p>}
                        <p className="mt-1 text-sm leading-relaxed text-parchment-600">{challengeSummary(item)}</p>
                      </Card>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-8 border-t border-parchment-300/70 pt-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-parchment-500">Or choose a specific skill</p>
              <div
                className="mb-4 flex gap-1 rounded-lg border border-parchment-300/70 bg-parchment-200 p-1"
                style={{ boxShadow: 'var(--shadow-embossed)', width: 'fit-content' }}
              >
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${level === l ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {EXERCISE_ORDER.map((type) => {
                  const cfg = EXERCISE_CONFIG[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => generate(type)}
                      className="text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-ember/50"
                    >
                      <Card className="flex h-full items-center gap-3 p-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-forge-ember" style={{ background: 'var(--color-side-gold-soft)' }}>
                          {cfg.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-sm font-medium text-parchment-900">{cfg.label}</span>
                          <span className="block text-xs leading-snug text-parchment-500">{cfg.description}</span>
                        </span>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-2">
            <button
              type="button"
              onClick={backToPicker}
              className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to challenges
            </button>

            {loading && !challenge && <Loader label="Working…" />}
            {error && !challenge && !loading && (
              <Card className="border-rose-300/70 bg-rose-50 p-4">
                <p className="mb-3 text-sm text-rose-700">Something went wrong: {error}</p>
                <Button onClick={() => generate(exerciseType)}>Retry</Button>
              </Card>
            )}

            {challenge && (
              <ExerciseSession
                exerciseType={exerciseType}
                level={level}
                challenge={challenge}
                loading={loading}
                error={feedback ? null : error}
                feedback={feedback}
                conclusionInput={conclusionInput}
                setConclusionInput={setConclusionInput}
                premiseInputs={premiseInputs}
                setPremiseInputs={setPremiseInputs}
                updatePremise={updatePremise}
                freeformAnswer={freeformAnswer}
                setFreeformAnswer={setFreeformAnswer}
                selectedPremiseId={selectedPremiseId}
                setSelectedPremiseId={setSelectedPremiseId}
                premiseExplanation={premiseExplanation}
                setPremiseExplanation={setPremiseExplanation}
                canSubmit={canSubmit}
                onSubmit={submit}
                onNext={() => generate(exerciseType)}
              />
            )}
          </div>
        )}
      </div>
    </>
  )
}

/* ------------------------------- ExerciseSession ------------------------------- */

function ExerciseSession({
  exerciseType,
  challenge,
  loading,
  error,
  feedback,
  conclusionInput,
  setConclusionInput,
  premiseInputs,
  updatePremise,
  setPremiseInputs,
  freeformAnswer,
  setFreeformAnswer,
  selectedPremiseId,
  setSelectedPremiseId,
  premiseExplanation,
  setPremiseExplanation,
  canSubmit,
  onSubmit,
  onNext,
}: {
  exerciseType: TrainExerciseType
  level: TrainLevel
  challenge: TrainGenerateResponse
  loading: boolean
  error: string | null
  feedback: TrainScoreResponse | null
  conclusionInput: string
  setConclusionInput: (v: string) => void
  premiseInputs: string[]
  setPremiseInputs: (fn: (p: string[]) => string[]) => void
  updatePremise: (i: number, v: string) => void
  freeformAnswer: string
  setFreeformAnswer: (v: string) => void
  selectedPremiseId: string | null
  setSelectedPremiseId: (v: string) => void
  premiseExplanation: string
  setPremiseExplanation: (v: string) => void
  canSubmit: boolean
  onSubmit: () => void
  onNext: () => void
}) {
  const cfg = EXERCISE_CONFIG[exerciseType]

  return (
    <div className="mt-2">
      {exerciseType === 'deconstruct' || exerciseType === 'spot-flaw' || exerciseType === 'premise-audit' ? (
        <Card className="relative overflow-hidden p-5" style={{ animation: 'revealUp 0.4s ease both' }}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(74,61,42,0.08) 28px)' }}
          />
          <p className="relative mb-1.5 font-display text-[13px] italic text-forge-ember">{cfg.promptLabel}</p>
          <p className="relative font-body text-[15px] leading-loose text-parchment-800 first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:font-medium first-letter:leading-[0.8] first-letter:text-forge-ember">
            {exerciseType === 'premise-audit' ? challenge.argument : challenge.passage}
          </p>
        </Card>
      ) : (
        <Card variant="hero" className="relative p-5" style={{ animation: 'revealUp 0.4s ease both' }}>
          <p className="mb-1.5 font-display text-[13px] italic text-forge-ember">{cfg.promptLabel}</p>
          {exerciseType === 'framework-lens' && challenge.framework && (
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-parchment-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-forge-ember">
              <Swords className="h-3 w-3" />
              {challenge.framework}
            </p>
          )}
          <p className="font-display text-lg leading-snug text-parchment-900">
            {exerciseType === 'construct' ? challenge.conclusion : exerciseType === 'steelman' ? challenge.claim : challenge.scenario}
          </p>
        </Card>
      )}

      {!feedback && (
        <div className="mt-8 space-y-4 border-l-2 border-dashed border-parchment-400/70 pl-4">
          {exerciseType === 'deconstruct' && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">
                <PenLine className="h-3 w-3" />
                What is the passage's conclusion?
              </span>
              <input
                value={conclusionInput}
                onChange={(e) => setConclusionInput(e.target.value)}
                placeholder="Write it here…"
                className="w-full border-0 border-b-2 border-dashed border-parchment-400 bg-transparent px-1 py-1.5 font-display text-[15px] text-parchment-900 outline-none placeholder:font-body placeholder:italic placeholder:text-parchment-400 focus:border-forge-ember"
              />
            </label>
          )}

          {(exerciseType === 'deconstruct' || exerciseType === 'construct') && (
            <>
              {premiseInputs.map((p, i) => (
                <label key={i} className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">
                    <PenLine className="h-3 w-3" />
                    Premise {i + 1}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => updatePremise(i, e.target.value)}
                    placeholder="Write it here…"
                    className="w-full border-0 border-b-2 border-dashed border-parchment-400 bg-transparent px-1 py-1.5 font-display text-[15px] text-parchment-900 outline-none placeholder:font-body placeholder:italic placeholder:text-parchment-400 focus:border-forge-ember"
                  />
                </label>
              ))}
              <button type="button" onClick={() => setPremiseInputs((p) => [...p, ''])} className="text-xs text-parchment-500 hover:text-forge-ember">
                + add another premise
              </button>
            </>
          )}

          {(exerciseType === 'spot-flaw' || exerciseType === 'steelman' || exerciseType === 'framework-lens') && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">
                <PenLine className="h-3 w-3" />
                {exerciseType === 'spot-flaw' && "What's the flaw, and where does it happen?"}
                {exerciseType === 'steelman' && 'Write the strongest possible case for this claim.'}
                {exerciseType === 'framework-lens' && `How would ${challenge.framework ?? 'this tradition'} reason through this?`}
              </span>
              <textarea
                value={freeformAnswer}
                onChange={(e) => setFreeformAnswer(e.target.value)}
                placeholder="Write it here…"
                rows={5}
                className="w-full resize-none rounded-xl border border-parchment-300 bg-parchment-50 p-3 font-display text-[15px] leading-relaxed text-parchment-900 outline-none placeholder:font-body placeholder:italic placeholder:text-parchment-400 focus:border-forge-ember"
              />
            </label>
          )}

          {exerciseType === 'premise-audit' && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-parchment-500">Which premise is weakest?</p>
              <div className="space-y-1.5">
                {(challenge.premises ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPremiseId(p.id)}
                    className="block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                    style={
                      selectedPremiseId === p.id
                        ? { borderColor: 'var(--color-forge-ember)', background: 'var(--color-side-gold-soft)', color: 'var(--color-parchment-900)' }
                        : { borderColor: 'var(--color-parchment-300)', color: 'var(--color-parchment-700)' }
                    }
                  >
                    {p.text}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">
                  <PenLine className="h-3 w-3" />
                  Why is it the weakest?
                </span>
                <textarea
                  value={premiseExplanation}
                  onChange={(e) => setPremiseExplanation(e.target.value)}
                  placeholder="Write it here…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-parchment-300 bg-parchment-50 p-3 font-display text-[15px] leading-relaxed text-parchment-900 outline-none placeholder:font-body placeholder:italic placeholder:text-parchment-400 focus:border-forge-ember"
                />
              </label>
            </>
          )}

          {error && <p className="text-sm text-rose-700">Something went wrong: {error}</p>}

          <div className="flex gap-2 pt-2">
            <Button onClick={onSubmit} disabled={!canSubmit || loading}>
              {loading ? 'Scoring…' : error ? 'Retry' : 'Submit'}
            </Button>
            <Button variant="ghost" onClick={onNext} disabled={loading}>
              <RotateCcw className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
              New challenge
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="mt-8" style={{ animation: 'revealUp 0.4s ease both' }}>
          <div className="flex flex-col items-center text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 font-display text-xl font-bold"
              style={{
                borderColor: '#8a2a1266',
                color: '#8a2a12',
                background: 'radial-gradient(circle, #f3ddb055, transparent 70%)',
                animation: 'stampDown 0.5s ease both',
              }}
            >
              {feedback.score}/5
            </div>
            <p className="mt-2.5 font-display text-sm uppercase tracking-[0.15em] text-forge-char">
              {feedback.score >= 4 ? 'Sharp reading' : feedback.score >= 3 ? 'Solid attempt' : 'Worth another pass'}
            </p>
          </div>

          <Card className="mt-5 p-5">
            {feedback.trueConclusion && (
              <p className="mb-1 text-xs text-parchment-600">
                <span className="font-medium text-parchment-700">Actual conclusion:</span> {feedback.trueConclusion}
              </p>
            )}
            {feedback.truePremises && (
              <p className="mb-3 text-xs text-parchment-600">
                <span className="font-medium text-parchment-700">Actual premises:</span> {feedback.truePremises.join(' · ')}
              </p>
            )}
            {feedback.actualFlaw && (
              <p className="mb-3 text-xs text-parchment-600">
                <span className="font-medium text-parchment-700">The actual flaw:</span> {feedback.actualFlaw}
              </p>
            )}
            {feedback.modelPick && (
              <p className="mb-3 text-xs text-parchment-600">
                <span className="font-medium text-parchment-700">Genuinely weakest:</span>{' '}
                {challenge.premises?.find((p) => p.id === feedback.modelPick)?.text ?? feedback.modelPick}
              </p>
            )}
            <p className="text-sm leading-relaxed text-parchment-800">{feedback.feedback}</p>
            <Button className="mt-4" onClick={onNext}>
              Next challenge
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}

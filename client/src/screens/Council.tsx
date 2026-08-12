import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Plus, X, Volume2, Square, Mic } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { PremiseRow } from '../components/PremiseRow'
import { PhilosopherAvatar } from '../components/PhilosopherAvatar'
import { PortraitFrame } from '../components/PortraitFrame'
import { PortraitFallback } from '../components/PortraitFallback'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { DebateBackdrop } from '../components/DebateBackdrop'
import { PHILOSOPHERS, philosopherById, SIDE_ACCENT, SIDE_DUOTONE } from '../data/philosophers'
import * as api from '../lib/api'
import { loadDebates, saveDebates } from '../lib/storage'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { useCastReadiness } from '../hooks/usePortrait'
import type { Debate as DebateState, ParticipationLevel, Round } from '../types'

const MAX_ROUNDS = 3
const MAX_COUNCIL = 5

// Collaborative inquiry, not intellectual combat — "is preparing a
// challenge" used to be in this list and read as adversarial/prosecutorial.
const THINKING_VERBS = ['is considering your position', 'is examining your premise', 'is exploring a different angle']

function thinkingLabel(id: string | null): string {
  if (!id) return 'Philosophers are forming their attacks…'
  const p = philosopherById(id)
  if (!p) return 'Forming a response…'
  return `${p.name} ${THINKING_VERBS[id.length % THINKING_VERBS.length]}…`
}

const REFLECTION_PROMPTS = [
  'What challenged your thinking most?',
  'Did anyone change your perspective?',
  'Which argument will stay with you?',
  'What assumption have you started questioning?',
]

function reflectionPrompt(debateId: number): string {
  return REFLECTION_PROMPTS[debateId % REFLECTION_PROMPTS.length]
}

/** Any round the user actually typed something into counts as a real
 * turn — including "I don't know", which is a meaningful answer, not a
 * non-answer. This is the single source of truth for whether the verdict
 * is allowed to describe the user as having participated at all. */
function participationLevel(rounds: Round[]): ParticipationLevel {
  const meaningful = rounds.filter((r) => r.userResponse && r.userResponse.trim().length > 0)
  if (meaningful.length === 0) return 'none'
  if (meaningful.length === 1) return 'low'
  return 'full'
}

/** A short reminder of what was actually said, not a full transcript —
 * the Reflection screen's job is to prompt the user's own thinking, not
 * re-read the debate. */
function summarizeConversation(debate: DebateState): string {
  const lastRound = debate.rounds[debate.rounds.length - 1]
  if (!lastRound) return ''
  return lastRound.attacks
    .map((a) => {
      const p = philosopherById(a.philosopherId)
      const snippet = a.text.length > 90 ? `${a.text.slice(0, 90).trim()}…` : a.text
      return `${p?.name ?? a.philosopherId} pressed: "${snippet}"`
    })
    .join(' ')
}

// Council was previously a standalone tab, including an empty "No
// discussion in progress" state when nothing was active — confusing,
// since Council isn't really a destination, it's what Reflect becomes
// once a question is submitted. The route stays (for old links/direct
// navigation) but only ever redirects: Reflect itself now renders the
// live conversation in place whenever one exists.
export function Council() {
  return <Navigate to="/app/reflect" replace />
}

/** Picks the right ambient backdrop for wherever a live discussion is
 * being shown — a two-philosopher debate gets the dedicated split
 * portrait treatment, derived from those exact philosophers. Anything
 * else (no selection yet) gets the plain neutral Council background —
 * never a generic rotating photo borrowed from another screen's pool. */
export function CouncilBackdrop({ philosopherIds }: { philosopherIds: string[] }) {
  return philosopherIds.length === 2 ? (
    <DebateBackdrop philosopherIds={philosopherIds} />
  ) : (
    <RotatingBackdrop screen="council" />
  )
}

/* --------------------------------- CouncilView --------------------------------- */

export function CouncilView({
  debate,
  setDebate,
  onExit,
}: {
  debate: DebateState
  setDebate: Dispatch<SetStateAction<DebateState | null>>
  onExit: () => void
}) {
  const [response, setResponse] = useState('')
  const [thinkingId, setThinkingId] = useState<string | null>(null)
  const [reflectionText, setReflectionText] = useState('')
  const navigate = useNavigate()
  const tts = useTextToSpeech()
  const stt = useSpeechToText()
  const [micField, setMicField] = useState<'response' | 'reflection' | null>(null)
  // The cast never reveals partially — every selected philosopher's
  // portrait must settle (loaded or definitively failed) before any of
  // them appear, so a slow connection can't show one thinker while the
  // other is still a blank gap.
  const castReady = useCastReadiness(debate.philosopherIds, 400)

  function toggleMic(field: 'response' | 'reflection', append: (text: string) => void) {
    if (stt.listening && micField === field) {
      stt.stop()
      setMicField(null)
      return
    }
    setMicField(field)
    stt.start((text) => append(text))
  }

  function updateDebate(fn: (d: DebateState) => DebateState) {
    setDebate((prev) => (prev ? fn(prev) : prev))
  }

  useEffect(() => {
    runNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate.phase])

  useEffect(() => {
    if (!stt.listening) setMicField(null)
  }, [stt.listening])

  async function runNext() {
    try {
      await runPhase()
    } catch (e) {
      updateDebate((d) => ({ ...d, error: (e as Error)?.message || 'Something went wrong talking to Claude.' }))
    }
  }

  async function runPhase() {
    if (debate.phase === 'selecting') {
      const { ids } = await api.selectOpponents(debate.claim)
      updateDebate((d) => ({ ...d, philosopherIds: ids, phase: 'decomposing' }))
    } else if (debate.phase === 'decomposing') {
      const { conclusion, premises } = await api.decompose(debate.claim)
      updateDebate((d) => ({
        ...d,
        conclusion,
        premises: premises.map((p) => ({ ...p, status: 'standing' as const })),
        phase: 'attacking',
      }))
    } else if (debate.phase === 'attacking') {
      const priorRounds = debate.rounds.map((r) => ({ round: r.round, userResponse: r.userResponse }))
      const attacks: Round['attacks'] = []
      for (const philosopherId of debate.philosopherIds) {
        setThinkingId(philosopherId)
        const result = await api.attack({
          claim: debate.claim,
          conclusion: debate.conclusion,
          premises: debate.premises,
          philosopherId,
          priorRounds,
          sameRoundAttacks: attacks.map((a) => ({ philosopherId: a.philosopherId, text: a.text })),
        })
        attacks.push({ philosopherId, targetPremiseId: result.targetPremiseId, text: result.text })
      }
      setThinkingId(null)
      const round: Round = { round: debate.currentRound, attacks, userResponse: null }
      updateDebate((d) => ({ ...d, rounds: [...d.rounds, round], phase: 'awaiting-response' }))
    } else if (debate.phase === 'evaluating') {
      const lastRound = debate.rounds[debate.rounds.length - 1]
      const { statuses } = await api.evaluate({
        claim: debate.claim,
        conclusion: debate.conclusion,
        premises: debate.premises,
        lastRoundAttacks: lastRound.attacks,
        userResponse: lastRound.userResponse ?? '',
      })
      const updatedPremises = debate.premises.map((pr) => {
        const match = statuses.find((s) => s.id === pr.id)
        return match ? { ...pr, status: match.status as typeof pr.status } : pr
      })
      const nextPhase = debate.currentRound >= MAX_ROUNDS ? 'verdict-loading' : 'attacking'
      updateDebate((d) => ({
        ...d,
        premises: updatedPremises,
        currentRound: nextPhase === 'attacking' ? d.currentRound + 1 : d.currentRound,
        phase: nextPhase,
      }))
    } else if (debate.phase === 'verdict-loading') {
      const level = participationLevel(debate.rounds)
      const verdict = await api.fetchVerdict({
        claim: debate.claim,
        conclusion: debate.conclusion,
        premises: debate.premises,
        rounds: debate.rounds,
        participationLevel: level,
      })
      updateDebate((d) => ({ ...d, verdict, participationLevel: level, phase: 'verdict' }))
    }
  }

  function retry() {
    updateDebate((d) => ({ ...d, error: null }))
    runNext()
  }

  function submitResponse() {
    if (!response.trim()) return
    updateDebate((d) => {
      const rounds = [...d.rounds]
      rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], userResponse: response.trim() }
      return { ...d, rounds, phase: 'evaluating' }
    })
    setResponse('')
  }

  function endNow() {
    updateDebate((d) => {
      const rounds = [...d.rounds]
      // Only save what the user actually typed — never invent a response
      // on their behalf. A round left with no userResponse is the honest
      // record of "the user didn't respond to this one", and the verdict
      // prompt relies on that being genuinely null, not a placeholder
      // string it might mistake for real participation.
      if (rounds.length && !rounds[rounds.length - 1].userResponse && response.trim()) {
        rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], userResponse: response.trim() }
      }
      return { ...d, rounds, phase: 'verdict-loading' }
    })
    setResponse('')
  }

  /** Lets the user step back into an early-ended session instead of
   * being stuck with a paused-inquiry card — reopens the most recent
   * round for a response if it's still waiting on one. */
  function resumeCouncil() {
    updateDebate((d) => ({
      ...d,
      verdict: null,
      phase: d.rounds.length > 0 && !d.rounds[d.rounds.length - 1].userResponse ? 'awaiting-response' : 'attacking',
    }))
  }

  function saveAndFinish() {
    const history = loadDebates()
    const toSave: DebateState = reflectionText.trim()
      ? { ...debate, userReflection: reflectionText.trim() }
      : debate
    saveDebates([...history, toSave])
    onExit()
    navigate('/app/journal')
  }

  function exitToReflect() {
    onExit()
    navigate('/app/reflect')
  }

  function addThinker(id: string) {
    updateDebate((d) =>
      d.philosopherIds.includes(id) || d.philosopherIds.length >= MAX_COUNCIL
        ? d
        : { ...d, philosopherIds: [...d.philosopherIds, id] },
    )
  }

  function removeThinker(id: string) {
    updateDebate((d) =>
      d.philosopherIds.length <= 2 ? d : { ...d, philosopherIds: d.philosopherIds.filter((x) => x !== id) },
    )
  }

  const busyLabels: Record<string, string> = {
    selecting: 'Choosing your opponents…',
    decomposing: 'Breaking your position into premises…',
    attacking: thinkingLabel(thinkingId),
    evaluating: 'Weighing your response…',
    'verdict-loading': 'Reaching a verdict…',
  }

  return (
    <div className="reading-container relative z-[1] px-6 pb-10 pt-8">
      <button type="button" onClick={exitToReflect} className="mb-4 text-xs text-parchment-500 hover:text-forge-ember">
        ← New position
      </button>

      <p className="text-sm italic text-parchment-700">"{debate.claim}"</p>

      {debate.philosopherIds.length > 0 && (
        <div
          className="mt-5 flex flex-wrap items-start justify-center gap-4"
          style={{ animation: 'castReveal 0.6s ease both' }}
        >
          {debate.philosopherIds.map((id, i) => (
            <div key={id} className="w-20 text-center sm:w-28">
              {castReady ? (
                <PortraitFrame id={id} size={400} duotone={SIDE_DUOTONE[i % SIDE_DUOTONE.length]} className="w-full" />
              ) : (
                <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '3/4', boxShadow: 'var(--shadow-card)' }}>
                  <PortraitFallback markOpacity={0.14} />
                </div>
              )}
              <p
                className="mt-1.5 font-display text-xs font-medium uppercase tracking-wide"
                style={{ color: SIDE_ACCENT[i % SIDE_ACCENT.length] }}
              >
                {philosopherById(id)?.name}
              </p>
            </div>
          ))}
        </div>
      )}

      {debate.conclusion && (
        <div className="mt-6" style={{ animation: 'revealUp 0.5s ease both' }}>
          <p className="mb-1.5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
            Your position
          </p>
          <p className="font-display text-lg leading-snug text-parchment-900">{debate.conclusion}</p>

          <p className="mb-1 mt-5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-parchment-500">
            Assumptions underneath it
          </p>
          <div>
            {debate.premises.map((p, i) => (
              <PremiseRow key={p.id} premise={p} index={i} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-8">
        {debate.rounds.map((r, ri) => (
          <div key={ri} className="space-y-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #c2531d40)' }} />
              <p className="font-display text-xs uppercase tracking-wide text-forge-ember">Round {r.round}</p>
              <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #c2531d40, transparent)' }} />
            </div>
            {r.attacks.map((a, ai) => {
              const sideIdx = debate.philosopherIds.indexOf(a.philosopherId)
              const accent = SIDE_ACCENT[sideIdx % SIDE_ACCENT.length] ?? SIDE_ACCENT[0]
              const ph = philosopherById(a.philosopherId)
              if (!ph) return null
              const delay = ai * 90
              const speechId = `${ri}-${ai}`
              const isSpeaking = tts.speakingId === speechId
              return (
                <div
                  key={ai}
                  className="flex gap-3 border-l-2 py-0.5 pl-3.5"
                  style={{ borderLeftColor: accent, animation: 'revealUp 0.45s ease both', animationDelay: `${delay}ms` }}
                >
                  <div className="shrink-0 overflow-hidden rounded-full" style={{ boxShadow: 'var(--shadow-embossed)' }}>
                    <PhilosopherAvatar id={a.philosopherId} name={ph.name} size={36} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="font-display text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
                        {ph.name}
                      </p>
                      {tts.supported && (
                        <button
                          type="button"
                          onClick={() => tts.speak(speechId, a.text)}
                          aria-label={isSpeaking ? `Stop reading ${ph.name}'s response` : `Read ${ph.name}'s response aloud`}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-parchment-400 transition-colors hover:text-forge-ember"
                        >
                          {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="text-[15px] leading-relaxed text-parchment-800">{a.text}</p>
                  </div>
                </div>
              )
            })}
            {r.userResponse && (
              <div
                className="ml-5 flex gap-3 border-l-2 border-l-forge-gold py-0.5 pl-3.5"
                style={{ animation: 'revealUp 0.45s ease both', animationDelay: `${r.attacks.length * 90}ms` }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forge-gold font-display text-xs font-bold text-parchment-50"
                  style={{ boxShadow: 'var(--shadow-embossed)' }}
                >
                  You
                </span>
                <div>
                  <p
                    className="mb-1 font-display text-xs font-semibold uppercase tracking-wide"
                    style={{ color: SIDE_ACCENT[0] }}
                  >
                    You
                  </p>
                  <p className="text-[15px] leading-relaxed text-parchment-800">{r.userResponse}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {debate.error ? (
        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4">
          <p className="mb-3 text-sm text-rose-700">Something went wrong reaching Claude: {debate.error}</p>
          <Button onClick={retry}>Retry</Button>
        </div>
      ) : (
        ['selecting', 'decomposing', 'attacking', 'evaluating', 'verdict-loading'].includes(debate.phase) && (
          <Loader label={busyLabels[debate.phase]} />
        )
      )}

      {debate.phase === 'awaiting-response' && (
        <div className="mt-4">
          <CouncilControls philosopherIds={debate.philosopherIds} onAdd={addThinker} onRemove={removeThinker} />
          <div className="relative">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Defend your premise, concede, or refine your position…"
              rows={4}
              className="w-full resize-none rounded-2xl border border-parchment-300 bg-parchment-50 p-3.5 pr-12 text-sm text-parchment-900 outline-none placeholder:text-parchment-400 focus:border-forge-ember"
            />
            {stt.supported && (
              <button
                type="button"
                onClick={() => toggleMic('response', (text) => setResponse((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)))}
                aria-label={micField === 'response' && stt.listening ? 'Stop dictating' : 'Dictate your response'}
                className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors"
                style={
                  micField === 'response' && stt.listening
                    ? { background: 'var(--color-forge-ember)', color: 'var(--color-parchment-50)' }
                    : { color: 'var(--color-parchment-400)' }
                }
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Button onClick={submitResponse} disabled={!response.trim()}>
              Respond
            </Button>
            <Button variant="ghost" onClick={endNow}>
              End debate now
            </Button>
          </div>
        </div>
      )}

      {debate.phase === 'verdict' && debate.verdict && debate.participationLevel === 'none' && (
        <EarlyEndOutcome debate={debate} onResume={resumeCouncil} onSave={saveAndFinish} />
      )}

      {debate.phase === 'verdict' && debate.verdict && debate.participationLevel !== 'none' && (
        <div className="mt-8">
          {debate.philosopherIds.length > 0 && (
            <div
              className="relative mb-7 flex flex-wrap items-center justify-center gap-7"
              style={{ animation: 'revealUp 0.6s ease both' }}
            >
              {debate.philosopherIds.map((id, i) => (
                <div key={id} className="relative w-20 text-center sm:w-28">
                  {debate.participationLevel === 'full' && (
                    <div
                      className="pointer-events-none absolute -inset-3 rounded-full blur-md"
                      style={{
                        background: `radial-gradient(circle, ${SIDE_ACCENT[i % SIDE_ACCENT.length]}55 0%, transparent 70%)`,
                        animation: `triumphantGlow 2.6s ease-in-out ${i * 0.4}s infinite`,
                      }}
                    />
                  )}
                  <PortraitFrame id={id} size={400} duotone={SIDE_DUOTONE[i % SIDE_DUOTONE.length]} className="relative w-full" />
                  <p
                    className="mt-1.5 font-display text-[11px] font-medium uppercase tracking-wide"
                    style={{ color: SIDE_ACCENT[i % SIDE_ACCENT.length] }}
                  >
                    {philosopherById(id)?.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div
            className="mb-5 flex items-center gap-2"
            style={{ animation: 'revealUp 0.5s ease both', animationDelay: '100ms' }}
          >
            <span
              className="h-px flex-1"
              style={{ background: 'linear-gradient(90deg, transparent, #c2531d55)' }}
            />
            <p className="font-display text-sm uppercase tracking-wide text-forge-ember">
              {debate.participationLevel === 'full' ? 'The crucible has spoken' : 'What the Council found so far'}
            </p>
            <span
              className="h-px flex-1"
              style={{ background: 'linear-gradient(90deg, #c2531d55, transparent)' }}
            />
          </div>

          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            style={{ animation: 'revealUp 0.5s ease both', animationDelay: '120ms' }}
          >
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">
                {debate.participationLevel === 'full' ? 'Weakest premise' : 'Most vulnerable assumption'}
              </p>
              <p className="text-sm leading-relaxed text-parchment-800">{debate.verdict.weakestReason}</p>
            </Card>
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">
                {debate.participationLevel === 'full' ? 'You leaned on' : 'Closest starting framework'}
              </p>
              <p className="text-sm leading-relaxed text-parchment-800">{debate.verdict.leanedFramework}</p>
            </Card>
          </div>

          <Card
            variant="hero"
            className="mt-3 p-5"
            style={{ animation: 'revealUp 0.5s ease both', animationDelay: '240ms' }}
          >
            <p className="mb-2 font-display text-sm font-medium uppercase tracking-wide text-forge-ember">
              Sharpened claim
            </p>
            <p className="font-display text-xl leading-snug text-parchment-900">{debate.verdict.sharpenedClaim}</p>
          </Card>

          <div
            className="mt-8 border-t border-parchment-300 pt-6"
            style={{ animation: 'revealUp 0.5s ease both', animationDelay: '300ms' }}
          >
            <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">Reflection</p>
            {summarizeConversation(debate) && (
              <p className="mb-3 text-xs italic leading-relaxed text-parchment-500">{summarizeConversation(debate)}</p>
            )}
            <p className="mb-3 font-display text-lg leading-snug text-parchment-900">{reflectionPrompt(debate.id)}</p>
            <div className="relative">
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Write honestly. Nobody else will read this."
                rows={5}
                className="w-full resize-none rounded-2xl bg-parchment-50 p-5 pr-14 text-[15px] leading-relaxed text-parchment-900 outline-none placeholder:text-parchment-400"
                style={{ boxShadow: 'var(--shadow-card)' }}
              />
              {stt.supported && (
                <button
                  type="button"
                  onClick={() =>
                    toggleMic('reflection', (text) =>
                      setReflectionText((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)),
                    )
                  }
                  aria-label={micField === 'reflection' && stt.listening ? 'Stop dictating' : 'Dictate your reflection'}
                  className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full transition-colors"
                  style={
                    micField === 'reflection' && stt.listening
                      ? { background: 'var(--color-forge-ember)', color: 'var(--color-parchment-50)' }
                      : { color: 'var(--color-parchment-400)' }
                  }
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <Button
            className="mt-5 w-full py-3"
            onClick={saveAndFinish}
            style={{ animation: 'revealUp 0.5s ease both', animationDelay: '360ms' }}
          >
            Save reflection
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * The honest outcome for a session ended before any real response — no
 * "crucible has spoken" fanfare, no glowing portraits, no pretend winner.
 * Only two things are actually knowable at this point: what the starting
 * claim resembled, and where it was weakest. Both come straight from the
 * verdict call (still real analysis of the claim/premises), just without
 * a narrative implying a conversation that didn't happen.
 */
function EarlyEndOutcome({
  debate,
  onResume,
  onSave,
}: {
  debate: DebateState
  onResume: () => void
  onSave: () => void
}) {
  if (!debate.verdict) return null
  return (
    <div className="mt-8" style={{ animation: 'revealUp 0.5s ease both' }}>
      <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">Inquiry paused</p>
      <p className="font-display text-xl leading-snug text-parchment-900">You ended the inquiry early.</p>
      <p className="mt-1 text-sm text-parchment-500">
        Here's what can honestly be said from your starting claim alone — no conversation happened for the Council to weigh in on.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-parchment-500">
            Your starting position was closest to
          </p>
          <p className="mt-0.5 font-display text-lg text-parchment-900">{debate.verdict.leanedFramework}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-parchment-500">
            Most vulnerable assumption
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-parchment-800">{debate.verdict.weakestReason}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onResume}>Continue the conversation</Button>
        <Button variant="ghost" onClick={onSave}>
          Save to Journal
        </Button>
      </div>
    </div>
  )
}

/* ----------------------------- CouncilControls ----------------------------- */

function CouncilControls({
  philosopherIds,
  onAdd,
  onRemove,
}: {
  philosopherIds: string[]
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}) {
  const [inviting, setInviting] = useState(false)
  const [filter, setFilter] = useState('')

  const available = PHILOSOPHERS.filter(
    (p) => !philosopherIds.includes(p.id) && p.name.toLowerCase().includes(filter.toLowerCase()),
  )

  function add(id: string) {
    onAdd(id)
    setInviting(false)
    setFilter('')
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {philosopherIds.map((id, i) => {
          const p = philosopherById(id)
          if (!p) return null
          const accent = SIDE_ACCENT[i % SIDE_ACCENT.length]
          return (
            <span
              key={id}
              className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs font-medium"
              style={{ background: `${accent}1a`, color: accent }}
            >
              {p.name}
              {philosopherIds.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  aria-label={`Remove ${p.name} from the council`}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          )
        })}
        {philosopherIds.length < MAX_COUNCIL && (
          <button
            type="button"
            onClick={() => setInviting((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-dashed border-parchment-400 px-3 py-1 text-xs text-parchment-500 transition-colors hover:border-forge-ember hover:text-forge-ember"
          >
            <Plus className="h-3 w-3" /> Invite a thinker
          </button>
        )}
      </div>

      {inviting && (
        <div className="mt-2.5" style={{ animation: 'revealUp 0.3s ease both' }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search philosophers…"
            autoFocus
            className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-parchment-900 outline-none focus:border-forge-ember"
          />
          <div className="mt-2 grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
            {available.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p.id)}
                className="truncate rounded-lg border border-parchment-300 px-2 py-1.5 text-left text-xs text-parchment-700 hover:border-forge-ember"
              >
                {p.name}
              </button>
            ))}
            {available.length === 0 && (
              <p className="col-span-full py-2 text-center text-xs text-parchment-500">No match.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

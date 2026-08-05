import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Volume2, Square, Mic } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Loader } from '../components/Loader'
import { PremiseRow } from '../components/PremiseRow'
import { PhilosopherAvatar } from '../components/PhilosopherAvatar'
import { PortraitFrame } from '../components/PortraitFrame'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { DebateBackdrop } from '../components/DebateBackdrop'
import { PHILOSOPHERS, philosopherById, SIDE_ACCENT, SIDE_DUOTONE } from '../data/philosophers'
import * as api from '../lib/api'
import { loadDebates, saveDebates } from '../lib/storage'
import { useDebateContext } from '../context/DebateContext'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useSpeechToText } from '../hooks/useSpeechToText'
import type { Debate as DebateState, Round } from '../types'

const MAX_ROUNDS = 3
const MAX_COUNCIL = 5

const THINKING_VERBS = ['is considering your position', 'is examining your premise', 'is preparing a challenge']

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

export function Council() {
  const { debate, setDebate } = useDebateContext()
  const navigate = useNavigate()

  if (!debate) {
    return (
      <>
        <RotatingBackdrop />
        <div className="relative z-[1] px-6 pb-10 pt-8">
          <EmptyState
            headline="No discussion in progress"
            body="Bring a question to Reflect and the Council gathers here."
            action={{ label: 'Go to Reflect', onClick: () => navigate('/app/reflect') }}
          />
        </div>
      </>
    )
  }

  return (
    <>
      {debate.philosopherIds.length === 2 ? (
        <DebateBackdrop philosopherIds={debate.philosopherIds} />
      ) : (
        <RotatingBackdrop />
      )}
      <CouncilView debate={debate} setDebate={setDebate} onExit={() => setDebate(null)} />
    </>
  )
}

/* --------------------------------- CouncilView --------------------------------- */

function CouncilView({
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
      const verdict = await api.fetchVerdict({
        claim: debate.claim,
        conclusion: debate.conclusion,
        premises: debate.premises,
        rounds: debate.rounds,
      })
      updateDebate((d) => ({ ...d, verdict, phase: 'verdict' }))
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
      if (rounds.length && !rounds[rounds.length - 1].userResponse) {
        rounds[rounds.length - 1] = {
          ...rounds[rounds.length - 1],
          userResponse: response.trim() || '(ended debate here)',
        }
      }
      return { ...d, rounds, phase: 'verdict-loading' }
    })
    setResponse('')
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
    <div className="relative z-[1] px-6 pb-10 pt-8">
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
              <PortraitFrame id={id} size={400} duotone={SIDE_DUOTONE[i % SIDE_DUOTONE.length]} className="w-full" />
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
        <div className="mt-5">
          <Card variant="hero" className="px-5 py-4" style={{ animation: 'revealUp 0.5s ease both' }}>
            <p className="mb-1.5 font-display text-[13px] italic text-forge-ember">Your conclusion</p>
            <p className="font-display text-lg leading-snug text-parchment-900">{debate.conclusion}</p>
          </Card>

          <div className="relative mt-5 pl-6">
            <div className="absolute bottom-1 left-[7px] top-1 w-px bg-parchment-300" />
            {debate.premises.map((p, i) => (
              <PremiseRow key={p.id} premise={p} index={i} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {debate.rounds.map((r, ri) => (
          <div key={ri} className="space-y-3">
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
                <Card
                  key={ai}
                  className="relative flex gap-3 overflow-hidden border-l-[3px] p-4"
                  style={{ borderLeftColor: accent, animation: 'revealUp 0.45s ease both', animationDelay: `${delay}ms` }}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: `linear-gradient(100deg, transparent 40%, ${accent}33 50%, transparent 60%)`,
                      backgroundSize: '300% 100%',
                      animation: `spotlightSweep 1.1s ease ${delay + 150}ms both`,
                    }}
                  />
                  <div className="relative shrink-0 overflow-hidden rounded-full" style={{ boxShadow: 'var(--shadow-embossed)' }}>
                    <PhilosopherAvatar id={a.philosopherId} name={ph.name} size={40} />
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
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
                </Card>
              )
            })}
            {r.userResponse && (
              <Card
                className="ml-5 flex gap-3 border-l-[3px] border-l-forge-gold bg-side-gold-soft/40 p-4"
                style={{ animation: 'revealUp 0.45s ease both', animationDelay: `${r.attacks.length * 90}ms` }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forge-gold font-display text-xs font-bold text-parchment-50"
                  style={{ boxShadow: 'var(--shadow-embossed)' }}
                >
                  You
                </span>
                <div>
                  <p className="mb-1.5 font-display text-xs font-semibold uppercase tracking-wide text-side-gold">
                    You
                  </p>
                  <p className="text-[15px] leading-relaxed text-parchment-800">{r.userResponse}</p>
                </div>
              </Card>
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
                className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
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

      {debate.phase === 'verdict' && debate.verdict && (
        <div className="mt-8">
          {debate.philosopherIds.length > 0 && (
            <div
              className="relative mb-7 flex flex-wrap items-center justify-center gap-7"
              style={{ animation: 'revealUp 0.6s ease both' }}
            >
              {debate.philosopherIds.map((id, i) => (
                <div key={id} className="relative w-20 text-center sm:w-28">
                  <div
                    className="pointer-events-none absolute -inset-3 rounded-full blur-md"
                    style={{
                      background: `radial-gradient(circle, ${SIDE_ACCENT[i % SIDE_ACCENT.length]}55 0%, transparent 70%)`,
                      animation: `triumphantGlow 2.6s ease-in-out ${i * 0.4}s infinite`,
                    }}
                  />
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
            <p className="font-display text-sm uppercase tracking-wide text-forge-ember">The crucible has spoken</p>
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
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Weakest premise</p>
              <p className="text-sm leading-relaxed text-parchment-800">{debate.verdict.weakestReason}</p>
            </Card>
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">You leaned on</p>
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
                  className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
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

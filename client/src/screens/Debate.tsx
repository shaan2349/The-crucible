import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shuffle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../components/Button'
import { Loader } from '../components/Loader'
import { PremiseRow } from '../components/PremiseRow'
import { PhilosopherTag } from '../components/PhilosopherTag'
import { PHILOSOPHERS, philosopherById, initials, SUGGESTED_TOPICS } from '../data/philosophers'
import * as api from '../lib/api'
import { loadDebates, saveDebates } from '../lib/storage'
import type { Debate as DebateState, OpponentMode, Round } from '../types'

const MAX_ROUNDS = 3
const SIDE_ACCENT = ['#9c6a16', '#4b3a82']

export function Debate() {
  const [debate, setDebate] = useState<DebateState | null>(null)

  if (!debate) return <Composer onStart={setDebate} />
  return <DebateView debate={debate} setDebate={setDebate} onExit={() => setDebate(null)} />
}

/* --------------------------------- Composer --------------------------------- */

function Composer({ onStart }: { onStart: (d: DebateState) => void }) {
  const [claim, setClaim] = useState('')
  const [mode, setMode] = useState<OpponentMode>('auto')
  const [manualIds, setManualIds] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [opponentsOpen, setOpponentsOpen] = useState(false)
  const [lastPromptIdx, setLastPromptIdx] = useState(-1)

  const filtered = PHILOSOPHERS.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))

  function toggleManual(id: string) {
    setManualIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev,
    )
  }

  function randomPrompt() {
    let idx = Math.floor(Math.random() * SUGGESTED_TOPICS.length)
    if (SUGGESTED_TOPICS.length > 1 && idx === lastPromptIdx) idx = (idx + 1) % SUGGESTED_TOPICS.length
    setLastPromptIdx(idx)
    setClaim(SUGGESTED_TOPICS[idx].label)
  }

  function enter() {
    const trimmed = claim.trim()
    if (!trimmed) return
    if (mode === 'manual' && manualIds.length !== 2) return
    onStart({
      id: Date.now(),
      claim: trimmed,
      philosopherIds: mode === 'manual' ? manualIds : [],
      conclusion: '',
      premises: [],
      rounds: [],
      currentRound: 1,
      phase: mode === 'manual' ? 'decomposing' : 'selecting',
      verdict: null,
      error: null,
    })
  }

  return (
    <div className="px-6 pb-10 pt-8">
      <h1 className="mb-6 font-display text-2xl font-medium text-parchment-900">Debate</h1>

      <p className="text-parchment-700">
        State a position you actually hold. Not a hypothetical — something you'd defend at
        dinner.
      </p>

      <textarea
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
        placeholder="e.g. Inheritance tax is fundamentally unjust…"
        rows={4}
        className="mt-4 w-full resize-none rounded-2xl border border-parchment-300 bg-parchment-50 p-4 text-base text-parchment-900 shadow-sm outline-none placeholder:text-parchment-400 focus:border-forge-ember"
      />

      <button
        type="button"
        onClick={randomPrompt}
        className="mt-2 flex items-center gap-1.5 text-xs text-parchment-500 transition-colors hover:text-forge-ember"
      >
        <Shuffle className="h-3.5 w-3.5" /> Give me a random position
      </button>

      <div className="mt-6 border-t border-parchment-300 pt-4">
        <button type="button" onClick={() => setOpponentsOpen((o) => !o)} className="flex w-full items-center justify-between">
          <span className="text-sm text-parchment-700">
            Opponents:{' '}
            <span className="font-medium text-parchment-900">
              {mode === 'auto'
                ? 'Auto-picked'
                : manualIds.length === 2
                  ? manualIds.map((id) => philosopherById(id)?.name).join(' vs ')
                  : 'Choose 2'}
            </span>
          </span>
          {opponentsOpen ? (
            <ChevronUp className="h-4 w-4 text-parchment-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-parchment-500" />
          )}
        </button>

        {opponentsOpen && (
          <div className="mt-3">
            <div className="flex w-fit gap-1 rounded-lg border border-parchment-300 bg-parchment-200 p-1">
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={`rounded-md px-3 py-1 text-xs ${mode === 'auto' ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
              >
                Auto-pick
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`rounded-md px-3 py-1 text-xs ${mode === 'manual' ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
              >
                Choose myself
              </button>
            </div>

            {mode === 'auto' && (
              <p className="mt-2 text-xs text-parchment-500">
                I'll pick 2 of {PHILOSOPHERS.length} philosophers whose frameworks most directly conflict
                with your position.
              </p>
            )}

            {mode === 'manual' && (
              <div className="mt-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {manualIds.map((id) => (
                    <PhilosopherTag key={id} id={id} />
                  ))}
                  {manualIds.length < 2 && (
                    <span className="text-xs text-parchment-500">Pick {2 - manualIds.length} more</span>
                  )}
                </div>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={`Search ${PHILOSOPHERS.length} philosophers…`}
                  className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-parchment-900 outline-none focus:border-forge-ember"
                />
                <div className="mt-2 grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleManual(p.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs ${
                        manualIds.includes(p.id)
                          ? 'border-forge-ember bg-side-gold-soft text-parchment-900'
                          : 'border-parchment-300 text-parchment-700 hover:border-parchment-400'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          manualIds.includes(p.id) ? 'bg-forge-ember text-parchment-50' : 'bg-parchment-200 text-parchment-600'
                        }`}
                      >
                        {initials(p.name)}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        className="mt-6 w-full py-3.5 text-base"
        disabled={!claim.trim() || (mode === 'manual' && manualIds.length !== 2)}
        onClick={enter}
      >
        Enter the Crucible
      </Button>
    </div>
  )
}

/* -------------------------------- DebateView -------------------------------- */

function DebateView({
  debate,
  setDebate,
  onExit,
}: {
  debate: DebateState
  setDebate: Dispatch<SetStateAction<DebateState | null>>
  onExit: () => void
}) {
  const [response, setResponse] = useState('')
  const navigate = useNavigate()

  function updateDebate(fn: (d: DebateState) => DebateState) {
    setDebate((prev) => (prev ? fn(prev) : prev))
  }

  useEffect(() => {
    runNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate.phase])

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
      const attacks = []
      for (const philosopherId of debate.philosopherIds) {
        const result = await api.attack({
          claim: debate.claim,
          conclusion: debate.conclusion,
          premises: debate.premises,
          philosopherId,
          priorRounds,
        })
        attacks.push({ philosopherId, targetPremiseId: result.targetPremiseId, text: result.text })
      }
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
    saveDebates([...history, debate])
    onExit()
    navigate('/app/history')
  }

  const busyLabels: Record<string, string> = {
    selecting: 'Choosing your opponents…',
    decomposing: 'Breaking your position into premises…',
    attacking: 'Philosophers are forming their attacks…',
    evaluating: 'Weighing your response…',
    'verdict-loading': 'Reaching a verdict…',
  }

  return (
    <div className="px-6 pb-10 pt-8">
      <button type="button" onClick={onExit} className="mb-4 text-xs text-parchment-500 hover:text-forge-ember">
        ← New position
      </button>

      <p className="text-sm italic text-parchment-700">"{debate.claim}"</p>

      {debate.conclusion && (
        <div className="mt-5">
          <div className="rounded-xl border border-parchment-300 bg-parchment-50 px-4 py-3">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">Your conclusion</p>
            <p className="font-display text-base text-parchment-900">{debate.conclusion}</p>
          </div>

          <div className="relative mt-4 pl-6">
            <div className="absolute bottom-1 left-[7px] top-1 w-px bg-parchment-300" />
            {debate.premises.map((p) => (
              <PremiseRow key={p.id} premise={p} />
            ))}
          </div>
        </div>
      )}

      {debate.philosopherIds.length > 0 && (
        <div className="mt-4 flex gap-2">
          {debate.philosopherIds.map((id, i) => (
            <PhilosopherTag key={id} id={id} accent={SIDE_ACCENT[i]} />
          ))}
        </div>
      )}

      <div className="mt-5 space-y-5">
        {debate.rounds.map((r, ri) => (
          <div key={ri} className="space-y-3">
            <p className="font-display text-[13px] italic text-forge-ember">Round {r.round}</p>
            {r.attacks.map((a, ai) => {
              const sideIdx = debate.philosopherIds.indexOf(a.philosopherId)
              const accent = SIDE_ACCENT[sideIdx] ?? SIDE_ACCENT[0]
              const ph = philosopherById(a.philosopherId)
              if (!ph) return null
              return (
                <div
                  key={ai}
                  className="flex gap-3 rounded-xl border-l-[3px] bg-parchment-50 p-3.5 shadow-sm"
                  style={{ borderLeftColor: accent }}
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-parchment-50"
                    style={{ background: accent }}
                  >
                    {initials(ph.name)}
                  </span>
                  <div>
                    <p className="mb-1 font-display text-xs font-semibold" style={{ color: accent }}>
                      {ph.name}
                    </p>
                    <p className="text-sm leading-relaxed text-parchment-800">{a.text}</p>
                  </div>
                </div>
              )
            })}
            {r.userResponse && (
              <div className="ml-5 flex gap-3 rounded-xl border-l-[3px] border-forge-gold bg-side-gold-soft/50 p-3.5 shadow-sm">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forge-gold text-xs font-bold text-parchment-50">
                  You
                </span>
                <div>
                  <p className="mb-1 font-display text-xs font-semibold text-side-gold">You</p>
                  <p className="text-sm leading-relaxed text-parchment-800">{r.userResponse}</p>
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
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Defend your premise, concede, or refine your position…"
            rows={4}
            className="w-full resize-none rounded-2xl border border-parchment-300 bg-parchment-50 p-3.5 text-sm text-parchment-900 outline-none placeholder:text-parchment-400 focus:border-forge-ember"
          />
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
        <div className="mt-6 rounded-xl border border-forge-gold/50 bg-side-gold-soft/40 p-5">
          <p className="mb-3 font-display text-lg font-semibold text-forge-ember">Verdict</p>
          <p className="mb-1 text-sm text-parchment-800">
            <span className="text-parchment-500">Weakest premise:</span> {debate.verdict.weakestReason}
          </p>
          <p className="mb-1 mt-2 text-sm text-parchment-800">
            <span className="text-parchment-500">You leaned on:</span> {debate.verdict.leanedFramework}
          </p>
          <p className="mt-2 text-sm text-parchment-800">
            <span className="text-parchment-500">Sharpened claim:</span>{' '}
            <span className="text-parchment-900">{debate.verdict.sharpenedClaim}</span>
          </p>
          <Button className="mt-4" onClick={saveAndFinish}>
            Save & finish
          </Button>
        </div>
      )}
    </div>
  )
}

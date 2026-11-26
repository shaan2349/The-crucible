import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, Volume2, VolumeX, Square, Play } from 'lucide-react'
import { TempleScene, type ColumnStatus } from '../temple/TempleScene'
import { philosopherById } from '../data/philosophers'
import * as api from '../lib/api'
import { loadDebates, saveDebates } from '../lib/storage'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { usePreferencesContext } from '../context/PreferencesContext'
import type { Debate as DebateState, ParticipationLevel, Premise, PremiseStatus, Round, TempleEnding } from '../types'

const MAX_ROUNDS = 3

/* The night-world palette, shared with the Temple scene. */
const C = {
  night: '#0B0D11',
  panel: '#11141A',
  raised: '#171B21',
  line: 'rgba(194,161,94,.2)',
  lineStrong: 'rgba(194,161,94,.45)',
  gilt: '#C2A15E',
  gold: '#F3D27A',
  ivory: '#EDE6D6',
  body: '#D9D2C2',
  muted: '#A39D90',
  ember: '#E07A62',
  sage: '#7FC4A6',
  iris: '#ABA4EC',
}
const F = {
  display: "'Gloock', Georgia, serif",
  inscr: "'Cinzel', Georgia, serif",
  read: "'Libre Caslon Text', Georgia, serif",
  ui: "'Hanken Grotesk', system-ui, sans-serif",
}
const SIDE_COLOR = [C.ember, C.iris]

const ROMAN = ['I', 'II', 'III', 'IV', 'V']
function numeral(i: number, p?: Premise) {
  return ROMAN[i] + (p?.status === 'revised' ? '′' : '')
}

/** The text a premise currently stands for: the rewrite, once revised. */
function premiseText(p: Premise) {
  return p.status === 'revised' && p.revisedText ? p.revisedText : p.text
}

function participationLevel(rounds: Round[]): ParticipationLevel {
  const meaningful = rounds.filter((r) => r.userResponse && r.userResponse.trim().length > 0)
  if (meaningful.length === 0) return 'none'
  if (meaningful.length === 1) return 'low'
  return 'full'
}

/** How the temple ends. Giving a premise up without replacing it is the
 * only way to lose ground; rewriting it for a good reason never is. */
function templeEnding(premises: Premise[], level: ParticipationLevel): TempleEnding {
  if (level === 'none') return 'untested'
  const fallen = premises.filter((p) => p.status === 'conceded').length
  if (fallen * 2 > premises.length) return 'collapse'
  if (premises.some((p) => p.status === 'revised' || p.status === 'conceded')) return 'reshaped'
  if (premises.some((p) => p.status === 'weakened')) return 'contested'
  if (premises.some((p) => p.status === 'defended')) return 'victory'
  return 'contested'
}

const ENDING_COPY: Record<TempleEnding, { eyebrow: string; title: string; color: string; line: string }> = {
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

const STATUS_WORD: Record<PremiseStatus, { label: string; color: string }> = {
  standing: { label: 'Standing', color: C.gilt },
  defended: { label: 'Sealed in gold', color: C.gold },
  weakened: { label: 'Cracked', color: C.ember },
  conceded: { label: 'Fallen', color: '#7E838C' },
  revised: { label: 'Rebuilt', color: C.ivory },
}

/* ------------------------------------------------------------------------- */

export function TempleDebate({
  debate,
  setDebate,
  onExit,
}: {
  debate: DebateState
  setDebate: Dispatch<SetStateAction<DebateState | null>>
  onExit: () => void
}) {
  const navigate = useNavigate()
  const { preferences } = usePreferencesContext()
  const tts = useTextToSpeech()
  const stt = useSpeechToText()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<TempleScene | null>(null)
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const builtFor = useRef<number | null>(null)
  const endedFor = useRef<number | null>(null)
  const running = useRef(false)
  const [response, setResponse] = useState('')
  const [reflection, setReflection] = useState('')
  const [thinkingId, setThinkingId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(0) // attacks of the latest round shown so far
  const [openWhy, setOpenWhy] = useState<number | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function update(fn: (d: DebateState) => DebateState) {
    setDebate((prev) => (prev ? fn(prev) : prev))
  }

  /* ----------------------------- the 3D scene ----------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    let scene: TempleScene
    try {
      scene = new TempleScene(canvas, { reducedMotion: reduced })
    } catch {
      setWebglFailed(true)
      return
    }
    sceneRef.current = scene
    const ro = new ResizeObserver(() => {
      const r = stage.getBoundingClientRect()
      scene.resize(r.width, r.height)
    })
    ro.observe(stage)
    let raf = 0
    const place = () => {
      const anchors = scene.columnAnchors()
      labelRefs.current.forEach((el, i) => {
        if (!el) return
        const a = anchors[i]
        if (!a) {
          el.style.opacity = '0'
          return
        }
        el.style.opacity = '1'
        el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%)`
      })
      raf = requestAnimationFrame(place)
    }
    raf = requestAnimationFrame(place)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
      builtFor.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build the temple once the premises are known. A debate that was already
  // under way appears as it stands; a fresh one assembles.
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !debate.premises.length || builtFor.current === debate.id) return
    builtFor.current = debate.id
    const fresh = debate.rounds.length === 0
    scene.setTemple(debate.conclusion || debate.claim, debate.premises.map((p) => p.status as ColumnStatus), fresh)
    if (debate.ending) scene.ending(debate.ending)
    if (!fresh) setRevealed(debate.rounds[debate.rounds.length - 1]?.attacks.length ?? 0)
  }, [debate.id, debate.premises, debate.conclusion, debate.claim, debate.rounds, debate.ending])

  /* ----------------------------- the debate flow ----------------------------- */

  useEffect(() => {
    if (running.current) return
    running.current = true
    runPhase()
      .catch((e) => update((d) => ({ ...d, error: (e as Error)?.message || 'Something went wrong talking to Claude.' })))
      .finally(() => {
        running.current = false
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate.phase, debate.error])

  async function runPhase() {
    if (debate.error) return
    if (debate.phase === 'selecting') {
      const { ids } = await api.selectOpponents(debate.claim)
      update((d) => ({ ...d, philosopherIds: ids, phase: 'decomposing' }))
    } else if (debate.phase === 'decomposing') {
      const { conclusion, premises } = await api.decompose(debate.claim)
      update((d) => ({
        ...d,
        conclusion,
        premises: premises.slice(0, 4).map((p) => ({ ...p, status: 'standing' as const })),
        phase: 'attacking',
      }))
    } else if (debate.phase === 'attacking') {
      // give the temple time to assemble before the first strike
      if (debate.rounds.length === 0) await wait(reduced ? 300 : 3600)
      setRevealed(0)
      const priorRounds = debate.rounds.map((r) => ({ round: r.round, userResponse: r.userResponse }))
      const premisesForAi = debate.premises.map((p) => ({ id: p.id, text: premiseText(p), status: p.status }))
      const attacks: Round['attacks'] = []
      const round: Round = { round: debate.currentRound, attacks, userResponse: null }
      update((d) => ({ ...d, rounds: [...d.rounds, round] }))
      for (const [side, philosopherId] of debate.philosopherIds.slice(0, 2).entries()) {
        setThinkingId(philosopherId)
        const result = await api.attack({
          claim: debate.claim,
          conclusion: debate.conclusion,
          premises: premisesForAi,
          philosopherId,
          priorRounds,
          sameRoundAttacks: attacks.map((a) => ({ philosopherId: a.philosopherId, text: a.text })),
          language: preferences.language,
          depth: preferences.depth,
        })
        const attack = { philosopherId, targetPremiseId: result.targetPremiseId, text: result.text, spokenText: result.spokenText }
        attacks.push(attack)
        update((d) => {
          const rounds = [...d.rounds]
          rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], attacks: [...attacks] }
          return { ...d, rounds }
        })
        setThinkingId(null)
        const idx = Math.max(0, debate.premises.findIndex((p) => p.id === result.targetPremiseId))
        const ph = philosopherById(philosopherId)
        await sceneRef.current?.strike(idx, ph?.name ?? '?', side === 0 ? 0 : 1)
        setRevealed(attacks.length)
        if (side === 0) await wait(reduced ? 200 : 1400)
      }
      update((d) => ({ ...d, phase: 'awaiting-response' }))
    } else if (debate.phase === 'evaluating') {
      const last = debate.rounds[debate.rounds.length - 1]
      const result = await api.evaluate({
        claim: debate.claim,
        conclusion: debate.conclusion,
        premises: debate.premises.map((p) => ({ id: p.id, text: premiseText(p), status: p.status })),
        lastRoundAttacks: last.attacks,
        userResponse: last.userResponse ?? '',
        language: preferences.language,
        depth: preferences.depth,
      })
      const next = debate.premises.map((p) => {
        const s = result.statuses.find((x) => x.id === p.id)
        if (!s) return p
        const status = s.status as PremiseStatus
        return { ...p, status, revisedText: status === 'revised' ? s.revisedText || p.revisedText : p.revisedText }
      })
      const judgement = {
        note: result.note,
        reasons: result.statuses
          .filter((s) => s.reason && s.reason.trim())
          .map((s) => ({ id: s.id, status: s.status as PremiseStatus, reason: s.reason as string })),
      }
      // play each column's change, one after another
      const scene = sceneRef.current
      next.forEach((p, i) => {
        const before = debate.premises[i]
        if (scene && (before.status !== p.status || p.status === 'defended')) {
          setTimeout(() => scene.applyStatus(i, p.status as ColumnStatus, true), i * 700)
        }
      })
      update((d) => {
        const rounds = [...d.rounds]
        rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], judgement }
        return { ...d, rounds, premises: next, phase: 'judged' }
      })
    } else if (debate.phase === 'verdict-loading') {
      const level = participationLevel(debate.rounds)
      const ending = templeEnding(debate.premises, level)
      if (endedFor.current !== debate.id) {
        endedFor.current = debate.id
        sceneRef.current?.ending(ending)
      }
      const verdict = await api.fetchVerdict({
        claim: debate.claim,
        conclusion: debate.conclusion,
        premises: debate.premises.map((p) => ({ id: p.id, text: premiseText(p), status: p.status })),
        rounds: debate.rounds.map((r) => ({ round: r.round, attacks: r.attacks, userResponse: r.userResponse })),
        participationLevel: level,
        language: preferences.language,
        depth: preferences.depth,
      })
      update((d) => ({ ...d, verdict, participationLevel: level, ending, phase: 'verdict' }))
    }
  }

  function submitResponse() {
    const text = response.trim()
    if (!text) return
    if (stt.listening) stt.stop()
    update((d) => {
      const rounds = [...d.rounds]
      rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], userResponse: text }
      return { ...d, rounds, phase: 'evaluating' }
    })
    setResponse('')
    panelRef.current?.scrollTo({ top: 0 })
  }

  function nextRound() {
    update((d) => {
      const finished = d.currentRound >= MAX_ROUNDS || d.premises.filter((p) => p.status === 'conceded').length * 2 > d.premises.length
      return finished ? { ...d, phase: 'verdict-loading' } : { ...d, currentRound: d.currentRound + 1, phase: 'attacking' }
    })
    panelRef.current?.scrollTo({ top: 0 })
  }

  function endNow() {
    update((d) => ({ ...d, phase: 'verdict-loading' }))
  }

  function retry() {
    update((d) => ({ ...d, error: null }))
  }

  function saveAndFinish() {
    const history = loadDebates()
    const toSave: DebateState = reflection.trim() ? { ...debate, userReflection: reflection.trim() } : debate
    saveDebates([...history, toSave])
    onExit()
    navigate('/app/mythinking')
  }

  function toggleMic() {
    if (stt.listening) {
      stt.stop()
      return
    }
    stt.start((t) => setResponse((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t)))
  }

  function toggleSound() {
    const scene = sceneRef.current
    if (!scene) return
    setSoundOn(scene.sound.toggle())
  }

  /* ---------------------------------- view ---------------------------------- */

  const lastRound = debate.rounds[debate.rounds.length - 1]
  const shownAttacks = lastRound ? lastRound.attacks.slice(0, debate.phase === 'attacking' ? revealed : lastRound.attacks.length) : []
  const status = statusLine(debate)

  // Rendered at the top of the page, above the app's header and tab bar:
  // the temple is a place you enter, not a tab.
  return createPortal(
    <div
      className="temple-grid fixed inset-0 z-[60] grid"
      style={{ background: C.night, color: C.ivory, fontFamily: F.ui, gridTemplateRows: 'auto minmax(0,1fr) auto' }}
    >
      <style>{`
        @media (min-width: 900px) {
          .temple-grid { grid-template-columns: minmax(0,1fr) 420px !important; grid-template-rows: auto minmax(0,1fr) !important; }
          .temple-bar { grid-column: 1 / -1; }
          .temple-panel { max-height: none !important; border-top: none !important; border-left: 1px solid ${C.line}; }
        }
        .temple-enter { animation: templeEnter .8s cubic-bezier(.16,1,.3,1) both; }
        @keyframes templeEnter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .temple-enter { animation: none; } }
        .temple-btn:focus-visible, .temple-panel textarea:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
      `}</style>
      <div className="contents">
        <header
          className="temple-bar flex items-center gap-3 border-b px-4 py-2"
          style={{ borderColor: C.line, paddingTop: 'max(8px, env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={() => {
              onExit()
              navigate('/app/debate')
            }}
            className="temple-btn flex h-11 w-11 items-center justify-center rounded-full"
            aria-label="Leave the temple"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span style={{ fontFamily: F.display, fontSize: 19 }}>The Temple</span>
            <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>
              {debate.currentRound > 0 && debate.premises.length ? `ROUND ${Math.min(debate.currentRound, MAX_ROUNDS)} OF ${MAX_ROUNDS}` : 'II · DIALECTIC'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="temple-btn ml-auto flex h-11 items-center gap-2 rounded-full border px-3 text-sm"
            style={{ borderColor: C.lineStrong }}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
        </header>

        <div ref={stageRef} className="relative min-h-0 overflow-hidden" style={{ touchAction: 'pan-y' }}>
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            role="img"
            aria-label={`A marble temple. Its roof reads: ${debate.conclusion || debate.claim}. ${status.text}.`}
          />
          {webglFailed && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center" style={{ fontFamily: F.read, color: C.muted }}>
              This device could not draw the 3D temple, but the debate below works as normal.
            </div>
          )}
          {debate.premises.map((p, i) => (
            <span
              key={p.id}
              ref={(el) => {
                labelRefs.current[i] = el
              }}
              className="pointer-events-none absolute left-0 top-0"
              style={{
                fontFamily: F.inscr,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '.1em',
                color: STATUS_WORD[p.status].color,
                textShadow: '0 1px 6px rgba(0,0,0,.85)',
                opacity: 0,
                transition: 'color .8s ease',
              }}
            >
              {numeral(i, p)}
            </span>
          ))}
          <div
            className="absolute left-4 top-3 flex items-center gap-2.5 rounded px-3 py-1.5"
            style={{ background: 'rgba(11,13,17,.72)', border: `1px solid ${C.line}` }}
            aria-live="polite"
          >
            <span className="flex gap-1" aria-hidden="true">
              {debate.premises.map((p) => (
                <i key={p.id} className="block h-1 w-4 rounded-sm" style={{ background: STATUS_WORD[p.status].color, transition: 'background .8s ease' }} />
              ))}
            </span>
            <em style={{ fontFamily: F.read, fontSize: 14, color: status.color }}>{status.text}</em>
          </div>
        </div>

        <section
          ref={panelRef}
          className="temple-panel overflow-y-auto border-t"
          style={{ background: C.panel, borderColor: C.line, maxHeight: '48vh', paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-[18px] pt-4">
            {debate.error ? (
              <div className="flex flex-col gap-3">
                <p style={{ fontFamily: F.read, color: C.ember }}>The temple could not reach the philosophers: {debate.error}</p>
                <PrimaryButton onClick={retry}>Try again</PrimaryButton>
              </div>
            ) : (
              <>
                {(debate.phase === 'selecting' || debate.phase === 'decomposing') && (
                  <Waiting text={debate.phase === 'selecting' ? 'Choosing who will test you…' : 'Carving your thesis into stone…'} />
                )}

                {debate.premises.length > 0 && debate.phase !== 'verdict' && debate.phase !== 'verdict-loading' && debate.rounds.length === 0 && (
                  <ThesisCard debate={debate} />
                )}

                {(debate.phase === 'attacking' || debate.phase === 'awaiting-response') &&
                  shownAttacks.map((a, i) => (
                    <Objection
                      key={`${lastRound?.round}-${i}`}
                      index={i}
                      attack={a}
                      premises={debate.premises}
                      side={debate.philosopherIds.indexOf(a.philosopherId)}
                      open={openWhy === i}
                      onToggleWhy={() => setOpenWhy(openWhy === i ? null : i)}
                      speaking={tts.speakingId === `${lastRound?.round}-${i}`}
                      onSpeak={
                        tts.supported && preferences.voiceEnabled
                          ? () => tts.speak(`${lastRound?.round}-${i}`, a.spokenText || a.text, a.philosopherId)
                          : undefined
                      }
                    />
                  ))}

                {debate.phase === 'attacking' && thinkingId && <Waiting text={`${philosopherById(thinkingId)?.name ?? 'A philosopher'} is preparing an objection…`} />}

                {debate.phase === 'awaiting-response' && (
                  <div className="temple-enter flex flex-col gap-2.5">
                    <label htmlFor="temple-reply" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>
                      YOUR REPLY
                    </label>
                    <div className="relative">
                      <textarea
                        id="temple-reply"
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitResponse()
                        }}
                        rows={4}
                        placeholder="Defend your premise, rewrite it, or give it up. In your own words."
                        className="w-full resize-none rounded p-3.5 pr-12 outline-none"
                        style={{ background: C.raised, border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16, lineHeight: 1.55 }}
                      />
                      {stt.supported && (
                        <button
                          type="button"
                          onClick={toggleMic}
                          aria-label={stt.listening ? 'Stop dictating' : 'Dictate your reply'}
                          className="temple-btn absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full"
                          style={stt.listening ? { background: C.ember, color: C.night } : { color: C.muted }}
                        >
                          <Mic className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2.5">
                      <GhostButton onClick={endNow}>End here</GhostButton>
                      <PrimaryButton onClick={submitResponse} disabled={!response.trim()}>
                        Reply
                      </PrimaryButton>
                    </div>
                  </div>
                )}

                {debate.phase === 'evaluating' && (
                  <>
                    {lastRound?.userResponse && <YourReply text={lastRound.userResponse} />}
                    <Waiting text="The judge is weighing your reply…" />
                  </>
                )}

                {debate.phase === 'judged' && lastRound?.judgement && (
                  <Judged
                    round={lastRound}
                    premises={debate.premises}
                    last={debate.currentRound >= MAX_ROUNDS || debate.premises.filter((p) => p.status === 'conceded').length * 2 > debate.premises.length}
                    onNext={nextRound}
                  />
                )}

                {debate.phase === 'verdict-loading' && <Waiting text="The temple settles…" />}

                {debate.phase === 'verdict' && debate.ending && (
                  <Ending
                    debate={debate}
                    reflection={reflection}
                    setReflection={setReflection}
                    onSave={saveAndFinish}
                    onContinue={
                      debate.ending === 'untested'
                        ? () => {
                            endedFor.current = null
                            update((d) => ({ ...d, verdict: null, ending: undefined, phase: d.rounds.length && !d.rounds[d.rounds.length - 1].userResponse ? 'awaiting-response' : 'attacking' }))
                          }
                        : undefined
                    }
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------- small pieces ------------------------------ */

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function statusLine(d: DebateState): { text: string; color: string } {
  if (!d.premises.length) return { text: 'Preparing the ground', color: C.muted }
  if (d.ending) return { text: ENDING_COPY[d.ending].eyebrow.toLowerCase().replace(/^./, (c) => c.toUpperCase()), color: ENDING_COPY[d.ending].color }
  const cracked = d.premises.filter((p) => p.status === 'weakened').length
  const fallen = d.premises.filter((p) => p.status === 'conceded').length
  if (fallen) return { text: `${fallen === 1 ? 'A column has' : `${fallen} columns have`} fallen`, color: '#9A9EA6' }
  if (cracked) return { text: cracked === 1 ? 'A column is cracked' : `${cracked} columns are cracked`, color: C.ember }
  if (d.premises.some((p) => p.status === 'defended')) return { text: 'Stronger where it broke', color: C.gold }
  return { text: 'Standing', color: C.gilt }
}

function Eyebrow({ children, color = C.gilt }: { children: ReactNode; color?: string }) {
  return <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color }}>{children}</span>
}

function Waiting({ text }: { text: string }) {
  return (
    <p className="temple-enter flex items-center gap-3" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 15, color: C.muted }}>
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: C.gilt }} />
      {text}
    </p>
  )
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="temple-btn min-h-[50px] w-full flex-1 rounded transition-colors disabled:opacity-40"
      style={{ background: C.gilt, color: C.night, fontFamily: F.ui, fontWeight: 600, fontSize: 16 }}
    >
      {children}
    </button>
  )
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="temple-btn min-h-[50px] w-full flex-1 rounded border"
      style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontFamily: F.ui, fontWeight: 500, fontSize: 15 }}
    >
      {children}
    </button>
  )
}

function ThesisCard({ debate }: { debate: DebateState }) {
  const names = debate.philosopherIds.slice(0, 2).map((id) => philosopherById(id)?.name ?? id)
  return (
    <div className="temple-enter flex flex-col gap-3">
      <Eyebrow>YOUR THESIS STANDS ON {debate.premises.length === 2 ? 'TWO' : debate.premises.length === 3 ? 'THREE' : 'FOUR'} PREMISES</Eyebrow>
      <p style={{ fontFamily: F.display, fontSize: 23, lineHeight: 1.15, textWrap: 'balance' }}>“{debate.conclusion || debate.claim}”</p>
      <ol className="m-0 list-none border-t p-0" style={{ borderColor: C.line }}>
        {debate.premises.map((p, i) => (
          <li key={p.id} className="flex gap-3.5 border-b py-2" style={{ borderColor: C.line, fontFamily: F.read, fontSize: 15, color: C.body }}>
            <b style={{ width: 26, flexShrink: 0, fontFamily: F.inscr, fontSize: 12, color: C.gilt }}>{numeral(i, p)}</b>
            {premiseText(p)}
          </li>
        ))}
      </ol>
      {names.length === 2 && (
        <p style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 14.5, color: C.muted }}>
          {names[0]} and {names[1]} will test it.
        </p>
      )}
    </div>
  )
}

function Objection({
  index,
  attack,
  premises,
  side,
  open,
  onToggleWhy,
  onSpeak,
  speaking,
}: {
  index: number
  attack: Round['attacks'][number]
  premises: Premise[]
  side: number
  open: boolean
  onToggleWhy: () => void
  onSpeak?: () => void
  speaking: boolean
}) {
  const ph = philosopherById(attack.philosopherId)
  const target = premises.findIndex((p) => p.id === attack.targetPremiseId)
  const color = SIDE_COLOR[side === 1 ? 1 : 0]
  return (
    <article className="temple-enter flex flex-col gap-2 rounded p-4" style={{ background: C.raised, borderLeft: `2px solid ${color}` }}>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow color={color}>
          OBJECTION {ROMAN[index]} · {(ph?.name ?? attack.philosopherId).toUpperCase()}
          {target >= 0 ? ` · AGAINST ${numeral(target, premises[target])}` : ''}
        </Eyebrow>
        {onSpeak && (
          <button type="button" onClick={onSpeak} aria-label={speaking ? `Stop ${ph?.name}` : `Hear ${ph?.name}`} className="temple-btn -m-2 flex h-10 w-10 items-center justify-center rounded-full" style={{ color: C.muted }}>
            {speaking ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <p style={{ fontFamily: F.read, fontSize: 16, lineHeight: 1.6, color: C.ivory }}>{attack.text}</p>
      {ph && (
        <>
          <button
            type="button"
            onClick={onToggleWhy}
            aria-expanded={open}
            className="temple-btn self-start rounded border px-3 py-2 text-left"
            style={{ borderColor: C.line, color: '#E9D5A6', fontFamily: F.read, fontStyle: 'italic', fontSize: 14 }}
          >
            {open ? 'Close' : `Why would ${ph.name} say this?`}
          </button>
          {open && (
            <p className="temple-enter border-t pt-2.5" style={{ borderColor: C.line, fontFamily: F.read, fontSize: 14, lineHeight: 1.6, color: C.body }}>
              <span style={{ color: C.gilt }}>{ph.name}</span>, {ph.era}. {ph.framework}.{' '}
              <span style={{ color: C.muted }}>{ph.attack}.</span>
            </p>
          )}
        </>
      )}
    </article>
  )
}

function YourReply({ text }: { text: string }) {
  return (
    <div className="temple-enter flex flex-col gap-1.5 rounded p-4" style={{ background: C.raised, borderLeft: `2px solid ${C.gilt}` }}>
      <Eyebrow>YOU</Eyebrow>
      <p style={{ fontFamily: F.read, fontSize: 15.5, lineHeight: 1.6, color: C.body }}>{text}</p>
    </div>
  )
}

function Judged({ round, premises, last, onNext }: { round: Round; premises: Premise[]; last: boolean; onNext: () => void }) {
  const j = round.judgement!
  return (
    <div className="flex flex-col gap-3">
      {round.userResponse && <YourReply text={round.userResponse} />}
      <div className="temple-enter flex flex-col gap-2.5" style={{ animationDelay: '.3s' }}>
        <Eyebrow>THE JUDGE</Eyebrow>
        <p style={{ fontFamily: F.display, fontSize: 20, lineHeight: 1.25 }}>{j.note}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {j.reasons.map((r) => {
            const i = premises.findIndex((p) => p.id === r.id)
            const p = premises[i]
            const word = STATUS_WORD[r.status] ?? STATUS_WORD.standing
            return (
              <li key={r.id} className="rounded p-3" style={{ background: C.raised, borderLeft: `2px solid ${word.color}` }}>
                <span style={{ fontFamily: F.inscr, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: word.color }}>
                  {i >= 0 ? numeral(i, p) : ''} · {word.label.toUpperCase()}
                </span>
                <p className="mt-1" style={{ fontFamily: F.read, fontSize: 15, lineHeight: 1.55, color: C.ivory }}>
                  {r.reason}
                </p>
                {r.status === 'revised' && p?.revisedText && (
                  <p className="mt-1.5" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 14.5, color: C.body }}>
                    Now reads: {p.revisedText}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="temple-enter" style={{ animationDelay: '.6s' }}>
        <PrimaryButton onClick={onNext}>{last ? 'See how your temple ends' : 'Face the next objections'}</PrimaryButton>
      </div>
    </div>
  )
}

function Ending({
  debate,
  reflection,
  setReflection,
  onSave,
  onContinue,
}: {
  debate: DebateState
  reflection: string
  setReflection: (v: string) => void
  onSave: () => void
  onContinue?: () => void
}) {
  const e = ENDING_COPY[debate.ending!]
  const v = debate.verdict
  return (
    <div className="flex flex-col gap-3.5">
      <div className="temple-enter flex flex-col gap-1.5" style={{ animationDelay: '1.2s' }}>
        <Eyebrow color={e.color}>{e.eyebrow}</Eyebrow>
        <p style={{ fontFamily: F.display, fontSize: 24, lineHeight: 1.15 }}>{e.title}</p>
        <p style={{ fontFamily: F.read, fontSize: 15.5, lineHeight: 1.6, color: C.body }}>{e.line}</p>
      </div>
      {v && (
        <div className="temple-enter flex flex-col gap-2.5" style={{ animationDelay: '1.6s' }}>
          <Detail label={debate.ending === 'untested' ? 'MOST VULNERABLE ASSUMPTION' : 'WEAKEST POINT'} text={v.weakestReason} />
          <Detail label={debate.ending === 'untested' ? 'CLOSEST STARTING FRAMEWORK' : 'YOU LEANED ON'} text={v.leanedFramework} />
          {debate.ending !== 'untested' && <Detail label="A STRONGER VERSION OF YOUR BELIEF" text={v.sharpenedClaim} big />}
        </div>
      )}
      {onContinue ? (
        <div className="temple-enter flex gap-2.5" style={{ animationDelay: '2s' }}>
          <GhostButton onClick={onSave}>Save and leave</GhostButton>
          <PrimaryButton onClick={onContinue}>Go back and answer</PrimaryButton>
        </div>
      ) : (
        <div className="temple-enter flex flex-col gap-2.5" style={{ animationDelay: '2s' }}>
          <label htmlFor="temple-reflection" style={{ fontFamily: F.display, fontSize: 18 }}>
            What will you take away from this?
          </label>
          <textarea
            id="temple-reflection"
            value={reflection}
            onChange={(ev) => setReflection(ev.target.value)}
            rows={3}
            placeholder="One or two sentences, in your own words."
            className="w-full resize-none rounded p-3.5 outline-none"
            style={{ background: C.raised, border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16 }}
          />
          <PrimaryButton onClick={onSave}>Keep this temple</PrimaryButton>
        </div>
      )}
    </div>
  )
}

function Detail({ label, text, big }: { label: string; text: string; big?: boolean }) {
  return (
    <div className="rounded p-3.5" style={{ background: C.raised }}>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1" style={{ fontFamily: big ? F.display : F.read, fontSize: big ? 19 : 15, lineHeight: big ? 1.3 : 1.55, color: C.ivory }}>
        {text}
      </p>
    </div>
  )
}

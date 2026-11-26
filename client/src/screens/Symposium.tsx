import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, Play, Square } from 'lucide-react'
import { philosopherById } from '../data/philosophers'
import * as api from '../lib/api'
import { loadReflectSessions, saveReflectSessions } from '../lib/storage'
import { useReflectContext } from '../context/ReflectContext'
import { usePreferencesContext } from '../context/PreferencesContext'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import type { ReflectRound, ReflectSession, ReflectTurn } from '../types'

/**
 * The Symposium: the calm counterpart to the Temple. Philosophers sit
 * around a lamplit table and talk a real situation through with you;
 * whoever is speaking leans into the lamplight. No winning or losing.
 */

const SEAT_COLORS = [C.ember, C.iris, C.sage]
const ROBES = ['#5a2a22', '#33305c', '#284d3e']

const PROMPTS = [
  'A decision I keep putting off is…',
  "I said yes to something I didn't want to do.",
  "I'm not sure if I'm making the right choice.",
  'A friendship feels one-sided lately.',
  "I don't know what I actually want here.",
  "Something keeps bothering me and I can't name why.",
]

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function Symposium() {
  const navigate = useNavigate()
  const { session, setSession } = useReflectContext()
  const { preferences } = usePreferencesContext()
  const tts = useTextToSpeech()
  const stt = useSpeechToText()
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [situation, setSituation] = useState('')
  const [message, setMessage] = useState('')
  const [addressee, setAddressee] = useState<string>('all')
  const [takeaway, setTakeaway] = useState('')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState<number | null>(null)
  const [thinkingId, setThinkingId] = useState<string | null>(null)
  const [revealedOpenings, setRevealedOpenings] = useState(Infinity)
  const panelRef = useRef<HTMLDivElement>(null)
  const revealFor = useRef<number | null>(null)

  const ids = session?.philosopherIds.slice(0, 3) ?? []

  function update(fn: (s: ReflectSession) => ReflectSession) {
    setSession((prev) => (prev ? fn(prev) : prev))
  }

  function scrollPanelToEnd() {
    requestAnimationFrame(() => panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' }))
  }

  /* ------------------------------ taking a seat ------------------------------ */

  async function begin() {
    const text = situation.trim()
    if (!text || starting) return
    if (stt.listening) stt.stop()
    setStarting(true)
    setStartError(null)
    try {
      const result = await api.beginReflection(text, { language: preferences.language, depth: preferences.depth })
      const next: ReflectSession = {
        id: Date.now(),
        situation: text,
        philosopherIds: result.philosopherIds,
        openings: Object.fromEntries(result.openings.map((o) => [o.philosopherId, o.take])),
        rounds: [],
        phase: 'awaiting-response',
        ending: null,
        error: null,
      }
      setRevealedOpenings(0)
      setSession(next)
      setSituation('')
    } catch (e) {
      setStartError((e as Error)?.message || 'The philosophers could not be reached.')
    } finally {
      setStarting(false)
    }
  }

  // Openings are spoken in turn: each philosopher leans into the light.
  useEffect(() => {
    if (!session || session.rounds.length > 0 || revealFor.current === session.id) return
    revealFor.current = session.id
    if (revealedOpenings === Infinity) return
    let cancelled = false
    ;(async () => {
      await wait(reduced ? 100 : 1400)
      for (let i = 0; i < Math.min(3, session.philosopherIds.length); i++) {
        if (cancelled) return
        setSpeaking(i)
        setRevealedOpenings(i + 1)
        scrollPanelToEnd()
        await wait(reduced ? 300 : 2600)
      }
      if (!cancelled) setSpeaking(null)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  /* ------------------------------ the conversation ------------------------------ */

  function roundsForApi(s: ReflectSession) {
    return s.rounds.map((r) => ({ round: r.round, turns: r.turns.map((t) => ({ philosopherId: t.philosopherId, text: t.text })), userMessage: r.userMessage }))
  }

  async function send() {
    if (!session) return
    const text = message.trim()
    if (!text || session.phase === 'responding') return
    if (stt.listening) stt.stop()
    setMessage('')
    const priorRounds = roundsForApi(session)
    const speakers = addressee === 'all' ? ids : ids.filter((id) => id === addressee)
    const round: ReflectRound = { round: session.rounds.length + 1, turns: [], userMessage: text }
    update((s) => ({ ...s, rounds: [...s.rounds, round], phase: 'responding', error: null }))
    scrollPanelToEnd()
    const turns: ReflectTurn[] = []
    try {
      for (const philosopherId of speakers) {
        setThinkingId(philosopherId)
        const result = await api.respondReflection({
          situation: session.situation,
          openings: session.openings,
          rounds: priorRounds,
          philosopherId,
          userMessage: text,
          sameRoundTurns: turns.map((t) => ({ philosopherId: t.philosopherId, text: t.text })),
          addressedTo: addressee,
          language: preferences.language,
          depth: preferences.depth,
        })
        turns.push({ philosopherId, text: result.text, spokenText: result.spokenText })
        setThinkingId(null)
        setSpeaking(ids.indexOf(philosopherId))
        update((s) => {
          const rounds = [...s.rounds]
          rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], turns: [...turns] }
          return { ...s, rounds }
        })
        scrollPanelToEnd()
        if (speakers.length > 1) await wait(reduced ? 200 : 1600)
      }
      update((s) => ({ ...s, phase: 'awaiting-response' }))
      setTimeout(() => setSpeaking(null), reduced ? 0 : 2400)
    } catch (e) {
      setThinkingId(null)
      setMessage(text)
      update((s) => {
        const rounds = turns.length ? s.rounds : s.rounds.slice(0, -1)
        return { ...s, rounds, phase: 'awaiting-response', error: (e as Error)?.message || 'The philosophers could not be reached.' }
      })
    }
  }

  async function close() {
    if (!session) return
    update((s) => ({ ...s, phase: 'ending-loading', error: null }))
    setSpeaking(null)
    try {
      const result = await api.endReflection({
        situation: session.situation,
        openings: session.openings,
        rounds: roundsForApi(session),
        language: preferences.language,
        depth: preferences.depth,
      })
      update((s) => ({ ...s, ending: result, phase: 'ended' }))
      panelRef.current?.scrollTo({ top: 0 })
    } catch (e) {
      update((s) => ({ ...s, phase: 'awaiting-response', error: (e as Error)?.message || 'The philosophers could not be reached.' }))
    }
  }

  function keep() {
    if (!session) return
    const history = loadReflectSessions()
    const toSave = takeaway.trim() ? { ...session, userReflection: takeaway.trim() } : session
    saveReflectSessions([...history, toSave])
    setSession(null)
    setTakeaway('')
    navigate('/app/mythinking')
  }

  function leaveForNew() {
    setSession(null)
    setSpeaking(null)
  }

  function toggleMic(set: (fn: (prev: string) => string) => void) {
    if (stt.listening) {
      stt.stop()
      return
    }
    stt.start((t) => set((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t)))
  }

  /* ----------------------------------- view ----------------------------------- */

  const seats = ids.map((id, i) => ({ id, name: philosopherById(id)?.name ?? id, color: SEAT_COLORS[i], robe: ROBES[i] }))
  const thinkingIndex = thinkingId ? ids.indexOf(thinkingId) : null

  return createPortal(
    <div
      className="symposium-grid fixed inset-0 z-[60] grid"
      style={{ background: C.night, color: C.ivory, fontFamily: F.ui, gridTemplateRows: 'auto minmax(0,1fr) auto' }}
    >
      <style>{`
        @media (min-width: 900px) {
          .symposium-grid { grid-template-columns: minmax(0,1fr) 440px !important; grid-template-rows: auto minmax(0,1fr) !important; }
          .symposium-bar { grid-column: 1 / -1; }
          .symposium-panel { max-height: none !important; border-top: none !important; border-left: 1px solid ${C.line}; }
        }
        .sym-enter { animation: symEnter .8s cubic-bezier(.16,1,.3,1) both; }
        @keyframes symEnter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .sym-btn:focus-visible, .symposium-panel textarea:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .sym-enter { animation: none; } }
      `}</style>
      <div className="contents">
        <header className="symposium-bar flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: C.line, paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
          <button type="button" onClick={() => navigate('/app')} className="sym-btn flex h-11 w-11 items-center justify-center rounded-full" aria-label="Back to the sanctuary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span style={{ fontFamily: F.display, fontSize: 19 }}>The Symposium</span>
            <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>
              {session ? (session.phase === 'ended' ? 'WHAT THE TABLE SAW' : 'AT THE TABLE') : 'TALK IT THROUGH'}
            </span>
          </div>
          {session && session.phase !== 'ended' && (
            <button type="button" onClick={leaveForNew} className="sym-btn ml-auto min-h-[44px] rounded-full border px-3 text-sm" style={{ borderColor: C.lineStrong }}>
              New conversation
            </button>
          )}
        </header>

        <div className="relative min-h-0 overflow-hidden">
          <SymposiumScene seats={seats} speaking={speaking} thinking={thinkingIndex} />
        </div>

        <section
          ref={panelRef}
          className="symposium-panel overflow-y-auto border-t"
          style={{ background: C.panel, borderColor: C.line, maxHeight: '50vh', paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-[18px] pt-4">
            {!session && (
              <div className="sym-enter flex flex-col gap-3">
                <Eyebrow>A SEAT IS WAITING FOR YOU</Eyebrow>
                <label htmlFor="sym-situation" style={{ fontFamily: F.display, fontSize: 24, lineHeight: 1.15 }}>
                  What’s on your mind?
                </label>
                <p style={{ fontFamily: F.read, fontSize: 15, color: C.muted }}>A decision, a worry or a question. Three philosophers will sit with you and talk it through.</p>
                <div className="relative">
                  <textarea
                    id="sym-situation"
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') begin()
                    }}
                    rows={4}
                    placeholder="Write freely…"
                    className="w-full resize-none rounded p-3.5 pr-12 outline-none"
                    style={{ background: C.raised, border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16, lineHeight: 1.55 }}
                  />
                  {stt.supported && <MicButton listening={stt.listening} onClick={() => toggleMic(setSituation)} label="Dictate what is on your mind" />}
                </div>
                {!situation.trim() && (
                  <div className="flex flex-wrap gap-2">
                    {PROMPTS.slice(0, 4).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSituation(p)}
                        className="sym-btn rounded-full border px-3 py-2 text-left"
                        style={{ borderColor: C.line, fontFamily: F.read, fontStyle: 'italic', fontSize: 14, color: C.body }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                {startError && <p style={{ fontFamily: F.read, color: C.ember }}>{startError}</p>}
                <PrimaryButton onClick={begin} disabled={!situation.trim() || starting}>
                  {starting ? 'The philosophers are taking their seats…' : 'Take your seat'}
                </PrimaryButton>
              </div>
            )}

            {session && session.phase !== 'ended' && (
              <>
                <Turn who="YOU" color={C.gilt} text={session.situation} />
                {ids.slice(0, revealedOpenings).map((id, i) => (
                  <Turn
                    key={`o-${id}`}
                    who={(philosopherById(id)?.name ?? id).toUpperCase()}
                    color={SEAT_COLORS[i]}
                    text={session.openings[id]}
                    onSpeak={tts.supported && preferences.voiceEnabled ? () => tts.speak(`o-${id}`, session.openings[id], id) : undefined}
                    speaking={tts.speakingId === `o-${id}`}
                  />
                ))}
                {session.rounds.map((r) => (
                  <div key={r.round} className="flex flex-col gap-3">
                    {r.userMessage && <Turn who="YOU" color={C.gilt} text={r.userMessage} />}
                    {r.turns.map((t, ti) => {
                      const i = ids.indexOf(t.philosopherId)
                      const key = `${r.round}-${ti}`
                      return (
                        <Turn
                          key={key}
                          who={(philosopherById(t.philosopherId)?.name ?? t.philosopherId).toUpperCase()}
                          color={SEAT_COLORS[i] ?? C.gilt}
                          text={t.text}
                          onSpeak={tts.supported && preferences.voiceEnabled ? () => tts.speak(key, t.spokenText || t.text, t.philosopherId) : undefined}
                          speaking={tts.speakingId === key}
                        />
                      )
                    })}
                  </div>
                ))}
                {thinkingId && <Waiting text={`${philosopherById(thinkingId)?.name ?? 'A philosopher'} is thinking…`} />}
                {session.phase === 'ending-loading' && <Waiting text="The table is gathering what it saw…" />}
                {session.error && <p style={{ fontFamily: F.read, color: C.ember }}>{session.error}</p>}

                {session.phase === 'awaiting-response' && revealedOpenings >= Math.min(3, ids.length) && (
                  <div className="sym-enter flex flex-col gap-2.5 pt-1">
                    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Who you are speaking to">
                      <Eyebrow>SPEAK TO</Eyebrow>
                      {[{ id: 'all', name: 'Everyone' }, ...seats].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={addressee === s.id}
                          onClick={() => setAddressee(s.id)}
                          className="sym-btn min-h-[36px] rounded-full border px-3 text-sm"
                          style={
                            addressee === s.id
                              ? { background: C.gilt, borderColor: C.gilt, color: C.night, fontWeight: 600 }
                              : { borderColor: C.line, color: C.body }
                          }
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <label htmlFor="sym-message" className="sr-only">
                        Your reply
                      </label>
                      <textarea
                        id="sym-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send()
                        }}
                        rows={3}
                        placeholder={addressee === 'all' ? 'Say something to the table…' : `Say something to ${seats.find((s) => s.id === addressee)?.name}…`}
                        className="w-full resize-none rounded p-3.5 pr-12 outline-none"
                        style={{ background: C.raised, border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16, lineHeight: 1.55 }}
                      />
                      {stt.supported && <MicButton listening={stt.listening} onClick={() => toggleMic(setMessage)} label="Dictate your reply" />}
                    </div>
                    <div className="flex gap-2.5">
                      <GhostButton onClick={close}>Close the symposium</GhostButton>
                      <PrimaryButton onClick={send} disabled={!message.trim()}>
                        Speak
                      </PrimaryButton>
                    </div>
                  </div>
                )}
              </>
            )}

            {session && session.phase === 'ended' && session.ending && (
              <div className="flex flex-col gap-3">
                <div className="sym-enter flex flex-col gap-1.5">
                  <Eyebrow>THE TENSION</Eyebrow>
                  <p style={{ fontFamily: F.display, fontSize: 21, lineHeight: 1.25 }}>{session.ending.tension}</p>
                </div>
                <Detail label="WHAT SEEMS TO MATTER TO YOU" text={session.ending.whatMatters} />
                <div className="sym-enter flex flex-col gap-2" style={{ animationDelay: '.2s' }}>
                  <Eyebrow>THREE WAYS TO SEE IT</Eyebrow>
                  {session.ending.perspectives.map((p) => {
                    const i = ids.indexOf(p.philosopherId)
                    return <Turn key={p.philosopherId} who={(philosopherById(p.philosopherId)?.name ?? p.philosopherId).toUpperCase()} color={SEAT_COLORS[i] ?? C.gilt} text={p.summary} />
                  })}
                </div>
                <Detail label="A QUESTION TO CARRY WITH YOU" text={session.ending.question} big />
                <div className="sym-enter flex flex-col gap-2.5" style={{ animationDelay: '.4s' }}>
                  <label htmlFor="sym-takeaway" style={{ fontFamily: F.display, fontSize: 18 }}>
                    What are you taking away?
                  </label>
                  <textarea
                    id="sym-takeaway"
                    value={takeaway}
                    onChange={(e) => setTakeaway(e.target.value)}
                    rows={3}
                    placeholder="One or two sentences, in your own words."
                    className="w-full resize-none rounded p-3.5 outline-none"
                    style={{ background: C.raised, border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16 }}
                  />
                  <PrimaryButton onClick={keep}>Keep this conversation</PrimaryButton>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  )
}

/* ---------------------------------- the scene --------------------------------- */

interface Seat {
  id: string
  name: string
  color: string
  robe: string
}

/** Seat positions around the table, in scene units (1200×760). */
const SEAT_POS = {
  3: [
    { x: 330, y: 560, lean: 6, k: 1 },
    { x: 600, y: 452, lean: 0, k: 0.82 },
    { x: 870, y: 560, lean: -6, k: 1 },
  ],
  2: [
    { x: 380, y: 560, lean: 6, k: 1 },
    { x: 820, y: 560, lean: -6, k: 1 },
  ],
  1: [{ x: 600, y: 452, lean: 0, k: 0.82 }],
} as const

function SymposiumScene({ seats, speaking, thinking }: { seats: Seat[]; speaking: number | null; thinking: number | null }) {
  const n = Math.max(1, Math.min(3, seats.length)) as 1 | 2 | 3
  // On a narrow screen the scene is cropped at the sides, so the whole
  // table is drawn smaller around its centre until every seat fits.
  const svgRef = useRef<SVGSVGElement>(null)
  const [fit, setFit] = useState(1)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const scale = Math.max(r.width / 1200, r.height / 760)
      const visible = r.width / scale
      setFit(Math.min(1, visible / 1020))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pos = SEAT_POS[n]
  const focus = speaking !== null && seats[speaking] ? pos[speaking] : null
  const back = seats.map((s, i) => ({ s, i, p: pos[i] })).filter((x) => x.p && x.p.k < 1)
  const front = seats.map((s, i) => ({ s, i, p: pos[i] })).filter((x) => x.p && x.p.k >= 1)

  return (
    <svg ref={svgRef} className="absolute inset-0 h-full w-full" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" role="img" aria-label={seats.length ? `A lamplit table. Seated: ${seats.map((s) => s.name).join(', ')}.${speaking !== null && seats[speaking] ? ` ${seats[speaking].name} is speaking.` : ''}` : 'An empty lamplit table, waiting for guests.'}>
      <style>{`
        .sym-flicker { animation: symFlicker 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes symFlicker { 0%,100% { opacity: .9; transform: scale(1) } 30% { opacity: 1; transform: scale(1.03) } 55% { opacity: .82; transform: scale(.98) } 80% { opacity: .96 } }
        .sym-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: symFlame .8s ease-in-out infinite; }
        @keyframes symFlame { 0%,100% { transform: scale(1,1) } 50% { transform: scale(.88,1.16) } }
        .sym-figure { transition: transform 1s cubic-bezier(.16,1,.3,1), opacity 1.2s ease; }
        .sym-light { transition: opacity 1s ease; }
        .sym-spot { transition: transform 1.2s cubic-bezier(.16,1,.3,1), opacity 1s ease; }
        .sym-star { animation: symTwinkle 3.6s ease-in-out infinite; }
        @keyframes symTwinkle { 0%,100% { opacity: .25 } 50% { opacity: .9 } }
        .sym-think { animation: symThink 1.4s ease-in-out infinite; }
        @keyframes symThink { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .sym-flicker, .sym-flame, .sym-star, .sym-think { animation: none } .sym-figure, .sym-spot { transition: none } }
      `}</style>
      <defs>
        <linearGradient id="symWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0b0f" />
          <stop offset="1" stopColor="#17110d" />
        </linearGradient>
        <linearGradient id="symSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070b" />
          <stop offset="1" stopColor="#1d2638" />
        </linearGradient>
        <radialGradient id="symLamp">
          <stop offset="0" stopColor="#FFC27A" stopOpacity=".75" />
          <stop offset=".35" stopColor="#F09A50" stopOpacity=".28" />
          <stop offset="1" stopColor="#F09A50" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="symSpot">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity=".45" />
          <stop offset="1" stopColor="#FFD9A0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="symColumn" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a241f" />
          <stop offset=".45" stopColor="#4a4038" />
          <stop offset="1" stopColor="#1d1915" />
        </linearGradient>
        <linearGradient id="symTable" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b4330" />
          <stop offset="1" stopColor="#2e2118" />
        </linearGradient>
      </defs>

      {/* the room: an open colonnade onto the night */}
      <rect x="-600" y="-200" width="2400" height="1160" fill="#0a0b0f" />
      <rect x="-600" y="470" width="2400" height="490" fill="#120e0b" />
      <g transform={`translate(600 470) scale(${fit}) translate(-600 -470)`}>
      <rect width="1200" height="760" fill="url(#symWall)" />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 130 + i * 230
        return (
          <g key={i}>
            <rect x={x + 30} y="90" width="170" height="320" fill="url(#symSky)" />
            {Array.from({ length: 6 }, (_, k) => (
              <circle key={k} className="sym-star" cx={x + 45 + ((k * 53 + i * 31) % 140)} cy={110 + ((k * 71 + i * 17) % 150)} r={0.8 + (k % 3) * 0.4} fill="#EDE6D6" style={{ animationDelay: `-${(k + i) * 0.7}s` }} />
            ))}
          </g>
        )
      })}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x={100 + i * 230} y="80" width="60" height="340" fill="url(#symColumn)" />
          <rect x={92 + i * 230} y="70" width="76" height="16" fill="#3a322b" />
        </g>
      ))}
      <rect x="0" y="40" width="1200" height="36" fill="#241e19" />
      <rect x="0" y="410" width="1200" height="350" fill="#120e0b" />
      <ellipse className="sym-flicker" cx="600" cy="470" rx="560" ry="300" fill="url(#symLamp)" />

      {/* light that follows whoever is speaking */}
      <g className="sym-spot" style={{ transform: focus ? `translate(${focus.x - 600}px, ${focus.y - 560}px)` : 'translate(0px, -60px)', opacity: focus ? 1 : 0 }}>
        <ellipse cx="600" cy="440" rx="190" ry="210" fill="url(#symSpot)" />
      </g>

      {back.map(({ s, i, p }) => (
        <Figure key={s.id} seat={s} x={p.x} y={p.y} k={p.k} lean={p.lean} speaking={speaking === i} dim={speaking !== null && speaking !== i} thinking={thinking === i} plate={Math.min(1.7, 1 / fit)} />
      ))}

      {/* the table, the lamp, cups and a scroll */}
      <ellipse cx="600" cy="612" rx="330" ry="40" fill="#0a0806" opacity=".6" />
      <path d="M270 560 L270 590 Q600 650 930 590 L930 560 Z" fill="#24190f" />
      <ellipse cx="600" cy="560" rx="330" ry="66" fill="url(#symTable)" />
      <ellipse cx="600" cy="556" rx="318" ry="58" fill="none" stroke="#7a5c40" strokeOpacity=".5" />
      {[[430, 560], [770, 560], [600, 520]].slice(0, Math.max(2, n)).map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="0" rx="18" ry="5" fill="#2b1d12" />
          <path d="M-16 -8 Q0 6 16 -8 Z" fill="#8a4a2a" />
          <ellipse cx="0" cy="-8" rx="16" ry="4" fill="#a35a33" />
        </g>
      ))}
      <rect x="660" y="572" width="70" height="10" rx="5" fill="#d9c9a6" transform="rotate(-8 695 577)" opacity=".85" />
      <g transform="translate(600 548)">
        <ellipse cx="0" cy="6" rx="34" ry="8" fill="#3a2a1a" />
        <path d="M-30 0 Q0 22 30 0 Q24 -10 0 -10 Q-24 -10 -30 0 Z" fill="#8a6a3c" />
        <path d="M28 -2 Q46 -8 44 -16" stroke="#8a6a3c" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="0" cy="-34" r="40" fill="url(#symSpot)" className="sym-flicker" />
        <path className="sym-flame" d="M0 -10 C -8 -20, -4 -34, 0 -44 C 4 -34, 8 -20, 0 -10 Z" fill="#FFB066" />
        <path className="sym-flame" d="M0 -12 C -4 -19, -2 -26, 0 -32 C 2 -26, 4 -19, 0 -12 Z" fill="#FFF0C8" style={{ animationDelay: '-.3s' }} />
      </g>

      {front.map(({ s, i, p }) => (
        <Figure key={s.id} seat={s} x={p.x} y={p.y} k={p.k} lean={p.lean} speaking={speaking === i} dim={speaking !== null && speaking !== i} thinking={thinking === i} plate={Math.min(1.7, 1 / fit)} />
      ))}
      </g>
    </svg>
  )
}

/** A seated, draped figure. Whoever speaks leans in and catches the light. */
function Figure({ seat, x, y, k, lean, speaking, dim, thinking, plate = 1 }: { seat: Seat; x: number; y: number; k: number; lean: number; speaking: boolean; dim: boolean; thinking: boolean; plate?: number }) {
  const tilt = speaking ? lean : 0
  const scale = speaking ? k * 1.04 : k
  return (
    <g className="sym-figure" style={{ transform: `translate(${x}px, ${y}px) rotate(${tilt}deg) scale(${scale})`, opacity: dim ? 0.62 : 1 }}>
      {/* stool */}
      <rect x="-74" y="-18" width="148" height="34" rx="6" fill="#1b140f" />
      {/* robe */}
      <path d="M-64 0 C -70 -64, -52 -124, -30 -144 L 30 -144 C 52 -124, 70 -64, 64 0 Z" fill={seat.robe} />
      <path d="M-30 -144 C 4 -104, 24 -60, 62 -8" stroke="#000" strokeOpacity=".28" strokeWidth="10" fill="none" />
      <path d="M-50 -70 C -30 -60, -10 -40, -4 0" stroke="#000" strokeOpacity=".18" strokeWidth="6" fill="none" />
      {/* head */}
      <rect x="-9" y="-158" width="18" height="18" fill="#3b2b21" />
      <circle cx="0" cy="-176" r="27" fill="#3b2b21" />
      <path d="M-24 -170 Q0 -138 24 -170 Q20 -146 0 -142 Q-20 -146 -24 -170 Z" fill="#2a1f19" opacity=".9" />
      {/* lamplight on the figure */}
      <g className="sym-light" style={{ opacity: speaking ? 0.55 : 0.14 }}>
        <path d="M-64 0 C -70 -64, -52 -124, -30 -144 L 30 -144 C 52 -124, 70 -64, 64 0 Z" fill="#FFB066" style={{ mixBlendMode: 'soft-light' }} />
        <circle cx="0" cy="-176" r="27" fill="#FFC27A" style={{ mixBlendMode: 'soft-light' }} />
      </g>
      {/* name plate */}
      <g transform={`translate(0 ${-236 - (plate - 1) * 20}) scale(${plate})`}>
        <rect x={-(seat.name.length * 7 + 24)} y="-18" width={seat.name.length * 14 + 48} height="30" rx="3" fill="rgba(11,13,17,.82)" stroke={seat.color} strokeOpacity={speaking ? 0.9 : 0.4} />
        <text x="0" y="3" textAnchor="middle" fill="#EDE6D6" style={{ fontFamily: "'Gloock', Georgia, serif", fontSize: 18 }}>
          {seat.name}
        </text>
        {thinking && <circle className="sym-think" cx={seat.name.length * 7 + 14} cy="-3" r="4" fill={seat.color} />}
      </g>
    </g>
  )
}

/* ---------------------------------- pieces ---------------------------------- */

function Eyebrow({ children, color = C.gilt }: { children: ReactNode; color?: string }) {
  return <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color }}>{children}</span>
}

function Waiting({ text }: { text: string }) {
  return (
    <p className="sym-enter flex items-center gap-3" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 15, color: C.muted }}>
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: C.gilt }} />
      {text}
    </p>
  )
}

function Turn({ who, color, text, onSpeak, speaking }: { who: string; color: string; text: string; onSpeak?: () => void; speaking?: boolean }) {
  return (
    <article className="sym-enter flex flex-col gap-1.5 rounded p-3.5" style={{ background: C.raised, borderLeft: `2px solid ${color}` }}>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow color={color}>{who}</Eyebrow>
        {onSpeak && (
          <button type="button" onClick={onSpeak} aria-label={speaking ? 'Stop' : `Hear ${who.toLowerCase()}`} className="sym-btn -m-2 flex h-10 w-10 items-center justify-center rounded-full" style={{ color: C.muted }}>
            {speaking ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <p style={{ fontFamily: F.read, fontSize: 15.5, lineHeight: 1.6, color: C.ivory, whiteSpace: 'pre-wrap' }}>{text}</p>
    </article>
  )
}

function Detail({ label, text, big }: { label: string; text: string; big?: boolean }) {
  return (
    <div className="sym-enter rounded p-3.5" style={{ background: C.raised }}>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1" style={{ fontFamily: big ? F.display : F.read, fontSize: big ? 19 : 15, lineHeight: big ? 1.3 : 1.55, color: C.ivory }}>
        {text}
      </p>
    </div>
  )
}

function MicButton({ listening, onClick, label }: { listening: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? 'Stop dictating' : label}
      className="sym-btn absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full"
      style={listening ? { background: C.ember, color: C.night } : { color: C.muted }}
    >
      <Mic className="h-4 w-4" />
    </button>
  )
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="sym-btn min-h-[50px] w-full flex-1 rounded px-3 transition-colors disabled:opacity-40"
      style={{ background: C.gilt, color: C.night, fontFamily: F.ui, fontWeight: 600, fontSize: 16 }}
    >
      {children}
    </button>
  )
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="sym-btn min-h-[50px] w-full flex-1 rounded border px-3" style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontFamily: F.ui, fontWeight: 500, fontSize: 15 }}>
      {children}
    </button>
  )
}

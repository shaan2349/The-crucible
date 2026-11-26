import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
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

// The 3D table loads with the Symposium itself, keeping the rest of the app light.
const Symposium3D = lazy(() => import('../symposium/Symposium3D'))

/**
 * The Symposium: the calm counterpart to the Temple. Philosophers sit
 * around a lamplit table and talk a real situation through with you;
 * seated as marble statues; whoever is speaking is lit and turns to you. No winning or losing.
 */

const SEAT_COLORS = [C.ember, C.iris, C.sage]

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
  const location = useLocation()
  // Arriving from the Hall of Minds: a chosen thinker is saved a seat, or
  // sits with you alone.
  const seatRequest = (location.state as { withIds?: string[]; only?: boolean; prefill?: string } | null) ?? null
  const chosen = (seatRequest?.withIds ?? []).map((id) => philosopherById(id)?.name).filter(Boolean) as string[]
  const { session, setSession } = useReflectContext()
  const { preferences } = usePreferencesContext()
  const tts = useTextToSpeech()
  const stt = useSpeechToText()
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [situation, setSituation] = useState(() => seatRequest?.prefill ?? '')
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

  // Arriving from the Hall with a chosen thinker starts a fresh table. An
  // unfinished conversation already in progress is kept as a lamp first.
  const seatHandled = useRef(false)
  useEffect(() => {
    if (seatHandled.current || !seatRequest?.withIds?.length || !session) return
    seatHandled.current = true
    const same = seatRequest.withIds.every((id) => session.philosopherIds.includes(id)) && (!seatRequest.only || session.philosopherIds.length === 1)
    if (same) return
    if (session.rounds.length > 0) saveReflectSessions([...loadReflectSessions(), session])
    setSession(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      const result = await api.beginReflection(text, { language: preferences.language, depth: preferences.depth }, seatRequest?.withIds?.length ? { withIds: seatRequest.withIds, only: !!seatRequest.only } : undefined)
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
    navigate('/app/landscape')
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

  const seats = ids.map((id, i) => ({ id, name: philosopherById(id)?.name ?? id, color: SEAT_COLORS[i] }))
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
          <Suspense fallback={<div className="absolute inset-0" style={{ background: C.night }} />}>
            <Symposium3D seats={seats} speaking={speaking} thinking={thinkingIndex} />
          </Suspense>
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
                <Eyebrow>{seatRequest?.only && chosen.length ? `A CONVERSATION WITH ${chosen[0].toUpperCase()}` : 'A SEAT IS WAITING FOR YOU'}</Eyebrow>
                <label htmlFor="sym-situation" style={{ fontFamily: F.display, fontSize: 24, lineHeight: 1.15 }}>
                  {seatRequest?.only && chosen.length ? `What would you like to ask ${chosen[0]}?` : 'What’s on your mind?'}
                </label>
                <p style={{ fontFamily: F.read, fontSize: 15, color: C.muted }}>
                  {seatRequest?.only && chosen.length
                    ? `A question, a decision or something you have been turning over. ${chosen[0]} will answer in their own way.`
                    : chosen.length
                      ? `A decision, a worry or a question. ${chosen.join(' and ')} will be at the table, with others who see it differently.`
                      : 'A decision, a worry or a question. Three philosophers will sit with you and talk it through.'}
                </p>
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
                    {ids.length > 1 && <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Who you are speaking to">
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
                    </div>}
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
                        placeholder={ids.length === 1 ? `Say something to ${seats[0]?.name}…` : addressee === 'all' ? 'Say something to the table…' : `Say something to ${seats.find((s) => s.id === addressee)?.name}…`}
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

import { useEffect, useRef, useState, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Mic, Volume2, Square } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { PortraitFrame } from '../components/PortraitFrame'
import { PhilosopherAvatar } from '../components/PhilosopherAvatar'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { PHILOSOPHER_TAGS, SIDE_ACCENT, philosopherById } from '../data/philosophers'
import { loadReflectDraft, saveReflectDraft, clearReflectDraft, loadReflectSessions, saveReflectSessions } from '../lib/storage'
import { useReflectContext } from '../context/ReflectContext'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { preloadPortrait } from '../hooks/usePortrait'
import * as api from '../lib/api'
import type { ReflectRound, ReflectSession, ReflectTurn } from '../types'

// Reflect is life-guidance, not argument-testing — the language stays
// open and exploratory, never "defend" or "claim" (see Debate.tsx, which
// deliberately uses that combative vocabulary instead).
const HERO_QUESTIONS = [
  "What's on your mind?",
  'What decision are you sitting with?',
  "What's been on your mind lately?",
  'What are you trying to work out?',
]

const REFLECT_PROMPTS = [
  'A decision I keep putting off is…',
  "I said yes to something I didn't want to do.",
  "I'm not sure if I'm making the right choice.",
  'A friendship feels one-sided lately.',
  "I don't know what I actually want here.",
  'Something keeps bothering me and I can\'t name why.',
]

function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000)
}

function weekOfYear(d = new Date()): number {
  return Math.floor(dayOfYear(d) / 7)
}

function heroQuestion(): string {
  return HERO_QUESTIONS[weekOfYear() % HERO_QUESTIONS.length]
}

function dailyPrompts(): string[] {
  const offset = dayOfYear() % REFLECT_PROMPTS.length
  const rotated = REFLECT_PROMPTS.map((_, i) => REFLECT_PROMPTS[(offset + i) % REFLECT_PROMPTS.length])
  return rotated.slice(0, 4)
}

// Same preload size CouncilView's cast reveal actually renders at, kept
// as its own constant here since Reflect's transition doesn't share a
// backdrop component with Debate's (see the module doc comment above
// DebateBackdrop for why Debate/Council needed one — Reflect never shows
// a two-person split backdrop, so it doesn't need that machinery at all).
const CAST_PORTRAIT_SIZE = 400

export function Reflect() {
  const { session, setSession } = useReflectContext()
  const navigate = useNavigate()

  const [situation, setSituation] = useState('')
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [assembled, setAssembled] = useState<string[] | null>(null)
  const [enterError, setEnterError] = useState<string | null>(null)
  const [submittedSituation, setSubmittedSituation] = useState('')
  const stt = useSpeechToText()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 180)}px`
  }, [situation])

  function toggleMic() {
    if (stt.listening) {
      stt.stop()
      return
    }
    stt.start((text) => setSituation((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)))
  }

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      enter()
    }
  }

  useEffect(() => {
    setSavedDraft(loadReflectDraft())
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (situation.trim()) saveReflectDraft(situation)
      else clearReflectDraft()
    }, 600)
    return () => clearTimeout(t)
  }, [situation])

  async function enter() {
    if (submitting) return
    const trimmed = situation.trim()
    if (!trimmed) return
    setSubmitting(true)
    setEntering(true)
    setEnterError(null)
    setAssembled(null)
    setSubmittedSituation(trimmed)
    clearReflectDraft()
    try {
      const minWait = new Promise<void>((resolve) => setTimeout(resolve, 650))
      const [result] = await Promise.all([api.beginReflection(trimmed), minWait])
      await Promise.all(result.philosopherIds.map((id) => preloadPortrait(id, CAST_PORTRAIT_SIZE)))
      setAssembled(result.philosopherIds)
      await new Promise<void>((resolve) => setTimeout(resolve, 450))
      const openings: Record<string, string> = Object.fromEntries(
        result.openings.map((o) => [o.philosopherId, o.take]),
      )
      const next: ReflectSession = {
        id: Date.now(),
        situation: trimmed,
        philosopherIds: result.philosopherIds,
        openings,
        rounds: [],
        phase: 'awaiting-response',
        ending: null,
        error: null,
      }
      setSession(next)
    } catch (e) {
      setSubmitting(false)
      setAssembled(null)
      setEnterError((e as Error)?.message || 'Something went wrong gathering perspectives.')
    }
  }

  const trimmedLength = situation.trim().length
  const presence = Math.min(trimmedLength / 80, 1)
  const prompts = dailyPrompts()
  const promptsHidden = trimmedLength > 60
  const promptsOpacity = trimmedLength === 0 ? 1 : Math.max(0.4, 1 - presence * 0.62)

  function resumeDraft() {
    if (savedDraft) setSituation(savedDraft)
    setSavedDraft(null)
  }

  if (session) {
    return (
      <>
        <RotatingBackdrop screen="reflect" />
        <ReflectView
          session={session}
          setSession={setSession}
          onExit={() => {
            setSession(null)
            navigate('/app/reflect')
          }}
        />
      </>
    )
  }

  return (
    <>
      <RotatingBackdrop screen="reflect" />
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-700"
        style={{ background: '#14100a', opacity: entering ? 0.3 : 0 }}
      />
      <div className="reading-container relative z-[1] px-6 pb-16 pt-14 sm:pt-20">
        <p
          className="mb-4 font-display text-xs uppercase tracking-[0.15em] text-parchment-500"
          style={{ animation: 'revealUp 0.4s ease both' }}
        >
          Reflect
        </p>

        <div className="relative mb-12">
          <h1
            className="relative font-display text-[34px] font-medium leading-[1.15] tracking-[-0.02em] text-parchment-900 sm:text-[40px]"
            style={{ animation: 'revealUp 0.5s ease 80ms both' }}
          >
            {heroQuestion()}
          </h1>
          <p
            className="mt-3 text-sm text-parchment-500"
            style={{ animation: 'revealUp 0.5s ease 120ms both' }}
          >
            Bring a decision, worry or question. No side to pick, nothing to defend.
          </p>
        </div>

        <div className="relative">
          <div
            className="transition-all duration-500 ease-out"
            style={{
              opacity: entering ? 0 : 1,
              transform: entering ? 'scale(0.98)' : 'scale(1)',
              pointerEvents: entering ? 'none' : 'auto',
            }}
          >
            <div
              className="overflow-hidden rounded-3xl border border-parchment-300/60 bg-parchment-50 transition-shadow duration-200 focus-within:border-forge-ember/50"
              style={{ animation: 'revealUp 0.5s ease 160ms both', boxShadow: 'var(--shadow-card)' }}
            >
              <textarea
                ref={textareaRef}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Write freely…"
                autoFocus
                aria-label="What's on your mind"
                className="block w-full resize-none overflow-hidden bg-transparent px-6 pb-3 pt-6 text-base text-parchment-900 outline-none placeholder:text-parchment-400 sm:px-7 sm:pt-7 sm:text-lg"
                style={{ minHeight: '180px' }}
              />

              <div className="flex items-center justify-between gap-3 border-t border-parchment-200/70 px-4 py-3 sm:px-5">
                <div className="flex min-h-11 items-center gap-2.5">
                  {stt.supported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      aria-label={stt.listening ? 'Stop dictating' : 'Dictate what\'s on your mind'}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
                      style={
                        stt.listening
                          ? { background: 'var(--color-forge-ember)', color: 'var(--color-parchment-50)' }
                          : { color: 'var(--color-parchment-500)' }
                      }
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  )}
                  {stt.listening ? (
                    <span className="flex items-center gap-1.5 text-xs italic text-parchment-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: 'var(--color-forge-ember)' }} />
                      Listening…
                    </span>
                  ) : (
                    stt.error && <span className="text-xs text-status-warning">{stt.error}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={enter}
                  disabled={!situation.trim() || submitting}
                  aria-label="Bring this to the Council"
                  className="group flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-parchment-50 transition-all duration-200 hover:brightness-110 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(155deg, #e8a33d, #c2531d)',
                    boxShadow: 'var(--shadow-embossed), inset 0 1px 0 rgba(255,255,255,0.25)',
                  }}
                >
                  <span className="hidden font-display text-sm font-medium sm:inline">Bring this to the Council</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {!promptsHidden && (
              <div
                className="mt-10 transition-opacity duration-500"
                style={{ animation: 'revealUp 0.5s ease 240ms both', opacity: promptsOpacity }}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-parchment-500">
                  Need a place to begin?
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {prompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSituation(p)}
                      className="rounded-full border border-parchment-300/70 px-4 py-2.5 text-sm text-parchment-600 transition-colors hover:border-forge-ember hover:text-forge-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-ember/50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {savedDraft && !situation.trim() && (
              <button
                type="button"
                onClick={resumeDraft}
                className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left"
                style={{ boxShadow: 'var(--shadow-card)', animation: 'revealUp 0.5s ease 320ms both' }}
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-parchment-500">
                    Continue where you left off
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-parchment-800">{savedDraft}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-forge-ember">Resume</span>
              </button>
            )}
          </div>

          {entering && (
            <div
              className="absolute inset-0 flex flex-col items-center gap-6 px-6 pt-2 text-center"
              style={{ animation: 'revealUp 0.35s ease 150ms both' }}
            >
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">What's on your mind</p>
                <p className="font-display text-lg italic leading-snug text-parchment-900">&ldquo;{submittedSituation}&rdquo;</p>
              </div>

              {enterError ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="font-display text-base text-parchment-700">Couldn't reach the Council.</p>
                  <p className="text-xs text-parchment-500">{enterError}</p>
                  <div className="mt-1 flex gap-2">
                    <Button onClick={enter}>Retry</Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEntering(false)
                        setEnterError(null)
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ) : assembled ? (
                <div className="flex flex-col items-center gap-4" style={{ animation: 'revealUp 0.4s ease both' }}>
                  <div className="flex gap-6 sm:gap-8">
                    {assembled.map((id) => {
                      const p = philosopherById(id)
                      if (!p) return null
                      return (
                        <div key={id} className="w-20 text-center sm:w-24">
                          <PortraitFrame id={id} size={CAST_PORTRAIT_SIZE} className="w-full" />
                          <p className="mt-2 font-display text-sm font-medium text-parchment-900">{p.name}</p>
                          {PHILOSOPHER_TAGS[id] && (
                            <p className="mt-0.5 text-[11px] leading-tight text-parchment-500">{PHILOSOPHER_TAGS[id]}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="font-display text-sm italic text-parchment-600">
                    Different ways of seeing the same thing.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span
                      className="absolute h-5 w-5 animate-[emberRing_1.3s_ease-out_infinite] rounded-full"
                      style={{ background: '#e8a33d' }}
                    />
                    <span
                      className="absolute h-2 w-2 rounded-full"
                      style={{ background: '#c2531d', boxShadow: '0 0 8px 3px rgba(194,83,29,0.6)' }}
                    />
                  </span>
                  <p className="font-display text-base italic text-parchment-600">Gathering perspectives…</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* --------------------------------- ReflectView --------------------------------- */

const REFLECT_THINKING_VERBS = ['is turning that over', 'is considering what you said', 'is sitting with that for a moment']

function thinkingLabel(id: string | null): string {
  if (!id) return 'The Council is thinking…'
  const p = philosopherById(id)
  if (!p) return 'Thinking…'
  return `${p.name} ${REFLECT_THINKING_VERBS[id.length % REFLECT_THINKING_VERBS.length]}…`
}

function ReflectView({
  session,
  setSession,
  onExit,
}: {
  session: ReflectSession
  setSession: Dispatch<SetStateAction<ReflectSession | null>>
  onExit: () => void
}) {
  const [message, setMessage] = useState('')
  const [thinkingId, setThinkingId] = useState<string | null>(null)
  const [reflectionText, setReflectionText] = useState('')
  const navigate = useNavigate()
  const tts = useTextToSpeech()
  const stt = useSpeechToText()
  const [micField, setMicField] = useState<'message' | 'reflection' | null>(null)

  function toggleMic(field: 'message' | 'reflection', append: (text: string) => void) {
    if (stt.listening && micField === field) {
      stt.stop()
      setMicField(null)
      return
    }
    setMicField(field)
    stt.start((text) => append(text))
  }

  useEffect(() => {
    if (!stt.listening) setMicField(null)
  }, [stt.listening])

  function updateSession(fn: (s: ReflectSession) => ReflectSession) {
    setSession((prev) => (prev ? fn(prev) : prev))
  }

  useEffect(() => {
    if (session.phase === 'ending-loading') runEnding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase])

  function roundsForApi() {
    return session.rounds.map((r) => ({
      round: r.round,
      turns: r.turns.map((t) => ({ philosopherId: t.philosopherId, text: t.text })),
      userMessage: r.userMessage,
    }))
  }

  async function runEnding() {
    try {
      const result = await api.endReflection({
        situation: session.situation,
        openings: session.openings,
        rounds: roundsForApi(),
      })
      updateSession((s) => ({
        ...s,
        ending: {
          tension: result.tension,
          whatMatters: result.whatMatters,
          perspectives: result.perspectives,
          question: result.question,
        },
        phase: 'ended',
      }))
    } catch (e) {
      updateSession((s) => ({
        ...s,
        phase: 'awaiting-response',
        error: (e as Error)?.message || 'Something went wrong reaching the Council.',
      }))
    }
  }

  async function sendMessage() {
    const trimmed = message.trim()
    if (!trimmed || session.phase === 'responding') return
    setMessage('')
    updateSession((s) => ({ ...s, phase: 'responding', error: null }))
    try {
      const priorRounds = roundsForApi()
      const turns: ReflectTurn[] = []
      for (const philosopherId of session.philosopherIds) {
        setThinkingId(philosopherId)
        const result = await api.respondReflection({
          situation: session.situation,
          openings: session.openings,
          rounds: priorRounds,
          philosopherId,
          userMessage: trimmed,
        })
        turns.push({ philosopherId, text: result.text, spokenText: result.spokenText })
      }
      setThinkingId(null)
      const round: ReflectRound = { round: session.rounds.length + 1, turns, userMessage: trimmed }
      updateSession((s) => ({ ...s, rounds: [...s.rounds, round], phase: 'awaiting-response' }))
    } catch (e) {
      setThinkingId(null)
      setMessage(trimmed)
      updateSession((s) => ({
        ...s,
        phase: 'awaiting-response',
        error: (e as Error)?.message || 'Something went wrong reaching the Council.',
      }))
    }
  }

  function closeReflection() {
    updateSession((s) => ({ ...s, phase: 'ending-loading', error: null }))
  }

  function keepTalking() {
    updateSession((s) => ({ ...s, phase: 'awaiting-response' }))
  }

  function saveAndFinish() {
    const history = loadReflectSessions()
    const toSave: ReflectSession = reflectionText.trim() ? { ...session, userReflection: reflectionText.trim() } : session
    saveReflectSessions([...history, toSave])
    onExit()
    navigate('/app/mythinking')
  }

  function dismissError() {
    updateSession((s) => ({ ...s, error: null }))
  }

  function handleMessageKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="reading-container relative z-[1] px-6 pb-10 pt-8">
      <button type="button" onClick={onExit} className="mb-4 text-xs text-parchment-500 hover:text-forge-ember">
        ← New situation
      </button>

      <p className="text-sm italic text-parchment-700">"{session.situation}"</p>

      {/* Opening takes render vertically, not as a cast row — each one
          carries a full-sentence angle on the situation, not just a name,
          so they read as short passages rather than portrait chips. */}
      <div className="mt-6 space-y-5">
        {session.philosopherIds.map((id, i) => {
          const p = philosopherById(id)
          if (!p) return null
          const accent = SIDE_ACCENT[i % SIDE_ACCENT.length]
          return (
            <div
              key={id}
              className="flex gap-3.5 border-l-2 py-0.5 pl-3.5"
              style={{ borderLeftColor: accent, animation: 'revealUp 0.5s ease both', animationDelay: `${i * 90}ms` }}
            >
              <div className="shrink-0 overflow-hidden rounded-full" style={{ boxShadow: 'var(--shadow-embossed)' }}>
                <PhilosopherAvatar id={id} name={p.name} size={44} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
                  {p.name}
                  {PHILOSOPHER_TAGS[id] && (
                    <span className="ml-1.5 font-normal normal-case text-parchment-500">· {PHILOSOPHER_TAGS[id]}</span>
                  )}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-parchment-800">{session.openings[id]}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 space-y-8">
        {session.rounds.map((r, ri) => (
          <div key={ri} className="space-y-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #c2531d40)' }} />
              <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #c2531d40, transparent)' }} />
            </div>
            {r.userMessage && (
              <div className="flex gap-3 border-l-2 border-l-forge-gold py-0.5 pl-3.5" style={{ animation: 'revealUp 0.45s ease both' }}>
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forge-gold font-display text-xs font-bold text-parchment-50"
                  style={{ boxShadow: 'var(--shadow-embossed)' }}
                >
                  You
                </span>
                <div>
                  <p className="mb-1 font-display text-xs font-semibold uppercase tracking-wide" style={{ color: SIDE_ACCENT[0] }}>
                    You
                  </p>
                  <p className="text-[15px] leading-relaxed text-parchment-800">{r.userMessage}</p>
                </div>
              </div>
            )}
            {r.turns.map((t, ti) => {
              const sideIdx = session.philosopherIds.indexOf(t.philosopherId)
              const accent = SIDE_ACCENT[sideIdx % SIDE_ACCENT.length] ?? SIDE_ACCENT[0]
              const ph = philosopherById(t.philosopherId)
              if (!ph) return null
              const delay = (ti + 1) * 90
              const speechId = `${ri}-${ti}`
              const isSpeaking = tts.speakingId === speechId
              return (
                <div
                  key={ti}
                  className="flex gap-3 border-l-2 py-0.5 pl-3.5"
                  style={{ borderLeftColor: accent, animation: 'revealUp 0.45s ease both', animationDelay: `${delay}ms` }}
                >
                  <div className="shrink-0 overflow-hidden rounded-full" style={{ boxShadow: 'var(--shadow-embossed)' }}>
                    <PhilosopherAvatar id={t.philosopherId} name={ph.name} size={36} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="font-display text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
                        {ph.name}
                      </p>
                      {tts.supported && (
                        <button
                          type="button"
                          onClick={() => tts.speak(speechId, t.spokenText || t.text, t.philosopherId)}
                          aria-label={isSpeaking ? `Stop reading ${ph.name}'s response` : `Hear ${ph.name}'s response — generated voice`}
                          className="-m-2.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-2.5 text-parchment-400 transition-colors hover:text-forge-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
                        >
                          {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="text-[15px] leading-relaxed text-parchment-800">{t.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {session.error && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">Something went wrong reaching the Council: {session.error}</p>
          <button type="button" onClick={dismissError} className="shrink-0 text-xs font-medium text-rose-700 underline">
            Dismiss
          </button>
        </div>
      )}

      {session.phase === 'responding' && <Loader label={thinkingLabel(thinkingId)} />}
      {session.phase === 'ending-loading' && <Loader label="Gathering what the Council sees…" />}

      {(session.phase === 'awaiting-response' || session.phase === 'responding') && (
        <div className="mt-6">
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleMessageKeyDown}
              placeholder="Say more, ask a follow-up, or just react…"
              rows={4}
              disabled={session.phase === 'responding'}
              className="w-full resize-none rounded-2xl border border-parchment-300 bg-parchment-50 p-3.5 pr-12 text-sm text-parchment-900 outline-none placeholder:text-parchment-400 focus:border-forge-ember disabled:opacity-60"
            />
            {stt.supported && (
              <button
                type="button"
                onClick={() => toggleMic('message', (text) => setMessage((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)))}
                aria-label={micField === 'message' && stt.listening ? 'Stop dictating' : 'Dictate your message'}
                disabled={session.phase === 'responding'}
                className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-40"
                style={
                  micField === 'message' && stt.listening
                    ? { background: 'var(--color-forge-ember)', color: 'var(--color-parchment-50)' }
                    : { color: 'var(--color-parchment-400)' }
                }
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={sendMessage} disabled={!message.trim() || session.phase === 'responding'}>
              Continue the conversation
            </Button>
            <Button variant="ghost" onClick={closeReflection} disabled={session.phase === 'responding'}>
              See what the Council sees
            </Button>
          </div>
        </div>
      )}

      {session.phase === 'ended' && session.ending && (
        <div className="mt-8" style={{ animation: 'revealUp 0.5s ease both' }}>
          <div className="mb-5 flex items-center gap-2">
            <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #c2531d55)' }} />
            <p className="font-display text-sm uppercase tracking-wide text-forge-ember">What the Council sees</p>
            <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #c2531d55, transparent)' }} />
          </div>
          <p className="text-[15px] leading-relaxed text-parchment-800">{session.ending.tension}</p>

          <p className="mb-1 mt-6 font-display text-xs font-semibold uppercase tracking-[0.15em] text-parchment-500">
            What seems to matter to you
          </p>
          <p className="text-[15px] leading-relaxed text-parchment-800">{session.ending.whatMatters}</p>

          <p className="mb-3 mt-6 font-display text-xs font-semibold uppercase tracking-[0.15em] text-parchment-500">
            {session.ending.perspectives.length === 3 ? 'Three ways to see it' : 'Ways to see it'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {session.ending.perspectives.map((persp) => {
              const p = philosopherById(persp.philosopherId)
              return (
                <Card key={persp.philosopherId} className="p-4">
                  <p className="mb-1 font-display text-[13px] italic text-forge-ember">{p?.name ?? persp.philosopherId}</p>
                  <p className="text-sm leading-relaxed text-parchment-800">{persp.summary}</p>
                </Card>
              )
            })}
          </div>

          <Card variant="hero" className="mt-3 p-5">
            <p className="mb-2 font-display text-sm font-medium uppercase tracking-wide text-forge-ember">
              A question to carry with you
            </p>
            <p className="font-display text-xl leading-snug text-parchment-900">{session.ending.question}</p>
          </Card>

          <div className="mt-8 border-t border-parchment-300 pt-6">
            <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">Your own thought</p>
            <p className="mb-3 font-display text-lg leading-snug text-parchment-900">
              Anything you want to remember about this, in your own words?
            </p>
            <div className="relative">
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Optional — nobody else will read this."
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
                  aria-label={micField === 'reflection' && stt.listening ? 'Stop dictating' : 'Dictate your thought'}
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

          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="py-3" onClick={saveAndFinish}>
              Save to My Thinking
            </Button>
            <Button variant="ghost" onClick={keepTalking}>
              Keep talking instead
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

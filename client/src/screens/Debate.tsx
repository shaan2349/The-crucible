import { Suspense, lazy, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Mic } from 'lucide-react'
import { NIGHT, NIGHT_FONT } from '../night/theme'
import { NightSky } from '../night/NightSky'
// The 3D temple (and the 3D library behind it) loads only when a debate
// starts, so the rest of the app stays quick to open.
const TempleDebate = lazy(() => import('./TempleDebate').then((m) => ({ default: m.TempleDebate })))
import { PHILOSOPHER_TAGS, SUGGESTED_TOPICS, philosopherById } from '../data/philosophers'
import { loadDebateDraft, saveDebateDraft, clearDebateDraft, loadInterests } from '../lib/storage'
import { useDebateContext } from '../context/DebateContext'
import { useSpeechToText } from '../hooks/useSpeechToText'
import * as api from '../lib/api'
import type { Debate as DebateState } from '../types'

// Debate is specifically for claims/beliefs under pressure — distinct
// from Reflect's life-guidance framing (see Reflect.tsx) — so the
// headline leans on "believe"/"claim"/"defend" rather than the more
// open "what's on your mind" language Reflect now uses.
const HERO_QUESTIONS = [
  'What do you believe?',
  'What claim would you defend?',
  'What belief deserves to be tested?',
  'What are you certain about — and why?',
  'What would you argue, if pressed?',
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

/** Rotates daily, but topics matching an onboarding interest sort first —
 * the interest picker actually does something rather than sitting unused. */
function dailySuggestions(): typeof SUGGESTED_TOPICS {
  const offset = dayOfYear() % SUGGESTED_TOPICS.length
  const rotated = SUGGESTED_TOPICS.map((_, i) => SUGGESTED_TOPICS[(offset + i) % SUGGESTED_TOPICS.length])
  const interests = loadInterests()
  const ranked = interests.length
    ? [...rotated].sort((a, b) => Number(interests.includes(b.domain)) - Number(interests.includes(a.domain)))
    : rotated
  return ranked.slice(0, 4)
}

export function Debate() {
  const { debate, setDebate } = useDebateContext()
  const location = useLocation()
  const navigate = useNavigate()

  const [claim, setClaim] = useState('')
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [assembled, setAssembled] = useState<string[] | null>(null)
  const [enterError, setEnterError] = useState<string | null>(null)
  // Captured the moment the user submits, separate from `claim` — the
  // composer itself fades out during the transition, but the question
  // that was actually asked stays visible in the overlay throughout, so
  // it never looks like it vanished.
  const [submittedClaim, setSubmittedClaim] = useState('')
  const stt = useSpeechToText()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow with the content instead of scrolling internally — reset to
  // measure the natural content height, then clamp to the 180px floor.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 180)}px`
  }, [claim])

  function toggleMic() {
    if (stt.listening) {
      stt.stop()
      return
    }
    stt.start((text) => setClaim((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)))
  }

  // Enter alone stays a plain newline (this is a multi-line composer, not a
  // single-line input) — only Cmd/Ctrl+Enter submits, so nobody sends a
  // half-finished thought by hitting Enter out of habit.
  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      enter()
    }
  }

  useEffect(() => {
    setSavedDraft(loadDebateDraft())
  }, [])

  // A philosopher's "Try a conversation" question arrives via router state
  // (e.g. from the Library) rather than a query param, so it's gone once
  // consumed instead of lingering in the URL on refresh/back.
  useEffect(() => {
    const prefill = (location.state as { prefill?: string } | null)?.prefill
    if (prefill) setClaim(prefill)
  }, [location.state])

  useEffect(() => {
    const t = setTimeout(() => {
      if (claim.trim()) saveDebateDraft(claim)
      else clearDebateDraft()
    }, 600)
    return () => clearTimeout(t)
  }, [claim])

  // The signature Debate -> Council moment: a brief in-place transition,
  // not a route change — Council isn't a separate destination, it's what
  // this same screen becomes. Opponent selection and portrait preloading
  // both happen DURING the transition overlay, so by the time CouncilView
  // actually mounts, the cast is already known and their portraits are
  // already warm — it starts on the decomposing phase, skipping the
  // "Choosing your opponents…" loader entirely.
  async function enter() {
    if (submitting) return
    const trimmed = claim.trim()
    if (!trimmed) return
    setSubmitting(true)
    setEntering(true)
    setEnterError(null)
    setAssembled(null)
    setSubmittedClaim(trimmed)
    clearDebateDraft()
    try {
      const minWait = new Promise<void>((resolve) => setTimeout(resolve, 650))
      const [{ ids }] = await Promise.all([api.selectOpponents(trimmed), minWait])
      // Both the cast-reveal thumbnails AND the Council backdrop's full
      // split-screen portraits need to be warm before anything shows — two
      // different sizes, two different cache entries, both preloaded here
      // so neither pops in late once CouncilView actually mounts.
      setAssembled(ids)
      await new Promise<void>((resolve) => setTimeout(resolve, 1400))
      const next: DebateState = {
        id: Date.now(),
        claim: trimmed,
        philosopherIds: ids,
        conclusion: '',
        premises: [],
        rounds: [],
        currentRound: 1,
        phase: 'decomposing',
        verdict: null,
        error: null,
      }
      setDebate(next)
    } catch (e) {
      // entering stays true — the overlay remains visible, now showing the
      // error and a Retry button, rather than silently snapping back to
      // the composer as if nothing happened.
      setSubmitting(false)
      setAssembled(null)
      setEnterError((e as Error)?.message || 'Something went wrong assembling the Council.')
    }
  }

  const trimmedLength = claim.trim().length
  const presence = Math.min(trimmedLength / 80, 1)
  const suggestions = dailySuggestions()
  // Example prompts fade as the user writes their own thought, and
  // disappear entirely once they've written something substantial — they
  // shouldn't keep competing for attention once the user's own idea is
  // clearly taking shape.
  const promptsHidden = trimmedLength > 60
  const promptsOpacity = trimmedLength === 0 ? 1 : Math.max(0.4, 1 - presence * 0.62)

  function resumeDraft() {
    if (savedDraft) setClaim(savedDraft)
    setSavedDraft(null)
  }

  // Council is not a separate page — it's this same screen showing a
  // different phase of the same journey. Whether the user just submitted
  // a question here, or navigated back to Debate mid-conversation from
  // My Thinking or Library, a live debate always renders in place, right here.
  if (debate) {
    return (
      <>
        <Suspense fallback={<div className="fixed inset-0 z-[60]" style={{ background: '#0B0D11' }} />}>
          <TempleDebate debate={debate} setDebate={setDebate} onExit={() => setDebate(null)} />
        </Suspense>
      </>
    )
  }

  const C = NIGHT
  const F = NIGHT_FONT
  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <NightSky />
      <header className="relative z-[2] flex items-center gap-3 px-4 py-3 sm:px-6" style={{ borderBottom: `1px solid ${C.line}` }}>
        <button type="button" onClick={() => navigate('/app')} aria-label="Back to the sanctuary" className="night-btn flex h-11 w-11 items-center justify-center rounded-full" style={{ color: C.ivory }}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="m-0 leading-none" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 24 }}>The Temple</h1>
          <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>LAY A FOUNDATION</span>
        </div>
      </header>

      <main className="relative z-[1] mx-auto flex min-h-[calc(100svh-68px)] w-full max-w-[640px] flex-col items-center justify-center px-5 pb-12 pt-6 text-center">
        <Foundation rise={entering ? 1 : presence} />

        {!entering ? (
          <div className="night-enter flex w-full flex-col items-center gap-4">
            <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.3em', color: C.gilt }}>EVERY TEMPLE BEGINS WITH A BELIEF</span>
            <h2 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.12, textWrap: 'balance' }}>
              {heroQuestion()}
            </h2>
            <p className="m-0 max-w-[460px]" style={{ fontFamily: F.read, fontSize: 15.5, lineHeight: 1.6, color: C.muted }}>
              Write it as you would say it. It becomes the roof; what holds it up becomes the columns. Then two philosophers try to bring it down.
            </p>
            <div className="mt-2 w-full overflow-hidden rounded" style={{ background: 'rgba(17,20,26,.82)', border: `1px solid ${C.lineStrong}`, backdropFilter: 'blur(6px)' }}>
              <textarea
                ref={textareaRef}
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="I believe…"
                aria-label="Your belief"
                rows={3}
                className="block w-full resize-none bg-transparent px-5 pb-3 pt-5 outline-none"
                style={{ fontFamily: F.read, fontSize: 18, lineHeight: 1.55, color: C.ivory, minHeight: 120 }}
              />
              <div className="flex items-center justify-between gap-3 px-3 py-2.5" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="flex min-h-11 items-center gap-2">
                  {stt.supported && (
                    <button type="button" onClick={toggleMic} aria-label={stt.listening ? 'Stop dictation' : 'Speak your belief'} aria-pressed={stt.listening} className="night-btn flex h-11 w-11 items-center justify-center rounded-full" style={{ color: stt.listening ? C.gold : C.muted }}>
                      <Mic className="h-4 w-4" />
                    </button>
                  )}
                  {stt.listening && <span style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 13, color: C.muted }}>Listening…</span>}
                  {!stt.listening && stt.error && <span style={{ fontSize: 12, color: C.ember }}>{stt.error}</span>}
                </div>
                <button type="button" onClick={enter} disabled={!claim.trim() || submitting} className="night-btn flex min-h-11 items-center gap-2 rounded px-5 disabled:opacity-40" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
                  Raise the temple <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!promptsHidden && (
              <div className="mt-3 w-full transition-opacity duration-500" style={{ opacity: promptsOpacity }}>
                <p className="mb-2.5" style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.24em', color: C.muted }}>OR BEGIN WITH ONE OF THESE</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((t) => (
                    <button key={t.short} type="button" onClick={() => setClaim(t.label)} className="night-btn min-h-[40px] rounded-full border px-4" style={{ borderColor: C.lineStrong, color: C.body, fontSize: 14 }}>
                      {t.short}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {savedDraft && !claim && (
              <button type="button" onClick={resumeDraft} className="night-btn mt-2 flex w-full items-center justify-between gap-3 rounded px-4 py-3 text-left" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
                <span className="min-w-0">
                  <span className="block" style={{ fontFamily: F.inscr, fontSize: 10, letterSpacing: '.2em', color: C.muted }}>UNFINISHED</span>
                  <span className="block truncate" style={{ fontFamily: F.read, fontSize: 14, color: C.body }}>{savedDraft}</span>
                </span>
                <span style={{ fontFamily: F.inscr, fontSize: 11, letterSpacing: '.16em', color: C.gold }}>RESUME</span>
              </button>
            )}
          </div>
        ) : (
          <div className="night-enter flex flex-col items-center gap-5" aria-live="polite">
            <p className="m-0 max-w-[520px]" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 19, lineHeight: 1.5, color: C.ivory }}>&ldquo;{submittedClaim}&rdquo;</p>
            {enterError ? (
              <>
                <p className="m-0" style={{ fontFamily: F.read, color: C.body }}>The philosophers could not be reached.</p>
                <p className="m-0" style={{ fontSize: 13, color: C.muted }}>{enterError}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={enter} className="night-btn min-h-11 rounded px-5" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>Try again</button>
                  <button type="button" onClick={() => { setEntering(false); setEnterError(null) }} className="night-btn min-h-11 rounded border px-5" style={{ borderColor: C.lineStrong, color: C.body }}>Edit belief</button>
                </div>
              </>
            ) : assembled ? (
              <>
                <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.3em', color: C.gilt }}>YOUR CHALLENGERS</span>
                <div className="flex gap-8">
                  {assembled.map((id) => (
                    <div key={id} className="flex flex-col items-center gap-1">
                      <span style={{ fontFamily: F.display, fontSize: 24 }}>{philosopherById(id)?.name}</span>
                      {PHILOSOPHER_TAGS[id] && <span style={{ fontFamily: F.inscr, fontSize: 10, letterSpacing: '.18em', color: C.muted }}>{PHILOSOPHER_TAGS[id].toUpperCase()}</span>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="m-0" style={{ fontFamily: F.read, fontStyle: 'italic', color: C.muted }}>Choosing who will challenge it…</p>
            )}
          </div>
        )}
      </main>
    </div>,
    document.body,
  )
}

/** The bare foundation of a temple: steps, faint column outlines and an empty roof line, filling in as the belief is written. */
function Foundation({ rise }: { rise: number }) {
  const r = Math.max(0, Math.min(1, rise))
  const cols = [70, 130, 190, 250]
  return (
    <svg viewBox="0 0 320 150" className="mb-6 w-[220px] sm:w-[280px]" aria-hidden="true">
      <defs>
        <linearGradient id="fdGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3D27A" stopOpacity="0" />
          <stop offset="1" stopColor="#F3D27A" stopOpacity=".22" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="142" rx="150" ry="10" fill="url(#fdGlow)" />
      <path d="M40 46 L160 12 L280 46 Z" fill="none" stroke="#C2A15E" strokeOpacity={0.25 + r * 0.5} strokeDasharray={r > 0.99 ? undefined : '4 5'} />
      <rect x="44" y="46" width="232" height="12" fill="none" stroke="#C2A15E" strokeOpacity={0.25 + r * 0.5} strokeDasharray={r > 0.99 ? undefined : '4 5'} />
      {cols.map((x, i) => {
        const h = 66 * Math.max(0, Math.min(1, r * 4 - i))
        return (
          <g key={x}>
            <rect x={x - 9} y="58" width="18" height="66" fill="none" stroke="#C2A15E" strokeOpacity=".22" strokeDasharray="3 4" />
            <rect x={x - 9} y={124 - h} width="18" height={h} fill="#D9CFBA" opacity=".85" style={{ transition: 'all .6s ease' }} />
          </g>
        )
      })}
      <rect x="30" y="124" width="260" height="7" fill="#CFC5AE" />
      <rect x="20" y="131" width="280" height="7" fill="#B9AF98" />
    </svg>
  )
}


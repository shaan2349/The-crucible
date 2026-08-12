import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, Mic } from 'lucide-react'
import { Button } from '../components/Button'
import { PortraitFrame } from '../components/PortraitFrame'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { CouncilBackdrop, CouncilView } from './Council'
import { DEBATE_BACKDROP_PORTRAIT_SIZE } from '../components/DebateBackdrop'
import { PHILOSOPHER_TAGS, SUGGESTED_TOPICS, philosopherById } from '../data/philosophers'
import { loadReflectDraft, saveReflectDraft, clearReflectDraft, loadInterests } from '../lib/storage'
import { useDebateContext } from '../context/DebateContext'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { preloadPortrait } from '../hooks/usePortrait'
import * as api from '../lib/api'
import type { Debate as DebateState } from '../types'

const HERO_QUESTIONS = [
  "What's occupying your mind today?",
  "What question won't leave you alone?",
  'What belief are you beginning to question?',
  'What certainty are you willing to test?',
  'What have you stopped questioning too soon?',
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

// Portraits are preloaded at the size Council's cast reveal actually uses
// (see CouncilView), so the preload during the transition is a genuine
// cache warm, not a different-sized, wasted fetch.
const CAST_PORTRAIT_SIZE = 400

export function Reflect() {
  const { debate, setDebate } = useDebateContext()
  const location = useLocation()

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
    setSavedDraft(loadReflectDraft())
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
      if (claim.trim()) saveReflectDraft(claim)
      else clearReflectDraft()
    }, 600)
    return () => clearTimeout(t)
  }, [claim])

  // The signature Reflect -> Council moment: a brief in-place transition,
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
    clearReflectDraft()
    try {
      const minWait = new Promise<void>((resolve) => setTimeout(resolve, 650))
      const [{ ids }] = await Promise.all([api.selectOpponents(trimmed), minWait])
      // Both the cast-reveal thumbnails AND the Council backdrop's full
      // split-screen portraits need to be warm before anything shows — two
      // different sizes, two different cache entries, both preloaded here
      // so neither pops in late once CouncilView actually mounts.
      await Promise.all([
        ...ids.map((id) => preloadPortrait(id, CAST_PORTRAIT_SIZE)),
        ...ids.map((id) => preloadPortrait(id, DEBATE_BACKDROP_PORTRAIT_SIZE)),
      ])
      setAssembled(ids)
      await new Promise<void>((resolve) => setTimeout(resolve, 450))
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
  // a question here, or navigated back to Reflect mid-conversation from
  // Journal or Library, a live debate always renders in place, right here.
  if (debate) {
    return (
      <>
        <CouncilBackdrop philosopherIds={debate.philosopherIds} />
        <CouncilView debate={debate} setDebate={setDebate} onExit={() => setDebate(null)} />
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
          The Council awaits.
        </p>

        <div className="relative mb-12">
          <h1
            className="relative font-display text-[34px] font-medium leading-[1.15] tracking-[-0.02em] text-parchment-900 sm:text-[40px]"
            style={{ animation: 'revealUp 0.5s ease 80ms both' }}
          >
            {heroQuestion()}
          </h1>
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
            {/* The composer is one deliberate object: writing surface on
                top, a real action row below it (not floating controls),
                so the microphone can never end up underneath the CTA no
                matter how wide that button's label makes it. */}
            <div
              className="overflow-hidden rounded-3xl border border-parchment-300/60 bg-parchment-50 transition-shadow duration-200 focus-within:border-forge-ember/50"
              style={{ animation: 'revealUp 0.5s ease 160ms both', boxShadow: 'var(--shadow-card)' }}
            >
              <textarea
                ref={textareaRef}
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Write freely…"
                autoFocus
                aria-label="Your question or position"
                className="block w-full resize-none overflow-hidden bg-transparent px-6 pb-3 pt-6 text-base text-parchment-900 outline-none placeholder:text-parchment-400 sm:px-7 sm:pt-7 sm:text-lg"
                style={{ minHeight: '180px' }}
              />

              <div className="flex items-center justify-between gap-3 border-t border-parchment-200/70 px-4 py-3 sm:px-5">
                <div className="flex min-h-11 items-center gap-2.5">
                  {stt.supported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      aria-label={stt.listening ? 'Stop dictating' : 'Dictate your position'}
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
                  disabled={!claim.trim() || submitting}
                  aria-label="Assemble the Council"
                  className="group flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-parchment-50 transition-all duration-200 hover:brightness-110 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(155deg, #e8a33d, #c2531d)',
                    boxShadow: 'var(--shadow-embossed), inset 0 1px 0 rgba(255,255,255,0.25)',
                  }}
                >
                  <span className="hidden font-display text-sm font-medium sm:inline">Assemble the Council</span>
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
                  {suggestions.map((s) => (
                    <button
                      key={s.short}
                      type="button"
                      onClick={() => setClaim(s.label)}
                      className="rounded-full border border-parchment-300/70 px-4 py-2.5 text-sm text-parchment-600 transition-colors hover:border-forge-ember hover:text-forge-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-ember/50"
                    >
                      {s.short}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {savedDraft && !claim.trim() && (
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
              {/* The question stays visible through the whole transition —
                  the composer behind this overlay fades out, but what was
                  actually asked never disappears from view. */}
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">Your question</p>
                <p className="font-display text-lg italic leading-snug text-parchment-900">&ldquo;{submittedClaim}&rdquo;</p>
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
                      Edit question
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
                    Two different ways of seeing the same problem.
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
                  <p className="font-display text-base italic text-parchment-600">Assembling perspectives…</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

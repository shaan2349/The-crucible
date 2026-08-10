import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, Mic } from 'lucide-react'
import { Button } from '../components/Button'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { CouncilBackdrop, CouncilView } from './Council'
import { DEBATE_BACKDROP_PORTRAIT_SIZE } from '../components/DebateBackdrop'
import { SUGGESTED_TOPICS, philosopherById } from '../data/philosophers'
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
  const stt = useSpeechToText()

  function toggleMic() {
    if (stt.listening) {
      stt.stop()
      return
    }
    stt.start((text) => setClaim((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)))
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
          className="mb-3 font-display text-xs uppercase tracking-[0.15em] text-parchment-500"
          style={{ animation: 'revealUp 0.4s ease both' }}
        >
          The Council awaits.
        </p>

        <div className="relative mb-10">
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
            <div className="relative" style={{ animation: 'revealUp 0.5s ease 160ms both' }}>
              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="Write freely…"
                rows={4}
                autoFocus
                aria-label="Your question or position"
                className="w-full resize-none rounded-[28px] bg-parchment-50 p-7 pr-32 text-base text-parchment-900 outline-none ring-1 ring-transparent transition-shadow duration-200 placeholder:text-parchment-400 focus:ring-forge-ember/40"
                style={{ boxShadow: 'var(--shadow-card)' }}
              />
              {stt.supported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={stt.listening ? 'Stop dictating' : 'Dictate your position'}
                  className="absolute bottom-4 right-[4.5rem] flex h-11 w-11 items-center justify-center rounded-full transition-colors"
                  style={
                    stt.listening
                      ? { background: 'var(--color-forge-ember)', color: 'var(--color-parchment-50)' }
                      : { color: 'var(--color-parchment-400)' }
                  }
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={enter}
                disabled={!claim.trim() || submitting}
                aria-label="Assemble the Council"
                className="group absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center gap-2 rounded-full text-parchment-50 transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 sm:w-auto sm:px-6"
                style={{
                  background: 'linear-gradient(155deg, #e8a33d, #c2531d)',
                  boxShadow: 'var(--shadow-embossed), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <span className="hidden font-display text-sm font-medium sm:inline">Assemble the Council</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>

            {!promptsHidden && (
              <div
                className="mt-9 flex flex-wrap gap-2.5 transition-opacity duration-500"
                style={{ animation: 'revealUp 0.5s ease 240ms both', opacity: promptsOpacity }}
              >
                {suggestions.map((s) => (
                  <button
                    key={s.short}
                    type="button"
                    onClick={() => setClaim(s.label)}
                    className="rounded-full border border-parchment-300 bg-parchment-50 px-4 py-2.5 text-sm text-parchment-700 transition-colors hover:border-forge-ember hover:text-forge-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-ember/50"
                  >
                    {s.short}
                  </button>
                ))}
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
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              style={{ animation: 'revealUp 0.35s ease 150ms both' }}
            >
              {enterError ? (
                <>
                  <p className="font-display text-base text-parchment-700">Couldn't reach the Council.</p>
                  <p className="text-xs text-parchment-500">{enterError}</p>
                  <div className="mt-2 flex gap-2">
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
                </>
              ) : assembled ? (
                <p className="font-display text-base italic text-parchment-600" style={{ animation: 'revealUp 0.35s ease both' }}>
                  {assembled.map((id) => philosopherById(id)?.name).filter(Boolean).join(' and ')} will examine this.
                </p>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

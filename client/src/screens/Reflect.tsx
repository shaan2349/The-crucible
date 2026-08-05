import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Bust } from '../components/Bust'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { SUGGESTED_TOPICS } from '../data/philosophers'
import { loadReflectDraft, saveReflectDraft, clearReflectDraft, loadInterests } from '../lib/storage'
import { useDebateContext } from '../context/DebateContext'
import type { Debate as DebateState } from '../types'

const HERO_QUESTIONS = [
  "What's occupying your mind today?",
  "What question won't leave you alone?",
  'What belief are you beginning to question?',
  'What has been on your mind lately?',
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning.'
  if (h < 18) return 'Good afternoon.'
  return 'Good evening.'
}

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

export function Reflect() {
  const { debate, setDebate } = useDebateContext()
  const navigate = useNavigate()

  // An active debate already exists (started here, or resumed) — Reflect is
  // only ever the entry point, so hand off to Council immediately.
  useEffect(() => {
    if (debate) navigate('/app/council')
  }, [debate, navigate])

  const [claim, setClaim] = useState('')
  const [savedDraft, setSavedDraft] = useState<string | null>(null)

  useEffect(() => {
    setSavedDraft(loadReflectDraft())
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (claim.trim()) saveReflectDraft(claim)
      else clearReflectDraft()
    }, 600)
    return () => clearTimeout(t)
  }, [claim])

  function enter() {
    const trimmed = claim.trim()
    if (!trimmed) return
    clearReflectDraft()
    const next: DebateState = {
      id: Date.now(),
      claim: trimmed,
      philosopherIds: [],
      conclusion: '',
      premises: [],
      rounds: [],
      currentRound: 1,
      phase: 'selecting',
      verdict: null,
      error: null,
    }
    setDebate(next)
    navigate('/app/council')
  }

  const presence = Math.min(claim.trim().length / 80, 1)
  const suggestions = dailySuggestions()

  function resumeDraft() {
    if (savedDraft) setClaim(savedDraft)
    setSavedDraft(null)
  }

  if (debate) return null

  return (
    <>
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
        <p className="mb-2 font-display text-sm text-parchment-500" style={{ animation: 'revealUp 0.4s ease both' }}>
          {greeting()}
        </p>

        <div className="relative mb-6">
          <div
            className="pointer-events-none absolute -inset-x-2 -top-4 flex justify-between transition-opacity duration-700"
            style={{ opacity: 0.06 + presence * 0.18 }}
          >
            <Bust laurel className="h-16 w-16 -translate-x-2 -rotate-6 text-side-gold" />
            <Bust bearded className="h-16 w-16 translate-x-2 rotate-6 text-side-indigo" />
          </div>
          <h1
            className="relative font-display text-[34px] font-medium leading-[1.15] tracking-[-0.02em] text-parchment-900"
            style={{ animation: 'revealUp 0.5s ease 80ms both' }}
          >
            {heroQuestion()}
          </h1>
        </div>

        <div className="relative" style={{ animation: 'revealUp 0.5s ease 160ms both' }}>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Write freely…"
            rows={4}
            autoFocus
            className="w-full resize-none rounded-[28px] bg-parchment-50 p-7 pr-20 text-base text-parchment-900 outline-none placeholder:text-parchment-400"
            style={{ boxShadow: 'var(--shadow-card)' }}
          />
          <button
            type="button"
            onClick={enter}
            disabled={!claim.trim()}
            aria-label="Begin"
            className="absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full text-parchment-50 transition-transform active:scale-[0.96] disabled:opacity-40"
            style={{ background: 'linear-gradient(155deg, #e8a33d, #c2531d)', boxShadow: 'var(--shadow-embossed)' }}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" style={{ animation: 'revealUp 0.5s ease 240ms both' }}>
          {suggestions.map((s) => (
            <button
              key={s.short}
              type="button"
              onClick={() => setClaim(s.label)}
              className="rounded-full border border-parchment-300 bg-parchment-50 px-3.5 py-2 text-xs text-parchment-700 transition-colors hover:border-forge-ember hover:text-forge-ember"
            >
              {s.short}
            </button>
          ))}
        </div>

        {savedDraft && !claim.trim() && (
          <button
            type="button"
            onClick={resumeDraft}
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left"
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
    </>
  )
}

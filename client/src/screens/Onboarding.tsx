import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { markOnboarded, saveInterests } from '../lib/storage'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { NightSky } from '../night/NightSky'

const INTERESTS = ['Philosophy', 'Economics', 'Politics', 'Psychology', 'History', 'Literature', 'Science']

const STEPS = [
  {
    eyebrow: 'A WORLD TO THINK IN',
    headline: 'The Crucible is a sanctuary at night.',
    body: 'Each place on its hill is a different way of thinking: a temple where your beliefs are tested, a table where philosophers talk things through with you, a hall of great minds, and an oracle with one question a day.',
  },
  {
    eyebrow: 'HOW IT WORKS',
    headline: 'Defend what you believe. Change your mind when it’s right to.',
    body: 'Philosophers will disagree with you, accurately and in their own voices. Holding your ground well is a victory; rewriting a belief for a good reason is never a loss.',
  },
  null, // interests, rendered below
  {
    eyebrow: 'YOUR THOUGHTS ARE YOURS',
    headline: 'What you write stays private.',
    body: 'Your debates and conversations are kept on this device. No advertising, and nothing you write is sold.',
  },
] as const

// Start fetching the 3D hill while the visitor reads, so it is ready when they enter.
const warmSanctuary = () => void import('../sanctuary/Sanctuary3D').catch(() => {})

export function Onboarding() {
  const navigate = useNavigate()
  useEffect(warmSanctuary, [])
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState<string[]>([])
  const current = STEPS[step]
  const last = step === STEPS.length - 1

  function finish() {
    saveInterests(interests)
    markOnboarded()
    navigate('/app')
  }

  function toggle(name: string) {
    setInterests((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]))
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <NightSky />
      <div key={step} className="night-enter relative flex w-full max-w-[520px] flex-col items-center gap-4">
        {current ? (
          <>
            <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.3em', color: C.gilt }}>{current.eyebrow}</span>
            <h1 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(28px, 7vw, 38px)', lineHeight: 1.12, textWrap: 'balance' }}>
              {current.headline}
            </h1>
            <p style={{ fontFamily: F.read, fontSize: 17, lineHeight: 1.6, color: C.body }}>{current.body}</p>
          </>
        ) : (
          <>
            <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.3em', color: C.gilt }}>WHAT DRAWS YOU IN</span>
            <h1 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(28px, 7vw, 38px)', lineHeight: 1.12 }}>
              Which subjects interest you?
            </h1>
            <p style={{ fontFamily: F.read, fontSize: 15.5, color: C.muted }}>Used only to choose which suggested questions you see first.</p>
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Interests">
              {INTERESTS.map((name) => {
                const on = interests.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(name)}
                    className="night-btn min-h-[44px] rounded-full border px-4"
                    style={on ? { background: C.gilt, borderColor: C.gilt, color: C.night, fontWeight: 600 } : { borderColor: C.lineStrong, color: C.body }}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </>
        )}
        <div className="mt-4 flex w-full max-w-[380px] flex-col gap-2.5">
          <button
            type="button"
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="night-btn min-h-[52px] rounded"
            style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 16 }}
          >
            {last ? 'Enter the sanctuary' : 'Continue'}
          </button>
          {!last && (
            <button type="button" onClick={finish} className="night-btn min-h-[44px] rounded" style={{ color: C.muted }}>
              Skip
            </button>
          )}
        </div>
        <div className="mt-6 flex gap-2" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === step ? C.gilt : '#2E333B' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CrucibleMark } from '../components/CrucibleMark'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { markOnboarded, saveInterests } from '../lib/storage'

const INTERESTS = ['Philosophy', 'Economics', 'Politics', 'Psychology', 'History', 'Literature', 'Science']

export function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState<string[]>([])

  function finish() {
    saveInterests(interests)
    markOnboarded()
    navigate('/app/reflect')
  }

  function toggleInterest(name: string) {
    setInterests((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]))
  }

  const steps = [
    {
      headline: 'Think with history’s greatest minds.',
      body: 'Bring a question. Explore it through authentic philosophical dialogue. Discover perspectives rather than answers.',
    },
    {
      headline: 'Bring a question.',
      body: 'The Council discusses it. You reflect. Your thinking evolves. Expect thoughtful disagreement — great thinking rarely comes from hearing one perspective.',
    },
    null, // interests step, rendered specially below
    {
      headline: 'Your thoughts belong to you.',
      body: 'Your reflections remain private unless you explicitly choose otherwise. No advertising. No selling personal reflections.',
    },
  ] as const

  const current = steps[step]

  return (
    <div className="reading-container relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <RotatingBackdrop screen="onboarding" />
      <div
        className="relative z-[1] mb-8 flex h-16 w-16 items-center justify-center rounded-2xl shadow-embossed"
        style={{ background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
      >
        <CrucibleMark size={36} className="text-parchment-50" />
      </div>

      <div className="relative z-[1] w-full" style={{ animation: 'revealUp 0.4s ease both' }}>
        {current ? (
          <>
            <h1 className="mb-4 font-display text-3xl font-medium leading-snug text-parchment-900">
              {current.headline}
            </h1>
            <p className="mb-10 text-base leading-relaxed text-parchment-700">{current.body}</p>
          </>
        ) : (
          <>
            <h1 className="mb-2 font-display text-3xl font-medium leading-snug text-parchment-900">
              What draws you in?
            </h1>
            <p className="mb-6 text-sm text-parchment-600">Used only to shape which questions you see first.</p>
            <div className="mb-10 flex flex-wrap justify-center gap-2">
              {INTERESTS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleInterest(name)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    interests.includes(name)
                      ? 'border-forge-ember bg-side-gold-soft text-parchment-900'
                      : 'border-parchment-300 text-parchment-700 hover:border-parchment-400'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
          className="w-full rounded-full px-9 py-4 font-display text-lg font-medium text-parchment-50 shadow-embossed transition-transform active:scale-[0.98]"
          style={{ background: 'linear-gradient(120deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
        >
          {step < steps.length - 1 ? 'Continue' : 'Begin reflecting'}
        </button>

        {step < steps.length - 1 && (
          <button
            type="button"
            onClick={finish}
            className="mt-4 font-body text-sm text-parchment-500 underline decoration-parchment-400 underline-offset-4 hover:text-parchment-700"
          >
            Skip
          </button>
        )}
      </div>

      <div className="relative z-[1] mt-10 flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full transition-colors"
            style={{ background: i === step ? '#c2531d' : '#e4d3b3' }}
          />
        ))}
      </div>
    </div>
  )
}

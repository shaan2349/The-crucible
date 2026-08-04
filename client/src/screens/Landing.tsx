import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CrucibleMark } from '../components/CrucibleMark'
import { useRotatingBackground } from '../hooks/useRotatingBackground'

type BootPhase = 'flare' | 'fadeout' | null

export function Landing() {
  const navigate = useNavigate()
  const [bootPhase, setBootPhase] = useState<BootPhase>('flare')
  const { bgUrl } = useRotatingBackground(30000)

  useEffect(() => {
    const t1 = setTimeout(() => setBootPhase('fadeout'), 750)
    const t2 = setTimeout(() => setBootPhase(null), 1350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="relative min-h-svh overflow-hidden bg-parchment-100">
      {bootPhase && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-parchment-100 transition-opacity duration-500 ${
            bootPhase === 'fadeout' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="relative flex flex-col items-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span
                className="absolute h-3 w-3 rounded-full"
                style={{ background: '#e8a33d', animation: 'emberRing 1s ease-out' }}
              />
              <span
                className="absolute h-3 w-3 rounded-full"
                style={{
                  background: '#e8a33d',
                  boxShadow: '0 0 18px 6px rgba(217,119,6,0.7)',
                  animation: 'emberCore 0.9s ease-out',
                }}
              />
            </div>
            <p
              className="mt-4 font-display text-sm uppercase text-forge-ember"
              style={{ animation: 'bootTitleReveal 0.9s ease-out forwards' }}
            >
              The Crucible
            </p>
          </div>
        </div>
      )}

      {/*
        Restrained duotone portrait — barely-there texture behind the
        hero, not competing with the CTA. Ties Landing into the same
        photographic system as the rest of the app (see DuotoneDefs)
        instead of the flat illustration-only treatment this had before
        the photo coverage was reliable enough to trust here.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {bgUrl && (
          <div
            key={bgUrl}
            className="absolute inset-0 animate-[backdropFade_1.4s_ease] bg-cover"
            style={{ backgroundImage: `url(${bgUrl})`, backgroundPosition: '50% 18%', filter: 'url(#duotone-neutral)' }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(248,242,230,0.78) 0%, rgba(248,242,230,0.93) 55%, rgba(248,242,230,0.99) 100%)',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-svh max-w-md flex-col items-center justify-center px-8 py-16 text-center">
        <div
          className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl shadow-embossed"
          style={{ background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
        >
          <CrucibleMark size={44} className="text-parchment-50" />
        </div>

        <p className="mb-2 font-display text-sm tracking-wide text-parchment-600">
          A philosophy debate forge
        </p>
        <h1 className="mb-4 font-display text-5xl font-medium leading-[1.05] text-parchment-900">
          The Crucible
        </h1>
        <p className="mb-12 max-w-sm text-lg leading-relaxed text-parchment-700">
          State a real position. Two philosophers, in genuine opposition, will
          put it under heat. What survives is stronger for it.
        </p>

        <button
          type="button"
          onClick={() => navigate('/app/debate')}
          className="group relative overflow-hidden rounded-full px-9 py-4 font-display text-lg font-medium text-parchment-50 shadow-embossed transition-transform active:scale-[0.98]"
          style={{ background: 'linear-gradient(120deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
        >
          Enter the Crucible
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/library')}
          className="mt-6 font-body text-sm text-parchment-600 underline decoration-parchment-400 underline-offset-4 hover:text-parchment-800"
        >
          Or browse the philosophers first
        </button>
      </div>
    </div>
  )
}

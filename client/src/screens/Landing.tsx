import { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasOnboarded, loadDebates } from '../lib/storage'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { NightSky } from '../night/NightSky'

/** The first thing anyone sees: the sanctuary's name under the night sky. */
// Start fetching the 3D hill while the visitor reads, so it is ready when they enter.
const warmSanctuary = () => void import('../sanctuary/Sanctuary3D').catch(() => {})
// the welcome opens on the hill itself, settling down from the stars
const SanctuaryBackdrop = lazy(() => import('../sanctuary/SanctuaryBackdrop'))

export function Landing() {
  const navigate = useNavigate()
  useEffect(warmSanctuary, [])
  const [temples] = useState(() => loadDebates().length)
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <NightSky three={false} />
      <Suspense fallback={null}>
        <SanctuaryBackdrop temples={temples} />
      </Suspense>
      {/* a soft darkening behind the words so they read over the hill */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ background: 'radial-gradient(70% 55% at 50% 50%, rgba(8,10,14,.78), rgba(8,10,14,.35) 70%, rgba(8,10,14,.15))' }} />
      <div className="night-enter relative flex max-w-[560px] flex-col items-center gap-5">
        <span style={{ fontFamily: F.inscr, fontSize: 11, fontWeight: 600, letterSpacing: '.34em', color: C.gilt }}>ΓΝΩΘΙ ΣΕΑΥΤΟΝ</span>
        <h1 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(44px, 12vw, 72px)', lineHeight: 1 }}>
          The Crucible
        </h1>
        <p style={{ fontFamily: F.read, fontSize: 18, lineHeight: 1.55, color: C.body }}>
          Test what you believe against history’s greatest minds. Talk real questions through with them. Watch your thinking take shape.
        </p>
        <div className="mt-3 flex w-full max-w-[380px] flex-col gap-2.5">
          <button
            type="button"
            onClick={() => navigate(hasOnboarded() ? '/app' : '/onboarding')}
            className="btn-gilt night-btn min-h-[52px] rounded"
            style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 16 }}
          >
            Enter the sanctuary
          </button>
          <button type="button" onClick={() => navigate('/app/hall')} className="btn-bronze night-btn min-h-[48px] rounded border" style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontWeight: 500 }}>
            Meet the thinkers first
          </button>
        </div>
      </div>
    </div>
  )
}

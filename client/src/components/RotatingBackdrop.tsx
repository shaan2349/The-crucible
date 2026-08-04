import { useRotatingBackground, useRotatingBustVariant } from '../hooks/useRotatingBackground'
import { Bust } from './Bust'

/**
 * Fixed full-bleed backdrop behind the whole app. A real portrait rotates
 * in every 30s where one loads, rendered in the shared neutral duotone
 * (see DuotoneDefs) so it reads as one deliberate system alongside the
 * gold/indigo duotones used during a debate, rather than a raw filter
 * chain whose look shifted with each source photo's original grading.
 * All 47 philosophers now have a mapped photo, so the bust fallback
 * below is a rare edge case (a renamed/deleted Commons file), not a
 * common state — the scrim is tuned assuming a photo is usually there.
 */
export function RotatingBackdrop() {
  const { bgUrl, bgPosition, failed } = useRotatingBackground(30000)
  const variant = useRotatingBustVariant(30000)

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-parchment-100">
      {bgUrl && (
        <div
          key={bgUrl}
          className="absolute inset-0 animate-[backdropFade_1.2s_ease] bg-cover"
          style={{ backgroundImage: `url(${bgUrl})`, backgroundPosition: bgPosition, filter: 'url(#duotone-neutral)' }}
        />
      )}
      {!bgUrl && failed && (
        <div className="absolute -bottom-16 -right-16 flex items-center justify-center">
          <div className="relative flex h-[380px] w-[380px] items-center justify-center rounded-full border border-forge-char/10">
            <div className="absolute h-[320px] w-[320px] rounded-full border border-dashed border-forge-char/10" />
            <Bust {...variant} className="h-32 w-32 text-forge-char/20" />
          </div>
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(248,242,230,0.45) 0%, rgba(248,242,230,0.78) 60%, rgba(248,242,230,0.94) 100%)',
        }}
      />
    </div>
  )
}

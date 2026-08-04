import { useRotatingBackground, useRotatingBustVariant } from '../hooks/useRotatingBackground'
import { Bust } from './Bust'

/**
 * Fixed full-bleed backdrop behind the whole app. A real portrait rotates
 * in every 30s where one loads; a radial parchment scrim keeps it faint
 * enough that screen content (which also sits on its own translucent
 * cards) stays legible regardless of which photo is showing. Falls back
 * to a faint bust illustration if no photo loads.
 */
export function RotatingBackdrop() {
  const { bgUrl, failed } = useRotatingBackground(30000)
  const variant = useRotatingBustVariant(30000)

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-parchment-100">
      {bgUrl && (
        <div
          key={bgUrl}
          className="absolute inset-0 animate-[backdropFade_1.2s_ease] bg-cover bg-center"
          style={{
            backgroundImage: `url(${bgUrl})`,
            filter: 'grayscale(0.3) sepia(0.2) brightness(1.05) contrast(0.95)',
          }}
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
            'radial-gradient(circle at 50% 45%, rgba(248,242,230,0.55) 0%, rgba(248,242,230,0.85) 60%, rgba(248,242,230,0.97) 100%)',
        }}
      />
    </div>
  )
}

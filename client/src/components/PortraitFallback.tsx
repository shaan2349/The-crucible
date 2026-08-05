import { Bust } from './Bust'

interface PortraitFallbackProps {
  className?: string
  bustOpacity?: number
  variant?: { laurel?: boolean; bearded?: boolean; plinth?: boolean }
}

/**
 * The permanent backdrop behind every portrait, real or not — rendered
 * first and always, with the actual photo (if one loads) fading in on
 * top of it. So a slow/failed network fetch never produces a blank or
 * flat-colored gap: it just quietly stays on this marble-and-bust motif,
 * which reads as a deliberate design choice rather than a broken image.
 * Pure CSS + SVG, no network dependency, themes automatically via the
 * shared parchment custom properties (light and dark alike).
 */
export function PortraitFallback({ className, bustOpacity = 0.22, variant }: PortraitFallbackProps) {
  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(155deg, var(--color-parchment-200) 0%, var(--color-parchment-300) 55%, var(--color-parchment-200) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-20%',
          opacity: 0.55,
          backgroundImage:
            'repeating-linear-gradient(115deg, color-mix(in srgb, var(--color-parchment-500) 16%, transparent) 0px, transparent 2px, transparent 26px, color-mix(in srgb, var(--color-parchment-500) 11%, transparent) 28px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 38%, transparent 0%, color-mix(in srgb, var(--color-parchment-200) 55%, transparent) 100%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: bustOpacity }}>
        <Bust {...variant} className="h-1/2 w-1/2" tone="var(--color-parchment-600)" />
      </div>
    </div>
  )
}

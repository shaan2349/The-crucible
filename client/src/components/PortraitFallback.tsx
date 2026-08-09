import { CrucibleMark } from './CrucibleMark'

interface PortraitFallbackProps {
  className?: string
  markOpacity?: number
}

/**
 * The permanent backdrop behind every portrait, real or not — rendered
 * first and always, with the actual photo (if one loads) fading in on
 * top of it. So a slow or failed network fetch never produces a blank
 * gap or a generic person-shaped silhouette: it quietly stays on this
 * marble-and-brand-mark motif, which reads as a deliberate design
 * choice rather than a broken image. Deliberately has no face or
 * figure of any kind — just texture and the Crucible mark, small and
 * faint. Pure CSS + SVG, no network dependency, themes automatically
 * via the shared parchment custom properties (light and dark alike).
 */
export function PortraitFallback({ className, markOpacity = 0.16 }: PortraitFallbackProps) {
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
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: markOpacity }}>
        <div className="h-[28%] w-[28%]">
          <CrucibleMark className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}

import { useRotatingBackground } from '../hooks/useRotatingBackground'
import { PortraitFallback } from './PortraitFallback'

/**
 * Fixed full-bleed backdrop behind the whole app. A real portrait rotates
 * in every 30s where one loads, rendered in the shared neutral duotone
 * (see DuotoneDefs) so it reads as one deliberate system alongside the
 * gold/indigo duotones used during a debate, rather than a raw filter
 * chain whose look shifted with each source photo's original grading.
 * PortraitFallback is always mounted underneath and never removed — a
 * slow or failed Wikimedia fetch just leaves the marble/brand-mark motif
 * showing instead of a blank gap or a swapped-in different philosopher.
 *
 * `dimmed` pulls the scrim further toward opaque — for screens like the
 * Library where content (portrait cards, or a page that already has its
 * own dominant hero portrait) needs to stay unambiguously in front,
 * rather than competing with a second large ambient face.
 */
export function RotatingBackdrop({ dimmed = false }: { dimmed?: boolean } = {}) {
  const { bgUrl, bgPosition } = useRotatingBackground(30000)
  const stops = dimmed ? [85, 95, 99] : [72, 90, 97]

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-parchment-100">
      <PortraitFallback markOpacity={0.14} />
      {bgUrl && (
        <div
          key={bgUrl}
          className="absolute inset-0 animate-[backdropFade_1.2s_ease] bg-cover"
          style={{ backgroundImage: `url(${bgUrl})`, backgroundPosition: bgPosition, filter: 'url(#duotone-neutral)' }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--color-parchment-100) ${stops[0]}%, transparent) 0%, color-mix(in srgb, var(--color-parchment-100) ${stops[1]}%, transparent) 60%, color-mix(in srgb, var(--color-parchment-100) ${stops[2]}%, transparent) 100%)`,
        }}
      />
    </div>
  )
}

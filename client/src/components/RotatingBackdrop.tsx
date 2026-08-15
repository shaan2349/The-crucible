import { BACKGROUND_REGISTRY, type BackgroundScreenId } from '../data/backgrounds'
import { useScreenBackground } from '../hooks/useScreenBackground'
import { PortraitFallback } from './PortraitFallback'

/**
 * Fixed full-bleed ambient backdrop behind a screen. Every screen passes
 * its own registry key (see backgrounds.ts) so each gets a deterministic,
 * curated background distinct from every other screen's — not one shared
 * rotation that made every screen look interchangeable. Rendered in the
 * shared neutral duotone (see DuotoneDefs) so it reads as one deliberate
 * system alongside the gold/indigo duotones used during a debate, rather
 * than a raw filter chain whose look shifted with each source photo's
 * original grading. PortraitFallback is always mounted underneath and
 * never removed — a slow or failed fetch just leaves the marble/
 * colonnade/brand-mark motif showing instead of a blank gap or a
 * swapped-in different philosopher.
 */
export function RotatingBackdrop({ screen }: { screen: BackgroundScreenId }) {
  const { bgUrl, bgPosition, dimmed } = useScreenBackground(screen)
  const stops = dimmed ? [80, 92, 98] : [60, 84, 95]

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-parchment-100">
      <PortraitFallback markOpacity={0.14} family={BACKGROUND_REGISTRY[screen].family} />
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

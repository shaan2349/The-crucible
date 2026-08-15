import { CrucibleMark } from './CrucibleMark'
import type { BackgroundFamily } from '../data/backgrounds'

interface PortraitFallbackProps {
  className?: string
  markOpacity?: number
  /** Which route family's texture to render — see backgrounds.ts. Falls
   * back to 'neutral' (the original marble/colonnade look) when omitted,
   * so every existing call site that doesn't pass one keeps working. */
  family?: BackgroundFamily
}

const FAMILY_TEXTURE: Record<BackgroundFamily, { base: string; pattern: string; patternOpacity: number }> = {
  // Warm, contemplative, soft light — no hard lines.
  reflect: {
    base: 'radial-gradient(120% 90% at 30% 10%, var(--color-parchment-200) 0%, var(--color-parchment-300) 55%, var(--color-parchment-200) 100%)',
    pattern:
      'repeating-radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-side-gold) 8%, transparent) 0px, transparent 3px, transparent 90px)',
    patternOpacity: 0.5,
  },
  // Sharper, higher-contrast, diagonal — argumentative energy.
  debate: {
    base: 'linear-gradient(155deg, var(--color-parchment-300) 0%, var(--color-parchment-200) 45%, var(--color-parchment-300) 100%)',
    pattern:
      'repeating-linear-gradient(115deg, color-mix(in srgb, var(--color-forge-char) 14%, transparent) 0px, transparent 2px, transparent 22px, color-mix(in srgb, var(--color-forge-char) 9%, transparent) 24px)',
    patternOpacity: 0.6,
  },
  // Colonnade — a hall of columns, archival/architectural.
  library: {
    base: 'linear-gradient(155deg, var(--color-parchment-200) 0%, var(--color-parchment-300) 55%, var(--color-parchment-200) 100%)',
    pattern:
      'repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-parchment-500) 20%, transparent) 0px, color-mix(in srgb, var(--color-parchment-500) 20%, transparent) 3px, transparent 3px, transparent 68px)',
    patternOpacity: 0.4,
  },
  // Ruled paper — horizontal lines like a notebook page.
  mythinking: {
    base: 'linear-gradient(180deg, var(--color-parchment-200) 0%, var(--color-parchment-300) 100%)',
    pattern:
      'repeating-linear-gradient(180deg, transparent 0px, transparent 27px, color-mix(in srgb, var(--color-parchment-500) 16%, transparent) 28px)',
    patternOpacity: 0.5,
  },
  // Faint grid, like graph paper or a diagram's construction lines.
  train: {
    base: 'linear-gradient(165deg, var(--color-parchment-200) 0%, var(--color-parchment-300) 60%, var(--color-parchment-200) 100%)',
    pattern:
      'repeating-linear-gradient(0deg, color-mix(in srgb, var(--color-parchment-500) 10%, transparent) 0px, transparent 1px, transparent 34px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-parchment-500) 10%, transparent) 0px, transparent 1px, transparent 34px)',
    patternOpacity: 0.6,
  },
  neutral: {
    base: 'linear-gradient(155deg, var(--color-parchment-200) 0%, var(--color-parchment-300) 55%, var(--color-parchment-200) 100%)',
    pattern:
      'repeating-linear-gradient(115deg, color-mix(in srgb, var(--color-parchment-500) 16%, transparent) 0px, transparent 2px, transparent 26px, color-mix(in srgb, var(--color-parchment-500) 11%, transparent) 28px)',
    patternOpacity: 0.55,
  },
}

/**
 * The permanent backdrop behind every portrait, real or not — rendered
 * first and always, with the actual photo (if one loads) fading in on
 * top of it. So a slow or failed network fetch never produces a blank
 * gap: it quietly stays on a route-family-appropriate texture, which
 * reads as a deliberate design choice rather than a broken image. The
 * Crucible mark lives as a small, restrained corner watermark rather
 * than a large centered icon — a fallback that reads as "just an icon
 * on a flat panel" looks broken no matter how deliberate it actually is.
 * Pure CSS, no network dependency, themes automatically via the shared
 * parchment custom properties (light and dark alike).
 */
export function PortraitFallback({ className, markOpacity = 0.14, family = 'neutral' }: PortraitFallbackProps) {
  const texture = FAMILY_TEXTURE[family]
  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: texture.base }} />
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: '-10%', opacity: texture.patternOpacity, backgroundImage: texture.pattern }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 38%, transparent 0%, color-mix(in srgb, var(--color-parchment-200) 45%, transparent) 100%)',
        }}
      />
      <div className="absolute bottom-3 right-3" style={{ opacity: markOpacity }}>
        <div className="h-6 w-6">
          <CrucibleMark className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}

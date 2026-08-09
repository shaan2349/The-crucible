import { usePortrait } from '../hooks/usePortrait'
import { PortraitFallback } from './PortraitFallback'

interface PortraitFrameProps {
  id: string
  size?: number
  aspect?: string
  duotone?: string
  frameAccent?: string
  className?: string
  busted?: boolean
}

/**
 * A portrait as a genuine framed object, not a cropped background. Uses
 * `object-fit: contain` inside a fixed aspect ratio instead of `cover` —
 * the whole photo as originally composed is always visible, never
 * amputated (a face cut in half) or blown up past its own resolution
 * into an unrecognizable close-up. Both were real bugs with the old
 * background-image + cover approach once a portrait became a focal
 * point rather than ambient texture.
 */
export function PortraitFrame({
  id,
  size = 700,
  aspect = '3/4',
  duotone = 'url(#duotone-neutral)',
  frameAccent = '#8a2a1240',
  className,
  busted = true,
}: PortraitFrameProps) {
  const { url, failed } = usePortrait(id, size)

  return (
    <div
      className={className}
      style={{
        aspectRatio: aspect,
        borderRadius: '0.75rem',
        border: `1px solid ${frameAccent}`,
        boxShadow: 'var(--shadow-card-lifted)',
        background: 'linear-gradient(155deg, var(--color-parchment-200), var(--color-parchment-300))',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {busted && <PortraitFallback markOpacity={failed ? 0.3 : 0.16} />}
      {url && (
        <img
          key={url}
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: 'contain', filter: duotone, animation: 'backdropFade 0.5s ease' }}
        />
      )}
    </div>
  )
}

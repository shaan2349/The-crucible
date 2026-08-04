import { usePortrait } from '../hooks/usePortrait'
import { initials, photoPosition } from '../data/philosophers'

export function PhilosopherAvatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  const { url } = usePortrait(id, 150)

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, objectPosition: photoPosition(id), filter: 'url(#duotone-neutral)' }}
      />
    )
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-side-gold-soft text-xs font-bold text-parchment-900"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  )
}

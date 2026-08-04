import { usePortrait } from '../hooks/usePortrait'
import { initials } from '../data/philosophers'

export function PhilosopherAvatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  const { url } = usePortrait(id)

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, filter: 'grayscale(0.2) sepia(0.15)' }}
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

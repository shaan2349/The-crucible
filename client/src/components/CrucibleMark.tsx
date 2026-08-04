import { useId } from 'react'

interface CrucibleMarkProps {
  size?: number
  className?: string
}

/**
 * Hand-drawn crucible vessel with a rising flame. The forge gradient
 * (gold -> ember -> char) is reserved for this mark and other
 * high-intensity moments — see design notes in README.
 */
export function CrucibleMark({ size = 40, className }: CrucibleMarkProps) {
  const gid = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gid}-flame`} x1="32" y1="4" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e8a33d" />
          <stop offset="0.55" stopColor="#c2531d" />
          <stop offset="1" stopColor="#8a2a12" />
        </linearGradient>
        <linearGradient id={`${gid}-vessel`} x1="14" y1="30" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c2531d" />
          <stop offset="1" stopColor="#8a2a12" />
        </linearGradient>
      </defs>

      {/* flame */}
      <path
        d="M32 4c-2.6 5.4-8 9.6-8 15.4 0 4 2.7 6.7 5.8 7.6-1.7-2.7-1.9-5-.6-7.6 1 3 2.8 4.3 4.6 5.7 2.2 1.7 4.2 3.6 4.2 7 0 .9-.1 1.7-.4 2.5 3.9-1.8 6.4-5.6 6.4-10.2 0-8-7.8-11-12-20.4Z"
        fill={`url(#${gid}-flame)`}
      />

      {/* crucible vessel: tapered cup with rim and pouring lip, drawn as one hand-set path */}
      <path
        d="M15 30.5c-.5 3.5-.8 7-.8 9.8 0 10.9 8 17.7 17.8 17.7s17.8-6.8 17.8-17.7c0-2.8-.3-6.3-.8-9.8"
        stroke={`url(#${gid}-vessel)`}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M12.5 29.5c3.9 1.7 12 2.8 19.5 2.8s15.6-1.1 19.5-2.8"
        stroke="#4a3d2a"
        strokeOpacity="0.35"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="58.5" rx="8.5" ry="2.4" fill="#8a2a12" fillOpacity="0.18" />
    </svg>
  )
}

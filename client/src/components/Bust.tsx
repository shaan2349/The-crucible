interface BustProps {
  laurel?: boolean
  bearded?: boolean
  plinth?: boolean
  className?: string
  tone?: string
}

/**
 * Classical bust silhouette, used as a placeholder while a real portrait
 * loads and as decoration in the Library. One base silhouette with
 * laurel/beard/plinth toggles, rather than four near-duplicate
 * components — same visual variety, less to maintain.
 */
export function Bust({ laurel, bearded, plinth, className, tone = 'currentColor' }: BustProps) {
  return (
    <svg viewBox="0 0 100 120" fill="none" className={className} aria-hidden="true">
      {plinth && <rect x="18" y="102" width="64" height="14" rx="1.5" fill={tone} opacity="0.9" />}

      {/* shoulders / drapery */}
      <path
        d="M14 108c0-19 8-30 15-36 3.5 4.5 12.5 7.5 21 7.5s17.5-3 21-7.5c7 6 15 17 15 36Z"
        fill={tone}
      />

      {/* neck */}
      <path d="M42 62v14h16V62Z" fill={tone} />

      {/* head */}
      <path
        d="M50 16c11.6 0 19 9 19 21 0 13.5-8.8 25-19 25s-19-11.5-19-25c0-12 7.4-21 19-21Z"
        fill={tone}
      />

      {bearded && (
        <path
          d="M33 42c0 10 7 20 17 20s17-10 17-20c0 14-7 24-17 24s-17-10-17-24Z"
          fill={tone}
          opacity="0.75"
        />
      )}

      {laurel && (
        <g stroke={tone} strokeWidth="2.2" fill="none" opacity="0.85">
          <path d="M27 26c-6 4-9 12-7 20" strokeLinecap="round" />
          <path d="M73 26c6 4 9 12 7 20" strokeLinecap="round" />
          <path d="M22 30c-3 1-6 3-6 3M22 37c-3 1-6 2-6 2M23 44c-3 0-6 1-6 1" strokeLinecap="round" />
          <path d="M78 30c3 1 6 3 6 3M78 37c3 1 6 2 6 2M77 44c3 0 6 1 6 1" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}

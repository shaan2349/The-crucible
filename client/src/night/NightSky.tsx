import { NIGHT as C } from './theme'

/** A full-bleed night sky: gradient, twinkling stars and a moon. Purely decorative. */
export function NightSky() {
  const stars = Array.from({ length: 110 }, (_, i) => {
    const r = (n: number) => {
      const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    return { x: r(1) * 100, y: r(2) * 100, s: 0.5 + r(3) * 1.2, d: r(4) * 4 }
  })
  return (
    <>
      <style>{`
        @keyframes nsTwinkle { 0%,100% { opacity: .25 } 50% { opacity: .95 } }
        @keyframes nightEnter { from { opacity: 0; transform: translateY(14px); filter: blur(6px) } to { opacity: 1; transform: none; filter: blur(0) } }
        .ns-star { animation: nsTwinkle 3.6s ease-in-out infinite; }
        .night-enter { animation: nightEnter 1.2s cubic-bezier(.16,1,.3,1) both; }
        .night-btn:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .ns-star, .night-enter { animation: none; } }
      `}</style>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="nsSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#05070b" />
            <stop offset=".7" stopColor="#0d1420" />
            <stop offset="1" stopColor="#1d2638" />
          </linearGradient>
          <radialGradient id="nsHalo">
            <stop offset="0" stopColor="#F1E8D2" stopOpacity=".3" />
            <stop offset="1" stopColor="#F1E8D2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#nsSky)" />
        {stars.map((s, i) => (
          <circle key={i} className="ns-star" cx={s.x} cy={s.y} r={s.s * 0.12} fill="#EDE6D6" style={{ animationDelay: `-${s.d}s` }} />
        ))}
        <circle cx="78" cy="20" r="14" fill="url(#nsHalo)" />
        <circle cx="78" cy="20" r="3.4" fill="#F1E8D2" />
        <path d="M0 92 C 25 84, 45 82, 60 86 C 75 90, 88 84, 100 86 L100 100 L0 100 Z" fill="#0f131b" />
      </svg>
    </>
  )
}

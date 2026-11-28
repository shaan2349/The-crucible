import { useEffect, useState } from 'react'
import { NIGHT as C, NIGHT_FONT as F } from './theme'

/** A small oil lamp whose flame flickers while a philosopher thinks, with the
 * words beside it. Below, a thread of light fills toward the usual waiting
 * time, so a long pause never looks like a stall. */
export function Thinking({ text, className = '', eta = 12 }: { text: string; className?: string; /** usual wait, seconds */ eta?: number }) {
  const words = text.replace(/[….]+$/, '')
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    const id = window.setInterval(() => setSecs((performance.now() - t0) / 1000), 250)
    return () => window.clearInterval(id)
  }, [])
  // eases toward the end without ever quite arriving
  const fill = 1 - Math.exp((-1.6 * secs) / eta)
  const hint = secs < 2.5 ? '' : secs < eta * 1.4 ? `Usually about ${Math.round(eta / 5) * 5 || eta} seconds` : 'Taking a little longer than usual'
  return (
    <div role="status" className={`m-0 flex flex-col gap-1.5 ${className}`}>
    <p className="thinking-lamp m-0" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 15, color: C.body }}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <defs>
          <radialGradient id="tlHalo">
            <stop offset="0" stopColor="#FFC877" stopOpacity=".8" />
            <stop offset="1" stopColor="#FFC877" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="tlFlame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF4D6" />
            <stop offset=".55" stopColor="#FFC066" />
            <stop offset="1" stopColor="#E8742C" />
          </linearGradient>
        </defs>
        <circle className="halo" cx="13" cy="10" r="10" fill="url(#tlHalo)" />
        <path className="flame" d="M13 15 C 10.5 12.5, 11.5 9.5, 13 6 C 14.5 9.5, 15.5 12.5, 13 15 Z" fill="url(#tlFlame)" />
        <path d="M5 19 C 8 15.5, 18 15.5, 22 17.5 C 20 21, 9 22, 5 19 Z" fill="#8A6A3A" />
        <path d="M4 19 C 3 18, 3.5 16.5, 6 17" stroke="#8A6A3A" strokeWidth="1.4" fill="none" />
        <rect x="11" y="21" width="5" height="1.6" rx=".8" fill="#6E5330" />
      </svg>
      <span>
        {words}
        <span className="dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
    </p>
      <div aria-hidden="true" className="ml-9 flex items-center gap-3" style={{ opacity: secs < 2.5 ? 0 : 1, transition: 'opacity .8s ease' }}>
        <span className="relative h-px w-28 overflow-hidden" style={{ background: 'rgba(194,161,94,.18)' }}>
          <span className="absolute inset-y-0 left-0" style={{ width: `${fill * 100}%`, background: 'linear-gradient(90deg, rgba(255,200,119,.2), #FFC877)', boxShadow: '0 0 6px #FFC877', transition: 'width .25s linear' }} />
        </span>
        <span style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 12.5, color: C.muted }}>{hint}</span>
      </div>
    </div>
  )
}

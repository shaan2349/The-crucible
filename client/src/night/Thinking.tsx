import { NIGHT as C, NIGHT_FONT as F } from './theme'

/** A small oil lamp whose flame flickers while a philosopher thinks, with the words beside it. */
export function Thinking({ text, className = '' }: { text: string; className?: string }) {
  const words = text.replace(/[….]+$/, '')
  return (
    <p role="status" className={`thinking-lamp m-0 ${className}`} style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 15, color: C.body }}>
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
  )
}

import type { CSSProperties, ReactNode } from 'react'

/**
 * The night world's own icons, drawn as if engraved: fine strokes with small
 * serifs, and classical emblems where one fits (an owl for your seat, a
 * lyre for sound). Same names and props as the stock set they replace.
 */
type P = { className?: string; style?: CSSProperties; strokeWidth?: number }

function Icon({ className, style, strokeWidth = 1.5, children }: P & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      {children}
    </svg>
  )
}

/** Back: an arrow with a fletched tail. */
export const ArrowLeft = (p: P) => (
  <Icon {...p}>
    <path d="M20 12H5" />
    <path d="M10 6.5 4.5 12l5.5 5.5" />
    <path d="M20 12l1.5-2M20 12l1.5 2M17.5 12l1.5-2M17.5 12l1.5 2" strokeWidth={1} />
  </Icon>
)

export const ArrowRight = (p: P) => (
  <Icon {...p}>
    <path d="M4 12h15" />
    <path d="M14 6.5 19.5 12 14 17.5" />
    <path d="M4 12 2.5 10M4 12l-1.5 2M6.5 12 5 10M6.5 12 5 14" strokeWidth={1} />
  </Icon>
)

export const ChevronLeft = (p: P) => (
  <Icon {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
    <path d="M17 9.5 14.5 12l2.5 2.5" strokeWidth={1} />
  </Icon>
)

export const ChevronRight = (p: P) => (
  <Icon {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
    <path d="M7 9.5 9.5 12 7 14.5" strokeWidth={1} />
  </Icon>
)

/** Close: two crossed strokes with serifed ends. */
export const X = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
    <path d="M4.8 7.2 7.2 4.8M16.8 19.2l2.4-2.4M16.8 4.8l2.4 2.4M4.8 16.8l2.4 2.4" strokeWidth={1} />
  </Icon>
)

export const Plus = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
    <path d="M10.5 5h3M10.5 19h3M5 10.5v3M19 10.5v3" strokeWidth={1} />
  </Icon>
)

/** Find: a lens in a bronze ring. */
export const Search = (p: P) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="5.5" />
    <circle cx="10.5" cy="10.5" r="3.6" strokeWidth={0.8} />
    <path d="M15 15l5 5" strokeWidth={2} />
  </Icon>
)

/** Speak: a microphone with a fluted body on a small pedestal. */
export const Mic = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M11 6v5M13 6v5" strokeWidth={0.8} />
    <path d="M6 11a6 6 0 0 0 12 0" />
    <path d="M12 17v3M8.5 20.5h7" />
  </Icon>
)

export const Play = (p: P) => (
  <Icon {...p}>
    <path d="M8 5.5v13L18.5 12Z" />
    <path d="M10 9v6l4.2-3Z" strokeWidth={0.8} />
  </Icon>
)

export const Square = (p: P) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <rect x="9" y="9" width="6" height="6" strokeWidth={0.8} />
  </Icon>
)

/** Your seat: Athena's owl. */
export const User = (p: P) => (
  <Icon {...p} strokeWidth={p.strokeWidth ?? 1.3}>
    <path d="M6 7.5C6 5 8 3.5 12 5.2 16 3.5 18 5 18 7.5v6c0 4-2.7 6.5-6 6.5s-6-2.5-6-6.5Z" />
    <circle cx="9.4" cy="9.6" r="1.9" />
    <circle cx="14.6" cy="9.6" r="1.9" />
    <path d="M11.2 12.3 12 13.6l.8-1.3" />
    <path d="M9 16c1 .9 2 1.2 3 1.2s2-.3 3-1.2" strokeWidth={0.9} />
    <path d="M6 7.5 4.6 5.2M18 7.5l1.4-2.3" strokeWidth={1} />
  </Icon>
)

/** Sound on: a lyre. */
export const Volume2 = (p: P) => (
  <Icon {...p} strokeWidth={p.strokeWidth ?? 1.3}>
    <path d="M7.5 4C5 6 5.2 10 7.5 12.5 6.5 15.5 7.5 18.5 12 20c4.5-1.5 5.5-4.5 4.5-7.5C18.8 10 19 6 16.5 4" />
    <path d="M6.6 6h10.8" />
    <path d="M10 6.2v11.6M12 6.2v12.8M14 6.2v11.6" strokeWidth={0.8} />
  </Icon>
)

/** Sound off: the lyre, struck through. */
export const VolumeX = (p: P) => (
  <Icon {...p} strokeWidth={p.strokeWidth ?? 1.3}>
    <path d="M7.5 4C5 6 5.2 10 7.5 12.5 6.5 15.5 7.5 18.5 12 20c4.5-1.5 5.5-4.5 4.5-7.5C18.8 10 19 6 16.5 4" opacity={0.55} />
    <path d="M6.6 6h10.8" opacity={0.55} />
    <path d="M4 4l16 16" strokeWidth={1.6} />
  </Icon>
)

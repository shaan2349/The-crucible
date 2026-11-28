import { NIGHT as C } from './theme'

/** Philosophers speak in first person here; this says plainly that they are portrayals. */
export function AiNote({ className = '' }: { className?: string }) {
  return (
    <p className={`m-0 ${className}`} style={{ fontSize: 12, lineHeight: 1.45, color: C.muted, opacity: 0.85 }}>
      <span aria-hidden="true" style={{ color: C.gilt }}>◆ </span>
      AI portrayals, written in the spirit of each thinker’s ideas. Not their real words.
    </p>
  )
}

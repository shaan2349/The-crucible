import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import type { Premise } from '../types'

const STATUS_TEXT: Record<Premise['status'], string> = {
  standing: 'text-parchment-800',
  weakened: 'text-status-warning',
  conceded: 'text-parchment-400 line-through decoration-parchment-400/70',
}
const STATUS_LABEL: Record<Premise['status'], string> = {
  standing: '',
  weakened: 'Weakened',
  conceded: 'Conceded',
}

/**
 * A single assumption underneath the user's position — plain typography,
 * not a boxed card. The status (standing/weakened/conceded) is carried by
 * text color and a small word, not a colored background block; this is
 * meant to read as intellectually rigorous prose, not a debate-game UI.
 */
export function PremiseRow({ premise, index = 0 }: { premise: Premise; index?: number }) {
  const prevStatus = useRef(premise.status)
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    if (prevStatus.current !== premise.status) {
      prevStatus.current = premise.status
      setPulsing(true)
      const t = setTimeout(() => setPulsing(false), 900)
      return () => clearTimeout(t)
    }
  }, [premise.status])

  return (
    <div
      className="flex items-baseline gap-3 py-1.5"
      style={{ animation: 'revealUp 0.45s ease both', animationDelay: `${index * 70}ms` }}
    >
      <span className="shrink-0 font-display text-xs font-semibold italic text-parchment-500">
        P{premise.id.replace(/^p/, '')}
      </span>
      <span
        className={clsx(
          'flex-1 text-sm leading-relaxed transition-colors duration-700',
          pulsing ? 'text-forge-ember' : STATUS_TEXT[premise.status],
        )}
      >
        {premise.text}
      </span>
      {STATUS_LABEL[premise.status] && (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-parchment-400">
          {STATUS_LABEL[premise.status]}
        </span>
      )}
    </div>
  )
}

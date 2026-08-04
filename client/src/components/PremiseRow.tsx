import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import type { Premise } from '../types'

const STATUS_STYLE: Record<Premise['status'], string> = {
  standing: 'bg-parchment-50 text-parchment-900',
  weakened: 'bg-amber-50 text-amber-900',
  conceded: 'bg-rose-50 text-rose-700 line-through decoration-rose-500/70',
}
const STATUS_DOT: Record<Premise['status'], string> = {
  standing: '#8b7350',
  weakened: '#c08a2e',
  conceded: '#b23a3a',
}
const STATUS_LABEL: Record<Premise['status'], string> = {
  standing: 'Standing',
  weakened: 'Weakened',
  conceded: 'Conceded',
}

export function PremiseRow({ premise, index = 0 }: { premise: Premise; index?: number }) {
  const prevStatus = useRef(premise.status)
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    if (prevStatus.current !== premise.status) {
      prevStatus.current = premise.status
      setPulsing(true)
      const t = setTimeout(() => setPulsing(false), 700)
      return () => clearTimeout(t)
    }
  }, [premise.status])

  return (
    <div
      className="relative mb-2.5 last:mb-0"
      style={{ animation: 'revealUp 0.45s ease both', animationDelay: `${index * 70}ms` }}
    >
      <span
        className="absolute -left-[19px] top-3 h-2.5 w-2.5 rounded-full border-2 border-parchment-100"
        style={{
          background: STATUS_DOT[premise.status],
          animation: pulsing ? 'pulseDot 0.7s ease-out' : 'none',
        }}
      />
      <div
        className={clsx(
          'flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 text-sm leading-relaxed transition-all duration-500',
          STATUS_STYLE[premise.status],
          pulsing && 'ring-2 ring-forge-gold/60',
        )}
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <span className="mt-px shrink-0 font-display text-xs italic text-parchment-500">
          {premise.id.replace(/^p/, '')}.
        </span>
        <span className="flex-1">{premise.text}</span>
        {premise.status !== 'standing' && (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {STATUS_LABEL[premise.status]}
          </span>
        )}
      </div>
    </div>
  )
}

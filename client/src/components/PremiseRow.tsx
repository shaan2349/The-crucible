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

export function PremiseRow({ premise }: { premise: Premise }) {
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
    <div className="relative mb-2.5 last:mb-0">
      <span
        className="absolute -left-[19px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-parchment-100"
        style={{
          background: STATUS_DOT[premise.status],
          animation: pulsing ? 'pulseDot 0.7s ease-out' : 'none',
        }}
      />
      <div
        className={clsx(
          'rounded-lg px-3 py-2 text-sm transition-all duration-500',
          STATUS_STYLE[premise.status],
          pulsing && 'ring-2 ring-forge-gold/60',
        )}
      >
        <span className="mr-2 font-mono text-[10px] opacity-50">{premise.id}</span>
        {premise.text}
        {premise.status !== 'standing' && (
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {premise.status}
          </span>
        )}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  decoration?: ReactNode
  headline: string
  body: string
  action?: { label: ReactNode; onClick: () => void }
  className?: string
}

/**
 * The one empty-state shape used everywhere (Council, Journal, Profile,
 * Train) — previously each screen hand-copied the same card markup with
 * small drifts. Centralizing it means every empty screen automatically
 * stays visually identical and any future polish (motion, spacing) only
 * needs to happen once.
 */
export function EmptyState({ icon, decoration, headline, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={`relative mt-2 flex flex-col items-center overflow-hidden rounded-2xl border border-parchment-300/70 bg-parchment-50 px-6 py-14 text-center ${className ?? ''}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {decoration}
      {icon}
      <p className="relative mt-4 font-display text-lg text-parchment-700">{headline}</p>
      <p className="relative mt-1.5 max-w-[30ch] text-sm text-parchment-500">{body}</p>
      {action && (
        <Button className="relative mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

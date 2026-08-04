import type { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** default = standard content card. hero = the one thing on a screen
   * that should feel like the main event (lifted shadow, warm gradient
   * ground instead of flat parchment). */
  variant?: 'default' | 'hero'
}

/**
 * Shared "object resting on the page" treatment — layered shadow (inner
 * paper highlight + close shadow + soft ambient shadow) instead of a
 * flat border, so cards read as physical rather than drawn rectangles.
 * Reused across every section rather than each screen inventing its own
 * card styling ad hoc.
 */
export function Card({ variant = 'default', className, style, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={clsx('rounded-2xl border', variant === 'default' ? 'border-parchment-300/70 bg-parchment-50' : 'border-forge-gold/40', className)}
      style={{
        boxShadow: variant === 'hero' ? 'var(--shadow-card-lifted)' : 'var(--shadow-card)',
        background: variant === 'hero' ? 'linear-gradient(155deg, #f3ddb0 0%, #f8f2e6 60%)' : undefined,
        ...style,
      }}
    />
  )
}

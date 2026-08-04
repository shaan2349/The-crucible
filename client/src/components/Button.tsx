import type { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'subtle'
}

const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'text-parchment-50 font-semibold shadow-embossed hover:brightness-110',
  ghost: 'bg-transparent border border-parchment-400 hover:border-parchment-500 text-parchment-900',
  subtle: 'bg-parchment-200 hover:bg-parchment-300 text-parchment-900',
}

export function Button({ variant = 'primary', className, style, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={variant === 'primary' ? { background: 'linear-gradient(135deg, #e8a33d, #c2531d, #8a2a12)', ...style } : style}
      className={clsx(
        'rounded-lg px-4 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        VARIANT_CLASS[variant],
        className,
      )}
    />
  )
}

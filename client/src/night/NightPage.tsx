import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { NIGHT as C, NIGHT_FONT as F } from './theme'
import { NightSky } from './NightSky'

/** A plain full-screen page in the night world: sky behind, a header with a way back, content in a column. */
export function NightPage({ title, eyebrow, back = '/app', backLabel = 'Back to the sanctuary', children }: { title: string; eyebrow: string; back?: string; backLabel?: string; children: ReactNode }) {
  const navigate = useNavigate()
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <NightSky />
      <header className="relative z-[1] flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: C.line, background: 'rgba(11,13,17,.7)', paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate(back)} className="night-btn flex h-11 w-11 items-center justify-center rounded-full" aria-label={backLabel}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 19 }}>{title}</h1>
          <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>{eyebrow}</span>
        </div>
      </header>
      <main className="relative z-[1] min-h-0 flex-1 overflow-y-auto">
        <div className="night-enter mx-auto flex w-full max-w-[560px] flex-col gap-4 px-5 pb-12 pt-6">{children}</div>
      </main>
    </div>,
    document.body,
  )
}

export function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded p-4" style={{ background: 'rgba(17,20,26,.85)', border: `1px solid ${C.line}` }}>
      <h2 className="m-0" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>{label}</h2>
      {children}
    </section>
  )
}

/** A row of mutually exclusive choices. */
export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={label}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <div className="flex gap-1.5">
        {options.map((o) => {
          const on = o.id === value
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id)} className="night-btn min-h-[42px] flex-1 rounded border px-2" style={on ? { borderColor: C.gilt, background: 'rgba(194,161,94,.16)', color: C.gold, fontWeight: 600 } : { borderColor: C.line, color: C.body }}>
              {o.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="night-btn flex min-h-[44px] w-full items-center justify-between rounded">
      <span style={{ color: C.body }}>{label}</span>
      <span className="relative h-6 w-11 rounded-full transition-colors" style={{ background: on ? C.gilt : '#2E333B' }}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full transition-transform" style={{ background: C.ivory, transform: on ? 'translateX(22px)' : 'translateX(2px)' }} />
      </span>
    </button>
  )
}

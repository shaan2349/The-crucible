import { philosopherById, initials } from '../data/philosophers'

export function PhilosopherTag({ id, accent }: { id: string; accent?: string }) {
  const p = philosopherById(id)
  if (!p) return null
  const style = accent
    ? { borderColor: `${accent}80`, background: `${accent}1a`, color: accent }
    : undefined
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-forge-gold/50 bg-side-gold-soft/60 py-1 pl-1 pr-2.5 text-xs font-medium text-parchment-800 shadow-sm"
      style={style}
    >
      <span
        className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-parchment-50"
        style={{ background: accent ?? '#c17f1f' }}
      >
        {initials(p.name)}
      </span>
      {p.name}
    </span>
  )
}

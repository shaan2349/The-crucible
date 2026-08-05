import { philosopherById } from '../data/philosophers'
import { RELATIONSHIPS, relationshipsFor } from '../data/relationships'
import { layoutCluster, toRoman, shortLabel } from '../lib/firmamentLayout'

interface FirmamentPlateProps {
  name: string
  plateNumber: number
  ids: string[]
  onSelect: (id: string) => void
  clusterNameOf: (id: string) => string
}

export function FirmamentPlate({ name, plateNumber, ids, onSelect, clusterNameOf }: FirmamentPlateProps) {
  const idSet = new Set(ids)
  const nodes = layoutCluster(ids, { x0: 6, y0: 8, w: 88, h: 48 })
  const posById = Object.fromEntries(nodes.map((n) => [n.id, n]))

  const intraEdges = RELATIONSHIPS.filter((r) => idSet.has(r.a) && idSet.has(r.b))

  const seen = new Set<string>()
  const crossLinks = ids
    .flatMap((id) => relationshipsFor(id).filter((r) => !idSet.has(r.otherId)))
    .filter((r) => {
      const key = [r.a, r.b].sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return (
    <div className="mb-9" style={{ animation: 'revealUp 0.4s ease both' }}>
      <div className="mb-3 flex items-baseline gap-2.5 border-b-2 border-double border-parchment-400/70 pb-1.5">
        <p className="font-display text-[11px] uppercase tracking-[0.2em] text-parchment-500">
          Plate {toRoman(plateNumber)}
        </p>
        <p className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-parchment-700">{name}</p>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-parchment-300/60"
        style={{
          background:
            'radial-gradient(ellipse at 50% 38%, rgba(44,35,24,0.06), transparent 65%), linear-gradient(160deg, var(--color-parchment-100), var(--color-parchment-300))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <svg viewBox="0 0 100 64" className="block w-full">
          {intraEdges.map((r) => {
            const p1 = posById[r.a]
            const p2 = posById[r.b]
            if (!p1 || !p2) return null
            return (
              <line
                key={`${r.a}-${r.b}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={r.kind === 'rivalry' ? '#8a2a1260' : '#c17f1f60'}
                strokeWidth={0.35}
                strokeDasharray={r.kind === 'rivalry' ? '1.4,1.1' : undefined}
              />
            )
          })}
          {nodes.map((n) => {
            const p = philosopherById(n.id)
            if (!p) return null
            return (
              <g key={n.id} onClick={() => onSelect(n.id)} style={{ cursor: 'pointer' }}>
                <circle cx={n.x} cy={n.y} r={3.2} fill="#e8a33d2e" />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={1.15}
                  fill="#c2531d"
                  style={{ stroke: 'var(--color-parchment-50)' }}
                  strokeWidth={0.3}
                />
                <text
                  x={n.x}
                  y={n.y + 4.4}
                  textAnchor="middle"
                  fontSize={3}
                  fontStyle="italic"
                  fontWeight={500}
                  fill="#4a3d2a"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {shortLabel(p.name)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {crossLinks.length > 0 && (
        <div className="mt-2.5 space-y-1 border-l border-parchment-400/60 pl-3">
          {crossLinks.map((r) => (
            <button
              key={`${r.a}-${r.b}`}
              type="button"
              onClick={() => onSelect(r.otherId)}
              className="block text-left text-[11px] italic leading-snug text-parchment-500 hover:text-forge-ember"
            >
              → {r.note} — crosses into {clusterNameOf(r.otherId)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

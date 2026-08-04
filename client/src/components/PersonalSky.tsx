import { PHILOSOPHER_CATEGORIES, philosopherById } from '../data/philosophers'
import { layoutCluster, shortLabel } from '../lib/firmamentLayout'

interface PersonalSkyProps {
  /** Philosopher id -> number of debates you've had with them. */
  visited: Record<string, number>
}

const COLS = 2
const CELL_W = 50
const CELL_H = 42

const SHORT_CLUSTER_NAME: Record<string, string> = {
  'Enlightenment & Early Modern': 'Enlightenment',
  '20th Century Political & Analytic': '20th Century',
  'Existentialist & Continental': 'Existentialist',
}

export function PersonalSky({ visited }: PersonalSkyProps) {
  const counts = Object.values(visited)
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1

  return (
    <svg viewBox="0 0 100 168" className="block w-full">
      {PHILOSOPHER_CATEGORIES.map((cat, i) => {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const box = { x0: col * CELL_W + 3, y0: row * CELL_H + 4, w: CELL_W - 6, h: CELL_H - 8 }
        const nodes = layoutCluster([...cat.ids], box)
        return (
          <g key={cat.name}>
            <text
              x={box.x0}
              y={box.y0 - 0.5}
              fontSize={2.3}
              fill="#95784f"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}
            >
              {(SHORT_CLUSTER_NAME[cat.name] ?? cat.name).toUpperCase()}
            </text>
            {nodes.map((n) => {
              const count = visited[n.id] ?? 0
              const isLit = count > 0
              const p = philosopherById(n.id)
              if (!p) return null
              const r = isLit ? 0.85 + (count / maxCount) * 1.2 : 0.4
              return (
                <g key={n.id}>
                  {isLit && <circle cx={n.x} cy={n.y} r={r + 1.7} fill="#e8a33d2e" />}
                  <circle cx={n.x} cy={n.y} r={r} fill={isLit ? '#c2531d' : '#c4b28f'} opacity={isLit ? 1 : 0.55} />
                  {isLit && (
                    <text
                      x={n.x}
                      y={n.y + r + 2.5}
                      textAnchor="middle"
                      fontSize={2.2}
                      fontStyle="italic"
                      fontWeight={500}
                      fill="#4a3d2a"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {shortLabel(p.name)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

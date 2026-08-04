import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { philosopherById } from '../data/philosophers'
import { Card } from '../components/Card'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { loadDebates } from '../lib/storage'
import type { Debate } from '../types'

export function History() {
  const [debates, setDebates] = useState<Debate[]>([])
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    setDebates(loadDebates())
  }, [])

  const tally: Record<string, number> = {}
  debates.forEach((d) => {
    if (d.verdict?.leanedFramework) {
      tally[d.verdict.leanedFramework] = (tally[d.verdict.leanedFramework] ?? 0) + 1
    }
  })
  const top = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <>
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
        <header className="mb-6">
          <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
            The Ledger
          </p>
          <h1 className="font-display text-2xl font-medium text-parchment-900">Your fingerprint</h1>
          <p className="mt-1 text-sm text-parchment-600">
            Which frameworks you tend to lean on, across debates.
          </p>
        </header>

        {debates.length === 0 && (
          <Card className="border-dashed py-14 text-center text-sm text-parchment-500" style={{ boxShadow: 'none' }}>
            No debates saved yet — finish one in the Crucible to start building your profile.
          </Card>
        )}

        {top.length > 0 && (
          <Card className="p-5">
            {top.map(([framework, count], i) => (
              <div key={framework} className={i > 0 ? 'mt-3' : undefined}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="font-display text-sm italic text-parchment-800">{framework}</span>
                  <span className="shrink-0 font-display text-xs text-parchment-500">{count}×</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-parchment-200"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(74,61,42,0.15)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / debates.length) * 100}%`,
                      background: 'linear-gradient(90deg, #e8a33d, #c2531d)',
                    }}
                  />
                </div>
              </div>
            ))}
          </Card>
        )}

        {debates.length > 0 && (
          <>
            <p className="mb-3 mt-8 font-display text-xl font-medium text-parchment-900">Past debates</p>
            <div className="space-y-2.5">
              {debates
                .slice()
                .reverse()
                .map((d) => {
                  const date = new Date(d.id)
                  const day = date.getDate()
                  const month = date.toLocaleDateString(undefined, { month: 'short' })
                  return (
                    <Card key={d.id} className="overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === d.id ? null : d.id)}
                        className="flex w-full items-start gap-3.5 p-4 text-left"
                      >
                        <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-parchment-200 py-1.5">
                          <span className="font-display text-lg font-semibold leading-none text-parchment-900">
                            {day}
                          </span>
                          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-parchment-500">
                            {month}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-parchment-900">{d.claim}</p>
                          <p className="mt-1.5 text-xs text-parchment-500">
                            {d.philosopherIds.map((id) => philosopherById(id)?.name).join(' and ')}
                          </p>
                        </div>
                        {openId === d.id ? (
                          <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-parchment-500" />
                        ) : (
                          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-parchment-500" />
                        )}
                      </button>
                      {openId === d.id && d.verdict && (
                        <div
                          className="space-y-2.5 border-t border-parchment-300 px-4 pb-4 pt-3 text-sm text-parchment-800"
                          style={{ animation: 'revealUp 0.3s ease both' }}
                        >
                          <p>
                            <span className="font-medium text-parchment-600">Sharpened claim:</span>{' '}
                            {d.verdict.sharpenedClaim}
                          </p>
                          <p>
                            <span className="font-medium text-parchment-600">Leaned on:</span>{' '}
                            {d.verdict.leanedFramework}
                          </p>
                        </div>
                      )}
                    </Card>
                  )
                })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { philosopherById } from '../data/philosophers'
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
        <h1 className="font-display text-2xl font-medium text-parchment-900">Your fingerprint</h1>
        <p className="mt-1 text-sm text-parchment-600">
          Which frameworks you tend to lean on, across debates.
        </p>
      </header>

      {debates.length === 0 && (
        <div className="rounded-2xl border border-dashed border-parchment-300 py-14 text-center text-sm text-parchment-500">
          No debates saved yet — finish one in the Crucible to start building your profile.
        </div>
      )}

      {top.length > 0 && (
        <div className="space-y-2">
          {top.map(([framework, count]) => (
            <div key={framework} className="flex items-center gap-3">
              <span className="w-40 truncate text-xs text-parchment-700">{framework}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-parchment-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / debates.length) * 100}%`,
                    background: 'linear-gradient(90deg, #e8a33d, #c2531d)',
                  }}
                />
              </div>
              <span className="text-xs text-parchment-500">{count}</span>
            </div>
          ))}
        </div>
      )}

      {debates.length > 0 && (
        <>
          <p className="mb-3 mt-8 font-display text-xl font-medium text-parchment-900">Past debates</p>
          <div className="space-y-2">
            {debates
              .slice()
              .reverse()
              .map((d) => (
                <div key={d.id} className="rounded-xl border border-parchment-300 bg-parchment-50">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === d.id ? null : d.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-parchment-900">{d.claim}</p>
                      <p className="mt-1 text-xs text-parchment-500">
                        {new Date(d.id).toLocaleDateString()} ·{' '}
                        {d.philosopherIds.map((id) => philosopherById(id)?.name).join(' vs ')}
                      </p>
                    </div>
                    {openId === d.id ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-parchment-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-parchment-500" />
                    )}
                  </button>
                  {openId === d.id && d.verdict && (
                    <div className="space-y-2 border-t border-parchment-300 px-4 pb-4 pt-3 text-sm text-parchment-800">
                      <p>
                        <span className="text-parchment-500">Sharpened claim:</span> {d.verdict.sharpenedClaim}
                      </p>
                      <p>
                        <span className="text-parchment-500">Leaned on:</span> {d.verdict.leanedFramework}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
      </div>
    </>
  )
}

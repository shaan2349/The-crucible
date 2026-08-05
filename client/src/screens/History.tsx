import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { philosopherById } from '../data/philosophers'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PersonalSky } from '../components/PersonalSky'
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
  const visited: Record<string, number> = {}
  debates.forEach((d) => {
    if (d.verdict?.leanedFramework) {
      tally[d.verdict.leanedFramework] = (tally[d.verdict.leanedFramework] ?? 0) + 1
    }
    d.philosopherIds.forEach((id) => {
      visited[id] = (visited[id] ?? 0) + 1
    })
  })
  const top = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const openEntry = openId != null ? debates.find((d) => d.id === openId) ?? null : null

  return (
    <>
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
        {openEntry ? (
          <JournalEntry
            debate={openEntry}
            allDebates={debates}
            onBack={() => setOpenId(null)}
            onJump={setOpenId}
          />
        ) : (
          <>
            <header className="mb-6">
              <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
                The Journal
              </p>
              <h1 className="font-display text-2xl font-medium text-parchment-900">Your philosophical journal</h1>
              <p className="mt-1 text-sm text-parchment-600">Which frameworks you tend to reach for, across debates.</p>
            </header>

            {debates.length === 0 && (
              <EmptyState
                icon={<BookOpen className="h-9 w-9 text-parchment-400" />}
                headline="A blank page"
                body="Finish a debate in the Crucible and it'll be entered here."
              />
            )}

            {debates.length > 0 && (
              <Card className="overflow-hidden p-5">
                <p className="mb-1 font-display text-[13px] italic text-forge-ember">Your Firmament</p>
                <p className="mb-3 text-xs text-parchment-500">
                  The same sky as the Library — but only the minds you've actually crossed paths with are lit.
                </p>
                <PersonalSky visited={visited} />
              </Card>
            )}

            {top.length > 0 && (
              <Card className="mt-5 p-5">
                <p className="mb-3 font-display text-[13px] italic text-forge-ember">Recurring threads</p>
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
                <p className="mb-3 mt-8 font-display text-xl font-medium text-parchment-900">Entries</p>
                <div className="space-y-3">
                  {debates
                    .slice()
                    .reverse()
                    .map((d, i) => {
                      const date = new Date(d.id)
                      const day = date.getDate()
                      const month = date.toLocaleDateString(undefined, { month: 'short' })
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setOpenId(d.id)}
                          className="block w-full text-left"
                          style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${Math.min(i, 6) * 50}ms` }}
                        >
                          <Card className="relative overflow-hidden p-4">
                            <div
                              className="absolute right-0 top-0 h-5 w-5"
                              style={{
                                background:
                                  'linear-gradient(135deg, transparent 50%, var(--color-parchment-300) 50%)',
                              }}
                            />
                            <div className="flex items-start gap-3.5">
                              <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-parchment-200 py-1.5">
                                <span className="font-display text-lg font-semibold leading-none text-parchment-900">
                                  {day}
                                </span>
                                <span className="mt-0.5 text-[10px] uppercase tracking-wide text-parchment-500">
                                  {month}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-display text-[15px] italic leading-snug text-parchment-900">
                                  &ldquo;{d.claim}&rdquo;
                                </p>
                                <p className="mt-1.5 text-xs text-parchment-500">
                                  with {d.philosopherIds.map((id) => philosopherById(id)?.name).join(' and ')}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </button>
                      )
                    })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

function relatedEntries(debate: Debate, all: Debate[]): Debate[] {
  return all
    .filter((d) => d.id !== debate.id)
    .filter(
      (d) =>
        (debate.verdict && d.verdict?.leanedFramework === debate.verdict.leanedFramework) ||
        d.philosopherIds.some((id) => debate.philosopherIds.includes(id)),
    )
    .slice(0, 3)
}

function JournalEntry({
  debate,
  allDebates,
  onBack,
  onJump,
}: {
  debate: Debate
  allDebates: Debate[]
  onBack: () => void
  onJump: (id: number) => void
}) {
  const date = new Date(debate.id)
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const related = relatedEntries(debate, allDebates)

  return (
    <div style={{ animation: 'unfurl 0.45s ease both', transformOrigin: 'top center' }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the journal
      </button>

      <p className="mb-1.5 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">{dateStr}</p>
      <p className="font-display text-xl italic leading-snug text-parchment-900">&ldquo;{debate.claim}&rdquo;</p>
      <p className="mt-2 text-sm text-parchment-500">
        Debated with {debate.philosopherIds.map((id) => philosopherById(id)?.name).join(' and ')}
      </p>

      {debate.verdict && (
        <div className="mt-6 space-y-3">
          <Card variant="hero" className="p-5">
            <p className="mb-1.5 font-display text-sm font-medium uppercase tracking-wide text-forge-ember">
              Sharpened claim
            </p>
            <p className="font-display text-lg leading-snug text-parchment-900">{debate.verdict.sharpenedClaim}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">Weakest premise</p>
            <p className="text-sm leading-relaxed text-parchment-800">{debate.verdict.weakestReason}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">You leaned on</p>
            <p className="text-sm leading-relaxed text-parchment-800">{debate.verdict.leanedFramework}</p>
          </Card>
          {debate.userReflection && (
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Your reflection</p>
              <p className="text-sm leading-relaxed text-parchment-800">{debate.userReflection}</p>
            </Card>
          )}
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-7">
          <p className="mb-2.5 font-display text-[13px] italic text-forge-ember">You may also want to revisit</p>
          <div className="space-y-2">
            {related.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onJump(r.id)}
                className="block w-full rounded-xl bg-parchment-50 px-3.5 py-2.5 text-left text-sm text-parchment-800"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                &ldquo;{r.claim}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

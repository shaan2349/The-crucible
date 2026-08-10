import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search } from 'lucide-react'
import { philosopherById } from '../data/philosophers'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PortraitFrame } from '../components/PortraitFrame'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { loadDebates } from '../lib/storage'
import type { Debate } from '../types'

type DateFilter = 'all' | 'week' | 'month'
type EntryStatus = 'changed' | 'unchanged' | 'unresolved'

const STATUS_LABEL: Record<EntryStatus, string> = {
  changed: 'Changed',
  unchanged: 'Unchanged',
  unresolved: 'Unresolved',
}
const STATUS_COLOR: Record<EntryStatus, string> = {
  changed: 'var(--color-status-success)',
  unchanged: 'var(--color-parchment-500)',
  unresolved: 'var(--color-status-warning)',
}

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / 86_400_000)
}

function timeAgo(days: number): string {
  if (days < 1) return 'today'
  if (days === 1) return 'a day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  if (months <= 1) return 'a month ago'
  if (months < 12) return `${months} months ago`
  const years = Math.round(months / 12)
  return years <= 1 ? 'a year ago' : `${years} years ago`
}

function entryStatus(d: Debate): EntryStatus {
  if (!d.userReflection?.trim()) return 'unresolved'
  if (d.verdict?.sharpenedClaim && d.verdict.sharpenedClaim.trim().toLowerCase() !== d.claim.trim().toLowerCase()) {
    return 'changed'
  }
  return 'unchanged'
}

/** A single headline insight drawn from real entries, prioritized by how
 * strong the signal is — a clearly dominant thinker beats a merely
 * repeated framework beats "you've been at this a while." Returns null
 * when there isn't enough data or no pattern is strong enough to be
 * worth stating; the caller shows a plain "patterns will emerge" line
 * in that case rather than a fabricated or trivial one. */
function journalInsight(debates: Debate[]): string | null {
  if (debates.length < 3) return null

  const philosopherCounts: Record<string, number> = {}
  const frameworkCounts: Record<string, number> = {}
  debates.forEach((d) => {
    d.philosopherIds.forEach((id) => {
      philosopherCounts[id] = (philosopherCounts[id] ?? 0) + 1
    })
    if (d.verdict?.leanedFramework) {
      frameworkCounts[d.verdict.leanedFramework] = (frameworkCounts[d.verdict.leanedFramework] ?? 0) + 1
    }
  })

  const philosopherEntries = Object.entries(philosopherCounts).sort((a, b) => b[1] - a[1])
  if (philosopherEntries.length > 0) {
    const [topId, topCount] = philosopherEntries[0]
    const runnerUpCount = philosopherEntries[1]?.[1] ?? 0
    if (topCount >= 3 && topCount > runnerUpCount) {
      const name = philosopherById(topId)?.name
      if (name) return `You have challenged ${name} more than any other thinker.`
    }
  }

  const frameworkEntries = Object.entries(frameworkCounts).sort((a, b) => b[1] - a[1])
  if (frameworkEntries.length > 0 && frameworkEntries[0][1] >= 2) {
    return `You keep returning to ${frameworkEntries[0][0]}.`
  }

  const earliest = debates.reduce((min, d) => (d.id < min ? d.id : min), debates[0].id)
  const days = daysSince(earliest)
  if (days >= 14) {
    return `You first started reflecting here ${timeAgo(days)}.`
  }

  return null
}

export function History() {
  const [debates, setDebates] = useState<Debate[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [thinkerFilter, setThinkerFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const navigate = useNavigate()

  useEffect(() => {
    setDebates(loadDebates())
  }, [])

  const visited: Record<string, number> = {}
  debates.forEach((d) => {
    d.philosopherIds.forEach((id) => {
      visited[id] = (visited[id] ?? 0) + 1
    })
  })
  const favourites = Object.entries(visited)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => id)
  const availableThinkers = Object.entries(visited)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  const insight = useMemo(() => journalInsight(debates), [debates])

  const query = search.trim().toLowerCase()
  const filteredDebates = debates.filter((d) => {
    if (thinkerFilter && !d.philosopherIds.includes(thinkerFilter)) return false
    if (dateFilter !== 'all') {
      const days = daysSince(d.id)
      if (dateFilter === 'week' && days > 7) return false
      if (dateFilter === 'month' && days > 30) return false
    }
    if (query) {
      const haystack = [
        d.claim,
        d.conclusion,
        d.verdict?.sharpenedClaim,
        d.verdict?.leanedFramework,
        d.userReflection,
        ...d.philosopherIds.map((id) => philosopherById(id)?.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

  const openEntry = openId != null ? debates.find((d) => d.id === openId) ?? null : null
  const filtersActive = Boolean(query) || thinkerFilter !== null || dateFilter !== 'all'

  return (
    <>
      <RotatingBackdrop screen="journal" />
      <div className="standard-container relative z-[1] px-6 pb-10 pt-8">
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
            </header>

            {debates.length === 0 && (
              <EmptyState
                icon={<BookOpen className="h-9 w-9 text-parchment-400" />}
                headline="A blank page"
                body="Finish a debate in the Crucible and it'll be entered here."
              />
            )}

            {debates.length > 0 && (
              <p className="font-display text-lg leading-snug text-parchment-900">
                {insight ?? 'Your patterns will emerge as you reflect.'}
              </p>
            )}

            {favourites.length > 0 && (
              <div className="mt-5">
                <p className="mb-2.5 font-display text-[13px] italic text-forge-ember">Familiar faces</p>
                <div className="flex gap-3">
                  {favourites.map((id) => {
                    const p = philosopherById(id)
                    if (!p) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate('/app/archive')}
                        className="w-14 shrink-0 text-center"
                      >
                        <PortraitFrame id={id} size={160} className="w-full" />
                        <p className="mt-1 truncate text-xs font-medium text-parchment-700">{p.name}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {debates.length > 0 && (
              <>
                <div className="relative mt-8">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your journal…"
                    className="w-full rounded-xl border border-parchment-300/70 bg-parchment-50 py-2.5 pl-10 pr-3 text-sm text-parchment-900 outline-none focus:border-forge-ember"
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  />
                </div>

                {availableThinkers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {availableThinkers.map((id) => {
                      const p = philosopherById(id)
                      if (!p) return null
                      const active = thinkerFilter === id
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setThinkerFilter(active ? null : id)}
                          className="rounded-full border px-3 py-1 text-xs transition-colors"
                          style={
                            active
                              ? { borderColor: 'var(--color-forge-ember)', background: 'var(--color-side-gold-soft)', color: 'var(--color-parchment-900)' }
                              : { borderColor: 'var(--color-parchment-300)', color: 'var(--color-parchment-700)' }
                          }
                        >
                          {p.name}
                        </button>
                      )
                    })}
                    {(['all', 'week', 'month'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setDateFilter(f)}
                        className="rounded-full border px-3 py-1 text-xs capitalize transition-colors"
                        style={
                          dateFilter === f
                            ? { borderColor: 'var(--color-forge-ember)', background: 'var(--color-side-gold-soft)', color: 'var(--color-parchment-900)' }
                            : { borderColor: 'var(--color-parchment-300)', color: 'var(--color-parchment-700)' }
                        }
                      >
                        {f === 'all' ? 'All time' : `Past ${f}`}
                      </button>
                    ))}
                  </div>
                )}

                <p className="mb-3 mt-8 font-display text-xl font-medium text-parchment-900">Entries</p>
                {filteredDebates.length === 0 ? (
                  <p className="py-6 text-center text-sm text-parchment-500">
                    No entries match {filtersActive ? 'that search or filter' : 'yet'}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredDebates
                      .slice()
                      .reverse()
                      .map((d, i) => {
                        const date = new Date(d.id)
                        const day = date.getDate()
                        const month = date.toLocaleDateString(undefined, { month: 'short' })
                        const status = entryStatus(d)
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
                                  <span className="mt-0.5 text-[11px] uppercase tracking-wide text-parchment-500">
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
                                  {d.userReflection && (
                                    <p className="mt-1.5 line-clamp-2 text-xs text-parchment-600">
                                      {d.userReflection}
                                    </p>
                                  )}
                                  <p
                                    className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide"
                                    style={{ color: STATUS_COLOR[status] }}
                                  >
                                    {STATUS_LABEL[status]}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          </button>
                        )
                      })}
                  </div>
                )}
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

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search } from 'lucide-react'
import { philosopherById } from '../data/philosophers'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PortraitFrame } from '../components/PortraitFrame'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { loadDebates, loadReflectSessions } from '../lib/storage'
import type { Debate, ReflectSession } from '../types'

/* ------------------------------- Entry model ------------------------------- */
// My Thinking reads from two genuinely different sources — Debate's
// claim/verdict sessions and Reflect's situation/ending sessions — and
// presents them as one intellectual history. Never merged into a single
// shape: a Debate entry has a verdict and a status; a Reflect entry has
// an ending and no status concept at all, because Reflect never declares
// anyone right. Keeping the union tagged means every place that renders
// an entry has to consciously handle both, instead of quietly assuming
// verdict-shaped fields exist.

type Entry = { kind: 'debate'; debate: Debate } | { kind: 'reflect'; reflect: ReflectSession }

function entryId(e: Entry): number {
  return e.kind === 'debate' ? e.debate.id : e.reflect.id
}
function entryKey(e: Entry): string {
  return `${e.kind}:${entryId(e)}`
}
function entryPhilosophers(e: Entry): string[] {
  return e.kind === 'debate' ? e.debate.philosopherIds : e.reflect.philosopherIds
}
function entryTitle(e: Entry): string {
  return e.kind === 'debate' ? e.debate.claim : e.reflect.situation
}
/** A short line of real, saved content — never invented. Debate uses the
 * user's own written reflection if there is one; Reflect falls back to
 * "what seems to matter" from its ending, since that's still literal
 * output from the session, not a guess about the user's psychology. */
function entryPreview(e: Entry): string | null {
  if (e.kind === 'debate') return e.debate.userReflection?.trim() || null
  return e.reflect.userReflection?.trim() || e.reflect.ending?.whatMatters?.trim() || null
}
function entrySearchText(e: Entry): string {
  const names = entryPhilosophers(e).map((id) => philosopherById(id)?.name).filter(Boolean).join(' ')
  if (e.kind === 'debate') {
    const d = e.debate
    return [d.claim, d.conclusion, d.verdict?.sharpenedClaim, d.verdict?.leanedFramework, d.userReflection, names]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }
  const r = e.reflect
  return [r.situation, r.ending?.tension, r.ending?.whatMatters, r.ending?.question, r.userReflection, names]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

type DateFilter = 'all' | 'week' | 'month'
type EntryStatus = 'changed' | 'reinforced' | 'unresolved'

const STATUS_LABEL: Record<EntryStatus, string> = {
  changed: 'Changed',
  reinforced: 'Reinforced',
  unresolved: 'Unresolved',
}
const STATUS_COLOR: Record<EntryStatus, string> = {
  changed: 'var(--color-status-success)',
  reinforced: 'var(--color-side-indigo)',
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

/** Only Debate produces a status — a verdict is a real claim about
 * whether the position held or moved. Reflect never gets one: it has no
 * verdict to compare a "before" and "after" against, and inventing a
 * changed/reinforced label for it would claim a kind of judgment Reflect
 * deliberately never makes. */
function entryStatus(d: Debate): EntryStatus {
  const outcome = d.verdict?.outcome
  if (outcome) {
    if (outcome === 'REINFORCED') return 'reinforced'
    if (outcome === 'REVISED' || outcome === 'SHIFTED' || outcome === 'SYNTHESISED') return 'changed'
    return 'unresolved' // UNTESTED or UNRESOLVED
  }
  if (!d.userReflection?.trim()) return 'unresolved'
  if (d.verdict?.sharpenedClaim && d.verdict.sharpenedClaim.trim().toLowerCase() !== d.claim.trim().toLowerCase()) {
    return 'changed'
  }
  return 'reinforced'
}

/** A single headline insight drawn from real entries, prioritized by how
 * strong the signal is — a clearly dominant thinker beats a merely
 * repeated framework beats "you've been at this a while." Returns null
 * when there isn't enough data or no pattern is strong enough to be
 * worth stating, rather than a fabricated or trivial one. Counts both
 * Debate and Reflect activity — a thinker who shows up across both is a
 * real pattern, not a Debate-only one. */
function thinkingInsight(entries: Entry[]): string | null {
  if (entries.length < 3) return null

  const philosopherCounts: Record<string, number> = {}
  const frameworkCounts: Record<string, number> = {}
  entries.forEach((e) => {
    entryPhilosophers(e).forEach((id) => {
      philosopherCounts[id] = (philosopherCounts[id] ?? 0) + 1
    })
    if (e.kind === 'debate' && e.debate.verdict?.leanedFramework) {
      frameworkCounts[e.debate.verdict.leanedFramework] = (frameworkCounts[e.debate.verdict.leanedFramework] ?? 0) + 1
    }
  })

  const philosopherEntries = Object.entries(philosopherCounts).sort((a, b) => b[1] - a[1])
  if (philosopherEntries.length > 0) {
    const [topId, topCount] = philosopherEntries[0]
    const runnerUpCount = philosopherEntries[1]?.[1] ?? 0
    if (topCount >= 3 && topCount > runnerUpCount) {
      const name = philosopherById(topId)?.name
      if (name) return `You keep coming back to ${name}.`
    }
  }

  const frameworkEntries = Object.entries(frameworkCounts).sort((a, b) => b[1] - a[1])
  if (frameworkEntries.length > 0 && frameworkEntries[0][1] >= 2) {
    return `You keep returning to ${frameworkEntries[0][0]}.`
  }

  const earliest = entries.reduce((min, e) => (entryId(e) < min ? entryId(e) : min), entryId(entries[0]))
  const days = daysSince(earliest)
  if (days >= 14) {
    return `You first started thinking things through here ${timeAgo(days)}.`
  }

  return null
}

/** Deterministically picks one entry old enough to be worth revisiting —
 * hashed by the day, not random, so it doesn't change on every render or
 * every reload, and never picks something from last week that isn't
 * actually old. Returns null (never a fabricated pick) when nothing
 * qualifies. */
function resurfacedEntry(entries: Entry[]): Entry | null {
  const eligible = entries.filter((e) => daysSince(entryId(e)) >= 21)
  if (eligible.length === 0) return null
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return eligible[dayIndex % eligible.length]
}

function relatedEntries(entry: Entry, all: Entry[]): Entry[] {
  const ids = entryPhilosophers(entry)
  const framework = entry.kind === 'debate' ? entry.debate.verdict?.leanedFramework : undefined
  return all
    .filter((e) => entryKey(e) !== entryKey(entry))
    .filter((e) => (framework && e.kind === 'debate' && e.debate.verdict?.leanedFramework === framework) || entryPhilosophers(e).some((id) => ids.includes(id)))
    .slice(0, 3)
}

type Tab = 'now' | 'timeline' | 'threads' | 'changes' | 'saved'

const TABS: { id: Tab; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'threads', label: 'Threads' },
  { id: 'changes', label: 'Belief changes' },
  { id: 'saved', label: 'Saved ideas' },
]

export function MyThinking() {
  const [debates, setDebates] = useState<Debate[]>([])
  const [reflections, setReflections] = useState<ReflectSession[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('now')
  const [search, setSearch] = useState('')
  const [thinkerFilter, setThinkerFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const navigate = useNavigate()

  useEffect(() => {
    setDebates(loadDebates())
    setReflections(loadReflectSessions())
  }, [])

  const entries: Entry[] = useMemo(
    () => [
      ...debates.map((debate): Entry => ({ kind: 'debate', debate })),
      ...reflections.map((reflect): Entry => ({ kind: 'reflect', reflect })),
    ],
    [debates, reflections],
  )
  const sortedEntries = useMemo(() => entries.slice().sort((a, b) => entryId(b) - entryId(a)), [entries])

  const visited: Record<string, number> = {}
  entries.forEach((e) => {
    entryPhilosophers(e).forEach((id) => {
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

  const insight = useMemo(() => thinkingInsight(entries), [entries])
  const resurfaced = useMemo(() => resurfacedEntry(entries), [entries])
  const mostRecent = sortedEntries[0] ?? null

  const query = search.trim().toLowerCase()
  const filteredEntries = sortedEntries.filter((e) => {
    if (thinkerFilter && !entryPhilosophers(e).includes(thinkerFilter)) return false
    if (dateFilter !== 'all') {
      const days = daysSince(entryId(e))
      if (dateFilter === 'week' && days > 7) return false
      if (dateFilter === 'month' && days > 30) return false
    }
    if (query && !entrySearchText(e).includes(query)) return false
    return true
  })
  const filtersActive = Boolean(query) || thinkerFilter !== null || dateFilter !== 'all'

  const openEntry = openKey != null ? entries.find((e) => entryKey(e) === openKey) ?? null : null

  function openThinker(id: string) {
    setTab('threads')
    setThinkerFilter(id)
  }

  return (
    <>
      <RotatingBackdrop screen="mythinking" />
      <div className="standard-container relative z-[1] px-6 pb-10 pt-8">
        {openEntry ? (
          <EntryDetail entry={openEntry} allEntries={entries} onBack={() => setOpenKey(null)} onJump={setOpenKey} />
        ) : entries.length === 0 ? (
          <>
            <header className="mb-6">
              <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">My Thinking</p>
              <h1 className="font-display text-2xl font-medium text-parchment-900">Your intellectual history</h1>
            </header>
            <EmptyState
              icon={<BookOpen className="h-9 w-9 text-parchment-400" />}
              headline="A blank page"
              body="Reflect on something or put a claim to the Council, and it'll be entered here."
            />
          </>
        ) : (
          <>
            <header className="mb-6">
              <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">My Thinking</p>
              <h1 className="font-display text-2xl font-medium text-parchment-900">Your intellectual history</h1>
            </header>

            <div className="mb-7 flex gap-1.5 overflow-x-auto pb-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                  style={
                    tab === t.id
                      ? { borderColor: 'var(--color-forge-ember)', background: 'var(--color-side-gold-soft)', color: 'var(--color-parchment-900)' }
                      : { borderColor: 'var(--color-parchment-300)', color: 'var(--color-parchment-700)' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'now' && (
              <NowTab
                insight={insight}
                mostRecent={mostRecent}
                resurfaced={resurfaced}
                favourites={favourites}
                onOpen={(e) => setOpenKey(entryKey(e))}
                onOpenThinker={openThinker}
                onBrowseLibrary={() => navigate('/app/archive')}
              />
            )}

            {tab === 'timeline' && (
              <TimelineTab
                entries={filteredEntries}
                search={search}
                setSearch={setSearch}
                thinkerFilter={thinkerFilter}
                setThinkerFilter={setThinkerFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                availableThinkers={availableThinkers}
                filtersActive={filtersActive}
                onOpen={(e) => setOpenKey(entryKey(e))}
              />
            )}

            {tab === 'threads' && (
              <ThreadsTab
                entries={sortedEntries}
                highlightThinker={thinkerFilter}
                onOpen={(e) => setOpenKey(entryKey(e))}
              />
            )}

            {tab === 'changes' && <ChangesTab debates={debates} onOpen={(d) => setOpenKey(`debate:${d.id}`)} />}

            {tab === 'saved' && (
              <SavedTab reflections={reflections} onOpen={(r) => setOpenKey(`reflect:${r.id}`)} />
            )}
          </>
        )}
      </div>
    </>
  )
}

/* ---------------------------------- Now ---------------------------------- */

function NowTab({
  insight,
  mostRecent,
  resurfaced,
  favourites,
  onOpen,
  onOpenThinker,
  onBrowseLibrary,
}: {
  insight: string | null
  mostRecent: Entry | null
  resurfaced: Entry | null
  favourites: string[]
  onOpen: (e: Entry) => void
  onOpenThinker: (id: string) => void
  onBrowseLibrary: () => void
}) {
  return (
    <div style={{ animation: 'revealUp 0.35s ease both' }}>
      <div className="mb-7">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">A pattern in your thinking</p>
        <p className="font-display text-xl leading-snug text-parchment-900">
          {insight ?? 'Your patterns will emerge as you keep reflecting and debating.'}
        </p>
      </div>

      {mostRecent && (
        <div className="mb-7">
          <p className="mb-2.5 font-display text-[13px] italic text-forge-ember">Where you left off</p>
          <EntryCard entry={mostRecent} onClick={() => onOpen(mostRecent)} />
        </div>
      )}

      {resurfaced && (
        <div className="mb-7">
          <p className="mb-2.5 font-display text-[13px] italic text-forge-ember">Worth revisiting</p>
          <EntryCard entry={resurfaced} onClick={() => onOpen(resurfaced)} />
        </div>
      )}

      {favourites.length > 0 && (
        <div className="mb-7">
          <p className="mb-2.5 font-display text-[13px] italic text-forge-ember">Familiar faces</p>
          <div className="flex gap-3">
            {favourites.map((id) => {
              const p = philosopherById(id)
              if (!p) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenThinker(id)}
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

      <button type="button" onClick={onBrowseLibrary} className="text-xs font-medium text-parchment-500 underline hover:text-forge-ember">
        Browse the Library
      </button>
    </div>
  )
}

/* -------------------------------- Timeline -------------------------------- */

function TimelineTab({
  entries,
  search,
  setSearch,
  thinkerFilter,
  setThinkerFilter,
  dateFilter,
  setDateFilter,
  availableThinkers,
  filtersActive,
  onOpen,
}: {
  entries: Entry[]
  search: string
  setSearch: (v: string) => void
  thinkerFilter: string | null
  setThinkerFilter: (v: string | null) => void
  dateFilter: DateFilter
  setDateFilter: (v: DateFilter) => void
  availableThinkers: string[]
  filtersActive: boolean
  onOpen: (e: Entry) => void
}) {
  return (
    <div style={{ animation: 'revealUp 0.35s ease both' }}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your thinking…"
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

      <p className="mb-4 mt-8 font-display text-2xl font-medium text-parchment-900">Entries</p>
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-parchment-500">
          No entries match {filtersActive ? 'that search or filter' : 'yet'}.
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map((e, i) => (
            <div key={entryKey(e)} style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${Math.min(i, 6) * 50}ms` }}>
              <EntryCard entry={e} onClick={() => onOpen(e)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** One entry, either kind — dated, titled, previewed, and (for Debate
 * only) status-badged. Shared by Now/Timeline/Threads so a given entry
 * always looks the same wherever it shows up. */
function EntryCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const date = new Date(entryId(entry))
  const day = date.getDate()
  const month = date.toLocaleDateString(undefined, { month: 'short' })
  const preview = entryPreview(entry)
  const status = entry.kind === 'debate' ? entryStatus(entry.debate) : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-2xl text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-ember/50"
    >
      <Card className="relative overflow-hidden p-5">
        <div
          className="absolute right-0 top-0 h-5 w-5"
          style={{ background: 'linear-gradient(135deg, transparent 50%, var(--color-parchment-300) 50%)' }}
        />
        <div className="flex items-start gap-4">
          <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-parchment-200 py-1.5">
            <span className="font-display text-lg font-semibold leading-none text-parchment-900">{day}</span>
            <span className="mt-0.5 text-[11px] uppercase tracking-wide text-parchment-500">{month}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-parchment-400">
              {entry.kind === 'debate' ? 'Debate' : 'Reflect'}
            </p>
            <p className="mt-0.5 font-display text-base italic leading-snug text-parchment-900">&ldquo;{entryTitle(entry)}&rdquo;</p>
            <p className="mt-2 text-sm text-parchment-500">
              with {entryPhilosophers(entry).map((id) => philosopherById(id)?.name).filter(Boolean).join(' and ')}
            </p>
            {preview && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-parchment-600">{preview}</p>}
            {status && (
              <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: STATUS_COLOR[status] }}>
                {STATUS_LABEL[status]}
              </p>
            )}
          </div>
        </div>
      </Card>
    </button>
  )
}

/* --------------------------------- Threads --------------------------------- */

function ThreadsTab({
  entries,
  highlightThinker,
  onOpen,
}: {
  entries: Entry[]
  highlightThinker: string | null
  onOpen: (e: Entry) => void
}) {
  const threads = useMemo(() => {
    const byPhilosopher = new Map<string, Entry[]>()
    entries.forEach((e) => {
      entryPhilosophers(e).forEach((id) => {
        const list = byPhilosopher.get(id) ?? []
        list.push(e)
        byPhilosopher.set(id, list)
      })
    })
    return Array.from(byPhilosopher.entries())
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
  }, [entries])

  if (threads.length === 0) {
    return (
      <EmptyState
        headline="No threads yet"
        body="Once you've talked with the same thinker more than once — in Debate or Reflect — that recurring thread will show up here."
      />
    )
  }

  return (
    <div className="space-y-6" style={{ animation: 'revealUp 0.35s ease both' }}>
      {threads.map(([id, list]) => {
        const p = philosopherById(id)
        if (!p) return null
        return (
          <div
            key={id}
            className="rounded-2xl p-4"
            style={{
              boxShadow: 'var(--shadow-card)',
              background: highlightThinker === id ? 'var(--color-side-gold-soft)' : 'var(--color-parchment-50)',
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <PortraitFrame id={id} size={80} className="w-11 shrink-0" />
              <div>
                <p className="font-display text-base font-medium text-parchment-900">{p.name}</p>
                <p className="text-xs text-parchment-500">
                  {list.length} conversation{list.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {list
                .slice()
                .sort((a, b) => entryId(b) - entryId(a))
                .slice(0, 4)
                .map((e) => (
                  <button
                    key={entryKey(e)}
                    type="button"
                    onClick={() => onOpen(e)}
                    className="block w-full truncate rounded-lg bg-parchment-100 px-3 py-2 text-left text-sm text-parchment-800 hover:bg-parchment-200"
                  >
                    &ldquo;{entryTitle(e)}&rdquo;
                  </button>
                ))}
              {list.length > 4 && <p className="px-1 text-xs text-parchment-500">+{list.length - 4} more</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------- Belief changes ------------------------------- */

function ChangesTab({ debates, onOpen }: { debates: Debate[]; onOpen: (d: Debate) => void }) {
  const changed = debates
    .filter((d) => entryStatus(d) === 'changed' && d.verdict)
    .sort((a, b) => b.id - a.id)

  if (changed.length === 0) {
    return (
      <EmptyState
        headline="No belief changes recorded yet"
        body="When reflecting after a debate actually moves your position — not just tests it — that shift shows up here, honestly, with the before and after side by side."
      />
    )
  }

  return (
    <div className="space-y-4" style={{ animation: 'revealUp 0.35s ease both' }}>
      {changed.map((d, i) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onOpen(d)}
          className="block w-full text-left"
          style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${Math.min(i, 6) * 50}ms` }}
        >
          <Card className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-parchment-500">
              {new Date(d.id).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-parchment-500 line-through decoration-parchment-400">
              {d.claim}
            </p>
            <p className="mt-1 font-display text-base leading-snug text-parchment-900">{d.verdict?.sharpenedClaim}</p>
          </Card>
        </button>
      ))}
    </div>
  )
}

/* --------------------------------- Saved ideas --------------------------------- */

function SavedTab({ reflections, onOpen }: { reflections: ReflectSession[]; onOpen: (r: ReflectSession) => void }) {
  const withEndings = reflections.filter((r) => r.ending).sort((a, b) => b.id - a.id)

  if (withEndings.length === 0) {
    return (
      <EmptyState
        headline="No saved ideas yet"
        body="Every time you close out a Reflect session, the question it left you with is saved here — literally what was written, never a guess at what you were thinking."
      />
    )
  }

  return (
    <div className="space-y-4" style={{ animation: 'revealUp 0.35s ease both' }}>
      {withEndings.map((r, i) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onOpen(r)}
          className="block w-full text-left"
          style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${Math.min(i, 6) * 50}ms` }}
        >
          <Card variant="hero" className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-forge-ember">
              From &ldquo;{r.situation.length > 50 ? `${r.situation.slice(0, 50).trim()}…` : r.situation}&rdquo;
            </p>
            <p className="mt-1.5 font-display text-lg leading-snug text-parchment-900">{r.ending?.question}</p>
          </Card>
        </button>
      ))}
    </div>
  )
}

/* --------------------------------- Entry detail --------------------------------- */

function EntryDetail({
  entry,
  allEntries,
  onBack,
  onJump,
}: {
  entry: Entry
  allEntries: Entry[]
  onBack: () => void
  onJump: (key: string) => void
}) {
  const date = new Date(entryId(entry))
  const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const related = relatedEntries(entry, allEntries)

  return (
    <div style={{ animation: 'unfurl 0.45s ease both', transformOrigin: 'top center' }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to My Thinking
      </button>

      <p className="mb-1.5 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">{dateStr}</p>
      <p className="font-display text-xl italic leading-snug text-parchment-900">&ldquo;{entryTitle(entry)}&rdquo;</p>
      <p className="mt-2 text-sm text-parchment-500">
        {entry.kind === 'debate' ? 'Debated with ' : 'Reflected with '}
        {entryPhilosophers(entry).map((id) => philosopherById(id)?.name).filter(Boolean).join(' and ')}
      </p>

      {entry.kind === 'debate' && entry.debate.verdict && (
        <div className="mt-6 space-y-3">
          <Card variant="hero" className="p-5">
            <p className="mb-1.5 font-display text-sm font-medium uppercase tracking-wide text-forge-ember">Sharpened claim</p>
            <p className="font-display text-lg leading-snug text-parchment-900">{entry.debate.verdict.sharpenedClaim}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">Weakest premise</p>
            <p className="text-sm leading-relaxed text-parchment-800">{entry.debate.verdict.weakestReason}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">You leaned on</p>
            <p className="text-sm leading-relaxed text-parchment-800">{entry.debate.verdict.leanedFramework}</p>
          </Card>
          {entry.debate.userReflection && (
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Your reflection</p>
              <p className="text-sm leading-relaxed text-parchment-800">{entry.debate.userReflection}</p>
            </Card>
          )}
        </div>
      )}

      {entry.kind === 'reflect' && entry.reflect.ending && (
        <div className="mt-6 space-y-3">
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">What the Council saw</p>
            <p className="text-sm leading-relaxed text-parchment-800">{entry.reflect.ending.tension}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">What seemed to matter</p>
            <p className="text-sm leading-relaxed text-parchment-800">{entry.reflect.ending.whatMatters}</p>
          </Card>
          <Card variant="hero" className="p-5">
            <p className="mb-1.5 font-display text-sm font-medium uppercase tracking-wide text-forge-ember">
              A question to carry with you
            </p>
            <p className="font-display text-lg leading-snug text-parchment-900">{entry.reflect.ending.question}</p>
          </Card>
          {entry.reflect.userReflection && (
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Your own thought</p>
              <p className="text-sm leading-relaxed text-parchment-800">{entry.reflect.userReflection}</p>
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
                key={entryKey(r)}
                type="button"
                onClick={() => onJump(entryKey(r))}
                className="block w-full rounded-xl bg-parchment-50 px-3.5 py-2.5 text-left text-sm text-parchment-800"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                &ldquo;{entryTitle(r)}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

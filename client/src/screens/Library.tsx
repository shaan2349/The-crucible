import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Scale } from 'lucide-react'
import { PHILOSOPHER_CATEGORIES, PHILOSOPHERS, PHILOSOPHER_TAGS, philosopherById, philosopherVoice, SIDE_ACCENT } from '../data/philosophers'
import { relationshipsFor } from '../data/relationships'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Loader } from '../components/Loader'
import { Button } from '../components/Button'
import { PortraitFrame } from '../components/PortraitFrame'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { fetchBio, compareThinkers, searchThinkers, type BioResponse, type CompareResponse, type SearchResponse } from '../lib/api'
import { loadBios, saveBios } from '../lib/storage'
import { usePreferencesContext } from '../context/PreferencesContext'

type BioState = BioResponse | { error: string } | undefined
type BrowseMode = 'thinkers' | 'schools'

const COMPARE_TOPICS = ['Justice', 'Freedom', 'Virtue', 'Knowledge', 'Death', 'Meaning']

/** Cards show just the region/period, not the full birth-death string —
 * that detail lives on the profile page, where it has room. */
function shortEra(era: string): string {
  return era.split(',')[0].trim()
}

export function Library() {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<BrowseMode>('thinkers')
  const [openId, setOpenId] = useState<string | null>(null)
  const [bios, setBios] = useState<Record<string, BioState>>({})
  const [compareOpen, setCompareOpen] = useState(false)
  const [aiResults, setAiResults] = useState<SearchResponse['matches'] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiQueryFor, setAiQueryFor] = useState('')
  const { preferences } = usePreferencesContext()

  useEffect(() => {
    setBios(loadBios())
  }, [])

  const clusterNameOf = useMemo(() => {
    const map: Record<string, string> = {}
    PHILOSOPHER_CATEGORIES.forEach((cat) => cat.ids.forEach((id) => (map[id] = cat.name)))
    return (id: string) => map[id] ?? ''
  }, [])

  const thinkersAZ = useMemo(() => [...PHILOSOPHERS].sort((a, b) => a.name.localeCompare(b.name)), [])

  async function loadBio(id: string) {
    setBios((b) => ({ ...b, [id]: undefined }))
    try {
      const bio = await fetchBio(id, { language: preferences.language, depth: preferences.depth })
      setBios((b) => {
        const next = { ...b, [id]: bio }
        saveBios(next as Record<string, BioResponse>)
        return next
      })
    } catch (e) {
      setBios((b) => ({ ...b, [id]: { error: (e as Error)?.message || 'Something went wrong.' } }))
    }
  }

  function open(id: string) {
    setOpenId(id)
    if (!bios[id]) loadBio(id)
  }

  const query = search.trim().toLowerCase()
  const filtered = query
    ? PHILOSOPHERS.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.era.toLowerCase().includes(query) ||
          p.framework.toLowerCase().includes(query) ||
          (PHILOSOPHER_TAGS[p.id]?.toLowerCase().includes(query) ?? false) ||
          clusterNameOf(p.id).toLowerCase().includes(query),
      )
    : null

  useEffect(() => {
    setAiResults(null)
    setAiError(null)
  }, [query])

  async function askLibrary() {
    const q = search.trim()
    if (!q) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await searchThinkers(q)
      setAiResults(res.matches)
      setAiQueryFor(query)
    } catch (e) {
      setAiError((e as Error)?.message || 'Something went wrong.')
    }
    setAiLoading(false)
  }

  return (
    <>
      <RotatingBackdrop screen="library" />
      <div className="wide-container relative z-[1] px-6 pb-10 pt-8">
        {openId ? (
          <PhilosopherDetail
            id={openId}
            bio={bios[openId]}
            onRetry={() => loadBio(openId)}
            onBack={() => setOpenId(null)}
            onJump={open}
            clusterNameOf={clusterNameOf}
          />
        ) : compareOpen ? (
          <CompareView onBack={() => setCompareOpen(false)} />
        ) : (
          <>
            <header className="mb-6">
              <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
                The Library
              </p>
              <h1 className="font-display text-2xl font-medium text-parchment-900">
                {PHILOSOPHERS.length} thinkers, centuries of arguments
              </h1>
            </header>

            {!query && (
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className="mb-6 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-ember/50"
                style={{ boxShadow: 'var(--shadow-card)', background: 'linear-gradient(155deg, var(--color-side-gold-soft) 0%, var(--color-parchment-50) 70%)' }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-forge-ember" style={{ background: 'var(--color-parchment-50)' }}>
                  <Scale className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-medium text-parchment-900">Compare two minds</span>
                  <span className="block text-sm text-parchment-600">
                    Pick any two thinkers and a question — see exactly where they'd disagree.
                  </span>
                </span>
              </button>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search philosophers…"
                className="w-full rounded-xl border border-parchment-300/70 bg-parchment-50 py-2.5 pl-10 pr-3 text-sm text-parchment-900 outline-none focus:border-forge-ember"
                style={{ boxShadow: 'var(--shadow-card)' }}
              />
            </div>

            {!query && (
              <div
                className="mt-4 flex gap-1 rounded-lg border border-parchment-300/70 bg-parchment-200 p-1"
                style={{ boxShadow: 'var(--shadow-embossed)', width: 'fit-content' }}
              >
                {(['thinkers', 'schools'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${mode === m ? 'bg-forge-ember text-parchment-50' : 'text-parchment-700'}`}
                  >
                    {m === 'thinkers' ? 'Thinkers' : 'Schools'}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6">
              {filtered && filtered.length > 0 && <ThinkerGrid philosophers={filtered} onSelect={open} />}
              {filtered && filtered.length === 0 && (
                <EmptyState
                  icon={<Search className="h-9 w-9 text-parchment-400" />}
                  headline="No one matches that"
                  body="Try a different name, era, or school of thought — or ask the Library below."
                />
              )}
              {filtered && filtered.length < 3 && (
                <div className="mt-4">
                  {aiQueryFor !== query && !aiLoading && (
                    <Button className="w-full" onClick={askLibrary}>
                      Ask the Library about "{search.trim()}"
                    </Button>
                  )}
                  {aiLoading && <Loader label="Searching the library…" />}
                  {aiError && (
                    <Card className="mt-3 border-rose-300 bg-rose-50 p-4">
                      <p className="mb-2 text-xs text-rose-700">{aiError}</p>
                      <Button onClick={askLibrary}>Retry</Button>
                    </Card>
                  )}
                  {aiResults && aiQueryFor === query && (
                    aiResults.length === 0 ? (
                      <EmptyState
                        icon={<Search className="h-9 w-9 text-parchment-400" />}
                        headline="Nothing genuinely fits"
                        body="The Library would rather come up empty than force a weak match."
                      />
                    ) : (
                      <div className="mt-3 space-y-2">
                        {aiResults.map((m) => {
                          const p = philosopherById(m.philosopherId)
                          if (!p) return null
                          return (
                            <button
                              key={m.philosopherId}
                              type="button"
                              onClick={() => open(m.philosopherId)}
                              className="flex w-full items-center gap-3 rounded-xl border border-parchment-300/70 bg-parchment-50 p-3 text-left"
                              style={{ boxShadow: 'var(--shadow-card)' }}
                            >
                              <PortraitFrame id={p.id} size={120} className="h-12 w-12 shrink-0 rounded-full" />
                              <span>
                                <span className="block font-display text-sm font-medium text-parchment-900">{p.name}</span>
                                <span className="block text-xs text-parchment-600">{m.reason}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  )}
                </div>
              )}
              {!filtered && mode === 'thinkers' && <ThinkerGrid philosophers={thinkersAZ} onSelect={open} />}
              {!filtered && mode === 'schools' && (
                <div className="space-y-8">
                  {PHILOSOPHER_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                      <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.15em] text-parchment-500">
                        {cat.name}
                      </p>
                      <ThinkerGrid philosophers={cat.ids.map((id) => philosopherById(id)).filter(Boolean) as typeof PHILOSOPHERS} onSelect={open} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/** The one card layout used everywhere thinkers are browsed — larger
 * than the old 3/4-column grid so a full name and a real descriptor fit
 * without truncating into "Marcus Aure…". */
function ThinkerGrid({ philosophers, onSelect }: { philosophers: typeof PHILOSOPHERS; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
      {philosophers.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className="group rounded-xl text-left transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
          style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          <PortraitFrame id={p.id} size={360} className="w-full" />
          <p className="mt-2.5 font-display text-[15px] font-medium leading-snug text-parchment-900">{p.name}</p>
          <p className="mt-0.5 text-sm text-parchment-500">{shortEra(p.era)}</p>
          {PHILOSOPHER_TAGS[p.id] && (
            <p className="mt-0.5 text-xs italic text-parchment-600">{PHILOSOPHER_TAGS[p.id]}</p>
          )}
        </button>
      ))}
    </div>
  )
}

function PhilosopherDetail({
  id,
  bio,
  onRetry,
  onBack,
  onJump,
  clusterNameOf,
}: {
  id: string
  bio: BioState
  onRetry: () => void
  onBack: () => void
  onJump: (id: string) => void
  clusterNameOf: (id: string) => string
}) {
  const p = philosopherById(id)
  const navigate = useNavigate()
  const connectionsRef = useRef<HTMLDivElement>(null)
  if (!p) return null
  const isError = bio && 'error' in bio
  const connections = relationshipsFor(id)
  const voice = philosopherVoice(id)

  function startConversation(question?: string) {
    const prefill = question ?? (bio && !isError ? bio.conversationStarters?.[0] : undefined)
    // Conversation starters are phrased as claims/positions, not personal
    // dilemmas — that's Debate's territory (Reflect is life-guidance).
    navigate('/app/debate', prefill ? { state: { prefill } } : undefined)
  }

  function exploreRelated() {
    if (connections.length > 0 && connectionsRef.current) {
      connectionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      onBack()
    }
  }

  return (
    <div style={{ animation: 'revealUp 0.3s ease both' }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the Library
      </button>

      {/* Hero */}
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="w-40 shrink-0 sm:w-48" style={{ animation: 'castReveal 0.55s ease both' }}>
          <PortraitFrame id={id} size={700} aspect="4/5" duotone="url(#duotone-neutral)" className="w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-medium text-parchment-900">{p.name}</h1>
          <p className="mt-1 text-sm text-parchment-500">{p.era}</p>
          {PHILOSOPHER_TAGS[id] && (
            <span className="mt-2 inline-block rounded-full bg-parchment-200 px-2.5 py-1 text-[11px] font-medium text-parchment-700">
              {PHILOSOPHER_TAGS[id]}
            </span>
          )}
          {bio && !isError && bio.positioning && (
            <p className="mt-4 font-display text-lg italic leading-snug text-parchment-800">
              &ldquo;{bio.positioning}&rdquo;
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button onClick={() => startConversation()}>Start a conversation</Button>
            {connections.length > 0 && (
              <Button variant="ghost" onClick={exploreRelated}>
                Explore related thinkers
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Framework/challenge/voice are static data — shown immediately,
          not gated behind the AI bio fetch below. */}
      <section className="mt-10">
        <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
          How they think
        </p>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-parchment-500">Framework</p>
            <p className="text-[15px] leading-relaxed text-parchment-800">{p.framework}</p>
          </div>
          {voice?.signature && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-parchment-500">
                Characteristic move
              </p>
              <p className="text-[15px] leading-relaxed text-parchment-800">{voice.signature}</p>
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-parchment-500">
              What they challenge
            </p>
            <p className="text-[15px] leading-relaxed text-parchment-800">{p.attack}</p>
          </div>
          {voice?.style && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-parchment-500">Voice</p>
              <p className="text-[15px] leading-relaxed text-parchment-800">{voice.style}</p>
            </div>
          )}
        </div>
      </section>

      {!bio && (
        <div className="mt-8">
          <Loader label="Reading their history…" />
        </div>
      )}
      {isError && (
        <Card className="mt-8 border-rose-300 bg-rose-50 p-4">
          <p className="mb-2 text-xs text-rose-700">Couldn't load: {bio.error}</p>
          <Button onClick={onRetry}>Retry</Button>
        </Card>
      )}

      {bio && !isError && (
        <div className="mt-10 space-y-9">
          {bio.overview && (
            <section>
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
                Overview
              </p>
              <div className="space-y-3 text-[15px] leading-[1.7] text-parchment-800">
                {bio.overview.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}

          {bio.coreIdeas?.length > 0 && (
            <section>
              <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
                Core ideas
              </p>
              <div className="space-y-3">
                {bio.coreIdeas.map((idea, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 font-display text-xs italic text-parchment-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[15px] leading-relaxed text-parchment-800">{idea}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {bio.lifeAndContext && (
            <section>
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
                Life &amp; context
              </p>
              <div className="space-y-3 text-[15px] leading-[1.7] text-parchment-800">
                {bio.lifeAndContext.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}

          {bio.works && (
            <section>
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
                Key works &amp; sources
              </p>
              <p className="text-[15px] leading-relaxed text-parchment-800">{bio.works}</p>
            </section>
          )}

          {bio.legacy && (
            <section>
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
                Why they still matter
              </p>
              <p className="text-[15px] leading-relaxed text-parchment-800">{bio.legacy}</p>
            </section>
          )}

          {bio.modernTakes?.length > 0 && (
            <section>
              <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
                Modern relevance
              </p>
              <div className="space-y-4">
                {bio.modernTakes.map((t, i) => (
                  <div key={i}>
                    <p className="mb-1 font-display text-sm italic text-parchment-700">{t.topic}</p>
                    <p className="text-[15px] leading-relaxed text-parchment-800">{t.take}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {connections.length > 0 && (
        <section ref={connectionsRef} className="mt-10 border-t border-parchment-300/70 pt-8">
          <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
            Connections
          </p>
          <div className="space-y-2.5">
            {connections.map((c) => {
              const other = philosopherById(c.otherId)
              if (!other) return null
              return (
                <button
                  key={c.otherId}
                  type="button"
                  onClick={() => onJump(c.otherId)}
                  className="flex w-full items-start gap-2.5 text-left"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: c.kind === 'rivalry' ? '#8a2a12' : '#c17f1f' }}
                  />
                  <span className="text-sm text-parchment-800">
                    <span className="font-medium text-parchment-900">{other.name}</span>
                    <span className="text-parchment-500"> · {clusterNameOf(c.otherId)}</span>
                    <br />
                    <span className="text-xs italic text-parchment-600">{c.note}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {bio && !isError && bio.conversationStarters?.length > 0 && (
        <section className="mt-10 border-t border-parchment-300/70 pt-8">
          <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.15em] text-forge-ember">
            Try a conversation
          </p>
          <div className="space-y-2">
            {bio.conversationStarters.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => startConversation(q)}
                className="block w-full rounded-xl bg-parchment-50 px-4 py-3 text-left text-sm text-parchment-800"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Two named slots + a picker for whichever is still empty, rather than
 * one long filterable list of all 47 names sitting on screen at once —
 * setup should feel like choosing two people, not filling out a form.
 * The picker for a slot closes the moment it's filled and the topic step
 * only appears once both are chosen, so attention goes to one decision
 * at a time. */
function CompareView({ onBack }: { onBack: () => void }) {
  const [ids, setIds] = useState<(string | null)[]>([null, null])
  const [editingSlot, setEditingSlot] = useState<number | null>(0)
  const [filter, setFilter] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(null)

  const [idA, idB] = ids
  const both = idA && idB

  const available = PHILOSOPHERS.filter(
    (p) => !ids.includes(p.id) && p.name.toLowerCase().includes(filter.toLowerCase()),
  )

  function choose(id: string) {
    if (editingSlot === null) return
    setIds((prev) => {
      const next = [...prev]
      next[editingSlot] = id
      return next
    })
    setFilter('')
    setResult(null)
    const otherSlot = editingSlot === 0 ? 1 : 0
    setEditingSlot(ids[otherSlot] ? null : otherSlot)
  }

  function changeSlot(slot: number) {
    setIds((prev) => {
      const next = [...prev]
      next[slot] = null
      return next
    })
    setFilter('')
    setResult(null)
    setEditingSlot(slot)
  }

  async function submit() {
    if (!idA || !idB || !topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await compareThinkers(idA, idB, topic.trim())
      setResult(res)
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  const a = idA ? philosopherById(idA) : null
  const b = idB ? philosopherById(idB) : null

  return (
    <div style={{ animation: 'revealUp 0.3s ease both' }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the Library
      </button>

      <header className="mb-7">
        <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">Compare</p>
        <h1 className="font-display text-2xl font-medium text-parchment-900">Two minds, one question</h1>
      </header>

      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <CompareSlot label="Thinker A" id={idA} active={editingSlot === 0} onClick={() => changeSlot(0)} />
        <p className="font-display text-sm italic text-parchment-400">vs</p>
        <CompareSlot label="Thinker B" id={idB} active={editingSlot === 1} onClick={() => changeSlot(1)} />
      </div>

      {editingSlot !== null && (
        <div className="mt-6" style={{ animation: 'revealUp 0.3s ease both' }}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-parchment-500">
            Choose {editingSlot === 0 ? 'Thinker A' : 'Thinker B'}
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-400" />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Search ${PHILOSOPHERS.length} philosophers…`}
              className="w-full rounded-xl border border-parchment-300/70 bg-parchment-50 py-2.5 pl-10 pr-3 text-sm text-parchment-900 outline-none focus:border-forge-ember"
              style={{ boxShadow: 'var(--shadow-card)' }}
            />
          </div>
          <div className="mt-3 flex max-h-72 flex-wrap gap-x-3 gap-y-4 overflow-y-auto pb-1 pr-1">
            {available.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p.id)}
                className="w-20 shrink-0 rounded-full text-center transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
              >
                <PortraitFrame id={p.id} size={160} className="w-full rounded-full" />
                <p className="mt-1.5 text-[11px] font-medium leading-tight text-parchment-700">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {both && editingSlot === null && (
        <div className="mt-8" style={{ animation: 'revealUp 0.35s ease both' }}>
          <p className="mb-1.5 font-display text-lg font-medium text-parchment-900">
            What should they disagree about?
          </p>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Justice, or your own question…"
            className="mt-3 w-full rounded-xl border border-parchment-300/70 bg-parchment-50 px-4 py-3 text-sm text-parchment-900 outline-none focus:border-forge-ember"
            style={{ boxShadow: 'var(--shadow-card)' }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {COMPARE_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className="rounded-full border border-parchment-300 px-3.5 py-1.5 text-xs text-parchment-700 transition-colors hover:border-forge-ember hover:text-forge-ember"
              >
                {t}
              </button>
            ))}
          </div>

          <Button className="mt-6 w-full" disabled={!topic.trim() || loading} onClick={submit}>
            Compare their views
          </Button>
        </div>
      )}

      {loading && <Loader label={`${a?.name ?? ''} and ${b?.name ?? ''} are considering "${topic}"…`} />}
      {error && (
        <Card className="mt-4 border-rose-300 bg-rose-50 p-4">
          <p className="mb-2 text-xs text-rose-700">{error}</p>
          <Button onClick={submit}>Retry</Button>
        </Card>
      )}

      {result && a && b && (
        <div className="mt-8 space-y-4" style={{ animation: 'revealUp 0.4s ease both' }}>
          <Card className="p-5" style={{ borderLeftWidth: 3, borderLeftColor: SIDE_ACCENT[0] }}>
            <p className="mb-1.5 font-display text-sm italic" style={{ color: SIDE_ACCENT[0] }}>{a.name}</p>
            <p className="text-sm leading-relaxed text-parchment-800">{result.positionA}</p>
          </Card>
          <Card className="p-5" style={{ borderLeftWidth: 3, borderLeftColor: SIDE_ACCENT[1] }}>
            <p className="mb-1.5 font-display text-sm italic" style={{ color: SIDE_ACCENT[1] }}>{b.name}</p>
            <p className="text-sm leading-relaxed text-parchment-800">{result.positionB}</p>
          </Card>
          <Card variant="hero" className="p-5">
            <p className="mb-1.5 font-display text-sm font-medium uppercase tracking-wide text-forge-ember">Key disagreement</p>
            <p className="text-sm leading-relaxed text-parchment-900">{result.keyDisagreement}</p>
          </Card>
          <Card className="p-5">
            <p className="mb-1.5 font-display text-sm italic text-forge-ember">Shared ground</p>
            <p className="text-sm leading-relaxed text-parchment-800">{result.sharedGround}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

function CompareSlot({
  label,
  id,
  active,
  onClick,
}: {
  label: string
  id: string | null
  active: boolean
  onClick: () => void
}) {
  const p = id ? philosopherById(id) : null
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-28 rounded-xl text-center transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember sm:w-32"
    >
      {p ? (
        <PortraitFrame
          id={p.id}
          size={360}
          aspect="3/4"
          className="w-full"
          frameAccent={active ? 'var(--color-forge-ember)' : undefined}
        />
      ) : (
        <div
          className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border-2 border-dashed text-2xl transition-colors"
          style={{
            borderColor: active ? 'var(--color-forge-ember)' : 'var(--color-parchment-400)',
            color: 'var(--color-parchment-400)',
            background: active ? 'var(--color-side-gold-soft)' : undefined,
          }}
        >
          +
        </div>
      )}
      <p className="mt-2 font-display text-sm font-medium leading-snug text-parchment-900">
        {p ? p.name : label}
      </p>
      {!p && <p className="text-[11px] uppercase tracking-wide text-parchment-500">{label}</p>}
    </button>
  )
}

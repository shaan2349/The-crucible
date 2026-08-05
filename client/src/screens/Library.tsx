import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, Scale } from 'lucide-react'
import { PHILOSOPHER_CATEGORIES, PHILOSOPHERS, PHILOSOPHER_TAGS, philosopherById, philosopherVoice, SIDE_ACCENT } from '../data/philosophers'
import { relationshipsFor } from '../data/relationships'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { Button } from '../components/Button'
import { PortraitFrame } from '../components/PortraitFrame'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { fetchBio, compareThinkers, searchThinkers, type BioResponse, type CompareResponse, type SearchResponse } from '../lib/api'
import { loadBios, saveBios } from '../lib/storage'

type BioState = BioResponse | { error: string } | undefined

const COMPARE_TOPICS = ['Justice', 'Freedom', 'Virtue', 'Knowledge', 'Death', 'Meaning']

export function Library() {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [bios, setBios] = useState<Record<string, BioState>>({})
  const [compareOpen, setCompareOpen] = useState(false)
  const [aiResults, setAiResults] = useState<SearchResponse['matches'] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiQueryFor, setAiQueryFor] = useState('')

  useEffect(() => {
    setBios(loadBios())
  }, [])

  const clusterNameOf = useMemo(() => {
    const map: Record<string, string> = {}
    PHILOSOPHER_CATEGORIES.forEach((cat) => cat.ids.forEach((id) => (map[id] = cat.name)))
    return (id: string) => map[id] ?? ''
  }, [])

  async function loadBio(id: string) {
    setBios((b) => ({ ...b, [id]: undefined }))
    try {
      const bio = await fetchBio(id)
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

  async function askArchive() {
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
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
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
            <header className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
                  The Firmament
                </p>
                <h1 className="font-display text-2xl font-medium text-parchment-900">Library</h1>
                <p className="mt-1 text-sm text-parchment-600">
                  {PHILOSOPHERS.length} minds, organised by era. Open one to see who they argued with, and why.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                aria-label="Compare two thinkers"
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-parchment-600 transition-colors hover:text-forge-ember"
                style={{ boxShadow: 'var(--shadow-card)', background: 'var(--color-parchment-50)' }}
              >
                <Scale className="h-4 w-4" />
              </button>
            </header>

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

            <div className="mt-8">
              {filtered ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {filtered.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => open(p.id)}
                      className="text-center"
                      style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    >
                      <PortraitFrame id={p.id} size={260} className="w-full transition-transform active:scale-[0.97]" />
                      <p className="mt-1.5 truncate font-display text-[13px] font-medium text-parchment-900">
                        {p.name}
                      </p>
                      <p className="truncate text-[11px] text-parchment-500">{p.era}</p>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="col-span-full py-8 text-center text-sm text-parchment-500">
                      No one in the collection matches that.
                    </p>
                  )}
                </div>
              ) : null}
              {filtered && filtered.length < 3 && (
                <div className="mt-4">
                  {aiQueryFor !== query && !aiLoading && (
                    <Button className="w-full" onClick={askArchive}>
                      Ask the Archive about "{search.trim()}"
                    </Button>
                  )}
                  {aiLoading && <Loader label="Searching the archive…" />}
                  {aiError && (
                    <Card className="mt-3 border-rose-300 bg-rose-50 p-4">
                      <p className="mb-2 text-xs text-rose-700">{aiError}</p>
                      <Button onClick={askArchive}>Retry</Button>
                    </Card>
                  )}
                  {aiResults && aiQueryFor === query && (
                    aiResults.length === 0 ? (
                      <p className="mt-3 text-center text-sm text-parchment-500">
                        Nothing in the collection genuinely fits that.
                      </p>
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
              {!filtered && (
                <div className="space-y-8">
                  {PHILOSOPHER_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                      <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.15em] text-parchment-500">
                        {cat.name}
                      </p>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {cat.ids.map((id, i) => {
                          const p = philosopherById(id)
                          if (!p) return null
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => open(id)}
                              className="text-center"
                              style={{ animation: 'revealUp 0.35s ease both', animationDelay: `${Math.min(i, 8) * 40}ms` }}
                            >
                              <PortraitFrame id={id} size={260} className="w-full transition-transform active:scale-[0.97]" />
                              <p className="mt-1.5 truncate font-display text-[13px] font-medium text-parchment-900">
                                {p.name}
                              </p>
                              <p className="truncate text-[11px] text-parchment-500">{p.era}</p>
                            </button>
                          )
                        })}
                      </div>
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
  if (!p) return null
  const isError = bio && 'error' in bio
  const connections = relationshipsFor(id)
  const voice = philosopherVoice(id)

  return (
    <div style={{ animation: 'revealUp 0.3s ease both' }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the Firmament
      </button>

      <div
        className="mx-auto mb-5 w-40 sm:w-48"
        style={{ animation: 'castReveal 0.55s ease both' }}
      >
        <PortraitFrame id={id} size={700} aspect="4/5" duotone="url(#duotone-neutral)" className="w-full" />
      </div>

      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-medium text-parchment-900">{p.name}</h1>
        <p className="mt-1 text-sm text-parchment-500">{p.era}</p>
        {PHILOSOPHER_TAGS[id] && (
          <span className="mt-2 inline-block rounded-full bg-parchment-200 px-2.5 py-1 text-[11px] font-medium text-parchment-700">
            {PHILOSOPHER_TAGS[id]}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <Card className="p-4">
          <p className="mb-1 font-display text-[13px] italic text-forge-ember">Framework</p>
          <p className="leading-relaxed text-parchment-800">{p.framework}</p>
        </Card>
        <Card className="p-4">
          <p className="mb-1 font-display text-[13px] italic text-forge-ember">Characteristic move</p>
          <p className="leading-relaxed text-parchment-800">{p.attack}</p>
        </Card>
        {voice && (
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">Voice</p>
            <p className="leading-relaxed text-parchment-800">{voice.style}</p>
          </Card>
        )}

        {!bio && <Loader label="Reading their history…" />}
        {isError && (
          <Card className="border-rose-300 bg-rose-50 p-4">
            <p className="mb-2 text-xs text-rose-700">Couldn't load: {bio.error}</p>
            <Button onClick={onRetry}>Retry</Button>
          </Card>
        )}
        {bio && !isError && (
          <>
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Life & ideas</p>
              <p className="leading-relaxed text-parchment-800">{bio.life}</p>
            </Card>
            {bio.coreIdeas?.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 font-display text-[13px] italic text-forge-ember">Core ideas</p>
                <ul className="space-y-1.5">
                  {bio.coreIdeas.map((idea, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-parchment-800">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-forge-ember" />
                      {idea}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Key works</p>
              <p className="leading-relaxed text-parchment-800">{bio.works}</p>
            </Card>
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Why they still matter</p>
              <p className="leading-relaxed text-parchment-800">{bio.legacy}</p>
            </Card>
            {bio.modernTakes?.length > 0 && (
              <Card className="p-4">
                <p className="mb-2.5 font-display text-[13px] italic text-forge-ember">Modern relevance</p>
                <div className="space-y-3">
                  {bio.modernTakes.map((t, i) => (
                    <div key={i}>
                      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-parchment-500">{t.topic}</p>
                      <p className="text-sm leading-relaxed text-parchment-800">{t.take}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {connections.length > 0 && (
          <Card className="p-4">
            <p className="mb-2.5 font-display text-[13px] italic text-forge-ember">Their constellation</p>
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
          </Card>
        )}
      </div>
    </div>
  )
}

function CompareView({ onBack }: { onBack: () => void }) {
  const [ids, setIds] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(null)

  const available = PHILOSOPHERS.filter(
    (p) => !ids.includes(p.id) && p.name.toLowerCase().includes(filter.toLowerCase()),
  )

  function toggle(id: string) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev))
    setResult(null)
  }

  async function submit() {
    if (ids.length !== 2 || !topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await compareThinkers(ids[0], ids[1], topic.trim())
      setResult(res)
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  const [a, b] = ids.map((id) => philosopherById(id))

  return (
    <div style={{ animation: 'revealUp 0.3s ease both' }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the Firmament
      </button>

      <header className="mb-6">
        <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">Compare</p>
        <h1 className="font-display text-2xl font-medium text-parchment-900">Two minds, one question</h1>
      </header>

      <div className="mb-4 flex items-center justify-center gap-4">
        {[0, 1].map((slot) => {
          const id = ids[slot]
          return id ? (
            <div key={id} className="w-24 text-center">
              <PortraitFrame id={id} size={300} className="w-full" />
              <p className="mt-1.5 truncate font-display text-xs font-medium text-parchment-800">
                {philosopherById(id)?.name}
              </p>
            </div>
          ) : (
            <div
              key={slot}
              className="flex aspect-[3/4] w-24 items-center justify-center rounded-xl border border-dashed border-parchment-400 text-xs text-parchment-400"
            >
              ?
            </div>
          )
        })}
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={`Search ${PHILOSOPHERS.length} philosophers…`}
        className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-parchment-900 outline-none focus:border-forge-ember"
      />
      <div className="mt-2 grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
        {available.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className="truncate rounded-lg border border-parchment-300 px-2 py-1.5 text-left text-xs text-parchment-700 hover:border-forge-ember"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">Topic</p>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Justice, or your own question…"
          className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-parchment-900 outline-none focus:border-forge-ember"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COMPARE_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className="rounded-full border border-parchment-300 px-3 py-1 text-xs text-parchment-700 hover:border-forge-ember"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Button className="mt-5 w-full" disabled={ids.length !== 2 || !topic.trim() || loading} onClick={submit}>
        Compare
      </Button>

      {loading && <Loader label={`${a?.name ?? ''} and ${b?.name ?? ''} are considering "${topic}"…`} />}
      {error && (
        <Card className="mt-4 border-rose-300 bg-rose-50 p-4">
          <p className="mb-2 text-xs text-rose-700">{error}</p>
          <Button onClick={submit}>Retry</Button>
        </Card>
      )}

      {result && a && b && (
        <div className="mt-6 space-y-3" style={{ animation: 'revealUp 0.4s ease both' }}>
          <Card className="p-4" style={{ borderLeftWidth: 3, borderLeftColor: SIDE_ACCENT[0] }}>
            <p className="mb-1 font-display text-[13px] italic" style={{ color: SIDE_ACCENT[0] }}>{a.name}</p>
            <p className="text-sm leading-relaxed text-parchment-800">{result.positionA}</p>
          </Card>
          <Card className="p-4" style={{ borderLeftWidth: 3, borderLeftColor: SIDE_ACCENT[1] }}>
            <p className="mb-1 font-display text-[13px] italic" style={{ color: SIDE_ACCENT[1] }}>{b.name}</p>
            <p className="text-sm leading-relaxed text-parchment-800">{result.positionB}</p>
          </Card>
          <Card variant="hero" className="p-4">
            <p className="mb-1 font-display text-sm font-medium uppercase tracking-wide text-forge-ember">Key disagreement</p>
            <p className="text-sm leading-relaxed text-parchment-900">{result.keyDisagreement}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-1 font-display text-[13px] italic text-forge-ember">Shared ground</p>
            <p className="text-sm leading-relaxed text-parchment-800">{result.sharedGround}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

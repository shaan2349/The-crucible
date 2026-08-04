import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { PHILOSOPHER_CATEGORIES, PHILOSOPHERS, PHILOSOPHER_TAGS, philosopherById, photoPosition } from '../data/philosophers'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { Button } from '../components/Button'
import { PhilosopherAvatar } from '../components/PhilosopherAvatar'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { usePortrait } from '../hooks/usePortrait'
import { fetchBio, type BioResponse } from '../lib/api'
import { loadBios, saveBios } from '../lib/storage'

type BioState = BioResponse | { error: string } | undefined

export function Library() {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [bios, setBios] = useState<Record<string, BioState>>({})

  useEffect(() => {
    setBios(loadBios())
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

  function toggle(id: string) {
    const next = openId === id ? null : id
    setOpenId(next)
    if (next && !bios[next]) loadBio(next)
  }

  const query = search.trim().toLowerCase()
  const filtered = query ? PHILOSOPHERS.filter((p) => p.name.toLowerCase().includes(query)) : null

  const categories = filtered
    ? [{ name: 'Results', ids: filtered.map((p) => p.id) }]
    : PHILOSOPHER_CATEGORIES

  return (
    <>
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
        <header className="mb-6">
          <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
            The Archive
          </p>
          <h1 className="font-display text-2xl font-medium text-parchment-900">Library</h1>
          <p className="mt-1 text-sm text-parchment-600">
            All {PHILOSOPHERS.length} philosophers in the Crucible — their history, ideas, and why they still
            matter.
          </p>
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

        <div className="mt-6 space-y-7">
          {categories.map(
            (cat) =>
              cat.ids.length > 0 && (
                <div key={cat.name}>
                  <div className="mb-3 border-b-2 border-double border-parchment-400/70 pb-1.5">
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.15em] text-parchment-600">
                      {cat.name}
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {cat.ids.map((id) => {
                      const p = philosopherById(id)
                      if (!p) return null
                      const isOpen = openId === id
                      return (
                        <Card key={id} className="overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggle(id)}
                            className="flex w-full items-center gap-3 p-3 text-left"
                          >
                            <PhilosopherAvatar id={id} name={p.name} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-parchment-900">{p.name}</p>
                                {PHILOSOPHER_TAGS[id] && (
                                  <span className="hidden shrink-0 rounded-full bg-parchment-200 px-2 py-0.5 text-[10px] text-parchment-600 sm:inline">
                                    {PHILOSOPHER_TAGS[id]}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-parchment-500">{p.era}</p>
                            </div>
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-parchment-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-parchment-500" />
                            )}
                          </button>
                          {isOpen && <PhilosopherDetail id={id} bio={bios[id]} onRetry={() => loadBio(id)} />}
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ),
          )}
        </div>
      </div>
    </>
  )
}

function PhilosopherDetail({ id, bio, onRetry }: { id: string; bio: BioState; onRetry: () => void }) {
  const p = philosopherById(id)
  const { url } = usePortrait(id, 800)
  if (!p) return null
  const isError = bio && 'error' in bio

  return (
    <div className="border-t border-parchment-300" style={{ animation: 'revealUp 0.35s ease both' }}>
      {url && (
        <div
          className="h-40 w-full bg-cover"
          style={{ backgroundImage: `url(${url})`, backgroundPosition: photoPosition(id), filter: 'url(#duotone-neutral)' }}
        />
      )}
      <div className="space-y-3 px-4 pb-4 pt-3 text-sm">
        {PHILOSOPHER_TAGS[id] && (
          <span className="inline-block rounded-full bg-parchment-200 px-2.5 py-1 text-[11px] font-medium text-parchment-700 sm:hidden">
            {PHILOSOPHER_TAGS[id]}
          </span>
        )}
        <div>
          <p className="mb-1 font-display text-[13px] italic text-forge-ember">Framework</p>
          <p className="leading-relaxed text-parchment-800">{p.framework}</p>
        </div>
        <div>
          <p className="mb-1 font-display text-[13px] italic text-forge-ember">Characteristic move</p>
          <p className="leading-relaxed text-parchment-800">{p.attack}</p>
        </div>

        {!bio && <Loader label="Reading their history…" />}
        {isError && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-3">
            <p className="mb-2 text-xs text-rose-700">Couldn't load: {bio.error}</p>
            <Button onClick={onRetry}>Retry</Button>
          </div>
        )}
        {bio && !isError && (
          <>
            <div>
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Life & ideas</p>
              <p className="leading-relaxed text-parchment-800">{bio.life}</p>
            </div>
            <div>
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Key works</p>
              <p className="leading-relaxed text-parchment-800">{bio.works}</p>
            </div>
            <div>
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Why they still matter</p>
              <p className="leading-relaxed text-parchment-800">{bio.legacy}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

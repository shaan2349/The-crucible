import { useEffect, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { PHILOSOPHER_CATEGORIES, PHILOSOPHERS, PHILOSOPHER_TAGS, philosopherById } from '../data/philosophers'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { Button } from '../components/Button'
import { PortraitFrame } from '../components/PortraitFrame'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
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

  function open(id: string) {
    setOpenId(id)
    if (!bios[id]) loadBio(id)
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
        {openId ? (
          <PhilosopherDetail
            id={openId}
            bio={bios[openId]}
            onRetry={() => loadBio(openId)}
            onBack={() => setOpenId(null)}
          />
        ) : (
          <>
            <header className="mb-6">
              <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
                The Archive
              </p>
              <h1 className="font-display text-2xl font-medium text-parchment-900">Library</h1>
              <p className="mt-1 text-sm text-parchment-600">
                {PHILOSOPHERS.length} minds held in the collection — pull one from the shelf.
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

            <div className="mt-7 space-y-8">
              {categories.map(
                (cat) =>
                  cat.ids.length > 0 && (
                    <div key={cat.name}>
                      <div className="mb-3.5 border-b-2 border-double border-parchment-400/70 pb-1.5">
                        <p className="font-display text-xs font-semibold uppercase tracking-[0.15em] text-parchment-600">
                          {cat.name}
                        </p>
                      </div>
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
                  ),
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
}: {
  id: string
  bio: BioState
  onRetry: () => void
  onBack: () => void
}) {
  const p = philosopherById(id)
  if (!p) return null
  const isError = bio && 'error' in bio

  return (
    <div style={{ animation: 'revealUp 0.3s ease both' }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the archive
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
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Key works</p>
              <p className="leading-relaxed text-parchment-800">{bio.works}</p>
            </Card>
            <Card className="p-4">
              <p className="mb-1 font-display text-[13px] italic text-forge-ember">Why they still matter</p>
              <p className="leading-relaxed text-parchment-800">{bio.legacy}</p>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

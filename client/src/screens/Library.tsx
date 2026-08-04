import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { PHILOSOPHER_CATEGORIES, PHILOSOPHERS, philosopherById, initials } from '../data/philosophers'
import { Loader } from '../components/Loader'
import { Button } from '../components/Button'
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
    <div className="px-6 pb-10 pt-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-medium text-parchment-900">Library</h1>
        <p className="mt-1 text-sm text-parchment-600">
          All {PHILOSOPHERS.length} philosophers in the Crucible — their history, ideas, and why they still
          matter.
        </p>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search philosophers…"
        className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2.5 text-sm text-parchment-900 outline-none focus:border-forge-ember"
      />

      <div className="mt-5 space-y-6">
        {categories.map(
          (cat) =>
            cat.ids.length > 0 && (
              <div key={cat.name}>
                <p className="mb-2 font-display text-[13px] italic text-forge-ember">{cat.name}</p>
                <div className="space-y-2">
                  {cat.ids.map((id) => {
                    const p = philosopherById(id)
                    if (!p) return null
                    const isOpen = openId === id
                    return (
                      <div key={id} className="overflow-hidden rounded-xl border border-parchment-300 bg-parchment-50">
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          className="flex w-full items-center gap-3 p-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-side-gold-soft text-xs font-bold text-parchment-900">
                            {initials(p.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-parchment-900">{p.name}</p>
                            <p className="truncate text-xs text-parchment-500">{p.era}</p>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-parchment-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-parchment-500" />
                          )}
                        </button>
                        {isOpen && <PhilosopherDetail id={id} bio={bios[id]} onRetry={() => loadBio(id)} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            ),
        )}
      </div>
    </div>
  )
}

function PhilosopherDetail({ id, bio, onRetry }: { id: string; bio: BioState; onRetry: () => void }) {
  const p = philosopherById(id)
  if (!p) return null
  const isError = bio && 'error' in bio

  return (
    <div className="border-t border-parchment-300 px-4 pb-4 pt-3">
      <div className="space-y-3 text-sm">
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

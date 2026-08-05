import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { PHILOSOPHER_CATEGORIES, PHILOSOPHERS, PHILOSOPHER_TAGS, philosopherById, philosopherVoice } from '../data/philosophers'
import { relationshipsFor } from '../data/relationships'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { Button } from '../components/Button'
import { PortraitFrame } from '../components/PortraitFrame'
import { FirmamentPlate } from '../components/FirmamentPlate'
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
  const filtered = query ? PHILOSOPHERS.filter((p) => p.name.toLowerCase().includes(query)) : null

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
        ) : (
          <>
            <header className="mb-6">
              <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
                The Firmament
              </p>
              <h1 className="font-display text-2xl font-medium text-parchment-900">Library</h1>
              <p className="mt-1 text-sm text-parchment-600">
                {PHILOSOPHERS.length} minds, charted by tradition — the lines between them are real history,
                not decoration.
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
              ) : (
                PHILOSOPHER_CATEGORIES.map((cat, i) => (
                  <FirmamentPlate
                    key={cat.name}
                    name={cat.name}
                    plateNumber={i + 1}
                    ids={[...cat.ids]}
                    onSelect={open}
                    clusterNameOf={clusterNameOf}
                  />
                ))
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

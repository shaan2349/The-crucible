import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, X } from '../night/icons'
import { PHILOSOPHERS, PHILOSOPHER_TAGS, philosopherById, type Philosopher } from '../data/philosophers'
import { relationshipsFor } from '../data/relationships'
import * as api from '../lib/api'
import { loadBios, saveBios } from '../lib/storage'
import { usePreferencesContext } from '../context/PreferencesContext'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { useAmbience } from '../night/useAmbience'

// The 3D gallery loads with the Hall itself, keeping the rest of the app light.
const Hall3D = lazy(() => import('../hall/Hall3D'))

/**
 * The Hall of Minds: a lamplit gallery where the forty-seven thinkers stand
 * as marble busts in a moonlit stoa, wing by wing through history. Tap a
 * bust and it wakes: a warm light finds it, it turns to you, and its plaque
 * opens.
 * From there you can talk to that thinker alone, or seat them at the
 * Symposium.
 */

const WINGS: { name: string; sub: string; ids: string[] }[] = [
  { name: 'Ancient Greece & Rome', sub: 'WHERE THE QUESTIONS BEGAN', ids: ['socrates', 'plato', 'aristotle', 'epicurus', 'marcus'] },
  { name: 'Eastern Traditions', sub: 'THE WAY, THE MIDDLE PATH, THE RITES', ids: ['confucius', 'mencius', 'laozi', 'buddha'] },
  { name: 'The Medieval Wing', sub: 'FAITH AND REASON', ids: ['augustine', 'ibnrushd', 'aquinas'] },
  { name: 'The Enlightenment', sub: 'REASON, RIGHTS AND THE SOCIAL CONTRACT', ids: ['machiavelli', 'descartes', 'hobbes', 'locke', 'hume', 'smith', 'rousseau', 'kant', 'burke', 'wollstonecraft'] },
  { name: 'The Nineteenth Century', sub: 'HISTORY, UTILITY AND THE SELF', ids: ['bentham', 'hegel', 'mill', 'kierkegaard', 'marx', 'nietzsche'] },
  { name: 'The Twentieth Century', sub: 'FREEDOM, JUSTICE AND MEANING', ids: ['keynes', 'wittgenstein', 'hayek', 'popper', 'arendt', 'sartre', 'beauvoir', 'berlin', 'camus', 'fanon', 'rawls', 'foucault', 'nozick'] },
  { name: 'Living Thinkers', sub: 'THE CONVERSATION CONTINUES', ids: ['anscombe', 'thomson', 'sen', 'parfit', 'singer', 'nussbaum'] },
]


export function Hall() {
  useAmbience('hall')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [awake, setAwake] = useState<string | null>(null)

  // every philosopher should be in exactly one wing; anyone missing gets a home
  const wings = useMemo(() => {
    const placed = new Set(WINGS.flatMap((w) => w.ids))
    const rest = PHILOSOPHERS.filter((p) => !placed.has(p.id)).map((p) => p.id)
    return rest.length ? [...WINGS, { name: 'Other Rooms', sub: 'MORE MINDS', ids: rest }] : WINGS
  }, [])

  const q = query.trim().toLowerCase()
  const visible = (id: string) => {
    if (!q) return true
    const p = philosopherById(id)
    return !!p && (p.name.toLowerCase().includes(q) || (PHILOSOPHER_TAGS[id] ?? '').toLowerCase().includes(q) || p.framework.toLowerCase().includes(q))
  }

  function wake(id: string) {
    setAwake(id)
  }

  const results = useMemo(() => (q ? wings.flatMap((w) => w.ids).filter((id) => philosopherById(id) && visible(id)) : []), [q, wings])
  const matches = useMemo(() => (q ? new Set(results) : null), [q, results])

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <style>{`
        .hall-btn:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 3px; }
        .hall-enter { animation: hallEnter .9s cubic-bezier(.16,1,.3,1) both; }
        @keyframes hallEnter { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes hallFlicker { 0%,100% { opacity: .8 } 40% { opacity: 1 } 70% { opacity: .7 } }
        .hall-bust .lamp { opacity: .35; transition: opacity .6s ease; }
        .hall-bust:hover .lamp { opacity: .65; }
        .hall-bust.awake .lamp { opacity: 1; animation: hallFlicker 3.2s ease-in-out infinite; }
        .hall-bust .marble { transition: fill 1s ease, filter 1s ease; }
        .hall-bust:hover .bust-body, .hall-bust:focus-visible .bust-body { transform: translateY(-3px); }
        .hall-bust .bust-body { transition: transform .5s cubic-bezier(.16,1,.3,1); }
        .hall-row { scroll-snap-type: x mandatory; scrollbar-width: none; }
        .hall-row::-webkit-scrollbar { display: none; }
        .hall-row > * { scroll-snap-align: center; }
        @media (prefers-reduced-motion: reduce) { .hall-enter, .hall-bust.awake .lamp { animation: none; } }
      `}</style>

      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2" style={{ borderColor: C.line, paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate('/app')} className="hall-btn flex h-11 w-11 items-center justify-center rounded-full" aria-label="Back to the sanctuary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <span style={{ fontFamily: F.display, fontSize: 19 }}>Hall of Minds</span>
          <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>{PHILOSOPHERS.length} THINKERS · {wings.length} WINGS</span>
        </div>
        <label className="ml-auto flex min-w-[180px] flex-1 items-center gap-2 rounded-full border px-3 sm:max-w-[280px]" style={{ borderColor: C.lineStrong, height: 44 }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: C.muted }} aria-hidden="true" />
          <span className="sr-only">Find a thinker</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a thinker or idea"
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{ color: C.ivory, fontFamily: F.read, fontSize: 15 }}
          />
        </label>
      </header>

      <main className="relative min-h-0 flex-1">
        <Suspense fallback={<div className="absolute inset-0" style={{ background: C.night }} />}>
          <Hall3D wings={wings} awake={awake} matches={matches} onWake={wake} />
        </Suspense>
        {q && (
          <div className="absolute left-1/2 top-3 z-[2] w-[min(92%,420px)] -translate-x-1/2 overflow-hidden rounded border" style={{ background: 'rgba(17,20,26,.96)', borderColor: C.lineStrong }} role="region" aria-label="Thinkers matching your search">
            {results.length ? (
              results.slice(0, 6).map((id) => {
                const p = philosopherById(id)!
                return (
                  <button key={id} type="button" onClick={() => { wake(id); setQuery('') }} className="hall-btn flex w-full items-baseline justify-between gap-3 border-b px-4 py-2.5 text-left last:border-b-0" style={{ borderColor: C.line }}>
                    <span style={{ fontFamily: F.display, fontSize: 16 }}>{p.name}</span>
                    <span style={{ fontFamily: F.inscr, fontSize: 9, letterSpacing: '.16em', color: C.gilt }}>{(PHILOSOPHER_TAGS[id] ?? '').toUpperCase()}</span>
                  </button>
                )
              })
            ) : (
              <p className="px-4 py-3" style={{ fontFamily: F.read, fontStyle: 'italic', color: C.muted }}>No one in the hall matches “{query}”.</p>
            )}
          </div>
        )}
      </main>

      {awake && philosopherById(awake) && (
        <Plaque
          p={philosopherById(awake)!}
          onClose={() => setAwake(null)}
          onGoTo={wake}
          onTalk={() => navigate('/app/symposium', { state: { withIds: [awake], only: true } })}
          onSeat={() => navigate('/app/symposium', { state: { withIds: [awake] } })}
        />
      )}
    </div>,
    document.body,
  )
}

/* ---------------------------------- the plaque ---------------------------------- */

function Plaque({ p, onClose, onGoTo, onTalk, onSeat }: { p: Philosopher; onClose: () => void; onGoTo: (id: string) => void; onTalk: () => void; onSeat: () => void }) {
  const { preferences } = usePreferencesContext()
  const [bio, setBio] = useState<api.BioResponse | null>(() => loadBios()[p.id] ?? null)
  const [loadingBio, setLoadingBio] = useState(false)
  const [bioError, setBioError] = useState<string | null>(null)
  const links = relationshipsFor(p.id)

  useEffect(() => {
    setBio(loadBios()[p.id] ?? null)
    setBioError(null)
  }, [p.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function readStory() {
    setLoadingBio(true)
    setBioError(null)
    try {
      const b = await api.fetchBio(p.id, { language: preferences.language, depth: preferences.depth })
      saveBios({ ...loadBios(), [p.id]: b })
      setBio(b)
    } catch (e) {
      setBioError((e as Error)?.message || 'Their story could not be fetched.')
    } finally {
      setLoadingBio(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`${p.name}'s plaque`}
      className="panel-stone hall-enter fixed inset-x-0 bottom-0 z-[2] mx-auto flex max-h-[72vh] w-full max-w-[600px] flex-col overflow-y-auto rounded-t-lg border md:bottom-4 md:right-4 md:left-auto md:max-h-[86vh] md:w-[420px] md:rounded-lg"
      style={{ background: C.panel, borderColor: C.lineStrong, boxShadow: '0 -12px 40px rgba(0,0,0,.5)', paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
    >
      <div className="greek-key mx-4 mt-2 shrink-0" aria-hidden="true" />
      <button type="button" onClick={onClose} aria-label="Close the plaque" className="hall-btn absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full" style={{ color: C.muted }}>
        <X className="h-5 w-5" />
      </button>
      <div className="flex flex-col gap-3 px-5 pt-5">
        <div className="flex flex-col gap-1 pr-10">
          <Eyebrow>{(PHILOSOPHER_TAGS[p.id] ?? '').toUpperCase()}</Eyebrow>
          <p style={{ fontFamily: F.display, fontSize: 26, lineHeight: 1.1 }}>{p.name}</p>
          <p style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 14.5, color: C.muted }}>{p.era}</p>
        </div>
        <Block label="THE BIG IDEA" text={p.framework} big />
        <Block label="HOW THEY ARGUE" text={p.attack} />
        {links.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Eyebrow>IN CONVERSATION WITH</Eyebrow>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {links.map((l) => {
                const other = philosopherById(l.otherId)
                if (!other) return null
                return (
                  <li key={l.otherId}>
                    <button type="button" onClick={() => onGoTo(l.otherId)} className="panel-stone hall-btn flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left" style={{ background: C.raised }}>
                      <span className="flex flex-col">
                        <span style={{ fontFamily: F.display, fontSize: 16 }}>{other.name}</span>
                        <span style={{ fontFamily: F.read, fontSize: 13.5, color: C.body }}>{l.note}</span>
                      </span>
                      <span style={{ fontFamily: F.inscr, fontSize: 9, fontWeight: 600, letterSpacing: '.18em', color: l.kind === 'rivalry' ? C.ember : C.sage }}>
                        {l.kind === 'rivalry' ? 'ARGUED WITH' : 'LINEAGE'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {bio ? (
          <div className="flex flex-col gap-2">
            <Block label="WHO THEY WERE" text={bio.overview} />
            {bio.works && <Block label="WHAT THEY WROTE" text={bio.works} />}
            {bio.legacy && <Block label="WHY THEY STILL MATTER" text={bio.legacy} />}
          </div>
        ) : (
          <button type="button" onClick={readStory} disabled={loadingBio} className="hall-btn min-h-[46px] rounded border disabled:opacity-60" style={{ borderColor: C.line, color: '#E9D5A6', fontFamily: F.read, fontStyle: 'italic', fontSize: 15 }}>
            {loadingBio ? 'Reading their story…' : 'Read their story'}
          </button>
        )}
        {bioError && <p style={{ fontFamily: F.read, fontSize: 14, color: C.ember }}>{bioError}</p>}
        <div className="flex gap-2.5 pt-1">
          <button type="button" onClick={onSeat} className="btn-bronze hall-btn min-h-[50px] flex-1 rounded border" style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontWeight: 500, fontSize: 15 }}>
            Seat at the Symposium
          </button>
          <button type="button" onClick={onTalk} className="btn-gilt hall-btn min-h-[50px] flex-1 rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 15 }}>
            Talk to {p.name}
          </button>
        </div>
      </div>
    </div>
  )
}

function Eyebrow({ children, color = C.gilt }: { children: ReactNode; color?: string }) {
  return <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color }}>{children}</span>
}

function Block({ label, text, big }: { label: string; text: string; big?: boolean }) {
  return (
    <div className="panel-stone rounded p-3.5" style={{ background: C.raised }}>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1" style={{ fontFamily: big ? F.display : F.read, fontSize: big ? 18 : 15, lineHeight: big ? 1.3 : 1.55, color: C.ivory }}>
        {text}
      </p>
    </div>
  )
}

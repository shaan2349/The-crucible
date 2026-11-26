import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, X } from 'lucide-react'
import { PHILOSOPHERS, PHILOSOPHER_TAGS, philosopherById, type Philosopher } from '../data/philosophers'
import { relationshipsFor } from '../data/relationships'
import * as api from '../lib/api'
import { loadBios, saveBios } from '../lib/storage'
import { usePreferencesContext } from '../context/PreferencesContext'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'

/**
 * The Hall of Minds: a lamplit gallery where the forty-seven thinkers stand
 * as marble busts, wing by wing through history. Tap a bust and it wakes:
 * the lamp above it brightens, the marble warms, and its plaque opens.
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

const BEARDED = new Set(['socrates', 'plato', 'aristotle', 'epicurus', 'marcus', 'confucius', 'mencius', 'laozi', 'ibnrushd', 'augustine', 'marx', 'hegel'])
const LAURELED = new Set(['marcus', 'plato', 'aristotle'])

export function Hall() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [awake, setAwake] = useState<string | null>(null)
  const bustRefs = useRef<Record<string, HTMLButtonElement | null>>({})

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
    requestAnimationFrame(() => bustRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }))
  }

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

      <main className="relative min-h-0 flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #0b0d11 0%, #130f0c 100%)' }}>
        {wings.map((w, wi) => {
          const ids = w.ids.filter((id) => philosopherById(id) && visible(id))
          if (!ids.length) return null
          return (
            <section key={w.name} className="hall-enter relative pt-7" style={{ animationDelay: `${Math.min(wi, 4) * 0.08}s` }} aria-labelledby={`wing-${wi}`}>
              <WingBackdrop />
              <div className="relative flex flex-col items-center gap-1 px-4 text-center">
                <h2 id={`wing-${wi}`} style={{ fontFamily: F.display, fontSize: 22, fontWeight: 400, margin: 0 }}>
                  {w.name}
                </h2>
                <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>{w.sub}</span>
              </div>
              <div className="hall-row relative flex gap-2 overflow-x-auto px-6 pb-8 pt-4" style={{ justifyContent: ids.length < 4 ? 'center' : 'flex-start' }}>
                {ids.map((id) => {
                  const p = philosopherById(id)!
                  return (
                    <button
                      key={id}
                      ref={(el) => {
                        bustRefs.current[id] = el
                      }}
                      type="button"
                      onClick={() => wake(id)}
                      className={`hall-btn hall-bust flex w-[132px] shrink-0 flex-col items-center gap-1 rounded-md pb-2 pt-1 ${awake === id ? 'awake' : ''}`}
                      aria-label={`${p.name}, ${p.era}. ${PHILOSOPHER_TAGS[id] ?? ''}`}
                      aria-pressed={awake === id}
                    >
                      <MarbleBust id={id} awake={awake === id} />
                      <span style={{ fontFamily: F.display, fontSize: 16, lineHeight: 1.1 }}>{p.name}</span>
                      <span style={{ fontFamily: F.inscr, fontSize: 8.5, fontWeight: 600, letterSpacing: '.16em', color: awake === id ? C.gold : C.gilt }}>
                        {(PHILOSOPHER_TAGS[id] ?? '').toUpperCase()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
        {q && !PHILOSOPHERS.some((p) => visible(p.id)) && (
          <p className="px-6 pt-16 text-center" style={{ fontFamily: F.read, fontStyle: 'italic', color: C.muted }}>
            No one in the hall matches “{query}”.
          </p>
        )}
        <div style={{ height: 'max(24px, env(safe-area-inset-bottom))' }} />
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

/* --------------------------------- the busts --------------------------------- */

function MarbleBust({ id, awake }: { id: string; awake: boolean }) {
  const bearded = BEARDED.has(id)
  const laurel = LAURELED.has(id)
  const marble = awake ? '#EBD3B0' : '#CFC6B1'
  const shade = awake ? '#C9A57A' : '#9E957F'
  const gid = `bust-${id}`
  return (
    <svg viewBox="0 0 120 170" width="120" height="170" aria-hidden="true">
      <defs>
        <radialGradient id={`${gid}-lamp`} cx="50%" cy="10%" r="70%">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity=".75" />
          <stop offset=".5" stopColor="#F09A50" stopOpacity=".18" />
          <stop offset="1" stopColor="#F09A50" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gid}-m`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade} />
          <stop offset=".45" stopColor={marble} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
      </defs>
      <rect className="lamp" x="0" y="0" width="120" height="150" fill={`url(#${gid}-lamp)`} />
      {/* plinth */}
      <rect x="30" y="128" width="60" height="40" fill="#2a241f" />
      <rect x="26" y="124" width="68" height="6" fill="#3a322b" />
      <rect x="26" y="164" width="68" height="6" fill="#3a322b" />
      <g className="bust-body">
        {/* shoulders and drapery */}
        <path className="marble" d="M24 124 C 26 104, 38 94, 46 90 C 50 95, 70 95, 74 90 C 82 94, 94 104, 96 124 Z" fill={`url(#${gid}-m)`} />
        <path d="M46 92 C 56 104, 64 112, 90 120" stroke={shade} strokeOpacity=".7" strokeWidth="3" fill="none" />
        {/* neck */}
        <rect className="marble" x="52" y="74" width="16" height="20" fill={`url(#${gid}-m)`} />
        {/* head */}
        <ellipse className="marble" cx="60" cy="56" rx="19" ry="23" fill={`url(#${gid}-m)`} />
        <path d="M45 52 Q 60 46 75 52" stroke={shade} strokeOpacity=".55" strokeWidth="1.5" fill="none" />
        <path d="M56 58 L54 66 L58 67" stroke={shade} strokeOpacity=".7" strokeWidth="1.3" fill="none" />
        {bearded && <path className="marble" d="M42 60 C 44 82, 76 82, 78 60 C 74 70, 66 74, 60 74 C 54 74, 46 70, 42 60 Z" fill={shade} opacity=".85" />}
        {laurel && (
          <g stroke="#7d8a55" strokeWidth="2.4" strokeLinecap="round">
            {[-14, -8, -2, 4, 10].map((dx) => (
              <path key={dx} d={`M${60 + dx} 37 l${dx < 0 ? -4 : 4} -4`} />
            ))}
          </g>
        )}
      </g>
      {awake && <circle cx="60" cy="6" r="3" fill="#FFE3A0" />}
    </svg>
  )
}

function WingBackdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
      {[8, 30, 52, 74, 96].map((x) => (
        <rect key={x} x={x - 2} y="22" width="4" height="78" fill="#1a1612" opacity=".7" />
      ))}
      <rect x="0" y="98" width="100" height="2" fill="#241e19" />
    </svg>
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
      className="hall-enter fixed inset-x-0 bottom-0 z-[2] mx-auto flex max-h-[72vh] w-full max-w-[600px] flex-col overflow-y-auto rounded-t-lg border md:bottom-4 md:right-4 md:left-auto md:max-h-[86vh] md:w-[420px] md:rounded-lg"
      style={{ background: C.panel, borderColor: C.lineStrong, boxShadow: '0 -12px 40px rgba(0,0,0,.5)', paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
    >
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
                    <button type="button" onClick={() => onGoTo(l.otherId)} className="hall-btn flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left" style={{ background: C.raised }}>
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
          <button type="button" onClick={onSeat} className="hall-btn min-h-[50px] flex-1 rounded border" style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontWeight: 500, fontSize: 15 }}>
            Seat at the Symposium
          </button>
          <button type="button" onClick={onTalk} className="hall-btn min-h-[50px] flex-1 rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 15 }}>
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
    <div className="rounded p-3.5" style={{ background: C.raised }}>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1" style={{ fontFamily: big ? F.display : F.read, fontSize: big ? 18 : 15, lineHeight: big ? 1.3 : 1.55, color: C.ivory }}>
        {text}
      </p>
    </div>
  )
}

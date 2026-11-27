import { Suspense, lazy, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Volume2, VolumeX } from 'lucide-react'
import { createAmbience, loadMuted, type Ambience } from '../sanctuary/ambience'
import { useDebateContext } from '../context/DebateContext'
import { loadDebates } from '../lib/storage'
import type { PlaceId } from '../sanctuary/SanctuaryScene'
import { NightSky } from '../night/NightSky'

// The 3D hill loads after the first paint; the drawn hill below shows at
// once and stays as the fallback wherever 3D is unavailable.
const Sanctuary3D = lazy(() =>
  import('../sanctuary/Sanctuary3D').catch(() => ({ default: (() => null) as unknown as typeof import('../sanctuary/Sanctuary3D').default })),
)

/**
 * The home of the app: a hilltop sanctuary at night. Each place on the hill
 * is a way in. The hill is 3D (src/sanctuary); this drawn SVG version shows
 * while it loads and remains wherever 3D is unavailable. The SVG is drawn in
 * a 1200×900 world, cropped to the screen around its centre.
 */

const C = {
  night: '#0B0D11',
  gilt: '#C2A15E',
  gold: '#F3D27A',
  ivory: '#EDE6D6',
  muted: '#A39D90',
  stone: '#0D1016',
  stoneEdge: '#1B2130',
}

interface Place {
  id: string
  to: string
  name: string
  sub: string
  /** where the label sits, in scene units */
  lx: number
  ly: number
  /** where the label's line points to */
  px: number
  py: number
  delay: number
  description: string
}

const PLACES: Place[] = [
  { id: 'temple', to: '/app/debate', name: 'The Temple', sub: 'DEFEND A BELIEF', lx: 600, ly: 322, px: 600, py: 360, delay: 0.4, description: 'Defend a belief against two philosophers' },
  { id: 'symposium', to: '/app/symposium', name: 'The Symposium', sub: 'TALK IT THROUGH', lx: 466, ly: 478, px: 470, py: 520, delay: 0.7, description: 'Talk something real through with philosophers' },
  { id: 'hall', to: '/app/hall', name: 'Hall of Minds', sub: '47 THINKERS', lx: 742, ly: 498, px: 736, py: 540, delay: 0.95, description: 'Meet the forty-seven thinkers' },
  { id: 'oracle', to: '/app/oracle', name: 'The Oracle', sub: 'TODAY’S QUESTION', lx: 448, ly: 636, px: 448, py: 672, delay: 1.2, description: 'A question to think about today' },
  { id: 'landscape', to: '/app/landscape', name: 'Your Landscape', sub: 'WHAT YOU HAVE TESTED', lx: 738, ly: 666, px: 760, py: 700, delay: 1.45, description: 'Every belief you have tested' },
]

const QUOTES = [
  ['The unexamined life is not worth living.', 'SOCRATES'],
  ['Sapere aude.', 'KANT'],
  ['Reason is, and ought only to be the slave of the passions.', 'HUME'],
  ['Man is by nature a political animal.', 'ARISTOTLE'],
  ['One is not born, but rather becomes, a woman.', 'DE BEAUVOIR'],
] as const

/** Deterministic star field, so it doesn't reshuffle on every render. */
const STARS = Array.from({ length: 140 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  return { x: r(1) * 1200, y: r(2) * 470, s: 0.5 + r(3) * 1.3, d: r(4) * 4 }
})

export function Sanctuary() {
  const navigate = useNavigate()
  const { debate } = useDebateContext()
  const sceneRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState('0 0 1200 900')

  // Frame the hill to the screen: on wide, short windows the slice crop
  // would cut off the lower places, so the view is moved and tightened
  // around the part of the hill where the places stand (y 258 to 778).
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const fit = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!width || !height) return
      const h = (1200 * height) / width
      if (h >= 900) return setView('0 0 1200 900')
      if (h >= 520) {
        const y = Math.max(0, Math.min(900 - h, 518 - h / 2))
        return setView(`0 ${y.toFixed(1)} 1200 ${h.toFixed(1)}`)
      }
      const w = (520 * width) / height
      setView(`${(600 - w / 2).toFixed(1)} 258 ${w.toFixed(1)} 520`)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // a gentle parallax as the pointer moves (desktop only)
  useEffect(() => {
    const el = sceneRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const x = e.clientX / window.innerWidth - 0.5
      const y = e.clientY / window.innerHeight - 0.5
      el.style.setProperty('--px', x.toFixed(3))
      el.style.setProperty('--py', y.toFixed(3))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  function go(p: Place) {
    navigate(p.to)
  }
  function onKey(e: KeyboardEvent<SVGGElement>, p: Place) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      go(p)
    }
  }

  const live = debate && debate.phase !== 'verdict'
  const [three, setThree] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [temples] = useState(() => loadDebates().length)

  // waves and crickets; sound can only begin after the visitor's first touch
  const [muted, setMuted] = useState(loadMuted)
  const ambience = useRef<Ambience | null>(null)
  useEffect(() => {
    const a = createAmbience()
    ambience.current = a
    const begin = () => a.start()
    window.addEventListener('pointerdown', begin, { once: true })
    window.addEventListener('keydown', begin, { once: true })
    return () => {
      window.removeEventListener('pointerdown', begin)
      window.removeEventListener('keydown', begin)
      a.dispose()
    }
  }, [])
  function toggleSound() {
    const next = !muted
    setMuted(next)
    ambience.current?.setMuted(next)
  }
  // on a slow connection, show the drawn hill rather than an empty sky
  useEffect(() => {
    const t = setTimeout(() => setThree((v) => (v === 'loading' ? 'failed' : v)), 12000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div ref={sceneRef} className="sanctuary fixed inset-0 z-[50] flex flex-col overflow-hidden" style={{ background: C.night, color: C.ivory }}>
      <style>{`
        .sanctuary { --px: 0; --py: 0; }
        .sanctuary .layer { transition: transform .6s cubic-bezier(.16,1,.3,1); }
        .sanctuary .far { transform: translate(calc(var(--px) * -10px), calc(var(--py) * -6px)); }
        .sanctuary .mid { transform: translate(calc(var(--px) * -20px), calc(var(--py) * -10px)); }
        .sanctuary .near { transform: translate(calc(var(--px) * -34px), calc(var(--py) * -14px)); }
        @keyframes sTwinkle { 0%,100% { opacity: .25 } 50% { opacity: .95 } }
        @keyframes sDrift { from { transform: translateX(-160px) } to { transform: translateX(1360px) } }
        @keyframes sLight { 0% { opacity: 0 } 60% { opacity: 1 } 70% { opacity: .55 } 100% { opacity: 1 } }
        @keyframes sFlicker { 0%,100% { opacity: .85 } 30% { opacity: 1 } 55% { opacity: .7 } 80% { opacity: .95 } }
        @keyframes sFlame { 0%,100% { transform: scale(1,1) } 50% { transform: scale(.9,1.15) } }
        @keyframes sRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        @keyframes sShimmer { 0%,100% { opacity: .35 } 50% { opacity: .7 } }
        @keyframes sMeteor { 0%,88% { opacity: 0; transform: translate(0,0) } 90% { opacity: 1 } 96% { opacity: 0; transform: translate(260px,110px) } 100% { opacity: 0 } }
        @keyframes sTicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .sanctuary .star { animation: sTwinkle 3.6s ease-in-out infinite; }
        .sanctuary .cloud { animation: sDrift linear infinite; }
        .sanctuary .lit { animation: sLight 1.4s ease-out both, sFlicker 4s 1.6s ease-in-out infinite; }
        .sanctuary .flame { transform-box: fill-box; transform-origin: 50% 100%; animation: sFlame .9s ease-in-out infinite; }
        .sanctuary .label { animation: sRise .9s cubic-bezier(.16,1,.3,1) both; }
        .sanctuary .shimmer { animation: sShimmer 3s ease-in-out infinite; }
        .sanctuary .meteor { animation: sMeteor 14s ease-in 3s infinite; }
        .sanctuary .ticker { animation: sTicker 70s linear infinite; }
        .sanctuary .place { cursor: pointer; outline: none; }
        .sanctuary .place .halo { opacity: .55; transition: opacity .4s ease; }
        .sanctuary .place:hover .halo, .sanctuary .place:focus-visible .halo { opacity: 1; }
        .sanctuary .place .plate { transition: transform .4s cubic-bezier(.16,1,.3,1); }
        .sanctuary .place:hover .plate, .sanctuary .place:focus-visible .plate { transform: translateY(-4px); }
        .sanctuary .place:focus-visible .ring { stroke: ${C.gold}; stroke-width: 2; }
        @media (prefers-reduced-motion: reduce) {
          .sanctuary .star, .sanctuary .cloud, .sanctuary .lit, .sanctuary .flame, .sanctuary .label, .sanctuary .shimmer, .sanctuary .meteor, .sanctuary .ticker { animation: none; }
          .sanctuary .layer { transform: none; }
        }
      `}</style>

      <header
        className="relative z-[2] flex items-start justify-between px-5"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingLeft: 'max(20px, env(safe-area-inset-left))', paddingRight: 'max(20px, env(safe-area-inset-right))' }}
      >
        <div className="flex flex-col gap-1.5">
          <h1 style={{ fontFamily: "'Gloock', Georgia, serif", fontSize: 26, fontWeight: 400, margin: 0 }}>The Crucible</h1>
          <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, fontWeight: 600, letterSpacing: '.32em', color: C.gilt }}>
            ΓΝΩΘΙ ΣΕΑΥΤΟΝ
          </span>
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? 'Turn on the sound of the sea and crickets' : 'Turn off the sound'}
          aria-pressed={!muted}
          className="flex h-11 w-11 items-center justify-center rounded-full border"
          style={{ borderColor: 'rgba(194,161,94,.45)', color: C.ivory }}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <Link
          to="/app/profile"
          aria-label="Profile and settings"
          className="flex h-11 w-11 items-center justify-center rounded-full border"
          style={{ borderColor: 'rgba(194,161,94,.45)', color: C.ivory }}
        >
          <User className="h-4 w-4" />
        </Link>
        </div>
      </header>

      <div ref={stageRef} className="relative min-h-0 flex-1">
        {three !== 'failed' && (
          <div className="absolute inset-0 z-[1] transition-opacity duration-1000" style={{ opacity: three === 'ready' ? 1 : 0 }}>
            <Suspense fallback={null}>
              <Sanctuary3D
                places={PLACES.map((p) => ({ id: p.id as PlaceId, name: p.name, sub: p.sub, description: p.description }))}
                live={!!live}
                temples={temples}
                onGo={(id) => navigate(PLACES.find((p) => p.id === id)!.to)}
                onReady={() => setThree('ready')}
                onFail={() => setThree('failed')}
              />
            </Suspense>
          </div>
        )}
        {three === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10" aria-live="polite">
            <NightSky />
            <p className="relative m-0" style={{ fontFamily: "'Libre Caslon Text', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: C.muted, animation: 'sRise 1.2s 1.2s both' }}>
              The lamps are being lit…
            </p>
          </div>
        )}
        {three === 'failed' && <svg
          className="absolute inset-0 h-full w-full"
          viewBox={view}
          preserveAspectRatio="xMidYMid slice"
          role="group"
          aria-label="The sanctuary. Choose a place to enter."
        >
          <defs>
            <linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#05070b" />
              <stop offset=".55" stopColor="#0d1420" />
              <stop offset="1" stopColor="#26314a" />
            </linearGradient>
            <radialGradient id="sMoonHalo">
              <stop offset="0" stopColor="#F1E8D2" stopOpacity=".35" />
              <stop offset=".3" stopColor="#F1E8D2" stopOpacity=".08" />
              <stop offset="1" stopColor="#F1E8D2" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sWarm">
              <stop offset="0" stopColor="#FFC27A" stopOpacity=".9" />
              <stop offset=".45" stopColor="#F09A50" stopOpacity=".28" />
              <stop offset="1" stopColor="#F09A50" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sGold">
              <stop offset="0" stopColor="#FFE3A0" stopOpacity="1" />
              <stop offset=".4" stopColor="#F3D27A" stopOpacity=".35" />
              <stop offset="1" stopColor="#F3D27A" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a2436" />
              <stop offset="1" stopColor="#0c1522" />
            </linearGradient>
            <filter id="sBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <filter id="sSoft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>

          {/* sky */}
          <rect x="-1200" width="3600" height="900" fill="url(#sSky)" />
          <g className="layer far" aria-hidden="true">
            {STARS.map((s, i) => (
              <circle key={i} className="star" cx={s.x} cy={s.y} r={s.s} fill="#EDE6D6" style={{ animationDelay: `-${s.d}s` }} />
            ))}
            <circle cx="770" cy="250" r="120" fill="url(#sMoonHalo)" />
            <circle cx="770" cy="250" r="30" fill="#F1E8D2" />
            <line className="meteor" x1="380" y1="80" x2="440" y2="105" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            <g opacity=".5" filter="url(#sBlur)">
              <ellipse className="cloud" cx="0" cy="210" rx="140" ry="16" fill="#C8D2E8" opacity=".12" style={{ animationDuration: '140s' }} />
              <ellipse className="cloud" cx="0" cy="250" rx="200" ry="20" fill="#C8D2E8" opacity=".09" style={{ animationDuration: '190s', animationDelay: '-80s' }} />
              <ellipse className="cloud" cx="0" cy="185" rx="110" ry="12" fill="#C8D2E8" opacity=".1" style={{ animationDuration: '160s', animationDelay: '-30s' }} />
            </g>
          </g>

          {/* mountains and sea */}
          <g className="layer far" aria-hidden="true">
            <path d="M-300 470 L0 470 L90 430 L170 452 L260 398 L340 440 L430 410 L520 446 L600 420 L690 452 L780 404 L860 438 L960 396 L1050 430 L1130 410 L1200 440 L1500 440 L1500 520 L-300 520 Z" fill="#141b28" />
            <path d="M-300 500 L0 500 L120 470 L230 488 L330 462 L470 492 L620 470 L760 494 L900 466 L1040 490 L1200 470 L1500 470 L1500 540 L-300 540 Z" fill="#111722" />
            <rect x="-300" y="520" width="1800" height="120" fill="url(#sSea)" />
            <g className="shimmer">
              {Array.from({ length: 14 }, (_, i) => (
                <rect key={i} x={760 - 6 - i * 1.6 + ((i * 37) % 11)} y={528 + i * 7} width={12 + i * 3} height="1.4" fill="#F1E8D2" opacity={0.5 - i * 0.025} />
              ))}
            </g>
          </g>

          {/* the hill */}
          <g className="layer mid" aria-hidden="true">
            <path d="M-300 690 L0 640 C 180 600, 330 470, 520 445 C 560 440, 640 440, 680 445 C 870 470, 1020 600, 1200 650 L1500 700 L1500 900 L-300 900 Z" fill="#0f131b" />
            <path d="M0 640 C 180 600, 330 470, 520 445 C 560 440, 640 440, 680 445 C 870 470, 1020 600, 1200 650" fill="none" stroke={C.stoneEdge} strokeWidth="1.5" />
            {/* cypresses */}
            {[
              [395, 520, 46], [410, 512, 58], [812, 528, 52], [828, 538, 40], [540, 448, 30], [668, 450, 34], [330, 560, 36], [880, 560, 44],
            ].map(([x, y, h], i) => (
              <path key={i} d={`M${x} ${y} C ${x - h * 0.18} ${y - h * 0.45}, ${x - h * 0.08} ${y - h * 0.85}, ${x} ${y - h} C ${x + h * 0.08} ${y - h * 0.85}, ${x + h * 0.18} ${y - h * 0.45}, ${x} ${y} Z`} fill="#0b1310" />
            ))}
            {/* path winding down the hill */}
            <path d="M600 448 C 560 500, 640 540, 560 590 S 470 660, 520 720 S 640 780, 700 900" fill="none" stroke="#1f2633" strokeWidth="6" strokeLinecap="round" opacity=".8" />
          </g>

          {/* the places */}
          <g className="layer near">
            {/* Temple at the crest */}
            <Building place={PLACES[0]} onGo={go} onKey={onKey} live={!!live}>
              <ellipse className="lit" cx="600" cy="412" rx="70" ry="40" fill="url(#sWarm)" filter="url(#sSoft)" />
              <rect x="548" y="436" width="104" height="8" fill={C.stone} stroke={C.stoneEdge} />
              <rect x="556" y="392" width="88" height="44" fill="#0a0d13" />
              <rect className="lit" x="562" y="396" width="76" height="40" fill="#F0A050" opacity=".35" style={{ animationDelay: '.4s' }} />
              {[560, 582, 604, 626].map((x) => (
                <rect key={x} x={x} y="394" width="9" height="42" fill="#D8CFBB" opacity=".9" />
              ))}
              <rect x="552" y="384" width="96" height="10" fill="#E6DECB" opacity=".92" />
              <path d="M548 384 L600 356 L652 384 Z" fill="#E6DECB" opacity=".95" />
              <path d="M560 380 L600 362 L640 380 Z" fill="#B9B09B" opacity=".6" />
            </Building>

            {/* Symposium: a round pavilion */}
            <Building place={PLACES[1]} onGo={go} onKey={onKey}>
              <ellipse className="lit" cx="470" cy="540" rx="60" ry="34" fill="url(#sWarm)" filter="url(#sSoft)" style={{ animationDelay: '.7s' }} />
              <ellipse cx="470" cy="560" rx="44" ry="7" fill={C.stone} stroke={C.stoneEdge} />
              <rect className="lit" x="436" y="532" width="68" height="26" fill="#F0A050" opacity=".3" style={{ animationDelay: '.7s' }} />
              {[436, 452, 468, 484, 500].map((x) => (
                <rect key={x} x={x} y="530" width="6" height="28" fill="#CFC6B1" opacity=".85" />
              ))}
              <path d="M428 530 Q470 498 512 530 Z" fill="#D8CFBB" opacity=".9" />
              <circle className="lit" cx="470" cy="548" r="4" fill="#FFD9A0" style={{ animationDelay: '.9s' }} />
            </Building>

            {/* Hall of Minds: a long colonnaded hall */}
            <Building place={PLACES[2]} onGo={go} onKey={onKey}>
              <ellipse className="lit" cx="736" cy="566" rx="74" ry="30" fill="url(#sWarm)" filter="url(#sSoft)" style={{ animationDelay: '.95s' }} />
              <rect x="682" y="580" width="110" height="7" fill={C.stone} stroke={C.stoneEdge} />
              <rect x="688" y="552" width="98" height="28" fill="#0a0d13" />
              <rect className="lit" x="692" y="556" width="90" height="24" fill="#F0A050" opacity=".28" style={{ animationDelay: '.95s' }} />
              {[690, 704, 718, 732, 746, 760, 774].map((x) => (
                <rect key={x} x={x} y="552" width="5" height="28" fill="#CFC6B1" opacity=".85" />
              ))}
              <rect x="684" y="545" width="106" height="7" fill="#DCD3BF" opacity=".9" />
              <path d="M684 545 L737 532 L790 545 Z" fill="#DCD3BF" opacity=".85" />
            </Building>

            {/* The Oracle: a flame on a tripod above a rock */}
            <Building place={PLACES[3]} onGo={go} onKey={onKey}>
              <ellipse className="lit" cx="448" cy="690" rx="46" ry="40" fill="url(#sWarm)" filter="url(#sSoft)" style={{ animationDelay: '1.2s' }} />
              <path d="M410 722 Q448 700 488 722 L492 734 L404 734 Z" fill={C.stone} stroke={C.stoneEdge} />
              <path d="M436 716 L448 692 L460 716 M448 692 L448 716" stroke="#8a6a3c" strokeWidth="2" fill="none" />
              <path d="M436 692 Q448 700 460 692 Z" fill="#8a6a3c" />
              <path className="flame" d="M448 690 C 440 682, 444 670, 448 662 C 452 670, 458 682, 448 690 Z" fill="#FFB066" />
              <path className="flame" d="M448 688 C 444 682, 446 676, 448 671 C 450 676, 453 682, 448 688 Z" fill="#FFF0C8" style={{ animationDelay: '-.3s' }} />
            </Building>

            {/* Your Landscape: small temples down the slope */}
            <Building place={PLACES[4]} onGo={go} onKey={onKey}>
              <ellipse className="lit" cx="760" cy="716" rx="62" ry="26" fill="url(#sGold)" filter="url(#sSoft)" opacity=".5" style={{ animationDelay: '1.45s' }} />
              {[
                [728, 726, 1], [760, 716, 1.2], [794, 728, 0.9],
              ].map(([x, y, k], i) => (
                <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
                  <rect x="-14" y="0" width="28" height="3" fill="#CFC6B1" opacity=".85" />
                  {[-11, -4, 3, 10].map((cx) => (
                    <rect key={cx} x={cx - 1.5} y="-12" width="3" height="12" fill="#D8CFBB" opacity=".85" />
                  ))}
                  <path d="M-15 -12 L0 -20 L15 -12 Z" fill="#DCD3BF" opacity=".85" />
                  {i === 1 && <path d="M-2 -11 L1 -6 L-1 -2" stroke={C.gold} strokeWidth="1" fill="none" />}
                </g>
              ))}
            </Building>
          </g>
          <text x="600" y="840" textAnchor="middle" fill="#A39D90" style={{ fontFamily: "'Libre Caslon Text', Georgia, serif", fontStyle: 'italic', fontSize: 15 }} aria-hidden="true">
            Tap a place to enter
          </text>
        </svg>}
      </div>

      <footer
        className="relative z-[2] overflow-hidden border-t"
        style={{ borderColor: 'rgba(194,161,94,.2)', background: 'rgba(11,13,17,.85)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Quotes from philosophers"
      >
        <div className="ticker flex w-max gap-6 whitespace-nowrap py-3" style={{ fontFamily: "'Libre Caslon Text', Georgia, serif", fontStyle: 'italic', fontSize: 14.5, color: '#CFC8B9' }}>
          {[...QUOTES, ...QUOTES].map(([q, who], i) => (
            <span key={i}>
              “{q}”{' '}
              <span style={{ fontStyle: 'normal', fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, letterSpacing: '.2em', color: C.gilt }}>{who}</span>
              <span aria-hidden="true" style={{ color: C.gilt, marginLeft: 24 }}>·</span>
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}

function Building({
  place,
  onGo,
  onKey,
  live,
  children,
}: {
  place: Place
  onGo: (p: Place) => void
  onKey: (e: KeyboardEvent<SVGGElement>, p: Place) => void
  live?: boolean
  children: ReactNode
}) {
  const w = Math.max(place.name.length * 11.5, place.sub.length * 7.4) + 28
  return (
    <g
      className="place"
      role="link"
      tabIndex={0}
      aria-label={`${place.name}: ${place.description}${live ? ' (a debate is in progress)' : ''}`}
      onClick={() => onGo(place)}
      onKeyDown={(e) => onKey(e, place)}
    >
      <g className="halo" aria-hidden="true">
        {children}
      </g>
      <g className="label" style={{ animationDelay: `${place.delay + 0.4}s` }} aria-hidden="true">
        <line x1={place.px} y1={place.ly + 10} x2={place.px} y2={place.py} stroke="#C2A15E" strokeOpacity=".55" strokeWidth="1" />
        <g className="plate">
          <rect className="ring" x={place.lx - w / 2} y={place.ly - 34} width={w} height="44" rx="3" fill="rgba(11,13,17,.82)" stroke="rgba(194,161,94,.45)" />
          <text x={place.lx} y={place.ly - 13} textAnchor="middle" fill="#EDE6D6" style={{ fontFamily: "'Gloock', Georgia, serif", fontSize: 19 }}>
            {place.name}
          </text>
          <text x={place.lx} y={place.ly + 3} textAnchor="middle" fill={live ? '#F3D27A' : '#C2A15E'} style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 9, fontWeight: 600, letterSpacing: '.22em' }}>
            {live ? 'DEBATE IN PROGRESS' : place.sub}
          </text>
        </g>
      </g>
      {/* a generous invisible hit area */}
      <rect x={place.lx - 70} y={place.ly - 40} width="140" height={place.py - place.ly + 90} fill="transparent" />
    </g>
  )
}

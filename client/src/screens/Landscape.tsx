import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { loadDebates, loadReflectSessions } from '../lib/storage'
import { philosopherById } from '../data/philosophers'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { ENDING_COPY, STATUS_WORD, endingOf, numeral, premiseText } from '../temple/ending'
import type { Debate, PremiseStatus, ReflectSession, TempleEnding } from '../types'

// The 3D hill loads with the Landscape; the drawn hillside remains wherever 3D is unavailable.
const Landscape3D = lazy(() => import('../landscape/Landscape3D'))

/**
 * Your Landscape: every belief you have tested stands on your hillside as
 * its own small temple, drawn from how the debate actually went. Gold
 * veins where you defended a premise, a fresh column where you rewrote
 * one, drums in the grass where one fell, ruins where the roof came down.
 * Conversations from the Symposium burn as lamps along the lower path.
 * The hill is 3D (src/landscape) and can be turned all the way round.
 */

type Selected = { kind: 'temple'; d: Debate } | { kind: 'lamp'; s: ReflectSession } | null

function shortDate(ms: number) {
  try {
    return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function clip(text: string, n: number) {
  const t = text.trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

export function Landscape() {
  const navigate = useNavigate()
  const [debates] = useState<Debate[]>(() => loadDebates().filter((d) => d.premises?.length).reverse())
  const [sessions] = useState<ReflectSession[]>(() => loadReflectSessions().slice().reverse())
  const [selected, setSelected] = useState<Selected>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(390)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const counts = useMemo(() => {
    const by: Record<TempleEnding, number> = { victory: 0, reshaped: 0, contested: 0, collapse: 0, untested: 0 }
    debates.forEach((d) => (by[endingOf(d)] += 1))
    return by
  }, [debates])

  const empty = debates.length === 0 && sessions.length === 0
  const [no3d, setNo3d] = useState(false)
  const temples3d = useMemo(
    () =>
      debates.map((d) => {
        const e = endingOf(d)
        return { key: `t-${d.id}`, statuses: d.premises.map((p) => p.status), ending: e, label: clip(d.claim, 46), color: ENDING_COPY[e].color, word: ENDING_COPY[e].eyebrow }
      }),
    [debates],
  )
  const lamps3d = useMemo(() => sessions.map((s) => `l-${s.id}`), [sessions])
  function pick(key: string) {
    const d = debates.find((x) => `t-${x.id}` === key)
    if (d) return setSelected({ kind: 'temple', d })
    const s = sessions.find((x) => `l-${x.id}` === key)
    if (s) setSelected({ kind: 'lamp', s })
  }
  const selectedKey = selected ? (selected.kind === 'temple' ? `t-${selected.d.id}` : `l-${selected.s.id}`) : null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <style>{`
        .ls-btn:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        .ls-enter { animation: lsEnter .9s cubic-bezier(.16,1,.3,1) both; }
        @keyframes lsEnter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes lsTwinkle { 0%,100% { opacity: .25 } 50% { opacity: .95 } }
        @keyframes lsFlame { 0%,100% { transform: scale(1,1) } 50% { transform: scale(.88,1.16) } }
        @keyframes lsGlow { 0%,100% { opacity: .55 } 50% { opacity: .85 } }
        .ls-star { animation: lsTwinkle 3.6s ease-in-out infinite; }
        .ls-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: lsFlame .9s ease-in-out infinite; }
        .ls-glow { animation: lsGlow 3s ease-in-out infinite; }
        .ls-item { cursor: pointer; outline: none; }
        .ls-item .ls-hover { opacity: 0; transition: opacity .3s ease; }
        .ls-item:hover .ls-hover, .ls-item:focus-visible .ls-hover { opacity: 1; }
        @media (prefers-reduced-motion: reduce) { .ls-enter, .ls-star, .ls-flame, .ls-glow { animation: none; } }
      `}</style>

      <header className="flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: C.line, paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate('/app')} className="ls-btn flex h-11 w-11 items-center justify-center rounded-full" aria-label="Back to the sanctuary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <span style={{ fontFamily: F.display, fontSize: 19 }}>Your Landscape</span>
          <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>
            {debates.length} {debates.length === 1 ? 'TEMPLE' : 'TEMPLES'} · {sessions.length} {sessions.length === 1 ? 'LAMP' : 'LAMPS'}
          </span>
        </div>
      </header>

      <div ref={wrapRef} className={`relative min-h-0 flex-1 ${no3d ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {!no3d && (
          <Suspense fallback={null}>
            <Landscape3D temples={temples3d} lamps={lamps3d} selected={selectedKey} onPick={pick} onFail={() => setNo3d(true)} />
          </Suspense>
        )}
        {!no3d ? (
          empty ? (
            <div className="absolute inset-x-0 bottom-0 z-[1] px-4 pb-6" style={{ background: 'linear-gradient(180deg, rgba(11,13,17,0), rgba(11,13,17,.92) 30%)' }}>
              <EmptyHill onTemple={() => navigate('/app/debate')} onSymposium={() => navigate('/app/symposium')} />
            </div>
          ) : (
            <>
              {debates.length > 0 && <Tally counts={counts} />}
              {sessions.length > 0 && (
                <nav aria-label="Conversations" className="absolute inset-x-0 bottom-0 z-[1] flex items-center gap-2 overflow-x-auto px-3 py-2.5" style={{ background: 'rgba(11,13,17,.82)', borderTop: `1px solid ${C.line}`, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
                  <span className="shrink-0" style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.2em', color: C.gilt }}>LAMPS</span>
                  {sessions.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSelected({ kind: 'lamp', s })} className="ls-btn min-h-[40px] max-w-[220px] shrink-0 truncate rounded-full border px-3.5" style={{ borderColor: C.line, color: C.body, fontFamily: F.read, fontSize: 13.5 }}>
                      {clip(s.situation, 34)}
                    </button>
                  ))}
                </nav>
              )}
            </>
          )
        ) : empty ? (
          <EmptyHill onTemple={() => navigate('/app/debate')} onSymposium={() => navigate('/app/symposium')} />
        ) : (
          <>
            {debates.length > 0 && <Tally counts={counts} />}
            <Hillside width={width} debates={debates} sessions={sessions} onSelect={setSelected} />
          </>
        )}
      </div>

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          {selected.kind === 'temple' ? (
            <TempleDetail d={selected.d} onAgain={() => navigate('/app/debate', { state: { prefill: selected.d.claim } })} />
          ) : (
            <LampDetail s={selected.s} />
          )}
        </Sheet>
      )}
    </div>,
    document.body,
  )
}

/* ------------------------------- the hillside ------------------------------- */

function Hillside({ width, debates, sessions, onSelect }: { width: number; debates: Debate[]; sessions: ReflectSession[]; onSelect: (s: Selected) => void }) {
  const W = Math.max(320, width)
  const cols = W < 560 ? 2 : W < 900 ? 3 : 4
  const cell = Math.min(260, W / cols)
  const rowH = cell * 0.92
  const top = 90
  const rows = Math.ceil(debates.length / cols)
  const lampTop = top + rows * rowH + 40
  const lampCols = Math.max(1, Math.min(sessions.length, Math.max(3, Math.floor(W / 140)), cols * 2))
  const lampRows = Math.ceil(sessions.length / lampCols)
  const H = Math.max(lampTop + (sessions.length ? 70 + lampRows * 100 : 0) + 40, 520)
  const offset = (W - cols * cell) / 2

  // deterministic stars
  const stars = Array.from({ length: 70 }, (_, i) => {
    const r = (n: number) => {
      const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    return { x: r(1) * W, y: r(2) * 80, s: 0.5 + r(3) * 1.1, d: r(4) * 4 }
  })

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="list" aria-label="Your hillside">
      <defs>
        <linearGradient id="lsSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070b" />
          <stop offset="1" stopColor="#1a2333" />
        </linearGradient>
        <radialGradient id="lsGold">
          <stop offset="0" stopColor="#FFE3A0" stopOpacity=".7" />
          <stop offset="1" stopColor="#F3D27A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lsWarm">
          <stop offset="0" stopColor="#FFC27A" stopOpacity=".7" />
          <stop offset="1" stopColor="#F09A50" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height="120" fill="url(#lsSky)" />
      {stars.map((s, i) => (
        <circle key={i} className="ls-star" cx={s.x} cy={s.y} r={s.s} fill="#EDE6D6" style={{ animationDelay: `-${s.d}s` }} />
      ))}
      <path d={`M0 110 C ${W * 0.25} 70, ${W * 0.6} 60, ${W} 95 L${W} ${H} L0 ${H} Z`} fill="#0f131b" />
      <path d={`M0 110 C ${W * 0.25} 70, ${W * 0.6} 60, ${W} 95`} fill="none" stroke="#1B2130" strokeWidth="1.5" />

      {/* terraces */}
      {Array.from({ length: rows }, (_, r) => (
        <path key={r} d={`M0 ${top + (r + 1) * rowH - 18} Q ${W / 2} ${top + (r + 1) * rowH - 30} ${W} ${top + (r + 1) * rowH - 18}`} fill="none" stroke="#161b25" strokeWidth="10" />
      ))}

      {debates.map((d, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        const stagger = cols > 2 ? (r % 2 ? cell * 0.1 : -cell * 0.04) : 0
        const cx = offset + c * cell + cell / 2 + stagger * (c === cols - 1 ? -1 : 1)
        const base = top + r * rowH + rowH * 0.62
        const ending = endingOf(d)
        return (
          <g
            key={d.id}
            className="ls-item ls-enter"
            role="listitem"
            tabIndex={0}
            aria-label={`${d.conclusion || d.claim}. ${ENDING_COPY[ending].eyebrow.toLowerCase()}. ${shortDate(d.id)}.`}
            onClick={() => onSelect({ kind: 'temple', d })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect({ kind: 'temple', d })
              }
            }}
            style={{ animationDelay: `${Math.min(i, 12) * 0.08}s` }}
          >
            <rect x={cx - cell / 2 + 6} y={base - rowH * 0.62} width={cell - 12} height={rowH - 6} rx="6" fill="rgba(194,161,94,.06)" className="ls-hover" stroke="rgba(194,161,94,.35)" />
            <MiniTemple cx={cx} base={base} size={cell * 0.5} statuses={d.premises.map((p) => p.status)} ending={ending} />
            <text x={cx} y={base + 24} textAnchor="middle" fill={C.ivory} style={{ fontFamily: F.read, fontSize: 13 }}>
              {clip(d.conclusion || d.claim, Math.floor(cell / 8.4))}
            </text>
            <text x={cx} y={base + 41} textAnchor="middle" fill={ENDING_COPY[ending].color} style={{ fontFamily: F.inscr, fontSize: 9, fontWeight: 600, letterSpacing: '.2em' }}>
              {ENDING_COPY[ending].eyebrow}
            </text>
          </g>
        )
      })}

      {sessions.length > 0 && (
        <g>
          <text x={W / 2} y={lampTop + 20} textAnchor="middle" fill={C.gilt} style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em' }}>
            LAMPS FROM THE SYMPOSIUM
          </text>
          <path d={`M24 ${lampTop + 36} L${W - 24} ${lampTop + 36}`} stroke="#1f2633" strokeWidth="4" strokeLinecap="round" />
          {sessions.map((s, i) => {
            const r = Math.floor(i / lampCols)
            const c = i % lampCols
            const span = Math.min(W / lampCols, 180)
            const x = (W - span * lampCols) / 2 + span * c + span / 2
            const y = lampTop + 92 + r * 100
            return (
              <g
                key={s.id}
                className="ls-item ls-enter"
                role="listitem"
                tabIndex={0}
                aria-label={`Conversation: ${s.situation}. ${shortDate(s.id)}.`}
                onClick={() => onSelect({ kind: 'lamp', s })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect({ kind: 'lamp', s })
                  }
                }}
                style={{ animationDelay: `${0.4 + Math.min(i, 12) * 0.06}s` }}
              >
                <rect x={x - span / 2 + 6} y={y - 56} width={span - 12} height="92" rx="6" fill="rgba(194,161,94,.06)" className="ls-hover" stroke="rgba(194,161,94,.35)" />
                <circle className="ls-glow" cx={x} cy={y - 22} r="28" fill="url(#lsWarm)" />
                <path d={`M${x - 3} ${y} L${x - 2} ${y - 14} L${x + 2} ${y - 14} L${x + 3} ${y} Z`} fill="#8a6a3c" />
                <path d={`M${x - 12} ${y - 14} Q${x} ${y - 4} ${x + 12} ${y - 14} Q${x + 8} ${y - 19} ${x} ${y - 19} Q${x - 8} ${y - 19} ${x - 12} ${y - 14} Z`} fill="#8a6a3c" />
                <path className="ls-flame" d={`M${x} ${y - 19} C ${x - 6} ${y - 26}, ${x - 3} ${y - 34}, ${x} ${y - 40} C ${x + 3} ${y - 34}, ${x + 6} ${y - 26}, ${x} ${y - 19} Z`} fill="#FFB066" />
                <text x={x} y={y + 22} textAnchor="middle" fill={C.body} style={{ fontFamily: F.read, fontSize: 12 }}>
                  {clip(s.situation, Math.floor(span / 8))}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

/** A small temple drawn from how its debate went. */
function MiniTemple({ cx, base, size, statuses, ending }: { cx: number; base: number; size: number; statuses: PremiseStatus[]; ending: TempleEnding }) {
  const n = Math.max(2, Math.min(4, statuses.length))
  const w = size * (0.62 + n * 0.16)
  const colH = size * 0.62
  const colW = size * 0.09
  const roofY = base - size * 0.1 - colH
  const span = w - size * 0.24
  const xs = statuses.slice(0, 4).map((_, i) => cx - span / 2 + (n === 1 ? span / 2 : (i * span) / (n - 1)))
  const collapsed = ending === 'collapse'
  const marble = '#D8CFBB'
  const fresh = '#F1EADB'
  return (
    <g aria-hidden="true">
      {ending === 'victory' && <ellipse className="ls-glow" cx={cx} cy={base - colH * 0.6} rx={w * 0.75} ry={colH * 0.8} fill="url(#lsGold)" />}
      {ending !== 'victory' && ending !== 'collapse' && <ellipse cx={cx} cy={base - colH * 0.55} rx={w * 0.55} ry={colH * 0.6} fill="url(#lsWarm)" opacity={ending === 'untested' ? 0.15 : 0.3} />}
      {/* steps */}
      <rect x={cx - w / 2 - 6} y={base - 4} width={w + 12} height="5" fill="#A79F8C" opacity=".8" />
      <rect x={cx - w / 2} y={base - 9} width={w} height="5" fill="#BDB49F" opacity=".85" />
      {xs.map((x, i) => {
        const s = statuses[i]
        if (s === 'conceded' || collapsed) {
          // a fallen column: drums in the grass
          return (
            <g key={i}>
              <rect x={x - colW / 2} y={base - 9 - colW * 0.9} width={colW * 1.1} height={colW * 0.9} fill={marble} opacity=".75" />
              <rect x={x + colW * 0.8} y={base - 2} width={colH * 0.32} height={colW * 0.85} rx={colW * 0.4} fill={marble} opacity=".7" transform={`rotate(4 ${x} ${base})`} />
              <rect x={x - colW * 2.4} y={base} width={colH * 0.26} height={colW * 0.8} rx={colW * 0.4} fill={marble} opacity=".6" transform={`rotate(-6 ${x} ${base})`} />
            </g>
          )
        }
        const fill = s === 'revised' ? fresh : marble
        return (
          <g key={i}>
            <rect x={x - colW / 2} y={roofY + size * 0.12} width={colW} height={colH} fill={fill} opacity={ending === 'untested' ? 0.6 : 0.95} />
            <rect x={x - colW * 0.85} y={roofY + size * 0.1} width={colW * 1.7} height={size * 0.04} fill={fill} opacity=".95" />
            {s === 'weakened' && (
              <path d={`M${x + 1} ${roofY + size * 0.16} l-3 ${colH * 0.25} l4 ${colH * 0.2} l-4 ${colH * 0.25}`} stroke="#2B1E18" strokeWidth="1.4" fill="none" />
            )}
            {s === 'defended' && (
              <path d={`M${x + 1} ${roofY + size * 0.16} l-3 ${colH * 0.25} l4 ${colH * 0.2} l-4 ${colH * 0.25}`} stroke={C.gold} strokeWidth="1.8" fill="none" />
            )}
            {s === 'revised' && <path d={`M${x - 2} ${roofY + size * 0.2} q 4 ${colH * 0.3} -1 ${colH * 0.6}`} stroke={C.gilt} strokeWidth="1" fill="none" />}
          </g>
        )
      })}
      {collapsed ? (
        <g transform={`rotate(-9 ${cx} ${base})`}>
          <rect x={cx - w / 2 + 6} y={base - size * 0.17} width={w * 0.7} height={size * 0.1} fill="#DCD3BF" opacity=".8" />
          <path d={`M${cx - w / 2 + 6} ${base - size * 0.17} L${cx - w / 2 + 6 + w * 0.35} ${base - size * 0.36} L${cx - w / 2 + 6 + w * 0.7} ${base - size * 0.17} Z`} fill="#E6DECB" opacity=".75" />
        </g>
      ) : (
        <g>
          <rect x={cx - w / 2 + 2} y={roofY} width={w - 4} height={size * 0.1} fill="#DCD3BF" opacity={ending === 'untested' ? 0.6 : 0.95} />
          <path d={`M${cx - w / 2 - 2} ${roofY} L${cx} ${roofY - size * 0.22} L${cx + w / 2 + 2} ${roofY} Z`} fill="#E6DECB" opacity={ending === 'untested' ? 0.6 : 0.95} />
        </g>
      )}
    </g>
  )
}

/* ---------------------------------- pieces ---------------------------------- */

function Tally({ counts }: { counts: Record<TempleEnding, number> }) {
  const items = (Object.keys(counts) as TempleEnding[]).filter((k) => counts[k] > 0)
  return (
    <div className="absolute left-0 right-0 top-3 z-[1] flex flex-wrap justify-center gap-2 px-4">
      {items.map((k) => (
        <span key={k} className="rounded-full border px-3 py-1" style={{ borderColor: C.line, background: 'rgba(11,13,17,.7)', fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.16em', color: ENDING_COPY[k].color }}>
          {counts[k]} {ENDING_COPY[k].eyebrow}
        </span>
      ))}
    </div>
  )
}

function EmptyHill({ onTemple, onSymposium }: { onTemple: () => void; onSymposium: () => void }) {
  return (
    <div className="ls-enter mx-auto flex max-w-[460px] flex-col items-center gap-4 px-6 pt-16 text-center">
      <svg width="200" height="120" viewBox="0 0 200 120" aria-hidden="true">
        <path d="M0 110 C 50 70, 150 70, 200 110 Z" fill="#141924" />
        <path d="M70 96 L130 96 M76 96 L76 74 M88 96 L88 74 M100 96 L100 74 M112 96 L112 74 M124 96 L124 74" stroke="#3a4250" strokeWidth="3" strokeDasharray="4 5" />
        <path d="M68 74 L100 58 L132 74 Z" fill="none" stroke="#3a4250" strokeWidth="2" strokeDasharray="4 5" />
      </svg>
      <p style={{ fontFamily: F.display, fontSize: 24, lineHeight: 1.2 }}>Your hillside is still empty.</p>
      <p style={{ fontFamily: F.read, fontSize: 15.5, lineHeight: 1.6, color: C.body }}>
        Every belief you defend in the Temple will stand here as its own temple, showing where it held, cracked, changed or fell. Conversations from the Symposium leave a lamp.
      </p>
      <div className="flex w-full gap-2.5">
        <button type="button" onClick={onSymposium} className="btn-bronze ls-btn min-h-[50px] flex-1 rounded border" style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontWeight: 500 }}>
          Go to the Symposium
        </button>
        <button type="button" onClick={onTemple} className="btn-gilt ls-btn min-h-[50px] flex-1 rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
          Test a belief
        </button>
      </div>
    </div>
  )
}

function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[2] flex items-end justify-center md:items-center" style={{ background: 'rgba(5,7,11,.6)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="panel-stone ls-enter relative max-h-[82vh] w-full max-w-[560px] overflow-y-auto rounded-t-lg border md:rounded-lg"
        style={{ background: C.panel, borderColor: C.line, paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="greek-key mx-4 mt-2 shrink-0" aria-hidden="true" />
        <button type="button" onClick={onClose} aria-label="Close" className="ls-btn absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full" style={{ color: C.muted }}>
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-3 px-5 pt-5">{children}</div>
      </div>
    </div>
  )
}

function Eyebrow({ children, color = C.gilt }: { children: ReactNode; color?: string }) {
  return <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color }}>{children}</span>
}

function TempleDetail({ d, onAgain }: { d: Debate; onAgain: () => void }) {
  const ending = endingOf(d)
  const e = ENDING_COPY[ending]
  const names = d.philosopherIds.slice(0, 2).map((id) => philosopherById(id)?.name ?? id)
  return (
    <>
      <Eyebrow color={e.color}>
        {e.eyebrow} · {shortDate(d.id).toUpperCase()}
      </Eyebrow>
      <p className="pr-10" style={{ fontFamily: F.display, fontSize: 22, lineHeight: 1.2 }}>
        “{d.conclusion || d.claim}”
      </p>
      {names.length > 0 && <p style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 14.5, color: C.muted }}>Tested by {names.join(' and ')}.</p>}
      <ol className="m-0 list-none border-t p-0" style={{ borderColor: C.line }}>
        {d.premises.map((p, i) => (
          <li key={p.id} className="flex gap-3 border-b py-2.5" style={{ borderColor: C.line }}>
            <b style={{ width: 26, flexShrink: 0, fontFamily: F.inscr, fontSize: 12, color: STATUS_WORD[p.status]?.color ?? C.gilt }}>{numeral(i, p)}</b>
            <span className="flex flex-col gap-0.5">
              <span style={{ fontFamily: F.read, fontSize: 15, color: p.status === 'conceded' ? C.muted : C.body, textDecoration: p.status === 'conceded' ? 'line-through' : 'none' }}>{premiseText(p)}</span>
              <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.18em', color: STATUS_WORD[p.status]?.color ?? C.gilt }}>{(STATUS_WORD[p.status]?.label ?? p.status).toUpperCase()}</span>
            </span>
          </li>
        ))}
      </ol>
      {d.verdict?.sharpenedClaim && (
        <div className="panel-stone rounded p-3.5" style={{ background: C.raised }}>
          <Eyebrow>A STRONGER VERSION</Eyebrow>
          <p className="mt-1" style={{ fontFamily: F.display, fontSize: 18, lineHeight: 1.3 }}>
            {d.verdict.sharpenedClaim}
          </p>
        </div>
      )}
      {d.userReflection && (
        <div className="panel-stone rounded p-3.5" style={{ background: C.raised, borderLeft: `2px solid ${C.gilt}` }}>
          <Eyebrow>WHAT YOU TOOK AWAY</Eyebrow>
          <p className="mt-1" style={{ fontFamily: F.read, fontSize: 15, lineHeight: 1.55, color: C.body }}>
            {d.userReflection}
          </p>
        </div>
      )}
      <button type="button" onClick={onAgain} className="btn-gilt ls-btn mt-1 min-h-[50px] rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
        Test it again
      </button>
    </>
  )
}

function LampDetail({ s }: { s: ReflectSession }) {
  const names = s.philosopherIds.slice(0, 3).map((id) => philosopherById(id)?.name ?? id)
  return (
    <>
      <Eyebrow>A LAMP FROM THE SYMPOSIUM · {shortDate(s.id).toUpperCase()}</Eyebrow>
      <p className="pr-10" style={{ fontFamily: F.display, fontSize: 21, lineHeight: 1.25 }}>
        {s.situation}
      </p>
      {names.length > 0 && <p style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 14.5, color: C.muted }}>With {names.join(', ')}.</p>}
      {s.ending && (
        <>
          <div className="panel-stone rounded p-3.5" style={{ background: C.raised }}>
            <Eyebrow>THE TENSION</Eyebrow>
            <p className="mt-1" style={{ fontFamily: F.read, fontSize: 15, lineHeight: 1.55, color: C.body }}>
              {s.ending.tension}
            </p>
          </div>
          <div className="panel-stone rounded p-3.5" style={{ background: C.raised }}>
            <Eyebrow>A QUESTION TO CARRY</Eyebrow>
            <p className="mt-1" style={{ fontFamily: F.display, fontSize: 18, lineHeight: 1.3 }}>
              {s.ending.question}
            </p>
          </div>
        </>
      )}
      {s.userReflection && (
        <div className="panel-stone rounded p-3.5" style={{ background: C.raised, borderLeft: `2px solid ${C.gilt}` }}>
          <Eyebrow>WHAT YOU TOOK AWAY</Eyebrow>
          <p className="mt-1" style={{ fontFamily: F.read, fontSize: 15, lineHeight: 1.55, color: C.body }}>
            {s.userReflection}
          </p>
        </div>
      )}
    </>
  )
}

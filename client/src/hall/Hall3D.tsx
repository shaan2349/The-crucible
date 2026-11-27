import { useEffect, useRef, useState } from 'react'
import { liftVeilSoon } from '../night/veil'
import { ChevronLeft, ChevronRight } from '../night/icons'
import { HallScene, type HallWing } from './HallScene'
import { PHILOSOPHER_TAGS, philosopherById } from '../data/philosophers'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { loadJourney } from '../lib/storage'

/**
 * The 3D gallery, with a name plate under each bust (also the keyboard way
 * to reach it), the wing's name above, arrows to walk along and a row of
 * wings to jump between.
 */
export default function Hall3D({
  wings,
  awake,
  matches,
  onWake,
}: {
  wings: (HallWing & { sub: string })[]
  awake: string | null
  /** Thinkers matching the search; null when not searching. */
  matches: Set<string> | null
  onWake: (id: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HallScene | null>(null)
  const plates = useRef<Record<string, HTMLButtonElement | null>>({})
  const wingEls = useRef<(HTMLDivElement | null)[]>([])
  const [wing, setWing] = useState(0)
  const wakeRef = useRef(onWake)
  wakeRef.current = onWake

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const scene = new HallScene(canvas, {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onSelect: (id) => wakeRef.current(id),
    })
    sceneRef.current = scene
    liftVeilSoon()
    scene.setWings(wings)
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      scene.resize(r.width, r.height)
    })
    ro.observe(wrap)
    let raf = 0
    let lastWing = -1
    const follow = () => {
      for (const a of scene.bustAnchors()) {
        const el = plates.current[a.id]
        if (!el) continue
        el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, 0)`
        el.style.opacity = String(a.presence)
        el.style.visibility = a.presence > 0.02 ? 'visible' : 'hidden'
      }
      scene.wingAnchors().forEach((a, i) => {
        const el = wingEls.current[i]
        if (!el) return
        el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -100%)`
        el.style.opacity = String(a.presence)
      })
      const w = scene.currentWing()
      if (w !== lastWing) {
        lastWing = w
        setWing(w)
      }
      raf = requestAnimationFrame(follow)
    }
    raf = requestAnimationFrame(follow)
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') scene.step(1)
      if (e.key === 'ArrowLeft') scene.step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
    // the wings never change while the hall is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setAwake(awake)
  }, [awake])
  useEffect(() => {
    sceneRef.current?.setMatches(matches)
    const first = matches && [...matches][0]
    if (first) sceneRef.current?.goTo(first)
  }, [matches])

  const ids = wings.flatMap((w) => w.ids)
  const [met] = useState(() => new Set(Object.keys(loadJourney())))

  return (
    <div className="absolute inset-0 flex flex-col">
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="block h-full w-full touch-pan-y" style={{ cursor: 'grab' }} aria-label="The Hall of Minds: a moonlit gallery of marble busts. Drag or use the arrows to walk along it." role="img" />
        {wings.map((w, i) => (
          <div
            key={w.name}
            ref={(el) => {
              wingEls.current[i] = el
            }}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 flex flex-col items-center whitespace-nowrap text-center"
            style={{ opacity: 0 }}
          >
            <span style={{ fontFamily: F.display, fontSize: 20, color: C.ivory, textShadow: '0 2px 12px #000' }}>{w.name}</span>
            <span style={{ fontFamily: F.inscr, fontSize: 9, fontWeight: 600, letterSpacing: '.22em', color: C.gilt }}>{w.sub}</span>
          </div>
        ))}
        {ids.map((id) => {
          const p = philosopherById(id)
          if (!p) return null
          const on = awake === id
          return (
            <button
              key={id}
              ref={(el) => {
                plates.current[id] = el
              }}
              type="button"
              onClick={() => onWake(id)}
              onFocus={() => sceneRef.current?.goTo(id)}
              aria-pressed={on}
              aria-label={`${p.name}, ${p.era}. ${PHILOSOPHER_TAGS[id] ?? ''}`}
              className="hall-btn absolute left-0 top-0 flex flex-col items-center rounded-sm px-2.5 py-1 text-center transition-opacity duration-300"
              style={{ opacity: 0, visibility: 'hidden', background: on ? 'rgba(194,161,94,.2)' : 'rgba(11,13,17,.72)', border: `1px solid ${on ? C.gilt : 'rgba(194,161,94,.3)'}` }}
            >
              <span style={{ fontFamily: F.display, fontSize: 15, lineHeight: 1.15, color: on ? C.gold : C.ivory, whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ fontFamily: F.inscr, fontSize: 8, fontWeight: 600, letterSpacing: '.16em', color: C.gilt, whiteSpace: 'nowrap' }}>{(PHILOSOPHER_TAGS[id] ?? '').toUpperCase()}{met.has(id) && <span style={{ color: C.gold }}> · MET</span>}</span>
            </button>
          )
        })}
        <button type="button" onClick={() => sceneRef.current?.step(-1)} aria-label="Walk left" className="hall-btn absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border" style={{ background: 'rgba(11,13,17,.6)', borderColor: C.lineStrong, color: C.ivory }}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => sceneRef.current?.step(1)} aria-label="Walk right" className="hall-btn absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border" style={{ background: 'rgba(11,13,17,.6)', borderColor: C.lineStrong, color: C.ivory }}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <nav aria-label="Wings of the hall" className="hall-wings flex gap-2 overflow-x-auto border-t px-3 py-2.5" style={{ borderColor: C.line, background: C.night, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        {wings.map((w, i) => (
          <button
            key={w.name}
            type="button"
            onClick={() => sceneRef.current?.jumpToWing(i)}
            aria-current={wing === i}
            className="hall-btn min-h-[40px] shrink-0 rounded-full border px-3.5"
            style={wing === i ? { borderColor: C.gilt, background: 'rgba(194,161,94,.16)', color: C.gold, fontSize: 13.5 } : { borderColor: C.line, color: C.body, fontSize: 13.5 }}
          >
            {w.name}
          </button>
        ))}
      </nav>
    </div>
  )
}

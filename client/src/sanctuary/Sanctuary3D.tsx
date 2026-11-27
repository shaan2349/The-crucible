import { useEffect, useRef, useState } from 'react'
import { SanctuaryScene, type PlaceId } from './SanctuaryScene'
import { liftVeilSoon, startVeil } from '../night/veil'

export interface SanctuaryPlace {
  id: PlaceId
  name: string
  sub: string
  description: string
}

/**
 * The 3D hill, with a name plate floating over each place. The plates are
 * real links for keyboards and screen readers; tapping one, or the building
 * itself, flies the camera up before `onGo` changes the page. Calls
 * `onReady` once the first frame is drawn, or `onFail` if 3D is unavailable.
 */
export default function Sanctuary3D({
  places,
  live,
  temples,
  onGo,
  onReady,
  onFail,
}: {
  places: SanctuaryPlace[]
  live: boolean
  temples: number
  onGo: (id: PlaceId) => void
  onReady: () => void
  onFail: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SanctuaryScene | null>(null)
  const plates = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [hover, setHover] = useState<PlaceId | null>(null)
  const go = useRef(onGo)
  go.current = onGo

  const fly = (id: PlaceId) => {
    const scene = sceneRef.current
    if (!scene) return go.current(id)
    let gone = false
    const leave = () => {
      if (gone) return
      gone = true
      go.current(id)
    }
    scene.flyTo(id, leave)
    setTimeout(startVeil, 650)
    // never leave someone waiting on a slow device
    setTimeout(leave, 1500)
  }
  const flyRef = useRef(fly)
  flyRef.current = fly

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let scene: SanctuaryScene
    try {
      scene = new SanctuaryScene(canvas, {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        temples,
        onPick: (id) => flyRef.current(id),
        onHover: setHover,
      })
    } catch {
      onFail()
      return
    }
    sceneRef.current = scene
    scene.setLive(live)
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      scene.resize(r.width, r.height)
    })
    ro.observe(wrap)
    let raf = 0
    let frames = 0
    const follow = () => {
      // small or short screens get compact plates (name only)
      const compact = wrap.clientWidth < 430 || wrap.clientHeight < 420
      wrap.classList.toggle('plates-compact', compact)
      const placed: { x: number; y: number; w: number; h: number }[] = []
      const anchors = scene.anchors().slice().sort((a, b) => a.y - b.y)
      for (const a of anchors) {
        const el = plates.current[a.id]
        if (!el) continue
        const w = el.offsetWidth
        const h = el.offsetHeight
        // keep the plate on screen: its centre stays at least half its width from either edge
        const half = w / 2 + 6
        let x = Math.min(Math.max(a.x, half), wrap.clientWidth - half)
        let y = a.y
        // nudge it clear of plates already placed: sideways first, then down
        for (let tries = 0; tries < 6; tries++) {
          const hit = placed.find((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - y) < (p.h + h) / 2 + 3)
          if (!hit) break
          const push = (hit.w + w) / 2 + 6 - Math.abs(hit.x - x)
          const side = x >= hit.x ? 1 : -1
          const nx = x + side * push
          if (nx - w / 2 > 4 && nx + w / 2 < wrap.clientWidth - 4) x = nx
          else y = hit.y + (hit.h + h) / 2 + 4
        }
        placed.push({ x, y, w, h })
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
        el.style.opacity = a.visible ? '1' : '0'
        el.style.pointerEvents = a.visible ? 'auto' : 'none'
      }
      if (++frames === 3) {
        onReady()
        liftVeilSoon()
      }
      raf = requestAnimationFrame(follow)
    }
    raf = requestAnimationFrame(follow)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
    // built once; `live` is pushed in below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setLive(live)
  }, [live])

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full touch-pan-y" aria-hidden="true" style={{ cursor: 'grab' }} />
      <nav aria-label="Places in the sanctuary">
        {places.map((p) => {
          const isLive = p.id === 'temple' && live
          const on = hover === p.id
          return (
            <a
              key={p.id}
              href={`#${p.id}`}
              ref={(el) => {
                plates.current[p.id] = el
              }}
              onClick={(e) => {
                e.preventDefault()
                fly(p.id)
              }}
              onMouseEnter={() => {
                setHover(p.id)
                sceneRef.current?.setHover(p.id)
              }}
              onMouseLeave={() => {
                setHover(null)
                sceneRef.current?.setHover(null)
              }}
              onFocus={() => sceneRef.current?.setHover(p.id)}
              onBlur={() => sceneRef.current?.setHover(null)}
              aria-label={`${p.name}: ${p.description}${isLive ? ' (a debate is in progress)' : ''}`}
              className="sanctuary-plate absolute left-0 top-0 flex flex-col items-center whitespace-nowrap rounded-sm px-3 py-1 sm:px-4 sm:py-1.5 text-center transition-[opacity,box-shadow,border-color] duration-500"
              style={{
                opacity: 0,
                background: 'rgba(11,13,17,.8)',
                border: `1px solid ${on || isLive ? 'rgba(243,210,122,.85)' : 'rgba(194,161,94,.45)'}`,
                boxShadow: on ? '0 0 24px rgba(243,190,110,.35)' : 'none',
                color: '#EDE6D6',
              }}
            >
              <span style={{ fontFamily: "'Gloock', Georgia, serif", fontSize: 19, lineHeight: 1.15 }}>{p.name}</span>
              <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 9, fontWeight: 600, letterSpacing: '.22em', color: isLive ? '#F3D27A' : '#C2A15E' }}>
                {isLive ? 'DEBATE IN PROGRESS' : p.sub}
              </span>
            </a>
          )
        })}
      </nav>
    </div>
  )
}

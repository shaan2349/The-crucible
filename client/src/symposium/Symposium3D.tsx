import { useEffect, useRef } from 'react'
import { liftVeilSoon } from '../night/veil'
import { SymposiumScene } from './SymposiumScene'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'

export interface SceneSeat {
  id: string
  name: string
  color: string
}

/** The 3D table, with each guest's name plate floating above their statue. */
export default function Symposium3D({
  seats,
  speaking,
  thinking,
  lookAt = 'you',
  reactions = {},
}: {
  seats: SceneSeat[]
  speaking: number | null
  thinking: number | null
  /** Who the speaker is talking to: you, or another seat. */
  lookAt?: number | 'you'
  reactions?: Record<number, 'nods' | 'shakes' | 'thinks'>
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SymposiumScene | null>(null)
  const plateRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scene = new SymposiumScene(canvas, { reducedMotion: reduced })
    sceneRef.current = scene
    liftVeilSoon()
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      scene.resize(r.width, r.height)
      // on an upright phone the conversation lies over the lower screen; lift the table above it
      scene.setShift(window.matchMedia('(max-width: 899px) and (orientation: portrait)').matches ? 0.2 : 0)
    })
    ro.observe(wrap)
    // name plates follow the statues every frame, without re-rendering React
    let raf = 0
    const follow = () => {
      const pts = scene.anchors()
      plateRefs.current.forEach((el, i) => {
        if (!el) return
        const p = pts[i]
        if (!p) {
          el.style.opacity = '0'
          return
        }
        const half = el.offsetWidth / 2 + 6
        const x = Math.min(Math.max(p.x, half), wrap.clientWidth - half)
        el.style.transform = `translate(${x}px, ${p.y}px) translate(-50%, -100%)`
        el.style.opacity = '1'
      })
      raf = requestAnimationFrame(follow)
    }
    raf = requestAnimationFrame(follow)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  const key = seats.map((s) => s.id).join()
  useEffect(() => {
    sceneRef.current?.setSeats(seats.map((s) => s.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => {
    sceneRef.current?.setSpeaker(speaking)
  }, [speaking])
  useEffect(() => {
    sceneRef.current?.setThinking(thinking)
  }, [thinking])
  useEffect(() => {
    sceneRef.current?.setLookAt(lookAt)
  }, [lookAt])
  const reactionKey = JSON.stringify(reactions)
  useEffect(() => {
    sceneRef.current?.setReactions(reactions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactionKey])

  const label = seats.length
    ? `A lamplit table under the stars. Seated: ${seats.map((s) => s.name).join(', ')}.${speaking !== null && seats[speaking] ? ` ${seats[speaking].name} is speaking.` : ''}`
    : 'An empty lamplit table under the stars, waiting for guests.'

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" role="img" aria-label={label}>
      <canvas ref={canvasRef} className="block h-full w-full touch-pan-y" />
      {seats.map((s, i) => (
        <div
          key={s.id}
          ref={(el) => {
            plateRefs.current[i] = el
          }}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-sm px-3 py-1 transition-opacity duration-500"
          style={{
            opacity: 0,
            background: 'rgba(11,13,17,.78)',
            border: `1px solid ${speaking === i ? s.color : 'rgba(194,161,94,.35)'}`,
            fontFamily: F.display,
            fontSize: speaking === i ? 17 : 15,
            color: speaking === i ? C.ivory : C.body,
            boxShadow: speaking === i ? `0 0 18px ${s.color}55` : 'none',
          }}
        >
          {s.name}
          {thinking === i && <span style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 12, color: C.muted }}> · thinking</span>}
        </div>
      ))}
    </div>
  )
}

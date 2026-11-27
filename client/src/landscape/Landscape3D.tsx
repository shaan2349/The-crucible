import { useEffect, useRef } from 'react'
import { LandscapeScene, type TempleSpec } from './LandscapeScene'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'

export interface Labelled extends TempleSpec {
  label: string
  color: string
  word: string
}

/**
 * The 3D hill, with a small plate above each temple naming the belief. The
 * plates are also the keyboard way to open a temple; lamps open from the
 * list below the hill.
 */
export default function Landscape3D({
  temples,
  lamps,
  selected,
  onPick,
  onFail,
}: {
  temples: Labelled[]
  lamps: string[]
  selected: string | null
  onPick: (key: string) => void
  onFail: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<LandscapeScene | null>(null)
  const plates = useRef<Record<string, HTMLButtonElement | null>>({})
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let scene: LandscapeScene
    try {
      scene = new LandscapeScene(canvas, { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, onPick: (k) => pick.current(k) })
    } catch {
      onFail()
      return
    }
    sceneRef.current = scene
    scene.setLandscape(temples, lamps)
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      scene.resize(r.width, r.height)
    })
    ro.observe(wrap)
    let raf = 0
    const follow = () => {
      for (const a of scene.anchors()) {
        const el = plates.current[a.key]
        if (!el) continue
        el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -100%)`
        el.style.opacity = String(a.facing)
        el.style.visibility = a.facing > 0.05 ? 'visible' : 'hidden'
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
    // the hill is built once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setSelected(selected)
  }, [selected])

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full touch-pan-y" aria-hidden="true" style={{ cursor: 'grab' }} />
      {temples.map((t) => (
        <button
          key={t.key}
          ref={(el) => {
            plates.current[t.key] = el
          }}
          type="button"
          onClick={() => onPick(t.key)}
          aria-label={`${t.label}. ${t.word}.`}
          className="ls-btn absolute left-0 top-0 max-w-[132px] rounded-sm px-2 py-1 text-center sm:max-w-[190px]"
          style={{ opacity: 0, visibility: 'hidden', background: 'rgba(11,13,17,.78)', border: `1px solid ${selected === t.key ? C.gold : 'rgba(194,161,94,.35)'}` }}
        >
          <span className="block truncate" style={{ fontFamily: F.read, fontSize: 12.5, lineHeight: 1.3, color: C.ivory }}>
            {t.label}
          </span>
          <span className="block" style={{ fontFamily: F.inscr, fontSize: 8.5, fontWeight: 600, letterSpacing: '.16em', color: t.color }}>
            {t.word}
          </span>
        </button>
      ))}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { SanctuaryScene } from './SanctuaryScene'

/** The Sanctuary hill as a living backdrop for the welcome screen: no labels, nothing to click. */
export default function SanctuaryBackdrop({ temples }: { temples: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let scene: SanctuaryScene
    try {
      scene = new SanctuaryScene(canvas, { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, temples, onPick: () => {} })
    } catch {
      return
    }
    const fit = () => scene.resize(canvas.clientWidth, canvas.clientHeight)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    return () => {
      cancelAnimationFrame(t)
      ro.disconnect()
      scene.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-[1500ms]" style={{ opacity: shown ? 1 : 0 }} />
}

import { useEffect, useRef, useState } from 'react'
import { BackdropScene } from './BackdropScene'

/** The bay at night behind a page of words. Fades in once drawn; draws nothing if 3D is unavailable. */
export default function Backdrop3D() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let scene: BackdropScene
    try {
      scene = new BackdropScene(canvas, { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
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
  }, [])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000" style={{ opacity: shown ? 1 : 0 }} />
}

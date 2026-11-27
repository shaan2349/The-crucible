import { useEffect, useRef } from 'react'
import { OracleScene, type OracleMood } from './OracleScene'

/** The 3D ledge and fire behind the Oracle's page. `scroll` is 0–1 as the reader moves down the page. */
export default function Oracle3D({ mood, scroll, onFail }: { mood: OracleMood; scroll: number; onFail: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<OracleScene | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let scene: OracleScene
    try {
      scene = new OracleScene(canvas, { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    } catch {
      onFail()
      return
    }
    sceneRef.current = scene
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      scene.resize(r.width, r.height)
    })
    ro.observe(wrap)
    return () => {
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setMood(mood)
  }, [mood])
  useEffect(() => {
    sceneRef.current?.setScroll(scroll)
  }, [scroll])

  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}

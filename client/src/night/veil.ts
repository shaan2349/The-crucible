/**
 * The passage between places: a veil of warm lamplight that rises as the
 * camera reaches a building, covers the change of page, and lifts once the
 * next place has drawn itself. If nothing lifts it, it lifts on its own.
 */

let veil: HTMLDivElement | null = null
let fallback = 0

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function startVeil() {
  if (reduced() || typeof document === 'undefined') return
  if (!veil) {
    veil = document.createElement('div')
    veil.setAttribute('aria-hidden', 'true')
    Object.assign(veil.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity .45s ease',
      background: 'radial-gradient(60% 55% at 50% 52%, rgba(255,196,120,.55), rgba(120,70,30,.35) 45%, #0B0D11 85%)',
    })
    document.body.appendChild(veil)
  }
  const v = veil
  requestAnimationFrame(() => {
    v.style.transition = 'opacity .45s ease'
    v.style.opacity = '1'
  })
  window.clearTimeout(fallback)
  fallback = window.setTimeout(liftVeil, 3000)
}

/** Called by a place once its first frame is on screen. */
export function liftVeil() {
  window.clearTimeout(fallback)
  const v = veil
  if (!v) return
  veil = null
  v.style.transition = 'opacity .9s ease'
  v.style.opacity = '0'
  window.setTimeout(() => v.remove(), 1000)
}

/** Lift after the next two frames, so the new scene has drawn. */
export function liftVeilSoon() {
  requestAnimationFrame(() => requestAnimationFrame(liftVeil))
}

/** For scenes: how far into its arrival (0 → 1 over `ms`) a scene is. */
export function arrival(born: number, ms = 1800) {
  if (reduced()) return 1
  const t = Math.min(1, (performance.now() - born) / ms)
  return 1 - Math.pow(1 - t, 3)
}

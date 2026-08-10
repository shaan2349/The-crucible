import { useEffect } from 'react'
import type { Preferences } from '../lib/storage'

// Below this, the app is still effectively a phone/small-tablet layout and
// keeps its existing narrow column. At or above it, there's real room to
// use, so the same comfortable/wide choice maps to a properly desktop-sized
// reading column instead of the same ~448px strip stranded in the middle
// of a 1440px window.
const DESKTOP_BREAKPOINT = 860

function readingWidthFor(prefs: Preferences): string {
  const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT
  if (prefs.readingWidth === 'wide') return isDesktop ? '48rem' : '36rem'
  return isDesktop ? '42rem' : '28rem'
}

/**
 * Applies Settings preferences to the document root — a global font-size
 * scale (so every existing rem-based Tailwind text size scales together,
 * no per-component changes needed), a reading-width CSS variable AppShell
 * reads, and a .reduce-motion class that collapses all animations.
 * Called once at the app root so it applies on every route, not just /app.
 */
export function useApplyPreferences(prefs: Preferences): void {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', prefs.theme)
    root.style.fontSize = prefs.fontSize === 'large' ? '112.5%' : '100%'
    root.classList.toggle('reduce-motion', prefs.reduceMotion)

    function applyWidth() {
      root.style.setProperty('--reading-width', readingWidthFor(prefs))
    }
    applyWidth()
    window.addEventListener('resize', applyWidth)
    return () => window.removeEventListener('resize', applyWidth)
  }, [prefs])
}

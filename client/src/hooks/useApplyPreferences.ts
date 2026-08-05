import { useEffect } from 'react'
import type { Preferences } from '../lib/storage'

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
    root.style.setProperty('--reading-width', prefs.readingWidth === 'wide' ? '36rem' : '28rem')
    root.classList.toggle('reduce-motion', prefs.reduceMotion)
  }, [prefs])
}

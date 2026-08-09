import { useEffect, useRef, useState } from 'react'
import { PHILOSOPHER_PHOTOS, photoPosition, wikimediaFilePath } from '../data/philosophers'

const PHOTO_ENTRIES = Object.entries(PHILOSOPHER_PHOTOS)

function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000)
}

// Every screen mounts its own RotatingBackdrop instance (see AppShell —
// intentional, so Council can swap to the two-portrait backdrop). Without
// this, switching tabs remounted the hook each time and threw away
// whatever photo had already loaded, showing a blank flash on every
// navigation while it redid the whole load cascade from scratch. A
// module-level cache (outside React state, so it survives unmount)
// means a screen can render the last known-good photo immediately and
// only blank-flash once, on the very first load of the session.
let cache: { url: string; position: string } | null = null

/**
 * Preloads real philosopher portraits and rotates through them, one at a
 * time. Deterministic, not random: the starting point is derived from the
 * day of year, so the sequence is stable and reproducible rather than a
 * different random face on every reload. If the current candidate fails
 * to load, this does NOT cascade through other philosophers hunting for
 * one that works — that produces the exact "a different portrait appears
 * unexpectedly" confusion this is meant to avoid. It simply reports
 * failed=true so the caller shows the neutral PortraitFallback instead,
 * and tries the next philosopher in sequence on the next scheduled tick.
 */
export function useRotatingBackground(intervalMs = 30000) {
  const [bgUrl, setBgUrl] = useState<string | null>(cache?.url ?? null)
  const [bgPosition, setBgPosition] = useState(cache?.position ?? '50% 18%')
  const [failed, setFailed] = useState(false)
  const indexRef = useRef(dayOfYear() % PHOTO_ENTRIES.length)

  useEffect(() => {
    let cancelled = false

    function tryLoad() {
      if (cancelled) return
      const [id, name] = PHOTO_ENTRIES[indexRef.current % PHOTO_ENTRIES.length]
      indexRef.current += 1
      const url = wikimediaFilePath(name)
      const img = new Image()
      let settled = false
      // A stalled request (slow/unreachable Wikimedia) never fires onload
      // or onerror, which would otherwise stall the rotation indefinitely
      // on one bad candidate.
      const timeout = window.setTimeout(() => {
        if (settled) return
        settled = true
        if (!cache) setFailed(true)
      }, 7000)
      img.onload = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        if (!cancelled) {
          const position = photoPosition(id)
          cache = { url, position }
          setBgUrl(url)
          setBgPosition(position)
          setFailed(false)
        }
      }
      img.onerror = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        // Fall back to the neutral background for this tick rather than
        // immediately trying a different philosopher — the next scheduled
        // rotation gets the next candidate in sequence.
        if (!cache) setFailed(true)
      }
      img.src = url
    }

    tryLoad()
    const id = setInterval(tryLoad, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])

  return { bgUrl, bgPosition, failed }
}

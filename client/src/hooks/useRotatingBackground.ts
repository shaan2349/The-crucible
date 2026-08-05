import { useEffect, useRef, useState } from 'react'
import { PHILOSOPHER_PHOTOS, photoPosition, wikimediaFilePath } from '../data/philosophers'

const PHOTO_ENTRIES = Object.entries(PHILOSOPHER_PHOTOS)

// Every screen mounts its own RotatingBackdrop instance (see AppShell —
// intentional, so Debate can swap to the two-portrait backdrop). Without
// this, switching tabs remounted the hook each time and threw away
// whatever photo had already loaded, showing a blank flash on every
// navigation while it redid the whole load cascade from scratch. A
// module-level cache (outside React state, so it survives unmount)
// means a screen can render the last known-good photo immediately and
// only blank-flash once, on the very first load of the session.
let cache: { url: string; position: string } | null = null

/**
 * Preloads real philosopher portraits and rotates through them. Each
 * candidate is loaded via `Image()` before it's used, so a renamed or
 * deleted Wikimedia file is skipped rather than shown as a broken image —
 * after exhausting every filename once, `failed` is set so the caller can
 * fall back to an illustrated bust instead. Also returns the right
 * background-position for whichever photo is currently showing, since
 * that varies per photo (see photoPosition).
 */
export function useRotatingBackground(intervalMs = 30000) {
  const [bgUrl, setBgUrl] = useState<string | null>(cache?.url ?? null)
  const [bgPosition, setBgPosition] = useState(cache?.position ?? '50% 18%')
  const [failed, setFailed] = useState(false)
  const indexRef = useRef(Math.floor(Math.random() * PHOTO_ENTRIES.length))

  useEffect(() => {
    let cancelled = false

    function tryLoad(attemptsLeft: number) {
      if (cancelled) return
      if (attemptsLeft <= 0) {
        // Only give up visibly if there's nothing cached to fall back
        // to — otherwise keep showing the last known-good photo.
        if (!cache) setFailed(true)
        return
      }
      const [id, name] = PHOTO_ENTRIES[indexRef.current % PHOTO_ENTRIES.length]
      indexRef.current += 1
      const url = wikimediaFilePath(name)
      const img = new Image()
      let settled = false
      // A stalled request (slow/unreachable Wikimedia) never fires onload
      // or onerror, which otherwise stalls the whole rotation on one bad
      // candidate instead of moving on to the next photo.
      const timeout = window.setTimeout(() => {
        if (settled) return
        settled = true
        tryLoad(attemptsLeft - 1)
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
        tryLoad(attemptsLeft - 1)
      }
      img.src = url
    }

    tryLoad(PHOTO_ENTRIES.length)
    const id = setInterval(() => tryLoad(PHOTO_ENTRIES.length), intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])

  return { bgUrl, bgPosition, failed }
}

type BustVariant = { laurel?: boolean; bearded?: boolean; plinth?: boolean }

const BUST_VARIANTS: BustVariant[] = [{}, { laurel: true }, { bearded: true }, { plinth: true }]

export function useRotatingBustVariant(intervalMs = 30000): BustVariant {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % BUST_VARIANTS.length), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return BUST_VARIANTS[index]
}

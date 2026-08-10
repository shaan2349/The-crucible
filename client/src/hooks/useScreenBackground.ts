import { useEffect, useState } from 'react'
import { BACKGROUND_REGISTRY, type BackgroundScreenId } from '../data/backgrounds'
import { PHILOSOPHER_PHOTOS, photoPosition, wikimediaFilePath } from '../data/philosophers'

function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000)
}

// A stable, non-random offset per screen name, so two screens with
// overlapping pools (or the same day-of-year seed) don't land on the same
// index by coincidence.
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

interface StoredChoice {
  url: string | null
  position: string
}

function storageKey(screen: BackgroundScreenId): string {
  return `crucible:bg:${screen}`
}

function readStored(screen: BackgroundScreenId): StoredChoice | null {
  try {
    const raw = sessionStorage.getItem(storageKey(screen))
    return raw ? (JSON.parse(raw) as StoredChoice) : null
  } catch {
    return null
  }
}

function writeStored(screen: BackgroundScreenId, choice: StoredChoice) {
  try {
    sessionStorage.setItem(storageKey(screen), JSON.stringify(choice))
  } catch {
    // sessionStorage unavailable (private mode, quota) — the pick just
    // won't survive a reload; it's still deterministic for this mount.
  }
}

/**
 * Picks ONE background for a screen and keeps it for the rest of the
 * session. No `Math.random()` — the pick is a deterministic function of
 * the day and the screen's own name — and no cascading through other
 * candidates if the pick fails to load, which is what produced the
 * "different portrait than expected" confusion the old shared rotation
 * had. Each screen has its own curated pool (see backgrounds.ts) and its
 * own hashed offset into it, and the result is cached in sessionStorage
 * (not just component state) keyed by screen name — so navigating
 * between tabs never reselects or swaps a screen's background, and two
 * different screens never accidentally end up sharing one because they
 * happened to mount around the same time. A fresh tab re-rolls the daily
 * pick; a reload within the same tab does not.
 */
export function useScreenBackground(screen: BackgroundScreenId) {
  const { pool, dimmed } = BACKGROUND_REGISTRY[screen]
  const [bg, setBg] = useState<StoredChoice | null>(() =>
    pool.length === 0 ? { url: null, position: '50% 18%' } : readStored(screen),
  )

  useEffect(() => {
    if (pool.length === 0) return
    const existing = readStored(screen)
    if (existing) {
      setBg(existing)
      return
    }

    let cancelled = false
    const index = (dayOfYear() + hashString(screen)) % pool.length
    const id = pool[index]
    const filename = PHILOSOPHER_PHOTOS[id]
    const position = photoPosition(id)
    if (!filename) {
      const choice = { url: null, position }
      writeStored(screen, choice)
      setBg(choice)
      return
    }

    const url = wikimediaFilePath(filename)
    const img = new Image()
    let settled = false
    // A stalled request (slow/unreachable source) never fires onload or
    // onerror on its own — this bounds how long a screen can sit showing
    // nothing but the fallback before committing to it for the session.
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      const choice = { url: null, position }
      writeStored(screen, choice)
      if (!cancelled) setBg(choice)
    }, 7000)
    img.onload = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      const choice = { url, position }
      writeStored(screen, choice)
      if (!cancelled) setBg(choice)
    }
    img.onerror = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      const choice = { url: null, position }
      writeStored(screen, choice)
      if (!cancelled) setBg(choice)
    }
    img.src = url

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  return { bgUrl: bg?.url ?? null, bgPosition: bg?.position ?? '50% 18%', dimmed }
}

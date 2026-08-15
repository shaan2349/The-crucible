import { useEffect, useState } from 'react'
import { BACKGROUND_REGISTRY, type BackgroundScreenId } from '../data/backgrounds'
import { PHILOSOPHER_PHOTOS, photoPosition, wikimediaFilePath } from '../data/philosophers'

// A stable, non-random offset per screen name, so two screens with
// overlapping pools (or the same session seed) don't land on the same
// index by coincidence.
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const SESSION_SEED_KEY = 'crucible:bg:seed'

/**
 * One random seed per browser tab, generated once and cached in
 * sessionStorage — every screen's pick derives from this plus its own
 * hashed offset. Previously this was `dayOfYear()`, which meant every
 * screen showed the exact same portrait to every visitor all day long
 * (the "it's always Descartes" complaint) since the pick only changed at
 * midnight, not per visit. A session seed means a fresh tab genuinely
 * gets a different rotation, while a reload within the same tab still
 * shows the same pick (no flicker) via the existing per-screen
 * sessionStorage cache below.
 */
function sessionSeed(): number {
  try {
    const existing = sessionStorage.getItem(SESSION_SEED_KEY)
    if (existing) return Number(existing)
    const seed = Math.floor(Math.random() * 1_000_000)
    sessionStorage.setItem(SESSION_SEED_KEY, String(seed))
    return seed
  } catch {
    // sessionStorage unavailable — fall back to a fixed seed rather than
    // Math.random() on every call, which would make the pick flicker.
    return 0
  }
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
 * session. No `Math.random()` per render — the pick is a deterministic
 * function of a per-tab session seed and the screen's own name (see
 * sessionSeed above), so it never flickers mid-session, and no cascading
 * through other candidates if the pick fails to load, which is what
 * produced the "different portrait than expected" confusion the old
 * shared rotation had. Each screen has its own curated pool (see
 * backgrounds.ts) and its own hashed offset into it, and the result is
 * cached in sessionStorage (not just component state) keyed by screen
 * name — so navigating between tabs never reselects or swaps a screen's
 * background, and two different screens never accidentally end up
 * sharing one because they happened to mount around the same time.
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
    const index = (sessionSeed() + hashString(screen)) % pool.length
    const id = pool[index]
    const filename = PHILOSOPHER_PHOTOS[id]
    const position = photoPosition(id)
    if (!filename) {
      const choice = { url: null, position }
      writeStored(screen, choice)
      setBg(choice)
      return
    }

    // Requested at 900px, not the 1200px default used for focal
    // portraits — this image sits behind a heavy scrim/gradient overlay
    // and is never viewed sharp, so the smaller request is visually
    // indistinguishable but meaningfully faster and less likely to time
    // out on a slower connection, which was the actual cause of screens
    // routinely falling back to the plain texture instead of a photo.
    const url = wikimediaFilePath(filename, 900)
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
    }, 10_000)
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

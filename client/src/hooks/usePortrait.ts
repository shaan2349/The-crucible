import { useEffect, useState } from 'react'
import { PHILOSOPHER_PHOTOS, wikimediaFilePath } from '../data/philosophers'

// Same philosopher can be shown many times in a session (a Library row
// revisited, a debate rematch, the same person appearing in both the
// avatar list and a debate backdrop) — without this, every single
// appearance re-fetched and re-showed a loading gap even though the
// browser likely already has the image cached. Keyed by id+width since
// different contexts request different thumbnail sizes.
const cache = new Map<string, { url: string | null; failed: boolean }>()

/**
 * Warms the shared portrait cache for a philosopher ahead of time — used
 * during the Reflect → Council transition so the cast-reveal portraits
 * are already resolved (or already known to have failed) by the time
 * they're actually rendered, instead of popping in individually. Shares
 * the exact same cache/key scheme as usePortrait, so a later
 * `usePortrait(id, width)` call with the same width is a cache hit.
 * Resolves once settled either way — callers don't need to know whether
 * it succeeded, only that it's no longer in flight.
 */
export function preloadPortrait(philosopherId: string, width = 1200): Promise<void> {
  const cacheKey = `${philosopherId}:${width}`
  if (cache.has(cacheKey)) return Promise.resolve()

  const filename = PHILOSOPHER_PHOTOS[philosopherId]
  if (!filename) {
    cache.set(cacheKey, { url: null, failed: true })
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const target = wikimediaFilePath(filename, width)
    const img = new Image()
    let settled = false
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      cache.set(cacheKey, { url: null, failed: true })
      resolve()
    }, 7000)
    img.onload = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      cache.set(cacheKey, { url: target, failed: false })
      resolve()
    }
    img.onerror = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      cache.set(cacheKey, { url: null, failed: true })
      resolve()
    }
    img.src = target
  })
}

/**
 * Resolves a single philosopher's portrait, preloaded before use. Returns
 * failed=true both when the id has no mapped photo and when the mapped
 * file doesn't load — callers should treat both the same way (fall back
 * to the bust illustration) rather than distinguish them.
 */
export function usePortrait(
  philosopherId: string | undefined,
  width = 1200,
): { url: string | null; failed: boolean } {
  const cacheKey = philosopherId ? `${philosopherId}:${width}` : null
  const cached = cacheKey ? cache.get(cacheKey) : undefined

  const [url, setUrl] = useState<string | null>(cached?.url ?? null)
  const [failed, setFailed] = useState(cached?.failed ?? false)

  useEffect(() => {
    if (!philosopherId || !cacheKey) {
      setUrl(null)
      setFailed(false)
      return
    }

    const fromCache = cache.get(cacheKey)
    if (fromCache) {
      setUrl(fromCache.url)
      setFailed(fromCache.failed)
      return
    }

    setUrl(null)
    setFailed(false)

    const filename = PHILOSOPHER_PHOTOS[philosopherId]
    if (!filename) {
      cache.set(cacheKey, { url: null, failed: true })
      setFailed(true)
      return
    }

    let unmounted = false
    let settled = false
    const target = wikimediaFilePath(filename, width)
    const img = new Image()
    // A stalled request (slow/unreachable Wikimedia, flaky connection)
    // otherwise never resolves onload or onerror, leaving the caller in
    // an indefinite "still loading" limbo with nothing to show — this
    // timeout guarantees a fallback appears within a bounded time.
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      cache.set(cacheKey, { url: null, failed: true })
      if (!unmounted) setFailed(true)
    }, 7000)
    img.onload = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      cache.set(cacheKey, { url: target, failed: false })
      if (!unmounted) setUrl(target)
    }
    img.onerror = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      cache.set(cacheKey, { url: null, failed: true })
      if (!unmounted) setFailed(true)
    }
    img.src = target

    return () => {
      unmounted = true
      window.clearTimeout(timeout)
    }
  }, [philosopherId, width, cacheKey])

  return { url, failed }
}

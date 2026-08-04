import { useEffect, useState } from 'react'
import { PHILOSOPHER_PHOTOS, wikimediaFilePath } from '../data/philosophers'

/**
 * Resolves a single philosopher's portrait, preloaded before use. Returns
 * failed=true both when the id has no mapped photo and when the mapped
 * file doesn't load — callers should treat both the same way (fall back
 * to the bust illustration) rather than distinguish them.
 */
export function usePortrait(philosopherId: string | undefined): { url: string | null; failed: boolean } {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setUrl(null)
    setFailed(false)
    if (!philosopherId) return

    const filename = PHILOSOPHER_PHOTOS[philosopherId]
    if (!filename) {
      setFailed(true)
      return
    }

    let cancelled = false
    const target = wikimediaFilePath(filename)
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setUrl(target)
    }
    img.onerror = () => {
      if (!cancelled) setFailed(true)
    }
    img.src = target

    return () => {
      cancelled = true
    }
  }, [philosopherId])

  return { url, failed }
}

import { useEffect, useRef, useState } from 'react'
import { BG_FILES, wikimediaFilePath } from '../data/philosophers'

/**
 * Preloads real philosopher portraits and rotates through them. Each
 * candidate is loaded via `Image()` before it's used, so a renamed or
 * deleted Wikimedia file is skipped rather than shown as a broken image —
 * after exhausting every filename once, `failed` is set so the caller can
 * fall back to an illustrated bust instead.
 */
export function useRotatingBackground(intervalMs = 30000) {
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const indexRef = useRef(Math.floor(Math.random() * BG_FILES.length))

  useEffect(() => {
    let cancelled = false

    function tryLoad(attemptsLeft: number) {
      if (cancelled) return
      if (attemptsLeft <= 0) {
        setFailed(true)
        return
      }
      const name = BG_FILES[indexRef.current % BG_FILES.length]
      indexRef.current += 1
      const url = wikimediaFilePath(name)
      const img = new Image()
      img.onload = () => {
        if (!cancelled) {
          setBgUrl(url)
          setFailed(false)
        }
      }
      img.onerror = () => tryLoad(attemptsLeft - 1)
      img.src = url
    }

    tryLoad(BG_FILES.length)
    const id = setInterval(() => tryLoad(BG_FILES.length), intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])

  return { bgUrl, failed }
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

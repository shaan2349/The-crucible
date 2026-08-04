import { useEffect, useRef, useState } from 'react'
import { PHILOSOPHER_PHOTOS, photoPosition, wikimediaFilePath } from '../data/philosophers'

const PHOTO_ENTRIES = Object.entries(PHILOSOPHER_PHOTOS)

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
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [bgPosition, setBgPosition] = useState('50% 18%')
  const [failed, setFailed] = useState(false)
  const indexRef = useRef(Math.floor(Math.random() * PHOTO_ENTRIES.length))

  useEffect(() => {
    let cancelled = false

    function tryLoad(attemptsLeft: number) {
      if (cancelled) return
      if (attemptsLeft <= 0) {
        setFailed(true)
        return
      }
      const [id, name] = PHOTO_ENTRIES[indexRef.current % PHOTO_ENTRIES.length]
      indexRef.current += 1
      const url = wikimediaFilePath(name)
      const img = new Image()
      img.onload = () => {
        if (!cancelled) {
          setBgUrl(url)
          setBgPosition(photoPosition(id))
          setFailed(false)
        }
      }
      img.onerror = () => tryLoad(attemptsLeft - 1)
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

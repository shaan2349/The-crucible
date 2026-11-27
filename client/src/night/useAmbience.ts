import { useEffect } from 'react'
import { createAmbience, type AmbiencePreset } from '../sanctuary/ambience'

/** Plays a place's night sounds from the visitor's first touch until they leave; follows the sound setting from the hill. */
export function useAmbience(preset: AmbiencePreset) {
  useEffect(() => {
    const a = createAmbience(preset)
    const begin = () => a.start()
    // arriving from the hill counts as a touch already given, so try at once too
    begin()
    window.addEventListener('pointerdown', begin, { once: true })
    window.addEventListener('keydown', begin, { once: true })
    return () => {
      window.removeEventListener('pointerdown', begin)
      window.removeEventListener('keydown', begin)
      a.dispose()
    }
  }, [preset])
}

import { useEffect, useState } from 'react'

/** Reads Council responses aloud via the Web Speech API. `speakingId` is
 * whichever caller-supplied id is currently playing (e.g. a philosopher
 * attack's `${round}-${index}` key), so a single hook instance can drive
 * a whole conversation's worth of speaker buttons. */
export function useTextToSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  function speak(id: string, text: string) {
    if (!supported) return
    window.speechSynthesis.cancel()
    if (speakingId === id) {
      setSpeakingId(null)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.98
    utterance.onend = () => setSpeakingId((cur) => (cur === id ? null : cur))
    utterance.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur))
    setSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (supported) window.speechSynthesis.cancel()
    setSpeakingId(null)
  }

  return { supported, speakingId, speak, stop }
}

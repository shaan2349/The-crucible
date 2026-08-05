import { useEffect, useRef, useState } from 'react'

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: any) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
}

/** Dictation via the Web Speech API — no backend involved, native to
 * Chrome/Edge. `start` takes its callback per-call (not fixed at hook
 * construction) so one instance can serve whichever field last requested it. */
export function useSpeechToText() {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const supported = !!getCtor()

  useEffect(() => {
    return () => recognitionRef.current?.stop()
  }, [])

  function start(onResult: (text: string) => void) {
    const Ctor = getCtor()
    if (!Ctor || listening) return
    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as ArrayLike<any>)
        .map((r: any) => r[0].transcript)
        .join(' ')
      onResult(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return { supported, listening, start, stop }
}

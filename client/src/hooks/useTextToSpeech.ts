import { useEffect, useRef, useState } from 'react'
import { voiceProfileFor } from '../data/voiceProfiles'

let cachedVoices: SpeechSynthesisVoice[] | null = null
const voiceAssignment = new Map<string, SpeechSynthesisVoice | null>()

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function englishVoicePool(): SpeechSynthesisVoice[] {
  if (cachedVoices) return cachedVoices
  const all = window.speechSynthesis.getVoices()
  const english = all.filter((v) => v.lang.toLowerCase().startsWith('en'))
  // Alphabetical, not insertion order — insertion order from getVoices()
  // isn't guaranteed stable across calls/sessions on every browser, so
  // sorting first is what actually makes the assignment below
  // deterministic rather than just usually-the-same.
  const pool = [...(english.length > 0 ? english : all)].sort((a, b) => a.name.localeCompare(b.name))
  if (pool.length > 0) cachedVoices = pool
  return pool
}

/** The same philosopher gets the same voice for the life of the tab —
 * hashed id into an alphabetically-sorted voice list, not a random pick
 * re-rolled on every call. Falls back to the browser's default voice
 * (null) if no voice list is available yet. */
function voiceForPhilosopher(philosopherId: string): SpeechSynthesisVoice | null {
  const cached = voiceAssignment.get(philosopherId)
  if (cached !== undefined) return cached
  const pool = englishVoicePool()
  if (pool.length === 0) return null
  const voice = pool[hashString(philosopherId) % pool.length]
  voiceAssignment.set(philosopherId, voice)
  return voice
}

/** Splits into sentence-ish chunks for sequential playback with a short
 * pause between each — a long response read as one continuous utterance
 * is a big part of why generated speech reads as a wall of text rather
 * than someone actually talking. Falls back to the whole string if it
 * doesn't look like normal sentence-punctuated prose. */
function chunkForSpeech(text: string): string[] {
  const chunks = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean)
  return chunks && chunks.length > 0 ? chunks : [text]
}

const PAUSE_BETWEEN_CHUNKS_MS = 180

/** Reads Council responses aloud via the Web Speech API. `speakingId` is
 * whichever caller-supplied id is currently playing (e.g. a philosopher
 * attack's `${round}-${index}` key), so a single hook instance can drive
 * a whole conversation's worth of speaker buttons. Each philosopher gets
 * a stable voice + a deliberately different pace/pitch (voiceProfiles.ts)
 * rather than every response being read identically. */
export function useTextToSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  // A generation counter, not a plain boolean — speak() can be called
  // again (a different id, or the same id to restart) before the
  // browser has actually fired onend/onerror for whatever was playing,
  // and a shared boolean can't tell "the old call was cancelled" apart
  // from "a new call just started", which caused stray extra chunks to
  // play from a call that should have stopped.
  const generationRef = useRef(0)

  useEffect(() => {
    if (!supported) return
    // Most browsers load the voice list asynchronously; invalidate the
    // cache once so the first real speak() call picks up the full list
    // instead of whatever was available at page-load.
    const handler = () => {
      cachedVoices = null
      voiceAssignment.clear()
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handler)
  }, [supported])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  function playChunks(chunks: string[], index: number, id: string, generation: number, voice: SpeechSynthesisVoice | null, rate: number, pitch: number) {
    if (generationRef.current !== generation) return
    if (index >= chunks.length) {
      setSpeakingId((cur) => (cur === id ? null : cur))
      return
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index])
    utterance.rate = rate
    utterance.pitch = pitch
    if (voice) utterance.voice = voice
    utterance.onend = () => {
      if (generationRef.current !== generation) return
      window.setTimeout(() => playChunks(chunks, index + 1, id, generation, voice, rate, pitch), PAUSE_BETWEEN_CHUNKS_MS)
    }
    utterance.onerror = () => {
      if (generationRef.current === generation) setSpeakingId((cur) => (cur === id ? null : cur))
    }
    window.speechSynthesis.speak(utterance)
  }

  function speak(id: string, text: string, philosopherId: string) {
    if (!supported) return
    const restartingSame = speakingId === id
    window.speechSynthesis.cancel()
    generationRef.current += 1
    if (restartingSame) {
      setSpeakingId(null)
      return
    }
    const generation = generationRef.current
    const { rate, pitch } = voiceProfileFor(philosopherId)
    const voice = voiceForPhilosopher(philosopherId)
    const chunks = chunkForSpeech(text)
    setSpeakingId(id)
    playChunks(chunks, 0, id, generation, voice, rate, pitch)
  }

  function stop() {
    generationRef.current += 1
    if (supported) window.speechSynthesis.cancel()
    setSpeakingId(null)
  }

  return { supported, speakingId, speak, stop }
}

interface VoiceProfile {
  /** SpeechSynthesisUtterance.rate — 1 is the browser default. */
  rate: number
  /** SpeechSynthesisUtterance.pitch — 1 is the browser default. */
  pitch: number
}

/**
 * Delivery profiles for spoken playback — pacing and pitch only, since
 * that's what the Web Speech API actually exposes (no SSML, no premium
 * voice service). These are interpretive, not historical: nobody knows
 * what Socrates actually sounded like. Explicitly specified for the
 * philosophers with a clear, distinct delivery in mind; everyone else
 * gets a small deterministic variation (see DEFAULT_PROFILE below) so
 * the roster doesn't all sound identically flat, without pretending to
 * have a considered take on all 47.
 */
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  socrates: { rate: 0.92, pitch: 1.02 },
  nietzsche: { rate: 1.08, pitch: 0.97 },
  marcus: { rate: 0.88, pitch: 0.95 },
  mill: { rate: 1.0, pitch: 1.0 },
  hayek: { rate: 0.96, pitch: 0.98 },
  marx: { rate: 1.1, pitch: 0.96 },
  hume: { rate: 1.02, pitch: 1.04 },
}

const DEFAULT_PROFILE: VoiceProfile = { rate: 1, pitch: 1 }

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Deterministic — the same philosopher always gets the same profile,
 * not a different one each render. */
export function voiceProfileFor(philosopherId: string): VoiceProfile {
  const explicit = VOICE_PROFILES[philosopherId]
  if (explicit) return explicit
  const h = hashString(philosopherId)
  const rate = DEFAULT_PROFILE.rate + (((h % 17) - 8) / 8) * 0.06
  const pitch = DEFAULT_PROFILE.pitch + ((((h >> 4) % 17) - 8) / 8) * 0.05
  return { rate, pitch }
}

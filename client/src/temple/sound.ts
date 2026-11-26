/**
 * Temple sounds, synthesised in the browser (no audio files to download).
 * Silent until the user turns sound on: browsers only allow audio after a
 * tap, and the temple should never make noise uninvited.
 */
export interface TempleSound {
  enabled: () => boolean
  toggle: () => boolean
  rumble: (dur: number, gain?: number) => void
  thud: (level?: number) => void
  crack: (level?: number) => void
  charge: () => void
  chime: () => void
  collapse: () => void
}

export function createTempleSound(): TempleSound {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let noiseBuf: AudioBuffer | null = null
  let on = false

  function init() {
    if (ctx) return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }

  function noise(dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, attack = 0.01) {
    if (!ctx || !master || !noiseBuf) return
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(master)
    src.start(t)
    src.stop(t + dur + 0.05)
  }

  function tone(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', delay = 0) {
    if (!ctx || !master) return
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    const t = ctx.currentTime + delay
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  return {
    enabled: () => on,
    toggle() {
      init()
      if (!ctx) return false
      on = !on
      if (on && ctx.state === 'suspended') void ctx.resume()
      return on
    },
    rumble(dur, gain = 0.5) {
      if (on) noise(dur, 'lowpass', 110, 0.8, gain * 0.9, 0.25)
    },
    thud(level = 1) {
      if (!on) return
      tone(58, 0.5, 0.5 * level)
      noise(0.25, 'lowpass', 400, 0.7, 0.25 * level)
    },
    crack(level = 1) {
      if (!on) return
      noise(0.18, 'highpass', 1800, 0.9, 0.8 * level, 0.003)
      noise(0.6, 'bandpass', 500, 0.6, 0.35 * level, 0.005)
      tone(52, 0.7, 0.55 * level)
    },
    charge() {
      if (!on || !ctx || !master) return
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 900
      const g = ctx.createGain()
      const t = ctx.currentTime
      o.frequency.setValueAtTime(120, t)
      o.frequency.exponentialRampToValueAtTime(900, t + 0.4)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.3)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
      o.connect(f)
      f.connect(g)
      g.connect(master)
      o.start(t)
      o.stop(t + 0.5)
    },
    chime() {
      if (!on) return
      ;[523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => tone(f, 3.2 - i * 0.4, 0.12 / (i + 1), 'sine', i * 0.12))
      tone(261.63, 3.6, 0.08, 'triangle')
    },
    collapse() {
      if (!on) return
      noise(2.6, 'lowpass', 160, 0.7, 0.9, 0.05)
      noise(1.2, 'bandpass', 700, 0.5, 0.5, 0.01)
      tone(40, 2.2, 0.6)
    },
  }
}

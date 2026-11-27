/**
 * The night sounds of the Sanctuary, made in the browser (no audio files):
 * waves rolling in and drawing back on the shore below, and a few crickets
 * in the grass, each with its own pitch, place and rhythm. Browsers only
 * allow sound after a tap or click, so `start` is called from one.
 */

export interface Ambience {
  start: () => void
  setMuted: (muted: boolean) => void
  /** Fades out and closes the audio. */
  dispose: () => void
}

const MUTE_KEY = 'crucible:ambienceMuted'

export function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, String(m))
  } catch {
    /* fine: it just won't be remembered */
  }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Each place's mix: how much sea (and how far away), how many crickets, fire, wind, and an echo for stone rooms. */
export type AmbiencePreset = 'sanctuary' | 'oracle' | 'symposium' | 'hall' | 'temple' | 'landscape'
const MIX: Record<AmbiencePreset, { waves: number; seaFar: number; crickets: number; fire: number; wind: number; echo: boolean }> = {
  sanctuary: { waves: 1, seaFar: 20000, crickets: 3, fire: 0, wind: 0, echo: false },
  oracle: { waves: 0.45, seaFar: 700, crickets: 1, fire: 1, wind: 0.55, echo: false },
  symposium: { waves: 0.5, seaFar: 1100, crickets: 2, fire: 0.3, wind: 0.15, echo: false },
  hall: { waves: 0.25, seaFar: 600, crickets: 0, fire: 0.35, wind: 0.6, echo: true },
  temple: { waves: 0.4, seaFar: 800, crickets: 2, fire: 0.55, wind: 0.4, echo: false },
  landscape: { waves: 0.75, seaFar: 1400, crickets: 3, fire: 0, wind: 0.3, echo: false },
}

export function createAmbience(preset: AmbiencePreset = 'sanctuary'): Ambience {
  const mix = MIX[preset]
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let timer = 0
  let muted = loadMuted()
  let started = false
  const VOLUME = 0.55

  function noiseBuffer(c: AudioContext, seconds: number, brown: boolean) {
    const len = Math.floor(c.sampleRate * seconds)
    const buf = c.createBuffer(2, len, c.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        if (brown) {
          last = (last + 0.02 * w) / 1.02
          d[i] = last * 3.5
        } else d[i] = w
      }
    }
    return buf
  }

  function build(c: AudioContext) {
    master = c.createGain()
    master.gain.value = 0
    master.connect(c.destination)
    const seaOut = c.createGain()
    seaOut.gain.value = mix.waves
    const seaDistance = c.createBiquadFilter()
    seaDistance.type = 'lowpass'
    seaDistance.frequency.value = mix.seaFar
    seaOut.connect(seaDistance).connect(master)

    // the sea: a deep rolling body of brown noise, and a lighter hiss of foam as each wave draws back
    const body = c.createBufferSource()
    body.buffer = noiseBuffer(c, 6, true)
    body.loop = true
    const bodyFilter = c.createBiquadFilter()
    bodyFilter.type = 'lowpass'
    bodyFilter.frequency.value = 380
    const bodyGain = c.createGain()
    bodyGain.gain.value = 0.15
    body.connect(bodyFilter).connect(bodyGain).connect(seaOut)
    body.start()

    const foam = c.createBufferSource()
    foam.buffer = noiseBuffer(c, 4, false)
    foam.loop = true
    const foamFilter = c.createBiquadFilter()
    foamFilter.type = 'bandpass'
    foamFilter.frequency.value = 2200
    foamFilter.Q.value = 0.6
    const foamGain = c.createGain()
    foamGain.gain.value = 0
    foam.connect(foamFilter).connect(foamGain).connect(seaOut)
    foam.start()

    // crickets: a high sine each, pulsed into short chirps
    const crickets = [0, 1, 2].slice(0, mix.crickets).map((i) => {
      const osc = c.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = [4350, 4780, 5120][i] + rand(-60, 60)
      const g = c.createGain()
      g.gain.value = 0
      const pan = c.createStereoPanner()
      pan.pan.value = [-0.7, 0.55, -0.1][i]
      osc.connect(g).connect(pan).connect(master!)
      osc.start()
      return { g, next: c.currentTime + rand(0.5, 2), period: rand(0.75, 1.3), pulses: 3 + (i % 2), level: [0.03, 0.022, 0.016][i], restUntil: 0 }
    })

    let nextWave = c.currentTime + 0.5

    // fire: a low breathing roar and sharp crackles, echoing in stone rooms
    let fireCrack: GainNode | null = null
    let crackFilter: BiquadFilterNode | null = null
    let nextCrack = c.currentTime + 0.3
    if (mix.fire > 0) {
      const roar = c.createBufferSource()
      roar.buffer = noiseBuffer(c, 5, true)
      roar.loop = true
      const rf = c.createBiquadFilter()
      rf.type = 'lowpass'
      rf.frequency.value = 260
      const rg = c.createGain()
      rg.gain.value = 0.18 * mix.fire
      roar.connect(rf).connect(rg).connect(master)
      roar.start()
      const crackle = c.createBufferSource()
      crackle.buffer = noiseBuffer(c, 3, false)
      crackle.loop = true
      crackFilter = c.createBiquadFilter()
      crackFilter.type = 'bandpass'
      crackFilter.frequency.value = 2500
      crackFilter.Q.value = 1.2
      fireCrack = c.createGain()
      fireCrack.gain.value = 0
      crackle.connect(crackFilter).connect(fireCrack).connect(master)
      if (mix.echo) {
        const d = c.createDelay(1)
        d.delayTime.value = 0.13
        const fb = c.createGain()
        fb.gain.value = 0.38
        const wet = c.createGain()
        wet.gain.value = 0.5
        fireCrack.connect(d).connect(fb).connect(d)
        d.connect(wet).connect(master)
      }
      crackle.start()
    }

    // wind: breathy noise whose pitch and strength wander
    let windFilter: BiquadFilterNode | null = null
    let windGain: GainNode | null = null
    let nextGust = c.currentTime
    if (mix.wind > 0) {
      const w = c.createBufferSource()
      w.buffer = noiseBuffer(c, 5, false)
      w.loop = true
      windFilter = c.createBiquadFilter()
      windFilter.type = 'bandpass'
      windFilter.frequency.value = 500
      windFilter.Q.value = 0.9
      windGain = c.createGain()
      windGain.gain.value = 0.01
      w.connect(windFilter).connect(windGain).connect(master)
      w.start()
    }

    // schedule a little ahead, every quarter second
    const schedule = () => {
      if (!ctx) return
      const now = c.currentTime
      const horizon = now + 1.2
      if (fireCrack && crackFilter) {
        while (nextCrack < horizon) {
          const t = nextCrack
          const pop = rand(0.05, 0.35) * mix.fire
          crackFilter.frequency.setValueAtTime(rand(1400, 4200), t)
          fireCrack.gain.setValueAtTime(pop, t)
          fireCrack.gain.setTargetAtTime(0, t + 0.002, rand(0.005, 0.02))
          // crackles come in little clusters
          nextCrack = t + (Math.random() < 0.35 ? rand(0.03, 0.09) : rand(0.08, 0.5) / Math.max(0.3, mix.fire))
        }
      }
      if (windFilter && windGain) {
        while (nextGust < horizon) {
          const t = nextGust
          const len = rand(2.5, 5)
          windFilter.frequency.setTargetAtTime(rand(280, 900), t, len / 3)
          windGain.gain.setTargetAtTime(rand(0.015, 0.06) * mix.wind, t, len / 3)
          nextGust = t + len
        }
      }
      while (mix.waves > 0 && nextWave < horizon) {
        const t = nextWave
        const rise = rand(2.2, 3.4)
        const fall = rand(3.5, 5)
        const peak = rand(0.45, 0.8)
        // the wave comes in: the body swells and brightens
        bodyGain.gain.setTargetAtTime(peak, t, rise / 3)
        bodyFilter.frequency.setTargetAtTime(700 + peak * 500, t, rise / 3)
        // it breaks and draws back over the stones: the body falls, the foam hisses
        bodyGain.gain.setTargetAtTime(0.13, t + rise, fall / 3)
        bodyFilter.frequency.setTargetAtTime(360, t + rise, fall / 3)
        foamGain.gain.setTargetAtTime(peak * 0.11, t + rise * 0.85, 0.4)
        foamGain.gain.setTargetAtTime(0, t + rise + 0.8, fall / 3.5)
        nextWave = t + rise + fall * rand(0.7, 1.05)
      }
      for (const k of crickets) {
        while (k.next < horizon) {
          const t = k.next
          if (t >= k.restUntil) {
            for (let p = 0; p < k.pulses; p++) {
              const s = t + p * 0.045
              k.g.gain.setValueAtTime(0, s)
              k.g.gain.linearRampToValueAtTime(k.level, s + 0.006)
              k.g.gain.linearRampToValueAtTime(0, s + 0.022)
            }
          }
          k.next = t + k.period * rand(0.92, 1.08)
          // now and then a cricket falls quiet for a while
          if (Math.random() < 0.03) k.restUntil = k.next + rand(3, 8)
        }
      }
    }
    schedule()
    timer = window.setInterval(schedule, 250)
  }

  const onVisibility = () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else if (!muted) void ctx.resume()
  }

  return {
    start() {
      if (started || muted) return
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      started = true
      ctx = new Ctor()
      build(ctx)
      void ctx.resume()
      master!.gain.setTargetAtTime(VOLUME, ctx.currentTime, 1.2)
      document.addEventListener('visibilitychange', onVisibility)
    },
    setMuted(m) {
      muted = m
      saveMuted(m)
      if (!ctx || !master) {
        if (!m) this.start()
        return
      }
      if (m) {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
        const c = ctx
        window.setTimeout(() => !muted && c.state === 'running' ? null : void c.suspend(), 1200)
      } else {
        void ctx.resume()
        master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.6)
      }
    },
    dispose() {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
      const c = ctx
      if (c && master) {
        master.gain.setTargetAtTime(0, c.currentTime, 0.35)
        window.setTimeout(() => void c.close(), 1500)
      }
      ctx = null
      master = null
    },
  }
}

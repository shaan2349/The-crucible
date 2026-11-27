import * as THREE from 'three'
import { surface } from '../world/textures'
import { addMilkyWay, addMist, addSea, addShootingStars, createPost, type Post, type Tick } from '../world/nightKit'
import { addHorizon } from '../world/nightKit'
import { createTempleSound, type TempleSound } from './sound'

/**
 * The Temple of Premises: a moonlit 3D temple whose roof carries the user's
 * thesis and whose columns are its premises. The debate screen drives it
 * imperatively (strike a column, apply the judge's verdict on a column,
 * play an ending); everything visual lives here so the React side only
 * says what happened, never how it looks.
 */

export type ColumnStatus = 'standing' | 'defended' | 'weakened' | 'conceded' | 'revised'
export type TempleEnding = 'victory' | 'reshaped' | 'contested' | 'collapse' | 'untested'

export interface ScreenPoint {
  x: number
  y: number
}

/* ------------------------------- small helpers ------------------------------ */

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.4
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  lin: (t: number) => t,
}
type EaseFn = (t: number) => number

const STY = 0.54 // height of the stylobate (the top step)
const R = 0.34 // column radius
const DRUMS = 4
const DRUM_H = 0.75
const BASE_H = 0.2
const COL_TOP = BASE_H + DRUM_H * DRUMS + 0.34
const SPACING = 2.4
const PIVOT_Z = 0.44
// Physically based lights in current three.js are roughly PI times dimmer
// than the legacy units this scene was first tuned in.
const L = Math.PI

interface Tween {
  start: number
  dur: number
  fn: (e: number) => void
  e: EaseFn
  done?: () => void
}

interface CrackSet {
  crack: Tube
  gold: Tube
  glow: Tube
}

interface ColumnVisual {
  pivot: THREE.Group
  group: THREE.Group
  base: THREE.Mesh
  drums: THREE.Mesh[]
  cap: THREE.Group
  saved: { o: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion }[]
  cracks: CrackSet
}

interface Column {
  x: number
  status: ColumnStatus
  original: ColumnVisual
  replacement: ColumnVisual | null
  /** The visual currently standing for this premise. */
  current: ColumnVisual
  fallen: boolean
}

interface Body {
  mesh: THREE.Object3D
  v: THREE.Vector3
  w: THREE.Vector3
  r: number
  chip: boolean
}

interface Tube {
  mesh: THREE.Mesh
  geo: THREE.TubeGeometry
  setProgress: (p: number) => void
}

/* ------------------------------- the scene ------------------------------- */

export class TempleScene {
  readonly sound: TempleSound
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400)
  private target = new THREE.Vector3(0, 2.4, 0)
  private canvas: HTMLCanvasElement
  private reduced: boolean
  private post!: Post
  private ticks: Tick[] = []
  private clock = 0
  private last = performance.now()
  private raf = 0
  private halted = false
  private disposed = false
  private tweens: Tween[] = []
  private later: { t: number; fn: () => void }[] = []
  private bodies: Body[] = []
  private bursts: { pts: THREE.Points; vel: THREE.Vector3[]; life: number; max: number }[] = []
  private W = 1
  private H = 1

  // materials and textures
  private marbleTex: THREE.CanvasTexture
  private marble: THREE.MeshStandardMaterial
  private marbleShade: THREE.MeshStandardMaterial
  private newMarble: THREE.MeshStandardMaterial
  private dotTex: THREE.CanvasTexture

  // lights
  private lamp: THREE.PointLight
  private lampBase = 2.4 * L
  private lampWarm = new THREE.Color(0xffa050)
  private lampGold = new THREE.Color(0xffd27a)
  private flash: THREE.PointLight

  // the temple itself (rebuilt by setTemple)
  private temple = new THREE.Group()
  private columns: Column[] = []
  private roofPivot = new THREE.Group()
  private roof = new THREE.Group()
  private friezeMat: THREE.MeshStandardMaterial | null = null
  private friezeCrack: Tube | null = null
  private steps: { halfW: number; halfD: number; y: number }[] = []
  private roofW = 7
  private braziers: THREE.Group[] = []
  private fireLights: THREE.PointLight[] = []
  private fireEmitters: { x: number; pts: THREE.Points; seed: { life: number; sx: number; sz: number; sp: number }[]; glow: THREE.Sprite; light: THREE.PointLight }[] = []

  // the attacker's medallion and bolt
  private medallion: THREE.Sprite
  private medallionGlow: THREE.Sprite
  private medallionCache = new Map<string, THREE.CanvasTexture>()
  private bolt: { core: Tube; glow: Tube } | null = null

  // ambient world
  private motes!: THREE.Points
  private moteSeed: number[] = []
  private stars!: THREE.Points
  private clouds: THREE.Sprite[] = []
  private meteor!: THREE.Mesh
  private meteorT = -1
  private nextMeteor = 6
  private meteorFrom = new THREE.Vector3()
  private meteorTo = new THREE.Vector3()

  // camera
  private cam = { theta: 0, phiOff: 0, r: 14, h: 3.4, fit: 14, baseH: 3.4 }
  private shakeAmt = 0
  private dragging = false
  private lastX = 0
  private lastY = 0
  private onPointerDown: (e: PointerEvent) => void
  private onPointerMove: (e: PointerEvent) => void
  private onPointerUp: () => void

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean } = {}) {
    this.canvas = canvas
    this.reduced = !!opts.reducedMotion
    this.sound = createTempleSound()
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.marbleTex = this.marbleTexture('#E7DFCB', '#7C7262', false)
    this.marble = new THREE.MeshStandardMaterial({ map: this.marbleTex, roughness: 0.48, metalness: 0.02 })
    this.marbleShade = new THREE.MeshStandardMaterial({ map: this.marbleTex, roughness: 0.55, metalness: 0.02, color: 0xd8cfbb })
    this.newMarble = new THREE.MeshStandardMaterial({
      map: this.marbleTexture('#F2ECDF', '#8C846F', true),
      roughness: 0.4,
      metalness: 0.05,
      emissive: 0x2a1d08,
      emissiveIntensity: 0.25,
    })
    this.dotTex = this.spriteTexture((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      gr.addColorStop(0, 'rgba(255,255,255,1)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }, 64)

    // lights
    this.scene.add(new THREE.HemisphereLight(0x8592b4, 0x1c140d, 0.42 * L))
    const moonLight = new THREE.DirectionalLight(0xbac6e6, 0.95 * L)
    moonLight.position.set(-6, 11, 9)
    moonLight.castShadow = true
    moonLight.shadow.mapSize.set(2048, 2048)
    Object.assign(moonLight.shadow.camera, { left: -10, right: 10, top: 9, bottom: -4, near: 1, far: 40 })
    moonLight.shadow.bias = -0.0006
    this.scene.add(moonLight)
    this.lamp = new THREE.PointLight(0xffa050, this.lampBase, 9, 2)
    this.lamp.position.set(0, 2.1, -0.35)
    this.scene.add(this.lamp)
    this.flash = new THREE.PointLight(0xffd0a0, 0, 12, 2)
    this.flash.position.set(0, 2.8, 1.2)
    this.scene.add(this.flash)

    this.buildWorld()
    this.scene.add(this.temple)

    this.medallion = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false }))
    this.medallion.scale.set(1.1, 1.1, 1)
    this.scene.add(this.medallion)
    this.medallionGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.spriteTexture((g, s) => {
          const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
          gr.addColorStop(0, 'rgba(255,220,170,.7)')
          gr.addColorStop(1, 'rgba(255,220,170,0)')
          g.fillStyle = gr
          g.fillRect(0, 0, s, s)
        }, 128),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    )
    this.medallionGlow.scale.set(3.2, 3.2, 1)
    this.scene.add(this.medallionGlow)

    // dragging turns the temple
    this.onPointerDown = (e) => {
      this.dragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
      canvas.setPointerCapture?.(e.pointerId)
    }
    this.onPointerMove = (e) => {
      if (!this.dragging) {
        if (e.pointerType === 'mouse' && !this.reduced) {
          const rect = canvas.getBoundingClientRect()
          this.cam.phiOff = ((e.clientY - rect.top) / rect.height - 0.5) * -0.6
        }
        return
      }
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.cam.theta = clamp(this.cam.theta - dx * 0.006, -0.75, 0.75)
      this.cam.phiOff = clamp(this.cam.phiOff - dy * 0.01, -0.6, 1.6)
    }
    this.onPointerUp = () => {
      this.dragging = false
    }
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)

    // the shared night: a moving sea below the hill, the Milky Way, mist on the water, shooting stars
    this.ticks.push(addHorizon(this.scene, { level: -7.2, distance: 120 }))
    this.ticks.push(addSea(this.scene, { level: -7.2, moon: new THREE.Vector3(30, 29, -128), size: 500 }))
    addMilkyWay(this.scene, { radius: 140, a: new THREE.Vector3(-0.9, 0.1, -0.42), b: new THREE.Vector3(0.45, 0.5, -0.75) })
    this.ticks.push(addShootingStars(this.scene, { distance: 120 }))
    this.ticks.push(addMist(this.scene, [[-30, -40, 40, -6.4], [25, -50, 46, -6.6], [-5, -70, 60, -6.5], [45, -30, 30, -6.8], [-50, -25, 30, -6.6]], 0.3))

    this.post = createPost(this.renderer, this.scene, this.camera, { strength: 0.5, threshold: 0.8 })
    // prepare every shader in the background before the first frame, so the page doesn't freeze while it compiles
    const start = () => {
      if (!this.halted) this.raf = requestAnimationFrame(this.frame)
    }
    this.renderer.compileAsync(this.scene, this.camera).then(start, start)
  }

  /* ------------------------------- public API ------------------------------ */

  /** Builds the temple for a thesis and its premises. With `assemble`, the
   * columns rise and the roof settles while the camera glides in; without,
   * the temple appears as it stands (used when returning to a debate). */
  setTemple(thesis: string, statuses: ColumnStatus[], assemble: boolean) {
    this.tweens.length = 0
    this.later.length = 0
    this.clearBodies(true)
    this.buildTemple(Math.max(2, Math.min(4, statuses.length)), thesis)
    this.medallion.material.opacity = 0
    this.medallionGlow.material.opacity = 0
    this.lamp.color.copy(this.lampWarm)
    this.lampBase = 2.4 * L
    statuses.forEach((s, i) => this.applyStatus(i, s, false))
    this.fitCamera()
    if (!assemble || this.reduced) {
      this.cam.r = this.cam.fit
      this.cam.h = this.cam.baseH
      return
    }
    this.columns.forEach((c, i) => {
      const holders = [c.original.pivot, c.replacement?.pivot].filter(Boolean) as THREE.Group[]
      holders.forEach((h) => {
        const y0 = h.position.y
        h.position.y = y0 - 4.2
        this.tween(0.2 + i * 0.22, 1.6, (e) => (h.position.y = y0 - 4.2 + 4.2 * e), ease.outCubic)
      })
      this.at(0.2 + i * 0.22, () => this.sound.rumble(1.4, 0.5))
    })
    const top = STY + COL_TOP
    this.roofPivot.position.y = top + 5
    const roofStart = 0.4 + this.columns.length * 0.22
    this.tween(roofStart, 1.4, (e) => (this.roofPivot.position.y = top + 5 - 5 * e), ease.outBack)
    this.at(roofStart + 1.1, () => {
      this.sound.thud(0.9)
      this.shake(0.18)
      this.columns.forEach((c) => this.dustBurst(new THREE.Vector3(c.x, top, 0.5), 14, 0.8, 0xcfc6b1, 0.3))
    })
    const r0 = this.cam.fit * 1.9
    const h0 = 7.5
    this.cam.r = r0
    this.cam.h = h0
    this.tween(0, 3.6, (e) => {
      this.cam.r = r0 + (this.cam.fit - r0) * e
      this.cam.h = h0 + (this.cam.baseH - h0) * e
    }, ease.inOut)
  }

  /** A philosopher's objection lands on a column. Resolves once the bolt
   * has hit, so the caller can reveal the objection's text in step. */
  strike(index: number, initial: string, side: 0 | 1): Promise<void> {
    const col = this.columns[index]
    if (!col) return Promise.resolve()
    const tex = this.medallionTexture(initial)
    this.medallion.material.map = tex
    this.medallion.material.needsUpdate = true
    // keep the medallion inside the frame, even on a narrow phone
    const mx = Math.min(5.6, this.roofW / 2 + 0.2)
    const from = new THREE.Vector3(side === 0 ? -mx : mx, 7.2, -1.5)
    this.medallion.position.copy(from)
    this.medallionGlow.position.copy(from)
    const impact = new THREE.Vector3(col.x, STY + 2.46, 0.36)
    this.makeBolt(from, impact)
    const bolt = this.bolt!
    this.tween(0, 0.5, (e) => {
      this.medallion.material.opacity = e
      this.medallionGlow.material.opacity = 0.6 * e
      this.medallion.position.y = from.y - 0.3 * e
    })
    this.at(0.45, () => this.sound.charge())
    this.tween(0.55, 0.28, (e) => {
      bolt.core.setProgress(e)
      bolt.glow.setProgress(e)
    }, ease.lin)
    return new Promise((resolve) => {
      this.at(0.83, () => {
        this.sound.crack()
        this.flash.position.set(col.x, 2.8, 1.2)
        this.flash.intensity = 9 * L
        this.tween(0, 0.6, (e) => (this.flash.intensity = 9 * L * (1 - e)), ease.outCubic)
        this.shake(0.45)
        this.dustBurst(impact.clone().add(new THREE.Vector3(0, 0, 0.1)), 50, 1.4, 0xe7dfcb, 1.2)
        if (!col.fallen) {
          this.spawnChips(col, 14)
          const cr = col.current.cracks.crack
          const wasVisible = cr.mesh.visible
          cr.mesh.visible = true
          const mat = cr.mesh.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = 2.2
          if (!wasVisible) {
            cr.setProgress(0)
            this.tween(0, 0.9, (e) => cr.setProgress(e), ease.outCubic)
          }
          this.tween(0.3, 2.4, (e) => (mat.emissiveIntensity = 2.2 * (1 - e)), ease.lin)
          this.setRoofSag(true, 1.1)
        }
        resolve()
      })
      this.tween(0.95, 0.6, (e) => {
        ;(bolt.core.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - e
        ;(bolt.glow.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - e)
      }, ease.lin)
      this.tween(1.6, 1.0, (e) => (this.medallionGlow.material.opacity = 0.6 * (1 - e) + 0.15 * e), ease.lin)
      this.tween(2.4, 1.0, (e) => (this.medallion.material.opacity = 1 - e * 0.6), ease.lin)
    })
  }

  /** Shows the judge's verdict on one column. */
  applyStatus(index: number, status: ColumnStatus, animate = true) {
    const col = this.columns[index]
    if (!col) return
    const prev = col.status
    col.status = status
    const anim = animate && !this.reduced
    const cs = col.current.cracks

    if (status === 'conceded') {
      if (col.fallen) return
      col.fallen = true
      cs.gold.mesh.visible = false
      cs.glow.mesh.visible = false
      if (!anim) {
        col.current.drums.forEach((d) => (d.visible = false))
        col.current.cap.visible = false
        cs.crack.mesh.visible = false
        return
      }
      this.topple(col.current)
      this.sound.rumble(1.2, 0.6)
      return
    }

    if (status === 'revised') {
      if (prev === 'revised' && col.replacement) return
      const oldV = col.current
      const repl = this.buildColumnVisual(col.x, this.newMarble)
      col.replacement = repl
      col.current = repl
      col.fallen = false
      if (!anim) {
        oldV.pivot.visible = false
        return
      }
      this.sound.rumble(2.6, 0.8)
      this.dustBurst(new THREE.Vector3(col.x, STY + 0.1, 0.4), 70, 1.6, 0xcfc6b1, 0.4)
      if (oldV.pivot.visible) {
        const y0 = oldV.pivot.position.y
        this.tween(0, 1.5, (e) => (oldV.pivot.position.y = y0 - 4.2 * e), ease.inCubic, () => (oldV.pivot.visible = false))
      }
      repl.pivot.position.y = STY - 4.2
      this.tween(1.2, 2.0, (e) => (repl.pivot.position.y = STY - 4.2 + 4.2 * e), ease.outCubic)
      this.at(1.2, () => this.sound.rumble(2.0, 0.6))
      this.at(3.1, () => {
        this.sound.chime()
        this.dustBurst(new THREE.Vector3(col.x, STY + COL_TOP, 0.5), 30, 0.7, 0xffd27a, 0.4)
        this.shake(0.12)
      })
      this.settleRoof()
      return
    }

    if (status === 'defended') {
      cs.crack.mesh.visible = true
      cs.crack.setProgress(1)
      ;(cs.crack.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0
      cs.gold.mesh.visible = true
      cs.glow.mesh.visible = true
      const glowMat = cs.glow.mesh.material as THREE.MeshBasicMaterial
      if (!anim || prev === 'defended') {
        cs.gold.setProgress(1)
        cs.glow.setProgress(1)
        glowMat.opacity = 0.25
        if (anim) this.settleRoof()
        return
      }
      cs.gold.setProgress(0)
      cs.glow.setProgress(0)
      this.sound.chime()
      this.tween(0.2, 2.2, (e) => {
        cs.gold.setProgress(e)
        cs.glow.setProgress(e)
        glowMat.opacity = 0.55 * Math.min(1, e * 3)
      }, ease.inOut)
      const startColor = this.lamp.color.clone()
      const startBase = this.lampBase
      this.tween(0.2, 1.4, (e) => {
        this.lamp.color.copy(startColor).lerp(this.lampGold, e)
        this.lampBase = startBase + (3.6 * L - startBase) * e
      }, ease.inOut)
      this.tween(2.4, 2.4, (e) => {
        glowMat.opacity = 0.55 - 0.3 * e
        this.lamp.color.copy(this.lampGold).lerp(this.lampWarm, e)
        this.lampBase = 3.6 * L - 1.2 * L * e
      }, ease.lin)
      this.at(2.4, () => this.dustBurst(new THREE.Vector3(col.x, 2.4, 0.6), 40, 0.7, 0xffd27a, 0.6))
      this.settleRoof()
      return
    }

    if (status === 'weakened') {
      cs.crack.mesh.visible = true
      cs.crack.setProgress(1)
      ;(cs.crack.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0
      if (cs.gold.mesh.visible && anim) {
        const gm = cs.glow.mesh.material as THREE.MeshBasicMaterial
        this.tween(0, 1.2, (e) => (gm.opacity = 0.25 * (1 - e)), ease.lin, () => {
          cs.gold.mesh.visible = false
          cs.glow.mesh.visible = false
        })
      } else {
        cs.gold.mesh.visible = false
        cs.glow.mesh.visible = false
      }
      return
    }

    // standing: a crack from an attack that came to nothing fades away
    if (cs.crack.mesh.visible && cs.gold.mesh.visible === false && anim) {
      const mat = cs.crack.mesh.material as THREE.MeshStandardMaterial
      mat.transparent = true
      this.tween(0, 1.2, (e) => (mat.opacity = 1 - e), ease.lin, () => {
        cs.crack.mesh.visible = false
        mat.opacity = 1
        mat.transparent = false
      })
      this.settleRoof()
    } else if (!anim) {
      cs.crack.mesh.visible = false
    }
  }

  /** The final state of the temple. */
  ending(kind: TempleEnding) {
    if (kind === 'victory') {
      this.sound.chime()
      this.settleRoof()
      if (this.friezeMat) {
        const m = this.friezeMat
        this.tween(0.3, 2.4, (e) => (m.emissiveIntensity = 0.55 * e), ease.inOut)
      }
      const startBase = this.lampBase
      this.tween(0, 2.4, (e) => {
        this.lamp.color.copy(this.lampWarm).lerp(this.lampGold, e)
        this.lampBase = startBase + (4.4 * L - startBase) * e
      }, ease.inOut)
      this.columns.forEach((c, i) => {
        if (!c.fallen) this.at(0.4 + i * 0.25, () => this.dustBurst(new THREE.Vector3(c.x, STY + COL_TOP, 0.6), 36, 0.8, 0xffd27a, 0.5))
      })
      return
    }
    if (kind === 'collapse') {
      this.sound.collapse()
      this.shake(0.6)
      this.columns.forEach((c, i) => {
        if (!c.fallen) {
          c.fallen = true
          this.at(0.25 + i * 0.3, () => this.topple(c.current))
        }
      })
      const p0 = this.roofPivot.position.y
      this.tween(0.5, 1.3, (e) => {
        this.roofPivot.position.y = p0 - (p0 - 1.0) * e
        this.roofPivot.rotation.z = 0.22 * e
        this.roofPivot.rotation.x = 0.12 * e
      }, ease.inCubic, () => {
        this.shake(0.8)
        this.sound.thud(1)
        this.dustBurst(new THREE.Vector3(0, 1.2, 0.6), 120, 2.4, 0xcfc6b1, 0.9)
      })
      if (this.friezeCrack) {
        const fc = this.friezeCrack
        this.at(0.6, () => {
          fc.mesh.visible = true
          this.tween(0, 0.5, (e) => fc.setProgress(e), ease.outCubic)
        })
      }
      this.tween(0.8, 2.2, (e) => (this.lampBase = 2.4 * L * (1 - 0.85 * e)), ease.inOut)
      return
    }
    if (kind === 'contested') {
      this.tween(0, 2, (e) => (this.lampBase = 2.4 * L * (1 - 0.3 * e)), ease.inOut)
      return
    }
    if (kind === 'reshaped') this.settleRoof()
  }

  /** Where each column's base sits on screen, in CSS pixels, for labels. */
  columnAnchors(): ScreenPoint[] {
    const v = new THREE.Vector3()
    return this.columns.map((c) => {
      v.set(c.x, 0.05, this.steps[0] ? this.steps[0].halfD + 0.25 : 1.95).project(this.camera)
      return { x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H }
    })
  }

  resize(w: number, h: number) {
    this.W = Math.max(1, w)
    this.H = Math.max(1, h)
    this.renderer.setSize(this.W, this.H, false)
    this.post?.setSize(w, h)
    this.fitCamera()
    this.applyShift?.()
  }

  private shift = 0
  /** Moves the picture up by this fraction of the screen, for layouts that lay a panel over the lower part. */
  setShift(f: number) {
    this.shift = f
    this.applyShift()
  }

  private applyShift() {
    if (this.shift) this.camera.setViewOffset(this.W, this.H, 0, this.H * this.shift, this.W, this.H)
    else this.camera.clearViewOffset()
  }

  dispose() {
    this.halted = true
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    this.post.dispose()
    this.renderer.dispose()
  }

  /* ------------------------------ timing helpers ----------------------------- */

  private tween(delay: number, dur: number, fn: (e: number) => void, e: EaseFn = ease.outCubic, done?: () => void) {
    this.tweens.push({ start: this.clock + delay, dur: Math.max(dur, 0.0001), fn, e, done })
  }

  private at(delay: number, fn: () => void) {
    this.later.push({ t: this.clock + delay, fn })
  }

  private shake(a: number) {
    if (!this.reduced) this.shakeAmt = Math.max(this.shakeAmt, a)
  }

  /* -------------------------------- textures -------------------------------- */

  private canvasTexture(c: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    return t
  }

  private spriteTexture(draw: (g: CanvasRenderingContext2D, s: number) => void, size: number) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    draw(c.getContext('2d')!, size)
    return this.canvasTexture(c)
  }

  private marbleTexture(base: string, veins: string, goldVeins: boolean) {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const g = c.getContext('2d')!
    g.fillStyle = base
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(110,100,80,${rand(0.01, 0.05)})`
      g.beginPath()
      g.arc(rand(0, 512), rand(0, 512), rand(8, 70), 0, Math.PI * 2)
      g.fill()
    }
    const vein = (color: string, w: number, a: number) => {
      g.strokeStyle = color
      g.globalAlpha = a
      g.lineWidth = w
      let x = rand(0, 512)
      let y = -10
      g.beginPath()
      g.moveTo(x, y)
      while (y < 530) {
        x += rand(-26, 26)
        y += rand(14, 40)
        g.lineTo(x, y)
      }
      g.stroke()
      g.globalAlpha = 1
    }
    for (let v = 0; v < 7; v++) vein(veins, rand(0.6, 1.8), rand(0.12, 0.32))
    for (let v = 0; v < 12; v++) vein(veins, rand(0.3, 0.7), rand(0.06, 0.14))
    if (goldVeins) for (let v = 0; v < 4; v++) vein('#D9A640', rand(1.2, 2.4), 0.85)
    const t = this.canvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }

  /** The thesis carved into the frieze: uppercase, shrunk to fit, on two
   * lines when one would be too small to read. */
  private friezeTexture(text: string, aspect: number) {
    const w = 2048
    const h = Math.round(w / aspect)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    g.drawImage(this.marbleTex.image as HTMLCanvasElement, 0, 0, w, h)
    const words = text.toUpperCase().replace(/\s+/g, ' ').trim()
    const font = (px: number) => `700 ${px}px Cinzel, Georgia, serif`
    let lines = [words]
    let px = Math.floor(h * 0.48)
    g.font = font(px)
    while (g.measureText(words).width > w * 0.92 && px > h * 0.3) {
      px -= 2
      g.font = font(px)
    }
    if (g.measureText(words).width > w * 0.92) {
      const parts = words.split(' ')
      let best = 1
      let bestDiff = Infinity
      for (let i = 1; i < parts.length; i++) {
        const diff = Math.abs(parts.slice(0, i).join(' ').length - parts.slice(i).join(' ').length)
        if (diff < bestDiff) {
          bestDiff = diff
          best = i
        }
      }
      lines = [parts.slice(0, best).join(' '), parts.slice(best).join(' ')]
      px = Math.floor(h * 0.36)
      g.font = font(px)
      while (Math.max(...lines.map((l) => g.measureText(l).width)) > w * 0.94 && px > 14) {
        px -= 2
        g.font = font(px)
      }
    }
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    lines.forEach((line, i) => {
      const y = h / 2 + (i - (lines.length - 1) / 2) * px * 1.12
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fillText(line, w / 2 + 2, y + 3)
      g.fillStyle = '#5E4E32'
      g.fillText(line, w / 2, y)
    })
    return this.canvasTexture(c)
  }

  private medallionTexture(initial: string) {
    const cached = this.medallionCache.get(initial)
    if (cached) return cached
    const t = this.spriteTexture((g, s) => {
      g.fillStyle = '#0E1013'
      g.beginPath()
      g.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#C2A15E'
      g.lineWidth = 6
      g.stroke()
      g.strokeStyle = 'rgba(194,161,94,.4)'
      g.lineWidth = 2
      g.beginPath()
      g.arc(s / 2, s / 2, s / 2 - 22, 0, Math.PI * 2)
      g.stroke()
      g.fillStyle = '#E9D5A6'
      g.font = '128px Gloock, Georgia, serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(initial.slice(0, 1).toUpperCase(), s / 2, s / 2 + 8)
    }, 256)
    this.medallionCache.set(initial, t)
    return t
  }

  /* ------------------------------- geometry ------------------------------- */

  private tube(pts: number[][], radius: number, mat: THREE.Material): Tube {
    const path = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < pts.length - 1; i++) {
      path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])))
    }
    const geo = new THREE.TubeGeometry(path, 160, radius, 6, false)
    const mesh = new THREE.Mesh(geo, mat)
    const total = geo.index ? geo.index.count : 0
    return {
      mesh,
      geo,
      setProgress: (p: number) => geo.setDrawRange(0, Math.floor((total * clamp(p, 0, 1)) / 3) * 3),
    }
  }

  private crackPoints(lift = 0): number[][] {
    const ys = [3.6, 3.25, 2.95, 2.6, 2.25, 1.9, 1.55, 1.2, 0.85, 0.45]
    const jag = ys.map(() => rand(-0.12, 0.12))
    return ys.map((y, i) => {
      const x = jag[i]
      const r = R * (1 - 0.06 * ((y - BASE_H) / (DRUM_H * DRUMS))) * 0.975
      return [x, y, Math.sqrt(Math.max(r * r - x * x, 0)) + 0.006 + lift]
    })
  }

  private flutedDrum(rBottom: number, rTop: number, h: number) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, 96, 3, false)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const rr = Math.hypot(x, z)
      if (rr < 0.01) continue
      const a = Math.atan2(z, x)
      const f = 1 - 0.045 * Math.pow(Math.abs(Math.sin(a * 10)), 0.55)
      p.setX(i, x * f)
      p.setZ(i, z * f)
    }
    g.computeVertexNormals()
    return g
  }

  private buildColumnVisual(x: number, mat: THREE.Material): ColumnVisual {
    const group = new THREE.Group()
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.12, BASE_H, 64), mat)
    base.position.y = BASE_H / 2
    group.add(base)
    const drums: THREE.Mesh[] = []
    for (let i = 0; i < DRUMS; i++) {
      const rb = R * (1 - 0.06 * (i / DRUMS))
      const rt = R * (1 - 0.06 * ((i + 1) / DRUMS))
      const d = new THREE.Mesh(this.flutedDrum(rb, rt, DRUM_H - 0.004), mat)
      d.position.y = BASE_H + DRUM_H * i + DRUM_H / 2
      group.add(d)
      drums.push(d)
    }
    const cap = new THREE.Group()
    const echinus = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.13, R * 0.94, 0.18, 64), mat)
    echinus.position.y = 0.09
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 0.98), mat)
    abacus.position.y = 0.26
    cap.add(echinus, abacus)
    cap.position.y = BASE_H + DRUM_H * DRUMS
    group.add(cap)
    group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    const saved = [base, ...drums, cap].map((o) => ({ o, p: o.position.clone(), q: o.quaternion.clone() }))

    const pts = this.crackPoints()
    const crack = this.tube(pts, 0.014, new THREE.MeshStandardMaterial({ color: 0x2b1e18, emissive: 0xff7a3c, emissiveIntensity: 0, roughness: 0.5 }))
    const gold = this.tube(
      pts.map((p) => [p[0], p[1], p[2] + 0.004]),
      0.024,
      new THREE.MeshStandardMaterial({ color: 0xe2b85a, metalness: 1, roughness: 0.25, emissive: 0xd9a640, emissiveIntensity: 0.9 }),
    )
    const glow = this.tube(
      pts.map((p) => [p[0], p[1], p[2] + 0.01]),
      0.07,
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    crack.mesh.visible = gold.mesh.visible = glow.mesh.visible = false
    group.add(crack.mesh, gold.mesh, glow.mesh)

    const pivot = new THREE.Group()
    pivot.position.set(x, STY, PIVOT_Z)
    group.position.set(0, 0, -PIVOT_Z)
    pivot.add(group)
    this.temple.add(pivot)
    return { pivot, group, base, drums, cap, saved, cracks: { crack, gold, glow } }
  }

  private buildTemple(n: number, thesis: string) {
    // clear the previous temple
    this.temple.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    this.temple.clear()
    this.columns = []

    const span = (n - 1) * SPACING
    this.roofW = span + 2.3
    const stepDims = [
      { w: this.roofW + 2.0, d: 3.4, y: 0.09 },
      { w: this.roofW + 1.5, d: 2.9, y: 0.27 },
      { w: this.roofW + 1.0, d: 2.4, y: 0.45 },
    ]
    this.steps = stepDims
      .slice()
      .reverse()
      .map((s) => ({ halfW: s.w / 2, halfD: s.d / 2, y: s.y + 0.09 }))
    stepDims.forEach((s, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.18, s.d), i === 2 ? this.marble : this.marbleShade)
      m.position.y = s.y
      m.castShadow = true
      m.receiveShadow = true
      this.temple.add(m)
    })

    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * SPACING
      const v = this.buildColumnVisual(x, this.marble)
      this.columns.push({ x, status: 'standing', original: v, replacement: null, current: v, fallen: false })
    }

    // roof: architrave, frieze with the thesis, cornice, pediment
    this.roofPivot = new THREE.Group()
    this.roofPivot.position.set(0, STY + COL_TOP, 0)
    this.roof = new THREE.Group()
    this.roofPivot.add(this.roof)
    const W = this.roofW
    const architrave = new THREE.Mesh(new THREE.BoxGeometry(W, 0.42, 1.3), this.marble)
    architrave.position.y = 0.21
    this.friezeMat = new THREE.MeshStandardMaterial({
      map: this.friezeTexture(thesis, W / 0.52),
      roughness: 0.5,
      emissive: 0xf3d27a,
      emissiveIntensity: 0,
    })
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(W, 0.52, 1.24), [
      this.marble, this.marble, this.marble, this.marble, this.friezeMat, this.marble,
    ])
    frieze.position.y = 0.68
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.16, 1.52), this.marble)
    cornice.position.y = 1.02
    const half = (W + 0.5) / 2
    const pedShape = new THREE.Shape()
    pedShape.moveTo(-half, 0)
    pedShape.lineTo(0, 1.2)
    pedShape.lineTo(half, 0)
    pedShape.lineTo(-half, 0)
    const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: 1.42, bevelEnabled: false })
    pedGeo.translate(0, 0, -0.71)
    const pediment = new THREE.Mesh(pedGeo, this.marble)
    pediment.position.y = 1.1
    const tShape = new THREE.Shape()
    tShape.moveTo(-half + 0.55, 0.12)
    tShape.lineTo(0, 1.0)
    tShape.lineTo(half - 0.55, 0.12)
    tShape.lineTo(-half + 0.55, 0.12)
    const tympanum = new THREE.Mesh(new THREE.ShapeGeometry(tShape), this.marbleShade)
    tympanum.position.set(0, 1.1, 0.712)
    this.roof.add(architrave, frieze, cornice, pediment, tympanum)
    this.roof.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    const inscCanvas = document.createElement('canvas')
    inscCanvas.width = 1024
    inscCanvas.height = 120
    const ig = inscCanvas.getContext('2d')!
    ig.font = '700 64px Cinzel, Georgia, serif'
    ig.textAlign = 'center'
    ig.textBaseline = 'middle'
    ig.fillStyle = '#7A6644'
    ig.fillText('ΓΝΩΘΙ ΣΕΑΥΤΟΝ', 512, 60)
    const inscription = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.26),
      new THREE.MeshStandardMaterial({ map: this.canvasTexture(inscCanvas), transparent: true, roughness: 0.6 }),
    )
    inscription.position.set(0, 1.46, 0.716)
    this.roof.add(inscription)
    this.friezeCrack = this.tube(
      [[0.02, 0.94, 0.625], [-0.05, 0.82, 0.625], [0.04, 0.7, 0.625], [-0.03, 0.56, 0.625], [0.03, 0.42, 0.655], [-0.02, 0.28, 0.655], [0.02, 0.02, 0.655]],
      0.012,
      new THREE.MeshStandardMaterial({ color: 0x24190f, roughness: 0.5 }),
    )
    this.friezeCrack.mesh.visible = false
    this.roof.add(this.friezeCrack.mesh)
    this.temple.add(this.roofPivot)

    // braziers sit just outside the steps
    const bx = this.roofW / 2 + 1.55
    this.braziers.forEach((b, i) => (b.position.x = i === 0 ? -bx : bx))
    this.fireEmitters.forEach((f, i) => {
      f.x = i === 0 ? -bx : bx
      f.light.position.x = f.x
      f.glow.position.x = f.x
    })
  }

  /* --------------------------------- effects -------------------------------- */

  private setRoofSag(on: boolean, dur: number) {
    const from = { y: this.roof.position.y, r: this.roof.rotation.z }
    const to = on ? { y: -0.05, r: 0.012 } : { y: 0, r: 0 }
    this.tween(0, dur, (e) => {
      this.roof.position.y = from.y + (to.y - from.y) * e
      this.roof.rotation.z = from.r + (to.r - from.r) * e
    }, ease.outBack)
  }

  /** The roof straightens unless some column is still cracked. */
  private settleRoof() {
    const strained = this.columns.some((c) => c.status === 'weakened' && !c.fallen)
    this.setRoofSag(strained, 1.4)
  }

  private makeBolt(a: THREE.Vector3, b: THREE.Vector3) {
    if (this.bolt) {
      this.scene.remove(this.bolt.core.mesh, this.bolt.glow.mesh)
      this.bolt.core.geo.dispose()
      this.bolt.glow.geo.dispose()
    }
    const pts: number[][] = []
    const n = 9
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n)
      if (i > 0 && i < n) {
        p.x += rand(-0.45, 0.45)
        p.y += rand(-0.3, 0.3)
        p.z += rand(-0.3, 0.3)
      }
      pts.push([p.x, p.y, p.z])
    }
    const core = this.tube(pts, 0.03, new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 1, fog: false }))
    const glow = this.tube(pts, 0.14, new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
    core.setProgress(0)
    glow.setProgress(0)
    this.scene.add(core.mesh, glow.mesh)
    this.bolt = { core, glow }
  }

  private topple(v: ColumnVisual) {
    const state = { a: 0, w: 0 }
    const pivotWorld = v.pivot.position.clone()
    v.cracks.crack.mesh.visible = false
    v.cracks.gold.mesh.visible = false
    v.cracks.glow.mesh.visible = false
    const step = () => {
      state.w += 2.6 * (1 / 60)
      state.a += state.w * (1 / 60)
      v.pivot.rotation.x = state.a
      if (state.a > 0.5) {
        const parts: THREE.Object3D[] = [...v.drums, v.cap]
        parts.forEach((o) => {
          this.scene.attach(o)
          const rvec = o.getWorldPosition(new THREE.Vector3()).sub(pivotWorld)
          const vel = new THREE.Vector3(state.w, 0, 0).cross(rvec)
          vel.x += rand(-0.6, 0.6)
          this.bodies.push({ mesh: o, v: vel, w: new THREE.Vector3(state.w * 1.2, rand(-1, 1), rand(-0.6, 0.6)), r: o === v.cap ? 0.3 : R * 0.97, chip: false })
        })
        this.sound.crack(0.8)
        this.dustBurst(new THREE.Vector3(v.pivot.position.x, 2.2, 1.2), 60, 1.6, 0xe7dfcb, 0.8)
        v.pivot.rotation.x = 0
        return
      }
      this.at(1 / 60, step)
    }
    step()
  }

  private floorY(x: number, z: number) {
    const ax = Math.abs(x)
    const az = Math.abs(z)
    for (const s of this.steps) if (ax < s.halfW && az < s.halfD) return s.y
    return 0
  }

  private spawnChips(col: Column, n: number) {
    const geo = new THREE.DodecahedronGeometry(1, 0)
    const pts = this.crackPoints()
    for (let i = 0; i < n; i++) {
      const s = rand(0.035, 0.08)
      const m = new THREE.Mesh(geo, this.marble)
      m.scale.setScalar(s)
      const p = pts[Math.floor(rand(1, pts.length - 2))]
      m.position.set(col.x + p[0], p[1] + STY, p[2] + 0.05)
      m.castShadow = true
      this.scene.add(m)
      this.bodies.push({ mesh: m, v: new THREE.Vector3(rand(-1.2, 1.2), rand(0.3, 1.8), rand(0.6, 2.4)), w: new THREE.Vector3(rand(-8, 8), rand(-8, 8), rand(-8, 8)), r: s, chip: true })
    }
  }

  private clearBodies(all: boolean) {
    for (const b of this.bodies) if (b.chip || all) this.scene.remove(b.mesh)
    this.bodies.length = 0
  }

  private dustBurst(origin: THREE.Vector3, count: number, spread: number, color: number, up: number) {
    if (this.reduced) return
    const pos = new Float32Array(count * 3)
    const vel: THREE.Vector3[] = []
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x
      pos[i * 3 + 1] = origin.y
      pos[i * 3 + 2] = origin.z
      vel.push(new THREE.Vector3(rand(-1, 1) * spread, rand(-0.2, 1) * up, rand(0, 1.2) * spread))
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: this.dotTex, color, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false }))
    this.scene.add(pts)
    this.bursts.push({ pts, vel, life: 0, max: 1.6 })
  }

  /* ---------------------------------- world --------------------------------- */

  private buildWorld() {
    const scene = this.scene
    const HORIZON = new THREE.Color(0x182131)
    scene.fog = new THREE.FogExp2(HORIZON.getHex(), 0.016)
    scene.background = HORIZON.clone()

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x05070b) },
        mid: { value: new THREE.Color(0x0d1420) },
        low: { value: new THREE.Color(0x26314a) },
      },
      vertexShader:
        'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(low, mid, smoothstep(-0.05, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.75, h)); gl_FragColor = vec4(c, 1.0); }',
    })
    const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 48, 24), skyMat)
    sky.renderOrder = -2
    scene.add(sky)

    // stars
    const n = 900
    const spos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = rand(0, Math.PI * 2)
      const ph = rand(0.05, 1.32)
      const r = 140
      spos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      spos[i * 3 + 1] = r * Math.cos(ph) + 4
      spos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    const sgeo = new THREE.BufferGeometry()
    sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3))
    this.stars = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0xede6d6, size: 0.42, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false }))
    scene.add(this.stars)

    // moon and halo
    const moonPos = new THREE.Vector3(30, 29, -128)
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 48, 48), new THREE.MeshBasicMaterial({ color: 0xf1e8d2, fog: false }))
    moon.position.copy(moonPos)
    scene.add(moon)
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.spriteTexture((g, s) => {
          const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
          gr.addColorStop(0, 'rgba(241,232,210,.55)')
          gr.addColorStop(0.25, 'rgba(241,232,210,.14)')
          gr.addColorStop(1, 'rgba(241,232,210,0)')
          g.fillStyle = gr
          g.fillRect(0, 0, s, s)
        }, 256),
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    halo.position.copy(moonPos)
    halo.scale.set(46, 46, 1)
    scene.add(halo)

    // clouds
    const cloudTex = this.spriteTexture((g, s) => {
      for (let i = 0; i < 26; i++) {
        const x = rand(s * 0.15, s * 0.85)
        const y = rand(s * 0.38, s * 0.62)
        const r = rand(s * 0.08, s * 0.2)
        const gr = g.createRadialGradient(x, y, 0, x, y, r)
        gr.addColorStop(0, 'rgba(200,210,232,.22)')
        gr.addColorStop(1, 'rgba(200,210,232,0)')
        g.fillStyle = gr
        g.fillRect(0, 0, s, s)
      }
    }, 256)
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: rand(0.35, 0.7), depthWrite: false, fog: false }))
      c.position.set(rand(-90, 90), rand(22, 46), rand(-130, -90))
      const s = rand(40, 70)
      c.scale.set(s, s * 0.42, 1)
      c.userData.speed = rand(0.4, 1.1)
      scene.add(c)
      this.clouds.push(c)
    }

    // terrain: a level hilltop, a valley and the sea, mountains beyond
    const tg = new THREE.PlaneGeometry(240, 240, 170, 170)
    tg.rotateX(-Math.PI / 2)
    const tp = tg.attributes.position
    const ridge = (a: number) => 0.55 + 0.25 * Math.sin(a * 3 + 1.2) + 0.15 * Math.sin(a * 7 + 0.4) + 0.08 * Math.sin(a * 17 + 2.1)
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i)
      const z = tp.getZ(i)
      const d = Math.hypot(x, z)
      const a = Math.atan2(z, x)
      let y = 0
      if (d > 11) y -= Math.min((d - 11) * 0.6, 9)
      if (d > 34) y += Math.pow(Math.max(0, d - 34), 1.15) * 0.42 * ridge(a)
      y += (Math.sin(x * 0.7) * Math.cos(z * 0.6) + Math.sin(x * 0.23 + z * 0.31)) * (d > 11 ? 0.55 : 0.03)
      tp.setY(i, y)
    }
    tg.computeVertexNormals()
    const terrainMat = surface('aerial_grass_rock', { repeat: [48, 48], color: 0x3a4048, normal: 1.2 })
    const terrain = new THREE.Mesh(tg, terrainMat)
    terrain.receiveShadow = true
    scene.add(terrain)

    // stone terrace
    const slab = document.createElement('canvas')
    slab.width = slab.height = 512
    const sg = slab.getContext('2d')!
    sg.fillStyle = '#2a2b2c'
    sg.fillRect(0, 0, 512, 512)
    for (let y = 0; y < 512; y += 64) {
      for (let x = (y / 64) % 2 ? -32 : 0; x < 512; x += 64) {
        const l = 38 + Math.floor(rand(-6, 6))
        sg.fillStyle = `rgb(${l},${l + 1},${l + 3})`
        sg.fillRect(x + 1, y + 1, 62, 62)
      }
    }
    const slabTex = this.canvasTexture(slab)
    slabTex.wrapS = slabTex.wrapT = THREE.RepeatWrapping
    slabTex.repeat.set(5, 5)
    const terrace = new THREE.Mesh(new THREE.CircleGeometry(11.5, 72), surface('marble_01', { repeat: [7, 7], color: 0xa8a092, normal: 1.1 }))
    terrace.rotation.x = -Math.PI / 2
    terrace.position.y = 0.02
    terrace.receiveShadow = true
    scene.add(terrace)

    // sea and the moon's path
    const pathTex = this.spriteTexture((g, s) => {
      for (let i = 0; i < 260; i++) {
        const y = rand(0, s)
        const spread = (y / s) * s * 0.32 + 6
        const x = s / 2 + rand(-spread, spread)
        g.fillStyle = `rgba(241,232,210,${rand(0.08, 0.5) * (1 - Math.abs(x - s / 2) / (spread + 1))})`
        g.fillRect(x, y, rand(4, 18), 1.5)
      }
    }, 256)
    const moonPath = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 140),
      new THREE.MeshBasicMaterial({ map: pathTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    )
    moonPath.rotation.x = -Math.PI / 2
    moonPath.rotation.z = -Math.atan2(moonPos.x, -moonPos.z)
    moonPath.position.set(moonPos.x * 0.45, -7.1, -55)
    scene.add(moonPath)

    // cypresses
    const leaf = new THREE.MeshStandardMaterial({ color: 0x14231b, roughness: 0.95, flatShading: true })
    const bark = new THREE.MeshStandardMaterial({ color: 0x231a12, roughness: 1 })
    const cypress = (x: number, z: number, h: number, y = 0) => {
      const g = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h * 0.18, 6), bark)
      trunk.position.y = h * 0.09
      g.add(trunk)
      const geo = new THREE.ConeGeometry(h * 0.13, h * 0.88, 9, 4)
      const p = geo.attributes.position
      for (let i = 0; i < p.count; i++) {
        const k = 1 + 0.12 * Math.sin(p.getY(i) * 9 + x)
        p.setX(i, p.getX(i) * k)
        p.setZ(i, p.getZ(i) * k)
      }
      geo.computeVertexNormals()
      const crown = new THREE.Mesh(geo, leaf)
      crown.position.y = h * 0.14 + h * 0.44
      g.add(crown)
      g.position.set(x, y, z)
      g.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.castShadow = true
          m.receiveShadow = true
        }
      })
      scene.add(g)
    }
    ;[[-7.2, -2.6, 4.2], [-8.4, -1.0, 3.4], [-7.8, -4.6, 5], [7.4, -3.0, 4.6], [8.6, -1.3, 3.6], [8, -5.2, 4.9], [-10, 3, 3.2], [10.2, 2.4, 3]].forEach((t) => cypress(t[0], t[1], t[2]))
    for (let i = 0; i < 26; i++) {
      const a = rand(-Math.PI, 0)
      const d = rand(15, 32)
      cypress(Math.cos(a) * d, Math.sin(a) * d, rand(2.4, 4.4), -Math.min((d - 11) * 0.6, 9) + 0.1)
    }

    // ruins of an older temple
    const r1 = new THREE.Mesh(this.flutedDrum(R, R * 0.98, 1.1), this.marbleShade)
    r1.position.set(-6.6, 0.55, 3.4)
    r1.rotation.y = 0.3
    const r1b = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.12, 0.2, 48), this.marbleShade)
    r1b.position.set(-6.6, 0.1, 3.4)
    const r2 = new THREE.Mesh(this.flutedDrum(R, R * 0.98, 0.75), this.marbleShade)
    r2.position.set(-5.6, R, 4.4)
    r2.rotation.set(0, 0.9, Math.PI / 2)
    const r3 = new THREE.Mesh(this.flutedDrum(R, R * 0.98, 0.75), this.marbleShade)
    r3.position.set(6.8, R, 3.9)
    r3.rotation.set(0, -0.5, Math.PI / 2)
    ;[r1, r1b, r2, r3].forEach((m) => {
      m.castShadow = true
      m.receiveShadow = true
      scene.add(m)
    })

    // braziers (moved beside the steps by buildTemple)
    const bronze = new THREE.MeshStandardMaterial({ color: 0x6b4a26, metalness: 0.85, roughness: 0.38 })
    const flameTex = this.spriteTexture((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      gr.addColorStop(0, 'rgba(255,240,200,1)')
      gr.addColorStop(0.35, 'rgba(255,170,80,.75)')
      gr.addColorStop(1, 'rgba(255,90,30,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }, 64)
    ;[-4.7, 4.7].forEach((x) => {
      const b = new THREE.Group()
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.25, 6), bronze)
        leg.position.set(Math.cos(a) * 0.22, 0.6, Math.sin(a) * 0.22)
        leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18)
        b.add(leg)
      }
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze)
      bowl.position.y = 1.3
      b.add(bowl)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 32), bronze)
      rim.rotation.x = Math.PI / 2
      rim.position.y = 1.3
      b.add(rim)
      b.position.set(x, 0, 2.15)
      b.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) m.castShadow = true
      })
      scene.add(b)
      this.braziers.push(b)
      const light = new THREE.PointLight(0xff8a3c, 1.6 * L, 7.5, 2)
      light.position.set(x, 1.8, 2.15)
      scene.add(light)
      this.fireLights.push(light)
      const count = 46
      const pos = new Float32Array(count * 3)
      const seed = Array.from({ length: count }, () => ({ life: rand(0, 1), sx: rand(-0.12, 0.12), sz: rand(-0.12, 0.12), sp: rand(0.7, 1.3) }))
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: flameTex, size: 0.34, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb066 }))
      scene.add(pts)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }))
      glow.position.set(x, 1.55, 2.15)
      glow.scale.set(1.6, 1.6, 1)
      scene.add(glow)
      this.fireEmitters.push({ x, pts, seed, glow, light })
    })

    // dust motes in the lamplight
    const MOTES = 140
    const mpos = new Float32Array(MOTES * 3)
    for (let i = 0; i < MOTES; i++) {
      mpos[i * 3] = rand(-3.6, 3.6)
      mpos[i * 3 + 1] = rand(0.6, 4)
      mpos[i * 3 + 2] = rand(-1, 1.6)
      this.moteSeed.push(rand(0, 10))
    }
    const mgeo = new THREE.BufferGeometry()
    mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3))
    this.motes = new THREE.Points(mgeo, new THREE.PointsMaterial({ map: this.dotTex, color: 0xffd9a0, size: 0.06, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }))
    scene.add(this.motes)

    // shooting star
    this.meteor = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    scene.add(this.meteor)
  }

  /* ---------------------------------- loop ---------------------------------- */

  private fitCamera() {
    const aspect = this.W / this.H
    this.camera.aspect = aspect
    this.camera.fov = aspect < 0.8 ? 46 : 36
    this.camera.updateProjectionMatrix()
    const vfov = THREE.MathUtils.degToRad(this.camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    const needW = (this.roofW + 3.0) / 2 / Math.tan(hfov / 2)
    const needH = 6.6 / 2 / Math.tan(vfov / 2)
    const prevFit = this.cam.fit
    this.cam.fit = Math.max(needW, needH) + 1.2
    if (Math.abs(this.cam.r - prevFit) < 0.01) this.cam.r = this.cam.fit
  }

  private frame = (now: number) => {
    if (this.disposed) return
    const dt = Math.min((now - this.last) / 1000, 1 / 30)
    this.last = now
    this.clock += dt

    for (let i = this.later.length - 1; i >= 0; i--) {
      if (this.clock >= this.later[i].t) {
        const f = this.later[i].fn
        this.later.splice(i, 1)
        f()
      }
    }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]
      if (this.clock < tw.start) continue
      const p = clamp((this.clock - tw.start) / tw.dur, 0, 1)
      tw.fn(tw.e(p))
      if (p >= 1) {
        this.tweens.splice(i, 1)
        tw.done?.()
      }
    }

    // rigid bodies
    for (const b of this.bodies) {
      const m = b.mesh
      b.v.y -= 9.8 * dt
      m.position.addScaledVector(b.v, dt)
      m.rotation.x += b.w.x * dt
      m.rotation.y += b.w.y * dt
      m.rotation.z += b.w.z * dt
      const fy = this.floorY(m.position.x, m.position.z)
      if (m.position.y - b.r < fy) {
        const impact = -b.v.y
        m.position.y = fy + b.r
        if (b.v.y < 0) {
          b.v.y *= -0.3
          if (Math.abs(b.v.y) < 0.35) b.v.y = 0
        }
        b.v.x *= 0.86
        b.v.z *= 0.9
        b.w.multiplyScalar(0.8)
        if (!b.chip && impact > 2.2) {
          this.sound.thud(Math.min(impact / 8, 1))
          this.dustBurst(m.position.clone().setY(fy + 0.05), 18, 0.9, 0xcfc6b1, 0.5)
        }
      }
    }

    // dust bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]
      b.life += dt
      const p = b.pts.geometry.attributes.position
      for (let k = 0; k < b.vel.length; k++) {
        b.vel[k].multiplyScalar(0.96)
        b.vel[k].y -= 0.4 * dt
        p.setXYZ(k, p.getX(k) + b.vel[k].x * dt, p.getY(k) + b.vel[k].y * dt, p.getZ(k) + b.vel[k].z * dt)
      }
      p.needsUpdate = true
      ;(b.pts.material as THREE.PointsMaterial).opacity = 0.8 * (1 - b.life / b.max)
      if (b.life >= b.max) {
        this.scene.remove(b.pts)
        b.pts.geometry.dispose()
        this.bursts.splice(i, 1)
      }
    }

    // ambient life
    const t = this.clock
    this.lamp.intensity = this.lampBase * (0.9 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1 + 1.3))
    const mp = this.motes.geometry.attributes.position
    for (let i = 0; i < this.moteSeed.length; i++) {
      let y = mp.getY(i) + dt * 0.08
      if (y > 4.2) y = 0.6
      mp.setXYZ(i, mp.getX(i) + Math.sin(t * 0.5 + this.moteSeed[i]) * dt * 0.05, y, mp.getZ(i))
    }
    mp.needsUpdate = true
    ;(this.stars.material as THREE.PointsMaterial).opacity = 0.75 + 0.1 * Math.sin(t * 0.7)
    this.clouds.forEach((c) => {
      c.position.x += (c.userData.speed as number) * dt
      if (c.position.x > 110) c.position.x = -110
    })
    this.fireEmitters.forEach((f, fi) => {
      f.light.intensity = (1.5 + 0.35 * Math.sin(t * 11 + fi) + 0.2 * Math.sin(t * 23.7 + fi * 2)) * L
      f.glow.material.opacity = 0.38 + 0.1 * Math.sin(t * 9 + fi)
      const p = f.pts.geometry.attributes.position
      f.seed.forEach((s, i) => {
        s.life += dt * s.sp * 1.4
        if (s.life > 1) {
          s.life -= 1
          s.sx = rand(-0.14, 0.14)
          s.sz = rand(-0.14, 0.14)
        }
        const l = s.life
        p.setXYZ(i, f.x + s.sx * (1 - l) + Math.sin(t * 6 + i) * 0.03 * l, 1.38 + l * 0.85, 2.15 + s.sz * (1 - l))
      })
      p.needsUpdate = true
    })
    if (!this.reduced) {
      this.nextMeteor -= dt
      const mm = this.meteor.material as THREE.MeshBasicMaterial
      if (this.nextMeteor <= 0 && this.meteorT < 0) {
        this.meteorT = 0
        this.nextMeteor = rand(9, 16)
        this.meteorFrom.set(rand(-60, 20), rand(38, 55), -110)
        this.meteorTo.copy(this.meteorFrom).add(new THREE.Vector3(rand(22, 34), -rand(10, 16), 0))
      }
      if (this.meteorT >= 0) {
        this.meteorT += dt / 0.9
        const k = Math.min(this.meteorT, 1)
        this.meteor.position.copy(this.meteorFrom).lerp(this.meteorTo, k)
        this.meteor.lookAt(this.camera.position)
        this.meteor.rotation.z = Math.atan2(this.meteorTo.y - this.meteorFrom.y, this.meteorTo.x - this.meteorFrom.x)
        mm.opacity = Math.sin(k * Math.PI) * 0.9
        if (this.meteorT >= 1) {
          this.meteorT = -1
          mm.opacity = 0
        }
      }
    }

    // camera
    const sway = this.reduced ? 0 : Math.sin(t * 0.11) * 0.08
    const th = this.cam.theta + sway
    this.camera.position.set(Math.sin(th) * this.cam.r, this.cam.h + this.cam.phiOff, Math.cos(th) * this.cam.r)
    if (this.shakeAmt > 0.001) {
      this.camera.position.x += rand(-1, 1) * this.shakeAmt * 0.25
      this.camera.position.y += rand(-1, 1) * this.shakeAmt * 0.2
      this.shakeAmt *= 0.88
    }
    this.camera.lookAt(this.target)
    if (!this.reduced) for (const k of this.ticks) k(this.clock, 0)
    this.post.render()
    this.raf = requestAnimationFrame(this.frame)
  }
}

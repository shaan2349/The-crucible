import * as THREE from 'three'
import { surface } from '../world/textures'
import { arrival } from '../night/veil'
import { addDust, createPost, type Post, type Tick } from '../world/nightKit'
import { buildBust, marbleTexture, statueMaterials, setStatueDetail, type Statue } from '../marble/statue'

/**
 * The Hall of Minds in 3D: a long open-air stoa at night. The thinkers stand
 * as marble busts in lit niches along the back wall, wing by wing through
 * history, with a bronze brazier marking where each wing begins. You walk
 * along it by dragging, scrolling or with the arrows; tapping a bust wakes it.
 */

export interface HallWing {
  name: string
  ids: string[]
}

export interface BustAnchor {
  id: string
  x: number
  y: number
  /** 0 when off screen or too far to label, up to 1 when close. */
  presence: number
}

export interface WingAnchor {
  name: string
  x: number
  y: number
  presence: number
}

const L = Math.PI
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt))
const rand = (a: number, b: number) => a + Math.random() * (b - a)

const STEP = 1.5 // space between busts
const WING_GAP = 2.2 // extra space where a wing begins
const WALL_Z = -0.95
const ROOF_Y = 3.6
const LAMPS = 5 // pooled lights that follow the visitor

interface Slot {
  id: string
  x: number
  statue: Statue | null
  glow: number
  dim: number
}

export class HallScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)
  private canvas: HTMLCanvasElement
  private reduced: boolean
  private post!: Post
  private ticks: Tick[] = []
  private raf = 0
  private last = performance.now()
  private clock = 0
  private W = 1
  private H = 1

  private slots: Slot[] = []
  private wingStarts: { name: string; x: number; cx: number }[] = []
  private length = 10
  private hall = new THREE.Group()
  private lamps: THREE.PointLight[] = []
  private awakeLight: THREE.SpotLight
  private awake: string | null = null
  private matches: Set<string> | null = null
  private flames: { sprite: THREE.Sprite; light: THREE.PointLight; x: number }[] = []
  private glowTex: THREE.CanvasTexture

  private camX = 0
  private born = performance.now()
  private targetX = 0
  private zoom = 0
  private fit = 1
  private dragging = false
  private dragMoved = 0
  private lastX = 0
  private raycaster = new THREE.Raycaster()
  private onSelect: (id: string) => void
  private onDown: (e: PointerEvent) => void
  private onMove: (e: PointerEvent) => void
  private onUp: (e: PointerEvent) => void
  private onWheel: (e: WheelEvent) => void

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean; onSelect: (id: string) => void }) {
    this.canvas = canvas
    this.reduced = !!opts.reducedMotion
    this.onSelect = opts.onSelect
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    setStatueDetail(small ? 0.55 : 0.75)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.glowTex = this.sprite((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      gr.addColorStop(0, 'rgba(255,236,190,1)')
      gr.addColorStop(0.35, 'rgba(255,170,80,.6)')
      gr.addColorStop(1, 'rgba(255,120,40,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }, 64)

    this.scene.add(new THREE.HemisphereLight(0x7f8cb2, 0x1b140d, 0.38 * L))
    const moon = new THREE.DirectionalLight(0xb9c5e6, 0.45 * L)
    moon.position.set(-4, 8, 9)
    this.scene.add(moon)
    for (let i = 0; i < LAMPS; i++) {
      const l = new THREE.PointLight(0xffb56a, 1.3 * L, 3.4, 1.8)
      l.position.set(0, 2.55, WALL_Z + 0.75)
      this.lamps.push(l)
      this.scene.add(l)
    }
    this.awakeLight = new THREE.SpotLight(0xffe0b0, 0, 6, 0.32, 0.8, 1.5)
    this.awakeLight.position.set(0, 3.3, 1.8)
    this.scene.add(this.awakeLight, this.awakeLight.target)
    this.scene.add(this.hall)
    this.buildSky()

    // drag, scroll and tap
    this.onDown = (e) => {
      this.dragging = true
      this.dragMoved = 0
      this.lastX = e.clientX
      canvas.setPointerCapture?.(e.pointerId)
    }
    this.onMove = (e) => {
      if (!this.dragging) {
        if (e.pointerType === 'mouse') canvas.style.cursor = this.pick(e) ? 'pointer' : 'grab'
        return
      }
      const dx = e.clientX - this.lastX
      this.lastX = e.clientX
      this.dragMoved += Math.abs(dx)
      this.targetX = clamp(this.targetX - (dx / this.W) * 4.2 * this.fit, 0, this.length)
    }
    this.onUp = (e) => {
      if (this.dragging && this.dragMoved < 6) {
        const id = this.pick(e)
        if (id) this.onSelect(id)
      }
      this.dragging = false
    }
    this.onWheel = (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      this.targetX = clamp(this.targetX + d * 0.006, 0, this.length)
      e.preventDefault()
    }
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', () => (this.dragging = false))
    canvas.addEventListener('wheel', this.onWheel, { passive: false })

    // dust turning in the lamplight along the gallery, and a soft bloom on the lamps and braziers
    this.ticks.push(addDust(this.scene, new THREE.Box3(new THREE.Vector3(-3, 0.5, WALL_Z + 0.2), new THREE.Vector3(80, 3.2, WALL_Z + 2.6)), this.glowTex, 420))

    this.post = createPost(this.renderer, this.scene, this.camera, { strength: 0.45, threshold: 0.8, vignette: 0.5 })
    this.raf = requestAnimationFrame(this.frame)
  }

  /* ------------------------------- public API ------------------------------- */

  /** Lays out the wings along the hall and builds the architecture to fit. */
  setWings(wings: HallWing[]) {
    let x = 0
    this.slots = []
    this.wingStarts = []
    wings.forEach((w, wi) => {
      if (wi > 0) x += WING_GAP
      this.wingStarts.push({ name: w.name, x: x - (wi > 0 ? WING_GAP / 2 : 0.9), cx: x + ((w.ids.length - 1) * STEP) / 2 })
      w.ids.forEach((id, i) => {
        if (i > 0) x += STEP
        this.slots.push({ id, x, statue: null, glow: 0, dim: 0 })
      })
    })
    this.length = x
    this.targetX = this.camX = Math.min(x, STEP * 1.5)
    this.buildHall()
  }

  /** Walks to a thinker; with `wake`, lights them as their plaque opens. */
  goTo(id: string) {
    const s = this.slots.find((x) => x.id === id)
    if (s) this.targetX = s.x
  }

  setAwake(id: string | null) {
    this.awake = id
    if (id) this.goTo(id)
  }

  /** Search: thinkers that match stay lit, the rest fall into shadow. Null shows everyone. */
  setMatches(ids: Set<string> | null) {
    this.matches = ids
  }

  /** Moves one bust left or right. */
  step(dir: -1 | 1) {
    const i = this.nearestIndex(this.targetX)
    const next = this.slots[clamp(i + dir, 0, this.slots.length - 1)]
    if (next) this.targetX = next.x
  }

  jumpToWing(index: number) {
    const w = this.wingStarts[index]
    if (!w) return
    const first = this.slots.find((s) => s.x >= w.x)
    this.targetX = first ? Math.min(this.length, first.x + STEP) : w.x
  }

  /** Which wing the visitor is standing in. */
  currentWing(): number {
    let idx = 0
    this.wingStarts.forEach((w, i) => {
      if (this.camX >= w.x - 0.2) idx = i
    })
    return idx
  }

  bustAnchors(): BustAnchor[] {
    const v = new THREE.Vector3()
    return this.slots.map((s) => {
      v.set(s.x, 1.0, WALL_Z + 0.8).project(this.camera)
      const sx = (v.x * 0.5 + 0.5) * this.W
      const sy = (-v.y * 0.5 + 0.5) * this.H
      const off = v.z > 1 || sx < -80 || sx > this.W + 80
      const near = 1 - clamp((Math.abs(s.x - this.camX) - 2.8 * this.fit) / 1.6, 0, 1)
      return { id: s.id, x: sx, y: sy, presence: off ? 0 : near * (this.matches && !this.matches.has(s.id) ? 0.35 : 1) }
    })
  }

  wingAnchors(): WingAnchor[] {
    const v = new THREE.Vector3()
    return this.wingStarts.map((w) => {
      v.set(w.cx, 2.78, WALL_Z + 0.3).project(this.camera)
      const sx = (v.x * 0.5 + 0.5) * this.W
      return { name: w.name, x: sx, y: (-v.y * 0.5 + 0.5) * this.H, presence: v.z > 1 || sx < -200 || sx > this.W + 200 ? 0 : 1 }
    })
  }

  resize(w: number, h: number) {
    this.W = Math.max(1, w)
    this.H = Math.max(1, h)
    this.renderer.setSize(this.W, this.H, false)
    this.post?.setSize(w, h)
    this.camera.aspect = this.W / this.H
    this.fit = clamp(0.8 / this.camera.aspect, 0.9, 1.6)
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('wheel', this.onWheel)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    this.post.dispose()
    this.renderer.dispose()
    setStatueDetail(1)
  }

  /* --------------------------------- helpers --------------------------------- */

  private nearestIndex(x: number) {
    let best = 0
    let d = Infinity
    this.slots.forEach((s, i) => {
      const dd = Math.abs(s.x - x)
      if (dd < d) {
        d = dd
        best = i
      }
    })
    return best
  }

  private pick(e: PointerEvent): string | null {
    const r = this.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    const roots = this.slots.filter((s) => s.statue).map((s) => s.statue!.root)
    const hit = this.raycaster.intersectObjects(roots, true)[0]
    if (!hit) return null
    let o: THREE.Object3D | null = hit.object
    while (o && !o.userData.bustId) o = o.parent
    return (o?.userData.bustId as string) ?? null
  }

  private sprite(draw: (g: CanvasRenderingContext2D, s: number) => void, size: number) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    draw(c.getContext('2d')!, size)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  private buildSky() {
    const scene = this.scene
    scene.background = new THREE.Color(0x0b0f18)
    scene.fog = new THREE.Fog(0x0b0f18, 9, 26)
    const n = 500
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-60, 140)
      pos[i * 3 + 1] = rand(6, 40)
      pos[i * 3 + 2] = rand(-40, -15)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xede6d6, size: 0.25, transparent: true, opacity: 0.8, fog: false })))
  }

  private buildHall() {
    this.hall.clear()
    this.flames = []
    const start = -3
    const end = this.length + 3
    const len = end - start
    const mid = (start + end) / 2

    const floorTex = marbleTexture('#CFC6B3', '#6E6555')
    floorTex.repeat.set(len / 2.5, 2)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(len, 6), surface('marble_01', { repeat: [len / 2.4, 2.5], color: 0xb2a998, roughness: 0.55, normal: 0.8 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.set(mid, 0, 1.4)
    this.hall.add(floor)

    const stoneTex = marbleTexture('#BDB3A0', '#6B6252')
    stoneTex.repeat.set(len / 3, 1)
    const wallMat = surface('seaworn_stone_tiles', { repeat: [len / 2.2, 1.6], color: 0x8a8174, normal: 1.4 })
    const nicheMat = new THREE.MeshStandardMaterial({ color: 0x241d17, roughness: 0.95 })
    const trimMat = surface('marble_01', { repeat: [len / 3, 0.5], color: 0xb8ae9c, normal: 1 })
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, ROOF_Y, 0.3), wallMat)
    wall.position.set(mid, ROOF_Y / 2, WALL_Z - 0.15)
    this.hall.add(wall)
    // a carved band along the top of the wall and a roof overhead
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(len, 0.32, 0.16), trimMat)
    frieze.position.set(mid, ROOF_Y - 0.2, WALL_Z + 0.06)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 3.4), new THREE.MeshStandardMaterial({ color: 0x3e3832, roughness: 0.9 }))
    roof.position.set(mid, ROOF_Y + 0.1, WALL_Z + 1.6)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.34, 0.4), trimMat)
    beam.position.set(mid, ROOF_Y - 0.12, WALL_Z + 3.05)
    this.hall.add(frieze, roof, beam)

    // a niche behind each bust, pilasters between them
    const nicheGeo = new THREE.BoxGeometry(1.05, 2.3, 0.08)
    const archGeo = new THREE.CylinderGeometry(0.525, 0.525, 0.08, 28, 1, false, 0, Math.PI)
    const pilasterGeo = new THREE.BoxGeometry(0.16, ROOF_Y - 0.4, 0.12)
    this.slots.forEach((s) => {
      const n = new THREE.Mesh(nicheGeo, nicheMat)
      n.position.set(s.x, 1.45, WALL_Z + 0.02)
      const a = new THREE.Mesh(archGeo, nicheMat)
      a.rotation.set(Math.PI / 2, 0, Math.PI / 2)
      a.rotation.set(Math.PI / 2, Math.PI / 2, 0)
      a.position.set(s.x, 2.6, WALL_Z + 0.02)
      this.hall.add(n, a)
      const p = new THREE.Mesh(pilasterGeo, trimMat)
      p.position.set(s.x + STEP / 2, (ROOF_Y - 0.4) / 2, WALL_Z + 0.05)
      this.hall.add(p)
    })

    // a brazier where each wing begins
    const { bronze } = statueMaterials()
    this.wingStarts.forEach((w, i) => {
      if (i === 0) return
      const g = new THREE.Group()
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.0, 6), bronze)
        leg.position.set(Math.cos(a) * 0.16, 0.5, Math.sin(a) * 0.16)
        leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18)
        g.add(leg)
      }
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze)
      bowl.position.y = 1.05
      g.add(bowl)
      g.position.set(w.x, 0, WALL_Z + 0.55)
      this.hall.add(g)
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
      flame.position.set(w.x, 1.25, WALL_Z + 0.55)
      flame.scale.set(0.5, 0.6, 1)
      this.hall.add(flame)
      const light = new THREE.PointLight(0xff8a3c, 1.4 * L, 4.5, 2)
      light.position.set(w.x, 1.5, WALL_Z + 0.7)
      this.hall.add(light)
      this.flames.push({ sprite: flame, light, x: w.x })
    })

    // where the busts will stand (built as the visitor approaches)
    this.slots.forEach((s) => {
      s.statue = null
    })
  }

  /** Builds the bust nearest the visitor that does not exist yet, one per frame. */
  private buildNext() {
    let best: Slot | null = null
    let d = 9 * this.fit
    for (const s of this.slots) {
      if (s.statue) continue
      const dd = Math.abs(s.x - this.camX)
      if (dd < d) {
        d = dd
        best = s
      }
    }
    if (!best) return
    const st = buildBust(best.id)
    st.root.position.set(best.x, 0, WALL_Z + 0.55)
    st.root.userData.bustId = best.id
    st.root.scale.setScalar(1.05)
    this.hall.add(st.root)
    best.statue = st
  }

  /* --------------------------------- the loop -------------------------------- */

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.clock += dt
    const t = this.clock
    const still = this.reduced

    this.buildNext()

    this.camX = still ? this.targetX : damp(this.camX, this.targetX, 3.2, dt)
    this.zoom = damp(this.zoom, this.awake ? 1 : 0, 2.5, dt)
    const dist = (5.3 - 1.4 * this.zoom) * this.fit * (1 + 0.45 * (1 - arrival(this.born, 2000)))
    const sway = still ? 0 : 0.04 * Math.sin(t * 0.3)
    this.camera.position.set(this.camX + sway, 1.75 + 0.2 * (this.fit - 1), WALL_Z + 0.6 + dist)
    this.camera.lookAt(this.camX, 1.3 - 0.05 * this.zoom, WALL_Z + 0.4)

    // the pooled lamps hang over the busts nearest the visitor
    const near = this.slots
      .map((s) => ({ s, d: Math.abs(s.x - this.camX) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, LAMPS)
    near.forEach(({ s }, i) => {
      const lamp = this.lamps[i]
      lamp.position.x = s.x
      const lit = this.matches && !this.matches.has(s.id) ? 0.15 : 1
      const flick = still ? 1 : 0.93 + 0.07 * Math.sin(t * 5 + s.x * 3)
      lamp.intensity = 1.3 * L * lit * flick
    })

    // the woken bust is lit warmly and turns a little toward you
    const awakeSlot = this.awake ? this.slots.find((s) => s.id === this.awake) : null
    if (awakeSlot) {
      this.awakeLight.position.set(awakeSlot.x, 3.3, WALL_Z + 2.4)
      this.awakeLight.target.position.set(awakeSlot.x, 1.45, WALL_Z + 0.55)
    }
    this.awakeLight.intensity = damp(this.awakeLight.intensity, awakeSlot ? 10 * L : 0, 3, dt)
    for (const s of this.slots) {
      if (!s.statue) continue
      const on = s.id === this.awake
      s.glow = damp(s.glow, on ? 1 : 0, 2.5, dt)
      s.statue.head.rotation.y = 0.35 * s.glow * Math.sin(Math.min(1, s.glow) * Math.PI * 0.5) + (still ? 0 : 0.03 * Math.sin(t * 0.4 + s.x))
      s.statue.head.rotation.x = 0.06 * s.glow
    }

    if (!still) {
      for (const f of this.flames) {
        const k = 0.85 + 0.1 * Math.sin(t * 8 + f.x) + 0.05 * Math.sin(t * 13 + f.x * 2)
        f.sprite.scale.set(0.45 * k, 0.6 * k, 1)
        f.light.intensity = 1.4 * L * k
      }
    }

    if (!this.reduced) for (const k of this.ticks) k(this.clock, 0)
    this.post.render()
    this.raf = requestAnimationFrame(this.frame)
  }
}

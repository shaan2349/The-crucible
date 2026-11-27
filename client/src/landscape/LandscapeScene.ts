import * as THREE from 'three'
import { surface } from '../world/textures'
import { arrival } from '../night/veil'
import { addMilkyWay, addMist, addSea, addShootingStars, createPost, type Post, type Tick } from '../world/nightKit'
import { addHorizon } from '../world/nightKit'
import { marbleTexture, statueMaterials } from '../marble/statue'
import type { PremiseStatus, TempleEnding } from '../types'

/**
 * Your Landscape in 3D: a hill under the stars that you can turn around.
 * Every belief you tested stands on it as its own small temple, built from
 * how the debate went — gold veins where a premise was defended, new marble
 * where one was rewritten, cracks where one was weakened, drums in the grass
 * where one fell, a ruin where the roof came down, a gold light on a victory.
 * Conversations from the Symposium burn as lamps around the lower slope.
 */

export interface TempleSpec {
  key: string
  statuses: PremiseStatus[]
  ending: TempleEnding
}

export interface Anchor {
  key: string
  x: number
  y: number
  /** 0 hidden (behind the hill or off screen) to 1 facing you */
  facing: number
}

const L = Math.PI
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt))

/** Seeded random, so each temple's fallen drums and cracks stay the same every visit. */
function seeded(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export class LandscapeScene {
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

  private R = 7 // hill radius, grows with the number of temples
  private HILL = 2.2 // hill height
  private items: { key: string; group: THREE.Group; top: number; glow?: THREE.Sprite; light?: THREE.PointLight; lamp?: boolean }[] = []
  private glowTex: THREE.CanvasTexture
  private marble: THREE.MeshStandardMaterial
  private fresh: THREE.MeshStandardMaterial
  private cracked: THREE.MeshStandardMaterial
  private ghost: THREE.MeshStandardMaterial
  private gold: THREE.MeshStandardMaterial
  private hovered: string | null = null
  private selected: string | null = null

  private born = performance.now()
  private yaw = 0.4
  private targetYaw = 0.4
  private pitch = 0.42
  private targetPitch = 0.42
  private zoom = 1
  private auto = true
  private dragging = false
  private moved = 0
  private lastX = 0
  private lastY = 0
  private raycaster = new THREE.Raycaster()
  private onPick: (key: string) => void
  private onDown: (e: PointerEvent) => void
  private onMove: (e: PointerEvent) => void
  private onUp: (e: PointerEvent) => void
  private onWheel: (e: WheelEvent) => void

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean; onPick: (key: string) => void }) {
    this.canvas = canvas
    this.reduced = !!opts.reducedMotion
    this.auto = !this.reduced
    this.onPick = opts.onPick
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2))
    this.renderer.shadowMap.enabled = !small
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const tex = marbleTexture('#E7DFCD', '#7C7262')
    this.marble = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
    this.fresh = new THREE.MeshStandardMaterial({ map: marbleTexture('#F6F1E6', '#9A927F'), roughness: 0.35, emissive: 0x2a2010, emissiveIntensity: 0.3 })
    this.cracked = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, color: 0xa39a88 })
    this.ghost = new THREE.MeshStandardMaterial({ color: 0xc9c1b0, roughness: 0.7, transparent: true, opacity: 0.4 })
    this.gold = new THREE.MeshStandardMaterial({ color: 0xe0b450, metalness: 0.9, roughness: 0.25, emissive: 0x7a4f10, emissiveIntensity: 0.6 })
    this.glowTex = this.sprite((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      gr.addColorStop(0, 'rgba(255,236,190,1)')
      gr.addColorStop(0.3, 'rgba(255,190,100,.5)')
      gr.addColorStop(1, 'rgba(255,150,60,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }, 64)

    this.scene.add(new THREE.HemisphereLight(0x8392bf, 0x1c150e, 0.75 * L))
    const moon = new THREE.DirectionalLight(0xbfcaea, 0.9 * L)
    moon.position.set(-10, 16, 8)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 })
    moon.shadow.bias = -0.0008
    this.scene.add(moon)
    this.buildSky()

    this.onDown = (e) => {
      this.dragging = true
      this.moved = 0
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.auto = false
      canvas.setPointerCapture?.(e.pointerId)
    }
    this.onMove = (e) => {
      if (this.dragging) {
        const dx = e.clientX - this.lastX
        const dy = e.clientY - this.lastY
        this.moved += Math.abs(dx) + Math.abs(dy)
        this.lastX = e.clientX
        this.lastY = e.clientY
        this.targetYaw -= dx * 0.006
        this.targetPitch = clamp(this.targetPitch + dy * 0.004, 0.18, 1.05)
        return
      }
      if (e.pointerType === 'mouse') {
        const k = this.pick(e)
        this.hovered = k
        canvas.style.cursor = k ? 'pointer' : 'grab'
      }
    }
    this.onUp = (e) => {
      if (this.dragging && this.moved < 8) {
        const k = this.pick(e)
        if (k) this.onPick(k)
      }
      this.dragging = false
    }
    this.onWheel = (e) => {
      this.zoom = clamp(this.zoom + e.deltaY * 0.001, 0.55, 1.5)
      this.auto = false
      e.preventDefault()
    }
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', () => (this.dragging = false))
    canvas.addEventListener('wheel', this.onWheel, { passive: false })

    // the shared night: the Milky Way and shooting stars
    addMilkyWay(this.scene, { radius: 110, a: new THREE.Vector3(1, 0.15, 0.2), b: new THREE.Vector3(0, 0.75, -1) })
    this.ticks.push(addShootingStars(this.scene, { distance: 95 }))

    this.post = createPost(this.renderer, this.scene, this.camera, { strength: 0.5, threshold: 0.78 })
    this.raf = requestAnimationFrame(this.frame)
  }

  /* ------------------------------- public API ------------------------------- */

  /** Builds the hill for these temples (newest first) and this many lamps. */
  setLandscape(temples: TempleSpec[], lamps: string[]) {
    const n = temples.length
    this.R = clamp(4.6 + Math.sqrt(n) * 2.0, 5.5, 16)
    this.HILL = 1.4 + this.R * 0.18
    this.buildHill()
    // temples spiral out from the summit: newest at the top
    temples.forEach((t, i) => {
      const a = i * 2.39996 + 0.6
      const r = i === 0 ? 0 : 2.05 * Math.sqrt(i) + 0.3
      const x = Math.sin(a) * r
      const z = Math.cos(a) * r
      const g = this.buildTemple(t)
      g.position.set(x, this.heightAt(r), z)
      g.rotation.y = Math.atan2(x, z) + (i === 0 ? 0.4 : 0)
      g.userData.key = t.key
      this.scene.add(g)
      const item: (typeof this.items)[number] = { key: t.key, group: g, top: 1.55 }
      if (t.ending === 'victory') {
        const light = new THREE.PointLight(0xffd27a, 1.6 * L, 3.2, 1.8)
        light.position.set(x, g.position.y + 1.2, z)
        this.scene.add(light)
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe0a0 }))
        glow.position.set(x, g.position.y + 0.8, z)
        glow.scale.set(2.6, 2.6, 1)
        this.scene.add(glow)
        item.glow = glow
        item.light = light
      }
      this.items.push(item)
    })
    // lamps for conversations, around the lower slope
    const ringR = this.R * 0.82
    lamps.forEach((key, i) => {
      const a = (i / Math.max(lamps.length, 8)) * Math.PI * 2 + 0.2
      const x = Math.sin(a) * ringR
      const z = Math.cos(a) * ringR
      const g = this.buildLamp()
      g.position.set(x, this.heightAt(ringR), z)
      g.userData.key = key
      this.scene.add(g)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }))
      glow.position.set(x, g.position.y + 0.95, z)
      glow.scale.set(0.7, 0.7, 1)
      this.scene.add(glow)
      const light = new THREE.PointLight(0xffa860, 0.9 * L, 2.6, 1.8)
      light.position.set(x, g.position.y + 1.0, z)
      this.scene.add(light)
      this.items.push({ key, group: g, top: 1.25, glow, light, lamp: true })
    })
    // start looking at the newest temple
    this.targetYaw = this.yaw = 0.4 + (n ? Math.atan2(this.items[0].group.position.x, this.items[0].group.position.z) * 0 : 0)
  }

  setSelected(key: string | null) {
    this.selected = key
    if (key) this.auto = false
  }

  anchors(): Anchor[] {
    const v = new THREE.Vector3()
    const toCam = new THREE.Vector3()
    return this.items
      .filter((it) => !it.lamp)
      .map((it) => {
        v.copy(it.group.position)
        v.y += it.top
        toCam.subVectors(this.camera.position, it.group.position).setY(0).normalize()
        const outward = new THREE.Vector3(it.group.position.x, 0, it.group.position.z)
        const len = outward.length()
        // temples on the far side of the hill fade out; the summit always shows
        const facing = len < 0.5 ? 1 : clamp(outward.divideScalar(len).dot(toCam) * 2 + 0.2, 0, 1)
        v.project(this.camera)
        const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
        return { key: it.key, x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H, facing: on ? facing : 0 }
      })
  }

  resize(w: number, h: number) {
    this.W = Math.max(1, w)
    this.H = Math.max(1, h)
    this.renderer.setSize(this.W, this.H, false)
    this.post?.setSize(w, h)
    this.camera.aspect = this.W / this.H
    this.camera.fov = this.camera.aspect < 0.8 ? 52 : 40
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
  }

  /* -------------------------------- building -------------------------------- */

  private heightAt(r: number) {
    const t = clamp(r / this.R, 0, 1.4)
    return this.HILL * Math.max(0, 1 - t * t) * (1 - 0.15 * t) - 0.02
  }

  private pick(e: PointerEvent): string | null {
    const r = this.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    const hit = this.raycaster.intersectObjects(
      this.items.map((i) => i.group),
      true,
    )[0]
    let o: THREE.Object3D | null = hit?.object ?? null
    while (o && !o.userData.key) o = o.parent
    return (o?.userData.key as string) ?? null
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
    scene.background = new THREE.Color(0x141c2b)
    scene.fog = new THREE.FogExp2(0x141c2b, 0.02)
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(140, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(0x04060a) }, low: { value: new THREE.Color(0x26314a) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 low; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(low, top, smoothstep(-0.02, 0.5, h)), 1.0); }',
      }),
    )
    sky.renderOrder = -2
    scene.add(sky)
    const n = 900
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = rand(0, Math.PI * 2)
      const ph = rand(0.05, 1.35)
      pos[i * 3] = 120 * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = 120 * Math.cos(ph)
      pos[i * 3 + 2] = 120 * Math.sin(ph) * Math.sin(th)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xede6d6, size: 0.35, transparent: true, opacity: 0.85, fog: false })))
    const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshBasicMaterial({ color: 0xf1e8d2, fog: false }))
    moon.position.set(-40, 40, -90)
    scene.add(moon)
    // a ring of distant hills all round, since you can turn the whole way
    const far = new THREE.MeshStandardMaterial({ color: 0x101724, roughness: 1 })
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand(-0.1, 0.1)
      const h = new THREE.Mesh(new THREE.SphereGeometry(rand(12, 22), 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), far)
      h.position.set(Math.sin(a) * 60, -2.5, Math.cos(a) * 60)
      h.scale.y = rand(0.25, 0.45)
      scene.add(h)
    }
  }

  private buildHill() {
    const R = this.R
    // rings as well as spokes, so the hill can curve
    const geo = new THREE.RingGeometry(0.001, R * 1.6, 96, 48)
    geo.rotateX(-Math.PI / 2)
    const p = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(p.count * 3)
    const grass = new THREE.Color(0x2b3726)
    const dry = new THREE.Color(0x3d3a2b)
    const tmp = new THREE.Color()
    const tintScale = 0.42 / ((grass.r + grass.g + grass.b) / 3)
    const moonlit = new THREE.Color(0x3a4560)
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const r = Math.hypot(x, z)
      p.setY(i, this.heightAt(r) - (r > R ? (r - R) * 0.6 : 0) + 0.05 * Math.sin(x * 1.3) * Math.cos(z * 1.1))
      tmp.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.8 + z * 0.6)).lerp(moonlit, 0.42).multiplyScalar(tintScale * 0.72)
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    const hill = new THREE.Mesh(geo, surface('aerial_grass_rock', { repeat: [R * 0.5, R * 0.5], vertexColors: true, normal: 1.2 }))
    hill.receiveShadow = true
    this.scene.add(hill)
    // the hill stands as an island in a moving sea, mist lying on the water around it
    const level = -R * 0.36 - 0.2
    this.ticks.push(addHorizon(this.scene, { level, distance: 75, arc: Math.PI * 2, sanctuary: false }))
    this.ticks.push(addSea(this.scene, { level, moon: new THREE.Vector3(-40, 40, -90), size: 400 }))
    const banks: [number, number, number, number][] = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      banks.push([Math.sin(a) * R * 2.4, Math.cos(a) * R * 2.4, R * 2.2, level + 0.6])
    }
    this.ticks.push(addMist(this.scene, banks, 0.28))
    // a few cypresses on the slope, kept clear of the temples
    const cyp = new THREE.MeshStandardMaterial({ color: 0x0e1812, roughness: 1 })
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2)
      const r = R * rand(0.95, 1.2)
      const h = rand(1.2, 2.2)
      const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.16, h, 8), cyp)
      c.position.set(Math.sin(a) * r, this.heightAt(r) - (r > R ? (r - R) * 0.6 : 0) + h / 2 - 0.05, Math.cos(a) * r)
      c.castShadow = true
      this.scene.add(c)
    }
  }

  private buildTemple(t: TempleSpec): THREE.Group {
    const rnd = seeded(t.key)
    const g = new THREE.Group()
    const ghosted = t.ending === 'untested'
    const base = ghosted ? this.ghost : this.marble
    const n = clamp(t.statuses.length, 2, 4)
    const W = 0.55 + n * 0.28
    const COL = 1.0
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const m = new THREE.Mesh(geo, mat)
      m.castShadow = !ghosted
      m.receiveShadow = true
      return m
    }
    // steps
    ;[0, 1].forEach((k) => {
      const s = mesh(new THREE.BoxGeometry(W + 0.3 - k * 0.14, 0.09, 1.0 - k * 0.12), base)
      s.position.y = 0.045 + k * 0.09
      g.add(s)
    })
    const floor = 0.18
    const xs = Array.from({ length: n }, (_, i) => -W / 2 + 0.16 + (i * (W - 0.32)) / Math.max(1, n - 1))
    const collapsed = t.ending === 'collapse'
    xs.forEach((x, i) => {
      const status: PremiseStatus = t.statuses[i] ?? 'standing'
      if (status === 'conceded' || (collapsed && rnd() < 0.75)) {
        // a stump, and the drums lying in the grass
        const stump = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.16 + rnd() * 0.15, 14), this.cracked)
        stump.position.set(x, floor + 0.1, 0.25)
        g.add(stump)
        for (let k = 0; k < 2; k++) {
          const drum = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 14), this.cracked)
          drum.rotation.set(0, rnd() * Math.PI, Math.PI / 2)
          drum.position.set(x + (rnd() - 0.5) * 0.6, 0.07, 0.75 + rnd() * 0.5)
          g.add(drum)
        }
        return
      }
      const mat = ghosted ? this.ghost : status === 'revised' ? this.fresh : status === 'weakened' ? this.cracked : this.marble
      const col = mesh(new THREE.CylinderGeometry(0.065, 0.078, COL, 14), mat)
      col.position.set(x, floor + COL / 2, 0.25)
      g.add(col)
      if (status === 'defended') {
        // gold veins sealing the cracks, kintsugi style
        const curve = new THREE.CatmullRomCurve3(
          Array.from({ length: 6 }, (_, k) => {
            const a = 1.2 + k * 0.5 + rnd() * 0.3
            return new THREE.Vector3(x + Math.sin(a) * 0.075, floor + 0.08 + (k / 5) * (COL - 0.16), 0.25 + Math.cos(a) * 0.075)
          }),
        )
        g.add(mesh(new THREE.TubeGeometry(curve, 30, 0.011, 6), this.gold))
      }
      if (status === 'weakened') {
        const crack = mesh(new THREE.BoxGeometry(0.012, COL * 0.6, 0.02), new THREE.MeshBasicMaterial({ color: 0x1a120c }))
        crack.position.set(x + 0.02, floor + COL * 0.55, 0.25 + 0.075)
        crack.rotation.z = 0.15
        g.add(crack)
      }
    })
    // the back wall of the cella, so the temple reads as a building from any side
    if (!collapsed) {
      const wall = mesh(new THREE.BoxGeometry(W - 0.2, COL * 0.85, 0.42), ghosted ? this.ghost : this.cracked)
      wall.position.set(0, floor + COL * 0.425, -0.12)
      g.add(wall)
    }
    // the roof: standing, or fallen beside the temple
    const pedShape = new THREE.Shape()
    pedShape.moveTo(-W / 2 - 0.08, 0)
    pedShape.lineTo(W / 2 + 0.08, 0)
    pedShape.lineTo(0, 0.32)
    pedShape.lineTo(-W / 2 - 0.08, 0)
    const lintel = mesh(new THREE.BoxGeometry(W + 0.12, 0.12, 0.95), base)
    const ped = mesh(new THREE.ExtrudeGeometry(pedShape, { depth: 0.95, bevelEnabled: false }), base)
    if (collapsed) {
      const fallen = new THREE.Group()
      lintel.position.y = 0.06
      ped.position.set(0, 0.12, -0.475)
      fallen.add(lintel, ped)
      fallen.rotation.set(0.25, 0.3, -0.35)
      fallen.position.set(0.25, 0.12, 0.1)
      g.add(fallen)
    } else {
      lintel.position.y = floor + COL + 0.06
      ped.position.set(0, floor + COL + 0.12, -0.475)
      g.add(lintel, ped)
    }
    g.scale.setScalar(0.95)
    return g
  }

  private buildLamp(): THREE.Group {
    const { bronze } = statueMaterials()
    const g = new THREE.Group()
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.85, 8), bronze)
    post.position.y = 0.425
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze)
    dish.position.y = 0.9
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 12), bronze)
    foot.position.y = 0.025
    g.add(post, dish, foot)
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true
    })
    return g
  }

  /* --------------------------------- the loop -------------------------------- */

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.clock += dt
    const t = this.clock

    if (this.auto) this.targetYaw += dt * 0.06
    // a selected temple turns to face you
    const sel = this.selected ? this.items.find((i) => i.key === this.selected) : null
    if (sel) {
      const p = sel.group.position
      if (Math.hypot(p.x, p.z) > 0.3) {
        let want = Math.atan2(p.x, p.z)
        while (want - this.targetYaw > Math.PI) want -= Math.PI * 2
        while (want - this.targetYaw < -Math.PI) want += Math.PI * 2
        this.targetYaw = want
      }
    }
    this.yaw = this.reduced ? this.targetYaw : damp(this.yaw, this.targetYaw, 3, dt)
    this.pitch = damp(this.pitch, this.targetPitch, 3, dt)
    const portrait = this.camera.aspect < 0.8
    const dist = (this.R * 1.55 + 2.5) * (1 + 0.5 * (1 - arrival(this.born, 2400))) * this.zoom * (portrait ? 1.12 : 1) * (sel ? 0.75 : 1)
    const target = sel ? sel.group.position.clone().setY(sel.group.position.y + 0.6) : new THREE.Vector3(0, this.HILL * 0.45, 0)
    this.camera.position.set(Math.sin(this.yaw) * Math.cos(this.pitch) * dist + target.x * 0.6, Math.sin(this.pitch) * dist + target.y, Math.cos(this.yaw) * Math.cos(this.pitch) * dist + target.z * 0.6)
    this.camera.lookAt(target)

    for (const it of this.items) {
      const hot = it.key === this.hovered || it.key === this.selected
      if (it.glow) {
        const base = it.lamp ? 0.75 + 0.15 * Math.sin(t * 5 + it.group.position.x * 3) : 0.35 + 0.1 * Math.sin(t * 1.8)
        ;(it.glow.material as THREE.SpriteMaterial).opacity = this.reduced ? base : base + (hot ? 0.3 : 0)
      }
      const s = hot ? 1.06 : 1
      it.group.scale.setScalar(damp(it.group.scale.x, (it.lamp ? 1 : 0.95) * s, 8, dt))
    }

    if (!this.reduced) for (const k of this.ticks) k(this.clock, 0)
    this.post.render()
    this.raf = requestAnimationFrame(this.frame)
  }
}

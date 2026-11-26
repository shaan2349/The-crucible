import * as THREE from 'three'
import { buildSeated, statueMaterials, marbleTexture, type Statue } from '../marble/statue'

/**
 * The Symposium in 3D: an open colonnade on a hill at night, a round marble
 * table lit by one oil lamp, and the philosophers as seated marble statues.
 * Whoever speaks is lit and turns to you; the others turn to listen. The
 * React screen only says who is seated, who is speaking and who is thinking.
 */

export interface ScreenPoint {
  x: number
  y: number
}

const L = Math.PI
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt))

const TABLE_R = 0.95
const TABLE_H = 0.74
const SEAT_R = 1.55

interface Seat {
  id: string
  statue: Statue
  angle: number
  spot: THREE.SpotLight
  glow: THREE.Sprite
  rise: number
  /** smoothed values */
  light: number
  yaw: number
  lean: number
  nod: number
}

export class SymposiumScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300)
  private canvas: HTMLCanvasElement
  private reduced: boolean
  private raf = 0
  private last = performance.now()
  private clock = 0
  private W = 1
  private H = 1

  private seats: Seat[] = []
  private speaking: number | null = null
  private thinking: number | null = null
  private lamp: THREE.PointLight
  private flame: THREE.Sprite
  private flameGlow: THREE.Sprite
  private glowTex: THREE.CanvasTexture
  private motes!: THREE.Points
  private stars!: THREE.Points

  private cam = { theta: 0, targetTheta: 0, tilt: 0, fit: 1 }
  private dragging = false
  private lastX = 0
  private onDown: (e: PointerEvent) => void
  private onMove: (e: PointerEvent) => void
  private onUp: () => void

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean } = {}) {
    this.canvas = canvas
    this.reduced = !!opts.reducedMotion
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.glowTex = this.sprite((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      gr.addColorStop(0, 'rgba(255,236,190,1)')
      gr.addColorStop(0.35, 'rgba(255,180,90,.55)')
      gr.addColorStop(1, 'rgba(255,140,60,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }, 128)

    // light: moonlight from behind, a dim sky fill, and the lamp on the table
    this.scene.add(new THREE.HemisphereLight(0x7d8bb0, 0x1a130c, 0.32 * L))
    const moon = new THREE.DirectionalLight(0xb6c3e6, 0.55 * L)
    moon.position.set(-5, 9, -7)
    moon.castShadow = true
    moon.shadow.mapSize.set(1024, 1024)
    Object.assign(moon.shadow.camera, { left: -5, right: 5, top: 5, bottom: -3, near: 1, far: 30 })
    this.scene.add(moon)
    const front = new THREE.DirectionalLight(0xffe2c0, 0.25 * L)
    front.position.set(1.5, 3, 6)
    this.scene.add(front)

    this.lamp = new THREE.PointLight(0xffa050, 2.4 * L, 5.5, 1.8)
    this.lamp.position.set(0, TABLE_H + 0.35, 0)
    this.lamp.castShadow = true
    this.lamp.shadow.mapSize.set(1024, 1024)
    this.lamp.shadow.bias = -0.002
    this.scene.add(this.lamp)

    this.buildWorld()
    this.buildTable()

    this.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.flame.scale.set(0.09, 0.16, 1)
    this.flame.position.set(0.07, TABLE_H + 0.16, 0)
    this.scene.add(this.flame)
    this.flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.flameGlow.scale.set(1.2, 1.2, 1)
    this.flameGlow.position.copy(this.flame.position)
    this.scene.add(this.flameGlow)

    this.onDown = (e) => {
      this.dragging = true
      this.lastX = e.clientX
      canvas.setPointerCapture?.(e.pointerId)
    }
    this.onMove = (e) => {
      if (this.dragging) {
        this.cam.targetTheta = clamp(this.cam.targetTheta - (e.clientX - this.lastX) * 0.004, -0.6, 0.6)
        this.lastX = e.clientX
      } else if (e.pointerType === 'mouse' && !this.reduced) {
        const r = canvas.getBoundingClientRect()
        this.cam.tilt = ((e.clientY - r.top) / r.height - 0.5) * -0.25
      }
    }
    this.onUp = () => {
      this.dragging = false
    }
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)

    this.raf = requestAnimationFrame(this.frame)
  }

  /* ------------------------------- public API ------------------------------- */

  /** Seats these philosophers (up to three). New guests rise into place; those who left are removed. */
  setSeats(ids: string[]) {
    const next = ids.slice(0, 3)
    if (next.join() === this.seats.map((s) => s.id).join()) return
    for (const s of this.seats) {
      this.scene.remove(s.statue.root, s.spot, s.spot.target, s.glow)
      s.spot.dispose()
    }
    const angles = next.length === 1 ? [Math.PI] : next.length === 2 ? [Math.PI - 0.62, Math.PI + 0.62] : [Math.PI - 1.15, Math.PI, Math.PI + 1.15]
    this.seats = next.map((id, i) => {
      const angle = angles[i]
      const statue = buildSeated(id)
      const x = Math.sin(angle) * SEAT_R
      const z = Math.cos(angle) * SEAT_R
      statue.root.position.set(x, 0, z)
      statue.root.rotation.y = Math.atan2(-x, -z)
      this.scene.add(statue.root)
      const spot = new THREE.SpotLight(0xffd9a8, 0, 5, 0.22, 1, 2)
      spot.position.set(x * 0.4, 3.2, z * 0.4 + 0.9)
      spot.target.position.set(x, 1.25, z)
      this.scene.add(spot, spot.target)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
      glow.scale.set(0.9, 0.9, 1)
      glow.position.set(x, statue.top.y + 0.05, z)
      this.scene.add(glow)
      return { id, statue, angle, spot, glow, rise: this.reduced ? 1 : -i * 0.35, light: 0, yaw: 0, lean: 0, nod: 0 }
    })
    this.fit()
  }

  setSpeaker(index: number | null) {
    this.speaking = index
  }

  setThinking(index: number | null) {
    this.thinking = index
  }

  /** Where each seated philosopher's name plate goes, in canvas pixels. */
  anchors(): (ScreenPoint | null)[] {
    const v = new THREE.Vector3()
    return this.seats.map((s) => {
      if (s.rise < 0.85) return null
      v.copy(s.statue.top)
      v.y += 0.02
      s.statue.root.localToWorld(v)
      v.project(this.camera)
      return { x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H }
    })
  }

  resize(w: number, h: number) {
    this.W = Math.max(1, w)
    this.H = Math.max(1, h)
    this.renderer.setSize(this.W, this.H, false)
    this.camera.aspect = this.W / this.H
    this.fit()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointercancel', this.onUp)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    this.renderer.dispose()
  }

  /* --------------------------------- camera --------------------------------- */

  /** Pulls the camera back on narrow screens so every seat stays in view. */
  private fit() {
    const aspect = this.W / this.H
    // the table and three guests span about 4.6 units across
    this.cam.fit = clamp(1.25 / aspect, 0.85, 2.1)
    this.camera.updateProjectionMatrix()
  }

  private placeCamera() {
    const r = 4.3 * this.cam.fit
    const th = this.cam.theta
    const h = 1.95 + 0.35 * (this.cam.fit - 1) + this.cam.tilt
    this.camera.position.set(Math.sin(th) * r, h, Math.cos(th) * r)
    this.camera.lookAt(0, 1.0, -0.45)
  }

  /* --------------------------------- building -------------------------------- */

  private sprite(draw: (g: CanvasRenderingContext2D, s: number) => void, size: number) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    draw(c.getContext('2d')!, size)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  private buildWorld() {
    const scene = this.scene
    const HORIZON = new THREE.Color(0x182131)
    scene.fog = new THREE.FogExp2(HORIZON.getHex(), 0.035)
    scene.background = HORIZON.clone()

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(120, 40, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(0x05070b) }, mid: { value: new THREE.Color(0x0d1420) }, low: { value: new THREE.Color(0x26314a) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(low, mid, smoothstep(-0.05, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.75, h)); gl_FragColor = vec4(c, 1.0); }',
      }),
    )
    sky.renderOrder = -2
    scene.add(sky)

    const n = 700
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = rand(0, Math.PI * 2)
      const ph = rand(0.05, 1.25)
      pos[i * 3] = 100 * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = 100 * Math.cos(ph) + 4
      pos[i * 3 + 2] = 100 * Math.sin(ph) * Math.sin(th)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xede6d6, size: 0.32, transparent: true, opacity: 0.85, fog: false }))
    scene.add(this.stars)

    const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshBasicMaterial({ color: 0xf1e8d2, fog: false }))
    moon.position.set(-24, 30, -90)
    scene.add(moon)
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sprite((g, s) => {
          const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
          gr.addColorStop(0, 'rgba(241,232,210,.5)')
          gr.addColorStop(0.25, 'rgba(241,232,210,.12)')
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
    halo.position.copy(moon.position)
    halo.scale.set(36, 36, 1)
    scene.add(halo)

    // the hilltop and distant hills
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0x141a16, roughness: 1 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.36
    ground.receiveShadow = true
    scene.add(ground)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x101622, roughness: 1 })
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i - 4) * 0.42 + rand(-0.1, 0.1)
      const hill = new THREE.Mesh(new THREE.SphereGeometry(rand(8, 14), 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMat)
      hill.position.set(Math.sin(a) * 42, -1.5, Math.cos(a) * 42)
      hill.scale.y = rand(0.25, 0.45)
      scene.add(hill)
    }
    const cypressMat = new THREE.MeshStandardMaterial({ color: 0x0b130f, roughness: 1 })
    for (let i = 0; i < 18; i++) {
      const a = Math.PI + rand(-1.6, 1.6)
      const d = rand(9, 20)
      const h = rand(2.2, 3.8)
      const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.16, h, 10), cypressMat)
      c.position.set(Math.sin(a) * d, h / 2 - 0.36, Math.cos(a) * d)
      scene.add(c)
    }

    // the platform: two marble steps and a floor
    const tex = marbleTexture('#D9D1BF', '#776D5C')
    tex.repeat.set(3, 3)
    const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, color: 0x8f887b })
    const stepMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, color: 0x9a9283 })
    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.6, 0.18, 96), stepMat)
    step1.position.y = -0.27
    const step2 = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.2, 0.18, 96), floorMat)
    step2.position.y = -0.09
    ;[step1, step2].forEach((m) => {
      m.receiveShadow = true
      scene.add(m)
    })

    // a ring of columns open to the sky, with the front left open for you
    const colMat = new THREE.MeshStandardMaterial({ map: marbleTexture('#E4DCCA', '#7C7262'), roughness: 0.5 })
    const RING = 4.3
    const COUNT = 12
    const capGeo = new THREE.BoxGeometry(0.62, 0.14, 0.62)
    const shaft = new THREE.CylinderGeometry(0.2, 0.24, 3.3, 20)
    // flutes
    const sp = shaft.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i)
      const z = sp.getZ(i)
      const a = Math.atan2(z, x)
      const k = 1 - 0.05 * Math.pow(Math.abs(Math.cos(a * 10)), 3)
      sp.setX(i, x * k)
      sp.setZ(i, z * k)
    }
    shaft.computeVertexNormals()
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2
      if (Math.cos(a) > 0.55) continue
      const g = new THREE.Group()
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.14, 24), colMat)
      base.position.y = 0.07
      const s = new THREE.Mesh(shaft, colMat)
      s.position.y = 0.14 + 1.65
      const cap = new THREE.Mesh(capGeo, colMat)
      cap.position.y = 0.14 + 3.3 + 0.07
      const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.21, 0.12, 24), colMat)
      echinus.position.y = 0.14 + 3.3 - 0.04
      g.add(base, s, echinus, cap)
      g.position.set(Math.sin(a) * RING, 0, Math.cos(a) * RING)
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
      scene.add(g)
    }
    // the architrave: a broken ring of stone over the columns behind
    const arch = new THREE.Mesh(new THREE.TorusGeometry(RING, 0.22, 6, 96, Math.PI * 1.45), colMat)
    arch.rotation.set(Math.PI / 2, 0, Math.PI * 0.275 + Math.PI / 2)
    arch.position.y = 3.65
    arch.scale.z = 0.9
    arch.castShadow = true
    scene.add(arch)

    // dust in the lamplight
    const M = 120
    const mp = new Float32Array(M * 3)
    for (let i = 0; i < M; i++) {
      mp[i * 3] = rand(-2.4, 2.4)
      mp[i * 3 + 1] = rand(0.6, 2.8)
      mp[i * 3 + 2] = rand(-2.2, 1.6)
    }
    const mg = new THREE.BufferGeometry()
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3))
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: this.glowTex, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a0 }))
    scene.add(this.motes)
  }

  private buildTable() {
    const { marble, bronze, gilt } = statueMaterials()
    const g = new THREE.Group()
    const top = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R - 0.02, 0.07, 72), marble)
    top.position.y = TABLE_H - 0.035
    const lip = new THREE.Mesh(new THREE.TorusGeometry(TABLE_R - 0.01, 0.025, 10, 72), marble)
    lip.rotation.x = Math.PI / 2
    lip.position.y = TABLE_H - 0.05
    const stem = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.32, 0), new THREE.Vector2(0.28, 0.06), new THREE.Vector2(0.12, 0.16), new THREE.Vector2(0.09, 0.4), new THREE.Vector2(0.11, 0.6), new THREE.Vector2(0.2, TABLE_H - 0.07)], 40), marble)
    g.add(top, lip, stem)

    // the oil lamp
    const lamp = new THREE.Mesh(
      new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.07, 0.005), new THREE.Vector2(0.09, 0.03), new THREE.Vector2(0.07, 0.055), new THREE.Vector2(0.025, 0.06), new THREE.Vector2(0.02, 0.08)], 32),
      bronze,
    )
    lamp.position.y = TABLE_H
    lamp.scale.set(1, 1, 0.8)
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.08, 12), bronze)
    nozzle.rotation.z = Math.PI / 2
    nozzle.position.set(0.08, TABLE_H + 0.035, 0)
    g.add(lamp, nozzle)

    // a cup at each place and a scroll left on the table
    const cupGeo = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.012, 0.03), new THREE.Vector2(0.02, 0.05), new THREE.Vector2(0.085, 0.075), new THREE.Vector2(0.08, 0.08)], 24)
    ;[Math.PI - 1.15, Math.PI, Math.PI + 1.15, 0.5].forEach((a) => {
      const cup = new THREE.Mesh(cupGeo, a === 0.5 ? gilt : bronze)
      cup.position.set(Math.sin(a) * 0.62, TABLE_H, Math.cos(a) * 0.62)
      g.add(cup)
    })
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 16), new THREE.MeshStandardMaterial({ color: 0xd9c9a0, roughness: 0.9 }))
    scroll.rotation.set(0, 0.5, Math.PI / 2)
    scroll.position.set(-0.32, TABLE_H + 0.03, 0.42)
    g.add(scroll)

    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    this.scene.add(g)
  }

  /* --------------------------------- the loop -------------------------------- */

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.clock += dt
    const t = this.clock
    const still = this.reduced

    // the lamp breathes; brighter while someone is thinking
    const flicker = still ? 1 : 0.9 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1 + 1.3)
    const busy = this.thinking !== null ? 1.15 : 1
    this.lamp.intensity = 2.4 * L * flicker * busy
    this.flame.scale.set(0.08 + 0.01 * flicker, 0.15 * flicker, 1)
    ;(this.flameGlow.material as THREE.SpriteMaterial).opacity = 0.3 * flicker * busy

    // guests rise into their seats, the speaker is lit and turns to you, the rest turn to listen
    const speaker = this.speaking !== null ? this.seats[this.speaking] : null
    this.seats.forEach((s, i) => {
      s.rise = Math.min(1, s.rise + dt * 0.9)
      const r = clamp(s.rise, 0, 1)
      const e = 1 - Math.pow(1 - r, 3)
      s.statue.root.position.y = -1.3 * (1 - e)
      s.statue.root.visible = s.rise > 0

      const isSpeaker = this.speaking === i
      const isThinking = this.thinking === i
      s.light = damp(s.light, isSpeaker ? 1 : isThinking ? 0.45 : this.speaking === null ? 0.28 : 0.1, 3, dt)
      s.spot.intensity = s.light * 14 * L
      const gm = s.glow.material as THREE.SpriteMaterial
      gm.opacity = damp(gm.opacity, isThinking ? 0.35 + 0.2 * Math.sin(t * 3) : 0, 4, dt)

      // where to look: the speaker looks at you (the camera), others look at the speaker
      let yawTarget = 0
      if (speaker && !isSpeaker) {
        const here = s.statue.root.position
        const there = speaker.statue.root.position
        const facing = s.statue.root.rotation.y
        yawTarget = clamp(Math.atan2(there.x - here.x, there.z - here.z) - facing, -0.9, 0.9)
        yawTarget = Math.atan2(Math.sin(yawTarget), Math.cos(yawTarget))
      } else if (isSpeaker) {
        const here = s.statue.root.position
        const facing = s.statue.root.rotation.y
        yawTarget = Math.atan2(this.camera.position.x - here.x, this.camera.position.z - here.z) - facing
        yawTarget = clamp(Math.atan2(Math.sin(yawTarget), Math.cos(yawTarget)), -0.8, 0.8)
      } else if (!still) {
        yawTarget = 0.25 * Math.sin(t * 0.21 + i * 2.1)
      }
      s.yaw = damp(s.yaw, yawTarget, 2.2, dt)
      s.lean = damp(s.lean, isSpeaker ? 0.12 : isThinking ? -0.04 : 0, 2.5, dt)
      s.nod = damp(s.nod, isSpeaker && !still ? 0.05 * Math.sin(t * 2.4) : isThinking ? -0.12 : 0.04, 3, dt)
      s.statue.head.rotation.y = s.yaw
      s.statue.head.rotation.x = s.nod
      s.statue.torso.rotation.x = s.lean
      s.statue.torso.rotation.y = s.yaw * 0.25
      if (!still) s.statue.torso.scale.y = 1 + 0.006 * Math.sin(t * 1.3 + i)
    })

    // a slow drift of the camera, and dust turning in the light
    this.cam.theta = damp(this.cam.theta, this.cam.targetTheta + (still ? 0 : 0.05 * Math.sin(t * 0.08)), 2, dt)
    this.placeCamera()
    if (!still) {
      this.motes.rotation.y = t * 0.02
      this.stars.rotation.y = t * 0.002
    }

    this.renderer.render(this.scene, this.camera)
    this.raf = requestAnimationFrame(this.frame)
  }
}

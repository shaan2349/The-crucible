import * as THREE from 'three'
import { marbleTexture, statueMaterials } from '../marble/statue'

/**
 * The Sanctuary in 3D: a moonlit hill above the sea. A lamplit path winds up
 * past the five places to the Temple at the top. Tapping a place flies the
 * camera up to it before the page changes. The React screen draws the name
 * plates and handles navigation; this class only draws and moves.
 */

export type PlaceId = 'temple' | 'symposium' | 'hall' | 'oracle' | 'landscape'

export interface PlaceAnchor {
  id: PlaceId
  x: number
  y: number
  visible: boolean
}

const L = Math.PI
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt))
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Height of the hill at a point: one broad summit behind, falling to the sea. */
function heightAt(x: number, z: number) {
  const summit = 7.2 * Math.exp(-(x * x) / (2 * 8.5 * 8.5) - ((z + 6) * (z + 6)) / (2 * 9.5 * 9.5))
  const shoulder = 2.2 * Math.exp(-((x - 7) * (x - 7)) / 40 - ((z - 1) * (z - 1)) / 60) + 1.8 * Math.exp(-((x + 7) * (x + 7)) / 40 - ((z - 2) * (z - 2)) / 60)
  const ripple = 0.25 * Math.sin(x * 0.7 + z * 0.3) * Math.cos(z * 0.5 - x * 0.2)
  return summit + shoulder + ripple - 0.6
}

/** Where each place stands on the hill. */
const SPOTS: Record<PlaceId, { x: number; z: number; label: number }> = {
  temple: { x: 0, z: -7, label: 3.6 },
  symposium: { x: -5.6, z: -1.6, label: 2.6 },
  hall: { x: 5.8, z: -2.2, label: 2.4 },
  oracle: { x: -4.6, z: 4.6, label: 2.2 },
  landscape: { x: 4.8, z: 4.4, label: 2.0 },
}

export class SanctuaryScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400)
  private canvas: HTMLCanvasElement
  private reduced: boolean
  private raf = 0
  private last = performance.now()
  private clock = 0
  private W = 1
  private H = 1
  private fit = 1

  private places = new Map<PlaceId, { group: THREE.Group; light: THREE.PointLight; base: number; glow: THREE.Sprite; hover: number }>()
  private hovered: PlaceId | null = null
  private live = false
  private glowTex: THREE.CanvasTexture
  private fire: { pts: THREE.Points; seed: { life: number; sx: number; sz: number; sp: number }[]; origin: THREE.Vector3 } | null = null
  private smoke: THREE.Sprite[] = []
  private lamps: THREE.Sprite[] = []
  private clouds: THREE.Sprite[] = []
  private sea!: THREE.Mesh
  private glitter!: THREE.Points
  private stars!: THREE.Points
  private windowGlow: THREE.Points | null = null
  private beam: THREE.Group | null = null
  private beamFlash: THREE.Sprite | null = null
  private boats: THREE.Group[] = []

  private orbit = { yaw: 0, targetYaw: 0, pitch: 0 }
  private flight: { from: THREE.Vector3; fromLook: THREE.Vector3; to: THREE.Vector3; toLook: THREE.Vector3; t: number; start: number; done: () => void } | null = null
  private intro = 0
  private born = performance.now()
  private dragging = false
  private lastX = 0
  private raycaster = new THREE.Raycaster()
  private onPick: (id: PlaceId) => void
  private onHover: (id: PlaceId | null) => void
  private onDown: (e: PointerEvent) => void
  private onMove: (e: PointerEvent) => void
  private onUp: (e: PointerEvent) => void
  private downX = 0
  private downY = 0

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean; temples: number; onPick: (id: PlaceId) => void; onHover?: (id: PlaceId | null) => void }) {
    this.canvas = canvas
    this.reduced = !!opts.reducedMotion
    this.onPick = opts.onPick
    this.onHover = opts.onHover ?? (() => {})
    this.intro = this.reduced ? 1 : 0
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2))
    this.renderer.shadowMap.enabled = !small
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.glowTex = this.sprite((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      gr.addColorStop(0, 'rgba(255,236,190,1)')
      gr.addColorStop(0.3, 'rgba(255,175,90,.55)')
      gr.addColorStop(1, 'rgba(255,130,50,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }, 64)

    this.scene.add(new THREE.HemisphereLight(0x8494c0, 0x1c1610, 0.8 * L))
    const moon = new THREE.DirectionalLight(0xb8c6ea, 0.85 * L)
    moon.position.set(14, 22, -30)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 })
    moon.shadow.bias = -0.0008
    this.scene.add(moon)
    const fill = new THREE.DirectionalLight(0x8090c0, 0.25 * L)
    fill.position.set(-10, 8, 20)
    this.scene.add(fill)

    this.buildSky()
    this.buildLand()
    this.buildPath()
    this.buildVillage()
    this.buildDistance()
    this.buildPlaces(opts.temples)

    this.onDown = (e) => {
      this.dragging = true
      this.lastX = e.clientX
      this.downX = e.clientX
      this.downY = e.clientY
    }
    this.onMove = (e) => {
      if (this.dragging && !this.flight) {
        this.orbit.targetYaw = clamp(this.orbit.targetYaw - (e.clientX - this.lastX) * 0.003, -0.45, 0.45)
        this.lastX = e.clientX
      }
      if (e.pointerType === 'mouse') {
        const id = this.pick(e)
        if (id !== this.hovered) {
          this.hovered = id
          this.onHover(id)
        }
        canvas.style.cursor = id ? 'pointer' : 'grab'
        const r = canvas.getBoundingClientRect()
        if (!this.reduced) this.orbit.pitch = ((e.clientY - r.top) / r.height - 0.5) * -0.08
      }
    }
    this.onUp = (e) => {
      this.dragging = false
      if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) < 8) {
        const id = this.pick(e)
        if (id) this.onPick(id)
      }
    }
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', () => (this.dragging = false))

    this.raf = requestAnimationFrame(this.frame)
  }

  /* ------------------------------- public API ------------------------------- */

  setLive(live: boolean) {
    this.live = live
  }

  setHover(id: PlaceId | null) {
    this.hovered = id
  }

  /** Flies up to a place, then calls `done` (the screen navigates there). */
  flyTo(id: PlaceId, done: () => void) {
    if (this.flight) return
    const s = SPOTS[id]
    const y = heightAt(s.x, s.z)
    const look = new THREE.Vector3(s.x, y + 1.0, s.z)
    const dir = new THREE.Vector3().subVectors(this.camera.position, look).normalize()
    const to = look.clone().addScaledVector(dir, id === 'temple' ? 5.5 : 4).add(new THREE.Vector3(0, 0.6, 0))
    if (this.reduced) {
      done()
      return
    }
    this.flight = { from: this.camera.position.clone(), fromLook: this.currentLook(), to, toLook: look, t: 0, start: performance.now(), done }
  }

  anchors(): PlaceAnchor[] {
    const v = new THREE.Vector3()
    return (Object.keys(SPOTS) as PlaceId[]).map((id) => {
      const s = SPOTS[id]
      v.set(s.x, heightAt(s.x, s.z) + s.label, s.z).project(this.camera)
      return { id, x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H, visible: v.z < 1 && this.intro > 0.6 && !this.flight }
    })
  }

  resize(w: number, h: number) {
    this.W = Math.max(1, w)
    this.H = Math.max(1, h)
    this.renderer.setSize(this.W, this.H, false)
    this.camera.aspect = this.W / this.H
    this.fit = clamp(1.35 / this.camera.aspect, 0.85, 2.4)
    this.camera.fov = this.camera.aspect < 1 ? 50 : 38
    this.restLook.set(0, this.camera.aspect < 1 ? 2.6 : 4.7, this.camera.aspect < 1 ? -1.6 : -2.4)
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    this.renderer.dispose()
  }

  /* --------------------------------- camera --------------------------------- */

  private restPosition(out: THREE.Vector3) {
    // wide screens look across the hill to the sea; tall ones look down on it so the places spread down the screen
    const tall = clamp((this.fit - 1) / 1.4, 0, 1)
    const r = 22 + 12 * tall
    const yaw = this.orbit.yaw
    return out.set(Math.sin(yaw) * r, 11 + 18 * tall + this.orbit.pitch * 10, Math.cos(yaw) * r + 2 - 4 * tall)
  }

  private restLook = new THREE.Vector3(0, 4.2, -2)
  private currentLook() {
    return this.lookNow.clone()
  }
  private lookNow = new THREE.Vector3(0, 3.0, -1.5)

  /* --------------------------------- picking -------------------------------- */

  private pick(e: PointerEvent): PlaceId | null {
    const r = this.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    const groups = [...this.places.values()].map((p) => p.group)
    const hit = this.raycaster.intersectObjects(groups, true)[0]
    let o: THREE.Object3D | null = hit?.object ?? null
    while (o && !o.userData.place) o = o.parent
    return (o?.userData.place as PlaceId) ?? null
  }

  /* -------------------------------- building -------------------------------- */

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
    const HORIZON = new THREE.Color(0x1a2333)
    scene.fog = new THREE.FogExp2(HORIZON.getHex(), 0.012)
    scene.background = HORIZON.clone()
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 40, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(0x04060a) }, mid: { value: new THREE.Color(0x0c1320) }, low: { value: new THREE.Color(0x283450) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(low, mid, smoothstep(-0.02, 0.14, h)); c = mix(c, top, smoothstep(0.14, 0.7, h)); gl_FragColor = vec4(c, 1.0); }',
      }),
    )
    sky.renderOrder = -2
    scene.add(sky)

    const n = 1100
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = rand(0, Math.PI * 2)
      const ph = rand(0.04, 1.35)
      pos[i * 3] = 180 * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = 180 * Math.cos(ph) + 6
      pos[i * 3 + 2] = 180 * Math.sin(ph) * Math.sin(th)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xede6d6, size: 0.5, transparent: true, opacity: 0.9, fog: false }))
    scene.add(this.stars)

    const moonPos = new THREE.Vector3(30, 34, -150)
    const moon = new THREE.Mesh(new THREE.SphereGeometry(5.5, 40, 40), new THREE.MeshBasicMaterial({ color: 0xf2e9d3, fog: false }))
    moon.position.copy(moonPos)
    scene.add(moon)
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sprite((g, s) => {
          const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
          gr.addColorStop(0, 'rgba(241,232,210,.55)')
          gr.addColorStop(0.22, 'rgba(241,232,210,.14)')
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
    halo.scale.set(70, 70, 1)
    scene.add(halo)

    const cloudTex = this.sprite((g, s) => {
      for (let i = 0; i < 24; i++) {
        const x = rand(s * 0.15, s * 0.85)
        const y = rand(s * 0.4, s * 0.6)
        const r = rand(s * 0.07, s * 0.18)
        const gr = g.createRadialGradient(x, y, 0, x, y, r)
        gr.addColorStop(0, 'rgba(200,210,235,.2)')
        gr.addColorStop(1, 'rgba(200,210,235,0)')
        g.fillStyle = gr
        g.fillRect(0, 0, s, s)
      }
    }, 256)
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: rand(0.35, 0.6), depthWrite: false, fog: false }))
      c.position.set(rand(-90, 90), rand(26, 44), rand(-150, -110))
      c.scale.set(rand(50, 80), rand(10, 16), 1)
      scene.add(c)
      this.clouds.push(c)
    }
  }

  private buildLand() {
    const scene = this.scene
    // the hill
    const geo = new THREE.PlaneGeometry(90, 90, 180, 180)
    geo.rotateX(-Math.PI / 2)
    const p = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(p.count * 3)
    const grass = new THREE.Color(0x2a3426)
    const rock = new THREE.Color(0x3c3b3a)
    const shore = new THREE.Color(0x2b2820)
    const tmp = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const h = heightAt(x, z)
      p.setY(i, h)
      const n = 0.5 + 0.5 * Math.sin(x * 1.7) * Math.cos(z * 1.3)
      tmp.copy(grass).lerp(rock, clamp((h - 4) / 4, 0, 0.7) * 0.6 + n * 0.15)
      if (h < 0.1) tmp.lerp(shore, 0.6)
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
    land.receiveShadow = true
    scene.add(land)

    // the sea, with the moon's path on it
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x0c1422, roughness: 0.35, metalness: 0.4 }))
    this.sea.rotation.x = -Math.PI / 2
    this.sea.position.y = -0.35
    scene.add(this.sea)
    const G = 500
    const gp = new Float32Array(G * 3)
    for (let i = 0; i < G; i++) {
      const t = Math.pow(Math.random(), 1.4)
      gp[i * 3] = 30 * t * 0.2 + rand(-1, 1) * (1 + t * 9) + 18 * t
      gp[i * 3 + 1] = -0.3
      gp[i * 3 + 2] = -40 - t * 100
    }
    const gg = new THREE.BufferGeometry()
    gg.setAttribute('position', new THREE.BufferAttribute(gp, 3))
    this.glitter = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xf1e8d2, size: 0.45, transparent: true, opacity: 0.6, depthWrite: false }))
    scene.add(this.glitter)

    // distant headlands
    const far = new THREE.MeshStandardMaterial({ color: 0x121a28, roughness: 1 })
    ;[
      [-70, -95, 26, 0.35],
      [-30, -120, 20, 0.28],
      [55, -105, 30, 0.3],
      [95, -70, 22, 0.32],
      [-95, -50, 20, 0.3],
    ].forEach(([x, z, r, sy]) => {
      const h = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), far)
      h.position.set(x, -0.6, z)
      h.scale.y = sy
      scene.add(h)
    })

    // cypresses
    const cyp = new THREE.MeshStandardMaterial({ color: 0x0c1510, roughness: 1 })
    const avoid = Object.values(SPOTS)
    for (let i = 0; i < 70; i++) {
      const x = rand(-16, 16)
      const z = rand(-16, 12)
      if (avoid.some((s) => Math.hypot(s.x - x, s.z - z) < 2.6)) continue
      if (Math.abs(x - pathX(z)) < 1.3) continue
      const h = heightAt(x, z)
      if (h < 0.5) continue
      const tall = rand(1.1, 2.4)
      const c = new THREE.Mesh(new THREE.ConeGeometry(tall * 0.16, tall, 8), cyp)
      c.position.set(x, h + tall / 2 - 0.05, z)
      c.castShadow = true
      scene.add(c)
    }
  }

  /**
   * What lies beyond the hill: the Milky Way across the sky, islands in the
   * bay (the nearest with its own small lit village, another with a ruined
   * temple on its cliff, echoing the one on this hill), and a lighthouse on
   * a rocky point whose beam sweeps the water.
   */
  private buildDistance() {
    const scene = this.scene
    let seed = 99
    const r = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const gauss = () => (r() + r() + r() - 1.5) / 1.5

    // the Milky Way: a dense band of faint stars along one great circle, with soft clouds of light
    // the band rises diagonally across the sky you look out at, over the sea
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3(-0.9, 0.08, -0.42), new THREE.Vector3(0.45, 0.28, -0.85)).normalize()
    const u = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize()
    const v = new THREE.Vector3().crossVectors(n, u).normalize()
    const R = 172
    const pos: number[] = []
    const col: number[] = []
    const c = new THREE.Color()
    const p = new THREE.Vector3()
    for (let i = 0; i < 5200; i++) {
      const a = r() * Math.PI * 2
      p.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)).addScaledVector(n, gauss() * 0.16).normalize().multiplyScalar(R)
      if (p.y < 6) continue
      pos.push(p.x, p.y, p.z)
      c.setHSL(r() < 0.5 ? 0.6 : 0.1, 0.3, 0.7 + r() * 0.25)
      col.push(c.r, c.g, c.b)
    }
    const mg = new THREE.BufferGeometry()
    mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    mg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    scene.add(new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, opacity: 0.9, fog: false, depthWrite: false })))
    const haze = this.sprite((g, s) => {
      for (let i = 0; i < 14; i++) {
        const x = s * (0.2 + r() * 0.6)
        const y = s * (0.35 + r() * 0.3)
        const rr = s * (0.1 + r() * 0.2)
        const gr = g.createRadialGradient(x, y, 0, x, y, rr)
        gr.addColorStop(0, 'rgba(190,200,235,.16)')
        gr.addColorStop(1, 'rgba(190,200,235,0)')
        g.fillStyle = gr
        g.fillRect(0, 0, s, s)
      }
    }, 256)
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2
      p.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)).normalize().multiplyScalar(R - 4)
      if (p.y < 6) continue
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haze, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, rotation: r() * 6 }))
      sp.position.copy(p)
      sp.scale.set(46, 46, 1)
      scene.add(sp)
    }

    // islands: rocky mounds rising from the sea
    const rock = new THREE.MeshStandardMaterial({ color: 0x232a36, roughness: 1, flatShading: true })
    const island = (x: number, z: number, rad: number, h: number, cliff = 0) => {
      const prof = (dx: number, dz: number) => {
        const d = Math.hypot(dx, dz) / rad
        const towardCam = cliff ? Math.max(0, dz / rad) : 0
        return h * Math.max(0, 1 - Math.pow(d, 1.6 - cliff * towardCam)) - 0.6
      }
      const g = new THREE.PlaneGeometry(rad * 2.4, rad * 2.4, 48, 48)
      g.rotateX(-Math.PI / 2)
      const pa = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pa.count; i++) {
        const dx = pa.getX(i)
        const dz = pa.getZ(i)
        pa.setY(i, Math.max(-1, prof(dx, dz) + (r() - 0.5) * h * 0.08))
      }
      g.computeVertexNormals()
      const m = new THREE.Mesh(g, rock)
      m.position.set(x, -0.35, z)
      scene.add(m)
      return (dx: number, dz: number) => prof(dx, dz) - 0.35
    }

    // the near island, with a village of lit windows on the slope facing the hill
    const vx = -44
    const vz = -62
    const vh = island(vx, vz, 11, 7)
    const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xbdb8ad, roughness: 1 }), 60)
    const dummy = new THREE.Object3D()
    const lights: number[] = []
    let hi = 0
    for (let k = 0; k < 300 && hi < 60; k++) {
      const a = Math.PI * (0.15 + r() * 0.7)
      const d = 2 + r() * 7
      const dx = Math.cos(a) * d * 1.1
      const dz = Math.sin(a) * d
      const y = vh(dx, dz)
      if (y < 0.3) continue
      dummy.position.set(vx + dx, y + 0.3, vz + dz)
      dummy.rotation.set(0, (r() - 0.5) * 0.6, 0)
      dummy.scale.set(0.45 + r() * 0.3, 0.4 + r() * 0.2, 0.45)
      dummy.updateMatrix()
      houses.setMatrixAt(hi++, dummy.matrix)
      if (r() < 0.7) lights.push(vx + dx, y + 0.35, vz + dz + 0.4)
    }
    houses.count = hi
    scene.add(houses)
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3))
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ map: this.glowTex, size: 0.9, transparent: true, opacity: 0.9, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: 0xffb35a })))

    // the far island with a ruined temple on its cliff, against the moon's path on the water
    const tx = 36
    const tz = -76
    const th = island(tx, tz, 12, 9, 0.9)
    const marble = new THREE.MeshStandardMaterial({ map: marbleTexture('#D9D1BF', '#776D5C'), roughness: 0.7 })
    const top = th(0, 0)
    const ruin = new THREE.Group()
    const heights = [3.2, 3.2, 1.6, 3.2, 0.9, 2.4, 3.2]
    heights.forEach((h, i) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, h, 12), marble)
      col.position.set(-3.6 + i * 1.2, h / 2, 1.2)
      ruin.add(col)
    })
    const back = [3.2, 2.0, 3.2]
    back.forEach((h, i) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, h, 12), marble)
      col.position.set(-3.6 + i * 1.2, h / 2, -1.2)
      ruin.add(col)
    })
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.45, 0.7), marble)
    lintel.position.set(-3.0, 3.42, 1.2)
    const lintel2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.7), marble)
    lintel2.position.set(3.0, 3.42, 1.2)
    const base = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.4, 3.6), marble)
    base.position.y = -0.2
    ruin.add(lintel, lintel2, base)
    ruin.position.set(tx, top, tz)
    ruin.rotation.y = -0.2
    scene.add(ruin)

    // a third island, furthest out, only a shape in the haze
    island(-62, -95, 16, 8)
    island(58, -42, 7, 3.5)

    // mountains of the mainland along the far horizon, paler with distance
    ;[
      { d: 150, h: 9, c: 0x18202e },
      { d: 175, h: 15, c: 0x1b2433 },
    ].forEach((ring, ri) => {
      const pts: THREE.Vector2[] = []
      const g = new THREE.BufferGeometry()
      const verts: number[] = []
      const segs = 120
      for (let i = 0; i <= segs; i++) {
        const a = -Math.PI * 0.95 + (i / segs) * Math.PI * 0.9
        const hgt = ring.h * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.21 + ri) * Math.sin(i * 0.07 + 2 * ri))) * (0.8 + 0.2 * r())
        const x = Math.cos(a) * ring.d
        const z = Math.sin(a) * ring.d
        verts.push(x, -1, z, x, hgt, z)
        pts.push(new THREE.Vector2(x, z))
      }
      const idx: number[] = []
      for (let i = 0; i < segs; i++) {
        const a = i * 2
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
      g.setIndex(idx)
      const mtn = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: ring.c, side: THREE.DoubleSide, fog: false }))
      mtn.renderOrder = -1
      scene.add(mtn)
    })

    // the lighthouse on a rocky point, its beam sweeping the bay
    const lx = -18
    const lz = -26
    const lth = island(lx, lz, 4, 2.6)
    const ly = lth(0, 0)
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e3d8, roughness: 0.8 })
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 3.6, 20), white)
    tower.position.set(lx, ly + 1.8, lz)
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x2b2b30 }))
    gallery.position.set(lx, ly + 3.65, lz)
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.6, 16), new THREE.MeshBasicMaterial({ color: 0xffe6b0 }))
    lamp.position.set(lx, ly + 4.0, lz)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x3a2f2a }))
    roof.position.set(lx, ly + 4.55, lz)
    const house = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.9), white)
    house.position.set(lx + 1.1, ly + 0.4, lz + 0.4)
    scene.add(tower, gallery, lamp, roof, house)
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {},
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float vY; void main(){ float t = clamp((vY + 20.0) / 40.0, 0.0, 1.0); gl_FragColor = vec4(1.0, 0.92, 0.72, 0.22 * t * t); }',
    })
    const beam = new THREE.Group()
    ;[0, Math.PI].forEach((rot) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 40, 24, 1, true), beamMat)
      cone.position.x = 20
      cone.rotation.z = Math.PI / 2
      const arm = new THREE.Group()
      arm.rotation.y = rot
      arm.add(cone)
      beam.add(arm)
    })
    beam.position.set(lx, ly + 4.0, lz)
    beam.rotation.z = -0.04
    scene.add(beam)
    this.beam = beam
    this.beamFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: 0xffe2a8 }))
    this.beamFlash.position.set(lx, ly + 4.0, lz)
    this.beamFlash.scale.set(3, 3, 1)
    scene.add(this.beamFlash)
  }

  /**
   * A whitewashed village on the lower slopes: flat-roofed houses with lit
   * windows, a few blue domes, a church with a bell tower, olive trees, and
   * fishing boats with lanterns in the bay below. Built with instancing so
   * dozens of houses cost only a handful of draw calls.
   */
  private buildVillage() {
    const clusters = [
      { x: -9.5, z: 8.5, r: 3.4, n: 26 },
      { x: 9.8, z: 7.6, r: 3.2, n: 24 },
      { x: -2.2, z: 11.8, r: 2.6, n: 16 },
      { x: 3.6, z: 12.4, r: 2.4, n: 12 },
      { x: 13.6, z: 1.5, r: 2.2, n: 10 },
    ]
    const spots = Object.values(SPOTS)
    const houses: { x: number; z: number; w: number; d: number; h: number; rot: number; y: number }[] = []
    let seed = 7
    const r = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (const c of clusters) {
      for (let tries = 0; tries < c.n * 12 && houses.filter((h) => Math.hypot(h.x - c.x, h.z - c.z) < c.r + 0.5).length < c.n; tries++) {
        const a = r() * Math.PI * 2
        const d = Math.sqrt(r()) * c.r
        const x = c.x + Math.cos(a) * d
        const z = c.z + Math.sin(a) * d
        const w = 0.42 + r() * 0.34
        const dd = 0.4 + r() * 0.3
        if (Math.abs(x - pathX(z)) < 1.0) continue
        if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.3)) continue
        if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < (h.w + w) * 0.62)) continue
        const corners = [heightAt(x - w / 2, z - dd / 2), heightAt(x + w / 2, z - dd / 2), heightAt(x - w / 2, z + dd / 2), heightAt(x + w / 2, z + dd / 2)]
        const lo = Math.min(...corners)
        const hi = Math.max(...corners)
        if (lo < 0.02 || hi - lo > 0.9) continue
        houses.push({ x, z, w, d: dd, h: 0.34 + r() * 0.3 + (hi - lo), rot: (r() - 0.5) * 0.5, y: lo })
      }
    }
    // the church: the biggest house in the western cluster gets a dome and a bell tower
    const church = houses.reduce((best, h, i) => (h.x < 0 && h.w * h.d > houses[best].w * houses[best].d ? i : best), 0)
    houses[church].w = 0.85
    houses[church].d = 0.65
    houses[church].h += 0.15

    const n = houses.length
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe4dfd3, roughness: 0.9 })
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xcfc9bb, roughness: 0.95 })
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x2f5592, roughness: 0.5, metalness: 0.1 })
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffb45e })
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x1a1b22 })
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMat, n)
    const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), roofMat, n)
    const domes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, n)
    const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), winMat, n * 3)
    const doors = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), darkMat, n)
    walls.castShadow = walls.receiveShadow = roofs.castShadow = domes.castShadow = true
    const m = new THREE.Object3D()
    const base = new THREE.Object3D()
    const glowPos: number[] = []
    let wi = 0
    let di = 0
    houses.forEach((h, i) => {
      base.position.set(h.x, h.y, h.z)
      base.rotation.set(0, h.rot, 0)
      base.updateMatrix()
      const put = (mesh: THREE.InstancedMesh, idx: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        m.position.set(x, y, z)
        m.rotation.set(0, 0, 0)
        m.scale.set(sx, sy, sz)
        m.updateMatrix()
        m.matrix.premultiply(base.matrix)
        mesh.setMatrixAt(idx, m.matrix)
      }
      put(walls, i, 0, h.h / 2 - 0.05, 0, h.w, h.h + 0.1, h.d)
      put(roofs, i, 0, h.h + 0.03, 0, h.w + 0.06, 0.06, h.d + 0.06)
      const domed = i === church || r() < 0.12
      if (domed) {
        const dr = i === church ? 0.26 : Math.min(h.w, h.d) * 0.3
        put(domes, di++, i === church ? -0.12 : 0, h.h + 0.06, 0, dr, dr * 1.1, dr)
      }
      // a door and one to three windows on the side facing the bay
      put(doors, i, (r() - 0.5) * h.w * 0.5, 0.12, h.d / 2 + 0.002, 0.11, 0.2, 1)
      const count = 1 + Math.floor(r() * 3)
      for (let k = 0; k < count && wi < n * 3; k++) {
        const lit = r() < 0.55
        const wx = (k - (count - 1) / 2) * (h.w / (count + 0.5))
        const wy = Math.min(h.h - 0.12, 0.3 + (r() < 0.3 ? 0.18 : 0))
        put(wins, wi++, wx, wy, h.d / 2 + 0.003, 0.07, 0.09, 1)
        if (lit) {
          const v = new THREE.Vector3(wx, wy, h.d / 2 + 0.05).applyMatrix4(base.matrix)
          glowPos.push(v.x, v.y, v.z)
        } else {
          wins.setColorAt(wi - 1, new THREE.Color(0x2a2a33))
        }
      }
    })
    // the bell tower beside the church
    const ch = houses[church]
    const tower = new THREE.Group()
    const tw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), wallMat)
    tw.position.y = 0.375
    const arch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), darkMat)
    arch.position.set(0, 0.58, 0.121)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat)
    cap.position.y = 0.75
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.14, 0.015), statueMaterials().gilt)
    cross.position.y = 0.94
    tower.add(tw, arch, cap, cross)
    tower.position.set(ch.x + Math.cos(ch.rot) * (ch.w / 2 + 0.16), ch.y + ch.h - 0.05, ch.z - Math.sin(ch.rot) * (ch.w / 2 + 0.16))
    tower.rotation.y = ch.rot
    tower.traverse((o) => ((o as THREE.Mesh).castShadow = true))
    this.scene.add(tower)

    domes.count = di
    wins.count = wi
    if (wins.instanceColor) wins.instanceColor.needsUpdate = true
    this.scene.add(walls, roofs, domes, wins, doors)

    // a soft warm glow over each lit window, and a little light spilling into the lanes
    const gg = new THREE.BufferGeometry()
    gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3))
    this.windowGlow = new THREE.Points(gg, new THREE.PointsMaterial({ map: this.glowTex, size: 0.42, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb060 }))
    this.scene.add(this.windowGlow)
    for (const c of clusters.slice(0, 4)) {
      const l = new THREE.PointLight(0xffa860, 0.9 * L, 4.5, 1.8)
      l.position.set(c.x, heightAt(c.x, c.z) + 1.2, c.z + 0.6)
      this.scene.add(l)
    }

    // olive trees between the houses
    const olives = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x323d2a, roughness: 1, flatShading: true }), 90)
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.035, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 1 }), 90)
    let oi = 0
    for (let k = 0; k < 400 && oi < 90; k++) {
      const c = clusters[k % clusters.length]
      const a = r() * Math.PI * 2
      const d = c.r * (0.6 + r() * 0.9)
      const x = c.x + Math.cos(a) * d
      const z = c.z + Math.sin(a) * d
      const y = heightAt(x, z)
      if (y < 0.05 || Math.abs(x - pathX(z)) < 0.8 || houses.some((h) => Math.hypot(h.x - x, h.z - z) < 0.55) || spots.some((s) => Math.hypot(s.x - x, s.z - z) < 2.8)) continue
      const sz = 0.16 + r() * 0.12
      m.rotation.set(0, r() * 6, 0)
      m.position.set(x, y + 0.28 + sz * 0.5, z)
      m.scale.set(sz * 1.3, sz, sz * 1.3)
      m.updateMatrix()
      olives.setMatrixAt(oi, m.matrix)
      m.position.set(x, y + 0.15, z)
      m.scale.set(1, 1, 1)
      m.updateMatrix()
      trunks.setMatrixAt(oi, m.matrix)
      oi++
    }
    olives.count = trunks.count = oi
    olives.castShadow = true
    this.scene.add(olives, trunks)

    // fishing boats in the bay, a lantern on each
    const hull = new THREE.MeshStandardMaterial({ color: 0x3a5f8a, roughness: 0.8 })
    const lantern: number[] = []
    ;[
      [-4.5, 17.5, 0.3],
      [-1.2, 19, -0.4],
      [5.5, 17.8, 0.8],
      [15.5, 9, 1.2],
      [-14, 14, -0.6],
    ].forEach(([x, z, rot]) => {
      const b = new THREE.Group()
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.7, 10, 1, false, 0, Math.PI), hull)
      body.rotation.set(Math.PI / 2, 0, Math.PI)
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), new THREE.MeshStandardMaterial({ color: 0x5a4a38 }))
      mast.position.y = 0.3
      b.add(body, mast)
      b.position.set(x, -0.3, z)
      b.rotation.y = rot
      this.scene.add(b)
      this.boats.push(b)
      lantern.push(x, 0.08, z)
    })
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lantern, 3))
    this.scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ map: this.glowTex, size: 0.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc070 })))
  }

  private buildPath() {
    const pts: THREE.Vector3[] = []
    for (let z = 13; z >= -5.2; z -= 0.25) pts.push(new THREE.Vector3(pathX(z), 0, z))
    // a flat ribbon of pale stone laid on the hill
    const W = 0.42
    const verts: number[] = []
    const idx: number[] = []
    pts.forEach((p, i) => {
      const next = pts[Math.min(i + 1, pts.length - 1)]
      const prev = pts[Math.max(i - 1, 0)]
      const dir = new THREE.Vector3().subVectors(next, prev).setY(0).normalize()
      const side = new THREE.Vector3(-dir.z, 0, dir.x)
      for (const s of [-1, 1]) {
        const x = p.x + side.x * W * s
        const z = p.z + side.z * W * s
        verts.push(x, heightAt(x, z) + 0.04, z)
      }
      if (i < pts.length - 1) {
        const a = i * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    const path = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6a6252, roughness: 0.95, side: THREE.DoubleSide }))
    path.receiveShadow = true
    this.scene.add(path)
    // little lamps along it
    for (let z = 12; z >= -4.5; z -= 1.7) {
      const s = (Math.round(z * 10) % 2 === 0 ? 1 : -1) * 0.65
      const x = pathX(z) + s
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc68a }))
      lamp.position.set(x, heightAt(x, z) + 0.35, z)
      lamp.scale.set(0.45, 0.45, 1)
      this.scene.add(lamp)
      this.lamps.push(lamp)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.32, 6), statueMaterials().bronze)
      post.position.set(x, heightAt(x, z) + 0.16, z)
      this.scene.add(post)
    }
  }

  private buildPlaces(temples: number) {
    const tex = marbleTexture('#E6DECC', '#7C7262')
    const marble = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
    const roofMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, color: 0xb9b09f })
    const warm = new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff9a40, emissiveIntensity: 1.1, roughness: 1 })
    const { bronze } = statueMaterials()

    const column = (h: number, r: number) => {
      const g = new THREE.CylinderGeometry(r * 0.88, r, h, 14)
      return g
    }
    const place = (id: PlaceId, group: THREE.Group, lightY: number, lightPower: number, padR = 1.9) => {
      const s = SPOTS[id]
      const y = heightAt(s.x, s.z)
      // a level stone base so the building sits on the slope
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(padR, padR + 0.2, 1.2, 40), new THREE.MeshStandardMaterial({ color: 0x4a463f, roughness: 1 }))
      pad.position.y = -0.62
      group.add(pad)
      group.position.set(s.x, y, s.z)
      group.rotation.y = Math.atan2(-s.x * 0.4, 14 - s.z) * 0.6
      group.userData.place = id
      group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
      this.scene.add(group)
      const light = new THREE.PointLight(0xffa860, lightPower * L, 6, 1.8)
      light.position.set(s.x, y + lightY, s.z + 0.6)
      this.scene.add(light)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }))
      glow.position.set(s.x, y + lightY, s.z + 0.4)
      glow.scale.set(3.2, 3.2, 1)
      this.scene.add(glow)
      this.places.set(id, { group, light, base: lightPower, glow, hover: 0 })
    }

    // The Temple: steps, six columns across the front, a pediment, a warm cella
    {
      const g = new THREE.Group()
      const steps = [
        [3.4, 0.18, 2.4],
        [3.15, 0.18, 2.2],
        [2.9, 0.18, 2.0],
      ]
      steps.forEach(([w, h, d], i) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w * 2, h, d * 2), marble)
        m.position.y = h / 2 + i * h
        g.add(m)
      })
      const top = 0.54
      const colH = 2.2
      const cg = column(colH, 0.17)
      for (let i = 0; i < 6; i++) {
        for (const z of [1.6, -1.6]) {
          const c = new THREE.Mesh(cg, marble)
          c.position.set(-2.4 + i * 0.96, top + colH / 2, z)
          g.add(c)
        }
      }
      for (const x of [-2.4, 2.4]) {
        for (const z of [-0.55, 0.55]) {
          const c = new THREE.Mesh(cg, marble)
          c.position.set(x, top + colH / 2, z)
          g.add(c)
        }
      }
      const cella = new THREE.Mesh(new THREE.BoxGeometry(3.4, colH * 0.9, 2.2), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 }))
      cella.position.set(0, top + colH * 0.45, -0.1)
      g.add(cella)
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), warm)
      door.position.set(0, top + 0.75, 1.01)
      g.add(door)
      const arch = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.36, 3.6), marble)
      arch.position.y = top + colH + 0.18
      g.add(arch)
      const ped = new THREE.Shape()
      ped.moveTo(-2.75, 0)
      ped.lineTo(2.75, 0)
      ped.lineTo(0, 0.85)
      ped.lineTo(-2.75, 0)
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(ped, { depth: 3.7, bevelEnabled: false }), roofMat)
      roof.position.set(0, top + colH + 0.36, -1.85)
      g.add(roof)
      place('temple', g, 1.4, 2.2, 4.0)
    }

    // The Symposium: a round tholos with a conical roof and a lamp inside
    {
      const g = new THREE.Group()
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.3, 40), marble)
      base.position.y = 0.15
      g.add(base)
      const cg = column(1.6, 0.11)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        const c = new THREE.Mesh(cg, marble)
        c.position.set(Math.sin(a) * 1.2, 0.3 + 0.8, Math.cos(a) * 1.2)
        g.add(c)
      }
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.22, 40), marble)
      ring.position.y = 0.3 + 1.6 + 0.11
      g.add(ring)
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.8, 40), roofMat)
      cone.position.y = 0.3 + 1.6 + 0.22 + 0.4
      g.add(cone)
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24), marble)
      table.position.y = 0.75
      g.add(table)
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), warm)
      flame.position.y = 0.85
      g.add(flame)
      place('symposium', g, 1.0, 1.6)
    }

    // The Hall of Minds: a long stoa, a colonnade under a roof
    {
      const g = new THREE.Group()
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 1.8), marble)
      base.position.y = 0.15
      g.add(base)
      const back = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x4e4236, roughness: 0.9 }))
      back.position.set(0, 1.1, -0.7)
      g.add(back)
      for (let i = 0; i < 7; i++) {
        const niche = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.6), warm)
        niche.position.set(-1.65 + i * 0.55, 1.05, -0.59)
        g.add(niche)
      }
      const cg = column(1.6, 0.1)
      for (let i = 0; i < 8; i++) {
        const c = new THREE.Mesh(cg, marble)
        c.position.set(-1.85 + i * 0.53, 0.3 + 0.8, 0.65)
        g.add(c)
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 1.9), roofMat)
      roof.position.y = 0.3 + 1.6 + 0.11
      g.add(roof)
      place('hall', g, 1.1, 1.4, 2.4)
    }

    // The Oracle: a bronze tripod on a rock, fire and smoke rising
    {
      const g = new THREE.Group()
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: 0x35322e, roughness: 1, flatShading: true }))
      rock.scale.set(1.3, 0.45, 1.1)
      rock.position.y = 0.15
      g.add(rock)
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.4, 6), bronze)
        leg.position.set(Math.cos(a) * 0.25, 1.05, Math.sin(a) * 0.25)
        leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2)
        g.add(leg)
      }
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze)
      bowl.position.y = 1.75
      g.add(bowl)
      place('oracle', g, 2.0, 2.0)
      // fire
      const s = SPOTS.oracle
      const origin = new THREE.Vector3(s.x, heightAt(s.x, s.z) + 1.78, s.z)
      const count = 60
      const pos = new Float32Array(count * 3)
      const seed = Array.from({ length: count }, () => ({ life: rand(0, 1), sx: rand(-0.14, 0.14), sz: rand(-0.14, 0.14), sp: rand(0.7, 1.3) }))
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: this.glowTex, size: 0.45, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb066 }))
      this.scene.add(pts)
      this.fire = { pts, seed, origin }
      const smokeTex = this.sprite((g2, sz) => {
        const gr = g2.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2)
        gr.addColorStop(0, 'rgba(190,195,210,.35)')
        gr.addColorStop(1, 'rgba(190,195,210,0)')
        g2.fillStyle = gr
        g2.fillRect(0, 0, sz, sz)
      }, 64)
      for (let i = 0; i < 8; i++) {
        const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }))
        sm.userData.phase = i / 8
        this.scene.add(sm)
        this.smoke.push(sm)
      }
    }

    // Your Landscape: a cluster of small temples, one for each belief you have tested (ghosts until you have)
    {
      const g = new THREE.Group()
      const n = clamp(temples, 0, 7)
      const shown = Math.max(3, n)
      const ghost = new THREE.MeshStandardMaterial({ color: 0x9a9384, roughness: 0.8, transparent: true, opacity: 0.35 })
      for (let i = 0; i < shown; i++) {
        const real = i < n
        const mat = real ? marble : ghost
        const t = new THREE.Group()
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.6), mat)
        base.position.y = 0.06
        t.add(base)
        for (let k = 0; k < 4; k++) {
          const c = new THREE.Mesh(column(0.55, 0.05), mat)
          c.position.set(-0.33 + k * 0.22, 0.12 + 0.275, 0.18)
          t.add(c)
        }
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.28, 4), mat)
        roof.rotation.y = Math.PI / 4
        roof.scale.set(1, 1, 0.6)
        roof.position.y = 0.12 + 0.55 + 0.14
        t.add(roof)
        const a = (i / shown) * Math.PI * 1.2 - Math.PI * 0.6
        const r = i === 0 ? 0 : 1.0 + (i % 2) * 0.35
        t.position.set(Math.sin(a) * r, 0, Math.cos(a) * r * 0.6 - (i === 0 ? 0.2 : 0))
        t.scale.setScalar(i === 0 ? 1.25 : 1)
        g.add(t)
      }
      place('landscape', g, 0.8, n ? 1.2 : 0.6)
    }
  }

  /* --------------------------------- the loop -------------------------------- */

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.clock += dt
    const t = this.clock
    const still = this.reduced

    // arrival: the camera settles in from higher up as the lamps come on
    this.intro = this.reduced ? 1 : Math.min(1, (now - this.born) / 2400)
    const arrive = ease(this.intro)

    this.orbit.yaw = damp(this.orbit.yaw, this.orbit.targetYaw + (still ? 0 : 0.06 * Math.sin(t * 0.07)), 2, dt)
    const rest = this.restPosition(new THREE.Vector3())
    rest.y += (1 - arrive) * 6
    rest.z += (1 - arrive) * 6

    if (this.flight) {
      const f = this.flight
      f.t = Math.min(1, (now - f.start) / 1100)
      const e = ease(f.t)
      this.camera.position.lerpVectors(f.from, f.to, e)
      this.lookNow.lerpVectors(f.fromLook, f.toLook, e)
      if (f.t >= 1) {
        const done = f.done
        this.flight = null
        done()
      }
    } else {
      this.camera.position.copy(rest)
      this.lookNow.copy(this.restLook)
    }
    this.camera.lookAt(this.lookNow)

    // the places glow; the hovered one brighter, the temple gold while a debate is live
    this.places.forEach((p, id) => {
      p.hover = damp(p.hover, this.hovered === id ? 1 : 0, 6, dt)
      const flick = still ? 1 : 0.9 + 0.07 * Math.sin(t * 6 + p.group.position.x) + 0.03 * Math.sin(t * 15)
      const liveBoost = id === 'temple' && this.live ? 0.8 + 0.3 * Math.sin(t * 2.2) : 0
      p.light.intensity = (p.base * (0.3 + 0.7 * arrive) + p.hover * 1.6 + liveBoost) * L * flick
      ;(p.glow.material as THREE.SpriteMaterial).opacity = (0.22 + 0.35 * p.hover + liveBoost * 0.3) * arrive * flick
      if (id === 'temple' && this.live) (p.glow.material as THREE.SpriteMaterial).color.setHex(0xffd27a)
    })

    if (!still) {
      // fire on the tripod
      if (this.fire) {
        const { pts, seed, origin } = this.fire
        const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
        seed.forEach((s, i) => {
          s.life += dt * 1.6 * s.sp
          if (s.life > 1) s.life -= 1
          const l = s.life
          arr[i * 3] = origin.x + s.sx * (1 - l) + Math.sin(t * 3 + i) * 0.03
          arr[i * 3 + 1] = origin.y + l * 0.75
          arr[i * 3 + 2] = origin.z + s.sz * (1 - l)
        })
        pts.geometry.attributes.position.needsUpdate = true
        this.smoke.forEach((sm) => {
          const ph = (t * 0.12 + (sm.userData.phase as number)) % 1
          sm.position.set(origin.x + Math.sin(ph * 5 + t * 0.3) * 0.3 + ph * 0.8, origin.y + 0.6 + ph * 3.2, origin.z)
          const sc = 0.6 + ph * 1.8
          sm.scale.set(sc, sc, 1)
          ;(sm.material as THREE.SpriteMaterial).opacity = Math.sin(ph * Math.PI) * 0.5 * arrive
        })
      }
      this.lamps.forEach((l, i) => {
        const k = 0.85 + 0.15 * Math.sin(t * 5 + i * 1.7)
        l.scale.set(0.42 * k, 0.42 * k, 1)
        ;(l.material as THREE.SpriteMaterial).opacity = clamp(arrive * 2 - i * 0.12, 0, 1)
      })
      this.clouds.forEach((c, i) => {
        c.position.x += dt * (0.6 + i * 0.12)
        if (c.position.x > 110) c.position.x = -110
      })
      ;(this.glitter.material as THREE.PointsMaterial).opacity = 0.45 + 0.2 * Math.sin(t * 1.7)
      this.stars.rotation.y = t * 0.0015
      if (this.beam && this.beamFlash) {
        this.beam.rotation.y = t * 0.45
        // the lamp flares as a beam swings toward you
        const toCam = Math.atan2(this.camera.position.x - this.beam.position.x, this.camera.position.z - this.beam.position.z)
        const face = Math.max(Math.cos(this.beam.rotation.y - toCam + Math.PI / 2), Math.cos(this.beam.rotation.y - toCam - Math.PI / 2))
        const k = Math.pow(Math.max(0, face), 12)
        this.beamFlash.scale.setScalar(2.5 + 9 * k)
        ;(this.beamFlash.material as THREE.SpriteMaterial).opacity = 0.5 + 0.5 * k
      }
      this.boats.forEach((b, i) => {
        b.position.y = -0.3 + 0.03 * Math.sin(t * 1.2 + i * 1.7)
        b.rotation.z = 0.05 * Math.sin(t * 0.9 + i)
      })
      if (this.windowGlow) (this.windowGlow.material as THREE.PointsMaterial).opacity = (0.75 + 0.1 * Math.sin(t * 2.3)) * arrive
    }

    this.renderer.render(this.scene, this.camera)
    this.raf = requestAnimationFrame(this.frame)
  }
}

/** The path's line up the hill: it winds past each place on its way to the Temple. */
function pathX(z: number) {
  return 1.6 * Math.sin(z * 0.42 + 0.6) - 0.3 * Math.max(0, -z - 3)
}

import * as THREE from 'three'
import { surface } from '../world/textures'
import { arrival } from '../night/veil'
import { addMilkyWay, addMist, addSea, addShootingStars, createPost, type Post, type Tick } from '../world/nightKit'
import { addHorizon } from '../world/nightKit'
import { marbleTexture, statueMaterials } from '../marble/statue'

/**
 * The Oracle in 3D: a rocky ledge on the hill at night, the broken columns of
 * an old shrine behind, and a bronze tripod whose fire answers. The screen
 * tells it what is happening; the fire and smoke do the rest:
 *   gathering  — smoke thickens while the day's question forms
 *   waiting    — a steady flame, the question asked
 *   thinking   — the fire flares and the smoke rises fast while it considers
 *   answered   — the flame turns gold and the smoke settles into a slow spiral
 */

export type OracleMood = 'gathering' | 'waiting' | 'thinking' | 'answered'

const L = Math.PI
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt))

const BOWL_Y = 1.62
const FIRE = 80
const SMOKE = 26
const EMBERS = 60

interface Puff {
  sprite: THREE.Sprite
  life: number
  speed: number
  spin: number
  drift: number
}

export class OracleScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)
  private reduced: boolean
  private post!: Post
  private ticks: Tick[] = []
  private raf = 0
  private halted = false
  private last = performance.now()
  private clock = 0

  private mood: OracleMood = 'gathering'
  private born = performance.now()
  private heat = 0.5
  private gold = 0
  private scroll = 0
  private pointer = { x: 0, y: 0 }

  private fireLight: THREE.PointLight
  private fireGlow: THREE.Sprite
  private fire!: THREE.Points
  private fireSeed: { life: number; sx: number; sz: number; sp: number }[] = []
  private embers!: THREE.Points
  private emberSeed: { life: number; a: number; r: number; sp: number }[] = []
  private puffs: Puff[] = []
  private fireMat!: THREE.PointsMaterial
  private stars!: THREE.Points
  private onMove: (e: PointerEvent) => void

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean } = {}) {
    this.reduced = !!opts.reducedMotion
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2))
    this.renderer.shadowMap.enabled = !small
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene.add(new THREE.HemisphereLight(0x6f7ea8, 0x140e09, 0.35 * L))
    const moon = new THREE.DirectionalLight(0xb7c4e8, 0.5 * L)
    moon.position.set(-8, 12, -10)
    moon.castShadow = true
    moon.shadow.mapSize.set(1024, 1024)
    Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -3, near: 1, far: 40 })
    this.scene.add(moon)

    this.fireLight = new THREE.PointLight(0xff9a48, 4 * L, 9, 1.6)
    this.fireLight.position.set(0, BOWL_Y + 0.4, 0)
    this.fireLight.castShadow = !small
    this.fireLight.shadow.mapSize.set(512, 512)
    this.fireLight.shadow.bias = -0.003
    this.scene.add(this.fireLight)

    const glowTex = this.sprite((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      gr.addColorStop(0, 'rgba(255,240,205,1)')
      gr.addColorStop(0.3, 'rgba(255,170,80,.6)')
      gr.addColorStop(1, 'rgba(255,110,40,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }, 64)
    this.fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.fireGlow.position.set(0, BOWL_Y + 0.25, 0)
    this.fireGlow.scale.set(2.6, 2.6, 1)
    this.scene.add(this.fireGlow)

    this.buildWorld()
    this.buildShrine()
    this.buildTripod()
    this.buildFire(glowTex)
    this.buildSmoke()

    this.onMove = (e) => {
      if (e.pointerType !== 'mouse' || this.reduced) return
      this.pointer.x = e.clientX / window.innerWidth - 0.5
      this.pointer.y = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', this.onMove)
    // the shared night: a moving sea far below, the Milky Way over the shrine, mist on the water
    this.ticks.push(addHorizon(this.scene, { level: -6, distance: 80 }))
    this.ticks.push(addSea(this.scene, { level: -6, moon: new THREE.Vector3(-26, 28, -80), size: 400 }))
    addMilkyWay(this.scene, { radius: 100, a: new THREE.Vector3(-0.85, 0.15, -0.5), b: new THREE.Vector3(0.55, 0.6, -0.6) })
    this.ticks.push(addShootingStars(this.scene, { distance: 90 }))
    this.ticks.push(addMist(this.scene, [[-20, -30, 30, -5], [15, -38, 34, -5.2], [-5, -50, 40, -5], [30, -24, 22, -5.4]], 0.32))

    this.post = createPost(this.renderer, this.scene, this.camera, { strength: 0.45, threshold: 0.82 })
    // prepare every shader in the background before the first frame, so the page doesn't freeze while it compiles
    const start = () => {
      if (!this.halted) this.raf = requestAnimationFrame(this.frame)
    }
    this.renderer.compileAsync(this.scene, this.camera).then(start, start)
  }

  /* ------------------------------- public API ------------------------------- */

  setMood(m: OracleMood) {
    this.mood = m
  }

  /** 0 at the top of the page, 1 once the reader has scrolled a screen down: the camera lowers toward the fire. */
  setScroll(t: number) {
    this.scroll = clamp(t, 0, 1)
  }

  resize(w: number, h: number) {
    this.renderer.setSize(Math.max(1, w), Math.max(1, h), false)
    this.post?.setSize(w, h)
    this.camera.aspect = Math.max(1, w) / Math.max(1, h)
    this.camera.fov = this.camera.aspect < 0.8 ? 52 : 40
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.halted = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('pointermove', this.onMove)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    this.post.dispose()
    this.renderer.dispose()
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

  private buildWorld() {
    const scene = this.scene
    const HORIZON = new THREE.Color(0x161e2d)
    scene.fog = new THREE.FogExp2(HORIZON.getHex(), 0.03)
    scene.background = HORIZON.clone()
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(0x04060a) }, low: { value: new THREE.Color(0x222c44) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 low; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(low, top, smoothstep(-0.02, 0.55, h)), 1.0); }',
      }),
    )
    sky.renderOrder = -2
    scene.add(sky)
    const n = 800
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = rand(0, Math.PI * 2)
      const ph = rand(0.05, 1.3)
      pos[i * 3] = 100 * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = 100 * Math.cos(ph) + 2
      pos[i * 3 + 2] = 100 * Math.sin(ph) * Math.sin(th)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xede6d6, size: 0.3, transparent: true, opacity: 0.85, fog: false }))
    scene.add(this.stars)
    const moon = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 32), new THREE.MeshBasicMaterial({ color: 0xf1e8d2, fog: false }))
    moon.position.set(-26, 28, -80)
    scene.add(moon)

    // the ledge: a rough slab of rock that falls away at the edges
    const geo = new THREE.CircleGeometry(9, 72, 0, Math.PI * 2)
    geo.rotateX(-Math.PI / 2)
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const r = Math.hypot(x, z)
      const fall = r > 4.5 ? -Math.pow(r - 4.5, 1.6) * 0.5 : 0
      p.setY(i, fall + 0.08 * Math.sin(x * 2.1) * Math.cos(z * 1.7) + 0.04 * Math.sin(x * 7 + z * 5))
    }
    geo.computeVertexNormals()
    const groundMat = surface('rock_04', { repeat: [7, 7], color: 0x7a7266, normal: 1.6 })
    groundMat.flatShading = true
    const ground = new THREE.Mesh(geo, groundMat)
    ground.receiveShadow = true
    scene.add(ground)
    // scattered stones
    const stoneMat = surface('rock_04', { color: 0x6a6258, normal: 1.5 })
    for (let i = 0; i < 22; i++) {
      const a = rand(0, Math.PI * 2)
      const r = rand(1.2, 4.2)
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.06, 0.22), 0), stoneMat)
      s.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r)
      s.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3))
      s.castShadow = true
      scene.add(s)
    }
    // distant hills and the sea
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x0f1520, roughness: 1 })
    ;[
      [-30, -40, 14, 0.4],
      [10, -55, 18, 0.35],
      [40, -38, 12, 0.45],
    ].forEach(([x, z, r, sy]) => {
      const h = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMat)
      h.position.set(x, -6, z)
      h.scale.y = sy
      scene.add(h)
    })
  }

  /** Broken columns of an older shrine in a half circle behind the fire. */
  private buildShrine() {
    const mat = new THREE.MeshStandardMaterial({ map: marbleTexture('#D8D0BE', '#776D5C'), roughness: 0.6 })
    const shaft = (h: number) => {
      const g = new THREE.CylinderGeometry(0.2, 0.23, h, 20)
      const p = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        const z = p.getZ(i)
        const k = 1 - 0.05 * Math.pow(Math.abs(Math.cos(Math.atan2(z, x) * 10)), 3)
        p.setX(i, x * k)
        p.setZ(i, z * k)
      }
      g.computeVertexNormals()
      return g
    }
    const heights = [3.2, 1.4, 3.2, 2.3, 0.7, 3.2, 1.8]
    heights.forEach((h, i) => {
      const a = Math.PI + (i - 3) * 0.42
      const r = 3.4
      const g = new THREE.Group()
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.14, 20), mat)
      base.position.y = 0.07
      g.add(base)
      const c = new THREE.Mesh(shaft(h), mat)
      c.position.y = 0.14 + h / 2
      g.add(c)
      if (h > 3) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.56), mat)
        cap.position.y = 0.14 + h + 0.07
        g.add(cap)
      } else {
        // a jagged break at the top
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.25, 7), mat)
        shard.position.set(0.05, 0.14 + h + 0.1, 0)
        shard.rotation.z = 0.3
        g.add(shard)
      }
      g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r)
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
      this.scene.add(g)
    })
    // a lintel still resting across two of them, and one fallen drum
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.45), mat)
    const a1 = Math.PI - 0.42
    const a2 = Math.PI + 0.42 * 2
    lintel.position.set((Math.sin(a1 - 0.42) * 3.4 + Math.sin(Math.PI) * 3.4) / 2, 3.55, (Math.cos(a1 - 0.42) * 3.4 + Math.cos(Math.PI) * 3.4) / 2)
    lintel.lookAt(Math.sin(Math.PI) * 3.4, 3.55, Math.cos(Math.PI) * 3.4)
    lintel.rotateY(Math.PI / 2)
    lintel.castShadow = true
    this.scene.add(lintel)
    const drum = new THREE.Mesh(shaft(0.8), mat)
    drum.rotation.z = Math.PI / 2
    drum.position.set(Math.sin(a2) * 2.6 + 0.4, 0.22, Math.cos(a2) * 2.6 + 0.6)
    drum.castShadow = true
    this.scene.add(drum)
  }

  private buildTripod() {
    const { bronze, gilt } = statueMaterials()
    const g = new THREE.Group()
    // a round stone altar step
    const step = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.2, 40), surface('marble_01', { repeat: [3, 0.4], color: 0xc4bba9 }))
    step.position.y = 0.1
    g.add(step)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.3
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.45, 8), bronze)
      leg.position.set(Math.cos(a) * 0.3, 0.2 + 0.7, Math.sin(a) * 0.3)
      leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22)
      g.add(leg)
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), bronze)
      foot.position.set(Math.cos(a) * 0.44, 0.24, Math.sin(a) * 0.44)
      g.add(foot)
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 32), bronze)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.95
    g.add(ring)
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.46, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze)
    bowl.position.y = BOWL_Y
    g.add(bowl)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 10, 40), gilt)
    rim.rotation.x = Math.PI / 2
    rim.position.y = BOWL_Y
    g.add(rim)
    ;[0, 2.1, 4.2].forEach((a) => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 16), gilt)
      handle.position.set(Math.cos(a) * 0.5, BOWL_Y + 0.08, Math.sin(a) * 0.5)
      handle.rotation.y = -a
      g.add(handle)
    })
    const coals = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshStandardMaterial({ color: 0x2a0c02, emissive: 0xff5a10, emissiveIntensity: 1.5 }))
    coals.rotation.x = -Math.PI / 2
    coals.position.y = BOWL_Y - 0.04
    g.add(coals)
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    this.scene.add(g)
  }

  private buildFire(tex: THREE.Texture) {
    const pos = new Float32Array(FIRE * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.fireMat = new THREE.PointsMaterial({ map: tex, size: 0.3, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff7a30 })
    this.fire = new THREE.Points(g, this.fireMat)
    this.scene.add(this.fire)
    for (let i = 0; i < FIRE; i++) this.fireSeed.push({ life: rand(0, 1), sx: rand(-0.26, 0.26), sz: rand(-0.26, 0.26), sp: rand(0.7, 1.4) })
    const ep = new Float32Array(EMBERS * 3)
    const eg = new THREE.BufferGeometry()
    eg.setAttribute('position', new THREE.BufferAttribute(ep, 3))
    this.embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: tex, size: 0.07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc070 }))
    this.scene.add(this.embers)
    for (let i = 0; i < EMBERS; i++) this.emberSeed.push({ life: rand(0, 1), a: rand(0, Math.PI * 2), r: rand(0.05, 0.4), sp: rand(0.15, 0.35) })
  }

  private buildSmoke() {
    const tex = this.sprite((g, s) => {
      for (let i = 0; i < 9; i++) {
        const x = rand(s * 0.3, s * 0.7)
        const y = rand(s * 0.3, s * 0.7)
        const r = rand(s * 0.18, s * 0.32)
        const gr = g.createRadialGradient(x, y, 0, x, y, r)
        gr.addColorStop(0, 'rgba(200,204,218,.22)')
        gr.addColorStop(1, 'rgba(200,204,218,0)')
        g.fillStyle = gr
        g.fillRect(0, 0, s, s)
      }
    }, 128)
    for (let i = 0; i < SMOKE; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }))
      this.scene.add(sprite)
      this.puffs.push({ sprite, life: i / SMOKE, speed: rand(0.8, 1.2), spin: rand(-0.4, 0.4), drift: rand(0, Math.PI * 2) })
    }
  }

  /* --------------------------------- the loop -------------------------------- */

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.clock += dt
    const t = this.clock
    const still = this.reduced
    const m = this.mood

    const heatTarget = m === 'thinking' ? 1.6 : m === 'gathering' ? 0.7 : m === 'answered' ? 1.15 : 1
    this.heat = damp(this.heat, heatTarget, m === 'thinking' ? 4 : 1.5, dt)
    this.gold = damp(this.gold, m === 'answered' ? 1 : 0, 1.2, dt)
    const flick = still ? 1 : 0.88 + 0.08 * Math.sin(t * 9) + 0.04 * Math.sin(t * 23 + 1)
    this.fireLight.intensity = 4 * L * this.heat * flick
    this.fireLight.color.setRGB(1, 0.6 + 0.22 * this.gold, 0.28 + 0.2 * this.gold)
    this.fireMat.color.setRGB(1, 0.42 + 0.3 * this.gold, 0.16 + 0.1 * this.gold)
    const gs = 2.2 + 1.2 * this.heat
    this.fireGlow.scale.set(gs * flick, gs * flick, 1)
    ;(this.fireGlow.material as THREE.SpriteMaterial).opacity = 0.12 + 0.08 * this.heat

    // the camera stands back looking at the shrine, and lowers toward the fire as you read down the page
    const s = this.scroll
    const portrait = this.camera.aspect < 0.8
    const dist = (portrait ? 8.5 : 8.2) - 1.6 * s + 4 * (1 - arrival(this.born, 2200))
    const px = still ? 0 : this.pointer.x * 0.6 + 0.25 * Math.sin(t * 0.09)
    this.camera.position.set(px, 2.2 - 0.5 * s - this.pointer.y * 0.3, dist)
    this.camera.lookAt(0, (portrait ? 0.6 : 1.25) - 0.3 * s, 0)

    if (!still) {
      // flames
      const fa = (this.fire.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
      const tall = 0.75 + 0.6 * this.heat
      this.fireSeed.forEach((f, i) => {
        f.life += dt * 1.5 * f.sp * (0.7 + 0.5 * this.heat)
        if (f.life > 1) f.life -= 1
        const l = f.life
        const narrow = 1 - l * 0.85
        fa[i * 3] = f.sx * narrow + Math.sin(t * 4 + i) * 0.03 * l
        fa[i * 3 + 1] = BOWL_Y + l * tall
        fa[i * 3 + 2] = f.sz * narrow
      })
      this.fire.geometry.attributes.position.needsUpdate = true
      this.fireMat.size = 0.24 + 0.1 * this.heat

      // embers drifting up and out
      const ea = (this.embers.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
      this.emberSeed.forEach((e, i) => {
        e.life += dt * e.sp * (0.6 + 0.6 * this.heat)
        if (e.life > 1) {
          e.life -= 1
          e.a = rand(0, Math.PI * 2)
        }
        const l = e.life
        const r = e.r + l * 0.6
        ea[i * 3] = Math.cos(e.a + l * 2) * r
        ea[i * 3 + 1] = BOWL_Y + 0.2 + l * 3.2
        ea[i * 3 + 2] = Math.sin(e.a + l * 2) * r
      })
      this.embers.geometry.attributes.position.needsUpdate = true

      // smoke: thick while the question forms, fast while thinking, a slow spiral once answered
      const density = m === 'gathering' ? 0.42 : m === 'thinking' ? 0.34 : m === 'answered' ? 0.26 : 0.2
      const rise = m === 'thinking' ? 0.22 : m === 'gathering' ? 0.08 : 0.1
      this.puffs.forEach((p) => {
        p.life += dt * rise * p.speed
        if (p.life > 1) p.life -= 1
        const l = p.life
        const swirl = m === 'answered' ? 1.6 : 0.6
        const r = 0.15 + l * (m === 'gathering' ? 1.4 : 0.9)
        p.sprite.position.set(Math.cos(p.drift + l * swirl * 3 + t * 0.1) * r, BOWL_Y + 0.5 + l * 4.2, Math.sin(p.drift + l * swirl * 3) * r * 0.6)
        const sc = 0.7 + l * 2.6
        p.sprite.scale.set(sc, sc, 1)
        p.sprite.material.rotation += p.spin * dt
        p.sprite.material.opacity = Math.sin(l * Math.PI) * density
        p.sprite.material.color.setRGB(0.85 + 0.15 * this.gold, 0.85 + 0.1 * this.gold, 0.9 - 0.15 * this.gold)
      })
      this.stars.rotation.y = t * 0.002
    }

    if (!this.reduced) for (const k of this.ticks) k(this.clock, 0)
    this.post.render()
    this.raf = requestAnimationFrame(this.frame)
  }
}

import * as THREE from 'three'
import { addHorizon, addMilkyWay, addMist, addSea, addShootingStars, createPost, isSmallScreen, type Post, type Tick } from './nightKit'

/**
 * A quiet view of the bay at night for pages that are mostly words (the
 * belief page, the introduction, your seat, settings): sky, moon, the Milky
 * Way, the moving sea, mist, the islands and the Sanctuary across the water.
 * Nothing to click; the camera drifts slowly.
 */
export class BackdropScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400)
  private post: Post
  private ticks: Tick[] = []
  private raf = 0
  private halted = false
  private clock = 0
  private last = performance.now()
  private reduced: boolean
  private stars: THREE.Points

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean } = {}) {
    this.reduced = !!opts.reducedMotion
    const small = isSmallScreen()
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !small })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    const s = this.scene
    const HORIZON = new THREE.Color(0x182131)
    s.fog = new THREE.FogExp2(HORIZON.getHex(), 0.012)
    s.background = HORIZON.clone()

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(180, 32, 16),
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
    s.add(sky)
    const n = 900
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2
      const ph = 0.05 + Math.random() * 1.3
      pos[i * 3] = 170 * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = 170 * Math.cos(ph)
      pos[i * 3 + 2] = 170 * Math.sin(ph) * Math.sin(th)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xede6d6, size: 0.45, transparent: true, opacity: 0.9, fog: false }))
    s.add(this.stars)
    const moonPos = new THREE.Vector3(62, 46, -150)
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 32, 32), new THREE.MeshBasicMaterial({ color: 0xf2e9d3, fog: false }))
    moon.position.copy(moonPos)
    s.add(moon)
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(241,232,210,.4)')
    gr.addColorStop(0.25, 'rgba(241,232,210,.08)')
    gr.addColorStop(1, 'rgba(241,232,210,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 128)
    const haloTex = new THREE.CanvasTexture(c)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }))
    halo.position.copy(moonPos)
    halo.scale.set(44, 44, 1)
    s.add(halo)

    addMilkyWay(s, { radius: 165, a: new THREE.Vector3(-0.9, 0.12, -0.42), b: new THREE.Vector3(0.3, 0.75, -0.6), glow: 0.22 })
    this.ticks.push(addSea(s, { level: 0, moon: moonPos, size: 600 }))
    this.ticks.push(addHorizon(s, { level: 0, distance: 90 }))
    this.ticks.push(addMist(s, [[-30, -40, 50, 0.6], [20, -55, 60, 0.8], [-5, -80, 70, 0.7], [45, -30, 40, 0.5], [-55, -25, 40, 0.6]], 0.3))
    this.ticks.push(addShootingStars(s, { distance: 140 }))

    this.post = createPost(this.renderer, s, this.camera, { strength: 0.5, threshold: 0.8, vignette: 0.5, frameMs: 34 })
    // prepare every shader in the background before the first frame, so the page doesn't freeze while it compiles
    const start = () => {
      if (!this.halted) this.raf = requestAnimationFrame(this.frame)
    }
    this.renderer.compileAsync(this.scene, this.camera).then(start, start)
  }

  resize(w: number, h: number) {
    this.renderer.setSize(Math.max(1, w), Math.max(1, h), false)
    this.post.setSize(w, h)
    this.camera.aspect = Math.max(1, w) / Math.max(1, h)
    this.camera.fov = this.camera.aspect < 0.8 ? 62 : 46
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.halted = true
    cancelAnimationFrame(this.raf)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    this.post.dispose()
    this.renderer.dispose()
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.clock += dt
    const t = this.clock
    const drift = this.reduced ? 0 : t
    this.camera.position.set(Math.sin(drift * 0.03) * 3, 3.2 + Math.sin(drift * 0.05) * 0.3, 12)
    this.camera.lookAt(Math.sin(drift * 0.02) * 4, 4.5, -60)
    if (!this.reduced) {
      for (const k of this.ticks) k(t, dt)
      this.stars.rotation.y = t * 0.002
    } else if (this.clock === dt) for (const k of this.ticks) k(0, 0)
    this.post.render()
    // a backdrop need not run at full speed: about 30 frames a second is plenty
    this.raf = requestAnimationFrame((n) => (n - now < 28 ? requestAnimationFrame(this.frame) : this.frame(n)))
  }
}

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * The shared look of the night world, so every place matches the Sanctuary:
 * soft bloom and a vignette over the image, a moving sea carrying the moon's
 * light, the Milky Way, low mist and the odd shooting star.
 */

export const isSmallScreen = () => Math.min(window.innerWidth, window.innerHeight) < 600

export type Tick = (t: number, dt: number) => void

/* ---------------------------- the finished image ---------------------------- */

export interface Post {
  render: () => void
  setSize: (w: number, h: number) => void
  dispose: () => void
}

/** Bloom on lamps, fire and the moon, then a gentle vignette and a cool night grade. */
export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts: { strength?: number; radius?: number; threshold?: number; vignette?: number; frameMs?: number } = {},
): Post {
  const small = isSmallScreen()
  // sharp enough without drawing four times the pixels on high-density screens
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5))
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: small ? 0 : 2 }))
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), opts.strength ?? 0.55, opts.radius ?? 0.5, opts.threshold ?? 0.78)
  composer.addPass(bloom)
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uAmount: { value: opts.vignette ?? 0.45 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform sampler2D tDiffuse; uniform float uAmount; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 1.15))); c.rgb *= mix(1.0 - uAmount, 1.0, v); c.rgb = mix(c.rgb, c.rgb * vec3(0.96, 0.99, 1.06), 0.5); gl_FragColor = c; }',
    }),
  )
  composer.addPass(new OutputPass())

  // A quality governor: if frames take too long on this device, step down
  // (glow off, then fewer pixels, then no shadows) until it runs smoothly.
  const target = opts.frameMs ?? 16.7
  let w = 1
  let h = 1
  let last = 0
  let slow = 0
  let samples = 0
  let level = 0
  const stepDown = () => {
    level++
    if (level === 1) bloom.enabled = false
    if (level === 2) {
      renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1))
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(w, h)
    }
    if (level === 3) {
      renderer.shadowMap.autoUpdate = false
      renderer.setPixelRatio(0.75)
      composer.setPixelRatio(0.75)
      composer.setSize(w, h)
    }
  }
  return {
    render: () => {
      const now = performance.now()
      if (last && !document.hidden) {
        const dt = now - last
        // ignore long gaps (tab switches, pauses)
        if (dt < 250) {
          samples++
          if (dt > target * 1.6) slow++
          if (samples >= 90) {
            if (slow > 45 && level < 3) stepDown()
            samples = 0
            slow = 0
          }
        }
      }
      last = now
      composer.render()
    },
    setSize: (nw, nh) => {
      w = Math.max(1, nw)
      h = Math.max(1, nh)
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(w, h)
    },
    dispose: () => composer.dispose(),
  }
}

/* --------------------------------- textures --------------------------------- */

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

let rs = 4242
const r = () => {
  rs = (rs * 16807) % 2147483647
  return rs / 2147483647
}
const between = (a: number, b: number) => a + r() * (b - a)

/* ---------------------------------- the sea ---------------------------------- */

/**
 * A moving sea: small waves, the moon's broken path of light, the sky in the
 * far water, fading into the scene's fog. Waves finer than a pixel fade out.
 */
export function addSea(scene: THREE.Scene, opts: { level: number; moon: THREE.Vector3; size?: number; centre?: THREE.Vector2 }): Tick {
  const fog = scene.fog as THREE.FogExp2 | THREE.Fog | null
  const density = fog && 'density' in fog ? fog.density : 0.015
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMoon: { value: opts.moon.clone() },
      uDeep: { value: new THREE.Color(0x060b15) },
      uSky: { value: new THREE.Color(0x2a3756) },
      uMoonCol: { value: new THREE.Color(0xfff1d2) },
      uFog: { value: fog ? fog.color.clone() : new THREE.Color(0x182131) },
      uDensity: { value: density },
    },
    vertexShader: `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uMoon; uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uMoonCol; uniform vec3 uFog; uniform float uDensity;
      varying vec3 vW;
      float foot;
      vec2 wave(vec2 p, vec2 d, float f, float s, float a) {
        float k = dot(p, normalize(d)) * f + uTime * s;
        float aa = clamp(1.0 - foot * f * 0.9, 0.0, 1.0);
        return normalize(d) * cos(k) * f * a * aa;
      }
      void main() {
        vec2 p = vW.xz;
        foot = length(fwidth(p));
        float dist = length(cameraPosition - vW);
        float fade = 1.0 / (1.0 + dist * 0.015);
        vec2 g = vec2(0.0);
        g += wave(p, vec2(1.0, 0.35), 0.55, 0.9, 0.06);
        g += wave(p, vec2(-0.6, 1.0), 0.9, 1.3, 0.04);
        g += wave(p, vec2(0.3, -1.0), 1.7, 1.9, 0.022);
        g += wave(p, vec2(1.0, -0.8), 3.1, 2.6, 0.012);
        g += wave(p, vec2(-1.0, -0.2), 5.3, 3.4, 0.007);
        g += wave(p, vec2(0.2, 1.0), 8.9, 4.1, 0.004);
        vec3 n = normalize(vec3(-g.x * fade, 1.0, -g.y * fade));
        vec3 v = normalize(cameraPosition - vW);
        vec3 l = normalize(uMoon - vW);
        vec3 h = normalize(v + l);
        float spec = pow(max(dot(n, h), 0.0), 700.0) * 1.8 + pow(max(dot(n, h), 0.0), 70.0) * 0.045;
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        vec3 col = mix(uDeep, uSky, clamp(fres * 1.4, 0.0, 1.0)) + uMoonCol * spec;
        float f = 1.0 - exp(-pow(uDensity * dist, 2.0));
        col = mix(col, uFog, f * 0.92);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const size = opts.size ?? 700
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)
  sea.rotation.x = -Math.PI / 2
  sea.position.set(opts.centre?.x ?? 0, opts.level, opts.centre?.y ?? 0)
  scene.add(sea)
  return (t) => {
    mat.uniforms.uTime.value = t
  }
}

/* -------------------------------- the night sky -------------------------------- */

/**
 * The Milky Way: a dense band of faint stars with soft clouds of light. `a` and
 * `b` are two directions the band passes through, so it can be laid across
 * whatever part of the sky a place looks at.
 */
export function addMilkyWay(scene: THREE.Scene, opts: { radius: number; a: THREE.Vector3; b: THREE.Vector3; minY?: number; glow?: number }) {
  const n = new THREE.Vector3().crossVectors(opts.a.clone().normalize(), opts.b.clone().normalize()).normalize()
  const u = opts.a.clone().normalize()
  const v = new THREE.Vector3().crossVectors(n, u).normalize()
  const R = opts.radius
  const minY = opts.minY ?? R * 0.03
  const pos: number[] = []
  const col: number[] = []
  const c = new THREE.Color()
  const p = new THREE.Vector3()
  const gauss = () => (r() + r() + r() - 1.5) / 1.5
  for (let i = 0; i < 5200; i++) {
    const ang = r() * Math.PI * 2
    p.copy(u).multiplyScalar(Math.cos(ang)).addScaledVector(v, Math.sin(ang)).addScaledVector(n, gauss() * 0.16).normalize().multiplyScalar(R)
    if (p.y < minY) continue
    pos.push(p.x, p.y, p.z)
    c.setHSL(r() < 0.5 ? 0.6 : 0.1, 0.3, 0.7 + r() * 0.25)
    col.push(c.r, c.g, c.b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: R * 0.0025, vertexColors: true, transparent: true, opacity: 0.9, fog: false, depthWrite: false })))
  const haze = canvasTexture(256, (gg, s) => {
    for (let i = 0; i < 14; i++) {
      const x = s * between(0.2, 0.8)
      const y = s * between(0.35, 0.65)
      const rr = s * between(0.1, 0.3)
      const gr = gg.createRadialGradient(x, y, 0, x, y, rr)
      gr.addColorStop(0, 'rgba(190,200,235,.16)')
      gr.addColorStop(1, 'rgba(190,200,235,0)')
      gg.fillStyle = gr
      gg.fillRect(0, 0, s, s)
    }
  })
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2
    p.copy(u).multiplyScalar(Math.cos(ang)).addScaledVector(v, Math.sin(ang)).normalize().multiplyScalar(R * 0.97)
    if (p.y < minY) continue
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haze, transparent: true, opacity: 0.55 * (opts.glow ?? 1), depthWrite: false, fog: false, blending: THREE.AdditiveBlending, rotation: r() * 6 }))
    sp.position.copy(p)
    sp.scale.set(R * 0.27, R * 0.27, 1)
    scene.add(sp)
  }
}

/** Now and then a shooting star crosses the sky in front of you. */
export function addShootingStars(scene: THREE.Scene, opts: { distance: number; towards?: THREE.Vector3 }): Tick {
  const dir0 = (opts.towards ?? new THREE.Vector3(0, 0, -1)).clone().setY(0).normalize()
  const side = new THREE.Vector3(-dir0.z, 0, dir0.x)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3))
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false })
  scene.add(new THREE.Line(geo, mat))
  const D = opts.distance
  let next = 5
  let start = -1
  const from = new THREE.Vector3()
  const dir = new THREE.Vector3()
  return (t) => {
    if (start < 0 && t > next) {
      start = t
      from.copy(dir0).multiplyScalar(D).addScaledVector(side, between(-0.6, 0.3) * D).setY(between(0.2, 0.38) * D)
      dir.copy(side).multiplyScalar(between(0.6, 1)).add(new THREE.Vector3(0, between(-0.5, -0.25), 0)).normalize()
    }
    if (start >= 0) {
      const k = (t - start) / 0.9
      if (k > 1) {
        start = -1
        next = t + between(7, 16)
        mat.opacity = 0
        return
      }
      const head = from.clone().addScaledVector(dir, k * D * 0.3)
      const tail = head.clone().addScaledVector(dir, -D * 0.06)
      const a = geo.attributes.position as THREE.BufferAttribute
      a.setXYZ(0, tail.x, tail.y, tail.z)
      a.setXYZ(1, head.x, head.y, head.z)
      a.needsUpdate = true
      mat.opacity = Math.sin(k * Math.PI) * 0.9
    }
  }
}

/* ----------------------------------- mist ----------------------------------- */

/** Low banks of mist lying on the water or in hollows, drifting slowly. Each bank: [x, z, width, height above ground]. */
export function addMist(scene: THREE.Scene, banks: [number, number, number, number][], opacity = 0.3): Tick {
  const tex = canvasTexture(256, (g, s) => {
    for (let i = 0; i < 18; i++) {
      const x = s * between(0.15, 0.85)
      const y = s * between(0.4, 0.6)
      const rr = s * between(0.1, 0.22)
      const gr = g.createRadialGradient(x, y, 0, x, y, rr)
      gr.addColorStop(0, 'rgba(160,172,198,.16)')
      gr.addColorStop(1, 'rgba(160,172,198,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, s, s)
    }
  })
  const items = banks.map(([x, z, w, y]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: opacity * between(0.7, 1.25) }))
    s.position.set(x, y, z)
    s.scale.set(w, w * 0.18, 1)
    scene.add(s)
    return { s, base: x, speed: between(0.2, 0.5), w }
  })
  return (t) => {
    items.forEach((b, i) => {
      b.s.position.x = b.base + Math.sin(t * 0.02 * b.speed + i) * b.w * 0.15 + ((t * b.speed) % (b.w * 0.8)) - b.w * 0.4
    })
  }
}

/** Specks of dust turning slowly in lamplight, inside a box. */
export function addDust(scene: THREE.Scene, box: THREE.Box3, glow: THREE.Texture, count = 160): Tick {
  const pos = new Float32Array(count * 3)
  const seed: number[] = []
  for (let i = 0; i < count; i++) {
    pos[i * 3] = between(box.min.x, box.max.x)
    pos[i * 3 + 1] = between(box.min.y, box.max.y)
    pos[i * 3 + 2] = between(box.min.z, box.max.z)
    seed.push(r() * 10)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glow, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a0 }))
  scene.add(pts)
  const base = pos.slice()
  return (t) => {
    for (let i = 0; i < count; i++) {
      const s = seed[i]
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + s) * 0.25
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + s * 2) * 0.2
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + s) * 0.25
    }
    g.attributes.position.needsUpdate = true
  }
}

/* ------------------------------ the view beyond ------------------------------ */

/**
 * What every place looks out on: layered mountain ridges fading into the
 * night, islands in the bay with the lit windows of their villages, boat
 * lanterns on the water, and the Sanctuary hill itself across the bay, its
 * temple's door glowing and lamps along its path. Drawn without fog in
 * colours that already carry the haze, so it reads at any distance.
 * `towards` is the direction the place looks; `arc` how wide the view is
 * (use Math.PI * 2 for a place you can turn all the way round).
 */
export function addHorizon(
  scene: THREE.Scene,
  opts: { level: number; distance: number; towards?: THREE.Vector3; arc?: number; sanctuary?: boolean },
): Tick {
  const fog = scene.fog as THREE.FogExp2 | THREE.Fog | null
  const haze = fog ? fog.color.clone() : new THREE.Color(0x182131)
  const night = new THREE.Color(0x070a10)
  const dir = (opts.towards ?? new THREE.Vector3(0, 0, -1)).clone().setY(0).normalize()
  const centre = Math.atan2(dir.x, dir.z)
  const arc = opts.arc ?? 2.4
  const D = opts.distance
  const L = opts.level
  const at = (ang: number, d: number) => new THREE.Vector3(Math.sin(ang) * d, L, Math.cos(ang) * d)
  const group = new THREE.Group()
  group.renderOrder = -1

  // mountain ridges: three layers, the furthest palest
  const ridges = [
    { d: D * 1.6, h: D * 0.17, mix: 0.75, f: 0.9 },
    { d: D * 1.3, h: D * 0.12, mix: 0.5, f: 1.7 },
    { d: D * 1.05, h: D * 0.07, mix: 0.25, f: 3.1 },
  ]
  ridges.forEach((rg, ri) => {
    const segs = Math.max(60, Math.round(arc * 60))
    const verts: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= segs; i++) {
      const a = centre - arc / 2 + (i / segs) * arc
      const k = a * rg.f
      const n = 0.45 + 0.3 * Math.sin(k * 3.1 + ri) + 0.15 * Math.sin(k * 7.3 + 2 * ri) + 0.1 * Math.sin(k * 15.7 + ri * 3)
      const edge = arc < 6 ? Math.min(1, (i / segs) * 6, ((segs - i) / segs) * 6) : 1
      const h = rg.h * Math.max(0.12, n) * (0.4 + 0.6 * edge)
      const p = at(a, rg.d)
      verts.push(p.x, L - 2, p.z, p.x, L + h, p.z)
      if (i < segs) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    g.setIndex(idx)
    const col = night.clone().lerp(haze, rg.mix)
    group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, fog: false })))
  })

  // islands, each a low hump with a village of lit windows
  const glow = canvasTexture(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    gr.addColorStop(0, 'rgba(255,236,190,1)')
    gr.addColorStop(0.3, 'rgba(255,175,90,.55)')
    gr.addColorStop(1, 'rgba(255,130,50,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, s, s)
  })
  const lights: number[] = []
  const islandCol = night.clone().lerp(haze, 0.15)
  const islands = arc < 6 ? [-0.34, 0.12, 0.38] : [0, 0.9, 1.9, 3.1, 4.2, 5.3]
  islands.forEach((off, i) => {
    const a = centre + off * (arc < 6 ? arc : 1)
    const d = D * (0.75 + 0.12 * (i % 3))
    const w = D * (0.12 + 0.05 * ((i * 7) % 3))
    const hgt = D * (0.035 + 0.015 * (i % 2))
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, -1)
    for (let k = 0; k <= 24; k++) {
      const x = -w / 2 + (k / 24) * w
      const t = 1 - Math.pow((2 * k) / 24 - 1, 2)
      shape.lineTo(x, Math.pow(t, 0.7) * hgt * (0.85 + 0.15 * Math.sin(k * 1.7 + i)))
    }
    shape.lineTo(w / 2, -1)
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: islandCol, fog: false, side: THREE.DoubleSide }))
    const p = at(a, d)
    m.position.copy(p)
    m.lookAt(0, L, 0)
    group.add(m)
    // windows clustered on the slope facing us
    const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))
    const n = 10 + ((i * 5) % 9)
    for (let k = 0; k < n; k++) {
      const x = (r() - 0.5) * w * 0.55
      const t = 1 - Math.pow((2 * (x + w / 2)) / w - 1, 2)
      const y = r() * Math.pow(Math.max(0, t), 0.7) * hgt * 0.8
      const q = p.clone().addScaledVector(side, x).add(new THREE.Vector3(0, y + 0.2, 0)).addScaledVector(p.clone().normalize(), -0.5)
      lights.push(q.x, q.y, q.z)
    }
  })

  // the Sanctuary across the bay: its hill, the temple on top with a glowing door, lamps on the path
  if (opts.sanctuary !== false) {
    const a = centre + (arc < 6 ? arc * 0.24 : 0.5)
    const d = D * 0.62
    const w = D * 0.3
    const hgt = D * 0.085
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, -1)
    for (let k = 0; k <= 30; k++) {
      const x = -w / 2 + (k / 30) * w
      const t = Math.exp(-Math.pow(((k / 30) * 2 - 1) * 1.7, 2))
      shape.lineTo(x, t * hgt)
    }
    shape.lineTo(w / 2, -1)
    const hill = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: night.clone().lerp(haze, 0.1), fog: false, side: THREE.DoubleSide }))
    const p = at(a, d)
    hill.position.copy(p)
    hill.lookAt(0, L, 0)
    group.add(hill)
    const tw = w * 0.07
    const th = tw * 0.42
    const temple = new THREE.Group()
    const stone = new THREE.MeshBasicMaterial({ color: night.clone().lerp(new THREE.Color(0x8d8a86), 0.45), fog: false, side: THREE.DoubleSide })
    const body = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), stone)
    body.position.y = hgt + th / 2 - 0.05
    const ped = new THREE.Shape()
    ped.moveTo(-tw * 0.55, 0)
    ped.lineTo(tw * 0.55, 0)
    ped.lineTo(0, th * 0.45)
    ped.lineTo(-tw * 0.55, 0)
    const roof = new THREE.Mesh(new THREE.ShapeGeometry(ped), stone)
    roof.position.y = hgt + th - 0.05
    const door = new THREE.Mesh(new THREE.PlaneGeometry(tw * 0.16, th * 0.55), new THREE.MeshBasicMaterial({ color: 0xd99a50, fog: false }))
    door.position.set(0, hgt + th * 0.3, 0.02)
    temple.add(body, roof, door)
    temple.position.copy(p)
    temple.lookAt(0, L, 0)
    group.add(temple)
    const toUs = p.clone().normalize().multiplyScalar(-1)
    const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))
    lights.push(...p.clone().add(new THREE.Vector3(0, hgt + th * 0.3, 0)).addScaledVector(toUs, 0.5).toArray())
    for (let k = 1; k <= 7; k++) {
      const t = k / 8
      const x = Math.sin(t * 9) * w * 0.06
      const q = p.clone().addScaledVector(side, x).add(new THREE.Vector3(0, hgt * (1 - t) * 0.95 + 0.2, 0)).addScaledVector(toUs, 0.5)
      lights.push(q.x, q.y, q.z)
    }
  }

  // boats on the water
  const boats: number[] = []
  for (let k = 0; k < (arc < 6 ? 5 : 9); k++) {
    const a = centre + (r() - 0.5) * arc * 0.9
    const p = at(a, D * (0.5 + r() * 0.3))
    boats.push(p.x, L + 0.4, p.z)
  }

  const size = D * 0.008
  const lg = new THREE.BufferGeometry()
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3))
  const lightMat = new THREE.PointsMaterial({ map: glow, size, transparent: true, opacity: 0.9, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: 0xffbf72 })
  group.add(new THREE.Points(lg, lightMat))
  const bg = new THREE.BufferGeometry()
  bg.setAttribute('position', new THREE.Float32BufferAttribute(boats, 3))
  const boatMat = new THREE.PointsMaterial({ map: glow, size: size * 1.3, transparent: true, opacity: 0.85, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: 0xffb060 })
  group.add(new THREE.Points(bg, boatMat))
  scene.add(group)

  return (t) => {
    lightMat.opacity = 0.82 + 0.08 * Math.sin(t * 2.3)
    boatMat.opacity = 0.7 + 0.2 * Math.sin(t * 5.1) * Math.sin(t * 1.3)
  }
}

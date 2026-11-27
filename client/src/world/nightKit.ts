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
  opts: { strength?: number; radius?: number; threshold?: number; vignette?: number } = {},
): Post {
  const small = isSmallScreen()
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: small ? 2 : 4 }))
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), opts.strength ?? 0.55, opts.radius ?? 0.5, opts.threshold ?? 0.78))
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uAmount: { value: opts.vignette ?? 0.45 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform sampler2D tDiffuse; uniform float uAmount; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 1.15))); c.rgb *= mix(1.0 - uAmount, 1.0, v); c.rgb = mix(c.rgb, c.rgb * vec3(0.96, 0.99, 1.06), 0.5); gl_FragColor = c; }',
    }),
  )
  composer.addPass(new OutputPass())
  return {
    render: () => composer.render(),
    setSize: (w, h) => {
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(Math.max(1, w), Math.max(1, h))
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
export function addMilkyWay(scene: THREE.Scene, opts: { radius: number; a: THREE.Vector3; b: THREE.Vector3; minY?: number }) {
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
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haze, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, rotation: r() * 6 }))
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

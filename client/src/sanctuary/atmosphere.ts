import * as THREE from 'three'
import { surface } from '../world/textures'

/**
 * Everything that makes the Sanctuary feel alive rather than built: a sea
 * that moves and carries the moon's path, mist lying on the water, an
 * ancient galley crossing the bay, terraced olive groves and dry-stone walls
 * on the slopes, outcrops of rock, smoke from village hearths, and the odd
 * shooting star. Nothing modern. Each builder returns a per-frame update.
 */

export interface World {
  scene: THREE.Scene
  heightAt: (x: number, z: number) => number
  pathX: (z: number) => number
  /** places to keep clear: the five buildings and the village houses */
  keepClear: { x: number; z: number; r: number }[]
  glowTex: THREE.Texture
  small: boolean
}

export type Update = (t: number, dt: number) => void

let seed = 1234
const r = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}
const between = (a: number, b: number) => a + r() * (b - a)

function clear(w: World, x: number, z: number, pad = 0) {
  if (Math.abs(x - w.pathX(z)) < 0.9 + pad) return false
  return !w.keepClear.some((k) => Math.hypot(k.x - x, k.z - z) < k.r + pad)
}

function soft(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* --------------------------------- the sea --------------------------------- */

/** A moving sea: small waves, the moon's broken path of light, the sky in the far water. */
export function buildSea(w: World, moonPos: THREE.Vector3, level: number): Update {
  const fog = w.scene.fog as THREE.FogExp2
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMoon: { value: moonPos.clone() },
      uDeep: { value: new THREE.Color(0x060b15) },
      uSky: { value: new THREE.Color(0x2a3756) },
      uMoonCol: { value: new THREE.Color(0xfff1d2) },
      uFog: { value: fog.color.clone() },
      uDensity: { value: fog.density },
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
        // waves smaller than a pixel fade out instead of turning into moire
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
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat)
  sea.rotation.x = -Math.PI / 2
  sea.position.y = level
  w.scene.add(sea)
  // a pale line of surf where the water meets the shore
  return (t) => {
    mat.uniforms.uTime.value = t
  }
}

/* ---------------------------------- mist ---------------------------------- */

/** Low banks of mist on the water and in the hollows, drifting slowly. */
export function buildMist(w: World): Update {
  const tex = soft(256, (g, s) => {
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
  const banks: { s: THREE.Sprite; speed: number; base: number }[] = []
  const spots: [number, number, number, number][] = []
  for (let i = 0; i < 16; i++) spots.push([between(-70, 70), between(-90, -22), between(18, 40), between(0.4, 1.6)])
  for (let i = 0; i < 6; i++) spots.push([between(-16, 16), between(13, 22), between(10, 18), between(0.2, 0.6)])
  for (const [x, z, sc, y] of spots) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: between(0.2, 0.38) }))
    s.position.set(x, y, z)
    s.scale.set(sc, sc * 0.18, 1)
    w.scene.add(s)
    banks.push({ s, speed: between(0.2, 0.5), base: x })
  }
  return (t) => {
    banks.forEach((b, i) => {
      b.s.position.x = b.base + Math.sin(t * 0.02 * b.speed + i) * 6 + ((t * b.speed) % 40) - 20
    })
  }
}

/* ------------------------------- the galley ------------------------------- */

/** An ancient galley under a square sail, a lantern at the stern, crossing the bay and back. */
export function buildGalley(w: World): Update {
  const wood = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.9 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d150e, roughness: 1 })
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xcdb88e, roughness: 1, side: THREE.DoubleSide })
  const ship = new THREE.Group()
  // hull: a long tapered body with a raised curving stern
  const hullShape = new THREE.Shape()
  hullShape.moveTo(-2.4, 0.35)
  hullShape.quadraticCurveTo(-2.2, -0.15, -1.2, -0.25)
  hullShape.lineTo(1.6, -0.25)
  hullShape.quadraticCurveTo(2.4, -0.15, 2.6, 0.3)
  hullShape.lineTo(-2.4, 0.35)
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.8, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.2, bevelSegments: 3 }), wood)
  hull.position.z = -0.4
  ship.add(hull)
  const stern = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 16, Math.PI * 0.7), wood)
  stern.position.set(-2.35, 0.85, 0)
  stern.rotation.z = -0.3
  ship.add(stern)
  const ram = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), dark)
  ram.rotation.z = -Math.PI / 2
  ram.position.set(2.8, -0.1, 0)
  ship.add(ram)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 6), wood)
  mast.position.set(0.2, 1.8, 0)
  ship.add(mast)
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), wood)
  yard.rotation.x = Math.PI / 2
  yard.position.set(0.2, 3.1, 0)
  ship.add(yard)
  const sailGeo = new THREE.PlaneGeometry(2.4, 1.9, 8, 6)
  const sp = sailGeo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i)
    const y = sp.getY(i)
    sp.setZ(i, 0.35 * (1 - (x / 1.2) ** 2) * (0.6 + 0.4 * (1 - (y + 0.95) / 1.9)))
  }
  sailGeo.computeVertexNormals()
  const sail = new THREE.Mesh(sailGeo, sailMat)
  sail.rotation.y = Math.PI / 2
  sail.position.set(0.32, 2.1, 0)
  ship.add(sail)
  // a row of oars along each side
  for (const side of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4), dark)
      oar.position.set(-1.5 + k * 0.38, -0.15, side * 0.85)
      oar.rotation.x = side * 1.0
      ship.add(oar)
    }
  }
  const lantern = new THREE.Sprite(new THREE.SpriteMaterial({ map: w.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb860 }))
  lantern.position.set(-2.0, 0.9, 0)
  lantern.scale.set(1.4, 1.4, 1)
  ship.add(lantern)
  const light = new THREE.PointLight(0xffa050, 1.2 * Math.PI, 8, 2)
  light.position.set(-2.0, 1.0, 0)
  ship.add(light)
  ship.scale.setScalar(1.7)
  w.scene.add(ship)

  const Z = -40
  const SPAN = 75
  const SPEED = 0.9
  return (t) => {
    // sail across, turn, sail back
    const leg = (t * SPEED) / (SPAN * 2) + 0.18
    const ph = leg - Math.floor(leg)
    const out = ph < 0.5
    const k = out ? ph * 2 : (1 - ph) * 2
    const x = -SPAN + k * SPAN * 2
    ship.position.set(x, -0.35 + 0.06 * Math.sin(t * 1.1), Z + (out ? 0 : -9))
    ship.rotation.y = out ? 0 : Math.PI
    ship.rotation.x = 0.03 * Math.sin(t * 0.9)
    ship.rotation.z = 0.02 * Math.sin(t * 0.7)
    ;(lantern.material as THREE.SpriteMaterial).opacity = 0.85 + 0.15 * Math.sin(t * 6)
  }
}

/* ------------------------------ the hillside ------------------------------ */

/**
 * Terraces on the lower slopes: dry-stone walls along the contours with rows
 * of olive trees above them, rock outcrops breaking through the grass higher
 * up, and scrub scattered between.
 */
export function buildHillside(w: World, centre: { x: number; z: number }) {
  const stone = surface('stone_wall_04', { repeat: [2, 1], color: 0xb8b0a2, normal: 1.6 })
  const rockMat = surface('rock_04', { color: 0x9a9080, normal: 1.5 })
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3c4a33, roughness: 1, flatShading: true })
  const bark = new THREE.MeshStandardMaterial({ color: 0x2c241a, roughness: 1 })
  const scrubMat = new THREE.MeshStandardMaterial({ color: 0x26301f, roughness: 1, flatShading: true })
  const N_WALL = w.small ? 500 : 900
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stone, N_WALL)
  const olives = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leaf, 260)
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.045, 0.32, 5), bark, 260)
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), rockMat, 90)
  const scrub = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), scrubMat, 320)
  walls.castShadow = walls.receiveShadow = olives.castShadow = rocks.castShadow = rocks.receiveShadow = true
  const m = new THREE.Object3D()
  let wi = 0
  let oi = 0
  let ri = 0
  let si = 0

  // find, along a ray out from the summit, where the hill is at a given height
  const radiusAt = (ang: number, h: number) => {
    let lo = 0.5
    let hi = 30
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2
      const y = w.heightAt(centre.x + Math.sin(ang) * mid, centre.z + Math.cos(ang) * mid)
      if (y > h) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }

  // terraces: walls on contour lines, olives in a row just uphill of each
  for (const level of [0.55, 1.05, 1.6, 2.2, 2.85, 3.5]) {
    const steps = 260
    let prev: THREE.Vector3 | null = null
    for (let i = 0; i <= steps; i++) {
      const ang = -Math.PI * 0.95 + (i / steps) * Math.PI * 1.9
      const rad = radiusAt(ang, level)
      const p = new THREE.Vector3(centre.x + Math.sin(ang) * rad, level, centre.z + Math.cos(ang) * rad)
      const ok = clear(w, p.x, p.z, 0.25) && rad < 28
      if (prev && ok && wi < N_WALL) {
        const d = p.distanceTo(prev)
        if (d > 0.05 && d < 1.2) {
          const mid = prev.clone().add(p).multiplyScalar(0.5)
          m.position.set(mid.x, mid.y + 0.05, mid.z)
          m.rotation.set(0, Math.atan2(p.x - prev.x, p.z - prev.z), 0)
          m.scale.set(0.11, 0.13 + r() * 0.04, d + 0.04)
          m.updateMatrix()
          walls.setMatrixAt(wi++, m.matrix)
          // an olive just above the wall every so often
          if (i % 5 === 0 && oi < 260) {
            const ux = centre.x + Math.sin(ang) * (rad - 0.55)
            const uz = centre.z + Math.cos(ang) * (rad - 0.55)
            if (clear(w, ux, uz, 0.3)) {
              const y = w.heightAt(ux, uz)
              const sz = between(0.17, 0.27)
              m.rotation.set(0, r() * 6, 0)
              m.position.set(ux, y + 0.3 + sz * 0.45, uz)
              m.scale.set(sz * 1.35, sz * 0.9, sz * 1.25)
              m.updateMatrix()
              olives.setMatrixAt(oi, m.matrix)
              m.position.set(ux, y + 0.16, uz)
              m.scale.set(1, 1, 1)
              m.updateMatrix()
              trunks.setMatrixAt(oi, m.matrix)
              oi++
            }
          }
        }
      }
      prev = ok ? p : null
    }
  }

  // outcrops of rock higher up, and scrub everywhere between
  for (let k = 0; k < 2000 && (ri < 90 || si < 320); k++) {
    const x = between(-17, 17)
    const z = between(-17, 15)
    const y = w.heightAt(x, z)
    if (y < 0.15 || !clear(w, x, z, 0.2)) continue
    if (ri < 90 && y > 2.6 && r() < 0.25) {
      const sz = between(0.1, 0.32)
      m.position.set(x, y + sz * 0.05, z)
      m.rotation.set(r() * 3, r() * 3, r() * 3)
      m.scale.set(sz * between(1, 1.8), sz * between(0.4, 0.8), sz)
      m.updateMatrix()
      rocks.setMatrixAt(ri++, m.matrix)
    } else if (si < 320) {
      const sz = between(0.08, 0.2)
      m.position.set(x, y + sz * 0.4, z)
      m.rotation.set(0, r() * 6, 0)
      m.scale.set(sz * 1.3, sz * 0.8, sz * 1.2)
      m.updateMatrix()
      scrub.setMatrixAt(si++, m.matrix)
    }
  }
  walls.count = wi
  olives.count = trunks.count = oi
  rocks.count = ri
  scrub.count = si
  w.scene.add(walls, olives, trunks, rocks, scrub)
}

/* --------------------------- hearth smoke, stars --------------------------- */

/** Thin smoke from a few village hearths, leaning with the breeze. */
export function buildHearthSmoke(w: World, chimneys: THREE.Vector3[]): Update {
  const tex = soft(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    gr.addColorStop(0, 'rgba(200,205,220,.35)')
    gr.addColorStop(1, 'rgba(200,205,220,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, s, s)
  })
  const puffs: { s: THREE.Sprite; c: THREE.Vector3; ph: number }[] = []
  chimneys.forEach((c) => {
    for (let k = 0; k < 6; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }))
      w.scene.add(s)
      puffs.push({ s, c, ph: k / 6 })
    }
  })
  return (t) => {
    for (const p of puffs) {
      const l = (t * 0.08 + p.ph + p.c.x * 0.13) % 1
      p.s.position.set(p.c.x + l * 1.1, p.c.y + l * 1.8, p.c.z - l * 0.3)
      const sc = 0.2 + l * 0.9
      p.s.scale.set(sc, sc, 1)
      p.s.material.opacity = Math.sin(l * Math.PI) * 0.45
    }
  }
}

/** Now and then a shooting star crosses the sky. */
export function buildShootingStars(w: World): Update {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3))
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false })
  const line = new THREE.Line(geo, mat)
  w.scene.add(line)
  let next = 4
  let start = -1
  const from = new THREE.Vector3()
  const dir = new THREE.Vector3()
  return (t) => {
    if (start < 0 && t > next) {
      start = t
      from.set(between(-90, 60), between(28, 55), between(-150, -120))
      dir.set(between(0.6, 1), between(-0.5, -0.25), 0).normalize()
    }
    if (start >= 0) {
      const k = (t - start) / 0.9
      if (k > 1) {
        start = -1
        next = t + between(7, 16)
        mat.opacity = 0
        return
      }
      const head = from.clone().addScaledVector(dir, k * 45)
      const tail = head.clone().addScaledVector(dir, -9)
      const a = geo.attributes.position as THREE.BufferAttribute
      a.setXYZ(0, tail.x, tail.y, tail.z)
      a.setXYZ(1, head.x, head.y, head.z)
      a.needsUpdate = true
      mat.opacity = Math.sin(k * Math.PI) * 0.9
    }
  }
}

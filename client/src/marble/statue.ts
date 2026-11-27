import * as THREE from 'three'

/**
 * Marble statues of the philosophers, built from simple shapes so they load
 * instantly and share one look. Each thinker gets their own hair, beard and
 * headwear, drawn from how they are usually shown, so Plato and Buddha are
 * never the same statue. Used seated at the Symposium and as busts in the
 * Hall of Minds.
 */

type Hair = 'bald' | 'fringe' | 'tonsure' | 'receding' | 'short' | 'curly' | 'wavy' | 'long' | 'wig' | 'tall' | 'bun' | 'bob' | 'curls'
type Beard = 'none' | 'goatee' | 'short' | 'full' | 'long' | 'huge'
type Headwear = 'none' | 'laurel' | 'turban' | 'cap' | 'topknot' | 'veil'

export interface Look {
  hair: Hair
  beard: Beard
  moustache?: boolean
  head?: Headwear
  glasses?: boolean
  female?: boolean
  /** 0 = slight, 1 = broad */
  build?: number
}

const LOOKS: Record<string, Look> = {
  socrates: { hair: 'fringe', beard: 'full', moustache: true, build: 0.9 },
  plato: { hair: 'short', beard: 'long', moustache: true, build: 1 },
  aristotle: { hair: 'short', beard: 'short', moustache: true, head: 'laurel', build: 0.6 },
  epicurus: { hair: 'receding', beard: 'long', moustache: true, build: 0.5 },
  marcus: { hair: 'curly', beard: 'full', moustache: true, head: 'laurel', build: 0.8 },
  augustine: { hair: 'receding', beard: 'full', moustache: true, build: 0.5 },
  aquinas: { hair: 'tonsure', beard: 'none', build: 1 },
  descartes: { hair: 'long', beard: 'goatee', moustache: true, build: 0.4 },
  hobbes: { hair: 'long', beard: 'goatee', moustache: true, build: 0.4 },
  locke: { hair: 'long', beard: 'none', build: 0.3 },
  hume: { hair: 'wig', beard: 'none', build: 1 },
  rousseau: { hair: 'wig', beard: 'none', build: 0.4 },
  kant: { hair: 'wig', beard: 'none', build: 0.2 },
  smith: { hair: 'wig', beard: 'none', build: 0.6 },
  machiavelli: { hair: 'short', beard: 'none', head: 'cap', build: 0.3 },
  burke: { hair: 'wig', beard: 'none', build: 0.5 },
  wollstonecraft: { hair: 'bun', beard: 'none', female: true, build: 0.3 },
  bentham: { hair: 'long', beard: 'none', build: 0.6 },
  mill: { hair: 'receding', beard: 'none', build: 0.3 },
  hegel: { hair: 'receding', beard: 'none', build: 0.7 },
  marx: { hair: 'wavy', beard: 'huge', moustache: true, build: 1 },
  kierkegaard: { hair: 'tall', beard: 'none', build: 0.1 },
  nietzsche: { hair: 'tall', beard: 'none', moustache: true, build: 0.5 },
  rawls: { hair: 'short', beard: 'none', build: 0.4 },
  nozick: { hair: 'curly', beard: 'none', build: 0.5 },
  wittgenstein: { hair: 'curly', beard: 'none', build: 0.2 },
  popper: { hair: 'bald', beard: 'none', build: 0.4 },
  arendt: { hair: 'bob', beard: 'none', female: true, build: 0.5 },
  berlin: { hair: 'bald', beard: 'none', glasses: true, build: 0.8 },
  hayek: { hair: 'receding', beard: 'none', moustache: true, build: 0.4 },
  keynes: { hair: 'receding', beard: 'none', moustache: true, build: 0.4 },
  sartre: { hair: 'receding', beard: 'none', glasses: true, build: 0.4 },
  camus: { hair: 'short', beard: 'none', build: 0.5 },
  beauvoir: { hair: 'bun', beard: 'none', head: 'turban', female: true, build: 0.3 },
  foucault: { hair: 'bald', beard: 'none', glasses: true, build: 0.5 },
  fanon: { hair: 'short', beard: 'none', moustache: true, build: 0.5 },
  confucius: { hair: 'long', beard: 'long', moustache: true, head: 'topknot', build: 0.7 },
  mencius: { hair: 'long', beard: 'long', moustache: true, head: 'topknot', build: 0.5 },
  laozi: { hair: 'receding', beard: 'long', moustache: true, build: 0.3 },
  buddha: { hair: 'curls', beard: 'none', build: 0.6 },
  ibnrushd: { hair: 'short', beard: 'full', moustache: true, head: 'turban', build: 0.6 },
  singer: { hair: 'receding', beard: 'none', build: 0.3 },
  nussbaum: { hair: 'long', beard: 'none', female: true, build: 0.3 },
  thomson: { hair: 'bob', beard: 'none', female: true, build: 0.3 },
  sen: { hair: 'wavy', beard: 'none', glasses: true, build: 0.4 },
  parfit: { hair: 'wavy', beard: 'none', build: 0.2 },
  anscombe: { hair: 'bob', beard: 'none', female: true, head: 'veil', build: 0.4 },
}

export function lookFor(id: string): Look {
  return LOOKS[id] ?? { hair: 'short', beard: 'short', moustache: true, build: 0.5 }
}

/* ------------------------------- materials ------------------------------- */

const rand = (a: number, b: number) => a + Math.random() * (b - a)

let shared: StatueMaterials | null = null

export interface StatueMaterials {
  marble: THREE.MeshStandardMaterial
  /** A little darker, for hair, beards and eyes, so features read in low light. */
  carved: THREE.MeshStandardMaterial
  gilt: THREE.MeshStandardMaterial
  bronze: THREE.MeshStandardMaterial
  base: THREE.MeshStandardMaterial
}

export function marbleTexture(base = '#E9E2D2', veins = '#7C7262') {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(110,100,80,${rand(0.01, 0.045)})`
    g.beginPath()
    g.arc(rand(0, 512), rand(0, 512), rand(8, 70), 0, Math.PI * 2)
    g.fill()
  }
  const vein = (w: number, a: number) => {
    g.strokeStyle = veins
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
  for (let v = 0; v < 6; v++) vein(rand(0.6, 1.6), rand(0.1, 0.26))
  for (let v = 0; v < 10; v++) vein(rand(0.3, 0.7), rand(0.05, 0.12))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function statueMaterials(): StatueMaterials {
  if (shared) return shared
  const tex = marbleTexture()
  shared = {
    marble: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.02 }),
    carved: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.0, color: 0xebe4d6 }),
    gilt: new THREE.MeshStandardMaterial({ color: 0xc9a24f, roughness: 0.32, metalness: 0.85 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x4a3622, roughness: 0.4, metalness: 0.8 }),
    base: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.02, color: 0x6f6c69 }),
  }
  return shared
}

/* --------------------------------- building -------------------------------- */

export interface Statue {
  root: THREE.Group
  /** Turns to look; rotate on y (left/right) and x (nod). */
  head: THREE.Group
  /** Leans the upper body; rotate on x. */
  torso: THREE.Group
  /** Local point just above the head, for name plates. */
  top: THREE.Vector3
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/* --------------------------- the sculpted head --------------------------- */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const gauss = (dx: number, dy: number, dz: number, sx: number, sy: number, sz: number) => Math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2 + (dz / sz) ** 2))

// Small deterministic 3D value noise, for curls and chisel marks.
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf)
  const l = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz)
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}
/** Rounded bumps, like carved ringlets. */
const curlField = (x: number, y: number, z: number, f: number) => {
  const n = noise(x * f, y * f, z * f)
  return Math.pow(Math.abs(Math.sin(n * 6.283 * 1.5)), 0.6)
}

/** Deforms a unit sphere vertex by vertex: `shape` gets the direction and returns the new position. */
let detail = 1
/** Fewer polygons for scenes with many statues (the Hall); 1 is full detail. */
export function setStatueDetail(d: number) {
  detail = Math.max(0.4, Math.min(1, d))
}

function sculpt(segW: number, segH: number, shape: (d: THREE.Vector3, out: THREE.Vector3) => void) {
  const geo = new THREE.SphereGeometry(1, Math.max(16, Math.round(segW * detail)), Math.max(12, Math.round(segH * detail)))
  const pos = geo.attributes.position as THREE.BufferAttribute
  const d = new THREE.Vector3()
  const out = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize()
    shape(d, out)
    pos.setXYZ(i, out.x, out.y, out.z)
  }
  geo.computeVertexNormals()
  return geo
}

const HEAD = 0.115

/** Where the face skin sits for a direction (before the head's overall scale). */
/** Each thinker's own proportions, so faces differ as well as hair. */
interface Face {
  fem: boolean
  nose: number // length and projection
  noseW: number
  hook: number // a bump on the bridge
  jaw: number // 0 narrow, 1 broad
  brow: number // heaviness of the brow ridge
  lips: number
  long: number // face length
  age: number // 0 smooth, 1 lined
  pupils: boolean // carved pupils, as on Roman and later portraits
}

const OLD = new Set(['socrates', 'plato', 'laozi', 'confucius', 'kant', 'marx', 'hobbes', 'augustine', 'aquinas', 'bentham', 'hegel', 'popper', 'berlin', 'anscombe', 'epicurus', 'smith', 'locke', 'burke', 'mencius'])
const NO_PUPILS = new Set(['socrates', 'plato', 'aristotle', 'epicurus', 'confucius', 'mencius', 'laozi', 'buddha'])
const NOSES: Record<string, Partial<Face>> = {
  socrates: { nose: 0.75, noseW: 1.45, jaw: 0.9, brow: 1.2, long: 0.92, lips: 1.25 },
  descartes: { nose: 1.2, hook: 0.6 },
  machiavelli: { nose: 1.15, hook: 0.5, lips: 0.7, long: 1.06 },
  kant: { nose: 1.2, hook: 0.4, jaw: 0.2, long: 1.05 },
  rousseau: { nose: 1.1, hook: 0.3 },
  nietzsche: { brow: 1.4, jaw: 0.7 },
  marx: { brow: 1.2, nose: 1.05, noseW: 1.2 },
  wittgenstein: { nose: 1.1, long: 1.08, jaw: 0.4 },
  sartre: { nose: 0.95, noseW: 1.2, lips: 1.2, jaw: 0.6 },
  beauvoir: { nose: 1.0, long: 1.04 },
  buddha: { nose: 0.95, lips: 1.2, brow: 0.5, long: 1.04 },
  confucius: { brow: 1.1 },
  hobbes: { long: 1.08, jaw: 0.3 },
  hume: { jaw: 1, long: 0.96, lips: 1.15 },
  aquinas: { jaw: 1, long: 0.95 },
  augustine: { long: 1.08, jaw: 0.3 },
}

function faceFor(id: string, look: Look): Face {
  // stable variation from the name, so every visit shows the same face
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  const r = (n: number) => {
    const x = Math.sin((h >>> 0) * 0.0001 + n * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }
  const fem = !!look.female
  return {
    fem,
    nose: 0.88 + r(1) * 0.3,
    noseW: 0.9 + r(2) * 0.25,
    hook: r(3) < 0.3 ? r(4) * 0.5 : 0,
    jaw: fem ? r(5) * 0.35 : 0.3 + r(5) * 0.6,
    brow: fem ? 0.4 + r(6) * 0.3 : 0.8 + r(6) * 0.4,
    lips: (fem ? 1.1 : 0.85) + r(7) * 0.3,
    long: 0.96 + r(8) * 0.08,
    age: OLD.has(id) ? 0.7 + r(9) * 0.3 : r(9) * 0.35,
    pupils: !NO_PUPILS.has(id),
    ...NOSES[id],
  }
}

let currentFace: Face = { fem: false, nose: 1, noseW: 1, hook: 0, jaw: 0.5, brow: 1, lips: 1, long: 1, age: 0.3, pupils: false }

/**
 * Where the face's skin sits for a direction on the unit sphere. The skull
 * is shaped first, then the features are carved forward from the face's
 * plane, so the profile reads (brow, nose, lips, chin) in side light.
 */
function faceShape(d: THREE.Vector3, _fem: boolean, out: THREE.Vector3) {
  const f = currentFace
  const { x, y, z } = d
  const ax = Math.abs(x)
  // the skull: narrower than deep, the back fuller, the jaw tapering to the chin
  const jawT = y < 0 ? Math.min(1, -y) : 0
  const jawW = 1 - (f.fem ? 0.34 : 0.3 - 0.14 * f.jaw) * jawT * jawT - 0.06 * jawT
  let px = x * 0.8 * jawW
  let py = y * 1.08 * f.long
  let pz = z * (z < 0 ? 1.02 : 0.92)
  // temples a little hollow, cheekbones and ears out to the side
  let side = 0
  side -= 0.035 * gauss(ax - 0.75, y - 0.3, z - 0.45, 0.14, 0.16, 0.3)
  side += 0.05 * gauss(ax - 0.6, y + 0.08, z - 0.62, 0.16, 0.1, 0.2)
  side += (f.fem ? 0.06 : 0.085) * gauss(ax - 0.98, y - 0.04, z + 0.02, 0.1, 0.2, 0.14)
  px *= 1 + side
  pz *= 1 + side * 0.5

  // features carved forward from the face plane
  const face = smooth(0.25, 0.75, z)
  let fwd = 0
  // brow ridge, a softer glabella between the brows
  fwd += 0.07 * f.brow * gauss(ax - 0.28, y - 0.22, 0, 0.2, 0.06, 1) + 0.035 * f.brow * gauss(x, y - 0.2, 0, 0.08, 0.06, 1)
  // forehead rounding forward
  fwd += 0.04 * gauss(x, y - 0.5, 0, 0.45, 0.25, 1)
  // eye sockets, the eyeballs within them, the lid crease above, a line beneath
  const ex = ax - 0.29
  const ey = y - 0.08
  fwd -= 0.15 * gauss(ex, ey, 0, 0.17, 0.11, 1)
  fwd += 0.1 * gauss(ex, ey + 0.005, 0, 0.11, 0.05, 1) // the eye
  fwd += 0.022 * gauss(ex, ey - 0.045, 0, 0.12, 0.018, 1) // upper lid edge
  fwd -= 0.018 * gauss(ex, ey - 0.075, 0, 0.12, 0.014, 1) // crease
  fwd += 0.012 * gauss(ex, ey + 0.05, 0, 0.1, 0.014, 1) // lower lid
  if (f.pupils) fwd -= 0.016 * gauss(ex, ey, 0, 0.022, 0.022, 1)
  // the nose: a bridge rising from between the eyes to a tip, wings either side, nostrils beneath
  const ny = y // 0.14 at the bridge, -0.24 at the tip
  const along = smooth(0.16, 0.02, ny) * smooth(-0.32, -0.22, ny)
  const toTip = clamp01((0.16 - ny) / 0.4)
  const nw = (0.055 + 0.05 * toTip) * f.noseW
  const bridge = Math.exp(-((x / nw) ** 2))
  fwd += f.nose * (0.06 + 0.17 * toTip) * bridge * along
  fwd += f.hook * 0.05 * gauss(x, ny - 0.0, 0, 0.05, 0.06, 1)
  fwd += 0.05 * f.nose * gauss(x, ny + 0.23, 0, 0.065 * f.noseW, 0.05, 1) // the tip
  fwd += 0.055 * gauss(ax - 0.1 * f.noseW, ny + 0.24, 0, 0.055, 0.045, 1) // the wings
  fwd -= 0.04 * gauss(ax - 0.06 * f.noseW, ny + 0.285, 0, 0.03, 0.018, 1) // nostrils
  fwd -= 0.03 * gauss(x, ny + 0.29, 0, 0.18, 0.025, 1) // under the nose
  // the mouth: philtrum, a bowed upper lip, the line between, a fuller lower lip, shadowed corners
  fwd -= 0.012 * gauss(x, y + 0.33, 0, 0.025, 0.03, 1)
  const bow = 0.008 * Math.cos(x * 22) * gauss(x, 0, 0, 0.08, 1, 1)
  fwd += 0.05 * f.lips * gauss(x, y + 0.385 + bow, 0, 0.17, 0.032, 1)
  fwd -= 0.04 * gauss(x, y + 0.418, 0, 0.18, 0.009, 1)
  fwd += 0.048 * f.lips * gauss(x, y + 0.455, 0, 0.14, 0.035, 1)
  fwd -= 0.02 * gauss(ax - 0.19, y + 0.42, 0, 0.03, 0.035, 1)
  // under the lip, then the chin
  fwd -= 0.025 * gauss(x, y + 0.54, 0, 0.14, 0.03, 1)
  fwd += (f.fem ? 0.05 : 0.08) * gauss(x, y + 0.66, 0, 0.17, 0.09, 1)
  if (!f.fem) fwd -= 0.012 * f.jaw * gauss(x, y + 0.68, 0, 0.015, 0.05, 1) // a cleft on broad jaws
  // age: folds from nose to mouth, lines on the forehead, hollows under the eyes
  if (f.age > 0.1) {
    const foldX = 0.17 + 0.14 * clamp01(-(y + 0.24) / 0.22)
    fwd -= 0.03 * f.age * gauss(ax - foldX, y + 0.33, 0, 0.022, 0.12, 1) * smooth(-0.15, -0.25, y)
    fwd -= 0.012 * f.age * Math.max(0, Math.sin(y * 48)) * gauss(x, y - 0.5, 0, 0.35, 0.12, 1)
    fwd -= 0.015 * f.age * gauss(ex, ey + 0.11, 0, 0.12, 0.025, 1)
  }
  pz += fwd * face
  // a strong chin carries the jaw line forward
  if (y < -0.35 && z > 0) pz += 0.05 * smooth(-0.35, -0.8, y) * z
  out.set(px, py, pz)
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** How much hair covers a direction (0 bare, 1 hair), per style. */
function hairMask(hair: Hair, d: THREE.Vector3) {
  const { y, z } = d
  const ax = Math.abs(d.x)
  // the usual hairline: high at the forehead, low at the nape, around the ears
  const line = (front: number, back: number) => {
    const lim = back + (front - back) * smooth(-0.3, 0.85, z)
    const ear = gauss(ax - 0.95, y - 0.04, z + 0.02, 0.18, 0.26, 0.22) // keep the ears clear
    return smooth(lim - 0.05, lim + 0.06, y) * (1 - ear)
  }
  switch (hair) {
    case 'bald':
      return smooth(-0.3, -0.18, y) * smooth(0.35, 0.18, y) * smooth(0.35, 0.05, z) * (1 - gauss(ax - 0.95, y - 0.04, z, 0.15, 0.25, 0.2))
    case 'fringe':
      return smooth(-0.35, -0.2, y) * smooth(0.45, 0.25, y) * smooth(0.5, 0.15, z) * (1 - gauss(ax - 0.95, y - 0.04, z, 0.15, 0.25, 0.2))
    case 'tonsure':
      return smooth(0.3, 0.38, y) * smooth(0.68, 0.6, y) * smooth(0.95, 0.7, z)
    case 'receding':
      return line(0.62, -0.32) * (1 - smooth(0.55, 0.85, y) * smooth(-0.35, 0.1, z))
    case 'curls':
      return line(0.4, -0.25)
    case 'long':
    case 'bob':
      return line(0.42, -2) * (1 - smooth(0.45, 0.75, z) * smooth(0.5, 0.35, y))
    case 'wavy':
      return line(0.45, -0.55)
    case 'wig':
      return line(0.48, -0.5)
    default:
      return line(0.45, -0.32)
  }
}

function hairShape(look: Look, d: THREE.Vector3, out: THREE.Vector3) {
  faceShape(d, !!look.female, out)
  const m = hairMask(look.hair, d)
  const { x, y, z } = d
  let thick = 0.05
  let curl = 0
  let freq = 9
  switch (look.hair) {
    case 'curly': thick = 0.1; curl = 0.07; freq = 7; break
    case 'curls': thick = 0.06; curl = 0.05; freq = 13; break
    case 'wavy': thick = 0.12; curl = 0.05; freq = 5; break
    case 'wig': thick = 0.1; curl = 0.02; freq = 4; break
    case 'fringe': thick = 0.08; curl = 0.06; freq = 8; break
    case 'tall': thick = 0.07 + 0.22 * smooth(0.45, 0.95, y) * smooth(-0.6, 0.2, z); curl = 0.02; break
    case 'long': thick = 0.08; curl = 0.02; freq = 4; break
    case 'bob': thick = 0.09; curl = 0.015; freq = 4; break
    default: thick = 0.05; curl = 0.025; freq = 11
  }
  let r = thick + curl * curlField(x, y, z, freq)
  if (look.hair === 'wig') r += 0.04 * Math.abs(Math.sin(y * 14)) * smooth(0.5, 0.85, Math.abs(x)) * smooth(0.3, -0.1, y) // side rolls
  if (look.hair === 'long' || look.hair === 'wavy' || look.hair === 'bob') {
    // grooves running down, like carved locks
    r += 0.025 * Math.abs(Math.sin(Math.atan2(x, -z) * 18 + noise(x * 3, y * 3, z * 3) * 4)) * smooth(0.6, 0.1, y)
  }
  const k = 1 + r * m - (1 - m) * 0.06
  out.multiplyScalar(k)
  // long hair falls to the shoulders behind the face
  if ((look.hair === 'long' || look.hair === 'bob' || look.hair === 'wavy') && y < 0 && m > 0.5) {
    const drop = look.hair === 'long' ? 1.25 : look.hair === 'bob' ? 0.45 : 0.3
    out.y -= drop * -y * smooth(0.5, 0.0, z) * m
    out.x *= 1 + 0.12 * -y * m
  }
}

function beardMask(beard: Beard, d: THREE.Vector3) {
  const { x, y, z } = d
  const ax = Math.abs(x)
  const sides = smooth(-0.15, 0.25, z) // only the front and sides of the face
  if (beard === 'goatee') return smooth(-0.5, -0.58, y) * smooth(0.22, 0.12, ax) * sides
  // the beard line: below the lower lip at the centre, rising along the cheeks to the sideburns
  const lim = -0.52 + 0.28 * smooth(0.14, 0.42, ax) + (beard === 'short' ? 0.06 : 0.13) * smooth(0.5, 0.9, ax)
  return smooth(lim + 0.03, lim - 0.12, y) * sides * (1 - gauss(ax - 0.95, y, z, 0.12, 0.2, 0.2))
}

function beardShape(look: Look, d: THREE.Vector3, out: THREE.Vector3) {
  faceShape(d, false, out)
  const m = beardMask(look.beard, d)
  const { x, y, z } = d
  const big = look.beard === 'huge' ? 0.15 : look.beard === 'full' || look.beard === 'long' ? 0.085 : look.beard === 'goatee' ? 0.05 : 0.05
  const r = big + 0.045 * curlField(x, y, z, 9)
  // thin at the cheeks, full over the chin, so it grows out of the face rather than sitting on it
  const fullness = 0.35 + 0.65 * smooth(-0.25, -0.6, y)
  out.multiplyScalar(1 + r * m * fullness - (1 - m) * 0.03)
  if (m > 0.3 && y < -0.4) {
    const len = look.beard === 'long' ? 0.9 : look.beard === 'huge' ? 0.55 : look.beard === 'full' ? 0.25 : look.beard === 'goatee' ? 0.15 : 0.08
    out.y -= len * smooth(-0.4, -1, y) * m
    out.z += len * 0.25 * smooth(-0.4, -1, y) * m
  }
}

/** A head on a neck, carved with its own hair, beard and headwear. Origin at the base of the neck. */
export function buildHead(id: string, mats = statueMaterials()): THREE.Group {
  const look = lookFor(id)
  const { marble, carved, gilt, bronze } = mats
  const g = new THREE.Group()
  const fem = !!look.female
  currentFace = faceFor(id, look)
  const head = new THREE.Group()
  head.position.set(0, 0.19, 0)
  head.scale.setScalar(HEAD)
  g.add(head)

  g.add(mesh(new THREE.CylinderGeometry(0.046 * (fem ? 0.88 : 1), 0.058, 0.15, 24), marble, 0, 0.05, -0.008))
  head.add(mesh(sculpt(176, 132, (d, o) => faceShape(d, fem, o)), marble))
  head.add(mesh(sculpt(96, 72, (d, o) => hairShape(look, d, o)), carved))
  if (look.beard !== 'none') head.add(mesh(sculpt(80, 60, (d, o) => beardShape(look, d, o)), carved))
  if (look.moustache) {
    head.add(
      mesh(
        sculpt(80, 60, (d, o) => {
          faceShape(d, false, o)
          const droop = 0.3 * Math.abs(d.x)
          const m = gauss(d.x, d.y + 0.34 + droop, d.z - 0.92, 0.24, 0.035, 0.3) * smooth(0.5, 0.8, d.z)
          o.multiplyScalar(1 + (0.07 + 0.03 * curlField(d.x, d.y, d.z, 14)) * smooth(0.25, 0.6, m) - (1 - smooth(0.2, 0.5, m)) * 0.06)
        }),
        carved,
      ),
    )
  }

  switch (look.hair) {
    case 'bun':
      head.add(mesh(sculpt(32, 24, (d, o) => o.copy(d).multiplyScalar(0.42 + 0.04 * curlField(d.x, d.y, d.z, 6))), carved, 0, 0.62, -0.78))
      break
    case 'curls':
      head.add(mesh(sculpt(40, 30, (d, o) => o.copy(d).multiplyScalar(0.42 + 0.05 * curlField(d.x, d.y, d.z, 12))), carved, 0, 1.08, -0.08))
      break
    case 'wig':
      head.add(mesh(new THREE.CapsuleGeometry(0.12, 0.35, 6, 12), carved, 0, -0.45, -1.0))
      break
  }

  switch (look.head) {
    case 'laurel': {
      const ring = new THREE.Group()
      const leaf = new THREE.SphereGeometry(0.16, 10, 8)
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 1.75 - Math.PI * 1.37
        const l = mesh(leaf, gilt, Math.cos(a) * 0.98, (i % 2) * 0.06, Math.sin(a) * 1.02, 0.45, 0.3, 1.3)
        l.rotation.y = -a + (i % 2 ? 0.6 : -0.2)
        ring.add(l)
      }
      ring.position.set(0, 0.5, -0.06)
      ring.rotation.x = -0.22
      head.add(ring)
      break
    }
    case 'turban':
      head.add(
        mesh(
          sculpt(64, 40, (d, o) => {
            faceShape(d, fem, o)
            const m = smooth(0.15, 0.3, d.y - 0.25 * Math.max(0, d.z))
            const wrap = 0.05 * Math.abs(Math.sin((d.y * 1.4 + Math.atan2(d.x, d.z) * 0.25) * 9))
            o.multiplyScalar(1 + (0.2 + wrap) * m - (1 - m) * 0.06)
            o.y += 0.25 * m * smooth(0.3, 0.9, d.y)
          }),
          carved,
        ),
      )
      break
    case 'cap':
      head.add(mesh(new THREE.CylinderGeometry(0.88, 0.96, 0.5, 40), carved, 0, 0.78, -0.08))
      break
    case 'topknot':
      head.add(mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.45, 20), carved, 0, 1.2, -0.12))
      head.add(mesh(new THREE.SphereGeometry(0.27, 20, 14), carved, 0, 1.45, -0.12))
      head.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), gilt, 0, 1.38, -0.12).rotateZ(Math.PI / 2))
      break
    case 'veil':
      head.add(
        mesh(
          sculpt(64, 40, (d, o) => {
            faceShape(d, fem, o)
            const m = (1 - smooth(0.5, 0.75, d.z) * smooth(0.55, 0.4, d.y)) * smooth(-0.4, -0.2, d.y + 0.5 * (1 - d.z))
            o.multiplyScalar(1 + 0.16 * m - (1 - m) * 0.06)
            if (d.y < 0 && m > 0.5) o.y -= 0.8 * -d.y * smooth(0.4, -0.2, d.z)
          }),
          carved,
        ),
      )
      break
  }

  if (look.glasses) {
    ;[-1, 1].forEach((s) => {
      head.add(mesh(new THREE.TorusGeometry(0.135, 0.022, 8, 28), bronze, s * 0.235, 0.085, 0.99))
      const arm = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 6), bronze, s * 0.38, 0.1, 0.68)
      arm.rotation.x = Math.PI / 2
      arm.rotation.z = s * 0.12
      head.add(arm)
    })
    head.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), bronze, 0, 0.1, 1.0).rotateZ(Math.PI / 2))
  }
  return g
}

/** A rounded box: directions pushed toward the corners (smaller e is boxier). */
function superDir(d: THREE.Vector3, e: number, out: THREE.Vector3) {
  out.set(Math.sign(d.x) * Math.abs(d.x) ** e, Math.sign(d.y) * Math.abs(d.y) ** e, Math.sign(d.z) * Math.abs(d.z) ** e)
  return out
}

/** A seated upper body: broad sloping shoulders, a slightly narrower waist, drapery across the chest. Origin at the hips. */
function torsoGeometry(shoulder: number, height: number, depth: number) {
  const q = new THREE.Vector3()
  return sculpt(80, 64, (d, o) => {
    superDir(d, 0.55, q)
    const h = q.y * 0.5 + 0.5
    const width = shoulder * (0.9 - 0.08 * smooth(0.2, 0.55, h) * smooth(0.95, 0.6, h) + 0.1 * smooth(0.6, 0.85, h)) * (1 - 0.5 * smooth(0.9, 1, h))
    let px = q.x * width
    let py = h * height - 0.09 * q.x * q.x * smooth(0.7, 1, h) * height
    let pz = q.z * depth * (1 - 0.3 * smooth(0.85, 1, h))
    const band = gauss(q.x * 0.8 + (h * 2 - 1) * 0.9 - 0.1, 0, 0, 0.5, 1, 1) * smooth(-0.2, 0.4, q.z)
    const folds = 0.045 * Math.abs(Math.sin((q.x * 0.7 + h * 2) * 12)) * band
    pz += q.z * folds * 2.5 * depth
    px += q.x * folds * shoulder * 0.5
    o.set(px, py, pz)
  })
}

/** The robe over the lap and down to the floor, knees forward under the cloth. Origin on the floor. */
function robeGeometry(seat: number, width: number) {
  const q = new THREE.Vector3()
  return sculpt(80, 64, (d, o) => {
    superDir(d, 0.5, q)
    const h = q.y * 0.5 + 0.5
    const lapTop = smooth(0.7, 1, h)
    const front = q.z > 0 ? 1 : 0
    // front: feet forward at the floor, knees further forward at the lap; back: straight
    const depth = front ? 0.3 + 0.16 * smooth(0, 0.92, h) : 0.22
    const pleat = 0.016 * Math.abs(Math.sin(Math.atan2(q.x, q.z) * 14)) * (1 - lapTop)
    const kneeGap = 1 - 0.1 * gauss(q.x, 0, 0, 0.1, 1, 1) * lapTop * front
    o.set(q.x * (width + pleat) * (1 + 0.08 * (1 - h)), h * (seat + 0.1) * kneeGap, q.z * (depth + pleat))
  })
}

/** A draped chest and shoulders, carved with folds of cloth. Origin at its base; the neck rises from the top. */
function chestGeometry(shoulder: number, height: number, depth: number) {
  return sculpt(80, 60, (d, o) => {
    const { x, y, z } = d
    const top = smooth(0.1, 0.9, y)
    const under = y < 0 ? 1 + y * 0.55 : 1 // a rounded underside
    let px = x * shoulder * (1 - 0.35 * top * top) * under
    const py = (y * 0.5 + 0.5) * height
    let pz = z * depth * (1 - 0.25 * top) * under
    // the himation: folds running diagonally from the left shoulder across the chest
    const band = gauss(x * 0.8 + y * 0.9 - 0.1, 0, 0, 0.45, 1, 1) * smooth(-0.2, 0.4, z)
    const folds = 0.05 * Math.abs(Math.sin((x * 0.7 + y) * 13)) * band
    px += x * folds * shoulder
    pz += z * folds * depth * 2.2
    o.set(px, py, pz)
  })
}

/** A seated, robed philosopher. Origin on the floor; faces +z. */
export function buildSeated(id: string, mats = statueMaterials()): Statue {
  const look = lookFor(id)
  const { marble, base } = mats
  const fem = !!look.female
  const b = look.build ?? 0.5
  const shoulder = (fem ? 0.19 : 0.21) + b * 0.03
  const SEAT = 0.46

  const root = new THREE.Group()
  root.add(mesh(new THREE.CylinderGeometry(0.22, 0.25, SEAT - 0.02, 32), base, 0, (SEAT - 0.02) / 2, -0.1))

  root.add(mesh(robeGeometry(SEAT, 0.25 + b * 0.02), marble, 0, 0, 0.02))

  const torso = new THREE.Group()
  torso.position.set(0, SEAT + 0.02, -0.05)
  root.add(torso)
  torso.add(mesh(torsoGeometry(shoulder, 0.56, 0.14), marble))

  // arms in their sleeves, resting in the lap
  ;[-1, 1].forEach((s) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * (shoulder - 0.02), 0.48, 0.0),
      new THREE.Vector3(s * (shoulder + 0.02), 0.34, 0.03),
      new THREE.Vector3(s * (shoulder - 0.0), 0.2, 0.1),
      new THREE.Vector3(s * 0.12, 0.13, 0.25),
      new THREE.Vector3(s * 0.05, 0.12, 0.3),
    ])
    const arm = new THREE.TubeGeometry(curve, 40, 0.055, 16)
    const pos = arm.attributes.position as THREE.BufferAttribute
    // taper from a full sleeve at the shoulder to the wrist
    const tmp = new THREE.Vector3()
    const pts = curve.getSpacedPoints(40)
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / 17)
      const t = ring / 40
      const c = pts[Math.min(ring, 40)]
      tmp.fromBufferAttribute(pos, i).sub(c).multiplyScalar(1.25 - 0.55 * t).add(c)
      pos.setXYZ(i, tmp.x, tmp.y, tmp.z)
    }
    arm.computeVertexNormals()
    torso.add(mesh(arm, marble))
    torso.add(mesh(new THREE.SphereGeometry(0.04, 16, 12), marble, s * 0.045, 0.12, 0.31, 1, 0.55, 1.3))
  })

  const head = new THREE.Group()
  head.position.set(0, 0.53, 0.01)
  head.add(buildHead(id, mats))
  head.scale.setScalar(1.25)
  torso.add(head)

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return { root, head, torso, top: new THREE.Vector3(0, SEAT + 0.02 + 0.53 + 0.5, 0) }
}

/** A bust on a plinth. Origin on the floor; faces +z. */
export function buildBust(id: string, mats = statueMaterials()): Statue {
  const look = lookFor(id)
  const { marble, base } = mats
  const b = look.build ?? 0.5
  const shoulder = (look.female ? 0.17 : 0.19) + b * 0.03
  const root = new THREE.Group()
  const PLINTH = 1.05
  root.add(mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), base, 0, 0.03, 0))
  root.add(mesh(new THREE.BoxGeometry(0.34, PLINTH - 0.12, 0.34), base, 0, PLINTH / 2, 0))
  root.add(mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), base, 0, PLINTH - 0.03, 0))
  root.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 24), marble, 0, PLINTH + 0.04, 0))
  const torso = new THREE.Group()
  torso.position.y = PLINTH + 0.06
  root.add(torso)
  torso.add(mesh(chestGeometry(shoulder + 0.03, 0.3, 0.13), marble))
  const head = new THREE.Group()
  head.position.set(0, 0.24, 0.005)
  head.add(buildHead(id, mats))
  head.scale.setScalar(1.3)
  torso.add(head)
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return { root, head, torso, top: new THREE.Vector3(0, PLINTH + 0.06 + 0.24 + 0.5, 0) }
}

import * as THREE from 'three'

/**
 * Real scanned surfaces (Poly Haven, CC0) for the night world: colour,
 * surface relief (normal) and roughness for each. Files live in
 * public/textures/<id>/{diff,nor,rough}.jpg. Materials are returned at
 * once and fill in as their images arrive.
 */

export type Surface =
  | 'marble_01' // cut marble blocks: steps, platforms, floors
  | 'stone_wall_04' // pale stones set in earth: dry-stone walls
  | 'painted_plaster_wall' // whitewash: village houses
  | 'rock_04' // weathered rock: outcrops, ledges
  | 'aerial_grass_rock' // grass broken by rock, seen from above: hillsides
  | 'grey_stone_path' // flagstones: paths
  | 'seaworn_stone_tiles' // sea-worn ashlar: the Hall's walls

const loader = new THREE.TextureLoader()
const images = new Map<string, THREE.Texture>()

function load(url: string, srgb: boolean) {
  let base = images.get(url)
  if (!base) {
    base = loader.load(url)
    base.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    base.wrapS = base.wrapT = THREE.RepeatWrapping
    base.anisotropy = 8
    images.set(url, base)
  }
  // a clone shares the image but keeps its own repeat
  const t = base.clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function surface(
  id: Surface,
  opts: { repeat?: [number, number]; color?: THREE.ColorRepresentation; roughness?: number; normal?: number; vertexColors?: boolean; side?: THREE.Side } = {},
): THREE.MeshStandardMaterial {
  const root = `${import.meta.env.BASE_URL}textures/${id}/`
  const [rx, ry] = opts.repeat ?? [1, 1]
  const maps = [load(root + 'diff.jpg', true), load(root + 'nor.jpg', false), load(root + 'rough.jpg', false)]
  maps.forEach((m) => m.repeat.set(rx, ry))
  const n = opts.normal ?? 1
  return new THREE.MeshStandardMaterial({
    map: maps[0],
    normalMap: maps[1],
    normalScale: new THREE.Vector2(n, n),
    roughnessMap: maps[2],
    roughness: opts.roughness ?? 1,
    color: opts.color ?? 0xffffff,
    vertexColors: !!opts.vertexColors,
    side: opts.side ?? THREE.FrontSide,
  })
}

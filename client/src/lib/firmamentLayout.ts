export interface FirmamentNode {
  id: string
  x: number
  y: number
}

export interface Box {
  x0: number
  y0: number
  w: number
  h: number
}

function hash01(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return (h % 10000) / 10000
}

/** Deterministic radial scatter within a box — same input always lays out
 * identically (no client-side randomness flicker between renders), but
 * varies enough per-id that it doesn't read as a mechanical perfect ring. */
export function layoutCluster(ids: string[], box: Box): FirmamentNode[] {
  const n = Math.max(ids.length, 1)
  const cx = box.x0 + box.w / 2
  const cy = box.y0 + box.h / 2
  const maxRx = box.w / 2 - box.w * 0.1
  const maxRy = box.h / 2 - box.h * 0.16

  return ids.map((id, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2 + (hash01(`${id}a`) - 0.5) * 0.5
    const rx = maxRx * (0.5 + hash01(`${id}r`) * 0.5)
    const ry = maxRy * (0.5 + hash01(`${id}r2`) * 0.5)
    return {
      id,
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    }
  })
}

const ROMAN: Array<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function toRoman(n: number): string {
  let result = ''
  let rem = n
  for (const [value, symbol] of ROMAN) {
    while (rem >= value) {
      result += symbol
      rem -= value
    }
  }
  return result
}

/** Short star-label, echoing how antique atlases label figures tersely —
 * "Aurelius" not "Marcus Aurelius", "Rushd" not "Ibn Rushd (Averroes)". */
export function shortLabel(name: string): string {
  const clean = name.replace(/\(.*?\)/g, '').trim()
  const parts = clean.split(' ').filter(Boolean)
  return parts[parts.length - 1]
}

export { hash01 }

function hexToUnit(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function DuotoneFilter({ id, shadow, highlight }: { id: string; shadow: string; highlight: string }) {
  const [sr, sg, sb] = hexToUnit(shadow)
  const [hr, hg, hb] = hexToUnit(highlight)
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix
        type="matrix"
        values="0.33 0.33 0.33 0 0
                0.33 0.33 0.33 0 0
                0.33 0.33 0.33 0 0
                0    0    0    1 0"
      />
      <feComponentTransfer>
        <feFuncR type="table" tableValues={`${sr} ${hr}`} />
        <feFuncG type="table" tableValues={`${sg} ${hg}`} />
        <feFuncB type="table" tableValues={`${sb} ${hb}`} />
      </feComponentTransfer>
    </filter>
  )
}

/**
 * True duotone via SVG feComponentTransfer (grayscale luminosity remapped
 * onto a two-color ramp), not a CSS grayscale+sepia filter chain — every
 * photo reads as one deliberate system regardless of the source image's
 * original color grading. Mounted once; referenced elsewhere via
 * `filter: url(#duotone-gold)` etc. Colors tie directly into the existing
 * palette: parchment-900 as the shared shadow, gold/indigo/warm-cream as
 * the highlight depending on context.
 */
export function DuotoneDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <DuotoneFilter id="duotone-gold" shadow="#2c2318" highlight="#e8a33d" />
        <DuotoneFilter id="duotone-indigo" shadow="#2c2318" highlight="#a79cdb" />
        <DuotoneFilter id="duotone-neutral" shadow="#2c2318" highlight="#f3ddb0" />
      </defs>
    </svg>
  )
}
